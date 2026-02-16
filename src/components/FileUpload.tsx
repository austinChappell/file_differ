import { useState } from 'react';

type FileUploadProps = {
  file: File | null;
  fileNumber: 1 | 2;
  onFileChange: (file: File, fileNumber: 1 | 2) => void;
};

export function FileUpload({ file, fileNumber, onFileChange }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const isFile1 = fileNumber === 1;
  const colorClass = isFile1 ? 'blue' : 'green';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileChange(files[0], fileNumber);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
        dragOver
          ? `border-${colorClass}-500 bg-${colorClass}-50 dark:bg-${colorClass}-950/30 scale-105`
          : file
          ? `border-${colorClass}-300 dark:border-${colorClass}-700 bg-${colorClass}-50/50 dark:bg-${colorClass}-950/20`
          : `border-zinc-300 dark:border-zinc-700 hover:border-${colorClass}-400 dark:hover:border-${colorClass}-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/50`
      }`}
    >
      <label className="cursor-pointer block">
        <input
          type="file"
          accept=".csv,.txt,.json,.html,.sql"
          onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0], fileNumber)}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
            file ? `bg-${colorClass}-500` : 'bg-zinc-200 dark:bg-zinc-700'
          }`}>
            {file ? (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              {file ? file.name : `File ${fileNumber}`}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {file ? 'Click to change' : 'Click or drop file here'}
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}
