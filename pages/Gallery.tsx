import React, { useState, useRef, useEffect } from 'react';
import { useStore, useTheme } from '../store';
import { Upload, X, Maximize2, Minimize2, Image as ImageIcon, Trash2, Camera, Grid, User, Folder, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import { Photo } from '../types';
import { storage, auth } from '../firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeName, formatDate } from '../src/utils';

const SmartImage: React.FC<{ 
  primaryUrl: string; 
  fallbackUrl?: string; 
  alt: string;
  className?: string;
}> = ({ primaryUrl, fallbackUrl, alt, className }) => {
  const [useFallback, setUseFallback] = useState(false);
  const [hasError, setHasError] = useState(false);
  const currentUrl = useFallback && fallbackUrl ? fallbackUrl : primaryUrl;

  const handleError = () => {
    if (!useFallback && fallbackUrl) {
      console.warn(`Imagem falhou no Firebase, tentando Cloudinary...`);
      setUseFallback(true);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-red-50 text-red-500 rounded-lg border border-red-100 italic text-sm ${className}`}>
        <AlertCircle size={24} className="mb-2" />
        Erro ao carregar imagem.
      </div>
    );
  }

  return (
    <img 
      src={currentUrl} 
      alt={alt} 
      className={className} 
      onError={handleError}
      referrerPolicy="no-referrer"
    />
  );
};

export const Gallery: React.FC = () => {
  const { photos, addPhoto, requestPhotoDeletion, deletePhoto, settings, currentGuest, isAuthenticated } = useStore();
  const themeColor = useTheme();
  const [isAuthReady, setIsAuthReady] = useState(!!auth.currentUser);
  const [uploaderName, setUploaderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'byGuest'>('all');
  const [selectedGuestFolder, setSelectedGuestFolder] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [shuffledPhotos, setShuffledPhotos] = useState<Photo[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  const [localPhotoIds, setLocalPhotoIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('my_photos');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('my_photos', JSON.stringify(localPhotoIds));
  }, [localPhotoIds]);

  useEffect(() => {
    if (currentGuest) {
      setUploaderName(currentGuest.name || currentGuest.username);
    } else if (isAuthenticated) {
      setUploaderName(settings.coupleName || "Noivos");
    }
  }, [currentGuest, isAuthenticated, settings.coupleName]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setIsAuthReady(!!user);
      if (user) setAuthError(null);
    });
    return unsub;
  }, []);

  // Shuffle function
  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Handle shuffling and initial loading
  useEffect(() => {
    const approved = photos.filter(p => p.status === 'approved');
    setShuffledPhotos(shuffleArray(approved));
    
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1450);

    return () => clearTimeout(timer);
  }, [photos]);

  // Shuffle and trigger loading when switching tabs
  useEffect(() => {
    setIsTabLoading(true);
    setContentVisible(false);
    
    if (activeTab === 'all') {
      const approved = photos.filter(p => p.status === 'approved');
      setShuffledPhotos(shuffleArray(approved));
    }

    const timer = setTimeout(() => {
      setIsTabLoading(false);
    }, 1050); // Elegant delay for the staggered effect to feel fresh

    return () => clearTimeout(timer);
  }, [activeTab, photos.length]); // Also reshuffle if photo count changes

  useEffect(() => {
    if (!isAuthReady && !auth.currentUser) {
      const checkAuth = async () => {
        try {
          await signInAnonymously(auth);
        } catch (e: any) {
          if (e.code === 'auth/configuration-not-found') {
            setAuthError('O Login Anônimo não está ativado no seu Console do Firebase.');
          } else {
            console.error("Gallery auth check error:", e);
          }
        }
      };
      checkAuth();
    }
  }, [isAuthReady]);

  // Handle file previews
  useEffect(() => {
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setFilePreviews(newPreviews);

    // Cleanup
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const approvedPhotos = photos.filter(p => p.status === 'approved');

  // Group photos by uploader
  const photosByUploader = approvedPhotos.reduce((acc, photo) => {
    if (!acc[photo.uploaderName]) {
      acc[photo.uploaderName] = [];
    }
    acc[photo.uploaderName].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!uploaderName.trim() || selectedFiles.length === 0) {
      alert('Por favor, preencha seu nome e selecione pelo menos uma foto.');
      return;
    }

    if (!isAuthReady) {
      alert('Aguardando conexão segura com o servidor... Tente novamente em alguns segundos.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const getUserNextPhotoNumber = () => {
      const userPhotos = photos.filter(p => p.uploaderName === uploaderName);
      if (userPhotos.length === 0) return 1;

      const numbers = userPhotos.map(p => {
        const path = p.publicId || '';
        const parts = path.split('/');
        if (parts.length > 1) {
          const fileName = parts[parts.length - 1];
          const seqPart = fileName.split('_')[0];
          const num = parseInt(seqPart, 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      });

      return Math.max(...numbers, 0) + 1;
    };

    const CLOUDINARY_CLOUD_NAME = "dp1qpjvdf".trim();
    const CLOUDINARY_UPLOAD_PRESET = "casamento_upload".trim();

    const uploadToCloudinary = async (blob: Blob, fileName: string): Promise<{ url: string, publicId: string }> => {
      const userFolder = currentGuest ? normalizeName(currentGuest.username) : normalizeName(uploaderName);
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('public_id', fileName.replace(/\.[^/.]+$/, "")); // Remove extension for public_id
      formData.append('folder', `gallery/${userFolder}`);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Erro no Cloudinary.');
      }

      const data = await response.json();
      return { url: data.secure_url, publicId: data.public_id };
    };

    const nextNumberBase = getUserNextPhotoNumber();
    const userFolder = currentGuest ? normalizeName(currentGuest.username) : normalizeName(uploaderName);
    const normalizedUser = normalizeName(uploaderName);
    const dateStr = formatDate(new Date());

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const photoNumber = (nextNumberBase + i).toString().padStart(2, '0');
        
        console.log("Comprimindo imagem...");
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp'
        };
        const compressedFile = await imageCompression(file, options);

        const baseFileName = `${photoNumber}_${normalizedUser}_${dateStr}_photo`;
        const firebaseFileName = `gallery/${userFolder}/${baseFileName}.webp`;
        
        console.log("Enviando para o Firebase Storage...");
        
        // Ensure auth is ready
        if (!auth.currentUser) {
          console.log("Auth not ready, signing in anonymously...");
          await signInAnonymously(auth);
        }

        const storageRef = ref(storage, firebaseFileName);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            () => {}, 
            (error: any) => reject(error), 
            () => resolve()
          );
        });

        const firebaseURL = await getDownloadURL(uploadTask.snapshot.ref);

        console.log("Enviando para o Cloudinary...");
        let cloudinaryData = { url: '', publicId: '' };
        try {
          cloudinaryData = await uploadToCloudinary(compressedFile, baseFileName);
        } catch (cErr) {
          console.error("Cloudinary upload failed:", cErr);
        }

        await addPhoto({
          url: firebaseURL,
          fallbackUrl: cloudinaryData.url || undefined,
          publicId: firebaseFileName,
          cloudinaryPublicId: cloudinaryData.publicId || undefined,
          uploaderName,
          uploaderId: currentGuest ? currentGuest.id : undefined,
          status: 'pending'
        }).then(newId => {
          if (newId) setLocalPhotoIds(prev => [...prev, newId]);
        });

        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      alert('Fotos enviadas com sucesso! Elas aparecerão na galeria após aprovação.');
      if (!currentGuest) {
          setUploaderName('');
      }
      setSelectedFiles([]);
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Ocorreu um erro ao enviar as fotos. Tente novamente.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const openModal = (photo: Photo) => {
    setSelectedPhoto(photo);
    setShowModal(true);
    setShowDeleteConfirm(false);
    setDeleteReason('');
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPhoto(null);
    setShowDeleteConfirm(false);
    if (isFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleFullscreen = () => {
    if (!modalRef.current) return;

    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!selectedPhoto) return;

    if (currentGuest && selectedPhoto.uploaderId === currentGuest.id) {
        try {
            await deletePhoto(selectedPhoto.id);
            setLocalPhotoIds(prev => prev.filter(id => id !== selectedPhoto.id));
            closeModal();
        } catch (error) {
            console.error('Error deleting photo:', error);
            alert('Erro ao excluir foto.');
        }
        return;
    }

    if (!deleteReason.trim()) {
      alert('Por favor, informe o motivo da exclusão.');
      return;
    }
    try {
      await requestPhotoDeletion(selectedPhoto.id, deleteReason);
      closeModal();
    } catch (error) {
      console.error('Error requesting deletion:', error);
      alert('Erro ao solicitar exclusão.');
    }
  };

  const handleDeletePhoto = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhoto(photo);
    setShowModal(true);
    setShowDeleteConfirm(true);
  };

  const isPhotoOwner = (photo: Photo) => {
    return isAuthenticated || 
           (currentGuest && photo.uploaderId === currentGuest.id) || 
           localPhotoIds.includes(photo.id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 min-h-screen relative">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-serif mb-4" style={{ color: themeColor }}>
          Galeria de Momentos
        </h1>
        <p className="text-gray-600 italic">Capture e compartilhe a alegria do nosso dia</p>
      </div>

      {/* Floating Action Button for Upload */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsUploadModalOpen(true)}
        className="fixed bottom-8 right-8 z-40 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-colors"
        style={{ backgroundColor: themeColor }}
      >
        <Camera size={32} />
      </motion.button>

      {/* Auth Warning */}
      {authError && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 rounded-r-lg max-w-2xl mx-auto">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-amber-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                <span className="font-bold">Atenção:</span> {authError}
              </p>
              <p className="mt-2 text-sm text-amber-600">
                Para corrigir, acesse o Console do Firebase &rarr; Authentication &rarr; Sign-in method e ative o provedor "Anônimo".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-12 border-b border-gray-100 pb-4">
        {[
          { id: 'all', label: 'Todas as Fotos', icon: Grid },
          { id: 'mine', label: 'Minhas Fotos', icon: User },
          { id: 'byGuest', label: 'Fotos por Convidados', icon: Folder },
        ].map((tab) => {
          const isDisabled = (!currentGuest && !isAuthenticated) && tab.id !== 'all';
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isDisabled) return;
                setActiveTab(tab.id as any);
                setSelectedGuestFolder(null);
              }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'text-white shadow-md' 
                  : isDisabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
              }`}
              style={{ 
                backgroundColor: activeTab === tab.id ? themeColor : 'transparent'
              }}
              title={isDisabled ? "Faça login para acessar esta aba" : ""}
            >
              <tab.icon size={18} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {!currentGuest && !isAuthenticated && (
        <div className="bg-white border border-wedding-200 p-6 rounded-2xl shadow-sm mb-8 text-center max-w-3xl mx-auto">
          <h3 className="text-xl font-serif text-wedding-800 mb-2">Faça parte do nosso álbum!</h3>
          <p className="text-wedding-600 mb-4">
            Faça login para enviar suas próprias fotos da festa, ver suas fotos separadamente e explorar as fotos organizadas por cada convidado.
          </p>
          <p className="text-wedding-800 font-medium mb-4">
            Lembre-se: teremos brindes especiais para os convidados que mais participarem do site logados!
          </p>
          <p className="text-sm text-wedding-500 italic">
            Seu login e senha serão enviados junto com o convite em breve!
          </p>
        </div>
      )}

      {/* Gallery Content */}
      <div className="relative min-h-[500px]">
        <AnimatePresence onExitComplete={() => setContentVisible(true)}>
          {(isInitialLoading || isTabLoading) && (
            <motion.div
              key="loading-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-20 bg-wedding-50 flex flex-col items-center justify-center rounded-3xl"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-wedding-200 border-t-wedding-600 mb-6"
                style={{ borderTopColor: themeColor }}
              />
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-wedding-600 font-serif italic text-lg"
              >
                Organizando as melhores lembranças...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {activeTab === 'all' && contentVisible && (
              shuffledPhotos.map((photo, index) => (
                <PhotoCard 
                  key={photo.id} 
                  photo={photo} 
                  index={index}
                  onClick={() => openModal(photo)} 
                  isOwner={isPhotoOwner(photo)}
                  onDelete={(e) => handleDeletePhoto(photo, e)}
                />
              ))
            )}
            
            {activeTab === 'mine' && contentVisible && (
              photos.filter(p => p.uploaderId === currentGuest?.id || localPhotoIds.includes(p.id)).map((photo, index) => (
                <PhotoCard 
                  key={photo.id} 
                  photo={photo} 
                  index={index}
                  onClick={() => openModal(photo)} 
                  isOwner={isPhotoOwner(photo)}
                  onDelete={(e) => handleDeletePhoto(photo, e)}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {activeTab === 'all' && shuffledPhotos.length === 0 && contentVisible && <EmptyState />}
        {activeTab === 'mine' && photos.filter(p => p.uploaderId === currentGuest?.id || localPhotoIds.includes(p.id)).length === 0 && contentVisible && <EmptyState message="Você ainda não enviou fotos." />}

        <AnimatePresence mode="wait">
          {activeTab === 'byGuest' && contentVisible && (
            <motion.div
              key="guest-folders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {!selectedGuestFolder ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(Object.entries(photosByUploader) as [string, Photo[]][]).map(([name, guestPhotos]) => (
                    <motion.div
                      key={name}
                      whileHover={{ y: -5, scale: 1.02 }}
                      onClick={() => setSelectedGuestFolder(name)}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-xl transition-all flex items-center justify-between group overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-opacity-50 transition-all" style={{ backgroundColor: themeColor + '11' }} />
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors" style={{ backgroundColor: themeColor + '22', color: themeColor }}>
                          <Folder size={32} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-xl">{name}</h4>
                          <p className="text-sm text-gray-500 font-medium">{guestPhotos.length} fotos compartilhadas</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-white group-hover:shadow-md transition-all relative z-10">
                        <ChevronRight className="text-gray-400 group-hover:text-gray-800 transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                  {Object.keys(photosByUploader).length === 0 && <EmptyState />}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSelectedGuestFolder(null)}
                        className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        title="Voltar para pastas"
                      >
                        <X size={24} />
                      </button>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Pasta do Convidado</p>
                        <h3 className="text-2xl font-serif text-gray-800">
                          {selectedGuestFolder}
                        </h3>
                      </div>
                    </div>
                    <div className="px-4 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: themeColor + '22', color: themeColor }}>
                      {selectedGuestFolder && (photosByUploader[selectedGuestFolder] as Photo[]).length} Fotos
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photosByUploader[selectedGuestFolder].map((photo, index) => (
                      <PhotoCard 
                        key={photo.id} 
                        photo={photo} 
                        index={index}
                        onClick={() => openModal(photo)} 
                        isOwner={isPhotoOwner(photo)}
                        onDelete={(e) => handleDeletePhoto(photo, e)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUploading && setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-serif text-gray-800">Enviar Fotos</h2>
                  <button 
                    onClick={() => !isUploading && setIsUploadModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seu Nome</label>
                    <input
                      type="text"
                      value={uploaderName}
                      onChange={(e) => setUploaderName(e.target.value)}
                      placeholder="Ex: João e Maria"
                      className={`w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all ${(currentGuest || isAuthenticated) ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                      style={{ borderColor: themeColor + '33' }}
                      disabled={!!currentGuest || isAuthenticated || isUploading}
                    />
                    {(currentGuest || isAuthenticated) && (
                      <p className="text-[10px] text-wedding-400 mt-1 italic">Nome atrelado à sua conta logada.</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selecione as Fotos</label>
                    <div className="flex items-center justify-center w-full">
                      <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`} style={{ borderColor: themeColor + '66' }}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Clique</span> ou arraste e solte
                          </p>
                          <p className="text-xs text-gray-400 uppercase tracking-wider">PNG, JPG, WEBP</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          multiple 
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Thumbnail Previews */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">{selectedFiles.length} foto(s) selecionada(s):</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-2">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100 group relative">
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <img 
                                src={filePreviews[idx]} 
                                alt={`Preview ${idx}`} 
                                className="w-full h-full object-cover rounded-lg shadow-sm"
                              />
                              <button
                                onClick={() => removeSelectedFile(idx)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-10"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">Foto {idx + 1}</p>
                              <p className="text-[10px] text-gray-400 truncate">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={isUploading || selectedFiles.length === 0 || !uploaderName.trim()}
                    className="w-full py-4 px-6 text-white rounded-2xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    style={{ backgroundColor: themeColor }}
                  >
                    {isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enviando... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload size={24} />
                        Enviar Fotos
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Photo Modal */}
      {showModal && selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 p-4" onClick={closeModal}>
          <div 
            ref={modalRef}
            className={`relative bg-black flex flex-col items-center justify-center ${isFullscreen ? 'w-full h-full' : 'w-[85vw] h-[85vh] rounded-3xl overflow-hidden shadow-2xl'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <SmartImage 
              primaryUrl={selectedPhoto.url} 
              fallbackUrl={selectedPhoto.fallbackUrl}
              alt="Foto ampliada" 
              className="max-w-full max-h-full object-contain flex-1"
            />
            
            <div className="absolute top-6 right-6 flex gap-3">
              {!isFullscreen && (!currentGuest || selectedPhoto.uploaderId === currentGuest.id) && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-3 bg-red-600 bg-opacity-80 text-white rounded-full hover:bg-opacity-100 transition-all shadow-lg"
                  title="Solicitar exclusão"
                >
                  <Trash2 size={24} />
                </button>
              )}
              <button 
                onClick={toggleFullscreen}
                className="p-3 bg-white bg-opacity-20 text-white rounded-full hover:bg-opacity-40 transition-all shadow-lg backdrop-blur-md"
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
              </button>
              <button 
                onClick={closeModal}
                className="p-3 bg-white bg-opacity-20 text-white rounded-full hover:bg-opacity-40 transition-all shadow-lg backdrop-blur-md"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-center">
              <p className="text-white text-lg font-serif bg-black bg-opacity-50 px-6 py-2 rounded-full inline-block backdrop-blur-sm">
                Enviada por <span className="font-bold">{selectedPhoto.uploaderName}</span>
              </p>
            </div>

            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-10">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                  {currentGuest && selectedPhoto.uploaderId === currentGuest.id ? (
                      <>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Apagar Foto</h3>
                        <p className="text-gray-600 mb-8">
                          Tem certeza que deseja apagar esta foto? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-4">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors font-medium"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDeleteRequest}
                            className="px-6 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors font-bold shadow-lg"
                          >
                            Apagar Foto
                          </button>
                        </div>
                      </>
                  ) : (
                      <>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Solicitar Exclusão</h3>
                        <p className="text-gray-600 mb-6">
                          Por favor, informe o motivo para apagar esta foto. O administrador analisará seu pedido.
                        </p>
                        <textarea
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          placeholder="Motivo da exclusão..."
                          className="w-full p-4 border border-gray-200 rounded-2xl mb-6 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                          rows={3}
                        />
                        <div className="flex justify-end gap-4">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors font-medium"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDeleteRequest}
                            disabled={!deleteReason.trim()}
                            className="px-6 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors disabled:opacity-50 font-bold shadow-lg"
                          >
                            Enviar Solicitação
                          </button>
                        </div>
                      </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PhotoCard: React.FC<{ 
  photo: Photo; 
  index: number; 
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  isOwner?: boolean;
}> = ({ photo, index, onClick, onDelete, isOwner }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.03,
        ease: [0.22, 1, 0.36, 1] // Smooth quintic ease-out
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative shadow-sm hover:shadow-xl transition-all duration-300"
      onClick={onClick}
    >
      <SmartImage 
        primaryUrl={photo.url} 
        fallbackUrl={photo.fallbackUrl}
        alt={`Foto de ${photo.uploaderName}`} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <p className="text-white text-xs font-medium truncate">Enviada por {photo.uploaderName}</p>
      </div>

      {isOwner && onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-3 right-3 p-2 bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10 shadow-lg"
          title="Excluir foto"
        >
          <Trash2 size={16} />
        </button>
      )}
    </motion.div>
  );
};

const EmptyState: React.FC<{ message?: string }> = ({ message = "Ainda não há fotos aqui." }) => (
  <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
    <ImageIcon className="mx-auto h-16 w-16 text-gray-200 mb-4" />
    <p className="font-serif text-xl">{message}</p>
    <p className="text-sm mt-2">Seja o primeiro a compartilhar um momento!</p>
  </div>
);
