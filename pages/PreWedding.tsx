import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Camera, Heart, ChevronLeft, ChevronRight, X, Download, Play } from 'lucide-react';

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

  const getEmbedUrl = (url: string) => {
    if (!url) return { type: 'other', url: '' };

    // YouTube matches (Shorts, standard, shared links)
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/i);
    if (ytMatch) {
      return { type: 'youtube', url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0` };
    }

    // Vimeo matches
    const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
    if (vimeoMatch) {
      return { type: 'vimeo', url: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
    }

    // Direct / Local video matches
    if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || url.includes('firebasestorage.googleapis.com') || url.includes('res.cloudinary.com')) {
      return { type: 'direct', url };
    }

    return { type: 'other', url };
  };

  const hasContent = photos.length > 0 || !!video;

  return (
    <div className="min-h-screen bg-wedding-50 py-12 animate-fade-in text-wedding-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="text-center mb-16">
          <div className="bg-wedding-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-wedding-800">
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
              <div className="max-w-4xl mx-auto bg-white p-4 rounded-3xl shadow-md border border-wedding-200">
                <h3 className="font-serif text-2xl text-wedding-800 mb-4 text-center">Nosso Vídeo do Ensaio</h3>
                
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black relative">
                  {(() => {
                    const parsedVideo = getEmbedUrl(video.url);
                    if (parsedVideo.type === 'youtube' || parsedVideo.type === 'vimeo') {
                      return (
                        <iframe
                          src={parsedVideo.url}
                          title="Vídeo Pré-Wedding"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      );
                    } else if (parsedVideo.type === 'direct' || video.type === 'file') {
                      return (
                        <video 
                          src={video.url} 
                          controls 
                          className="w-full h-full object-contain"
                          poster={photos[0]?.url || ""}
                        />
                      );
                    } else {
                      // fallback link
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                          <Play size={48} className="text-wedding-400 mb-4 animate-pulse" />
                          <p className="font-serif text-lg mb-4">Assista ao nosso vídeo</p>
                          <a 
                            href={video.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-wedding-800 text-white font-serif px-6 py-2.5 rounded hover:bg-wedding-700 transition-colors inline-block"
                          >
                            Abrir Vídeo Externo
                          </a>
                        </div>
                      );
                    }
                  })()}
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
                      className="aspect-square bg-white rounded-2xl border border-wedding-200 overflow-hidden shadow-sm hover:shadow-md cursor-pointer group relative"
                    >
                      <img 
                        src={photo.url} 
                        alt={`Pré-wedding ${index + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-wedding-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="bg-white/90 text-wedding-900 text-xs px-3 py-2 rounded-full font-serif font-medium tracking-wide shadow">
                          Visualizar
                        </span>
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
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-4 select-none animate-fade-in">
            
            {/* LIGHTBOX TOP BAR */}
            <div className="flex justify-between items-center text-white p-2">
              <span className="font-mono text-sm">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <div className="flex items-center gap-4">
                <a 
                  href={photos[lightboxIndex].url} 
                  download={`pre_wedding_${lightboxIndex + 1}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  title="Baixar Foto"
                >
                  <Download size={20} />
                </a>
                <button 
                  onClick={() => setLightboxIndex(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  title="Fechar"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* LIGHTBOX MAIN CONTENT */}
            <div className="flex-1 flex items-center justify-between relative px-2 md:px-12">
              
              {/* Prev Button */}
              <button 
                onClick={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                disabled={lightboxIndex === 0}
                className="p-3 bg-white/5 hover:bg-white/15 text-white disabled:opacity-20 disabled:pointer-events-none rounded-full transition-all shrink-0 shadow"
                title="Foto Anterior"
              >
                <ChevronLeft size={28} />
              </button>

              {/* Photo */}
              <div className="max-w-[80vw] max-h-[80vh] flex items-center justify-center">
                <img 
                  src={photos[lightboxIndex].url} 
                  alt={`Pré-wedding ${lightboxIndex + 1}`} 
                  className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl transition-all duration-300"
                />
              </div>

              {/* Next Button */}
              <button 
                onClick={() => setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))}
                disabled={lightboxIndex === photos.length - 1}
                className="p-3 bg-white/5 hover:bg-white/15 text-white disabled:opacity-20 disabled:pointer-events-none rounded-full transition-all shrink-0 shadow"
                title="Próxima Foto"
              >
                <ChevronRight size={28} />
              </button>

            </div>

            {/* LIGHTBOX BOTTOM BAR */}
            <div className="h-12 flex items-center justify-center text-white/50 text-xs font-mono">
              Use as setas do teclado para navegar
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
