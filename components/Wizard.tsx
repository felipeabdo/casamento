import React, { useState, useEffect } from 'react';
import { useStore, useTheme } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, CheckCircle, Camera, MessageCircle, Gift, Heart, Trash2, Play, Video, Clock, MapPin, Settings } from 'lucide-react';

const WIZARD_STEPS = [
  {
    id: 'welcome',
    title: 'Bem-vindo(a)!',
    content: 'Preparamos este espaço com muito carinho. Vamos fazer um tour rápido para você conhecer todas as funcionalidades?',
    icon: <Heart size={48} className="text-wedding-500" />,
    path: '/'
  },
  {
    id: 'home',
    title: 'Nossa História',
    content: 'Na página inicial, você encontra os detalhes do nosso casamento, nossa história e informações importantes sobre o grande dia.',
    icon: <Heart size={48} className="text-wedding-500" />,
    path: '/'
  },
  {
    id: 'location',
    title: 'Como Chegar',
    content: 'Logo abaixo da nossa história, você encontrará o mapa interativo com o local da festa.\n\nPara facilitar, disponibilizamos botões que abrem o endereço diretamente no seu aplicativo favorito: Google Maps, Waze, Uber ou 99!',
    icon: <MapPin size={48} className="text-wedding-500" />,
    path: '/',
    animation: 'location'
  },
  {
    id: 'gifts',
    title: 'Lista de Presentes',
    content: 'Aqui você pode contribuir com nossa lua de mel ou casa nova. Escolha um presente, veja as opções de pagamento (como PIX) e confirme.\n\nApós a compra, o presente ficará como "Aguardando Confirmação" até que os noivos validem o recebimento. Depois, ele aparecerá como "Confirmado"!',
    icon: <Gift size={48} className="text-wedding-500" />,
    path: '/gifts',
    animation: 'gifts'
  },
  {
    id: 'messages',
    title: 'Mural de Recados',
    content: 'Deixe uma mensagem para nós! Você pode enviar apenas texto, ou combinar texto com um áudio ou vídeo.\n\nSinta-se à vontade para mandar quantos recados quiser! E se precisar, você pode apagar os seus próprios recados clicando na lixeira.',
    icon: <MessageCircle size={48} className="text-wedding-500" />,
    path: '/messages',
    animation: 'message'
  },
  {
    id: 'gallery',
    title: 'Fotos da Festa',
    content: 'Compartilhe os momentos que você registrar! Envie fotos diretamente do seu celular para o nosso mural.\n\nAssim como nos recados, você tem controle total e pode apagar as fotos que enviou a qualquer momento.',
    icon: <Camera size={48} className="text-wedding-500" />,
    path: '/gallery',
    animation: 'gallery'
  },
  {
    id: 'customization',
    title: 'Personalização',
    content: 'Deixe o site com a sua cara! Clicando no seu perfil no menu, você pode adicionar uma foto e escolher a cor do tema que mais combina com você.',
    icon: <Settings size={48} className="text-wedding-500" />,
    path: '/',
    animation: 'customization'
  },
  {
    id: 'finish',
    title: 'Tudo Pronto!',
    content: 'Agora você já sabe como usar nosso site. Aproveite!\n\nVocê pode alterar suas preferências a qualquer momento clicando no ícone de engrenagem no menu.',
    icon: <CheckCircle size={48} className="text-green-500" />,
    path: '/'
  }
];

const LocationSimulation = () => {
  return (
    <div className="bg-wedding-50 p-4 rounded-xl border border-wedding-100 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Fake Map */}
        <div className="h-24 bg-gray-200 relative flex items-center justify-center overflow-hidden">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3839.2698354468034!2d-48.00420188885709!3d-15.789719684786828!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a3160949a5751%3A0x1779fc2a3259d303!2sSpazio%20Villa%20Regia!5e0!3m2!1spt-BR!2sbr!4v1773840078578!5m2!1spt-BR!2sbr"
            className="absolute inset-0 w-full h-full opacity-80 pointer-events-none"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            aria-hidden="true"
          />
        </div>
        {/* Fake Buttons */}
        <div className="p-3">
          <p className="text-xs text-center text-wedding-800 font-bold mb-2 uppercase tracking-wider">Como chegar</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-600 text-white text-[10px] py-1.5 rounded flex items-center justify-center gap-1 font-medium">
              Google Maps
            </div>
            <div className="bg-cyan-500 text-white text-[10px] py-1.5 rounded flex items-center justify-center gap-1 font-medium">
              Waze
            </div>
            <div className="bg-black text-white text-[10px] py-1.5 rounded flex items-center justify-center gap-1 font-medium">
              Uber
            </div>
            <div className="bg-yellow-500 text-black text-[10px] py-1.5 rounded flex items-center justify-center gap-1 font-medium">
              99
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-wedding-400 mt-3 italic">Simulação: Clique nos botões para abrir o app de transporte.</p>
    </div>
  );
};

const GiftSimulation = () => {
  const [status, setStatus] = useState(0); // 0: available, 1: pending, 2: confirmed

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(s => (s + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-wedding-50 p-4 rounded-xl border border-wedding-100 mb-8">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div className="flex gap-3">
          <img src="https://picsum.photos/seed/jantar/100/100" alt="Jantar" className="w-16 h-16 rounded object-cover" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-wedding-800">Jantar Romântico</h4>
            <p className="text-xs text-gray-500 mb-2">R$ 300,00</p>
            {status === 0 && (
              <div className="inline-block px-3 py-1 bg-wedding-800 text-white text-xs rounded">Presentear</div>
            )}
            {status === 1 && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                <Clock size={12} /> Aguardando Confirmação
              </div>
            )}
            {status === 2 && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                <CheckCircle size={12} /> Confirmado
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-wedding-400 mt-3 italic">Simulação: O status muda após a confirmação dos noivos.</p>
    </div>
  );
};

const CustomizationSimulation = () => {
  return (
    <div className="bg-wedding-50 p-4 rounded-xl border border-wedding-100 mb-8">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-wedding-100 border-2 border-wedding-200 flex items-center justify-center overflow-hidden">
            <img src="https://picsum.photos/seed/user/100/100" alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 bg-wedding-600 text-white p-1 rounded-full border-2 border-white">
            <Camera size={12} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-[#5c4d44] ring-2 ring-offset-1 ring-[#5c4d44]"></div>
          <div className="w-6 h-6 rounded-full bg-[#add8e6]"></div>
          <div className="w-6 h-6 rounded-full bg-[#8A9A5B]"></div>
        </div>
      </div>
      <p className="text-xs text-center text-wedding-400 mt-3 italic">Simulação: Acesse as configurações no menu para personalizar.</p>
    </div>
  );
};

export const Wizard: React.FC = () => {
  const { currentGuest, updateGuest, settings } = useStore();
  const themeColor = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showNextTime, setShowNextTime] = useState(true);

  useEffect(() => {
    // Check if we should show the wizard
    if (currentGuest && currentGuest.showWizard !== false) {
      // Only start if we haven't already started in this session
      const hasSeenSession = sessionStorage.getItem('wizard_seen_session');
      if (!hasSeenSession) {
        setIsVisible(true);
        sessionStorage.setItem('wizard_seen_session', 'true');
      }
    }
  }, [currentGuest]);

  // Navigate when step changes
  useEffect(() => {
    if (isVisible && WIZARD_STEPS[currentStep]) {
      const targetPath = WIZARD_STEPS[currentStep].path;
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    }
  }, [currentStep, isVisible, navigate, location.pathname]);

  if (!isVisible || !currentGuest) return null;

  const step = WIZARD_STEPS[currentStep];
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      finishWizard();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const finishWizard = async () => {
    setIsVisible(false);
    if (!showNextTime) {
      try {
        await updateGuest(currentGuest.id, { showWizard: false });
      } catch (error) {
        console.error("Error updating guest wizard preference:", error);
      }
    }
  };

  const skipWizard = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-wedding-900/60 backdrop-blur-sm pointer-events-auto"
            onClick={isLastStep ? finishWizard : undefined}
          />

          {/* Modal */}
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border border-wedding-200 flex flex-col max-h-[83vh]"
          >
            {/* Close button - Only show if not mandatory or if already seen once */}
            {(currentGuest.showWizard === false || isLastStep) && (
              <button 
                onClick={skipWizard}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 bg-white/80 backdrop-blur-sm rounded-full p-1"
                title="Fechar"
              >
                <X size={20} />
              </button>
            )}

            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-wedding-50 rounded-full flex items-center justify-center border border-wedding-100 shrink-0">
                  {step.icon}
                </div>
              </div>

              <h2 className="text-2xl font-serif text-wedding-800 text-center mb-4">
                {step.title}
              </h2>

              <div className="text-wedding-600 text-center space-y-4 mb-8 whitespace-pre-line">
                {step.content}
              </div>

              {/* Animations / Simulations */}
              {step.animation === 'location' && <LocationSimulation />}
              {step.animation === 'gifts' && <GiftSimulation />}
              {step.animation === 'customization' && <CustomizationSimulation />}
              
              {step.animation === 'message' && (
                <div className="bg-wedding-50 p-4 rounded-xl border border-wedding-100 mb-8 space-y-3 relative overflow-hidden">
                  {/* Text Message */}
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 relative">
                    <p className="text-xs text-gray-600">"Desejo toda a felicidade do mundo para vocês!"</p>
                    <motion.div 
                      whileHover={{ scale: 1.2 }}
                      className="absolute top-2 right-2 text-red-500 bg-red-50 p-1 rounded-full cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </motion.div>
                  </div>
                  
                  {/* Audio + Text */}
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-100 p-2 rounded mb-2">
                      <Play size={14} className="text-gray-600" />
                      <div className="h-1 bg-gray-300 flex-1 rounded overflow-hidden">
                        <div className="w-1/3 h-full bg-wedding-500 rounded"></div>
                      </div>
                      <span className="text-[10px] text-gray-500">0:15</span>
                    </div>
                    <p className="text-xs text-gray-600">"Ouçam nossa mensagem acima! ❤️"</p>
                  </div>

                  {/* Video + Text */}
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex gap-3 items-center">
                    <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center relative overflow-hidden">
                      <img src="https://picsum.photos/seed/video/100/100" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <Video size={16} className="text-gray-600 relative z-10" />
                    </div>
                    <p className="text-xs text-gray-600 flex-1">"Fizemos um vídeo especial para vocês!"</p>
                  </div>

                  <p className="text-xs text-center text-wedding-400 mt-2 italic">Simulação: A lixeira aparece apenas nos seus recados.</p>
                </div>
              )}

              {step.animation === 'gallery' && (
                <div className="bg-wedding-50 p-4 rounded-xl border border-wedding-100 mb-8 relative overflow-hidden">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-square bg-gray-200 rounded-lg relative group overflow-hidden">
                      <img src="https://picsum.photos/seed/wedding1/200/200" className="w-full h-full object-cover" />
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </motion.div>
                    </div>
                    <div className="aspect-square bg-gray-300 rounded-lg overflow-hidden">
                      <img src="https://picsum.photos/seed/wedding2/200/200" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square bg-gray-300 rounded-lg overflow-hidden">
                      <img src="https://picsum.photos/seed/wedding3/200/200" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <p className="text-xs text-center text-wedding-400 mt-2 italic">Simulação: Você pode excluir as fotos que enviou.</p>
                </div>
              )}

              {isLastStep && (
                <div className="bg-wedding-50 p-4 rounded-xl border border-wedding-100 mb-8">
                  <label className="flex items-center justify-center cursor-pointer gap-3">
                    <input 
                      type="checkbox" 
                      checked={showNextTime}
                      onChange={(e) => setShowNextTime(e.target.checked)}
                      className="w-5 h-5 text-wedding-600 rounded border-gray-300 focus:ring-wedding-500"
                    />
                    <span className="text-sm font-medium text-wedding-800">
                      Mostrar este guia no próximo acesso
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="p-6 md:p-8 pt-4 md:pt-4 border-t border-wedding-100 bg-white shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Dots */}
              <div className="flex gap-1.5 order-1 md:order-2">
                {WIZARD_STEPS.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStep ? 'w-6 bg-wedding-600' : 'w-2 bg-wedding-200'
                    }`}
                    style={idx === currentStep ? { backgroundColor: themeColor } : {}}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between w-full order-2 md:contents">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors md:order-1 ${
                    currentStep === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-wedding-600 hover:bg-wedding-50'
                  }`}
                >
                  <ChevronLeft size={18} />
                  Anterior
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-wedding-800 text-white rounded-lg font-medium hover:bg-wedding-700 transition-colors shadow-md md:order-3"
                  style={{ backgroundColor: themeColor }}
                >
                  {isLastStep ? 'Concluir' : 'Próximo'}
                  {!isLastStep && <ChevronRight size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
