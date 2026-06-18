import React, { useState, useRef, useEffect } from 'react';
import { Video, Mic, StopCircle, Play, Trash2, Camera } from 'lucide-react';
// @ts-ignore
import { Recorder as VmsgRecorder } from 'vmsg';

interface MediaRecorderProps {
  onRecordingComplete: (base64: string, blob: Blob, type: 'audio' | 'video') => void;
}

export const Recorder: React.FC<MediaRecorderProps> = ({ onRecordingComplete }) => {
  const [mode, setMode] = useState<'audio' | 'video' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaBase64, setMediaBase64] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize audio recorder once
  useEffect(() => {
    // vmsg recorder is initialized when needed to avoid early permission requests
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async (selectedMode: 'audio' | 'video') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Seu navegador não suporta gravação de mídia ou a conexão não é segura (HTTPS necessária).");
      return;
    }

    try {
      setMode(selectedMode);
      
      if (selectedMode === 'audio') {
        if (!audioRecorderRef.current) {
          audioRecorderRef.current = new VmsgRecorder({
            wasmURL: "https://unpkg.com/vmsg@0.3.0/vmsg.wasm"
          });
        }
        try {
          await audioRecorderRef.current.init();
          audioRecorderRef.current.startRecording();
          setIsRecording(true);
        } catch (initErr: any) {
          console.error("vmsg init error:", initErr);
          throw new Error("Erro ao inicializar áudio: " + (initErr.message || "Verifique as permissões."));
        }
      } else {
        const constraints = { 
          video: { width: { ideal: 640 }, height: { ideal: 480 } }, 
          audio: true 
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        // Detect support for mimeTypes
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
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const type = mediaRecorder.mimeType || 'video/webm';
          const blob = new Blob(chunksRef.current, { type });
          
          console.log(`Gravação de vídeo finalizada. Tamanho: ${blob.size} bytes. Tipo: ${type}`);

          if (blob.size === 0) {
              alert("Erro: A gravação ficou vazia. Tente novamente.");
              return;
          }

          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
              const base64data = reader.result as string;
              setMediaBase64(base64data);
              onRecordingComplete(base64data, blob, 'video');
          };
          
          // Stop all tracks cleanly
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };

        mediaRecorder.start(1000);
        setIsRecording(true);
      }
    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      alert("Erro ao acessar câmera/microfone: " + (err.message || "Verifique as permissões do navegador."));
      setMode(null);
    }
  };

  // Effect to link stream to video element
  useEffect(() => {
    if (isRecording && mode === 'video' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isRecording, mode]);

  const stopRecording = async () => {
    if (!isRecording) return;

    if (mode === 'audio') {
      try {
        const blob = await audioRecorderRef.current.stopRecording();
        setIsRecording(false);
        
        console.log(`Gravação de áudio (MP3) finalizada. Tamanho: ${blob.size} bytes.`);
        
        if (blob.size === 0) {
          alert("Erro: A gravação ficou vazia. Tente novamente.");
          return;
        }

        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setMediaBase64(base64data);
          onRecordingComplete(base64data, blob, 'audio');
        };
      } catch (err) {
        console.error("Error stopping audio recorder:", err);
        setIsRecording(false);
      }
    } else if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setMediaBase64(null);
    setMode(null);
    setIsRecording(false);
    
    // Ensure everything is stopped
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
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
          type="button"
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
        <div className="flex flex-col items-center gap-4 bg-red-50 p-6 rounded border border-red-100">
          {mode === 'video' && (
            <div className="w-full relative aspect-video bg-black rounded overflow-hidden shadow-inner">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]" 
              />
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                REC
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-red-600 font-bold">
            {mode === 'audio' && <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>}
            Gravando {mode === 'video' ? 'Vídeo' : 'Áudio'}...
          </div>
          <button 
            type="button"
            onClick={stopRecording}
            className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition flex items-center gap-2"
          >
            <StopCircle size={20} /> Parar Gravação
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={() => startRecording('video')}
            className="flex flex-col items-center justify-center p-4 border border-wedding-300 rounded hover:bg-wedding-100 transition gap-2 text-wedding-700"
          >
            <Camera size={24} />
            <span className="text-sm font-bold">Gravar Vídeo</span>
          </button>
          <button 
            type="button"
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