import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Video, Mic, Heart, PenTool, Loader2, Quote, AlertCircle, Trash2, Lock, X, CheckCircle } from 'lucide-react';
import { Recorder } from '../components/MediaRecorder';
import { MediaUploader } from '../components/MediaUploader';
import { RichTextEditor } from '../components/RichTextEditor';
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { storage, auth } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { normalizeName, formatDate } from '../src/utils';
import { Modal } from '../components/Modal';

const CLOUDINARY_CLOUD_NAME = "dp1qpjvdf".trim();
const CLOUDINARY_UPLOAD_PRESET = "casamento_upload".trim();

const SmartMedia: React.FC<{ 
  primaryUrl: string; 
  fallbackUrl?: string; 
  type: 'video' | 'audio';
  className?: string;
}> = ({ primaryUrl, fallbackUrl, type, className }) => {
  const [useFallback, setUseFallback] = useState(false);
  const [hasError, setHasError] = useState(false);
  const currentUrl = useFallback && fallbackUrl ? fallbackUrl : primaryUrl;

  const handleError = () => {
    if (!useFallback && fallbackUrl) {
      console.warn(`Mídia falhou no Cloudinary, tentando Firebase...`);
      setUseFallback(true);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-50 text-red-500 rounded-lg border border-red-100 italic text-sm">
        <AlertCircle size={24} className="mb-2" />
        Não foi possível carregar a mídia.
      </div>
    );
  }

  if (type === 'video') {
    return (
      <video 
        src={currentUrl} 
        controls 
        className={className} 
        preload="metadata"
        onError={handleError}
      />
    );
  }

  return (
    <div className="w-full py-8 flex flex-col items-center justify-center bg-wedding-50 text-wedding-600 gap-4 rounded-lg border border-wedding-100 mb-4">
       <Mic size={32} className="text-wedding-400" />
       <audio 
         src={currentUrl} 
         controls 
         className="w-full px-4" 
         onError={handleError}
       />
    </div>
  );
};

export const MessagesPage: React.FC = () => {
  const { messages, settings, isAuthenticated, addMessage, currentGuest, deleteMessage } = useStore();
  const navigate = useNavigate();
  
  const [author, setAuthor] = useState('');
  
  // Update author when guest or auth state changes
  useEffect(() => {
    if (currentGuest) {
      setAuthor(currentGuest.name || currentGuest.username);
    } else if (isAuthenticated) {
      setAuthor(settings.coupleName || "Noivos");
    }
  }, [currentGuest, isAuthenticated, settings.coupleName]);
  const [textContent, setTextContent] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'video' | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });
  
  const [localMessageIds, setLocalMessageIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('my_messages');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('my_messages', JSON.stringify(localMessageIds));
  }, [localMessageIds]);

  if (!settings.showMessagesToPublic && !isAuthenticated && !currentGuest) {
    return (
      <div className="min-h-screen bg-wedding-50 flex flex-col items-center justify-center p-4">
        <Lock size={48} className="text-wedding-400 mb-4" />
        <h2 className="text-2xl font-serif text-wedding-800 mb-2">Acesso Restrito</h2>
        <p className="text-wedding-600 text-center mb-6">O mural de recados está disponível apenas para convidados.</p>
        <button onClick={() => navigate('/login')} className="bg-wedding-800 text-white px-6 py-2 rounded-full hover:bg-wedding-700">Fazer Login</button>
      </div>
    );
  }

  const canView = !!settings.showMessagesToPublic || !!isAuthenticated || !!currentGuest;

  if (!canView) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-wedding-200 p-8 text-center">
          <div className="bg-wedding-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-wedding-800">
            <Lock size={32} />
          </div>
          <h1 className="font-script text-4xl text-wedding-800 mb-2">Mural Restrito</h1>
          <p className="font-serif text-wedding-600 uppercase text-xs tracking-widest mb-6">
            Acesso Privado
          </p>
          <p className="text-wedding-700 mb-8">
            Este mural de recados é privado. Por favor, faça login com sua conta de convidado para ver e deixar mensagens para os noivos.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-wedding-800 text-white font-serif uppercase tracking-widest py-3 rounded hover:bg-wedding-700 transition-colors shadow-md"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  const uploadToCloudinary = async (blob: Blob, type: 'audio' | 'video', fileName: string): Promise<{ url: string, publicId: string }> => {
      const userFolder = currentGuest ? normalizeName(currentGuest.username) : normalizeName(author);
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('public_id', fileName);
      formData.append('folder', `${type}s/${userFolder}`);
      
      const resourceType = 'video'; 

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Erro desconhecido no upload.');
      }

      const data = await response.json();
      return { url: data.secure_url, publicId: data.public_id };
  };

  const uploadToFirebase = async (blob: Blob, type: 'audio' | 'video', fileName: string): Promise<{ url: string, path: string }> => {
    const extension = type === 'video' ? 'mp4' : 'mp3';
    const userFolder = currentGuest ? normalizeName(currentGuest.username) : normalizeName(author);
    const path = `${type}s/${userFolder}/${fileName}.${extension}`;
    const storageRef = ref(storage, path);
    
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    return { url, path };
  };

  const getUserNextMessageNumber = () => {
    const userMessages = messages.filter(m => m.author === author);
    if (userMessages.length === 0) return 1;

    const numbers = userMessages.map(m => {
      const path = m.firebasePath || '';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim()) {
        alert("Por favor, digite seu nome!");
        return;
    }
    if (!textContent.trim() && !mediaBlob) {
        alert("Por favor, escreva uma mensagem ou grave um áudio/vídeo!");
        return;
    }

    setIsSubmitting(true);
    setUploadProgress('Iniciando...');

    try {
        let finalType: 'audio' | 'video' | 'text' | 'audio+text' | 'video+text' = 'text';
        let finalContent = textContent;
        let fallbackContent = '';
        let cloudinaryPublicId = '';
        let firebasePath = '';

        if (mediaBlob && mediaType) {
            const msgNumber = getUserNextMessageNumber().toString().padStart(2, '0');
            const normalizedAuthor = normalizeName(author);
            const dateStr = formatDate(new Date());
            const baseFileName = `${msgNumber}_${normalizedAuthor}_${dateStr}_${mediaType}`;

            setUploadProgress('Enviando para Cloudinary (Primário)...');
            try {
              const cData = await uploadToCloudinary(mediaBlob, mediaType, baseFileName);
              finalContent = cData.url;
              cloudinaryPublicId = cData.publicId;
            } catch (cErr) {
              console.error("Cloudinary upload failed:", cErr);
            }
            
            try {
              setUploadProgress('Enviando para Firebase (Redundância)...');
              
              // Ensure auth is ready
              if (!auth.currentUser) {
                console.log("Auth not ready, signing in anonymously...");
                await signInAnonymously(auth);
              }

              const fbData = await uploadToFirebase(mediaBlob, mediaType, baseFileName);
              if (!finalContent) finalContent = fbData.url;
              else fallbackContent = fbData.url;
              firebasePath = fbData.path;
            } catch (fbError) {
              console.error("Erro no upload redundante (Firebase):", fbError);
            }

            if (textContent.trim()) {
                finalType = `${mediaType}+text` as any;
            } else {
                finalType = mediaType;
            }
        }

        setUploadProgress('Salvando recado...');
        const newMsgId = await addMessage({
            author,
            authorId: currentGuest?.id,
            type: finalType,
            content: finalContent,
            fallbackContent: fallbackContent || undefined,
            cloudinaryPublicId: cloudinaryPublicId || undefined,
            firebasePath: firebasePath || undefined,
            ...(textContent.trim() ? { textContent: textContent.trim() } : {}),
            status: 'pending'
        });

        setLocalMessageIds(prev => [...prev, newMsgId]);

        if (!currentGuest && !isAuthenticated) {
            setAuthor('');
        }
        setTextContent('');
        setMediaPreview(null);
        setMediaBlob(null);
        setMediaType(null);
        setShowForm(false);
        setUploadProgress('');
        alert("Recado enviado com sucesso!");
    } catch (error: any) {
        console.error("Erro no envio:", error);
        alert(`Falha no envio: ${error.message}`);
    } finally {
        setIsSubmitting(false);
        setUploadProgress('');
    }
  };

  const handleDeleteMessage = (id: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Tem certeza que deseja excluir este recado permanentemente?',
      onConfirm: async () => {
        try {
          await deleteMessage(id);
          setLocalMessageIds(prev => prev.filter(mid => mid !== id));
        } catch (error) {
          console.error('Error deleting message:', error);
          alert('Erro ao excluir recado.');
        }
      }
    });
  };

  const isMessageOwner = (msg: any) => {
    return isAuthenticated || 
           (currentGuest && msg.authorId === currentGuest.id) || 
           localMessageIds.includes(msg.id);
  };

  const visibleMessages = messages.filter(msg => 
    msg.status === 'approved' || 
    isAuthenticated || 
    localMessageIds.includes(msg.id) ||
    !msg.status // For backward compatibility with old messages
  );

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wedding-50">
        <div className="text-center p-8 max-w-md">
          <Heart size={48} className="mx-auto text-wedding-300 mb-4" />
          <h1 className="font-serif text-3xl text-wedding-800 mb-4">Mural de Recados</h1>
          <p className="text-wedding-600">
            O mural de recados está desativado no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wedding-50 py-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-script text-6xl text-wedding-800 mb-6">Mural de Carinho</h1>
          <p className="font-serif text-wedding-600 text-lg max-w-2xl mx-auto mb-8">
            Mensagens, votos e energias positivas de quem amamos.
          </p>

          {!currentGuest && !isAuthenticated && (
            <div className="bg-white border border-wedding-200 p-6 rounded-2xl shadow-sm max-w-3xl mx-auto text-left mb-8">
              <h3 className="text-xl font-serif text-wedding-800 mb-2 text-center">Deixe seu recado!</h3>
              <p className="text-wedding-600 mb-4 text-center">
                Para deixar um recado, você precisa estar logado. Você pode escrever uma mensagem ou até mesmo gravar um vídeo ou áudio!
              </p>
              <p className="text-wedding-800 font-medium text-center mb-4">
                Lembre-se: teremos brindes especiais para os convidados que mais participarem do site logados!
              </p>
              <p className="text-wedding-600 font-bold mb-4 text-center">
                🎁 O recado mais criativo ganhará um presente especial! (Regras em breve)
              </p>
              <p className="text-sm text-wedding-500 italic text-center">
                Seu login e senha serão enviados junto com o convite em breve!
              </p>
            </div>
          )}

          {(currentGuest || isAuthenticated) && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="bg-wedding-800 text-white px-6 py-3 rounded hover:bg-wedding-700 font-serif shadow-md transition-colors inline-flex items-center gap-2"
            >
              <PenTool size={18} />
              {showForm ? 'Cancelar' : 'Deixar um Recado'}
            </button>
          )}
        </div>

        {showForm && (currentGuest || isAuthenticated) && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow-md border border-wedding-200 mb-12 animate-fade-in">
            <h3 className="font-serif text-2xl text-wedding-800 mb-4 text-center">Escreva sua mensagem</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-wedding-700 mb-1">Seu Nome *</label>
                <input 
                  type="text" 
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  disabled={!!currentGuest || isAuthenticated}
                  className={`w-full p-2 border border-wedding-300 rounded focus:ring-wedding-500 focus:border-wedding-500 ${(currentGuest || isAuthenticated) ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                  placeholder="Como quer ser chamado?"
                />
                {(currentGuest || isAuthenticated) && (
                  <p className="text-[10px] text-wedding-400 mt-1 italic">Nome atrelado à sua conta logada.</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-wedding-700 mb-1">Mensagem de Texto</label>
                <RichTextEditor 
                  value={textContent}
                  onChange={setTextContent}
                  placeholder="Escreva seus votos aqui..."
                />
              </div>

              <div className="border-t border-wedding-100 pt-4 space-y-4">
                <label className="block text-sm font-bold text-wedding-700 mb-1">Mídia (Opcional)</label>
                <MediaUploader 
                  onMediaSelected={(blob, type, previewUrl) => {
                    setMediaPreview(previewUrl);
                    setMediaBlob(blob);
                    setMediaType(type);
                  }}
                  onClearMedia={() => {
                    setMediaPreview(null);
                    setMediaBlob(null);
                    setMediaType(null);
                  }}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-wedding-100"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-wedding-400">Ou grave agora</span>
                  </div>
                </div>

                <Recorder 
                  key={isSubmitting ? 'submitting' : 'idle'} 
                  onRecordingComplete={(base64, blob, type) => {
                    setMediaPreview(base64);
                    setMediaBlob(blob);
                    setMediaType(type);
                }} />
              </div>

              <div className="pt-4 border-t border-wedding-200">
                <button
                  type="submit"
                  disabled={isSubmitting} 
                  className={`w-full py-3 rounded font-serif uppercase tracking-widest text-sm shadow-md transition-all flex items-center justify-center gap-2
                      ${isSubmitting 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-wedding-800 text-white hover:bg-wedding-700'
                      }`}
                >
                  {isSubmitting ? (
                      <><Loader2 className="animate-spin" /> {uploadProgress || 'Enviando...'}</>
                  ) : (
                      "Enviar Recado"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {visibleMessages.length === 0 ? (
           <div className="text-center text-wedding-400 italic py-12">
             Ainda não há recados visíveis. Seja o primeiro a enviar!
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleMessages.map((msg) => (
              <div key={msg.id} className="bg-white p-6 rounded-xl shadow-sm border border-wedding-200 transform hover:-translate-y-1 transition duration-300 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-wedding-100 rounded-bl-full -z-10 opacity-50"></div>
                
                {isMessageOwner(msg) && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute top-3 right-3 p-2 bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10 shadow-lg"
                    title="Excluir recado"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <Quote className="text-wedding-200 mb-4" size={32} />
                
                <div className={`mb-6 rounded-lg overflow-hidden flex flex-col items-center justify-center relative group ${msg.type === 'text' ? 'flex-grow' : 'bg-wedding-50'}`}>
                  {(msg.type === 'video' || msg.type === 'video+text') && (
                    <SmartMedia 
                      primaryUrl={msg.content}
                      fallbackUrl={msg.fallbackContent}
                      type="video"
                      className="w-full h-64 object-cover rounded-lg mb-4"
                    />
                  )}
                  {(msg.type === 'audio' || msg.type === 'audio+text') && (
                    <SmartMedia 
                      primaryUrl={msg.content}
                      fallbackUrl={msg.fallbackContent}
                      type="audio"
                    />
                  )}
                  {(msg.type === 'text' || msg.type === 'audio+text' || msg.type === 'video+text') && (msg.textContent || (msg.type === 'text' && msg.content)) && (
                    <div 
                      className="text-wedding-700 w-full prose prose-wedding prose-sm max-w-none break-words p-4 bg-white rounded-lg"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((msg.textContent || msg.content).replace(/\n/g, '<br/>')) }}
                    />
                  )}
                </div>
                <div className="mt-auto pt-4 border-t border-wedding-100 flex justify-between items-end">
                  <div>
                    <h3 className="font-serif text-xl text-wedding-800">{msg.author}</h3>
                    <p className="text-xs text-wedding-400 uppercase tracking-widest mt-1">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        title="Confirmação"
      >
        <div className="p-6 text-center">
            <p className="text-wedding-800 mb-6">{confirmModal.message}</p>
            <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { 
                    confirmModal.onConfirm(); 
                    setConfirmModal({ ...confirmModal, isOpen: false }); 
                  }} 
                  className="px-6 py-2 bg-wedding-800 text-white rounded hover:bg-wedding-700 transition"
                >
                  Confirmar
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};