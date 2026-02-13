import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppSettings, Gift, Page, Message, INITIAL_SETTINGS, INITIAL_GIFTS, INITIAL_PAGES } from './types';
import { db } from './firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';

interface StoreContextType extends AppState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addGift: (gift: Omit<Gift, 'id' | 'purchasedCount' | 'status'>) => void;
  updateGift: (id: string, gift: Partial<Gift>) => void;
  removeGift: (id: string) => void;
  
  markGiftAsPending: (id: string, buyerName: string) => void;
  confirmGiftPayment: (id: string) => void;
  
  addPage: (page: Page) => void;
  updatePage: (id: string, page: Partial<Page>) => void;
  removePage: (id: string) => void;
  
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => void;
  deleteMessage: (id: string) => void;

  resetStore: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
      settings: INITIAL_SETTINGS,
      gifts: [],
      pages: [],
      messages: []
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- FIREBASE LISTENERS ---
  
  useEffect(() => {
    // 1. Settings Listener
    const unsubSettings = onSnapshot(doc(db, "app", "settings"), (docSnap) => {
        if (docSnap.exists()) {
            setState(prev => ({ ...prev, settings: docSnap.data() as AppSettings }));
        } else {
            // First run: Initialize settings in DB
            setDoc(doc(db, "app", "settings"), INITIAL_SETTINGS);
            setState(prev => ({ ...prev, settings: INITIAL_SETTINGS }));
        }
    });

    // 2. Gifts Listener
    const unsubGifts = onSnapshot(collection(db, "gifts"), (snapshot) => {
        const giftsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gift));
        if (giftsData.length === 0 && loading) {
             // Optional: If empty on first load, seed with initials
             // But we avoid auto-seeding to prevent duplicates if user deleted all.
             // We only seed if we are SURE it's a fresh install.
        }
        setState(prev => ({ ...prev, gifts: giftsData }));
    });

    // 3. Pages Listener
    const unsubPages = onSnapshot(collection(db, "pages"), (snapshot) => {
        const pagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Page));
        // Sort pages or ensure system pages?
        // If empty, we might want to seed.
        if (pagesData.length === 0) {
             // Seeding logic could go here, but let's keep it simple for now.
             // Manually checking if pages exist is safer.
        }
        setState(prev => ({ ...prev, pages: pagesData }));
    });

    // 4. Messages Listener
    const unsubMessages = onSnapshot(collection(db, "messages"), (snapshot) => {
        const msgsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        // Sort by date desc
        msgsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setState(prev => ({ ...prev, messages: msgsData }));
    });

    setLoading(false);

    return () => {
        unsubSettings();
        unsubGifts();
        unsubPages();
        unsubMessages();
    };
  }, []);

  // Seed Initial Data check
  useEffect(() => {
     const checkAndSeed = async () => {
         // Check if we have pages
         const pagesSnap = await getDoc(doc(db, "pages", "home")); // Check for a known page
         // Only seed if strictly necessary. For now, rely on Admin Reset to seed.
     }
     checkAndSeed();
  }, []);


  // --- ACTIONS ---

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

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...state.settings, ...newSettings };
    await setDoc(doc(db, "app", "settings"), updated);
  };

  // GIFTS
  const addGift = async (gift: Omit<Gift, 'id' | 'purchasedCount' | 'status'>) => {
    const newGift = {
      ...gift,
      purchasedCount: 0,
      status: 'available'
    };
    await addDoc(collection(db, "gifts"), newGift);
  };

  const updateGift = async (id: string, updatedGift: Partial<Gift>) => {
    await updateDoc(doc(db, "gifts", id), updatedGift);
  };

  const removeGift = async (id: string) => {
    await deleteDoc(doc(db, "gifts", id));
  };

  const markGiftAsPending = async (id: string, buyerName: string) => {
    await updateDoc(doc(db, "gifts", id), {
        status: 'pending',
        buyerName: buyerName
    });
  };

  const confirmGiftPayment = async (id: string) => {
     // We need to increment, easier to just get current state locally since we are sync'd
     const gift = state.gifts.find(g => g.id === id);
     if(gift) {
         await updateDoc(doc(db, "gifts", id), {
             status: 'confirmed',
             purchasedCount: gift.purchasedCount + 1
         });
     }
  };

  // PAGES
  const addPage = async (page: Page) => {
    // Use slug as ID or random? Random is safer for collision, but page ID usage varies.
    // Let's use Random ID provided by firestore, but we passed ID in object.
    // Let's use the ID from the object if it exists (usually random UUID from Admin)
    const { id, ...pageData } = page;
    if (id) {
        await setDoc(doc(db, "pages", id), { id, ...pageData });
    } else {
        await addDoc(collection(db, "pages"), pageData);
    }
  };

  const updatePage = async (id: string, updatedPage: Partial<Page>) => {
    await updateDoc(doc(db, "pages", id), updatedPage);
  };

  const removePage = async (id: string) => {
    await deleteDoc(doc(db, "pages", id));
  };

  // MESSAGES
  const addMessage = async (message: Omit<Message, 'id' | 'createdAt'>) => {
      const newMessage = {
          ...message,
          createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "messages"), newMessage);
  };

  const deleteMessage = async (id: string) => {
      await deleteDoc(doc(db, "messages", id));
  };

  const resetStore = async () => {
    // WARNING: This deletes everything in Firestore for this app
    
    // 1. Reset Settings
    await setDoc(doc(db, "app", "settings"), INITIAL_SETTINGS);

    // 2. Clear Collections and Seed
    const batch = writeBatch(db);
    
    // Delete existing Gifts (Local view only for simplicity, in real app, need to query all)
    state.gifts.forEach(g => batch.delete(doc(db, "gifts", g.id)));
    // Seed Gifts
    INITIAL_GIFTS.forEach(g => {
        const docRef = doc(collection(db, "gifts"));
        batch.set(docRef, { ...g, id: docRef.id }); // Assign new IDs
    });

    // Pages
    state.pages.forEach(p => batch.delete(doc(db, "pages", p.id)));
    INITIAL_PAGES.forEach(p => {
        // Keep fixed IDs for system pages if possible, or update ID
        const docRef = doc(db, "pages", p.id); 
        batch.set(docRef, p);
    });

    // Messages
    state.messages.forEach(m => batch.delete(doc(db, "messages", m.id)));

    await batch.commit();
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