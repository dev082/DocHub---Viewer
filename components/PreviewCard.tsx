
import React, { useState } from 'react';
import { PreviewFile } from '../types';
import ReactMarkdown from 'https://esm.sh/react-markdown';

interface PreviewCardProps {
  file: PreviewFile;
  onRemove: (id: string) => void;
  onSummarize: (file: PreviewFile) => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ file, onRemove, onSummarize }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'summary'>('preview');

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return 'fa-file-pdf text-red-500';
    if (type.includes('markdown') || file.name.endsWith('.md')) return 'fa-file-code text-blue-500';
    if (type.includes('xml')) return 'fa-file-code text-orange-500';
    if (type.includes('presentation') || file.name.endsWith('.pptx')) return 'fa-file-powerpoint text-orange-600';
    return 'fa-file-lines text-slate-500';
  };

  const renderContent = () => {
    if (viewMode === 'summary') {
      return (
        <div className="p-6 bg-blue-50 h-full overflow-y-auto custom-scrollbar">
          <h4 className="font-bold text-blue-900 mb-3 flex items-center">
            <i className="fas fa-robot mr-2"></i> Resumo da IA HubDoc
          </h4>
          {file.isSummarizing ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-500 animate-pulse">Analisando documento...</p>
            </div>
          ) : (
            <p className="text-slate-700 leading-relaxed italic">
              {file.summary || "Nenhum resumo disponível. Clique no botão de IA para gerar."}
            </p>
          )}
        </div>
      );
    }

    if (file.type.includes('pdf')) {
      return (
        <iframe
          src={`${file.url}#toolbar=0`}
          className="w-full h-full border-none"
          title={file.name}
        />
      );
    }

    if (file.name.endsWith('.md') || file.type.includes('markdown')) {
      return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar prose prose-slate max-w-none bg-white">
          <ReactMarkdown>{file.content || ''}</ReactMarkdown>
        </div>
      );
    }

    if (file.type.includes('xml') || file.type.includes('text')) {
      return (
        <pre className="p-6 h-full overflow-y-auto custom-scrollbar bg-slate-900 text-slate-200 text-sm font-mono">
          <code>{file.content}</code>
        </pre>
      );
    }

    if (file.name.endsWith('.pptx')) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-10 text-center">
          <i className="fas fa-file-powerpoint text-6xl text-orange-500 mb-4"></i>
          <h3 className="text-xl font-semibold text-slate-800">Preview de PPTX</h3>
          <p className="text-slate-500 mt-2">
            O formato PPTX é suportado para gerenciamento e resumo por IA. 
            Para visualizar slides, recomendamos converter para PDF ou abrir no Office.
          </p>
          <button 
            onClick={() => window.open(file.url)}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
          >
            Baixar Arquivo
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Preview não disponível para este formato.
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-[500px] transition-all hover:shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <i className={`fas ${getFileIcon(file.type)} text-xl`}></i>
          <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={file.name}>
            {file.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode(viewMode === 'preview' ? 'summary' : 'preview')}
            className={`p-1.5 rounded-lg transition ${viewMode === 'summary' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}
            title="Ver Resumo"
          >
            <i className="fas fa-wand-magic-sparkles"></i>
          </button>
          {!file.summary && !file.isSummarizing && (
             <button 
                onClick={() => onSummarize(file)}
                className="text-xs font-medium text-blue-600 hover:underline"
             >
                Gerar IA
             </button>
          )}
          <button 
            onClick={() => onRemove(file.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition rounded-lg"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
        <span>{(file.size / 1024).toFixed(1)} KB</span>
        <span className="uppercase">{file.type.split('/')[1] || 'DOC'}</span>
      </div>
    </div>
  );
};

export default PreviewCard;
