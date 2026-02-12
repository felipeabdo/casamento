import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store';
import { Layout } from './components/Layout';
import { DynamicPage } from './pages/Home'; // Uses URL to determine content
import { GiftsPage } from './pages/Gifts';
import { TransparencyPage } from './pages/Transparency';
import { AdminPage } from './pages/Admin';
import { LoginPage } from './pages/Login';

const App: React.FC = () => {
  return (
    <StoreProvider>
      <Router>
        <Layout>
          <Routes>
            {/* System Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/gifts" element={<GiftsPage />} />
            <Route path="/transparency" element={<TransparencyPage />} />
            
            {/* Protected Admin Route */}
            <Route path="/admin" element={<AdminPage />} />
            
            {/* Dynamic Routes (Home + Generated Pages) */}
            <Route path="/" element={<DynamicPage />} />
            <Route path="/:slug" element={<DynamicPage />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
};

export default App;