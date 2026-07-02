import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppSettings, Gift, Contribution, Page, Message, Photo, Guest, INITIAL_SETTINGS, INITIAL_GIFTS, INITIAL_PAGES } from './types';
import { db, storage, auth } from './firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  getDoc,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

interface StoreContextType extends AppState {
  isAuthenticated: boolean;
  currentGuest: Guest | null;
  login: (password: string) => boolean;
  logout: () => void;
  guestLogin: (username: string, password?: string) => boolean;
  guestLogout: () => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  addGift: (gift: Omit<Gift, 'id' | 'purchasedCount' | 'status'>) => void;
  updateGift: (id: string, gift: Partial<Gift>) => void;
  removeGift: (id: string) => void;
  updateGiftsOrder: (orderedGifts: Gift[]) => Promise<void>;
  
  markGiftAsPending: (id: string, buyerName: string) => void;
  confirmGiftPayment: (id: string) => void;
  addContribution: (giftId: string, contribution: Omit<Contribution, 'id' | 'createdAt'> & {isExternal?: boolean}) => void;
  confirmContribution: (giftId: string, contributionId: string) => void;
  removeContribution: (giftId: string, contributionId: string) => void;
  updateContribution: (giftId: string, contributionId: string, contribution: Partial<Contribution>) => void;
  
  addPage: (page: Page) => void;
  updatePage: (id: string, page: Partial<Page>) => void;
  removePage: (id: string) => void;
  
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => Promise<string>;
  updateMessageStatus: (id: string, status: 'pending' | 'approved') => void;
  deleteMessage: (id: string) => void;

  addPhoto: (photo: Omit<Photo, 'id' | 'createdAt'>) => Promise<string>;
  updatePhotoStatus: (id: string, status: 'pending' | 'approved') => void;
  requestPhotoDeletion: (id: string, reason: string) => void;
  rejectPhotoDeletion: (id: string) => void;
  deletePhoto: (id: string) => void;

  addGuest: (guest: Omit<Guest, 'id'>) => void;
  updateGuest: (id: string, guest: Partial<Guest>) => void;
  uploadDressPreview: (guestId: string, base64: string) => Promise<string>;
  deleteDressPreview: (guestId: string) => Promise<void>;
  removeGuest: (id: string) => void;
  seedGuests: () => Promise<void>;
  resetStore: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
      settings: INITIAL_SETTINGS,
      gifts: [],
      pages: [],
      messages: [],
      photos: [],
      guests: []
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAdminAuthenticated') === 'true';
  });
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const isSigningIn = React.useRef(false);

  // --- FIREBASE LISTENERS ---
  
  useEffect(() => {
    // 0. Auth Listener (Anonymous)
    const unsubAuth = onAuthStateChanged(auth, (user) => {
        if (!user && !isSigningIn.current) {
            isSigningIn.current = true;
            const performSignIn = (retries = 3) => {
                signInAnonymously(auth)
                    .then(() => {
                        isSigningIn.current = false;
                    })
                    .catch(err => {
                        console.error("Error signing in anonymously:", err);
                        if (retries > 0 && err.code === 'auth/network-request-failed') {
                            console.log(`Retrying anonymous sign-in... (${retries} left)`);
                            setTimeout(() => performSignIn(retries - 1), 2000);
                        } else {
                            isSigningIn.current = false;
                        }
                    });
            };
            performSignIn();
        }
    });

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
        giftsData.sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
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

    // 5. Photos Listener
    const unsubPhotos = onSnapshot(collection(db, "photos"), (snapshot) => {
        const photosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));
        // Sort by date desc
        photosData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setState(prev => ({ ...prev, photos: photosData }));
    });

    // 6. Guests Listener
    const unsubGuests = onSnapshot(collection(db, "guests"), (snapshot) => {
        const guestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guest));
        setState(prev => ({ ...prev, guests: guestsData }));
        
        // Update currentGuest if it exists
        const storedGuestId = sessionStorage.getItem('guestId');
        if (storedGuestId) {
            const guest = guestsData.find(g => g.id === storedGuestId);
            if (guest) setCurrentGuest(guest);
        }
    });

    setLoading(false);

    return () => {
        unsubAuth();
        unsubSettings();
        unsubGifts();
        unsubPages();
        unsubMessages();
        unsubPhotos();
        unsubGuests();
    };
  }, []);

  // Seed Initial Data check
  useEffect(() => {
     const checkAndSeed = async () => {
         // Check if we have pages
         const pagesSnap = await getDoc(doc(db, "pages", "home")); // Check for a known page
         if (pagesSnap.exists()) {
             const homePage = pagesSnap.data() as Page;
             const locationSectionIndex = homePage.sections.findIndex(s => s.type === 'location');
             
             if (locationSectionIndex === -1) {
                 const locationSection = INITIAL_PAGES.find(p => p.id === 'home')?.sections.find(s => s.type === 'location');
                 if (locationSection) {
                     await updateDoc(doc(db, "pages", "home"), {
                         sections: [...homePage.sections, locationSection]
                     });
                 }
             } else {
                 // Migrate old Av. Paulista address to Spazio Villa Regia if it hasn't been changed
                 const currentLoc = homePage.sections[locationSectionIndex];
                 if (currentLoc.locationDetails?.address?.includes('Av. Paulista')) {
                     const newLocationSection = INITIAL_PAGES.find(p => p.id === 'home')?.sections.find(s => s.type === 'location');
                     if (newLocationSection) {
                         const updatedSections = [...homePage.sections];
                         updatedSections[locationSectionIndex] = newLocationSection;
                         await updateDoc(doc(db, "pages", "home"), {
                             sections: updatedSections
                         });
                     }
                 }
             }
         }
         // Only seed if strictly necessary. For now, rely on Admin Reset to seed.
         
         // Specifically check for gallery-page and add it if it doesn't exist
         // This is to ensure the user's request to have the photos page in the navbar is fulfilled
         // without requiring a full reset.
         const gallerySnap = await getDoc(doc(db, "pages", "gallery-page"));
         if (!gallerySnap.exists()) {
             const galleryPage = INITIAL_PAGES.find(p => p.id === 'gallery-page');
             if (galleryPage) {
                 await setDoc(doc(db, "pages", "gallery-page"), galleryPage);
             }
         }

         // Specifically check for pre-wedding-page and add it if it doesn't exist
         const preWeddingSnap = await getDoc(doc(db, "pages", "pre-wedding-page"));
         if (!preWeddingSnap.exists()) {
             const preWeddingPage = INITIAL_PAGES.find(p => p.id === 'pre-wedding-page');
             if (preWeddingPage) {
                 await setDoc(doc(db, "pages", "pre-wedding-page"), preWeddingPage);
             }
         }

         // Specifically check for messages-page and add it if it doesn't exist
         const messagesSnap = await getDoc(doc(db, "pages", "messages-page"));
         if (!messagesSnap.exists()) {
             const messagesPage = INITIAL_PAGES.find(p => p.id === 'messages-page');
             if (messagesPage) {
                 await setDoc(doc(db, "pages", "messages-page"), messagesPage);
             }
         } else {
             const messagesPage = messagesSnap.data() as Page;
             if (!messagesPage.isVisible) {
                 await updateDoc(doc(db, "pages", "messages-page"), { isVisible: true });
             }
         }
          // RSVP Page Seeding
          const rsvpSnap = await getDoc(doc(db, "pages", "rsvp-page"));
          if (!rsvpSnap.exists()) {
              const rsvpPage = INITIAL_PAGES.find(p => p.id === 'rsvp-page');
              if (rsvpPage) {
                  await setDoc(doc(db, "pages", "rsvp-page"), rsvpPage);
              }
          }

          // Special Guests Page Seeding
          const specialGuestsSnap = await getDoc(doc(db, "pages", "special-guests-page"));
          if (!specialGuestsSnap.exists()) {
              const specialGuestsPage = INITIAL_PAGES.find(p => p.id === 'special-guests-page');
              if (specialGuestsPage) {
                  await setDoc(doc(db, "pages", "special-guests-page"), specialGuestsPage);
              }
          }

          // Bridal Party Page Seeding
          const bridalPartySnap = await getDoc(doc(db, "pages", "bridal-party-page"));
          if (!bridalPartySnap.exists()) {
              const bridalPartyPage = INITIAL_PAGES.find(p => p.id === 'bridal-party-page');
              if (bridalPartyPage) {
                  await setDoc(doc(db, "pages", "bridal-party-page"), bridalPartyPage);
              }
          }
      }
      checkAndSeed();
  }, []);


  // --- ACTIONS ---

  const login = (password: string) => {
    if (password === state.settings.adminPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('isAdminAuthenticated', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAdminAuthenticated');
  };

  const guestLogin = (username: string, password?: string) => {
      const guest = state.guests.find(g => 
          g.username.toLowerCase() === username.toLowerCase() && 
          (g.password === password || (!g.password && !password))
      );
      if (guest) {
          setCurrentGuest(guest);
          sessionStorage.setItem('guestId', guest.id);
          return true;
      }
      return false;
  };

  const guestLogout = () => {
      setCurrentGuest(null);
      sessionStorage.removeItem('guestId');
      sessionStorage.removeItem('wizard_seen_session');
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
      status: 'available',
      order: state.gifts.length
    };
    await addDoc(collection(db, "gifts"), newGift);
  };

  const updateGiftsOrder = async (orderedGifts: Gift[]) => {
    const batch = writeBatch(db);
    orderedGifts.forEach((gift, index) => {
      const giftRef = doc(db, "gifts", gift.id);
      batch.update(giftRef, { order: index });
    });
    await batch.commit();
  };

  const updateGift = async (id: string, updatedGift: Partial<Gift>) => {
    const gift = state.gifts.find(g => g.id === id);
    if (gift && updatedGift.price !== undefined) {
      const newPrice = updatedGift.price;
      if (gift.contributions && gift.contributions.length > 0) {
        if (gift.contributions.length === 1) {
          const updatedContributions = [{
            ...gift.contributions[0],
            amount: newPrice
          }];
          updatedGift.contributions = updatedContributions;
        } else {
          const currentTotal = gift.contributions.reduce((sum, c) => sum + c.amount, 0);
          if (currentTotal > 0) {
            const updatedContributions = gift.contributions.map(c => ({
              ...c,
              amount: Number(((c.amount / currentTotal) * newPrice).toFixed(2))
            }));
            updatedGift.contributions = updatedContributions;
          }
        }
      }
    }
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
         const updatedContributions = gift.contributions?.map(c => ({ ...c, status: 'confirmed' as const })) || [];
         await updateDoc(doc(db, "gifts", id), {
             status: 'confirmed',
             purchasedCount: gift.purchasedCount + 1,
             contributions: updatedContributions
         });
     }
  };

  const addContribution = async (giftId: string, contribution: Omit<Contribution, 'id' | 'createdAt'> & {isExternal?: boolean}) => {
    const gift = state.gifts.find(g => g.id === giftId);
    if (gift) {
      const newContribution: Contribution = {
        amount: contribution.amount,
        buyerName: contribution.buyerName,
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        status: contribution.status || (contribution.isExternal ? 'confirmed' : 'pending'),
        createdAt: new Date().toISOString()
      };
      const updatedContributions = [...(gift.contributions || []), newContribution];
      
      const totalConfirmed = updatedContributions
        .filter(c => c.status === 'confirmed')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalAll = updatedContributions.reduce((sum, c) => sum + c.amount, 0);

      let newStatus: 'available' | 'pending' | 'confirmed' = 'available';
      if (totalConfirmed >= gift.price) {
        newStatus = 'confirmed';
      } else if (totalAll >= gift.price) {
        newStatus = 'pending';
      } else {
        newStatus = 'available';
      }

      const confirmedBuyers = updatedContributions
        .filter(c => c.status === 'confirmed')
        .map(c => c.buyerName);
      const buyerName = confirmedBuyers.join(', ') || '';

      await updateDoc(doc(db, "gifts", giftId), {
        contributions: updatedContributions,
        status: newStatus,
        buyerName: buyerName,
        purchasedCount: newStatus === 'confirmed' ? Math.max(gift.purchasedCount, 1) : gift.purchasedCount
      });
    }
  };

  const confirmContribution = async (giftId: string, contributionId: string) => {
    const gift = state.gifts.find(g => g.id === giftId);
    if (gift && gift.contributions) {
      const updatedContributions = gift.contributions.map(c => 
        c.id === contributionId ? { ...c, status: 'confirmed' as const } : c
      );
      
      const totalConfirmed = updatedContributions
        .filter(c => c.status === 'confirmed')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalAll = updatedContributions.reduce((sum, c) => sum + c.amount, 0);
        
      let newStatus: 'available' | 'pending' | 'confirmed' = 'available';
      if (totalConfirmed >= gift.price) {
        newStatus = 'confirmed';
      } else if (totalAll >= gift.price) {
        newStatus = 'pending';
      } else {
        newStatus = 'available';
      }

      const confirmedBuyers = updatedContributions
        .filter(c => c.status === 'confirmed')
        .map(c => c.buyerName);
      const buyerName = confirmedBuyers.join(', ') || '';
      
      await updateDoc(doc(db, "gifts", giftId), {
        contributions: updatedContributions,
        status: newStatus,
        buyerName: buyerName,
        purchasedCount: newStatus === 'confirmed' ? Math.max(gift.purchasedCount, 1) : gift.purchasedCount
      });
    }
  };

  const removeContribution = async (giftId: string, contributionId: string) => {
    const gift = state.gifts.find(g => g.id === giftId);
    if (gift && gift.contributions) {
      const updatedContributions = gift.contributions.filter(c => c.id !== contributionId);
      
      const totalConfirmed = updatedContributions
        .filter(c => c.status === 'confirmed')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalAll = updatedContributions.reduce((sum, c) => sum + c.amount, 0);
        
      let newStatus: 'available' | 'pending' | 'confirmed' = 'available';
      if (totalConfirmed >= gift.price) {
        newStatus = 'confirmed';
      } else if (totalAll >= gift.price) {
        newStatus = 'pending';
      } else {
        newStatus = 'available';
      }

      const confirmedBuyers = updatedContributions
        .filter(c => c.status === 'confirmed')
        .map(c => c.buyerName);
      const buyerName = confirmedBuyers.join(', ') || '';

      await updateDoc(doc(db, "gifts", giftId), {
        contributions: updatedContributions,
        status: newStatus,
        buyerName: buyerName,
        purchasedCount: newStatus === 'confirmed' ? Math.max(gift.purchasedCount, 1) : gift.purchasedCount
      });
    }
  };

  const updateContribution = async (giftId: string, contributionId: string, updatedFields: Partial<Contribution>) => {
    const gift = state.gifts.find(g => g.id === giftId);
    if (gift && gift.contributions) {
      const updatedContributions = gift.contributions.map(c => 
        c.id === contributionId ? { ...c, ...updatedFields } : c
      );
      
      const totalConfirmed = updatedContributions
        .filter(c => c.status === 'confirmed')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalAll = updatedContributions.reduce((sum, c) => sum + c.amount, 0);
        
      let newStatus: 'available' | 'pending' | 'confirmed' = 'available';
      if (totalConfirmed >= gift.price) {
        newStatus = 'confirmed';
      } else if (totalAll >= gift.price) {
        newStatus = 'pending';
      } else {
        newStatus = 'available';
      }

      const confirmedBuyers = updatedContributions
        .filter(c => c.status === 'confirmed')
        .map(c => c.buyerName);
      const buyerName = confirmedBuyers.join(', ') || '';

      await updateDoc(doc(db, "gifts", giftId), {
        contributions: updatedContributions,
        status: newStatus,
        buyerName: buyerName,
        purchasedCount: newStatus === 'confirmed' ? Math.max(gift.purchasedCount, 1) : gift.purchasedCount
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
      const newMessage: any = {
          ...message,
          createdAt: new Date().toISOString()
      };
      
      // Firestore does not support undefined values
      Object.keys(newMessage).forEach(key => {
          if (newMessage[key] === undefined) {
              delete newMessage[key];
          }
      });

      const docRef = await addDoc(collection(db, "messages"), newMessage);
      return docRef.id;
  };

  const updateMessageStatus = async (id: string, status: 'pending' | 'approved') => {
      await updateDoc(doc(db, "messages", id), { status });
  };

  const deleteMessage = async (id: string) => {
      const msg = state.messages.find(m => m.id === id);
      if (msg) {
          // Delete from Firebase Storage
          if (msg.firebasePath) {
              try {
                  const storageRef = ref(storage, msg.firebasePath);
                  await deleteObject(storageRef);
              } catch (error) {
                  console.error("Error deleting message from Firebase Storage:", error);
              }
          }
          // Delete from Cloudinary
          if (msg.cloudinaryPublicId) {
              try {
                  const resourceType = msg.type.includes('video') ? 'video' : 'raw';
                  await fetch('/api/storage/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ publicId: msg.cloudinaryPublicId, resourceType })
                  });
              } catch (error) {
                  console.error("Error deleting message from Cloudinary:", error);
              }
          }
      }
      await deleteDoc(doc(db, "messages", id));
  };

  // PHOTOS
  const addPhoto = async (photo: Omit<Photo, 'id' | 'createdAt'>) => {
      const newPhoto: any = {
          ...photo,
          createdAt: new Date().toISOString()
      };

      // Firestore does not support undefined values
      Object.keys(newPhoto).forEach(key => {
          if (newPhoto[key] === undefined) {
              delete newPhoto[key];
          }
      });

      const docRef = await addDoc(collection(db, "photos"), newPhoto);
      return docRef.id;
  };

  const updatePhotoStatus = async (id: string, status: 'pending' | 'approved') => {
      await updateDoc(doc(db, "photos", id), { status });
  };

  const requestPhotoDeletion = async (id: string, reason: string) => {
      await updateDoc(doc(db, "photos", id), {
          deletionRequest: {
              reason,
              requestedAt: new Date().toISOString()
          }
      });
  };

  const rejectPhotoDeletion = async (id: string) => {
      // @ts-ignore
      await updateDoc(doc(db, "photos", id), {
          deletionRequest: deleteField()
      });
  };

  const deletePhoto = async (id: string) => {
      const photo = state.photos.find(p => p.id === id);
      if (photo) {
          // Delete from Firebase Storage
          if (photo.publicId) {
              try {
                  const storageRef = ref(storage, photo.publicId);
                  await deleteObject(storageRef);
              } catch (error) {
                  console.error("Error deleting photo from Firebase Storage:", error);
              }
          }
          // Delete from Cloudinary
          if (photo.cloudinaryPublicId) {
              try {
                  await fetch('/api/storage/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ publicId: photo.cloudinaryPublicId, resourceType: 'image' })
                  });
              } catch (error) {
                  console.error("Error deleting photo from Cloudinary:", error);
              }
          }
      }
      await deleteDoc(doc(db, "photos", id));
  };

  // GUESTS
  const addGuest = async (guest: Omit<Guest, 'id'>) => {
      await addDoc(collection(db, "guests"), guest);
  };

  const updateGuest = async (id: string, guest: Partial<Guest>) => {
      const dataToUpdate: any = { ...guest };
      
      // Remove undefined values to prevent Firestore errors
      Object.keys(dataToUpdate).forEach(key => {
        if (dataToUpdate[key] === undefined) {
          delete dataToUpdate[key];
        }
      });

      // Check for large base64 strings in dressPreviewUrl
      if (dataToUpdate.dressPreviewUrl && dataToUpdate.dressPreviewUrl.startsWith('data:image') && dataToUpdate.dressPreviewUrl.length > 800000) {
        try {
          console.log("Image too large for Firestore, uploading to Storage...");
          dataToUpdate.dressPreviewUrl = await uploadDressPreview(id, dataToUpdate.dressPreviewUrl);
        } catch (err) {
          console.error("Failed to upload large image to Storage:", err);
          // Continue anyway, maybe it fits or it will fail at Firestore level
        }
      }

      if (dataToUpdate.hasOwnProperty('photoUrl') && dataToUpdate.photoUrl === '') {
        dataToUpdate.photoUrl = deleteField();
      }
      try {
        await updateDoc(doc(db, "guests", id), dataToUpdate);
        
        // Simulate sending email if RSVP status changed to confirmed
        const currentGuestData = state.guests.find(g => g.id === id);
        if (guest.rsvpStatus === 'confirmed' && currentGuestData?.rsvpStatus !== 'confirmed') {
          console.log(`[SIMULATION] Email sent to ${currentGuestData?.email || currentGuestData?.name} confirming RSVP with map and details.`);
          // In a real app, you would trigger a Cloud Function or an API call to SendGrid/Nodemailer here.
        }
      } catch (error) {
        console.error("Firestore update error:", error);
        throw error;
      }
  };

  const uploadDressPreview = async (guestId: string, base64: string) => {
    const storageRef = ref(storage, `dress-previews/${guestId}-${Date.now()}.png`);
    await uploadString(storageRef, base64, 'data_url');
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const deleteDressPreview = async (guestId: string) => {
    const guest = state.guests.find(g => g.id === guestId);
    if (guest?.dressPreviewUrl) {
      if (guest.dressPreviewUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const decodedUrl = decodeURIComponent(guest.dressPreviewUrl);
          const pathPart = decodedUrl.split('/o/')[1].split('?')[0];
          const storageRef = ref(storage, pathPart);
          await deleteObject(storageRef);
        } catch (error) {
          console.error("Error deleting dress preview from storage:", error);
        }
      }
      
      await updateDoc(doc(db, "guests", guestId), {
        dressPreviewUrl: deleteField()
      });
    }
  };

  const removeGuest = async (id: string) => {
      await deleteDoc(doc(db, "guests", id));
  };

  const seedGuests = async () => {
    const guestsToSeed: Omit<Guest, 'id'>[] = [
      { name: 'Lorena e Even', username: 'lorenaeeven', password: '12345678', category: 'Padrinhos', gender: 'Couple', showWizard: true },
      { name: 'Jackeline e Sérgio', username: 'jaquelineesergio', password: '12345678', category: 'Padrinhos', gender: 'Couple', showWizard: true },
      { name: 'Rebeca e Clovis', username: 'rebecaeclovis', password: '12345678', category: 'Padrinhos', gender: 'Couple', showWizard: true },
      { name: 'Lara e Max', username: 'laraemax', password: '12345678', category: 'Padrinhos', gender: 'Couple', showWizard: true },
      { name: 'Nora e Pablo', username: 'noraepablo', password: '12345678', category: 'Padrinhos', gender: 'Couple', showWizard: true },
      { name: 'Fernanda e Eduardo', username: 'fernandaeeduardo', password: '12345678', category: 'Padrinhos', gender: 'Couple', showWizard: true },
      { name: 'Grasiela e João Thiago', username: 'grasielaejoao', password: '12345678', category: 'Padrinhos', gender: 'Couple', showWizard: true },
      { name: 'Matheus e Andréa', username: 'andreaematheus', password: '12345678', category: 'Padrinhos', gender: 'Couple', showWizard: true },
      { name: 'Amanda e Ticiane', username: 'amandaeticiane', password: '12345678', category: 'Madrinhas', gender: 'Couple', showWizard: true },
      { name: 'Ian Marins', username: 'ianmarins', password: '12345678', category: 'Padrinho', gender: 'M', showWizard: true },
      { name: 'Fernando Mendes', username: 'fernandomendes', password: '12345678', category: 'Padrinho', gender: 'M', showWizard: true },
      { name: 'Mariana Freitas', username: 'marianafreitas', password: '12345678', category: 'Madrinha', gender: 'F', showWizard: true },
      { name: 'Flavia Mota', username: 'flaviamota', password: '12345678', category: 'Madrinha', gender: 'F', showWizard: true },
      { name: 'Ana Inês', username: 'anaines', password: '12345678', category: 'Demoiselle', gender: 'F', showWizard: true },
      { name: 'Géssica Santana', username: 'gessicasantana', password: '12345678', category: 'Demoiselle', gender: 'F', showWizard: true },
      { name: 'Yasmini Abdo', username: 'yasminiabdo', password: '12345678', category: 'Demoiselle', gender: 'F', showWizard: true },
      { name: 'Andréa Mercês', username: 'andreamerces', password: '12345678', category: 'Mãe da Noiva', gender: 'F', showWizard: true },
      { name: 'Marco e Cassia', username: 'cassiaemarco', password: '12345678', category: 'Pai do Noivo', gender: 'Couple', showWizard: true }
    ];

    const batch = writeBatch(db);
    guestsToSeed.forEach(g => {
      const docRef = doc(collection(db, "guests"));
      batch.set(docRef, { ...g, id: docRef.id, rsvpStatus: 'pending' });
    });
    await batch.commit();
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
    localStorage.removeItem('isAdminAuthenticated');
  };

  return (
    <StoreContext.Provider value={{
      ...state,
      isAuthenticated,
      currentGuest,
      login,
      logout,
      guestLogin,
      guestLogout,
      updateSettings,
      addGift,
      updateGift,
      removeGift,
      updateGiftsOrder,
      markGiftAsPending,
      confirmGiftPayment,
      addContribution,
      confirmContribution,
      removeContribution,
      updateContribution,
      addPage,
      updatePage,
      removePage,
      addMessage,
      updateMessageStatus,
      deleteMessage,
      addPhoto,
      updatePhotoStatus,
      requestPhotoDeletion,
      rejectPhotoDeletion,
      deletePhoto,
      addGuest,
      updateGuest,
      uploadDressPreview,
      deleteDressPreview,
      removeGuest,
      seedGuests,
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

export const useTheme = () => {
  const { settings, currentGuest } = useStore();
  return currentGuest?.themeColor || settings.primaryColor;
};