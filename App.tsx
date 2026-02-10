
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PreviewFile } from './types';
import { summarizeDocument } from './services/geminiService';
import PreviewCard from './components/PreviewCard';

const STORAGE_KEY = 'hubdoc_session_files';

const App: React.FC = () => {
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files from storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedFiles: PreviewFile[] = JSON.parse(savedData);
        // We need to restore the Blob URLs because they are revoked on page refresh
        const restoredFiles = parsedFiles.map(file => {
          if (file.content && !file.type.includes('pdf') && !file.name.endsWith('.pptx')) {
            // It's a text-based file, content is already there
            const blob = new Blob([file.content], { type: file.type });
            return { ...file, url: URL.createObjectURL(blob) };
          } else if (file.content) {
            // It's a binary file stored as Base64 in 'content' field
            const byteCharacters = atob(file.content.split(',')[1] || file.content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: file.type });
            return { ...file, url: URL.createObjectURL(blob) };
          }
          return file;
        });
        setFiles(restoredFiles);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
    setIsRestoring(false);
  }, []);

  // Save files to storage whenever they change
  useEffect(() => {
    if (isRestoring) return;

    // We only save the metadata and the content (as string or base64)
    // Blob URLs are not persistent across sessions
    const filesToSave = files.map(({ url, ...rest }) => rest);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filesToSave));
    } catch (e) {
      console.warn("Storage limit reached. Some files might not be saved.");
      // If quota exceeded, we might want to notify the user
    }
  }, [files, isRestoring]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFiles = useCallback(async (newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileList = Array.from(newFiles);
    const processedFiles: PreviewFile[] = await Promise.all(
      fileList.map(async (file) => {
        const id = Math.random().toString(36).substr(2, 9);
        const url = URL.createObjectURL(file);
        let content = '';

        if (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.xml') || file.type.includes('text') || file.type.includes('markdown')) {
          content = await file.text();
        } else {
          // For binary files, we store them as Base64 to persist in localStorage
          // Note: LocalStorage has size limits (~5MB). Large files might fail.
          content = await fileToBase64(file);
        }

        return {
          id,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          url,
          content
        };
      })
    );

    setFiles(prev => [...prev, ...processedFiles]);
  }, []);

  const handleSummarize = async (file: PreviewFile) => {
    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isSummarizing: true } : f));
    
    // Use text content if available, otherwise just use filename for context
    const textToSummarize = file.type.includes('pdf') ? `Documento PDF: ${file.name}` : (file.content || file.name);
    const summary = await summarizeDocument(file.name, textToSummarize);
    
    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, summary, isSummarizing: false } : f));
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter(f => f.id !== id);
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f4f7fa]">
      {/* Navbar HubFrete Style */}
      <header className="h-16 bg-[#001f3f] text-white flex items-center justify-between px-6 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">H</div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight">HubDoc <span className="text-blue-400">Preview</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-blue-300 font-semibold">Logística de Documentos</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-300">
            <a href="#" className="hover:text-white transition">Dashboard</a>
            <a href="#" className="hover:text-white transition">Histórico</a>
            <a href="#" className="text-white border-b-2 border-blue-500 pb-1">Visualizador</a>
          </nav>
          <div className="flex items-center gap-3 border-l border-slate-700 pl-6">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs">JS</div>
            <span className="text-sm font-medium">João Silva</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 hidden lg:flex flex-col shadow-sm">
          <div className="p-6">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Novo Documento
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Arquivos Recentes ({files.length})</div>
            {files.length === 0 ? (
              <div className="text-center py-10 px-4">
                <i className="fas fa-folder-open text-slate-200 text-4xl mb-3"></i>
                <p className="text-slate-400 text-xs">Nenhum arquivo anexado ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map(file => (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-100 group"
                  >
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                       <i className={`fas ${file.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file'}`}></i>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 mt-auto">
             <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                <i className="fas fa-shield-halved text-blue-500"></i>
                <div className="text-[10px]">
                  <p className="font-bold text-slate-700">Modo Seguro</p>
                  <p className="text-slate-500">Documentos processados localmente.</p>
                </div>
             </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => handleFiles(e.target.files)}
            accept=".pdf,.md,.xml,.txt,.pptx"
          />

          {/* Banner area */}
          <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
             <div>
               <h2 className="text-xl font-bold text-slate-800">Visualização em Tempo Real</h2>
               <p className="text-sm text-slate-500">Arraste ou anexe vários arquivos para comparar e analisar.</p>
             </div>
             <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><i className="fas fa-grip-vertical"></i></button>
                <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><i className="fas fa-list"></i></button>
             </div>
          </div>

          {/* Grid of Previews */}
          <div 
            className={`flex-1 overflow-y-auto p-8 custom-scrollbar transition-colors ${isDragging ? 'bg-blue-50 ring-4 ring-blue-200 ring-inset' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {isRestoring ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-64 h-64 bg-white rounded-full shadow-inner flex items-center justify-center mb-8 border-2 border-dashed border-slate-200">
                  <i className="fas fa-cloud-arrow-up text-7xl text-blue-100"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Pronto para começar?</h3>
                <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
                  Arraste seus documentos PDF, Markdown, XML ou PPTX aqui para uma visualização instantânea com suporte a IA.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border-2 border-blue-600 text-blue-600 font-bold py-3 px-8 rounded-xl hover:bg-blue-50 transition-all flex items-center gap-2"
                >
                  <i className="fas fa-paperclip"></i>
                  Selecionar do Computador
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {files.map(file => (
                  <PreviewCard 
                    key={file.id} 
                    file={file} 
                    onRemove={removeFile}
                    onSummarize={handleSummarize}
                  />
                ))}
                
                {/* Empty State for Add More */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[500px] rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-blue-100">
                    <i className="fas fa-plus text-2xl"></i>
                  </div>
                  <span className="font-semibold">Adicionar outro arquivo</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Active Status Bar */}
          <footer className="bg-white border-t border-slate-200 h-10 px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
             <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <i className="fas fa-circle text-green-500 text-[6px]"></i> HubDoc Cloud Online
                </span>
                <span className="text-slate-300">|</span>
                <span>{files.length} documentos carregados</span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 text-blue-600 font-medium">
                  <i className="fas fa-check-double"></i> Sessão Salva Localmente
                </span>
             </div>
             <div>Versão 2.1.4-PRO</div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;
