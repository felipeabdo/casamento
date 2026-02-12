import React, { useState } from 'react';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { QRCodeSVG } from 'qrcode.react';
import { Gift, Heart, Copy, CheckCircle } from 'lucide-react';

export const GiftsPage: React.FC = () => {
  const { gifts, settings, purchaseGift } = useStore();
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  
  // Toast State
  const [showToast, setShowToast] = useState(false);

  const handleOpenGift = (giftId: string) => {
    setSelectedGift(giftId);
  };

  const handleConfirmPurchase = () => {
    if (selectedGift) {
      purchaseGift(selectedGift);
      // Keep modal open to show QR code, user manually closes it
    }
  };

  const activeGift = gifts.find(g => g.id === selectedGift);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(settings.pixKey);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000); // 5 seconds
  };

  return (
    <div className="min-h-screen bg-wedding-50 py-12 animate-fade-in relative">
      
      {/* Toast Notification */}
      <div className={`fixed top-24 right-4 z-50 max-w-sm w-full bg-white border border-wedding-300 shadow-xl rounded-lg p-4 transform transition-all duration-500 ease-in-out ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-green-500 mt-0.5">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-wedding-900 mb-1">Sucesso!</p>
            <p className="text-sm text-wedding-600 leading-relaxed">
              Chave pix copiada para a área de transferência. Escolha seu banco de preferência e confira se o pix está em nome de <strong>Jéssica Barbosa dos Anjos Del Corso</strong>. Obrigado!
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
          {gifts.map((gift) => (
            <div key={gift.id} className="bg-white rounded-sm shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-wedding-100 group flex flex-col h-full">
              <div className="h-64 overflow-hidden relative flex-shrink-0">
                <img 
                  src={gift.imageUrl} 
                  alt={gift.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                <div className="absolute top-0 right-0 bg-wedding-500 text-white px-3 py-1 m-2 text-sm font-bold shadow-sm">
                  R$ {gift.price.toFixed(2)}
                </div>
              </div>
              <div className="p-6 text-center flex flex-col flex-grow">
                {/* Title Container Fixed Height for Alignment */}
                <div className="h-14 mb-2 flex items-center justify-center w-full">
                   <h3 className="font-serif text-xl text-wedding-800 line-clamp-2 leading-tight px-2">{gift.name}</h3>
                </div>
                <p className="text-wedding-600 text-sm mb-6 line-clamp-3 px-2">{gift.description}</p>
                <div className="mt-auto w-full">
                    <button
                    onClick={() => handleOpenGift(gift.id)}
                    className="w-full bg-wedding-800 hover:bg-wedding-600 text-white font-serif py-3 px-6 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                    <Gift size={16} />
                    Faça os noivos felizes
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <Modal 
        isOpen={!!selectedGift} 
        onClose={() => setSelectedGift(null)}
        title="Presentear os Noivos"
      >
        {activeGift && (
          <div className="text-center space-y-6">
            <div className="bg-wedding-50 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-wedding-500">
              <Heart size={40} fill="currentColor" />
            </div>
            
            <div>
              <h4 className="font-serif text-2xl text-wedding-800 mb-2">Muito Obrigado!</h4>
              <p className="text-wedding-600">
                Para confirmar o presente <strong>{activeGift.name}</strong>, por favor utilize o QR Code abaixo para realizar o Pix no valor de:
              </p>
              <p className="text-3xl font-serif text-wedding-800 mt-4">
                R$ {activeGift.price.toFixed(2)}
              </p>
            </div>

            <div 
                className="flex flex-col items-center justify-center p-4 bg-white border border-wedding-200 inline-block mx-auto cursor-pointer hover:bg-wedding-50 transition"
                onClick={handleCopyPix}
                title="Clique para copiar a chave Pix"
            >
              <QRCodeSVG value={settings.pixKey} size={200} fgColor={settings.primaryColor} />
              <p className="text-xs text-wedding-400 mt-2 flex items-center gap-1"><Copy size={10} /> Clique no QR Code para copiar</p>
            </div>

            <div className="mt-4 p-3 bg-wedding-100 rounded text-center cursor-pointer hover:bg-wedding-200 transition" onClick={handleCopyPix}>
                <p className="text-xs text-wedding-500 uppercase tracking-wide mb-1">Chave Pix ({settings.pixKeyType})</p>
                <p className="font-mono text-wedding-900 break-all flex items-center justify-center gap-2">
                    {settings.pixKey} <Copy size={14} />
                </p>
            </div>

            <div className="text-sm text-wedding-500 italic">
              Após realizar o Pix, o valor será contabilizado em nossa transparência.
            </div>

            <button
               onClick={() => {
                 handleConfirmPurchase();
                 setSelectedGift(null);
               }}
               className="block w-full text-center text-wedding-800 hover:underline mt-4 text-sm"
            >
              Já realizei o pagamento, fechar.
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};