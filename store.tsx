import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppSettings, Gift, Page, Message, INITIAL_SETTINGS, INITIAL_GIFTS, INITIAL_PAGES } from './types';

interface StoreContextType extends AppState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addGift: (gift: Omit<Gift, 'id' | 'purchasedCount' | 'status'>) => void;
  updateGift: (id: string, gift: Partial<Gift>) => void;
  removeGift: (id: string) => void;
  
  // New/Updated Actions
  markGiftAsPending: (id: string, buyerName: string) => void;
  confirmGiftPayment: (id: string) => void;
  
  addPage: (page: Page) => void;
  updatePage: (id: string, page: Partial<Page>) => void;
  removePage: (id: string) => void;
  
  // Message Actions
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => void;
  deleteMessage: (id: string) => void;

  resetStore: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load from localStorage or use defaults
  const loadState = (): AppState => {
    const stored = localStorage.getItem('wedding_site_store');
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // MIGRATION LOGIC
      
      // 1. Settings
      if (!parsed.settings.adminPassword) parsed.settings.adminPassword = INITIAL_SETTINGS.adminPassword;
      if (!parsed.settings.paymentUrl) parsed.settings.paymentUrl = "";
      if (parsed.settings.showMessagesToPublic === undefined) parsed.settings.showMessagesToPublic = false;

      // 2. Pages (Ensure system pages exist)
      const hasMessagesPage = parsed.pages.some((p: Page) => p.id === 'messages-page');
      if (!hasMessagesPage) {
         const msgsPage = INITIAL_PAGES.find(p => p.id === 'messages-page');
         if (msgsPage) parsed.pages.push(msgsPage);
      }

      // 3. Gifts (Ensure status field)
      if (parsed.gifts) {
        parsed.gifts = parsed.gifts.map((g: any) => ({
            ...g,
            status: g.status || 'available',
            buyerName: g.buyerName || ''
        }));
      }

      // 4. Messages (Initialize if missing)
      if (!parsed.messages) {
        parsed.messages = [];
      }

      return parsed;
    }
    return {
      settings: INITIAL_SETTINGS,
      gifts: INITIAL_GIFTS,
      pages: INITIAL_PAGES,
      messages: []
    };
  };

  const [state, setState] = useState<AppState>(loadState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    try {
        localStorage.setItem('wedding_site_store', JSON.stringify(state));
    } catch (e) {
        console.error("Storage full or error saving state", e);
        alert("Atenção: O armazenamento do navegador está cheio. Alguns vídeos/áudios podem não ser salvos.");
    }
  }, [state]);

  const login = (password: string) => {
    if (password === state.settings.adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
  };

  const addGift = (gift: Omit<Gift, 'id' | 'purchasedCount' | 'status'>) => {
    const newGift: Gift = {
      ...gift,
      id: crypto.randomUUID(),
      purchasedCount: 0,
      status: 'available'
    };
    setState(prev => ({ ...prev, gifts: [...prev.gifts, newGift] }));
  };

  const updateGift = (id: string, updatedGift: Partial<Gift>) => {
    setState(prev => ({
      ...prev,
      gifts: prev.gifts.map(g => g.id === id ? { ...g, ...updatedGift } : g)
    }));
  };

  const removeGift = (id: string) => {
    setState(prev => ({ ...prev, gifts: prev.gifts.filter(g => g.id !== id) }));
  };

  // User marks as paid -> Pending
  const markGiftAsPending = (id: string, buyerName: string) => {
    setState(prev => ({
      ...prev,
      gifts: prev.gifts.map(g => g.id === id ? { ...g, status: 'pending', buyerName } : g)
    }));
  };

  // Admin confirms payment -> Confirmed (and increments count)
  const confirmGiftPayment = (id: string) => {
    setState(prev => ({
      ...prev,
      gifts: prev.gifts.map(g => g.id === id ? { 
          ...g, 
          status: 'confirmed', 
          purchasedCount: g.purchasedCount + 1 
      } : g)
    }));
  };

  const addPage = (page: Page) => {
    setState(prev => ({ ...prev, pages: [...prev.pages, page] }));
  };

  const updatePage = (id: string, updatedPage: Partial<Page>) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === id ? { ...p, ...updatedPage } : p)
    }));
  };

  const removePage = (id: string) => {
    setState(prev => ({ ...prev, pages: prev.pages.filter(p => p.id !== id) }));
  };

  const addMessage = (message: Omit<Message, 'id' | 'createdAt'>) => {
      const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
      };
      setState(prev => ({ ...prev, messages: [newMessage, ...prev.messages] }));
  };

  const deleteMessage = (id: string) => {
      setState(prev => ({ ...prev, messages: prev.messages.filter(m => m.id !== id) }));
  };

  const resetStore = () => {
    setState({
      settings: INITIAL_SETTINGS,
      gifts: INITIAL_GIFTS,
      pages: INITIAL_PAGES,
      messages: []
    });
    setIsAuthenticated(false);
  };

  return (
    <StoreContext.Provider value={{
      ...state,
      isAuthenticated,
      login,
      logout,
      updateSettings,
      addGift,
      updateGift,
      removeGift,
      markGiftAsPending,
      confirmGiftPayment,
      addPage,
      updatePage,
      removePage,
      addMessage,
      deleteMessage,
      resetStore
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};