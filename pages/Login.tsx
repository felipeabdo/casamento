import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Heart, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, settings } = useStore();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      navigate('/admin');
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-wedding-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-wedding-200 p-8">
        <div className="text-center mb-8">
          <div className="bg-wedding-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-wedding-800">
            <Heart size={32} />
          </div>
          <h1 className="font-script text-4xl text-wedding-800 mb-2">Área dos Noivos</h1>
          <p className="font-serif text-wedding-600 uppercase text-xs tracking-widest">
            Acesso Restrito
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-wedding-800 mb-2">Senha de Acesso</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-wedding-600 rounded bg-wedding-900 text-white placeholder-wedding-400 focus:ring-2 focus:ring-wedding-500 focus:border-wedding-500 transition-colors"
                placeholder="Digite a senha..."
              />
              <Lock className="absolute left-3 top-3.5 text-wedding-400" size={18} />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-wedding-800 text-white font-serif uppercase tracking-widest py-3 rounded hover:bg-wedding-700 transition-colors shadow-md"
          >
            Entrar
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <button 
                onClick={() => navigate('/')} 
                className="text-wedding-500 hover:text-wedding-800 text-sm underline"
            >
                Voltar para o site
            </button>
        </div>
      </div>
    </div>
  );
};