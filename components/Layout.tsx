import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore, useTheme } from '../store';
import { Menu, X, Gift, Heart, Info, Settings, MessageCircle, Image as ImageIcon, LogOut, User, CheckCircle, Star } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { settings, pages, isAuthenticated, currentGuest, guestLogout, logout } = useStore();
  const themeColor = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const hiddenNavRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const desktopActionsRef = useRef<HTMLDivElement>(null);
  const [forceMobileMenu, setForceMobileMenu] = useState(false);

  // Helper to get icon based on page type or fallback
  const getIcon = (slug: string) => {
      if (slug === '/gifts') return <Gift size={16} />;
      if (slug === '/transparency') return <Info size={16} />;
      if (slug === '/messages') return <MessageCircle size={16} />;
      if (slug === '/gallery') return <ImageIcon size={16} />;
      if (slug === '/rsvp') return <CheckCircle size={16} />;
      if (slug === '/special-guests') return <Info size={16} />;
      if (slug === '/padrinhos') return <Star size={16} />;
      return <Heart size={16} />;
  };

  const isSpecialGuest = currentGuest && currentGuest.category && currentGuest.category !== 'Comum';

  const navLinks = pages
    .filter(p => p.slug !== '/') // Filter Home (logo handles home)
    .filter(p => {
        // Checking visibilityConfig
        if (isAuthenticated) {
            if (p.visibilityConfig !== undefined) return p.visibilityConfig.admin;
            return true; // legacy admin default
        }
        
        if (currentGuest) {
            if (p.visibilityConfig !== undefined) return p.visibilityConfig.guest;
            return p.isVisible; // legacy fallback
        }
        
        // Logged out
        if (p.visibilityConfig !== undefined) {
             return p.visibilityConfig.public;
        }

        // --- LEGACY RULES FOR PAGES WITHOUT VISIBILITY CONFIG ---
        if (!p.isVisible) return false;
        
        // Special rule for Messages page: 
        if (p.slug === '/messages') {
            return !!settings.showMessagesToPublic;
        }

        // Special rule for Special Guests & Gifts page:
        if (p.slug === '/special-guests' || p.slug === '/gifts') {
            return false;
        }
        
        return true;
    })
    .map(p => {
        let name = p.title;
        // Dynamic name for Special Guests
        if (p.slug === '/special-guests') {
            name = isSpecialGuest ? 'Instruções Especiais' : 'Informações de Convidado';
        }
        
        return {
            name: name,
            path: p.slug,
            icon: getIcon(p.slug)
        };
    });

  const isActive = (path: string) => location.pathname === path;

  // Calculate if we need to force mobile menu due to lack of space
  useEffect(() => {
    let checkTimer: NodeJS.Timeout;

    const checkSpace = () => {
      // Small timeout to ensure DOM update
      checkTimer = setTimeout(() => {
        if (!headerRef.current || !hiddenNavRef.current || !logoRef.current || !desktopActionsRef.current) return;
        
        const headerWidth = headerRef.current.clientWidth;
        const logoWidth = logoRef.current.clientWidth;
        
        let actionsWidth = desktopActionsRef.current.clientWidth;
        if (actionsWidth === 0) actionsWidth = 200; // fallback
        
        const navWidth = hiddenNavRef.current.scrollWidth;
        
        // Increase the buffer since text rendering can vary, and we have truncation issues
        const availableWidth = headerWidth - logoWidth - actionsWidth - 150;
        
        if (navWidth > availableWidth || window.innerWidth < 1024) { 
          setForceMobileMenu(true);
        } else {
          setForceMobileMenu(false);
        }
      }, 50);
    };

    checkSpace();
    window.addEventListener('resize', checkSpace);
    
    const resizeObserver = new ResizeObserver(() => checkSpace());
    if (headerRef.current) {
        resizeObserver.observe(headerRef.current);
    }
    if (hiddenNavRef.current) {
        resizeObserver.observe(hiddenNavRef.current);
    }

    return () => {
        window.removeEventListener('resize', checkSpace);
        clearTimeout(checkTimer);
        resizeObserver.disconnect();
    };
  }, [navLinks.length, isAuthenticated, currentGuest]); // Re-run when number of links changes or auth changes

  const handleLogout = () => {
    if (isAuthenticated) logout();
    if (currentGuest) guestLogout();
    navigate('/');
  };

  const initials = (settings?.coupleName || '')
    .split('&')
    .map(part => part.trim().charAt(0))
    .filter(Boolean)
    .join('&');

  return (
    <div className="min-h-screen flex flex-col font-sans bg-wedding-50 text-wedding-900">
      {/* Header */}
      <header className="fixed w-full top-0 z-40 bg-wedding-50/95 backdrop-blur-md border-b border-wedding-200 shadow-sm transition-all duration-300">
        <div ref={headerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-between items-center h-20 overflow-hidden">
            {/* Logo */}
            <div ref={logoRef} className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-center group flex items-center justify-center">
                {!logoError ? (
                  <img 
                    src="/logo.png" 
                    alt={`Logo ${settings.coupleName}`} 
                    className="h-16 w-auto object-contain group-hover:opacity-80 transition-opacity"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="font-serif text-2xl tracking-widest text-wedding-800 group-hover:text-wedding-600 transition-colors">
                    {initials}
                  </div>
                )}
              </Link>
            </div>

            {/* Hidden Nav Ghost For Space Calculation */}
            <div ref={hiddenNavRef} className="absolute invisible w-max flex space-x-1 xl:space-x-2 px-3 pointer-events-none opacity-0" style={{ left: '-9999px', top: '0' }}>
              {navLinks.map((link) => (
                <div
                  key={'ghost-'+link.path}
                   className="flex items-center gap-1 px-1.5 xl:px-3 py-2 text-[9px] xl:text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                >
                  {link.name}
                </div>
              ))}
            </div>

            {/* Desktop Nav */}
            <nav className={`${forceMobileMenu ? 'hidden' : 'hidden lg:flex'} space-x-1 xl:space-x-2 items-center justify-center flex-1 mx-2 xl:mx-8 overflow-hidden`}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1 px-1.5 xl:px-3 py-2 text-[9px] xl:text-xs font-medium uppercase tracking-wider transition-colors duration-200 whitespace-nowrap
                    ${isActive(link.path) 
                      ? 'text-wedding-800 border-b-2 border-wedding-500' 
                      : 'text-wedding-600 hover:text-wedding-800 hover:bg-wedding-100 rounded-md'
                    }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* User Profile Section (Desktop) */}
            <div ref={desktopActionsRef} className={`${forceMobileMenu ? 'hidden' : 'hidden lg:flex'} items-center`}>
              {!isAuthenticated && !currentGuest ? (
                <Link 
                  to="/login" 
                  className="bg-wedding-800 hover:bg-wedding-900 text-white px-3 xl:px-6 py-2 rounded-full text-[10px] xl:text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <User size={16} className="w-3.5 h-3.5 xl:w-5 xl:h-5" />
                  <span>Login</span>
                </Link>
              ) : (
                <>
                  <div className="flex items-center gap-2 xl:gap-3 bg-wedding-100/50 px-2 xl:px-3 py-1.5 rounded-full border border-wedding-200">
                    {isAuthenticated ? (
                      <>
                        <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-full bg-wedding-800 flex items-center justify-center text-white text-[10px] xl:text-xs font-bold shadow-sm">
                          AD
                        </div>
                        <span className="hidden xl:inline text-xs font-bold text-wedding-800 uppercase tracking-tighter">Admin</span>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => navigate('/guest-settings')}
                          className="w-7 h-7 xl:w-8 xl:h-8 rounded-full flex items-center justify-center text-white text-[10px] xl:text-xs font-bold shadow-sm overflow-hidden border border-wedding-200 hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: themeColor }}
                          title="Configurações do Perfil"
                        >
                          {currentGuest?.photoUrl ? (
                            <img src={currentGuest.photoUrl} alt={currentGuest.name} className="w-full h-full object-cover" />
                          ) : (
                            (currentGuest?.name || currentGuest?.username || 'U').charAt(0).toUpperCase()
                          )}
                        </button>
                        <span className="hidden xl:inline text-xs font-bold text-wedding-800 truncate max-w-[80px]">{currentGuest?.name}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 xl:gap-1 ml-1 xl:ml-2">
                    <Link 
                      to={isAuthenticated ? "/admin" : "/guest-settings"} 
                      className="text-wedding-400 hover:text-wedding-600 p-1.5 transition-colors" 
                      title="Configurações"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Settings size={16} />
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="text-wedding-400 hover:text-red-500 p-1.5 transition-colors"
                      title="Sair"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button - Shown when mobile OR when forced mobile (compact mode) */}
            <div className={`${forceMobileMenu ? 'flex' : 'lg:hidden flex'} items-center gap-2`}>
              {/* Mobile Login Button when not logged in */}
              {!isAuthenticated && !currentGuest && (
                <Link 
                  to="/login" 
                  className="bg-wedding-800 hover:bg-wedding-900 text-white px-4 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <User size={14} />
                  Login
                </Link>
              )}

              {/* Mobile User Profile */}
              {(isAuthenticated || currentGuest) && (
                <div className="flex items-center gap-2 bg-wedding-100/50 px-2 py-1 rounded-full border border-wedding-200">
                  <button 
                    onClick={() => navigate(isAuthenticated ? '/admin' : '/guest-settings')}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm overflow-hidden"
                    style={{ backgroundColor: isAuthenticated ? '#1a1a1a' : themeColor }}
                  >
                          {currentGuest?.photoUrl ? (
                            <img src={currentGuest.photoUrl} alt={currentGuest.name} className="w-full h-full object-cover" />
                          ) : (
                            (currentGuest?.name || currentGuest?.username || 'U').charAt(0).toUpperCase()
                          )}
                  </button>
                </div>
              )}
              
               <Link 
                 to={isAuthenticated ? "/admin" : "/guest-settings"} 
                 className="text-wedding-400 hover:text-wedding-600 p-2"
                 onClick={() => setIsMobileMenuOpen(false)}
               >
                <Settings size={18} />
              </Link>
              {(isAuthenticated || currentGuest) && (
                <button 
                  onClick={handleLogout}
                  className="text-wedding-400 hover:text-red-500 p-2 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-wedding-800 hover:bg-wedding-100 p-2 rounded-md focus:outline-none ml-1"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / Responsive Nav */}
        {isMobileMenuOpen && (
          <div className={`${forceMobileMenu ? 'block w-full' : 'lg:hidden'} bg-wedding-50 border-t border-wedding-200`}>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 max-w-7xl mx-auto">
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
              
              {/* Mobile Menu Login Link */}
              {!isAuthenticated && !currentGuest && (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 block px-3 py-4 rounded-md text-base font-medium text-center justify-center text-wedding-800 bg-wedding-100/50 mt-4 border border-wedding-200"
                >
                  <User size={20} />
                  Fazer Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {currentGuest && (!currentGuest.rsvpStatus || currentGuest.rsvpStatus === 'pending') && (
          <div className="bg-wedding-800 text-white px-4 py-3 text-center text-sm flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 shadow-md z-30 relative">
            <span className="font-medium">Você ainda não confirmou sua presença!</span>
            <button 
              onClick={() => navigate('/guest-settings')}
              className="bg-white text-wedding-800 px-4 py-1 rounded-full text-xs font-bold hover:bg-wedding-50 transition-colors"
            >
              Confirmar Agora
            </button>
          </div>
        )}
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