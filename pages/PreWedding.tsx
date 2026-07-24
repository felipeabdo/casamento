import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { ReactionSystem } from '../components/ReactionSystem';
import { 
  Camera, Heart, ChevronLeft, ChevronRight, X, Download, Play, Pause, 
  RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, Settings, 
  Subtitles, Film, Check, Sparkles, Sliders
} from 'lucide-react';

interface CustomWeddingPlayerProps {
  videoUrl: string;
  posterUrl?: string;
}

const getEmbedInfo = (url: string) => {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;

  // 1. YouTube
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
      directUrl: `https://www.youtube.com/watch?v=${ytMatch[1]}`,
      title: 'YouTube'
    };
  }

  // 2. Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      directUrl: `https://vimeo.com/${vimeoMatch[1]}`,
      title: 'Vimeo'
    };
  }

  // 3. Google Drive
  const gdriveMatch = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=))([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch) {
    return {
      type: 'gdrive',
      embedUrl: `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`,
      directUrl: `https://drive.google.com/file/d/${gdriveMatch[1]}/view`,
      title: 'Google Drive'
    };
  }

  // 4. Direct video link (Cloudinary, mp4, webm, mov, etc.)
  return {
    type: 'direct',
    embedUrl: trimmed,
    directUrl: trimmed,
    title: 'Vídeo Direct'
  };
};

const CustomWeddingPlayer: React.FC<CustomWeddingPlayerProps> = ({ videoUrl, posterUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const embedInfo = getEmbedInfo(videoUrl);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!embedInfo) return null;

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-wedding-950 border border-wedding-300/80 shadow-2xl group text-wedding-50 select-none font-serif"
    >
      {/* Top Bar inside Player */}
      <div className="bg-wedding-900/90 backdrop-blur border-b border-wedding-800/80 px-5 py-3 flex items-center justify-between text-xs text-wedding-100">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-wedding-300" />
          <span className="font-semibold tracking-wider text-wedding-100 uppercase text-xs sm:text-sm">
            VEJA NOSSO ENSAIO
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={embedInfo.directUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 hover:text-wedding-300 transition-colors flex items-center gap-1.5 text-xs text-wedding-200"
            title="Abrir em nova aba"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Abrir em nova aba</span>
          </a>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:text-wedding-300 transition-colors flex items-center gap-1.5 text-xs text-wedding-200"
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="aspect-video w-full relative bg-black flex items-center justify-center overflow-hidden">
        {/* If embed is YouTube / Vimeo / Google Drive */}
        {embedInfo.type !== 'direct' ? (
          <iframe
            src={embedInfo.embedUrl}
            title="Vídeo Pré-Wedding"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        ) : (
          /* Direct Video (MP4 / WebM / Cloudinary) */
          !hasError ? (
            <video
              ref={videoRef}
              src={embedInfo.embedUrl}
              controls
              playsInline
              onError={() => setHasError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="p-8 text-center text-wedding-200">
              <Play size={44} className="mx-auto mb-3 text-wedding-300" />
              <p className="font-serif mb-4 text-base">Não foi possível carregar o player direto nesta janela</p>
              <a 
                href={embedInfo.directUrl} 
                target="_blank" 
                rel="noreferrer"
                className="bg-wedding-800 text-white font-serif px-6 py-2.5 rounded-full hover:bg-wedding-700 transition-colors inline-flex items-center gap-2 text-sm shadow-lg border border-wedding-600"
              >
                <Sparkles size={16} /> Abrir Vídeo
              </a>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export const PreWedding: React.FC = () => {
  const { pages } = useStore();
  const preWeddingPage = pages.find(p => p.id === 'pre-wedding-page');
  const photos = preWeddingPage?.preWeddingPhotos || [];
  const video = preWeddingPage?.preWeddingVideo;

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length]);

  const hasContent = photos.length > 0 || !!video;

  return (
    <div className="min-h-screen bg-wedding-50 py-12 animate-fade-in text-wedding-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="text-center mb-16">
          <div className="bg-wedding-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-wedding-800 shadow-sm border border-wedding-200">
            <Camera size={40} />
          </div>
          <h1 className="font-script text-6xl text-wedding-800 mb-6">Ensaio Pré-Wedding</h1>
          <p className="font-serif text-wedding-600 text-lg max-w-2xl mx-auto">
            {hasContent 
              ? "Cada foto e cada detalhe do nosso ensaio para eternizar o carinho que nos une. Esperamos que gostem de ver nossa sintonia!"
              : "Em breve, compartilharemos aqui os registros do nosso ensaio fotográfico. Estamos preparando tudo com muito carinho para eternizar esse momento especial antes do grande dia!"
            }
          </p>
        </div>

        {hasContent ? (
          <div className="space-y-16">
            
            {/* VIDEO SECTION */}
            {video && (
              <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-wedding-200 text-center">
                <CustomWeddingPlayer 
                  videoUrl={video.url} 
                  posterUrl={photos[0]?.url} 
                />
                <div className="mt-6 pt-4 border-t border-wedding-100 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-sm font-serif text-wedding-800 font-medium italic">
                    Deixe sua reação ao nosso vídeo pré-wedding
                  </span>
                  <ReactionSystem itemId="prewedding-video" theme="light" />
                </div>
              </div>
            )}

            {/* PHOTOS SECTION */}
            {photos.length > 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="font-serif text-3xl text-wedding-800 mb-2">Álbum de Fotos</h3>
                  <div className="w-12 h-1 bg-wedding-300 mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {photos.map((photo, index) => (
                    <div 
                      key={index} 
                      onClick={() => setLightboxIndex(index)}
                      className="aspect-square bg-white rounded-2xl border border-wedding-200 shadow-sm hover:shadow-md cursor-pointer group relative"
                    >
                      <div className="w-full h-full rounded-2xl overflow-hidden relative">
                        <img 
                          src={photo.url} 
                          alt={`Pré-wedding ${index + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-wedding-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                          <span className="bg-white/90 text-wedding-900 text-xs px-3 py-2 rounded-full font-serif font-medium tracking-wide shadow">
                            Visualizar
                          </span>
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 z-20" onClick={(e) => e.stopPropagation()}>
                        <ReactionSystem itemId={`prewedding-photo-${index}`} compact theme="light" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* FALLBACK PORTAL */
          <div className="bg-white rounded-3xl shadow-sm border border-wedding-200 p-12 text-center max-w-3xl mx-auto">
            <Heart size={48} className="mx-auto text-wedding-300 mb-6 animate-pulse" />
            <h3 className="text-2xl font-serif text-wedding-800 mb-4">Fotos em breve...</h3>
            <p className="text-wedding-600">
              Fique de olho! Assim que fizermos nosso ensaio, as fotos estarão disponíveis nesta página para você conferir.
            </p>
          </div>
        )}

        {/* LIGHTBOX MODAL */}
        {lightboxIndex !== null && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-4 select-none animate-fade-in" onClick={() => setLightboxIndex(null)}>
            
            {/* LIGHTBOX TOP BAR */}
            <div className="flex justify-between items-center text-white p-2" onClick={(e) => e.stopPropagation()}>
              <span className="font-mono text-sm">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <div className="flex items-center gap-3">
                <a 
                  href={photos[lightboxIndex].url} 
                  download={`pre_wedding_${lightboxIndex + 1}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors shadow"
                  title="Baixar Foto"
                >
                  <Download size={20} />
                </a>
                {/* PROMINENT CLOSE BUTTON */}
                <button 
                  onClick={() => setLightboxIndex(null)}
                  className="p-2.5 bg-white/20 hover:bg-red-600/80 text-white rounded-full transition-all shadow font-bold flex items-center justify-center"
                  title="Fechar (Esc)"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* LIGHTBOX MAIN CONTENT */}
            <div className="flex-1 flex items-center justify-between relative px-2 md:px-12" onClick={(e) => e.stopPropagation()}>
              
              {/* Prev Button */}
              <button 
                onClick={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                disabled={lightboxIndex === 0}
                className="p-3 bg-white/10 hover:bg-white/25 text-white disabled:opacity-20 disabled:pointer-events-none rounded-full transition-all shrink-0 shadow z-10"
                title="Foto Anterior"
              >
                <ChevronLeft size={28} />
              </button>

              {/* Photo */}
              <div className="max-w-[80vw] max-h-[75vh] flex flex-col items-center justify-center">
                <img 
                  src={photos[lightboxIndex].url} 
                  alt={`Pré-wedding ${lightboxIndex + 1}`} 
                  className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-2xl transition-all duration-300 mb-4"
                />
                <ReactionSystem itemId={`prewedding-photo-${lightboxIndex}`} theme="dark" />
              </div>

              {/* Next Button */}
              <button 
                onClick={() => setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))}
                disabled={lightboxIndex === photos.length - 1}
                className="p-3 bg-white/10 hover:bg-white/25 text-white disabled:opacity-20 disabled:pointer-events-none rounded-full transition-all shrink-0 shadow z-10"
                title="Próxima Foto"
              >
                <ChevronRight size={28} />
              </button>

            </div>

            {/* LIGHTBOX BOTTOM BAR */}
            <div className="h-10 flex items-center justify-center text-white/50 text-xs font-mono" onClick={(e) => e.stopPropagation()}>
              Use as setas do teclado para navegar
            </div>

          </div>
        )}

      </div>
    </div>
  );
};



