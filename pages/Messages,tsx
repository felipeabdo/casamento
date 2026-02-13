import React from 'react';
import { useStore } from '../store';
import { Video, Mic, Heart } from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const { messages, settings, isAuthenticated } = useStore();

  const canView = settings.showMessagesToPublic || isAuthenticated;

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wedding-50">
        <div className="text-center p-8 max-w-md">
          <Heart size={48} className="mx-auto text-wedding-300 mb-4" />
          <h1 className="font-serif text-3xl text-wedding-800 mb-4">Mural de Recados</h1>
          <p className="text-wedding-600">
            O mural de recados está reservado aos noivos no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wedding-50 py-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="font-script text-6xl text-wedding-800 mb-6">Mural de Carinho</h1>
          <p className="font-serif text-wedding-600 text-lg max-w-2xl mx-auto">
            Mensagens, votos e energias positivas de quem amamos.
          </p>
        </div>

        {messages.length === 0 ? (
           <div className="text-center text-wedding-400 italic py-12">
             Ainda não há recados. Seja o primeiro a enviar ao presentear os noivos!
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-white p-4 rounded shadow-md border border-wedding-200 transform hover:-translate-y-1 transition duration-300">
                <div className="mb-4 bg-black rounded overflow-hidden flex items-center justify-center bg-wedding-100 relative group">
                  {msg.type === 'video' ? (
                    <video 
                        src={msg.content} 
                        controls 
                        className="w-full h-64 object-cover" 
                        preload="metadata"
                    />
                  ) : (
                    <div className="w-full h-32 flex flex-col items-center justify-center bg-wedding-100 text-wedding-600 gap-2">
                       <Mic size={32} />
                       <audio src={msg.content} controls className="w-full px-4" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="font-serif text-xl text-wedding-800">{msg.author}</h3>
                  <p className="text-xs text-wedding-400 uppercase tracking-widest mt-1">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};