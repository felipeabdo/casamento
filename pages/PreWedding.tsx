import React from 'react';
import { useTheme } from '../store';
import { Camera, Heart } from 'lucide-react';

export const PreWedding: React.FC = () => {
  const themeColor = useTheme();

  return (
    <div className="min-h-screen bg-wedding-50 py-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-wedding-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-wedding-800">
            <Camera size={40} />
          </div>
          <h1 className="font-script text-6xl text-wedding-800 mb-6">Ensaio Pré-Wedding</h1>
          <p className="font-serif text-wedding-600 text-lg max-w-2xl mx-auto">
            Em breve, compartilharemos aqui os registros do nosso ensaio fotográfico. 
            Estamos preparando tudo com muito carinho para eternizar esse momento especial antes do grande dia!
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-wedding-200 p-12 text-center max-w-3xl mx-auto">
          <Heart size={48} className="mx-auto text-wedding-300 mb-6 animate-pulse" />
          <h3 className="text-2xl font-serif text-wedding-800 mb-4">Fotos em breve...</h3>
          <p className="text-wedding-600">
            Fique de olho! Assim que fizermos nosso ensaio, as fotos estarão disponíveis nesta página para você conferir.
          </p>
        </div>
      </div>
    </div>
  );
};
