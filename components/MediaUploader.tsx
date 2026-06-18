import React, { useRef, useState } from 'react';
import { Upload, X, FileAudio } from 'lucide-react';

interface MediaUploaderProps {
  onMediaSelected: (blob: Blob, type: 'audio' | 'video', previewUrl: string) => void;
  onClearMedia: () => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ onMediaSelected, onClearMedia }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [type, setType] = useState<'audio' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (!isVideo && !isAudio) {
      alert('Por favor, selecione um arquivo de áudio ou vídeo.');
      return;
    }

    const mediaType = isVideo ? 'video' : 'audio';
    const url = URL.createObjectURL(file);
    
    setPreview(url);
    setType(mediaType);
    onMediaSelected(file, mediaType, url);
  };

  const clear = () => {
    setPreview(null);
    setType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClearMedia();
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-wedding-300 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-wedding-50 transition-colors"
        >
          <Upload className="text-wedding-400" size={32} />
          <span className="text-sm font-medium text-wedding-700">Clique para enviar um arquivo</span>
          <span className="text-xs text-wedding-400">Vídeo ou Áudio (MP4, MP3, etc)</span>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="video/*,audio/*" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="relative bg-gray-50 p-4 rounded-lg border border-gray-200">
          <button 
            type="button"
            onClick={clear}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-10"
          >
            <X size={16} />
          </button>
          
          <div className="flex flex-col items-center gap-3">
            {type === 'video' ? (
              <div className="w-full aspect-video bg-black rounded overflow-hidden">
                <video src={preview} controls className="w-full h-full" />
              </div>
            ) : (
              <div className="w-full py-4 flex flex-col items-center gap-2">
                <FileAudio size={48} className="text-wedding-400" />
                <audio src={preview} controls className="w-full" />
              </div>
            )}
            <p className="text-xs text-wedding-500 truncate w-full text-center">
              Arquivo selecionado pronto para envio
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
