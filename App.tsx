import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import { Layout } from './components/Layout';
import { DynamicPage } from './pages/Home';
import { GiftsPage } from './pages/Gifts';
import { TransparencyPage } from './pages/Transparency';
import { AdminPage } from './pages/Admin';
import { LoginPage } from './pages/Login';
import { MessagesPage } from './pages/Messages';
import { Gallery } from './pages/Gallery';
import { GuestSettings } from './pages/GuestSettings';
import { SpecialGuests } from './pages/SpecialGuests';
import { PreWedding } from './pages/PreWedding';
import { RSVPPage } from './pages/RSVP';
import { BridalParty } from './pages/BridalParty';
import { LoadingScreen } from './components/LoadingScreen';
import { GuestLogin } from './components/GuestLogin';
import { Wizard } from './components/Wizard';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Wrapper component to access Store Context
const AppContent: React.FC = () => {
  const { settings } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Force loading screen for at least 2 seconds to mask API load / initial render glitches
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <LoadingScreen 
        isVisible={isLoading} 
        title={settings.loadingTitle || "Jéssica & Felipe"} 
        subtitle={settings.loadingSubtitle || "Carregando..."} 
      />
      
      <Router>
        <ScrollToTop />
        <GuestLogin>
          <Layout>
            <Wizard />
            <Routes>
              {/* System Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/gifts" element={<GiftsPage />} />
              <Route path="/transparency" element={<TransparencyPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/pre-wedding" element={<PreWedding />} />
              <Route path="/rsvp" element={<RSVPPage />} />
              <Route path="/guest-settings" element={<GuestSettings />} />
              <Route path="/special-guests" element={<SpecialGuests />} />
              <Route path="/padrinhos" element={<BridalParty />} />
              
              {/* Protected Admin Route */}
              <Route path="/admin" element={<AdminPage />} />
              
              {/* Dynamic Routes (Home + Generated Pages) */}
              <Route path="/" element={<DynamicPage />} />
              <Route path="/:slug" element={<DynamicPage />} />
            </Routes>
          </Layout>
        </GuestLogin>
      </Router>
    </>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;