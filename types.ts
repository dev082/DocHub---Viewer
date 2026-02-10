
export interface PreviewFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  content?: string; // Text content for MD, XML, TXT
  summary?: string;
  isSummarizing?: boolean;
}

export type FileType = 'pdf' | 'markdown' | 'xml' | 'text' | 'pptx' | 'unknown';
