import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Heart, Lock, User } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

interface GuestLoginProps {
  children: React.ReactNode;
}

export const GuestLogin: React.FC<GuestLoginProps> = ({ children }) => {
  const { settings, isAuthenticated, currentGuest, guestLogin } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLegacyGuestAuthenticated, setIsLegacyGuestAuthenticated] = useState(false);
  const location = useLocation();

  // Check if we already authenticated in this session (legacy global password)
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('guestAuthenticated');
    if (storedAuth === 'true') {
      setIsLegacyGuestAuthenticated(true);
    }
  }, []);

  // Bypass for admin login route
  const isLoginRoute = location.pathname === '/login';
  const isPublicRoute = ['/', '/gallery', '/gifts', '/messages', '/pre-wedding'].includes(location.pathname) || !location.pathname.startsWith('/admin');

  // Determine if we need to show the login screen
  const needsIndividualLogin = settings.requireGuestLogin && !currentGuest;
  const needsGlobalLogin = !settings.requireGuestLogin && settings.guestPassword && !isLegacyGuestAuthenticated;

  // If no login is required, or user is admin, or already authenticated
  if ((!needsIndividualLogin && !needsGlobalLogin) || isAuthenticated || isLoginRoute || isPublicRoute) {
    return <>{children}</>;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Try individual login first
    const success = guestLogin(username, password);
    if (success) return;

    // Fallback to legacy global password if individual login failed and it's not strictly required
    if (!settings.requireGuestLogin && settings.guestPassword) {
      if (password === settings.guestPassword) {
        setIsLegacyGuestAuthenticated(true);
        sessionStorage.setItem('guestAuthenticated', 'true');
      } else {
        setError('Senha incorreta. Tente novamente.');
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
          <h1 className="font-script text-4xl text-wedding-800 mb-2">{settings.coupleName}</h1>
          <p className="font-serif text-wedding-600 uppercase text-xs tracking-widest mb-4">
            Acesso Restrito aos Convidados
          </p>
          <div className="bg-wedding-50 border border-wedding-200 p-4 rounded-lg text-sm text-wedding-700">
            <p className="font-medium mb-1">Ainda não tem os dados de acesso?</p>
            <p className="italic text-wedding-500">Seu usuário e senha serão enviados junto com o convite em breve!</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
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
            Entrar
          </button>
          
          {!currentGuest && (
            <div className="text-center mt-4">
              <Link to="/login" className="text-wedding-600 hover:text-wedding-800 text-sm font-serif underline">
                Acesso dos Noivos (Admin)
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
