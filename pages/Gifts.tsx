import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore, useTheme } from '../store';
import { Modal } from '../components/Modal';
import { QRCodeSVG } from 'qrcode.react';
import { Gift as GiftIcon, Heart, Copy, CheckCircle, CreditCard, ExternalLink, Loader2, Move } from 'lucide-react';
import { Recorder } from '../components/MediaRecorder';
import { MediaUploader } from '../components/MediaUploader';
import { RichTextEditor } from '../components/RichTextEditor';

import { normalizeName, formatDate } from '../src/utils';
import { storage, auth } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';

// --- CONFIGURAÇÃO DO CLOUDINARY ---
// PREENCHA COM CUIDADO:
const CLOUDINARY_CLOUD_NAME = "dp1qpjvdf".trim(); // .trim() remove espaços acidentais
const CLOUDINARY_UPLOAD_PRESET = "casamento_upload".trim(); // Deve ser IDÊNTICO ao criado no painel

export const GiftsPage: React.FC = () => {
  const { gifts, settings, markGiftAsPending, addContribution, addMessage, currentGuest, isAuthenticated, updateGiftsOrder } = useStore();
  
  if (!isAuthenticated && !currentGuest) {
     return <Navigate to="/login" replace />;
  }

  const themeColor = useTheme();
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // States for Purchase Flow
  const [buyerName, setBuyerName] = useState('');
  const [contributionAmount, setContributionAmount] = useState<number>(0);
  
  // Update buyerName when guest or auth state changes
  React.useEffect(() => {
    if (currentGuest) {
      setBuyerName(currentGuest.name || currentGuest.username);
    } else if (isAuthenticated) {
      setBuyerName(settings.coupleName || "Noivos");
    }
  }, [currentGuest, isAuthenticated, settings.coupleName]);
  
  // Media states
  const [mediaPreview, setMediaPreview] = useState<string | null>(null); // Base64 for instant preview
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null); // Real file for upload
  const [mediaType, setMediaType] = useState<'audio' | 'video' | null>(null);
  const [textContent, setTextContent] = useState('');
  const [isExternalBuy, setIsExternalBuy] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  // Toast
  const [showToast, setShowToast] = useState(false);

  const handleOpenGift = (giftId: string) => {
    setSelectedGift(giftId);
    if (!currentGuest && !isAuthenticated) {
      setBuyerName('');
    }
    const gift = gifts.find(g => g.id === giftId);
    if (gift) {
      const totalArrecadado = gift.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      setContributionAmount(Math.max(0, gift.price - totalArrecadado));
    }
    setMediaPreview(null);
    setMediaBlob(null);
    setMediaType(null);
    setTextContent('');
    setIsExternalBuy(false);
    setUploadProgress('');
  };

  const activeGift = gifts.find(g => g.id === selectedGift);

  const handleCopyPix = () => {
    navigator.clipboard.writeText("00020126330014BR.GOV.BCB.PIX0111032718561925204000053039865802BR5917Jessica Del Corso6009SAO PAULO621405109U4QlRnEkL63040EE1");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const uploadToCloudinary = async (blob: Blob, type: 'audio' | 'video', fileName: string): Promise<{ url: string, publicId: string }> => {
      // DEBUG: Para ajudar a identificar o erro
      console.log(`[Upload] Tentando enviar para Cloud: ${CLOUDINARY_CLOUD_NAME} | Preset: ${CLOUDINARY_UPLOAD_PRESET}`);

      const userFolder = currentGuest ? normalizeName(currentGuest.username) : normalizeName(buyerName);
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
          console.error("Cloudinary Erro Detalhado:", errorData);
          throw new Error(errorData.error?.message || 'Erro desconhecido no upload.');
      }

      const data = await response.json();
      return { url: data.secure_url, publicId: data.public_id };
  };

  const uploadToFirebase = async (blob: Blob, type: 'audio' | 'video', fileName: string): Promise<{ url: string, path: string }> => {
    const extension = type === 'video' ? 'mp4' : 'mp3';
    const userFolder = currentGuest ? normalizeName(currentGuest.username) : normalizeName(buyerName);
    const path = `${type}s/${userFolder}/${fileName}.${extension}`;
    const storageRef = ref(storage, path);
    
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    return { url, path };
  };

  const getUserNextMessageNumber = () => {
    const { messages } = useStore();
    const userMessages = messages.filter(m => m.author === buyerName);
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

    const handleSubmit = async () => {
    if (!activeGift) return;
    
    if (!buyerName.trim()) {
        alert("Por favor, digite seu nome para que os noivos saibam quem enviou!");
        return;
    }

    if (contributionAmount <= 0) {
        alert("Por favor, insira um valor de contribuição válido.");
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

        // 1. Upload Media if exists
        if (mediaBlob && mediaType) {
            if (mediaBlob.size === 0) {
                 throw new Error("O arquivo gravado está vazio. Tente gravar novamente.");
            }
            
            const msgNumber = getUserNextMessageNumber().toString().padStart(2, '0');
            const normalizedAuthor = normalizeName(buyerName);
            const dateStr = formatDate(new Date());
            const fileName = `${msgNumber}_${normalizedAuthor}_${dateStr}_gift`;

            // Try Cloudinary first
            try {
                setUploadProgress('Enviando para Cloudinary...');
                const cloudData = await uploadToCloudinary(mediaBlob, mediaType, fileName);
                finalContent = cloudData.url;
                cloudinaryPublicId = cloudData.publicId;
            } catch (err) {
                console.error("Erro no Cloudinary:", err);
            }

            // Try Firebase Storage as fallback or redundant
            try {
                setUploadProgress('Enviando para Firebase...');
                
                // Ensure auth is ready
                if (!auth.currentUser) {
                    console.log("Auth not ready, signing in anonymously...");
                    await signInAnonymously(auth);
                }

                const fireData = await uploadToFirebase(mediaBlob, mediaType, fileName);
                if (!finalContent) finalContent = fireData.url;
                else fallbackContent = fireData.url;
                firebasePath = fireData.path;
            } catch (err) {
                console.error("Erro no upload redundante (Firebase):", err);
            }

            if (!finalContent) {
                throw new Error("Falha ao enviar mídia para ambos os serviços de armazenamento.");
            }
            
            if (textContent.trim()) {
                finalType = `${mediaType}+text` as any;
            } else {
                finalType = mediaType;
            }
        }

        // 2. Save Message with URL
        setUploadProgress('Salvando recado...');
        const newMsgId = await addMessage({
            author: buyerName,
            authorId: currentGuest?.id,
            type: finalType,
            content: finalContent,
            fallbackContent,
            cloudinaryPublicId,
            firebasePath,
            textContent: textContent.trim() || undefined,
            giftId: activeGift.id,
            status: 'pending'
        });
        
        const saved = localStorage.getItem('my_messages');
        const localMessageIds = saved ? JSON.parse(saved) : [];
        localStorage.setItem('my_messages', JSON.stringify([...localMessageIds, newMsgId]));

        // 3. Add Contribution
        setUploadProgress('Finalizando...');
        addContribution(activeGift.id, {
            amount: contributionAmount,
            buyerName: buyerName,
            isExternal: isExternalBuy
        });

        setTimeout(() => {
            setIsSubmitting(false);
            setSelectedGift(null);
            setMediaPreview(null);
            setMediaBlob(null);
            setMediaType(null);
            setTextContent('');
            setUploadProgress('');
            alert("Sucesso! Seu presente e vídeo foram enviados. Obrigado!");
        }, 500);

    } catch (error: any) {
        console.error("Erro no envio:", error);
        alert(`Falha no envio: ${error.message}`);
        setIsSubmitting(false);
        setUploadProgress('');
    }
  };

  const getCardStyle = (status: string) => {
      if (status === 'confirmed') {
          return "border-green-400 bg-green-50 shadow-green-100";
      }
      if (status === 'pending') {
          return "border-yellow-300 bg-yellow-50 shadow-sm";
      }
      return "border-wedding-100 bg-white hover:shadow-xl";
  };

  return (
    <div className="min-h-screen bg-wedding-50 py-12 animate-fade-in relative">
      
      {/* Toast Notification */}
      <div className={`fixed top-24 right-4 z-[60] max-w-sm w-full bg-white border border-wedding-300 shadow-xl rounded-lg p-4 transform transition-all duration-500 ease-in-out ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-green-500 mt-0.5">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-wedding-900 mb-1">Sucesso!</p>
            <p className="text-sm text-wedding-600 leading-relaxed">
              Chave pix copiada!
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
        <h1 className="font-script text-6xl text-wedding-800 mb-6">Lista de Presentes</h1>
        <p className="font-serif text-wedding-600 text-lg max-w-2xl mx-auto mb-6">
          Sua presença é o nosso maior presente. Mas se quiserem nos agraciar com um mimo para o início da nossa vida a dois, ficaremos muito felizes!
        </p>
        
        {!currentGuest && !isAuthenticated && (
          <div className="bg-white border border-wedding-200 p-6 rounded-2xl shadow-sm max-w-3xl mx-auto text-left">
            <h3 className="text-xl font-serif text-wedding-800 mb-2 text-center">Como funciona?</h3>
            <p className="text-wedding-600 mb-4 text-center">
              Você pode contribuir com qualquer valor para os nossos presentes, mesmo sem estar logado. 
              No entanto, se você fizer login, poderá deixar uma mensagem (texto, áudio ou vídeo) e acompanhar a confirmação da sua contribuição no seu painel exclusivo!
            </p>
            <p className="text-wedding-800 font-medium text-center mb-4">
              Lembre-se: teremos brindes especiais para os convidados que mais participarem do site logados!
            </p>
            <p className="text-sm text-wedding-500 italic text-center">
              Seu login e senha serão enviados junto com o convite em breve!
            </p>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isAuthenticated && (
          <div className="mb-6 p-4 bg-wedding-100 border border-wedding-300 text-wedding-800 text-sm rounded-lg flex items-center gap-2">
            <Move size={18} className="animate-bounce" />
            <span>
              <strong>Modo Administrador:</strong> Você pode alterar a ordem de exibição dos presentes clicando e arrastando os cartões para a posição desejada!
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {gifts.map((gift, index) => {
            const isConfirmed = gift.status === 'confirmed';
            const totalArrecadado = isConfirmed 
              ? Math.max(gift.price, gift.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0) 
              : (gift.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0);
            const progressPercent = Math.min(100, (totalArrecadado / gift.price) * 100);
            
            return (
              <div 
                key={gift.id} 
                draggable={isAuthenticated}
                onDragStart={() => {
                  if (isAuthenticated) setDraggedIndex(index);
                }}
                onDragOver={(e) => {
                  if (isAuthenticated) {
                    e.preventDefault();
                    setDragOverIndex(index);
                  }
                }}
                onDragLeave={() => {
                  if (isAuthenticated) setDragOverIndex(null);
                }}
                onDrop={async (e) => {
                  if (isAuthenticated) {
                    e.preventDefault();
                    setDragOverIndex(null);
                    if (draggedIndex !== null && draggedIndex !== index) {
                      const updatedGifts = [...gifts];
                      const [draggedItem] = updatedGifts.splice(draggedIndex, 1);
                      updatedGifts.splice(index, 0, draggedItem);
                      setDraggedIndex(null);
                      try {
                        await updateGiftsOrder(updatedGifts);
                      } catch (error) {
                        console.error("Erro ao reordenar presentes:", error);
                      }
                    }
                  }
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`rounded-sm shadow-md overflow-hidden transition-all duration-300 border group flex flex-col h-full relative ${getCardStyle(gift.status)} ${
                  isAuthenticated ? 'cursor-move hover:border-wedding-400' : ''
                } ${
                  draggedIndex === index ? 'opacity-40 border-dashed border-wedding-300' : ''
                } ${
                  dragOverIndex === index ? 'border-2 border-wedding-500 scale-102 shadow-lg' : ''
                }`}
              >
                {isAuthenticated && (
                  <div className="absolute top-0 left-0 bg-wedding-800 text-white p-2 m-2 shadow-sm rounded-full flex items-center justify-center cursor-move z-10 animate-pulse" title="Arraste para reordenar">
                    <Move size={14} />
                  </div>
                )}
                <div className="h-64 overflow-hidden relative flex-shrink-0">
                    <img 
                    src={gift.imageUrl} 
                    alt={gift.name} 
                    className={`w-full h-full object-cover transition-transform duration-700 ${isConfirmed ? 'grayscale opacity-70' : 'group-hover:scale-110'}`} 
                    />
                    <div className={`absolute top-0 right-0 px-3 py-1 m-2 text-sm font-bold shadow-sm ${isConfirmed ? 'bg-green-600 text-white' : 'bg-wedding-500 text-white'}`}>
                    R$ {gift.price.toFixed(2)}
                    </div>
                </div>
                <div className="p-6 text-center flex flex-col flex-grow">
                    <div className="h-14 mb-2 flex items-center justify-center w-full">
                        <h3 className="font-serif text-xl text-wedding-800 line-clamp-2 leading-tight px-2">{gift.name}</h3>
                    </div>
                    <p className="text-wedding-600 text-sm mb-4 line-clamp-3 px-2">{gift.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="w-full px-2 mb-6">
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                            <div className="bg-wedding-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <p className="text-xs text-wedding-500 text-right">
                            {progressPercent > 0 ? `Arrecadado: R$ ${totalArrecadado.toFixed(2)}` : 'Seja o primeiro a contribuir!'}
                        </p>
                    </div>

                    <div className="mt-auto w-full">
                        <button
                        onClick={() => isConfirmed ? setShowThankYouModal(true) : handleOpenGift(gift.id)}
                        disabled={isConfirmed && false} 
                        className={`w-full font-serif py-3 px-6 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-xs
                            ${isConfirmed 
                                ? 'bg-green-600 text-white cursor-default' 
                                : 'bg-wedding-800 hover:bg-wedding-600 text-white'
                            }`}
                        >
                        {isConfirmed ? (
                            <><CheckCircle size={16} /> AGRADECEMOS O PRESENTE! ❤️</>
                        ) : (
                            <><GiftIcon size={16} /> Faça os noivos felizes</>
                        )}
                        </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thank You Modal */}
      <Modal
        isOpen={showThankYouModal}
        onClose={() => setShowThankYouModal(false)}
        title="Obrigado!"
      >
          <div className="text-center p-6 space-y-4">
               <Heart size={64} className="text-red-400 mx-auto animate-pulse" fill="#f87171" />
               <h3 className="font-serif text-2xl text-wedding-800">Obrigado a você que contribuiu com o nosso sonho!</h3>
               <p className="text-wedding-600">Cada gesto de carinho nos ajuda a construir nossa nova vida. Somos eternamente gratos por ter pessoas tão especiais ao nosso lado.</p>
          </div>
      </Modal>

      {/* Purchase Modal */}
      <Modal 
        isOpen={!!selectedGift} 
        onClose={() => !isSubmitting && setSelectedGift(null)}
        title="Presentear os Noivos"
      >
        {activeGift && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="text-center">
              <div className="bg-wedding-50 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-wedding-500 mb-4">
                <Heart size={32} fill="currentColor" />
              </div>
              <h4 className="font-serif text-xl text-wedding-800">Você escolheu: {activeGift.name}</h4>
              
              {/* Progress in Modal */}
              <div className="w-full max-w-xs mx-auto mt-4 mb-2">
                  <div className="flex justify-between text-xs text-wedding-600 mb-1">
                      <span>Arrecadado: R$ {(activeGift.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0).toFixed(2)}</span>
                      <span>Total: R$ {activeGift.price.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-wedding-600 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((activeGift.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0) / activeGift.price) * 100)}%` }}></div>
                  </div>
              </div>
            </div>

            {/* Input Valor da Contribuição */}
            <div>
                <label className="block text-sm font-bold text-wedding-700 mb-1">Valor da Contribuição (R$)</label>
                <input 
                    type="number" 
                    min="1"
                    max={Math.max(0, activeGift.price - (activeGift.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0))}
                    value={contributionAmount || ''}
                    onChange={(e) => setContributionAmount(Number(e.target.value))}
                    className="w-full p-2 border border-wedding-300 rounded focus:ring-wedding-500 focus:border-wedding-500 text-lg font-bold text-wedding-800"
                />
                <p className="text-[10px] text-wedding-400 mt-1 italic">Você pode contribuir com qualquer valor para este presente.</p>
            </div>

            {/* Input Nome */}
            <div>
                <label className="block text-sm font-bold text-wedding-700 mb-1">Seu Nome *</label>
                <input 
                    type="text" 
                    placeholder="Quem está dando este presente?"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    disabled={!!currentGuest || isAuthenticated}
                    className={`w-full p-2 border border-wedding-300 rounded focus:ring-wedding-500 focus:border-wedding-500 ${(currentGuest || isAuthenticated) ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                />
                {(currentGuest || isAuthenticated) && (
                  <p className="text-[10px] text-wedding-400 mt-1 italic">Nome atrelado à sua conta logada.</p>
                )}
            </div>

            {/* Mensagem de Texto e Mídia (Apenas para logados) */}
            {(currentGuest || isAuthenticated) ? (
              <>
                {/* Mensagem de Texto */}
                <div>
                    <label className="block text-sm font-bold text-wedding-700 mb-1">Mensagem (Opcional)</label>
                    <RichTextEditor 
                      value={textContent}
                      onChange={setTextContent}
                      placeholder="Deixe um recado para os noivos..."
                    />
                </div>

                {/* Media Upload & Recorder */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-wedding-700 mb-1">Mídia (Opcional)</label>
                    <div className="grid grid-cols-1 gap-4">
                      <MediaUploader 
                        onMediaSelected={(blob, type, previewUrl) => {
                          setMediaBlob(blob);
                          setMediaType(type);
                          setMediaPreview(previewUrl);
                        }}
                        onClearMedia={() => {
                          setMediaBlob(null);
                          setMediaType(null);
                          setMediaPreview(null);
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
                        }} 
                      />
                    </div>
                </div>
              </>
            ) : (
              <div className="bg-wedding-50 border border-wedding-200 p-4 rounded-lg text-sm text-wedding-700 text-center">
                <p className="font-medium mb-1">Quer deixar uma mensagem?</p>
                <p className="italic text-wedding-500">Faça login para enviar mensagens de texto, áudio ou vídeo junto com o seu presente e concorrer a brindes exclusivos!</p>
              </div>
            )}

            {/* External Link Block */}
            {activeGift.externalLink && (
              <div className="border-2 border-wedding-200 bg-white p-4 rounded-lg mt-6">
                <h4 className="font-serif text-lg text-wedding-800 mb-2 flex items-center justify-center gap-2">
                  <GiftIcon size={18} /> Comprar direto na loja
                </h4>
                <p className="text-sm text-wedding-600 text-center mb-4">
                  Se preferir, você pode comprar este presente diretamente na loja e enviar para o nosso endereço.
                </p>
                <div className="flex justify-center mb-4">
                  <a 
                    href={activeGift.externalLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 bg-wedding-800 text-white px-4 py-2 rounded hover:bg-wedding-700 transition font-serif uppercase tracking-wider text-xs"
                  >
                    Abrir Loja Externa <ExternalLink size={14} />
                  </a>
                </div>
                <div className="bg-wedding-50 p-4 rounded text-sm text-wedding-700">
                  <p className="font-bold mb-2 text-center uppercase text-xs tracking-widest text-wedding-800 border-b border-wedding-200 pb-2">Endereço para Entrega:</p>
                  <p className="whitespace-pre-line text-center">
                    Avenida Pau Brasil, Lote 18, Residencial Pau Brasil
                    Apartamento 703 Bloco A - Águas Claras.
                    CEP: 71926-000
                  </p>
                  <div className="flex justify-center mt-3 mb-4">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("Avenida Pau Brasil, Lote 18, Residencial Pau Brasil, apartamento 703 Bloco A - Águas Claras. CEP: 71926-000");
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3000);
                      }}
                      className="text-wedding-800 underline hover:text-wedding-600 flex items-center gap-1 font-bold text-xs uppercase"
                    >
                      <Copy size={12} /> Copiar Endereço
                    </button>
                  </div>
                  
                  <div className="border-t border-wedding-200 pt-3 text-center">
                    <p className="text-xs text-wedding-600 mb-2">Se você já comprou pela loja externa:</p>
                    <button
                       onClick={() => {
                           const remaining = Math.max(0, activeGift.price - (activeGift.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0));
                           setContributionAmount(remaining);
                           setIsExternalBuy(true);
                           alert("Ótimo! Agora só preencha seu nome (e deixe um recado se quiser) lá no final e clique em 'Confirmar'!");
                       }}
                       className="text-white bg-green-600 hover:bg-green-700 font-bold uppercase text-xs px-4 py-2 rounded transition w-full"
                    >
                      Já comprei e enviei para o endereço
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Options (Cotas) */}
            <div className="mt-6 mb-2">
               <h4 className="font-serif text-lg text-wedding-800 text-center mb-2">Ou dê como cota (Pix/Cartão):</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PIX */}
                <div className="border border-wedding-200 rounded p-4 text-center hover:bg-wedding-50 transition cursor-pointer" onClick={handleCopyPix}>
                     <p className="text-sm font-bold text-wedding-800 mb-2 flex items-center justify-center gap-2"><Copy size={14}/> Pagar com Pix</p>
                     <div className="flex justify-center my-2">
                        <QRCodeSVG value="00020126330014BR.GOV.BCB.PIX0111032718561925204000053039865802BR5917Jessica Del Corso6009SAO PAULO621405109U4QlRnEkL63040EE1" size={100} fgColor={themeColor} />
                     </div>
                     <p className="text-xs text-wedding-400">Clique para copiar</p>
                </div>

                {/* Card Link */}
                <div className={`border border-wedding-200 rounded p-4 text-center flex flex-col items-center justify-center ${settings.paymentUrl ? 'hover:bg-wedding-50' : 'opacity-50 bg-gray-50'}`}>
                    <p className="text-sm font-bold text-wedding-800 mb-2 flex items-center justify-center gap-2"><CreditCard size={14}/> Cartão de Crédito</p>
                    {settings.paymentUrl ? (
                         <a 
                            href={settings.paymentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-blue-600 text-white text-xs px-3 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition"
                         >
                            Link de Pagamento <ExternalLink size={12} />
                         </a>
                    ) : (
                        <p className="text-xs text-gray-400">Opção indisponível</p>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-wedding-200">
                <button
                    onClick={handleSubmit}
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
                        (mediaPreview || textContent.trim()) ? "Confirmar Presente e Enviar Recado" : "Confirmar Presente"
                    )}
                </button>
                <p className="text-xs text-center text-wedding-400 mt-2">
                    Ao confirmar, o presente contabilizará a sua contribuição.
                </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};