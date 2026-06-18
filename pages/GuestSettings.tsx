import React, { useState, useRef } from 'react';
import { useStore, useTheme } from '../store';
import { Settings, HelpCircle, Save, CheckCircle, Camera, Trash2, Palette, Gift, X } from 'lucide-react';
import { motion } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { PhotoCropper } from '../components/PhotoCropper';
import { Modal } from '../components/Modal';

const THEMES = [
  { name: 'Padrão', color: '#5c4d44' },
  { name: 'Azul Claro', color: '#add8e6' },
  { name: 'Grafite', color: '#53565A' },
  { name: 'Sálvia', color: '#8A9A5B' },
  { name: 'Azul Escuro', color: '#00008B' },
  { name: 'Borgonha', color: '#800020' },
  { name: 'Verde Musgo', color: '#4A5D23' },
  { name: 'Ouro Pálido', color: '#E6BE8A' }
];

export const GuestSettings: React.FC = () => {
  const { currentGuest, updateGuest, settings, gifts } = useStore();
  const themeColor = useTheme();
  const [showWizard, setShowWizard] = useState(currentGuest?.showWizard !== false);
  const [selectedTheme, setSelectedTheme] = useState(currentGuest?.themeColor || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentGuest) {
    return (
      <div className="min-h-screen bg-wedding-50 flex items-center justify-center p-4">
        <div className="text-center text-wedding-600">
          Você precisa estar logado como convidado para acessar esta página.
        </div>
      </div>
    );
  }

  const myContributions = gifts.flatMap(gift => 
    (gift.contributions || [])
      .filter(c => c.buyerName === currentGuest.username || c.buyerName === currentGuest.name)
      .map(c => ({ ...c, giftName: gift.name, giftId: gift.id }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGuest(currentGuest.id, { 
        showWizard,
        themeColor: selectedTheme || undefined
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving guest settings:", error);
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCroppingImage(reader.result as string);
      setOriginalFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCroppedImage = async (blob: Blob) => {
    setCroppingImage(null);
    if (!originalFile) return;

    setIsUploading(true);
    try {
      const { listAll } = await import('firebase/storage');
      const userFolderRef = ref(storage, `users/${currentGuest.username}`);
      
      let nextNumber = 1;
      try {
        const res = await listAll(userFolderRef);
        nextNumber = res.items.length + 1;
      } catch (err) {
        console.log("Folder might not exist yet, starting at 1");
      }

      // Format: 01_nome_data_user.ext
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const ext = originalFile.name.split('.').pop();
      const safeName = currentGuest.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const paddedNumber = nextNumber.toString().padStart(2, '0');
      const filename = `${paddedNumber}_${safeName}_${dateStr}_user.${ext}`;
      
      const storageRef = ref(storage, `users/${currentGuest.username}/${filename}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      
      await updateGuest(currentGuest.id, { photoUrl: url });
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Erro ao enviar foto. Tente novamente.");
    } finally {
      setIsUploading(false);
      setOriginalFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRemovePhoto = async () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemovePhoto = async () => {
    setShowRemoveConfirm(false);
    try {
      await updateGuest(currentGuest.id, { photoUrl: '' });
      setErrorMessage(null);
    } catch (error: any) {
      console.error("Error removing photo:", error);
      setErrorMessage(`Erro ao remover foto: ${error.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="min-h-screen bg-wedding-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-wedding-800">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-serif text-wedding-800">Configurações do Convidado</h1>
            <p className="text-wedding-600">Gerencie suas preferências no site</p>
          </div>
        </div>

        {croppingImage && (
          <PhotoCropper 
            imageSrc={croppingImage} 
            onSave={handleSaveCroppedImage} 
            onClose={() => setCroppingImage(null)} 
          />
        )}
        {errorMessage && (
          <Modal isOpen={true} onClose={() => setErrorMessage(null)} title="Erro">
            <p className="mb-4 text-red-600">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="w-full px-4 py-2 bg-gray-200 rounded-lg">Fechar</button>
          </Modal>
        )}
        {showRemoveConfirm && (
          <Modal isOpen={true} onClose={() => setShowRemoveConfirm(false)} title="Remover Foto">
            <p className="mb-4">Tem certeza que deseja remover sua foto de perfil?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowRemoveConfirm(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmRemovePhoto} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Remover</button>
            </div>
          </Modal>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-wedding-200 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-8">
            
            {/* RSVP Section */}
            <div className="flex items-start gap-4 pb-8 border-b border-wedding-100">
              <div className="mt-1">
                <CheckCircle className="text-wedding-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-wedding-900 mb-1">Confirmação de Presença (RSVP)</h3>
                <p className="text-wedding-600 text-sm mb-4">
                  Gostaríamos muito de contar com a sua presença no nosso grande dia!
                </p>
                <div className="flex gap-4 w-full max-w-md">
                  <button 
                    onClick={() => updateGuest(currentGuest.id, { rsvpStatus: currentGuest.rsvpStatus === 'confirmed' ? 'pending' : 'confirmed' })}
                    className={`flex-1 py-3 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2 ${currentGuest.rsvpStatus === 'confirmed' ? 'bg-green-500 text-white' : 'bg-white text-green-600 border border-green-200 hover:bg-green-50'}`}
                  >
                    <CheckCircle size={18} /> Sim, eu vou!
                  </button>
                  <button 
                    onClick={() => updateGuest(currentGuest.id, { rsvpStatus: currentGuest.rsvpStatus === 'declined' ? 'pending' : 'declined' })}
                    className={`flex-1 py-3 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2 ${currentGuest.rsvpStatus === 'declined' ? 'bg-red-500 text-white' : 'bg-white text-red-500 border border-red-200 hover:bg-red-50'}`}
                  >
                    <X size={18} /> Não poderei
                  </button>
                </div>
                {currentGuest.rsvpStatus === 'confirmed' && (
                  <p className="text-sm text-green-600 mt-3 font-medium">Presença confirmada! Te enviamos um email com os detalhes.</p>
                )}
                {currentGuest.rsvpStatus === 'declined' && (
                  <p className="text-sm text-red-500 mt-3 font-medium">Que pena! Sentiremos sua falta.</p>
                )}
              </div>
            </div>

            {/* Profile Picture */}
            <div className="flex items-start gap-4 pb-8 border-b border-wedding-100">
              <div className="mt-1">
                <Camera className="text-wedding-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-wedding-900 mb-1">Foto de Perfil</h3>
                <p className="text-wedding-600 text-sm mb-4">
                  Adicione uma foto para aparecer no menu do site.
                </p>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden bg-wedding-100 border-2 border-wedding-200 flex items-center justify-center shrink-0">
                    {currentGuest.photoUrl ? (
                      <img src={currentGuest.photoUrl} alt={currentGuest.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-serif text-wedding-400 uppercase">
                        {currentGuest.name.charAt(0)}
                      </span>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-wedding-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-4 py-2 bg-wedding-100 text-wedding-800 rounded-lg text-sm font-medium hover:bg-wedding-200 transition-colors disabled:opacity-50"
                    >
                      {currentGuest.photoUrl ? 'Trocar Foto' : 'Enviar Foto'}
                    </button>
                    {currentGuest.photoUrl && (
                      <button 
                        onClick={handleRemovePhoto}
                        disabled={isUploading}
                        className="flex items-center justify-center gap-1 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Selection */}
            <div className="flex items-start gap-4 pb-8 border-b border-wedding-100">
              <div className="mt-1">
                <Palette className="text-wedding-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-wedding-900 mb-1">Cor do Tema</h3>
                <p className="text-wedding-600 text-sm mb-4">
                  Personalize a cor principal do site para você.
                </p>
                <div className="flex flex-wrap gap-3">
                  {THEMES.map((theme) => {
                    const isSelected = selectedTheme === theme.color || (!selectedTheme && theme.name === 'Padrão');
                    return (
                      <button
                        key={theme.name}
                        onClick={() => setSelectedTheme(theme.name === 'Padrão' ? '' : theme.color)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${isSelected ? 'ring-2 ring-offset-2 ring-wedding-800' : 'ring-1 ring-gray-200'}`}
                        style={{ backgroundColor: theme.color }}
                        title={theme.name}
                      >
                        {isSelected && <CheckCircle size={16} className="text-white drop-shadow-md" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Wizard Setting */}
            <div className="flex items-start gap-4 pb-8 border-b border-wedding-100">
              <div className="mt-1">
                <HelpCircle className="text-wedding-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-wedding-900 mb-1">Guia Interativo (Wizard)</h3>
                <p className="text-wedding-600 text-sm mb-4">
                  O guia interativo mostra como usar as funcionalidades do site, como enviar fotos, recados e como excluir seus próprios envios.
                </p>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={showWizard}
                      onChange={(e) => setShowWizard(e.target.checked)}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${showWizard ? 'bg-wedding-600' : 'bg-gray-300'}`} style={{ backgroundColor: showWizard ? themeColor : undefined }}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showWizard ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-wedding-800 font-medium">
                    {showWizard ? 'Habilitado' : 'Desabilitado'}
                  </div>
                </label>
              </div>
            </div>

            {/* Minhas Contribuições */}
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <Gift className="text-wedding-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-wedding-900 mb-1">Minhas Contribuições</h3>
                <p className="text-wedding-600 text-sm mb-4">
                  Acompanhe os presentes que você ajudou a comprar.
                </p>
                {myContributions.length === 0 ? (
                  <div className="text-sm text-wedding-500 italic bg-wedding-50 p-4 rounded-lg border border-wedding-100">
                    Você ainda não contribuiu com nenhum presente.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myContributions.map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-white p-4 border border-wedding-100 rounded-lg shadow-sm">
                        <div>
                          <div className="font-medium text-wedding-800">{c.giftName}</div>
                          <div className="text-sm text-wedding-600">R$ {c.amount.toFixed(2)}</div>
                        </div>
                        <div>
                          {c.status === 'confirmed' ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-medium">
                              <CheckCircle size={14} />
                              Confirmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-medium animate-pulse">
                              Aguardando
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
          
          <div className="bg-wedding-50 px-6 py-4 border-t border-wedding-200 flex items-center justify-end gap-4">
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-green-600 text-sm font-medium"
              >
                <CheckCircle size={16} />
                Salvo com sucesso!
              </motion.div>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-wedding-800 text-white rounded-lg hover:bg-wedding-700 transition-colors disabled:opacity-50"
              style={{ backgroundColor: themeColor }}
            >
              <Save size={18} />
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
