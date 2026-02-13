import React, { useState, useRef } from 'react';
import { Video, Mic, StopCircle, Play, Trash2, Camera } from 'lucide-react';

interface MediaRecorderProps {
  // Alterado para receber o Blob (arquivo) também
  onRecordingComplete: (base64: string, blob: Blob, type: 'audio' | 'video') => void;
}

export const Recorder: React.FC<MediaRecorderProps> = ({ onRecordingComplete }) => {
  const [mode, setMode] = useState<'audio' | 'video' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaBase64, setMediaBase64] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async (selectedMode: 'audio' | 'video') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Seu navegador não suporta gravação de mídia ou a conexão não é segura (HTTPS necessária).");
      return;
    }

    try {
      const constraints = selectedMode === 'video' 
        ? { video: { width: 480, height: 360 }, audio: true } // Melhoramos um pouco a qualidade pois agora vai pro Storage
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current && selectedMode === 'video') {
        videoRef.current.srcObject = stream;
      }

      // Tenta usar codecs eficientes
      let options = {};
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = selectedMode === 'video' ? mediaRecorder.mimeType || 'video/webm' : 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        // Convert to Base64 (for preview consistency) and pass Blob (for upload)
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result as string;
            setMediaBase64(base64data);
            onRecordingComplete(base64data, blob, selectedMode);
        };
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setMode(selectedMode);
    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert("Permissão negada. Por favor, permita o acesso à câmera e microfone nas configurações do navegador para gravar sua mensagem.");
      } else if (err.name === 'NotFoundError') {
        alert("Nenhum dispositivo de câmera ou microfone foi encontrado.");
      } else {
        alert("Não foi possível acessar a câmera ou microfone: " + (err.message || "Erro desconhecido"));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setMediaBase64(null);
    setMode(null);
    setIsRecording(false);
  };

  if (previewUrl && mediaBase64) {
    return (
      <div className="w-full mt-4 bg-gray-50 p-4 rounded border border-gray-200">
        <p className="text-sm font-bold text-gray-700 mb-2">Mensagem gravada com sucesso!</p>
        <div className="flex justify-center mb-4">
          {mode === 'video' ? (
            <video src={previewUrl} controls className="w-full max-h-48 rounded bg-black" />
          ) : (
            <audio src={previewUrl} controls className="w-full" />
          )}
        </div>
        <button 
          onClick={reset}
          className="text-red-500 text-sm flex items-center justify-center gap-1 hover:underline w-full"
        >
          <Trash2 size={14} /> Gravar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mt-4">
      <p className="text-sm text-wedding-600 mb-3 font-medium">Deixe um recado carinhoso (opcional):</p>
      
      {isRecording ? (
        <div className="flex flex-col items-center gap-4 bg-red-50 p-6 rounded border border-red-100 animate-pulse">
          {mode === 'video' && (
            <video ref={videoRef} autoPlay muted className="w-full h-48 object-cover rounded bg-black transform scale-x-[-1]" />
          )}
          <div className="flex items-center gap-2 text-red-600 font-bold">
            <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
            Gravando {mode === 'video' ? 'Vídeo' : 'Áudio'}...
          </div>
          <button 
            onClick={stopRecording}
            className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition flex items-center gap-2"
          >
            <StopCircle size={20} /> Parar Gravação
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => startRecording('video')}
            className="flex flex-col items-center justify-center p-4 border border-wedding-300 rounded hover:bg-wedding-100 transition gap-2 text-wedding-700"
          >
            <Camera size={24} />
            <span className="text-sm font-bold">Gravar Vídeo</span>
          </button>
          <button 
            onClick={() => startRecording('audio')}
            className="flex flex-col items-center justify-center p-4 border border-wedding-300 rounded hover:bg-wedding-100 transition gap-2 text-wedding-700"
          >
            <Mic size={24} />
            <span className="text-sm font-bold">Gravar Áudio</span>
          </button>
        </div>
      )}
    </div>
  );
};