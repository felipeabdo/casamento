import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { 
  Camera, Heart, ChevronLeft, ChevronRight, X, Download, Play, Pause, 
  RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, Settings, 
  Subtitles, Film, Check, Sparkles, Sliders
} from 'lucide-react';

interface CustomWeddingPlayerProps {
  videoUrl: string;
  posterUrl?: string;
}

const CustomWeddingPlayer: React.FC<CustomWeddingPlayerProps> = ({ videoUrl, posterUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);

  const trimmedUrl = (videoUrl || '').trim();
  const gdriveMatch = trimmedUrl.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=))([a-zA-Z0-9_-]+)/i);
  const fileId = gdriveMatch ? gdriveMatch[1] : null;

  // Candidate video streams for Google Drive or direct URL
  const streamCandidates = fileId ? [
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://docs.google.com/uc?export=open&id=${fileId}`
  ] : [trimmedUrl];

  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [streamFailed, setStreamFailed] = useState(false);

  const activeVideoSource = streamCandidates[currentSourceIndex] || trimmedUrl;
  const driveIframePreview = fileId ? `https://drive.google.com/file/d/${fileId}/preview?autoplay=1` : null;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const skipSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      Math.max(0, videoRef.current.currentTime + seconds),
      duration || 9999
    );
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettings(false);
  };

  const handleVideoError = () => {
    if (currentSourceIndex < streamCandidates.length - 1) {
      setCurrentSourceIndex(prev => prev + 1);
    } else {
      setStreamFailed(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds === 0) return '00:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-wedding-950 border border-wedding-300/80 shadow-2xl group text-wedding-50 select-none font-serif"
    >
      {/* Player Header Banner inside the Player */}
      <div className="bg-wedding-900/90 backdrop-blur border-b border-wedding-800/80 px-5 py-3 flex items-center justify-between text-xs text-wedding-100">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-wedding-300" />
          <span className="font-semibold tracking-wider text-wedding-100 uppercase text-xs sm:text-sm">VEJA NOSSO ENSAIO</span>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-1.5 hover:text-wedding-300 transition-colors flex items-center gap-1.5 text-xs text-wedding-200"
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          <span className="hidden sm:inline">{isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}</span>
        </button>
      </div>

      {/* Main Video Viewport */}
      <div className="aspect-video w-full relative bg-black flex items-center justify-center overflow-hidden">
        {!streamFailed ? (
          <video
            ref={videoRef}
            src={activeVideoSource}
            poster={posterUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onError={handleVideoError}
            onClick={togglePlay}
            playsInline
            className="w-full h-full object-contain cursor-pointer"
          />
        ) : driveIframePreview ? (
          /* Fallback Google Drive Frame */
          <div className="w-full h-full relative">
            <iframe
              src={driveIframePreview}
              title="Nosso Ensaio"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div className="p-8 text-center text-wedding-200">
            <Play size={44} className="mx-auto mb-3 text-wedding-300" />
            <p className="font-serif mb-4 text-base">Clique para assistir ao nosso vídeo de ensaio</p>
            <a 
              href={trimmedUrl} 
              target="_blank" 
              rel="noreferrer"
              className="bg-wedding-800 text-white font-serif px-6 py-2.5 rounded-full hover:bg-wedding-700 transition-colors inline-flex items-center gap-2 text-sm shadow-lg border border-wedding-600"
            >
              <Sparkles size={16} /> Abrir Vídeo
            </a>
          </div>
        )}

        {/* Custom Controls Bar Overlay */}
        {!streamFailed && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-wedding-950 via-wedding-950/85 to-transparent p-4 sm:p-5 transition-opacity duration-300 opacity-95 group-hover:opacity-100 z-20">
            {/* Interactive Progress Seek Bar */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-wedding-800/80 rounded-lg appearance-none cursor-pointer accent-wedding-300 hover:accent-wedding-100 transition-all"
              />
            </div>

            {/* Controls Bar Row */}
            <div className="flex items-center justify-between flex-wrap gap-3 text-wedding-100 text-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play / Pause Toggle */}
                <button
                  onClick={togglePlay}
                  className="p-2.5 bg-wedding-800 hover:bg-wedding-700 text-wedding-50 rounded-full transition-all shadow-md hover:scale-105 active:scale-95 border border-wedding-600"
                  title={isPlaying ? "Pausar" : "Reproduzir"}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                {/* Voltar 10 segundos */}
                <button
                  onClick={() => skipSeconds(-10)}
                  className="p-2 hover:bg-wedding-800/80 bg-wedding-900/70 border border-wedding-800/80 rounded-lg text-wedding-200 hover:text-wedding-50 transition-colors flex items-center gap-1.5 text-xs shadow-sm"
                  title="Voltar 10 segundos"
                >
                  <RotateCcw size={15} />
                  <span className="font-mono text-xs">-10s</span>
                </button>

                {/* Avançar 10 segundos */}
                <button
                  onClick={() => skipSeconds(10)}
                  className="p-2 hover:bg-wedding-800/80 bg-wedding-900/70 border border-wedding-800/80 rounded-lg text-wedding-200 hover:text-wedding-50 transition-colors flex items-center gap-1.5 text-xs shadow-sm"
                  title="Avançar 10 segundos"
                >
                  <RotateCw size={15} />
                  <span className="font-mono text-xs">+10s</span>
                </button>

                {/* Contador de tempo */}
                <span className="text-xs font-mono tracking-wider text-wedding-200 bg-wedding-900/90 px-3 py-1.5 rounded-lg border border-wedding-800/90 shadow-inner ml-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Volume & Mute slider */}
                <div className="flex items-center gap-1.5 bg-wedding-900/80 px-2.5 py-1.5 rounded-lg border border-wedding-800/80 shadow-sm">
                  <button onClick={toggleMute} className="p-1 hover:text-wedding-300 transition-colors" title="Volume">
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-14 sm:w-20 h-1 bg-wedding-800 rounded appearance-none cursor-pointer accent-wedding-300"
                  />
                </div>

                {/* Legendas Toggle */}
                <button
                  onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                  className={`p-2 rounded-lg transition-all ${subtitlesEnabled ? 'text-wedding-300 bg-wedding-800/90 border border-wedding-600 shadow-sm' : 'hover:text-wedding-300 bg-wedding-900/70 border border-wedding-800/80 hover:bg-wedding-800/80'}`}
                  title="Legendas"
                >
                  <Subtitles size={18} />
                </button>

                {/* Configurações Popover Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 bg-wedding-900/70 border border-wedding-800/80 hover:bg-wedding-800/80 rounded-lg text-wedding-200 hover:text-wedding-100 transition-colors"
                    title="Configurações do Player"
                  >
                    <Settings size={18} />
                  </button>

                  {showSettings && (
                    <div className="absolute right-0 bottom-12 w-56 bg-wedding-900/95 backdrop-blur border border-wedding-700 rounded-xl shadow-2xl p-3.5 z-40 text-xs text-wedding-100 animate-fade-in">
                      <div className="font-semibold text-wedding-300 mb-2.5 border-b border-wedding-800 pb-1.5 flex items-center justify-between">
                        <span>Configurações</span>
                        <Sliders size={14} />
                      </div>

                      <div>
                        <span className="text-[11px] text-wedding-400 block mb-1.5 font-sans uppercase tracking-wider">Velocidade de Reprodução</span>
                        <div className="grid grid-cols-3 gap-1">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speedOption) => (
                            <button
                              key={speedOption}
                              onClick={() => changeSpeed(speedOption)}
                              className={`py-1 rounded-md text-center border transition-all ${
                                playbackSpeed === speedOption 
                                  ? 'bg-wedding-800 border-wedding-500 text-wedding-100 font-bold shadow-sm' 
                                  : 'bg-wedding-950 border-wedding-800 hover:bg-wedding-800/50 text-wedding-300'
                              }`}
                            >
                              {speedOption}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tela Cheia / Sair do Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-wedding-900/70 border border-wedding-800/80 hover:bg-wedding-800/80 rounded-lg text-wedding-200 hover:text-wedding-100 transition-colors"
                  title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subtitles Overlay rendering if enabled */}
      {subtitlesEnabled && !streamFailed && isPlaying && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-wedding-100 px-4 py-1.5 rounded-md text-xs sm:text-sm font-sans tracking-wide border border-wedding-700/50 pointer-events-none z-10 text-center">
          ♪ [Jéssica & Felipe — Nosso Ensaio Pré-Wedding] ♪
        </div>
      )}
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



