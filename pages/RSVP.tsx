import React from 'react';
import { useStore, useTheme } from '../store';
import { CheckCircle, X, MessageCircle, Camera, Sparkles, Heart, Info, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export const RSVPPage: React.FC = () => {
  const { currentGuest, updateGuest, isAuthenticated } = useStore();
  const themeColor = useTheme();

  const advantages = [
    {
      icon: <Camera size={20} />,
      title: 'Compartilhe Fotos',
      description: 'Envie fotos diretamente do seu celular para a nossa galeria.'
    },
    {
      icon: <MessageCircle size={20} />,
      title: 'Mural de Mensagens',
      description: 'Deixe recados carinhosos com texto, áudio ou vídeo.'
    },
    {
      icon: <Sparkles size={20} />,
      title: 'Simulador de Trajes',
      description: 'Use nossa IA para testar como você ficaria com os trajes sugeridos.'
    },
    {
      icon: <Heart size={20} />,
      title: 'Experiência Personalizada',
      description: 'O site se adapta ao seu papel no casamento com informações exclusivas.'
    }
  ];

  if (currentGuest || isAuthenticated) {
    const rsvpStatus = currentGuest?.rsvpStatus || 'pending';
    const guestId = currentGuest?.id;

    return (
      <div className="min-h-[80vh] bg-wedding-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-wedding-100 overflow-hidden"
        >
          <div className="bg-wedding-800 p-8 text-white text-center">
            <Heart className="mx-auto mb-4" size={48} />
            <h1 className="text-3xl font-serif mb-2">Confirmação de Presença</h1>
            <p className="text-wedding-100 italic">É uma honra ter você conosco!</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="text-center">
              <p className="text-wedding-700 text-lg leading-relaxed">
                {currentGuest ? `Olá, ${currentGuest.name}!` : 'Olá, Administrador!'}
                <br />
                Por favor, confirme se você poderá comparecer ao nosso casamento. 
                Sua resposta nos ajuda muito na organização!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center py-4">
              <button 
                onClick={() => guestId && updateGuest(guestId, { rsvpStatus: rsvpStatus === 'confirmed' ? 'pending' : 'confirmed' })}
                disabled={!guestId && !isAuthenticated}
                className={`w-full sm:w-auto px-8 py-4 rounded-full font-bold shadow-lg transition-all flex items-center justify-center gap-3 text-lg
                  ${rsvpStatus === 'confirmed' 
                    ? 'bg-green-500 text-white scale-105' 
                    : 'bg-white text-green-600 border-2 border-green-200 hover:bg-green-50 hover:border-green-300'}`}
              >
                <CheckCircle size={24} />
                Sim, eu vou!
              </button>
              <button 
                onClick={() => guestId && updateGuest(guestId, { rsvpStatus: rsvpStatus === 'declined' ? 'pending' : 'declined' })}
                disabled={!guestId && !isAuthenticated}
                className={`w-full sm:w-auto px-8 py-4 rounded-full font-bold shadow-lg transition-all flex items-center justify-center gap-3 text-lg
                  ${rsvpStatus === 'declined' 
                    ? 'bg-red-500 text-white scale-105' 
                    : 'bg-white text-red-500 border-2 border-red-200 hover:bg-red-50 hover:border-red-300'}`}
              >
                <X size={24} />
                Não poderei
              </button>
            </div>

            <div className="min-h-[60px] flex items-center justify-center">
              {rsvpStatus === 'confirmed' && (
                <motion.p 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-green-600 font-bold text-center bg-green-50 px-6 py-3 rounded-full border border-green-100"
                >
                  🎉 Presença confirmada! Estamos muito felizes!
                </motion.p>
              )}
              {rsvpStatus === 'declined' && (
                <motion.p 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-red-500 font-bold text-center bg-red-50 px-6 py-3 rounded-full border border-red-100"
                >
                  😔 Que pena! Sentiremos sua falta.
                </motion.p>
              )}
            </div>

            <div className="pt-8 border-t border-wedding-100 text-center">
              <p className="text-wedding-500 text-sm italic">
                Você pode alterar sua resposta a qualquer momento nesta página ou nas suas configurações.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Unauthenticated State
  return (
    <div className="min-h-screen bg-wedding-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: Login Call to Action */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-wedding-100 space-y-6"
        >
          <div className="w-16 h-16 bg-wedding-100 text-wedding-800 rounded-2xl flex items-center justify-center mb-4">
            <Info size={32} />
          </div>
          <h1 className="text-3xl font-serif text-wedding-900">Acesso Restrito</h1>
          <p className="text-wedding-700 leading-relaxed">
            Para confirmar sua presença, é necessário estar logado em nosso site. 
            Isso garante que sua confirmação seja registrada corretamente e que você tenha acesso a áreas exclusivas.
          </p>
          
          <div className="bg-wedding-800 p-6 rounded-2xl text-white">
            <div className="flex gap-4 items-start">
              <div className="bg-white/20 p-2 rounded-lg">
                <MessageSquare size={24} />
              </div>
              <div className="space-y-2">
                <p className="font-bold">Como recebo meu acesso?</p>
                <p className="text-sm text-wedding-100 leading-relaxed">
                  O link de acesso personalizado e suas credenciais serão enviados para você através do <strong>WhatsApp</strong>.
                  Fique atento às suas mensagens!
                </p>
              </div>
            </div>
          </div>

          {/* Demo Section (Moved here) */}
          <div className="bg-wedding-50 p-6 rounded-2xl border border-wedding-100">
            <h2 className="text-[10px] uppercase tracking-widest text-wedding-400 font-bold mb-4 text-center">Demonstração da Página de RSVP</h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center opacity-40 grayscale select-none pointer-events-none">
              <div className="px-4 py-2 rounded-full font-bold bg-white text-green-600 border border-green-100 flex items-center gap-2 text-xs">
                <CheckCircle size={14} /> Sim, eu vou!
              </div>
              <div className="px-4 py-2 rounded-full font-bold bg-white text-red-500 border border-red-100 flex items-center gap-2 text-xs">
                <X size={14} /> Não poderei
              </div>
            </div>
            <p className="text-[10px] text-wedding-400 text-center mt-3 italic">Interface simples para confirmar sua presença.</p>
          </div>

          <Link 
            to="/login" 
            className="block w-full text-center bg-wedding-800 text-white py-4 rounded-xl font-bold hover:bg-wedding-900 transition-colors shadow-lg"
            style={{ backgroundColor: themeColor }}
          >
            Ir para a página de Login
          </Link>
        </motion.div>

        {/* Right Side: Advantages Only */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          {/* Advantages Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-serif text-wedding-800 px-2 underline decoration-wedding-200 underline-offset-8">Vantagens de estar logado:</h2>
            <div className="grid grid-cols-1 gap-4">
              {advantages.map((adv, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-4 rounded-2xl border border-wedding-50 flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-3 bg-wedding-50 text-wedding-800 rounded-xl">
                    {adv.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-wedding-900 text-sm">{adv.title}</h3>
                    <p className="text-xs text-wedding-600">{adv.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
