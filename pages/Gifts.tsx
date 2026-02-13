import React, { useState } from 'react';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { QRCodeSVG } from 'qrcode.react';
import { Gift as GiftIcon, Heart, Copy, CheckCircle, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Recorder } from '../components/MediaRecorder';

// --- CONFIGURAÇÃO DO CLOUDINARY ---
// VERIFIQUE SE O PRESET NO PAINEL DO CLOUDINARY ESTÁ COMO "UNSIGNED" (NÃO ASSINADO)
const CLOUDINARY_CLOUD_NAME = "Ydzbjlkypw"; 
const CLOUDINARY_UPLOAD_PRESET = "ml_default"; // Se criar um novo preset unsigned, atualize este nome aqui!

export const GiftsPage: React.FC = () => {
  const { gifts, settings, markGiftAsPending, addMessage } = useStore();
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  
  // States for Purchase Flow
  const [buyerName, setBuyerName] = useState('');
  
  // Media states
  const [mediaPreview, setMediaPreview] = useState<string | null>(null); // Base64 for instant preview
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null); // Real file for upload
  const [mediaType, setMediaType] = useState<'audio' | 'video' | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  // Toast
  const [showToast, setShowToast] = useState(false);

  const handleOpenGift = (giftId: string) => {
    setSelectedGift(giftId);
    setBuyerName('');
    setMediaPreview(null);
    setMediaBlob(null);
    setMediaType(null);
    setUploadProgress('');
  };

  const activeGift = gifts.find(g => g.id === selectedGift);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(settings.pixKey);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const uploadToCloudinary = async (blob: Blob, type: 'audio' | 'video'): Promise<string> => {
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('tags', 'casamento_recados');
      
      // 'auto' é mais seguro, pois o Cloudinary detecta o tipo correto (video ou audio) pelo arquivo
      const resourceType = 'auto'; 

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
          const errorData = await response.json();
          // Tratamento específico para o erro comum de configuração
          if (errorData.error?.message === "Unknown API key") {
              throw new Error("Erro de Configuração: O Preset do Cloudinary parece estar como 'Signed'. Mude para 'Unsigned' no painel do Cloudinary.");
          }
          throw new Error(errorData.error?.message || 'Erro no upload para o Cloudinary');
      }

      const data = await response.json();
      return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!activeGift) return;
    
    if (!buyerName.trim()) {
        alert("Por favor, digite seu nome para que os noivos saibam quem enviou!");
        return;
    }

    // Validação básica se o usuário esqueceu de configurar
    if ((CLOUDINARY_CLOUD_NAME as string) === "YOUR_CLOUD_NAME") {
        alert("Erro: Configure o CLOUDINARY_CLOUD_NAME no arquivo Gifts.tsx");
        return;
    }

    setIsSubmitting(true);
    setUploadProgress('Processando...');

    try {
        let downloadUrl = '';

        // 1. Upload Media if exists
        if (mediaBlob && mediaType) {
            
            if (mediaBlob.size === 0) {
                 throw new Error("O arquivo de vídeo está vazio (0 bytes). Tente gravar novamente.");
            }

            setUploadProgress('Enviando para a nuvem...');
            
            // Upload to Cloudinary
            downloadUrl = await uploadToCloudinary(mediaBlob, mediaType);
            
            console.log("File uploaded successfully:", downloadUrl);
        }

        // 2. Save Message with URL
        if (downloadUrl || (mediaPreview && !mediaBlob)) {
             setUploadProgress('Salvando recado...');
             addMessage({
                author: buyerName,
                type: mediaType || 'audio',
                content: downloadUrl, 
                giftId: activeGift.id
            });
        }

        // 3. Mark Gift as Pending
        setUploadProgress('Finalizando...');
        markGiftAsPending(activeGift.id, buyerName);

        setTimeout(() => {
            setIsSubmitting(false);
            setSelectedGift(null);
            alert("Obrigado! Avisamos os noivos do seu presente. O vídeo foi salvo com sucesso!");
        }, 500);

    } catch (error: any) {
        console.error("Error submitting gift:", error);
        alert(`Houve um erro: ${error.message}`);
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
        <p className="font-serif text-wedding-600 text-lg max-w-2xl mx-auto">
          Sua presença é o nosso maior presente. Mas se quiserem nos agraciar com um mimo para o início da nossa vida a dois, ficaremos muito felizes!
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {gifts.map((gift) => {
            const isConfirmed = gift.status === 'confirmed';
            
            return (
                <div key={gift.id} className={`rounded-sm shadow-md overflow-hidden transition-all duration-300 border group flex flex-col h-full ${getCardStyle(gift.status)}`}>
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
                    <p className="text-wedding-600 text-sm mb-6 line-clamp-3 px-2">{gift.description}</p>
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
              <p className="text-3xl font-serif text-wedding-800 mt-2">
                R$ {activeGift.price.toFixed(2)}
              </p>
            </div>

            {/* Input Nome */}
            <div>
                <label className="block text-sm font-bold text-wedding-700 mb-1">Seu Nome *</label>
                <input 
                    type="text" 
                    placeholder="Quem está dando este presente?"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full p-2 border border-wedding-300 rounded focus:ring-wedding-500 focus:border-wedding-500"
                />
            </div>

            {/* Payment Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PIX */}
                <div className="border border-wedding-200 rounded p-4 text-center hover:bg-wedding-50 transition cursor-pointer" onClick={handleCopyPix}>
                     <p className="text-sm font-bold text-wedding-800 mb-2 flex items-center justify-center gap-2"><Copy size={14}/> Pagar com Pix</p>
                     <div className="flex justify-center my-2">
                        <QRCodeSVG value={settings.pixKey} size={100} fgColor={settings.primaryColor} />
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

            {/* Media Recorder */}
            <Recorder onRecordingComplete={(base64, blob, type) => {
                setMediaPreview(base64);
                setMediaBlob(blob);
                setMediaType(type);
            }} />

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
                        mediaPreview ? "Confirmar Pagamento e Enviar Vídeo" : "Já fiz o pagamento"
                    )}
                </button>
                <p className="text-xs text-center text-wedding-400 mt-2">
                    Ao clicar, você avisa os noivos que realizou o pagamento.
                </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};