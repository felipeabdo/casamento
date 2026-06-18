import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Heart, Lock, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [loginType, setLoginType] = useState<'guest' | 'admin'>('guest');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, guestLogin, settings, isAuthenticated, currentGuest } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    } else if (currentGuest) {
      navigate('/');
    }
  }, [isAuthenticated, currentGuest, navigate]);

  if (isAuthenticated || currentGuest) {
    return null;
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      navigate('/admin');
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Try individual login first
    if (guestLogin(username, password)) {
      navigate('/');
      return;
    }

    // Fallback to legacy global password if individual login failed and it's not strictly required
    if (!settings.requireGuestLogin && settings.guestPassword) {
      if (password === settings.guestPassword) {
        sessionStorage.setItem('guestAuthenticated', 'true');
        navigate('/');
      } else {
        setError('Senha incorreta.');
      }
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-wedding-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-wedding-200 p-8">
        <div className="text-center mb-8">
          <div className="bg-wedding-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-wedding-800">
            <Heart size={32} />
          </div>
          <h1 className="font-script text-4xl text-wedding-800 mb-2">
            {loginType === 'guest' ? 'Área do Convidado' : 'Área dos Noivos'}
          </h1>
          <p className="font-serif text-wedding-600 uppercase text-xs tracking-widest">
            {loginType === 'guest' ? 'Acesso Restrito aos Convidados' : 'Acesso Restrito'}
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className="flex mb-8 bg-wedding-50 p-1 rounded-lg border border-wedding-200">
          <button 
            onClick={() => { setLoginType('guest'); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${loginType === 'guest' ? 'bg-wedding-800 text-white shadow-md' : 'text-wedding-400 hover:text-wedding-600'}`}
          >
            Sou Convidado
          </button>
          <button 
            onClick={() => { setLoginType('admin'); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${loginType === 'admin' ? 'bg-wedding-800 text-white shadow-md' : 'text-wedding-400 hover:text-wedding-600'}`}
          >
            Sou Noivo(a)
          </button>
        </div>

        {loginType === 'guest' ? (
          <form onSubmit={handleGuestLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-wedding-800 mb-2">Usuário</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-wedding-300 rounded bg-white text-wedding-900 placeholder-wedding-300 focus:ring-2 focus:ring-wedding-500 focus:border-wedding-500 transition-colors"
                  placeholder="Digite seu usuário..."
                  required
                />
                <User className="absolute left-3 top-3.5 text-wedding-400" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-wedding-800 mb-2">Senha</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-wedding-300 rounded bg-white text-wedding-900 placeholder-wedding-300 focus:ring-2 focus:ring-wedding-500 focus:border-wedding-500 transition-colors"
                  placeholder="Digite sua senha..."
                  required
                />
                <Lock className="absolute left-3 top-3.5 text-wedding-400" size={18} />
              </div>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-wedding-800 text-white font-serif uppercase tracking-widest py-3 rounded hover:bg-wedding-700 transition-colors shadow-md"
            >
              Entrar como Convidado
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="bg-wedding-50 p-4 rounded-lg border border-wedding-200 mb-4">
              <p className="text-xs text-wedding-700 text-center italic">Acesso exclusivo para os noivos gerenciarem o site.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-wedding-800 mb-2">Senha de Admin</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-wedding-300 rounded bg-white text-wedding-900 placeholder-wedding-300 focus:ring-2 focus:ring-wedding-500 focus:border-wedding-500 transition-colors"
                  placeholder="Digite a senha de admin..."
                  required
                />
                <Lock className="absolute left-3 top-3.5 text-wedding-400" size={18} />
              </div>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-wedding-800 text-white font-serif uppercase tracking-widest py-3 rounded hover:bg-wedding-700 transition-colors shadow-md"
            >
              Entrar como Noivo(a)
            </button>
          </form>
        )}
        
        <div className="mt-8 text-center">
            <button 
                onClick={() => navigate('/')} 
                className="text-wedding-400 hover:text-wedding-600 text-xs font-serif italic"
            >
                Voltar para o Início
            </button>
        </div>
      </div>
    </div>
  );
};