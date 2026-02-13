import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { Menu, X, Gift, Heart, Info, Settings, MessageCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { settings, pages, isAuthenticated } = useStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to get icon based on page type or fallback
  const getIcon = (slug: string) => {
      if (slug === '/gifts') return <Gift size={16} />;
      if (slug === '/transparency') return <Info size={16} />;
      if (slug === '/messages') return <MessageCircle size={16} />;
      return <Heart size={16} />;
  };

  const navLinks = pages
    .filter(p => p.isVisible && p.slug !== '/') // Filter invisible pages and Home (logo handles home)
    .filter(p => {
        // Special rule for Messages page: Only show if public OR logged in
        if (p.slug === '/messages') {
            return settings.showMessagesToPublic || isAuthenticated;
        }
        return true;
    })
    .map(p => ({
        name: p.title,
        path: p.slug,
        icon: getIcon(p.slug)
    }));

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-wedding-50 text-wedding-900">
      {/* Header */}
      <header className="fixed w-full top-0 z-40 bg-wedding-50/95 backdrop-blur-md border-b border-wedding-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-center group">
                <div className="font-serif text-2xl tracking-widest text-wedding-800 group-hover:text-wedding-600 transition-colors">
                  {settings.coupleName.split('&')[0].trim().charAt(0)}&{settings.coupleName.split('&')[1].trim().charAt(0)}
                </div>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8 items-center">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium uppercase tracking-wider transition-colors duration-200
                    ${isActive(link.path) 
                      ? 'text-wedding-800 border-b-2 border-wedding-500' 
                      : 'text-wedding-600 hover:text-wedding-800 hover:bg-wedding-100 rounded-md'
                    }`}
                >
                  {link.name}
                </Link>
              ))}
              <Link to="/admin" className="text-wedding-400 hover:text-wedding-600 p-2" title="Admin">
                <Settings size={18} />
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
               <Link to="/admin" className="text-wedding-400 hover:text-wedding-600 p-2 mr-2">
                <Settings size={18} />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-wedding-800 hover:bg-wedding-100 p-2 rounded-md focus:outline-none"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-wedding-50 border-t border-wedding-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 block px-3 py-4 rounded-md text-base font-medium text-center justify-center
                     ${isActive(link.path) ? 'bg-wedding-100 text-wedding-900' : 'text-wedding-600 hover:bg-wedding-100'}`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-wedding-100 border-t border-wedding-200 mt-auto">
        <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-4">
             <h2 className="font-script text-4xl text-wedding-800">{settings.coupleName}</h2>
             <p className="font-serif tracking-widest text-wedding-600 uppercase text-sm">
               {settings.weddingDate} • {settings.weddingLocation}
             </p>
             <p className="text-wedding-500 text-xs mt-8">
               Feito com amor
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
};