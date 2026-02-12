import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppSettings, Gift, Page, INITIAL_SETTINGS, INITIAL_GIFTS, INITIAL_PAGES } from './types';
import { db } from './firebaseConfig'; // Importa a configuração que criamos
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query,
  orderBy
} from 'firebase/firestore';

interface StoreContextType extends AppState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addGift: (gift: Omit<Gift, 'id' | 'purchasedCount'>) => void;
  updateGift: (id: string, gift: Partial<Gift>) => void;
  removeGift: (id: string) => void;
  purchaseGift: (id: string) => void;
  addPage: (page: Page) => void;
  updatePage: (id: string, page: Partial<Page>) => void;
  removePage: (id: string) => void;
  resetStore: () => void;
  loading: boolean; // Adicionado para saber se está carregando dados
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Sincronizar Configurações (Settings)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "wedding_site", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      } else {
        // Se não existir no banco, cria com o padrão
        setDoc(doc(db, "wedding_site", "settings"), INITIAL_SETTINGS);
        setSettings(INITIAL_SETTINGS);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Sincronizar Presentes (Gifts)
  useEffect(() => {
    // Ordena por preço, você pode mudar se quiser
    const q = query(collection(db, "gifts")); 
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty && gifts.length === 0 && !loading) {
         // Opcional: Se estiver vazio, popula com os iniciais
         // (Comentado para não criar duplicatas automaticamente, descomente se quiser popular o banco na primeira vez)
         // INITIAL_GIFTS.forEach(g => setDoc(doc(db, "gifts", g.id), g));
      }
      
      const loadedGifts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Gift[];
      
      // Se o banco estiver vazio na primeira vez, usamos o local para visualização
      // Mas o ideal é popular o banco pelo Admin.
      if (loadedGifts.length === 0 && loading) {
          setGifts(INITIAL_GIFTS);
      } else {
          setGifts(loadedGifts);
      }
    });
    return () => unsub();
  }, []);

  // 3. Sincronizar Páginas (Pages)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pages"), (snapshot) => {
      const loadedPages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Page[];

      // Ordenação básica para manter Home primeiro se necessário, 
      // ou use um campo 'order' no futuro.
      const sortedPages = loadedPages.sort((a, b) => {
        if (a.id === 'home') return -1;
        if (b.id === 'home') return 1;
        return 0;
      });

      if (sortedPages.length === 0) {
         // Se não tem páginas no banco, inicia com as padrões
         INITIAL_PAGES.forEach(p => setDoc(doc(db, "pages", p.id), p));
         setPages(INITIAL_PAGES);
      } else {
         setPages(sortedPages);
      }
    });
    return () => unsub();
  }, []);

  // --- ACTIONS (Agora salvam no Firestore) ---

  const login = (password: string) => {
    // A senha agora vem do banco de dados (settings)
    if (password === settings.adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => setIsAuthenticated(false);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    // Atualiza localmente para feedback instantâneo e envia para o banco
    const updated = { ...settings, ...newSettings };
    setSettings(updated); 
    await updateDoc(doc(db, "wedding_site", "settings"), newSettings);
  };

  const addGift = async (gift: Omit<Gift, 'id' | 'purchasedCount'>) => {
    // O Firebase cria o ID automaticamente se usarmos addDoc, 
    // mas seu app espera IDs strings. Vamos gerar e usar setDoc ou deixar o firebase gerar.
    // Vamos deixar o Firebase gerar o ID:
    const docRef = await addDoc(collection(db, "gifts"), {
        ...gift,
        purchasedCount: 0
    });
    // O snapshot vai atualizar o estado automaticamente
  };

  const updateGift = async (id: string, updatedGift: Partial<Gift>) => {
    await updateDoc(doc(db, "gifts", id), updatedGift);
  };

  const removeGift = async (id: string) => {
    await deleteDoc(doc(db, "gifts", id));
  };

  const purchaseGift = async (id: string) => {
    const gift = gifts.find(g => g.id === id);
    if (gift) {
      await updateDoc(doc(db, "gifts", id), {
        purchasedCount: gift.purchasedCount + 1
      });
    }
  };

  const addPage = async (page: Page) => {
    // Usamos o ID da página como ID do documento para facilitar (ex: 'home')
    await setDoc(doc(db, "pages", page.id), page);
  };

  const updatePage = async (id: string, updatedPage: Partial<Page>) => {
    await updateDoc(doc(db, "pages", id), updatedPage);
  };

  const removePage = async (id: string) => {
    await deleteDoc(doc(db, "pages", id));
  };

  const resetStore = async () => {
    // CUIDADO: Isso vai resetar o banco de dados inteiro
    await setDoc(doc(db, "wedding_site", "settings"), INITIAL_SETTINGS);
    
    // Apagar presentes e recriar
    // (Em um app real, faríamos em batch, aqui simplificado)
    gifts.forEach(g => deleteDoc(doc(db, "gifts", g.id)));
    INITIAL_GIFTS.forEach(g => addDoc(collection(db, "gifts"), { ...g, purchasedCount: 0 }));

    // Resetar páginas
    pages.forEach(p => deleteDoc(doc(db, "pages", p.id)));
    INITIAL_PAGES.forEach(p => setDoc(doc(db, "pages", p.id), p));
    
    setIsAuthenticated(false);
    alert("Site resetado para os padrões originais.");
  };

  return (
    <StoreContext.Provider value={{
      settings,
      gifts,
      pages,
      isAuthenticated,
      login,
      logout,
      updateSettings,
      addGift,
      updateGift,
      removeGift,
      purchaseGift,
      addPage,
      updatePage,
      removePage,
      resetStore,
      loading
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