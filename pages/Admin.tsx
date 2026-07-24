import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Edit2, Wand2, Loader2, Save, LogOut, Eye, EyeOff, Image as ImageIcon, CheckCircle, Video, Mic, Clock, X, MessageCircle, Upload, Crop, Monitor, Smartphone } from 'lucide-react';
import { generatePageContent } from '../services/geminiService';
import { Gift, Page, Section, Contribution, BannerImage } from '../types';
import { Modal } from '../components/Modal';
import { Country, State, City } from 'country-state-city';
import { AsYouType, getCountryCallingCode } from 'libphonenumber-js';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { BannerCropModal } from '../components/BannerCropModal';

export const AdminPage: React.FC = () => {
  const { 
    settings, updateSettings, 
    gifts, addGift, updateGift, removeGift, confirmGiftPayment, confirmContribution, removeContribution, addContribution, updateContribution,
    pages, addPage, removePage, updatePage, 
    messages, deleteMessage, updateMessageStatus,
    photos, deletePhoto, updatePhotoStatus, rejectPhotoDeletion,
    guests, addGuest, updateGuest, removeGuest, seedGuests,
    resetStore, logout, isAuthenticated 
  } = useStore();
  
  const navigate = useNavigate();
  // Added 'messages' tab
  const [activeTab, setActiveTab] = useState<'general' | 'gifts' | 'pages' | 'messages' | 'photos' | 'guests'>('general');
  
  // States for Gift Form
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [newGift, setNewGift] = useState<Partial<Gift>>({ name: '', price: 0, description: '', imageUrl: 'https://picsum.photos/400/300', status: 'available', buyerName: '', order: undefined });
  const [selectedGuestIdForGiftForm, setSelectedGuestIdForGiftForm] = useState<string>('');

  // Contribution state variables
  const [expandedGiftId, setExpandedGiftId] = useState<string | null>(null);
  const [selectedGuestIdForGift, setSelectedGuestIdForGift] = useState<string>('');
  const [customContributorName, setCustomContributorName] = useState<string>('');
  const [newContributionAmount, setNewContributionAmount] = useState<number>(0);
  const [newContributionStatus, setNewContributionStatus] = useState<'pending' | 'confirmed'>('pending');
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null);
  const [editContribName, setEditContribName] = useState<string>('');
  const [editContribAmount, setEditContribAmount] = useState<number>(0);
  const [editContribStatus, setEditContribStatus] = useState<'pending' | 'confirmed'>('pending');

  // States for Guest Form
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [newGuest, setNewGuest] = useState({ 
    name: '', 
    username: '', 
    password: '',
    category: 'Comum' as any,
    gender: 'M' as 'M' | 'F' | 'Couple',
    phone: '',
    city: '',
    state: '',
    stateCode: '',
    country: 'Brazil',
    countryCode: 'BR',
    email: '',
    rsvpStatus: 'pending' as 'pending' | 'confirmed' | 'declined'
  });

  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // States for WhatsApp Message Templates & Sending Modal
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('Comum');
  const [tempTemplateText, setTempTemplateText] = useState<string>('');
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [selectedGuestForWa, setSelectedGuestForWa] = useState<any>(null);
  const [waMessageText, setWaMessageText] = useState('');
  const [waPhoneNumber, setWaPhoneNumber] = useState('');
  const [showManualPhoneInput, setShowManualPhoneInput] = useState(false);

  const categoriesList = ['Comum', 'Padrinho', 'Madrinha', 'Padrinhos', 'Madrinhas', 'Demoiselle', 'Mãe da Noiva', 'Pai da Noiva', 'Pais da Noiva', 'Mãe do Noivo', 'Pai do Noivo', 'Pais do Noivo', 'Noivo', 'Noiva'];

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedGuests = [...guests].sort((a, b) => {
    let valA = (a as any)[sortColumn] || '';
    let valB = (b as any)[sortColumn] || '';
    
    if (typeof valA === 'string' && typeof valB === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // States for AI Page Gen
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // States for Home Page Edit
  const [homeHero, setHomeHero] = useState<Partial<Section>>({});
  const [homeStory, setHomeStory] = useState<Partial<Section>>({});
  const [homeLocation, setHomeLocation] = useState<Partial<Section>>({});
  const [newHeroImageUrl, setNewHeroImageUrl] = useState('');

  // States for Banner Upload and Crop
  const [isBannerCropModalOpen, setIsBannerCropModalOpen] = useState(false);
  const [cropModalImageFile, setCropModalImageFile] = useState<File | null>(null);
  const [cropModalImageUrl, setCropModalImageUrl] = useState<string | null>(null);
  const [currentCroppingIndex, setCurrentCroppingIndex] = useState<number | null>(null);
  const [isBannerUploading, setIsBannerUploading] = useState(false);

  // State for Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (!isAuthenticated) {
        navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Load Home Page Hero data on mount
  useEffect(() => {
    const home = pages.find(p => p.id === 'home');
    const hero = home?.sections.find(s => s.type === 'hero');
    if (hero) {
        let loadedHero = { ...hero };
        if (!loadedHero.imageUrls || loadedHero.imageUrls.length === 0) {
            if (loadedHero.imageUrl) {
                loadedHero.imageUrls = [loadedHero.imageUrl];
            } else {
                loadedHero.imageUrls = [];
            }
        }
        if (!loadedHero.bannerImages) {
            loadedHero.bannerImages = loadedHero.imageUrls.map((url, i) => ({
                id: `legacy-${i}-${Date.now()}`,
                url: url,
                landscapeUrl: url,
                portraitUrl: url
            }));
        }
        setHomeHero(loadedHero);
    }
    
    const story = home?.sections.find(s => s.type === 'text' && s.id === 'text-1');
    if (story) {
        setHomeStory({ ...story });
    }

    const locationSection = home?.sections.find(s => s.type === 'location');
    if (locationSection) {
        setHomeLocation({ ...locationSection });
    }
  }, [pages]);

  // Synchronize temp template text when selected category or settings change
  useEffect(() => {
    const templates = settings.whatsappTemplates || {};
    const currentText = templates[selectedTemplateCategory];
    if (currentText !== undefined) {
      setTempTemplateText(currentText);
    } else {
      setTempTemplateText(`Olá, {nome}! Tudo bem?\n\nGostaríamos de convidá-lo(a) para acessar o nosso site de casamento e confirmar sua presença.\n\nSua categoria: {categoria}\nUsuário de login: {usuario}\nSenha: {senha}\n\nPara acessar, entre no link: ${window.location.origin}\n\nEsperamos você!`);
    }
  }, [selectedTemplateCategory, settings.whatsappTemplates]);

  const handleSaveTemplate = async (category: string, text: string) => {
    const currentTemplates = settings.whatsappTemplates || {};
    const updatedTemplates = {
      ...currentTemplates,
      [category]: text
    };
    await updateSettings({ whatsappTemplates: updatedTemplates });
    alert(`Modelo para a categoria "${category}" salvo com sucesso!`);
  };

  const handleOpenWaModal = (guest: any) => {
    setSelectedGuestForWa(guest);
    setWaPhoneNumber(guest.phone || '');
    setShowManualPhoneInput(!guest.phone);
    
    const templates = settings.whatsappTemplates || {};
    const cat = guest.category || 'Comum';
    const template = templates[cat] || `Olá, {nome}! Tudo bem?\n\nGostaríamos de convidá-lo(a) para acessar o nosso site de casamento e confirmar sua presença.\n\nSua categoria: {categoria}\nUsuário de login: {usuario}\nSenha: {senha}\n\nPara acessar, entre no link: ${window.location.origin}\n\nEsperamos você!`;
    
    let compiled = template;
    compiled = compiled.replace(/{nome}/gi, guest.name || '');
    compiled = compiled.replace(/{usuario}/gi, guest.username || '');
    compiled = compiled.replace(/{senha}/gi, guest.password || '');
    compiled = compiled.replace(/{categoria}/gi, guest.category || 'Comum');
    
    setWaMessageText(compiled);
    setIsWaModalOpen(true);
  };

  const handleSendWaMessage = async () => {
    if (!waPhoneNumber) {
      alert("Por favor, preencha o número de telefone do convidado.");
      return;
    }
    
    let cleanPhone = waPhoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }
    
    if (selectedGuestForWa && waPhoneNumber !== selectedGuestForWa.phone) {
      try {
        await updateGuest(selectedGuestForWa.id, { phone: waPhoneNumber });
      } catch (err) {
        console.error("Erro ao atualizar o telefone do convidado:", err);
      }
    }
    
    setIsWaModalOpen(false);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessageText)}`;
    window.open(waUrl, '_blank');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEditGift = (gift: Gift) => {
    setEditingGiftId(gift.id);
    setNewGift({
        name: gift.name,
        price: gift.price,
        description: gift.description,
        imageUrl: gift.imageUrl,
        externalLink: gift.externalLink,
        status: gift.status || 'available',
        buyerName: gift.buyerName || '',
        order: gift.order !== undefined ? gift.order : 0
    });
    // Set matching guest ID if exists
    const matchingGuest = guests.find(g => g.name === gift.buyerName);
    if (matchingGuest) {
      setSelectedGuestIdForGiftForm(matchingGuest.id);
    } else if (gift.buyerName) {
      setSelectedGuestIdForGiftForm('custom');
    } else {
      setSelectedGuestIdForGiftForm('');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditGift = () => {
    setEditingGiftId(null);
    setNewGift({ name: '', price: 0, description: '', imageUrl: 'https://picsum.photos/400/300', externalLink: '', status: 'available', buyerName: '', order: undefined });
    setSelectedGuestIdForGiftForm('');
  };

  const handleGiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGift.name && newGift.price) {
      if (editingGiftId) {
        updateGift(editingGiftId, {
            name: newGift.name,
            price: Number(newGift.price),
            description: newGift.description || '',
            imageUrl: newGift.imageUrl || 'https://picsum.photos/400/300',
            externalLink: newGift.externalLink || '',
            status: newGift.status || 'available',
            buyerName: newGift.buyerName || '',
            order: newGift.order !== undefined ? Number(newGift.order) : 0
        });
        setEditingGiftId(null);
      } else {
        addGift({
            name: newGift.name,
            price: Number(newGift.price),
            description: newGift.description || '',
            imageUrl: newGift.imageUrl || 'https://picsum.photos/400/300',
            externalLink: newGift.externalLink || '',
            status: 'available',
            buyerName: '',
            order: newGift.order !== undefined ? Number(newGift.order) : gifts.length
        } as any);
      }
      setNewGift({ name: '', price: 0, description: '', imageUrl: 'https://picsum.photos/400/300', externalLink: '', status: 'available', buyerName: '', order: undefined });
      setSelectedGuestIdForGiftForm('');
    }
  };

  const handleAddManualContribution = async (gift: Gift) => {
    let contributorName = customContributorName.trim();
    if (selectedGuestIdForGift && selectedGuestIdForGift !== 'custom') {
      const guestObj = guests.find(g => g.id === selectedGuestIdForGift);
      if (guestObj) {
        contributorName = guestObj.name;
      }
    }
    
    if (!contributorName) {
      alert("Por favor, selecione um convidado ou digite o nome.");
      return;
    }
    
    if (!newContributionAmount || newContributionAmount <= 0) {
      alert("Por favor, digite um valor maior que zero.");
      return;
    }

    const currentConfirmed = gift.contributions
      ?.filter(contrib => contrib.status === 'confirmed')
      .reduce((sum, contrib) => sum + contrib.amount, 0) || 0;

    if (newContributionStatus === 'confirmed') {
      const newConfirmedTotal = currentConfirmed + newContributionAmount;
      const isFullyFunded = newConfirmedTotal >= gift.price;

      if (isFullyFunded) {
        setConfirmModal({
          isOpen: true,
          message: `Esta nova contribuição de R$ ${newContributionAmount.toFixed(2)} feita por ${contributorName} completará o valor total do presente "${gift.name}" (R$ ${gift.price.toFixed(2)}). Deseja confirmar o recebimento e marcar o presente como TOTALMENTE COMPRADO?`,
          onConfirm: async () => {
            await addContribution(gift.id, {
              buyerName: contributorName,
              amount: newContributionAmount,
              status: 'confirmed'
            });
            setSelectedGuestIdForGift('');
            setCustomContributorName('');
            setNewContributionAmount(0);
            setNewContributionStatus('pending');
          }
        });
        return;
      } else {
        setConfirmModal({
          isOpen: true,
          message: `Confirmar recebimento desta contribuição parcial de R$ ${newContributionAmount.toFixed(2)} feita por ${contributorName}? O presente "${gift.name}" continuará DISPONÍVEL para outras contribuições pois o valor total (R$ ${gift.price.toFixed(2)}) ainda não foi atingido.`,
          onConfirm: async () => {
            await addContribution(gift.id, {
              buyerName: contributorName,
              amount: newContributionAmount,
              status: 'confirmed'
            });
            setSelectedGuestIdForGift('');
            setCustomContributorName('');
            setNewContributionAmount(0);
            setNewContributionStatus('pending');
          }
        });
        return;
      }
    }

    // Pending contribution addition
    await addContribution(gift.id, {
      buyerName: contributorName,
      amount: newContributionAmount,
      status: 'pending'
    });
    
    setSelectedGuestIdForGift('');
    setCustomContributorName('');
    setNewContributionAmount(0);
    setNewContributionStatus('pending');
  };

  const handleConfirmContributionClick = (gift: Gift, c: Contribution) => {
    const currentConfirmed = gift.contributions
      ?.filter(contrib => contrib.id !== c.id && contrib.status === 'confirmed')
      .reduce((sum, contrib) => sum + contrib.amount, 0) || 0;
    const newConfirmedTotal = currentConfirmed + c.amount;
    const isFullyFunded = newConfirmedTotal >= gift.price;

    if (isFullyFunded) {
      setConfirmModal({
        isOpen: true,
        message: `Esta contribuição de R$ ${c.amount.toFixed(2)} feita por ${c.buyerName} completará o valor total de R$ ${gift.price.toFixed(2)} do presente "${gift.name}". Confirmar recebimento total e marcar o presente como TOTALMENTE COMPRADO?`,
        onConfirm: () => confirmContribution(gift.id, c.id)
      });
    } else {
      setConfirmModal({
        isOpen: true,
        message: `Confirmar recebimento desta contribuição parcial de R$ ${c.amount.toFixed(2)} feita por ${c.buyerName}? O presente "${gift.name}" continuará DISPONÍVEL para outras contribuições pois o valor total de R$ ${gift.price.toFixed(2)} ainda não foi atingido.`,
        onConfirm: () => confirmContribution(gift.id, c.id)
      });
    }
  };

  const handleSaveContributionEdit = async (gift: Gift, c: Contribution) => {
    if (!editContribName.trim()) {
      alert("O nome do comprador não pode ser vazio.");
      return;
    }
    if (editContribAmount <= 0) {
      alert("O valor deve ser maior que zero.");
      return;
    }

    const currentConfirmed = gift.contributions
      ?.filter(contrib => contrib.id !== c.id && contrib.status === 'confirmed')
      .reduce((sum, contrib) => sum + contrib.amount, 0) || 0;

    if (editContribStatus === 'confirmed') {
      const newConfirmedTotal = currentConfirmed + editContribAmount;
      const isFullyFunded = newConfirmedTotal >= gift.price;

      if (isFullyFunded) {
        setConfirmModal({
          isOpen: true,
          message: `Esta alteração para R$ ${editContribAmount.toFixed(2)} (Confirmado) de ${editContribName} completará o valor total do presente "${gift.name}" (R$ ${gift.price.toFixed(2)}). Confirmar alteração e marcar o presente como TOTALMENTE COMPRADO?`,
          onConfirm: async () => {
            await updateContribution(gift.id, c.id, {
              buyerName: editContribName.trim(),
              amount: editContribAmount,
              status: 'confirmed'
            });
            setEditingContributionId(null);
          }
        });
        return;
      } else {
        setConfirmModal({
          isOpen: true,
          message: `Confirmar alteração da contribuição de ${editContribName} para R$ ${editContribAmount.toFixed(2)} (Confirmado)? O presente "${gift.name}" continuará DISPONÍVEL para outras contribuições pois o valor total de R$ ${gift.price.toFixed(2)} ainda não foi atingido.`,
          onConfirm: async () => {
            await updateContribution(gift.id, c.id, {
              buyerName: editContribName.trim(),
              amount: editContribAmount,
              status: 'confirmed'
            });
            setEditingContributionId(null);
          }
        });
        return;
      }
    }

    // Save as pending
    setConfirmModal({
      isOpen: true,
      message: `Confirmar alteração da contribuição de ${editContribName} como PENDENTE?`,
      onConfirm: async () => {
        await updateContribution(gift.id, c.id, {
          buyerName: editContribName.trim(),
          amount: editContribAmount,
          status: 'pending'
        });
        setEditingContributionId(null);
      }
    });
  };

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => State.getStatesOfCountry(newGuest.countryCode || 'BR'), [newGuest.countryCode]);
  const cities = useMemo(() => City.getCitiesOfState(newGuest.countryCode || 'BR', newGuest.stateCode || ''), [newGuest.countryCode, newGuest.stateCode]);

  const handleEditGuest = (guest: any) => {
    setEditingGuestId(guest.id);
    setNewGuest({
        name: guest.name,
        username: guest.username,
        password: guest.password || '',
        category: guest.category || 'Comum',
        phone: guest.phone || '',
        city: guest.city || '',
        state: guest.state || '',
        stateCode: guest.stateCode || '',
        country: guest.country || 'Brazil',
        countryCode: guest.countryCode || 'BR',
        email: guest.email || '',
        rsvpStatus: guest.rsvpStatus || 'pending'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditGuest = () => {
    setEditingGuestId(null);
    setNewGuest({ 
      name: '', 
      username: '', 
      password: '',
      category: 'Comum',
      phone: '',
      city: '',
      state: '',
      stateCode: '',
      country: 'Brazil',
      countryCode: 'BR',
      email: '',
      rsvpStatus: 'pending'
    });
  };

  const formatPhone = (val: string, countryCode: string) => {
    try {
      const formatter = new AsYouType(countryCode as any);
      return formatter.input(val);
    } catch {
      return val;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value, newGuest.countryCode || 'BR');
    setNewGuest({ ...newGuest, phone: formatted });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const selectedCountry = Country.getCountryByCode(selectedIso);
    let newPhone = newGuest.phone;
    
    if (selectedCountry) {
        // Pre-fill phone code
        const code = `+${selectedCountry.phonecode} `;
        // Only update if phone is empty or has another code
        if (!newPhone || newPhone.trim() === '' || newPhone.startsWith('+')) {
            newPhone = code;
        } else {
            newPhone = formatPhone(newPhone, selectedIso);
        }
    }

    setNewGuest({ 
        ...newGuest, 
        countryCode: selectedIso, 
        country: selectedCountry?.name || '',
        stateCode: '',
        state: '',
        city: '',
        phone: newPhone 
    });
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedIso = e.target.value;
      const selectedState = State.getStateByCodeAndCountry(selectedIso, newGuest.countryCode || 'BR');
      setNewGuest({
          ...newGuest,
          stateCode: selectedIso,
          state: selectedState?.name || '',
          city: ''
      });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setNewGuest({ ...newGuest, city: e.target.value });
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGuest.name && newGuest.username) {
      if (editingGuestId) {
        updateGuest(editingGuestId, {
            name: newGuest.name,
            username: newGuest.username,
            password: newGuest.password || undefined,
            category: newGuest.category,
            phone: newGuest.phone,
            city: newGuest.city,
            state: newGuest.state,
            stateCode: newGuest.stateCode,
            country: newGuest.country,
            countryCode: newGuest.countryCode,
            email: newGuest.email,
            rsvpStatus: newGuest.rsvpStatus
        });
        setEditingGuestId(null);
      } else {
        addGuest({
            name: newGuest.name,
            username: newGuest.username,
            password: newGuest.password || undefined,
            category: newGuest.category,
            phone: newGuest.phone,
            city: newGuest.city,
            state: newGuest.state,
            stateCode: newGuest.stateCode,
            country: newGuest.country,
            countryCode: newGuest.countryCode,
            email: newGuest.email,
            showWizard: true,
            rsvpStatus: newGuest.rsvpStatus
        });
      }
      setNewGuest({ 
        name: '', 
        username: '', 
        password: '',
        category: 'Comum',
        phone: '',
        city: '',
        state: '',
        stateCode: '',
        country: 'Brazil',
        countryCode: 'BR',
        email: '',
        rsvpStatus: 'pending'
      });
    }
  };

  const addHeroImage = () => {
      if (newHeroImageUrl) {
          const currentImages = homeHero.imageUrls || [];
          const currentBannerImages = homeHero.bannerImages || [];
          const newBannerImg: BannerImage = {
              id: `banner-url-${Date.now()}`,
              url: newHeroImageUrl,
              landscapeUrl: newHeroImageUrl,
              portraitUrl: newHeroImageUrl
          };
          setHomeHero({
              ...homeHero,
              imageUrls: [...currentImages, newHeroImageUrl],
              bannerImages: [...currentBannerImages, newBannerImg],
              imageUrl: newHeroImageUrl 
          });
          setNewHeroImageUrl('');
      }
  };

  const removeHeroImage = (index: number) => {
      const currentImages = homeHero.imageUrls || [];
      const currentBannerImages = homeHero.bannerImages || [];
      const newImages = currentImages.filter((_, i) => i !== index);
      const newBannerImages = currentBannerImages.filter((_, i) => i !== index);
      setHomeHero({
          ...homeHero,
          imageUrls: newImages,
          bannerImages: newBannerImages,
          imageUrl: newImages.length > 0 ? newImages[0] : '' 
      });
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropModalImageFile(file);
      setCropModalImageUrl(null);
      setCurrentCroppingIndex(null);
      setIsBannerCropModalOpen(true);
      e.target.value = '';
    }
  };

  const handleEditExistingBannerCrop = (idx: number) => {
    const bannerImg = homeHero.bannerImages?.[idx];
    if (bannerImg) {
      setCropModalImageUrl(bannerImg.url || bannerImg.landscapeUrl || bannerImg.portraitUrl || null);
      setCropModalImageFile(null);
      setCurrentCroppingIndex(idx);
      setIsBannerCropModalOpen(true);
    }
  };

  const handleBannerCropSave = async (
    landscapeBlob: Blob, 
    portraitBlob: Blob,
    cropState: {
      landscape: { x: number; y: number; zoom: number };
      portrait: { x: number; y: number; zoom: number };
    }
  ) => {
    try {
      setIsBannerUploading(true);
      setIsBannerCropModalOpen(false);

      const timestamp = Date.now();
      const filenameLandscape = `banners/landscape_${timestamp}.webp`;
      const filenamePortrait = `banners/portrait_${timestamp}.webp`;

      const CLOUDINARY_CLOUD_NAME = "dp1qpjvdf".trim();
      const CLOUDINARY_UPLOAD_PRESET = "casamento_upload".trim();

      const uploadWithFallback = async (blob: Blob, firebasePath: string, cloudinaryFileName: string): Promise<string> => {
        try {
          // First attempt: Firebase Storage
          const storageRef = ref(storage, firebasePath);
          await uploadBytes(storageRef, blob);
          return await getDownloadURL(storageRef);
        } catch (fbError: any) {
          console.warn("Firebase Storage upload failed (likely quota exceeded). Falling back to Cloudinary:", fbError);
          
          const formData = new FormData();
          formData.append('file', blob);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('public_id', cloudinaryFileName);
          formData.append('folder', 'banners');

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Erro ao fazer upload no Cloudinary de fallback.');
          }

          const data = await response.json();
          return data.secure_url;
        }
      };

      // Upload landscape version
      const landscapeUrl = await uploadWithFallback(landscapeBlob, filenameLandscape, `landscape_${timestamp}`);

      // Upload portrait version
      const portraitUrl = await uploadWithFallback(portraitBlob, filenamePortrait, `portrait_${timestamp}`);

      let originalUrl = landscapeUrl;
      if (cropModalImageFile) {
        const filenameOriginal = `banners/original_${timestamp}.webp`;
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp'
        };
        const compressedOriginal = await imageCompression(cropModalImageFile, options);
        originalUrl = await uploadWithFallback(compressedOriginal, filenameOriginal, `original_${timestamp}`);
      } else if (cropModalImageUrl) {
        originalUrl = cropModalImageUrl;
      }

      const newBannerImage: BannerImage = {
        id: `banner-${timestamp}`,
        url: originalUrl,
        landscapeUrl,
        portraitUrl,
        cropState,
      };

      const currentBannerImages = homeHero.bannerImages || [];
      const currentImageUrls = homeHero.imageUrls || [];

      if (currentCroppingIndex !== null) {
        const updatedBannerImages = [...currentBannerImages];
        updatedBannerImages[currentCroppingIndex] = {
          ...updatedBannerImages[currentCroppingIndex],
          landscapeUrl,
          portraitUrl,
          url: originalUrl,
          cropState,
        };

        const updatedImageUrls = [...currentImageUrls];
        updatedImageUrls[currentCroppingIndex] = landscapeUrl;

        setHomeHero({
          ...homeHero,
          bannerImages: updatedBannerImages,
          imageUrls: updatedImageUrls,
          imageUrl: updatedImageUrls.length > 0 ? updatedImageUrls[0] : '',
        });
      } else {
        setHomeHero({
          ...homeHero,
          bannerImages: [...currentBannerImages, newBannerImage],
          imageUrls: [...currentImageUrls, landscapeUrl],
          imageUrl: landscapeUrl,
        });
      }

      alert('Foto do banner processada e salva temporariamente! Clique em "Salvar Capa" para persistir as alterações.');
    } catch (error) {
      console.error('Error saving cropped banner images:', error);
      alert('Erro ao fazer upload dos recortes da imagem do banner.');
    } finally {
      setIsBannerUploading(false);
      setCropModalImageFile(null);
      setCropModalImageUrl(null);
      setCurrentCroppingIndex(null);
    }
  };

  const handleUpdateHomeHero = () => {
    const home = pages.find(p => p.id === 'home');
    if (home && homeHero.id) {
        const updatedSections = home.sections.map(s => 
            s.id === homeHero.id ? { ...s, ...homeHero } : s
        );
        updatePage('home', { sections: updatedSections });
        alert('Capa do site atualizada com sucesso!');
    }
  };

  const handleUpdateHomeStory = () => {
    const home = pages.find(p => p.id === 'home');
    if (home && homeStory.id) {
        const updatedSections = home.sections.map(s => 
            s.id === homeStory.id ? { ...s, ...homeStory } : s
        );
        updatePage('home', { sections: updatedSections });
        alert('Seção "Como tudo começou" atualizada com sucesso!');
    }
  };

  const handleUpdateHomeLocation = () => {
    const home = pages.find(p => p.id === 'home');
    if (home && homeLocation.id) {
        const updatedSections = home.sections.map(s => 
            s.id === homeLocation.id ? { ...s, ...homeLocation } : s
        );
        updatePage('home', { sections: updatedSections });
        alert('Seção "Local da Festa" atualizada com sucesso!');
    }
  };

  // --- PRE-WEDDING PHOTO & VIDEO UPLOAD ACTIONS & STATES ---
  const [preWeddingVideoUploadProgress, setPreWeddingVideoUploadProgress] = useState(0);
  const [isUploadingPreWeddingVideo, setIsUploadingPreWeddingVideo] = useState(false);
  const [preWeddingPhotosUploadProgress, setPreWeddingPhotosUploadProgress] = useState(0);
  const [isUploadingPreWeddingPhotos, setIsUploadingPreWeddingPhotos] = useState(false);
  const [preWeddingVideoUrlInput, setPreWeddingVideoUrlInput] = useState('');
  const [preWeddingVideoSourceType, setPreWeddingVideoSourceType] = useState<'file' | 'url'>('url');

  const preWeddingPage = pages.find(p => p.id === 'pre-wedding-page');

  const uploadMediaWithFallback = async (
    blob: Blob, 
    firebasePath: string, 
    cloudinaryFileName: string, 
    resourceType: 'image' | 'video'
  ): Promise<{ url: string; firebasePath?: string; cloudinaryPublicId?: string }> => {
    const CLOUDINARY_CLOUD_NAME = "dp1qpjvdf".trim();
    const CLOUDINARY_UPLOAD_PRESET = "casamento_upload".trim();

    try {
      // 1. Try Firebase Storage first
      const storageRef = ref(storage, firebasePath);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      return { url, firebasePath };
    } catch (fbError: any) {
      console.warn("Firebase Storage upload failed, falling back to Cloudinary:", fbError);
      // 2. Fallback to Cloudinary
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('public_id', cloudinaryFileName);
      formData.append('folder', 'pre-wedding');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao enviar arquivo para o Cloudinary de fallback.');
      }

      const data = await response.json();
      return { 
        url: data.secure_url, 
        cloudinaryPublicId: data.public_id 
      };
    }
  };

  const handleUploadPreWeddingPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !preWeddingPage) return;

    try {
      setIsUploadingPreWeddingPhotos(true);
      setPreWeddingPhotosUploadProgress(0);

      const uploadedPhotosList = [...(preWeddingPage.preWeddingPhotos || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Compress image first
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp'
        };
        const compressedFile = await imageCompression(file, options);

        const timestamp = Date.now();
        const firebasePath = `pre-wedding/photo_${timestamp}_${i}.webp`;
        const cloudinaryFileName = `photo_${timestamp}_${i}`;

        const result = await uploadMediaWithFallback(
          compressedFile, 
          firebasePath, 
          cloudinaryFileName, 
          'image'
        );

        const photoObj: { url: string; firebasePath?: string; cloudinaryPublicId?: string } = {
          url: result.url
        };
        if (result.firebasePath) photoObj.firebasePath = result.firebasePath;
        if (result.cloudinaryPublicId) photoObj.cloudinaryPublicId = result.cloudinaryPublicId;

        uploadedPhotosList.push(photoObj);

        setPreWeddingPhotosUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      await updatePage('pre-wedding-page', {
        ...preWeddingPage,
        preWeddingPhotos: uploadedPhotosList
      });

      alert('Fotos do pré-wedding enviadas com sucesso!');
    } catch (error: any) {
      console.error('Error uploading pre-wedding photos:', error);
      alert('Erro ao enviar fotos: ' + error.message);
    } finally {
      setIsUploadingPreWeddingPhotos(false);
      setPreWeddingPhotosUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeletePreWeddingPhoto = async (index: number) => {
    if (!preWeddingPage || !preWeddingPage.preWeddingPhotos) return;

    const photoToDelete = preWeddingPage.preWeddingPhotos[index];
    
    setConfirmModal({
      isOpen: true,
      message: 'Excluir esta foto do pré-wedding permanentemente?',
      onConfirm: async () => {
        try {
          // Delete from storage
          if (photoToDelete.firebasePath) {
            try {
              const storageRef = ref(storage, photoToDelete.firebasePath);
              await deleteObject(storageRef);
            } catch (err) {
              console.error('Failed to delete photo from Firebase Storage:', err);
            }
          }

          if (photoToDelete.cloudinaryPublicId) {
            try {
              await fetch('/api/storage/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId: photoToDelete.cloudinaryPublicId, resourceType: 'image' })
              });
            } catch (err) {
              console.error('Failed to delete photo from Cloudinary:', err);
            }
          }

          const updatedPhotos = preWeddingPage.preWeddingPhotos!.filter((_, i) => i !== index);
          await updatePage('pre-wedding-page', {
            ...preWeddingPage,
            preWeddingPhotos: updatedPhotos
          });

          alert('Foto excluída com sucesso!');
        } catch (error: any) {
          console.error('Error deleting pre-wedding photo:', error);
          alert('Erro ao excluir foto: ' + error.message);
        }
      }
    });
  };

  const handleUploadPreWeddingVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !preWeddingPage) return;

    try {
      setIsUploadingPreWeddingVideo(true);
      setPreWeddingVideoUploadProgress(10);

      const timestamp = Date.now();
      const firebasePath = `pre-wedding/video_${timestamp}.mp4`;
      const cloudinaryFileName = `video_${timestamp}`;

      setPreWeddingVideoUploadProgress(30);

      const result = await uploadMediaWithFallback(
        file, 
        firebasePath, 
        cloudinaryFileName, 
        'video'
      );

      setPreWeddingVideoUploadProgress(80);

      // Delete old video files if they exist
      const oldVideo = preWeddingPage.preWeddingVideo;
      if (oldVideo) {
        if (oldVideo.firebasePath) {
          try {
            await deleteObject(ref(storage, oldVideo.firebasePath));
          } catch (e) {
            console.error('Error deleting old video file from Firebase:', e);
          }
        }
        if (oldVideo.cloudinaryPublicId) {
          try {
            await fetch('/api/storage/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicId: oldVideo.cloudinaryPublicId, resourceType: 'video' })
            });
          } catch (e) {
            console.error('Error deleting old video file from Cloudinary:', e);
          }
        }
      }

      await updatePage('pre-wedding-page', {
        ...preWeddingPage,
        preWeddingVideo: {
          url: result.url,
          type: 'file',
          firebasePath: result.firebasePath,
          cloudinaryPublicId: result.cloudinaryPublicId
        }
      });

      setPreWeddingVideoUploadProgress(100);
      alert('Vídeo do pré-wedding enviado com sucesso!');
    } catch (error: any) {
      console.error('Error uploading pre-wedding video:', error);
      alert('Erro ao enviar vídeo: ' + error.message);
    } finally {
      setIsUploadingPreWeddingVideo(false);
      setPreWeddingVideoUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleSavePreWeddingVideoLink = async () => {
    if (!preWeddingPage || !preWeddingVideoUrlInput) return;

    try {
      const oldVideo = preWeddingPage.preWeddingVideo;
      if (oldVideo) {
        if (oldVideo.firebasePath) {
          try {
            await deleteObject(ref(storage, oldVideo.firebasePath));
          } catch (e) {
            console.error('Error deleting old video file from Firebase:', e);
          }
        }
        if (oldVideo.cloudinaryPublicId) {
          try {
            await fetch('/api/storage/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicId: oldVideo.cloudinaryPublicId, resourceType: 'video' })
            });
          } catch (e) {
            console.error('Error deleting old video file from Cloudinary:', e);
          }
        }
      }

      await updatePage('pre-wedding-page', {
        ...preWeddingPage,
        preWeddingVideo: {
          url: preWeddingVideoUrlInput,
          type: 'url'
        }
      });

      alert('Link do vídeo do pré-wedding salvo com sucesso!');
      setPreWeddingVideoUrlInput('');
    } catch (error: any) {
      console.error('Error saving video link:', error);
      alert('Erro ao salvar link do vídeo: ' + error.message);
    }
  };

  const handleDeletePreWeddingVideo = async () => {
    if (!preWeddingPage || !preWeddingPage.preWeddingVideo) return;

    const videoToDelete = preWeddingPage.preWeddingVideo;

    setConfirmModal({
      isOpen: true,
      message: 'Excluir o vídeo do pré-wedding permanentemente?',
      onConfirm: async () => {
        try {
          if (videoToDelete.firebasePath) {
            try {
              const storageRef = ref(storage, videoToDelete.firebasePath);
              await deleteObject(storageRef);
            } catch (err) {
              console.error('Failed to delete video from Firebase Storage:', err);
            }
          }

          if (videoToDelete.cloudinaryPublicId) {
            try {
              await fetch('/api/storage/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId: videoToDelete.cloudinaryPublicId, resourceType: 'video' })
              });
            } catch (err) {
              console.error('Failed to delete video from Cloudinary:', err);
            }
          }

          const updatedPage = { ...preWeddingPage };
          delete updatedPage.preWeddingVideo;

          await updatePage('pre-wedding-page', updatedPage);
          alert('Vídeo excluído com sucesso!');
        } catch (error: any) {
          console.error('Error deleting pre-wedding video:', error);
          alert('Erro ao excluir vídeo: ' + error.message);
        }
      }
    });
  };

  const updatePageVisibilityConfig = (page: any, role: 'public' | 'guest' | 'admin', newValue: boolean) => {
      const currentConfig = page.visibilityConfig || {
          public: page.isVisible,
          guest: page.isVisible,
          admin: true
      };
      
      const newConfig = {
          ...currentConfig,
          [role]: newValue
      };

      // Also auto-update legacy isVisible to keep it generally in sync
      const newIsVisible = newConfig.guest;
      
      updatePage(page.id, { visibilityConfig: newConfig, isVisible: newIsVisible });
  };

  const handleGeneratePage = async () => {
    const key = settings.geminiApiKey || process.env.API_KEY || '';
    if (!key) {
      alert("Por favor, insira uma API Key do Google Gemini válida.");
      return;
    }
    if (!aiTopic) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const generatedPage = await generatePageContent(aiTopic, pages, key);
      let slug = generatedPage.slug;
      if (!slug.startsWith('/')) slug = '/' + slug;
      if (pages.some(p => p.slug === slug)) {
         slug = slug + '-' + Date.now();
      }
      generatedPage.slug = slug;
      generatedPage.isVisible = true; 
      
      addPage(generatedPage);
      setAiTopic('');
      alert("Página gerada com sucesso!");
    } catch (err: any) {
      setGenerationError(err.message || "Falha ao gerar página");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAuthenticated) return null;

  const inputClass = "w-full p-2 border border-wedding-300 rounded bg-white text-wedding-900 placeholder-wedding-300 focus:ring-2 focus:ring-wedding-500 focus:border-wedding-500 transition-colors";
  const selectClass = "w-full p-2 pr-10 border border-wedding-300 rounded bg-white text-wedding-900 placeholder-wedding-300 focus:ring-2 focus:ring-wedding-500 focus:border-wedding-500 transition-colors cursor-pointer appearance-none bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20fill='none'%20viewBox='0%200%2024%2024'%20stroke='%234a3728'%20stroke-width='2'%3E%3Cpath%20stroke-linecap='round'%20stroke-linejoin='round'%20d='M19%209l-7%207-7-7'/%3E%3C/svg%3E\")] bg-[position:right_0.75rem_center] bg-[size:1.25em_1.25em] bg-no-repeat";

  return (
    <div className="min-h-screen bg-wedding-50 py-12 px-4 animate-fade-in">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden border border-wedding-200">
        
        {/* Header */}
        <div className="bg-wedding-800 text-white p-6 flex justify-between items-center">
          <div>
             <h1 className="font-serif text-3xl">Painel Administrativo</h1>
             <p className="text-xs text-wedding-200 mt-1">Olá, {settings.coupleName}</p>
          </div>
          <div className="flex gap-4 items-center">
             <button onClick={() => setConfirmModal({ isOpen: true, message: 'Resetar tudo para o padrão?', onConfirm: () => resetStore() })} className="text-xs bg-red-800 hover:bg-red-900 text-white/80 px-3 py-1 rounded transition">Resetar App</button>
             <button onClick={handleLogout} className="flex items-center gap-2 bg-wedding-600 hover:bg-wedding-700 px-4 py-2 rounded text-sm transition font-medium">
                <LogOut size={16} /> Sair
             </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-wedding-200 overflow-x-auto">
          {['general', 'guests', 'gifts', 'messages', 'pages', 'photos'].map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-4 font-serif text-lg transition-colors capitalize min-w-[120px] ${activeTab === tab ? 'bg-wedding-50 text-wedding-800 border-b-2 border-wedding-800' : 'text-wedding-400 hover:text-wedding-600'}`}
            >
                {tab === 'general' ? 'Geral' : tab === 'guests' ? 'Convidados' : tab === 'gifts' ? 'Presentes' : tab === 'messages' ? 'Recados' : tab === 'pages' ? 'Páginas' : 'Fotos'}
            </button>
          ))}
        </div>

        <div className="p-8">
          
          {/* GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              
              {/* Payment Settings */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                   <h3 className="text-xl font-serif text-wedding-800 mb-4 border-b border-wedding-200 pb-2">Pagamento (Pix & Links)</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-bold text-wedding-700 mb-2">Chave Pix</label>
                       <input 
                         type="text" 
                         value={settings.pixKey}
                         onChange={(e) => updateSettings({ pixKey: e.target.value })}
                         className={inputClass}
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-bold text-wedding-700 mb-2">Link de Pagamento (PicPay/MercadoPago)</label>
                       <input 
                         type="text" 
                         placeholder="https://..."
                         value={settings.paymentUrl || ''}
                         onChange={(e) => updateSettings({ paymentUrl: e.target.value })}
                         className={inputClass}
                       />
                       <p className="text-xs text-wedding-500 mt-1">Cole aqui seu link genérico de pagamento para quem quiser usar cartão.</p>
                     </div>
                   </div>
              </div>

              {/* Messages Visibility */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                 <h3 className="text-xl font-serif text-wedding-800 mb-4">Privacidade</h3>
                 <div className="flex items-center justify-between mb-6">
                     <div>
                         <p className="font-bold text-wedding-800">Mural de Recados Público</p>
                         <p className="text-sm text-wedding-600">Se ativo, qualquer pessoa poderá ver e ouvir os recados deixados no site.</p>
                     </div>
                     <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={!!settings.showMessagesToPublic}
                            onChange={(e) => updateSettings({ showMessagesToPublic: e.target.checked })}
                            className="w-5 h-5 accent-wedding-800"
                        />
                     </div>
                 </div>
                 <div className="border-t border-wedding-200 pt-6">
                     <div className="flex items-center justify-between mb-4">
                         <div>
                             <p className="font-bold text-wedding-800">Exigir Login Individual para Convidados</p>
                             <p className="text-sm text-wedding-600">Se ativo, cada convidado precisará do seu próprio usuário e senha (cadastrados na aba Convidados).</p>
                         </div>
                         <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={!!settings.requireGuestLogin}
                                onChange={(e) => updateSettings({ requireGuestLogin: e.target.checked })}
                                className="w-5 h-5 accent-wedding-800"
                            />
                         </div>
                     </div>

                     {!settings.requireGuestLogin && (
                       <div className="mt-4">
                           <label className="block text-sm font-bold text-wedding-700 mb-2">Senha do Site (Global)</label>
                           <input 
                               type="text" 
                               placeholder="Deixe em branco para site público"
                               value={settings.guestPassword || ''}
                               onChange={(e) => updateSettings({ guestPassword: e.target.value })}
                               className={inputClass}
                           />
                           <p className="text-xs text-wedding-500 mt-1">Se preenchido, os visitantes precisarão digitar esta senha única para ver o site.</p>
                       </div>
                     )}
                 </div>
              </div>

              {/* WhatsApp Message Templates */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                 <h3 className="text-xl font-serif text-wedding-800 mb-2 pb-2 border-b border-wedding-200">Modelos de Convite (WhatsApp)</h3>
                 <p className="text-sm text-wedding-600 mb-4">Configure mensagens personalizadas por categoria de convidado. Use as variáveis abaixo no seu texto para preencher automaticamente com os dados do convidado:</p>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                   <div className="bg-white p-2 rounded border border-wedding-100 text-center font-mono text-xs text-wedding-800">{"{nome}"} <span className="block text-[10px] text-gray-500 font-sans">Nome do Convidado</span></div>
                   <div className="bg-white p-2 rounded border border-wedding-100 text-center font-mono text-xs text-wedding-800">{"{usuario}"} <span className="block text-[10px] text-gray-500 font-sans">Login do Convidado</span></div>
                   <div className="bg-white p-2 rounded border border-wedding-100 text-center font-mono text-xs text-wedding-800">{"{senha}"} <span className="block text-[10px] text-gray-500 font-sans">Senha do Convidado</span></div>
                   <div className="bg-white p-2 rounded border border-wedding-100 text-center font-mono text-xs text-wedding-800">{"{categoria}"} <span className="block text-[10px] text-gray-500 font-sans">Categoria</span></div>
                 </div>

                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-bold text-wedding-700 mb-2">Selecione a Categoria para Editar</label>
                     <select
                       value={selectedTemplateCategory}
                       onChange={(e) => setSelectedTemplateCategory(e.target.value)}
                       className={selectClass}
                     >
                       {categoriesList.map(cat => (
                         <option key={cat} value={cat}>{cat}</option>
                       ))}
                     </select>
                   </div>

                   <div>
                     <div className="flex justify-between items-center mb-1">
                       <label className="block text-sm font-bold text-wedding-700">Texto do Convite para {selectedTemplateCategory}</label>
                       <button
                         type="button"
                         onClick={() => {
                           const defaultTpl = `Olá, {nome}! Tudo bem?\n\nGostaríamos de convidá-lo(a) para acessar o nosso site de casamento e confirmar sua presença.\n\nSua categoria: {categoria}\nUsuário de login: {usuario}\nSenha: {senha}\n\nPara acessar, entre no link: ${window.location.origin}\n\nEsperamos você!`;
                           handleSaveTemplate(selectedTemplateCategory, defaultTpl);
                         }}
                         className="text-xs text-wedding-800 hover:underline"
                       >
                         Resetar para o Padrão
                       </button>
                     </div>
                     <textarea
                       rows={6}
                       value={tempTemplateText}
                       onChange={(e) => setTempTemplateText(e.target.value)}
                       className={inputClass}
                       placeholder="Escreva a mensagem aqui..."
                     />
                   </div>

                   <div className="flex justify-end pt-2">
                     <button 
                       type="button"
                       onClick={() => handleSaveTemplate(selectedTemplateCategory, tempTemplateText)} 
                       className="bg-wedding-800 text-white px-6 py-2 rounded hover:bg-wedding-700 font-serif shadow-md flex items-center gap-2"
                     >
                       <Save size={16} /> Salvar Modelo para {selectedTemplateCategory}
                     </button>
                   </div>
                 </div>
              </div>

              {/* Basic Info (Existing) */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                 <h2 className="text-2xl font-serif text-wedding-800 mb-6 border-b border-wedding-200 pb-2">Informações Básicas</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <label className="block text-sm font-bold text-wedding-700 mb-2">Nome dos Noivos</label>
                    <input 
                        type="text" 
                        value={settings.coupleName}
                        onChange={(e) => updateSettings({ coupleName: e.target.value })}
                        className={inputClass}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-bold text-wedding-700 mb-2">Data</label>
                    <input 
                        type="text" 
                        value={settings.weddingDate}
                        onChange={(e) => updateSettings({ weddingDate: e.target.value })}
                        className={inputClass}
                    />
                    </div>
                    <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-wedding-700 mb-2">Local</label>
                    <input 
                        type="text" 
                        value={settings.weddingLocation}
                        onChange={(e) => updateSettings({ weddingLocation: e.target.value })}
                        className={inputClass}
                    />
                    </div>
                 </div>
              </div>

              {/* Loading Screen Settings (Existing) */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                 <h2 className="text-2xl font-serif text-wedding-800 mb-6 border-b border-wedding-200 pb-2">Tela de Carregamento</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-wedding-700 mb-2">Título do Loading</label>
                      <input 
                          type="text" 
                          value={settings.loadingTitle || ''}
                          onChange={(e) => updateSettings({ loadingTitle: e.target.value })}
                          className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-wedding-700 mb-2">Subtítulo</label>
                      <input 
                          type="text" 
                          value={settings.loadingSubtitle || ''}
                          onChange={(e) => updateSettings({ loadingSubtitle: e.target.value })}
                          className={inputClass}
                      />
                    </div>
                 </div>
              </div>

              {/* Home Page Hero Edit (Existing) */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                 <h2 className="text-2xl font-serif text-wedding-800 mb-6 border-b border-wedding-200 pb-2">Capa do Site</h2>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-wedding-700 mb-2">Título Principal</label>
                        <input 
                           type="text"
                           value={homeHero.title || ''}
                           onChange={(e) => setHomeHero({...homeHero, title: e.target.value})}
                           className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-wedding-700 mb-2">Subtítulo / Texto</label>
                        <input 
                           type="text"
                           value={homeHero.content || ''}
                           onChange={(e) => setHomeHero({...homeHero, content: e.target.value})}
                           className={inputClass}
                        />
                    </div>
                    <div className="pt-2">
                         <label className="block text-sm font-bold text-wedding-700 mb-2">Fotos do Banner (Carrossel)</label>
                         
                         {/* Banner Images List */}
                         <div className="space-y-3 mb-4">
                             {homeHero.bannerImages && homeHero.bannerImages.length > 0 ? (
                                 homeHero.bannerImages.map((bImg, idx) => (
                                     <div key={bImg.id || idx} className="bg-white p-3 rounded-xl border border-wedding-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                         {/* Preview Thumbnails */}
                                         <div className="flex items-center gap-4 flex-1 min-w-0">
                                             <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 shrink-0">
                                                 {/* Landscape Preview */}
                                                 <div className="text-center">
                                                     <span className="text-[10px] text-gray-400 block mb-1 font-semibold uppercase">Deitado</span>
                                                     <img 
                                                         src={bImg.landscapeUrl || bImg.url} 
                                                         alt="Desktop Banner" 
                                                         className={`w-16 h-10 object-cover rounded border border-gray-200 ${
                                                             bImg.verticalAlign === 'top' ? 'object-top' : bImg.verticalAlign === 'bottom' ? 'object-bottom' : 'object-center'
                                                         }`} 
                                                     />
                                                 </div>
                                                 {/* Portrait Preview */}
                                                 <div className="text-center">
                                                     <span className="text-[10px] text-gray-400 block mb-1 font-semibold uppercase">Em pé</span>
                                                     <img 
                                                         src={bImg.portraitUrl || bImg.url} 
                                                         alt="Mobile Banner" 
                                                         className={`w-8 h-10 object-cover rounded border border-gray-200 ${
                                                             bImg.verticalAlign === 'top' ? 'object-top' : bImg.verticalAlign === 'bottom' ? 'object-bottom' : 'object-center'
                                                         }`} 
                                                     />
                                                 </div>
                                             </div>
                                             
                                             <div className="truncate flex-grow">
                                                 <p className="text-xs font-semibold text-wedding-800 truncate mb-0.5">Imagem {idx + 1}</p>
                                                 <span className="text-[10px] text-gray-400 font-mono block truncate mb-2" title={bImg.url}>{bImg.url}</span>
                                                 
                                                 {/* Vertical Alignment Selector */}
                                                 <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-1">
                                                     <span className="text-[9px] text-wedding-600 font-bold uppercase tracking-wider">Alinhamento vertical:</span>
                                                     <div className="inline-flex bg-wedding-50 p-0.5 rounded-md border border-wedding-100 w-fit">
                                                         <button
                                                             type="button"
                                                             onClick={() => {
                                                                 const updated = [...(homeHero.bannerImages || [])];
                                                                 updated[idx] = { ...updated[idx], verticalAlign: 'top' };
                                                                 setHomeHero({ ...homeHero, bannerImages: updated });
                                                             }}
                                                             className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
                                                                 bImg.verticalAlign === 'top' 
                                                                     ? 'bg-wedding-800 text-white shadow-sm' 
                                                                     : 'text-wedding-700 hover:bg-wedding-100'
                                                             }`}
                                                         >
                                                             Topo
                                                         </button>
                                                         <button
                                                             type="button"
                                                             onClick={() => {
                                                                 const updated = [...(homeHero.bannerImages || [])];
                                                                 updated[idx] = { ...updated[idx], verticalAlign: 'center' };
                                                                 setHomeHero({ ...homeHero, bannerImages: updated });
                                                             }}
                                                             className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
                                                                 (!bImg.verticalAlign || bImg.verticalAlign === 'center') 
                                                                     ? 'bg-wedding-800 text-white shadow-sm' 
                                                                     : 'text-wedding-700 hover:bg-wedding-100'
                                                             }`}
                                                         >
                                                             Centro
                                                         </button>
                                                         <button
                                                             type="button"
                                                             onClick={() => {
                                                                 const updated = [...(homeHero.bannerImages || [])];
                                                                 updated[idx] = { ...updated[idx], verticalAlign: 'bottom' };
                                                                 setHomeHero({ ...homeHero, bannerImages: updated });
                                                             }}
                                                             className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
                                                                 bImg.verticalAlign === 'bottom' 
                                                                     ? 'bg-wedding-800 text-white shadow-sm' 
                                                                     : 'text-wedding-700 hover:bg-wedding-100'
                                                             }`}
                                                         >
                                                             Base
                                                         </button>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                         
                                         {/* Action Buttons for this item */}
                                         <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
                                             <button 
                                                 type="button"
                                                 onClick={() => handleEditExistingBannerCrop(idx)}
                                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-wedding-50 text-wedding-800 hover:bg-wedding-100 rounded-lg text-xs font-semibold transition-colors border border-wedding-200"
                                             >
                                                 <Crop size={14} /> Recortar / Ajustar
                                             </button>
                                             <button 
                                                 type="button"
                                                 onClick={() => removeHeroImage(idx)}
                                                 className="flex items-center justify-center p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                 title="Remover foto"
                                             >
                                                 <Trash2 size={16} />
                                             </button>
                                         </div>
                                     </div>
                                 ))
                             ) : (
                                 <div className="text-center py-6 border border-dashed border-wedding-200 bg-wedding-50/20 rounded-xl text-wedding-600 italic text-sm">
                                     Nenhuma imagem no carrossel. Adicione uma abaixo.
                                 </div>
                             )}
                         </div>

                         {/* Upload and URL controls */}
                         <div className="space-y-3 p-4 bg-wedding-50/30 rounded-xl border border-wedding-100">
                             <span className="text-xs font-bold text-wedding-800 block">Adicionar Nova Foto ao Banner:</span>
                             
                             <div className="flex flex-col md:flex-row gap-3">
                                 {/* Direct File Upload button */}
                                 <div className="flex-1">
                                     <label className="flex items-center justify-center gap-2 px-4 py-2 bg-wedding-100 hover:bg-wedding-200 text-wedding-800 rounded-lg cursor-pointer transition-colors border border-wedding-300 font-semibold text-sm w-full h-full text-center min-h-[42px]">
                                         <Upload size={16} />
                                         {isBannerUploading ? 'Carregando...' : 'Escolher Arquivo do Computador'}
                                         <input 
                                             type="file" 
                                             accept="image/*" 
                                             onChange={handleBannerFileChange} 
                                             disabled={isBannerUploading}
                                             className="hidden" 
                                         />
                                     </label>
                                 </div>
                                 
                                 {/* Manual URL Input */}
                                 <div className="flex-[1.5] flex gap-2">
                                     <input 
                                         type="text"
                                         placeholder="Ou cole o link/URL de uma foto aqui"
                                         value={newHeroImageUrl}
                                         onChange={(e) => setNewHeroImageUrl(e.target.value)}
                                         className={inputClass}
                                     />
                                     <button 
                                         type="button"
                                         onClick={addHeroImage} 
                                         className="bg-wedding-600 hover:bg-wedding-700 text-white px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                                     >
                                         <Plus size={18} />
                                     </button>
                                 </div>
                             </div>
                             
                             <p className="text-[10px] text-gray-500 italic">
                                 * Fazer upload direto do seu arquivo abrirá a ferramenta de recorte para ajustar os tamanhos para computador e celular automaticamente.
                             </p>
                         </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleUpdateHomeHero} className="bg-wedding-800 text-white px-6 py-2 rounded hover:bg-wedding-700 font-serif shadow-md flex items-center gap-2">
                            <Save size={16} /> Salvar Capa
                        </button>
                    </div>
                 </div>
              </div>

              {/* Home Page Story Edit */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                 <h2 className="text-2xl font-serif text-wedding-800 mb-6 border-b border-wedding-200 pb-2">Como Tudo Começou</h2>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-wedding-700 mb-2">Título</label>
                        <input 
                           type="text"
                           value={homeStory.title || ''}
                           onChange={(e) => setHomeStory({...homeStory, title: e.target.value})}
                           className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-wedding-700 mb-2">Texto</label>
                        <textarea 
                           rows={6}
                           value={homeStory.content || ''}
                           onChange={(e) => setHomeStory({...homeStory, content: e.target.value})}
                           className={inputClass}
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleUpdateHomeStory} className="bg-wedding-800 text-white px-6 py-2 rounded hover:bg-wedding-700 font-serif shadow-md flex items-center gap-2">
                            <Save size={16} /> Salvar Seção
                        </button>
                    </div>
                 </div>
              </div>

              {/* Home Page Location Edit */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                 <h2 className="text-2xl font-serif text-wedding-800 mb-6 border-b border-wedding-200 pb-2">Local da Festa (Mapa)</h2>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-wedding-700 mb-2">Título</label>
                        <input 
                           type="text"
                           value={homeLocation.title || ''}
                           onChange={(e) => setHomeLocation({...homeLocation, title: e.target.value})}
                           className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-wedding-700 mb-2">Texto / Descrição</label>
                        <input 
                           type="text"
                           value={homeLocation.content || ''}
                           onChange={(e) => setHomeLocation({...homeLocation, content: e.target.value})}
                           className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-wedding-700 mb-2">Endereço Completo</label>
                        <input 
                           type="text"
                           value={homeLocation.locationDetails?.address || ''}
                           onChange={(e) => setHomeLocation({...homeLocation, locationDetails: { ...homeLocation.locationDetails, address: e.target.value } as any})}
                           className={inputClass}
                           placeholder="Ex: Av. Paulista, 1578 - Bela Vista, São Paulo - SP"
                        />
                        <p className="text-xs text-wedding-500 mt-1">Este endereço será usado para gerar os links do Waze, Uber, 99 e Google Maps.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-wedding-700 mb-2">Link do Google Maps (Opcional)</label>
                        <input 
                           type="text"
                           value={homeLocation.locationDetails?.mapUrl || ''}
                           onChange={(e) => setHomeLocation({...homeLocation, locationDetails: { ...homeLocation.locationDetails, mapUrl: e.target.value } as any})}
                           className={inputClass}
                           placeholder="Ex: https://maps.app.goo.gl/..."
                        />
                        <p className="text-xs text-wedding-500 mt-1">Cole o link curto de compartilhamento do Google Maps. Se deixado em branco, o site usará o endereço acima para buscar o local.</p>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleUpdateHomeLocation} className="bg-wedding-800 text-white px-6 py-2 rounded hover:bg-wedding-700 font-serif shadow-md flex items-center gap-2">
                            <Save size={16} /> Salvar Local
                        </button>
                    </div>
                 </div>
              </div>
              
              {/* API Key */}
              <div className="bg-wedding-50/50 p-6 rounded border border-wedding-200">
                 <label className="block text-sm font-bold text-wedding-700 mb-2">Gemini API Key (para IA)</label>
                 <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={settings.geminiApiKey || ''}
                      onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                      className={inputClass}
                      placeholder="Insira sua chave da API Gemini"
                    />
                 </div>
                 <p className="text-xs text-wedding-500 mt-2">
                   Esta chave é necessária para gerar novas páginas e prévias de trajes com IA. 
                   Você pode obter uma gratuitamente no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-wedding-800 underline">Google AI Studio</a>.
                 </p>
              </div>
            </div>
          )}

          {/* GUESTS MANAGEMENT */}
          {activeTab === 'guests' && (
            <div className="space-y-8">
              {/* Add/Edit Form */}
              <div className="bg-wedding-50 p-6 rounded border border-wedding-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-serif text-wedding-800 flex items-center gap-2">
                    {editingGuestId ? <Edit2 size={20} /> : <Plus size={20} />} 
                    {editingGuestId ? 'Editar Convidado' : 'Adicionar Novo Convidado'}
                  </h3>
                </div>
                <form onSubmit={handleGuestSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Nome</label>
                    <input 
                      required
                      type="text"
                      value={newGuest.name}
                      onChange={e => setNewGuest({...newGuest, name: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Usuário de Login</label>
                    <input 
                      required
                      type="text"
                      value={newGuest.username}
                      onChange={e => setNewGuest({...newGuest, username: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Senha (Opcional)</label>
                    <input 
                      type="text"
                      value={newGuest.password}
                      onChange={e => setNewGuest({...newGuest, password: e.target.value})}
                      className={inputClass}
                      placeholder="Deixe em branco para sem senha"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Categoria</label>
                    <select
                      value={newGuest.category || 'Comum'}
                      onChange={e => setNewGuest({...newGuest, category: e.target.value as any})}
                      className={selectClass}
                    >
                      <option value="Comum">Comum</option>
                      <option value="Padrinho">Padrinho</option>
                      <option value="Madrinha">Madrinha</option>
                      <option value="Padrinhos">Padrinhos (Casal)</option>
                      <option value="Madrinhas">Madrinhas (Casal)</option>
                      <option value="Demoiselle">Demoiselle</option>
                      <option value="Mãe da Noiva">Mãe da Noiva</option>
                      <option value="Pai da Noiva">Pai da Noiva</option>
                      <option value="Pais da Noiva">Pais da Noiva</option>
                      <option value="Mãe do Noivo">Mãe do Noivo</option>
                      <option value="Pai do Noivo">Pai do Noivo</option>
                      <option value="Pais do Noivo">Pais do Noivo</option>
                      <option value="Noivo">Noivo</option>
                      <option value="Noiva">Noiva</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Sexo / Tipo</label>
                    <select
                      value={newGuest.gender || 'M'}
                      onChange={e => setNewGuest({...newGuest, gender: e.target.value as any})}
                      className={selectClass}
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Couple">Casal / Dupla</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">País</label>
                    <select
                      value={newGuest.countryCode || 'BR'}
                      onChange={handleCountryChange}
                      className={selectClass}
                    >
                      <option value="">Selecione o País</option>
                      {countries.map(c => (
                        <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Estado/Província</label>
                    <select
                      value={newGuest.stateCode || ''}
                      onChange={handleStateChange}
                      className={selectClass}
                      disabled={!newGuest.countryCode || states.length === 0}
                    >
                      <option value="">Selecione o Estado</option>
                      {states.map(s => (
                        <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Cidade</label>
                    {cities.length > 0 ? (
                      <select
                        value={newGuest.city || ''}
                        onChange={handleCityChange}
                        className={inputClass}
                        disabled={!newGuest.stateCode}
                      >
                        <option value="">Selecione a Cidade</option>
                        {cities.map(c => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text"
                        value={newGuest.city || ''}
                        onChange={e => setNewGuest({...newGuest, city: e.target.value})}
                        className={inputClass}
                        placeholder="Digite a Cidade"
                        disabled={!newGuest.countryCode}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Telefone</label>
                    <input 
                      type="text"
                      value={newGuest.phone || ''}
                      onChange={handlePhoneChange}
                      className={inputClass}
                      placeholder="+55 (00) 0 0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Email</label>
                    <input 
                      type="email"
                      value={newGuest.email || ''}
                      onChange={e => setNewGuest({...newGuest, email: e.target.value})}
                      className={inputClass}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Status Confirmação (RSVP)</label>
                    <select
                      value={newGuest.rsvpStatus || 'pending'}
                      onChange={e => setNewGuest({...newGuest, rsvpStatus: e.target.value as any})}
                      className={inputClass}
                    >
                      <option value="pending">Pendente</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="declined">Não irá</option>
                    </select>
                  </div>
                  <div className="flex gap-2 md:col-span-3">
                     <button type="submit" className="bg-wedding-800 text-white p-2 rounded hover:bg-wedding-700 font-serif h-[42px] flex-1">
                        {editingGuestId ? 'Atualizar' : 'Adicionar'}
                     </button>
                     {editingGuestId && (
                         <button type="button" onClick={cancelEditGuest} className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 font-serif h-[42px]">
                            Cancelar
                         </button>
                     )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-wedding-200">
                  <thead className="bg-wedding-100">
                    <tr>
                      <th onClick={() => handleSort('name')} className="cursor-pointer hover:bg-wedding-200 px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider select-none">Nome {sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('category')} className="cursor-pointer hover:bg-wedding-200 px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider select-none">Categoria {sortColumn === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('phone')} className="cursor-pointer hover:bg-wedding-200 px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider select-none">Contato {sortColumn === 'phone' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('username')} className="cursor-pointer hover:bg-wedding-200 px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider select-none">Login/Senha {sortColumn === 'username' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('gender')} className="cursor-pointer hover:bg-wedding-200 px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider select-none">Sexo {sortColumn === 'gender' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={() => handleSort('rsvpStatus')} className="cursor-pointer hover:bg-wedding-200 px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider select-none">RSVP {sortColumn === 'rsvpStatus' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-wedding-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-wedding-200">
                    {sortedGuests.map(guest => (
                      <tr key={guest.id} className={editingGuestId === guest.id ? "bg-wedding-50" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-wedding-900">
                          <div className="flex items-center gap-2">
                            <span>{guest.name}</span>
                            <button
                              type="button"
                              onClick={() => handleOpenWaModal(guest)}
                              className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 p-1.5 rounded-full transition-colors flex items-center justify-center shrink-0"
                              title="Enviar convite por WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-wedding-600">
                          <span className={`px-2 py-1 rounded-full text-xs ${guest.category && guest.category !== 'Comum' ? 'bg-wedding-100 text-wedding-800 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                            {guest.category || 'Comum'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-wedding-600">
                          {guest.phone && <div className="text-xs">{guest.phone}</div>}
                          {guest.email && <div className="text-xs text-gray-500">{guest.email}</div>}
                          {!guest.phone && !guest.email && <span className="text-gray-400 italic text-xs">Sem contato</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-wedding-600">
                          <div className="font-mono text-xs">{guest.username}</div>
                          <div className="text-xs text-gray-500">{guest.password || <span className="text-gray-400 italic">Sem senha</span>}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-wedding-600">
                          {guest.gender === 'M' ? 'Masc' : guest.gender === 'F' ? 'Fem' : 'Casal'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {guest.rsvpStatus === 'confirmed' && <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={14}/> Confirmado</span>}
                          {guest.rsvpStatus === 'declined' && <span className="text-red-500 font-bold flex items-center gap-1"><X size={14}/> Não irá</span>}
                          {(!guest.rsvpStatus || guest.rsvpStatus === 'pending') && <span className="text-yellow-600 flex items-center gap-1"><Clock size={14}/> Pendente</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                          <button onClick={() => handleEditGuest(guest)} className="text-blue-500 hover:text-blue-700" title="Editar">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => setConfirmModal({ isOpen: true, message: `Excluir convidado "${guest.name}"?`, onConfirm: () => removeGuest(guest.id) })} className="text-red-500 hover:text-red-700" title="Excluir">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GIFTS MANAGEMENT */}
          {activeTab === 'gifts' && (
            <div className="space-y-8">
              {/* Add/Edit Form */}
              <div className="bg-wedding-50 p-6 rounded border border-wedding-200">
                <h3 className="text-lg font-serif text-wedding-800 mb-4 flex items-center gap-2">
                  {editingGiftId ? <Edit2 size={20} /> : <Plus size={20} />} 
                  {editingGiftId ? 'Editar Presente' : 'Adicionar Novo Presente'}
                </h3>
                <form onSubmit={handleGiftSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Nome</label>
                    <input 
                      required
                      type="text"
                      value={newGift.name}
                      onChange={e => setNewGift({...newGift, name: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Preço (R$)</label>
                    <input 
                      required
                      type="number"
                      value={newGift.price || ''}
                      onChange={e => setNewGift({...newGift, price: parseFloat(e.target.value)})}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">URL da Imagem</label>
                    <input 
                      type="text"
                      value={newGift.imageUrl}
                      onChange={e => setNewGift({...newGift, imageUrl: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Link (Loja Externa)</label>
                    <input 
                      type="text"
                      value={newGift.externalLink || ''}
                      onChange={e => setNewGift({...newGift, externalLink: e.target.value})}
                      className={inputClass}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Ordem (Posição)</label>
                    <input 
                      type="number"
                      value={newGift.order !== undefined ? newGift.order : ''}
                      onChange={e => setNewGift({...newGift, order: e.target.value !== '' ? Number(e.target.value) : undefined})}
                      className={inputClass}
                      placeholder="Ex: 0, 1, 2..."
                    />
                  </div>
                  <div className="md:col-span-5">
                     <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Descrição</label>
                     <input 
                      type="text"
                      value={newGift.description}
                      onChange={e => setNewGift({...newGift, description: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                  {editingGiftId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-5 mt-2">
                      <div>
                        <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Status do Presente</label>
                        <select
                          value={newGift.status || 'available'}
                          onChange={e => setNewGift({...newGift, status: e.target.value as any})}
                          className={selectClass}
                        >
                          <option value="available">Disponível</option>
                          <option value="pending">Aguardando Pagamento / Pendente</option>
                          <option value="confirmed">Pago / Confirmado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Comprador Geral (Nome)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <select
                            value={selectedGuestIdForGiftForm}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedGuestIdForGiftForm(val);
                              if (val === '') {
                                setNewGift({...newGift, buyerName: ''});
                              } else if (val !== 'custom') {
                                const g = guests.find(guest => guest.id === val);
                                setNewGift({...newGift, buyerName: g ? g.name : ''});
                              }
                            }}
                            className={selectClass}
                          >
                            <option value="">Selecione um convidado...</option>
                            {guests.map(g => (
                              <option key={g.id} value={g.id}>{g.name} ({g.category || 'Comum'})</option>
                            ))}
                            <option value="custom">Outro (Digitar Nome...)</option>
                          </select>
                          {(selectedGuestIdForGiftForm === 'custom' || !selectedGuestIdForGiftForm) && (
                            <input 
                              type="text"
                              value={newGift.buyerName || ''}
                              onChange={e => setNewGift({...newGift, buyerName: e.target.value})}
                              className={inputClass}
                              placeholder="Nome do comprador geral..."
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 md:col-span-5 mt-2">
                     <button type="submit" className="bg-wedding-800 text-white p-2 rounded hover:bg-wedding-700 font-serif h-[42px] flex-1">
                        {editingGiftId ? 'Atualizar' : 'Adicionar'}
                     </button>
                     {editingGiftId && (
                          <button type="button" onClick={cancelEditGift} className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 font-serif h-[42px]">
                             Cancelar
                          </button>
                     )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-wedding-200">
                  <thead className="bg-wedding-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider">Presente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-wedding-600 uppercase tracking-wider">Quem Comprou?</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-wedding-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-wedding-200">
                    {gifts.map(gift => (
                      <React.Fragment key={gift.id}>
                        <tr className={editingGiftId === gift.id ? "bg-wedding-50" : ""}>
                          <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                            <img src={gift.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                            <div>
                                <div className="text-sm font-medium text-wedding-900">{gift.name}</div>
                                <div className="text-xs text-wedding-500">R$ {gift.price}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                              {gift.status === 'confirmed' && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">Pago</span>}
                              {gift.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold animate-pulse">Aguardando</span>}
                              {gift.status === 'available' && <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Disponível</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-wedding-800 font-bold">{gift.buyerName || '-'}</div>
                              <button 
                                onClick={() => {
                                  setExpandedGiftId(gift.id);
                                  // Pre-populate default remaining amount for convenience
                                  const totalArrecadado = gift.contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
                                  const remaining = Math.max(0, gift.price - totalArrecadado);
                                  setNewContributionAmount(remaining > 0 ? remaining : gift.price);
                                  setSelectedGuestIdForGift('');
                                  setCustomContributorName('');
                                  setNewContributionStatus('pending');
                                }}
                                className="text-xs text-wedding-700 hover:text-wedding-950 underline font-medium mt-1 flex items-center gap-1 cursor-pointer"
                              >
                                Gerenciar Contribuições ({gift.contributions?.length || 0})
                              </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                            <button onClick={() => handleEditGift(gift)} className="text-blue-500 hover:text-blue-700" title="Editar">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => setConfirmModal({ isOpen: true, message: `Excluir o presente "${gift.name}"?`, onConfirm: () => removeGift(gift.id) })} className="text-red-500 hover:text-red-700" title="Excluir">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MESSAGES TAB (NEW) */}
          {activeTab === 'messages' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {messages.length === 0 && <p className="text-gray-500 col-span-3 text-center">Nenhum recado ainda.</p>}
                  {messages.map(msg => (
                      <div key={msg.id} className={`bg-white border ${msg.status === 'pending' ? 'border-yellow-400 shadow-yellow-100' : 'border-wedding-200'} rounded p-4 relative`}>
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h4 className="font-bold text-wedding-800 flex items-center gap-2">
                                    {msg.author}
                                    {msg.status === 'pending' && (
                                      <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full uppercase">Pendente</span>
                                    )}
                                  </h4>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock size={10} /> {new Date(msg.createdAt).toLocaleDateString()}
                                  </span>
                              </div>
                              <div className="flex gap-2">
                                  {msg.status === 'pending' && (
                                      <button onClick={() => updateMessageStatus(msg.id, 'approved')} className="text-green-500 hover:text-green-700" title="Aprovar">
                                          <CheckCircle size={16} />
                                      </button>
                                  )}
                                  <button onClick={() => setConfirmModal({ isOpen: true, message: 'Apagar mensagem?', onConfirm: () => deleteMessage(msg.id) })} className="text-red-400 hover:text-red-600" title="Excluir">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                          <div className={`rounded overflow-hidden ${msg.type === 'text' ? 'bg-wedding-50 p-4' : 'bg-gray-100'}`}>
                              {(msg.type === 'video' || msg.type === 'video+text') && (
                                  <video src={msg.content} controls className="w-full h-40 object-cover mb-2" />
                              )}
                              {(msg.type === 'audio' || msg.type === 'audio+text') && (
                                  <div className="p-4 flex items-center justify-center mb-2">
                                      <audio src={msg.content} controls className="w-full" />
                                  </div>
                              )}
                              {(msg.type === 'text' || msg.type === 'audio+text' || msg.type === 'video+text') && (msg.textContent || (msg.type === 'text' && msg.content)) && (
                                  <div 
                                      className="text-wedding-700 italic text-sm p-2 bg-white rounded"
                                      dangerouslySetInnerHTML={{ __html: (msg.textContent || msg.content).replace(/\n/g, '<br/>') }}
                                  />
                              )}
                          </div>
                          {msg.giftId && (
                              <div className="mt-2 text-xs text-wedding-500 bg-wedding-50 p-1 rounded">
                                  Enviado com presente
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          )}

          {/* PHOTOS MANAGEMENT */}
          {activeTab === 'photos' && (
            <div className="space-y-8">
              <div className="bg-wedding-50 p-6 rounded border border-wedding-200">
                <h3 className="text-xl font-serif text-wedding-800 mb-6 border-b border-wedding-200 pb-2">Aprovação de Fotos</h3>
                
                {photos.length === 0 ? (
                    <p className="text-wedding-600 italic">Nenhuma foto enviada ainda.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {photos.map(photo => (
                            <div key={photo.id} className="bg-white rounded shadow-sm border border-wedding-200 overflow-hidden flex flex-col">
                                <div className="h-48 bg-gray-100 relative">
                                    <img src={photo.url} alt="Enviada" className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        {photo.status === 'pending' && (
                                            <button 
                                                onClick={() => updatePhotoStatus(photo.id, 'approved')}
                                                className="bg-green-500 text-white p-1.5 rounded-full hover:bg-green-600 shadow"
                                                title="Aprovar"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setConfirmModal({ isOpen: true, message: 'Excluir esta foto permanentemente?', onConfirm: () => deletePhoto(photo.id) })}
                                            className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-wedding-800 mb-1">Enviado por: {photo.uploaderName}</p>
                                        <p className="text-xs text-wedding-500 mb-2">
                                            {new Date(photo.createdAt).toLocaleDateString('pt-BR')} às {new Date(photo.createdAt).toLocaleTimeString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="mt-2 flex flex-col gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full w-fit ${photo.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {photo.status === 'approved' ? 'Aprovada' : 'Pendente'}
                                        </span>
                                        {photo.deletionRequest && (
                                            <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                                                <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                                                    <Trash2 size={12} /> Solicitação de Exclusão
                                                </p>
                                                <p className="text-xs text-red-600 mt-1 italic">
                                                    "{photo.deletionRequest.reason}"
                                                </p>
                                                <div className="flex gap-2 mt-2 justify-end">
                                                    <button 
                                                        onClick={() => setConfirmModal({ isOpen: true, message: 'Rejeitar solicitação de exclusão?', onConfirm: () => rejectPhotoDeletion(photo.id) })}
                                                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                                                    >
                                                        Rejeitar
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmModal({ isOpen: true, message: 'Aprovar exclusão e apagar foto?', onConfirm: () => deletePhoto(photo.id) })}
                                                        className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                                    >
                                                        Apagar Foto
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>

              {/* SEÇÃO PRÉ-WEDDING */}
              <div className="bg-wedding-50 p-6 rounded border border-wedding-200 mt-8">
                <h3 className="text-xl font-serif text-wedding-800 mb-6 border-b border-wedding-200 pb-2 flex items-center gap-2">
                  <ImageIcon size={20} /> Fotos e Vídeo do Pré-Wedding
                </h3>
                
                {/* 1. VÍDEO DO PRÉ-WEDDING */}
                <div className="bg-white p-5 rounded border border-wedding-200 mb-8">
                  <h4 className="font-bold text-wedding-800 mb-4 flex items-center gap-2">
                    <Video size={18} /> Vídeo de Pré-Wedding
                  </h4>
                  <p className="text-xs text-wedding-600 mb-4">
                    Adicione um vídeo de destaque do ensaio pré-wedding. Ele aparecerá no início da página pré-wedding e será reproduzível pelos convidados.
                  </p>
                  
                  {preWeddingPage?.preWeddingVideo ? (
                    <div className="bg-wedding-50 p-4 rounded border border-wedding-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-wedding-200 text-wedding-800 mr-2 uppercase">
                          {preWeddingPage.preWeddingVideo.type === 'file' ? 'Arquivo Local' : 'Link Web'}
                        </span>
                        <a 
                          href={preWeddingPage.preWeddingVideo.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-sm text-wedding-600 hover:underline break-all"
                        >
                          {preWeddingPage.preWeddingVideo.url}
                        </a>
                      </div>
                      <button
                        onClick={handleDeletePreWeddingVideo}
                        className="bg-red-500 text-white hover:bg-red-600 px-3 py-1.5 rounded text-sm flex items-center gap-1.5 self-start md:self-auto shrink-0 transition-colors"
                      >
                        <Trash2 size={14} /> Remover Vídeo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-4 border-b border-wedding-100 pb-2">
                        <button
                          type="button"
                          onClick={() => setPreWeddingVideoSourceType('url')}
                          className={`text-sm pb-1 border-b-2 font-medium ${preWeddingVideoSourceType === 'url' ? 'border-wedding-800 text-wedding-800' : 'border-transparent text-wedding-400'}`}
                        >
                          Colar Link (YouTube, Vimeo, Drive, etc.)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreWeddingVideoSourceType('file')}
                          className={`text-sm pb-1 border-b-2 font-medium ${preWeddingVideoSourceType === 'file' ? 'border-wedding-800 text-wedding-800' : 'border-transparent text-wedding-400'}`}
                        >
                          Subir Arquivo de Vídeo
                        </button>
                      </div>

                      {preWeddingVideoSourceType === 'url' ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Ex: https://www.youtube.com/watch?v=..."
                            value={preWeddingVideoUrlInput}
                            onChange={(e) => setPreWeddingVideoUrlInput(e.target.value)}
                            className="flex-1 border border-wedding-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wedding-800 text-wedding-900"
                          />
                          <button
                            onClick={handleSavePreWeddingVideoLink}
                            disabled={!preWeddingVideoUrlInput}
                            className="bg-wedding-800 text-white hover:bg-wedding-700 px-4 py-2 rounded text-sm font-serif transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Salvar Link
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center border-2 border-dashed border-wedding-200 rounded-lg p-6 bg-wedding-50">
                            {isUploadingPreWeddingVideo ? (
                              <div className="text-center">
                                <Loader2 className="animate-spin text-wedding-800 mx-auto mb-2" size={24} />
                                <p className="text-sm text-wedding-800 font-medium">Enviando vídeo ({preWeddingVideoUploadProgress}%)</p>
                                <div className="w-48 bg-wedding-200 rounded-full h-2 mt-2 mx-auto overflow-hidden">
                                  <div className="bg-wedding-800 h-2 rounded-full transition-all duration-300" style={{ width: `${preWeddingVideoUploadProgress}%` }}></div>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer text-center">
                                <Video className="mx-auto text-wedding-400 mb-2" size={32} />
                                <span className="text-sm font-semibold text-wedding-800 block hover:underline">Selecione um arquivo de vídeo</span>
                                <span className="text-xs text-wedding-500 block mt-1">Formatos sugeridos: .mp4, .mov, .webm</span>
                                <input
                                  type="file"
                                  accept="video/*"
                                  onChange={handleUploadPreWeddingVideoFile}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. FOTOS DO PRÉ-WEDDING */}
                <div className="bg-white p-5 rounded border border-wedding-200">
                  <h4 className="font-bold text-wedding-800 mb-4 flex items-center gap-2">
                    <ImageIcon size={18} /> Fotos do Ensaio
                  </h4>
                  
                  <div className="mb-6">
                    {isUploadingPreWeddingPhotos ? (
                      <div className="bg-wedding-50 p-6 rounded-lg border border-dashed border-wedding-300 text-center">
                        <Loader2 className="animate-spin text-wedding-800 mx-auto mb-2" size={24} />
                        <p className="text-sm text-wedding-800 font-semibold">Enviando e comprimindo fotos ({preWeddingPhotosUploadProgress}%)</p>
                        <div className="w-64 bg-wedding-200 rounded-full h-2.5 mt-2 mx-auto overflow-hidden">
                          <div className="bg-wedding-800 h-2.5 rounded-full transition-all duration-300" style={{ width: `${preWeddingPhotosUploadProgress}%` }}></div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-wedding-200 rounded-lg p-8 bg-wedding-50 hover:bg-wedding-100 cursor-pointer transition-colors">
                        <Upload className="text-wedding-400 mb-2" size={32} />
                        <span className="text-sm font-bold text-wedding-800 block">Enviar Fotos do Pré-Wedding</span>
                        <span className="text-xs text-wedding-500 mt-1 block text-center max-w-md">
                          Você pode selecionar múltiplos arquivos simultaneamente. As imagens serão comprimidas automaticamente para melhor carregamento.
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleUploadPreWeddingPhotos}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* GRID DE FOTOS */}
                  {!preWeddingPage?.preWeddingPhotos || preWeddingPage.preWeddingPhotos.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-wedding-100">
                      <p className="text-sm text-wedding-500 italic">Nenhuma foto de pré-wedding carregada ainda.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-wedding-500 mb-3 font-semibold">
                        {preWeddingPage.preWeddingPhotos.length} {preWeddingPage.preWeddingPhotos.length === 1 ? 'foto carregada' : 'fotos carregadas'}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {preWeddingPage.preWeddingPhotos.map((photo, index) => (
                          <div key={index} className="aspect-square rounded border border-wedding-200 overflow-hidden relative group bg-gray-50">
                            <img 
                              src={photo.url} 
                              alt={`Pré-wedding ${index + 1}`} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => handleDeletePreWeddingPhoto(index)}
                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow transition-colors"
                                title="Excluir Foto"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">
                              #{index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PAGES & AI */}
          {activeTab === 'pages' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* List of Pages */}
               <div className="space-y-4">
                  <h3 className="text-xl font-serif text-wedding-800 mb-4">Gerenciar Páginas</h3>
                 {pages.map(page => {
                   const config = page.visibilityConfig || {
                       public: page.isVisible,
                       guest: page.isVisible,
                       admin: true
                   };
                   
                   return (
                   <div key={page.id} className="bg-white p-4 rounded border border-wedding-200 flex flex-col md:flex-row md:justify-between md:items-center shadow-sm gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-wedding-800">{page.title}</h4>
                        </div>
                        <span className="text-xs text-wedding-500 font-mono bg-wedding-100 px-1 rounded">{page.slug}</span>
                      </div>
                      <div className="flex flex-col md:flex-row gap-4 md:items-center text-sm md:mr-8 border md:border-none p-2 md:p-0 rounded bg-gray-50 md:bg-transparent">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={config.public} 
                                  onChange={(e) => updatePageVisibilityConfig(page, 'public', e.target.checked)}
                                  className="accent-wedding-600"
                              />
                              <span className={config.public ? "text-wedding-800 font-bold" : "text-gray-400"}>Público</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={config.guest} 
                                  onChange={(e) => updatePageVisibilityConfig(page, 'guest', e.target.checked)}
                                  className="accent-wedding-600"
                              />
                              <span className={config.guest ? "text-wedding-800 font-bold" : "text-gray-400"}>Convidados</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={config.admin} 
                                  onChange={(e) => updatePageVisibilityConfig(page, 'admin', e.target.checked)}
                                  className="accent-wedding-600"
                              />
                              <span className={config.admin ? "text-wedding-800 font-bold" : "text-gray-400"}>Admin</span>
                          </label>
                      </div>
                      <div className="flex gap-2 items-center self-end md:self-auto">
                         {!page.isSystem && (
                           <button onClick={() => setConfirmModal({ isOpen: true, message: `Excluir a página "${page.title}"?`, onConfirm: () => removePage(page.id) })} className="text-red-400 hover:text-red-600 p-2">
                             <Trash2 size={18} />
                           </button>
                         )}
                      </div>
                   </div>
                 )})}
               </div>
               
               {/* AI Generator */}
               <div className="bg-gradient-to-br from-wedding-50 to-white p-6 rounded-lg border border-wedding-300 shadow-md h-fit sticky top-6">
                 {/* ... AI logic ... */}
                 <div className="space-y-4">
                   <input
                     type="text"
                     placeholder="Sobre o que é a nova página?"
                     className={inputClass}
                     value={aiTopic}
                     onChange={(e) => setAiTopic(e.target.value)}
                     disabled={isGenerating}
                   />
                   <button
                     onClick={handleGeneratePage}
                     disabled={isGenerating || !aiTopic}
                     className="bg-wedding-800 text-white w-full py-2 rounded"
                   >
                     {isGenerating ? <Loader2 className="animate-spin mx-auto"/> : "Gerar com IA"}
                   </button>
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Contributions Modal */}
      {(() => {
        const activeGiftForModal = expandedGiftId ? gifts.find(g => g.id === expandedGiftId) : null;
        if (!activeGiftForModal) return null;

        return (
          <Modal
            isOpen={!!expandedGiftId}
            onClose={() => setExpandedGiftId(null)}
            title={`Gerenciar Contribuições: ${activeGiftForModal.name}`}
            maxWidth="max-w-4xl"
          >
            <div className="space-y-6 text-wedding-900">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-wedding-200 pb-2 gap-2">
                <span className="text-sm text-wedding-700">
                  Valor Total do Presente: <strong className="text-wedding-900 font-serif text-base">R$ {activeGiftForModal.price.toFixed(2)}</strong>
                </span>
                <span className="text-sm text-wedding-700">
                  Status: <strong className={`capitalize ${activeGiftForModal.status === 'confirmed' ? 'text-green-600' : activeGiftForModal.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'}`}>{activeGiftForModal.status === 'confirmed' ? 'Pago' : activeGiftForModal.status === 'pending' ? 'Aguardando' : 'Disponível'}</strong>
                </span>
              </div>

              {/* Form to Add Contribution */}
              <div className="bg-white p-5 rounded border border-wedding-200 shadow-sm">
                <h4 className="text-xs font-bold text-wedding-700 mb-3 uppercase tracking-wider">Adicionar Nova Contribuição</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 mb-1">Selecionar Convidado</label>
                    <select
                      value={selectedGuestIdForGift}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedGuestIdForGift(val);
                        if (val !== 'custom') {
                          const g = guests.find(guest => guest.id === val);
                          setCustomContributorName(g ? g.name : '');
                        } else {
                          setCustomContributorName('');
                        }
                      }}
                      className={selectClass}
                    >
                      <option value="">Selecione um convidado...</option>
                      {guests.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.category || 'Comum'})</option>
                      ))}
                      <option value="custom">Outro (Digitar Nome...)</option>
                    </select>
                  </div>
                  
                  {selectedGuestIdForGift === 'custom' && (
                    <div>
                      <label className="block text-xs font-bold text-wedding-600 mb-1">Nome do Comprador</label>
                      <input
                        type="text"
                        placeholder="Digite o nome..."
                        value={customContributorName}
                        onChange={(e) => setCustomContributorName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      placeholder="Ex: 150"
                      value={newContributionAmount || ''}
                      onChange={(e) => setNewContributionAmount(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-wedding-600 mb-1">Status</label>
                    <select
                      value={newContributionStatus}
                      onChange={(e) => setNewContributionStatus(e.target.value as any)}
                      className={selectClass}
                    >
                      <option value="pending">Pendente (Aguardando Pix)</option>
                      <option value="confirmed">Confirmado (Pago)</option>
                    </select>
                  </div>
                  
                  <div>
                    <button
                      type="button"
                      onClick={() => handleAddManualContribution(activeGiftForModal)}
                      className="bg-wedding-800 text-white p-2 rounded hover:bg-wedding-700 font-serif w-full h-[38px] flex items-center justify-center gap-1 text-sm cursor-pointer"
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* List of Existing Contributions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contribuições Atuais ({activeGiftForModal.contributions?.length || 0})</h4>
                
                {activeGiftForModal.contributions && activeGiftForModal.contributions.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {activeGiftForModal.contributions.map(c => {
                      const isEditing = editingContributionId === c.id;
                      return (
                        <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-3 border border-wedding-200 rounded shadow-sm gap-2">
                          {isEditing ? (
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={editContribName}
                                onChange={(e) => setEditContribName(e.target.value)}
                                className="p-1 text-xs border border-wedding-300 rounded focus:ring-1 focus:ring-wedding-500"
                              />
                              <input
                                type="number"
                                value={editContribAmount}
                                onChange={(e) => setEditContribAmount(Number(e.target.value))}
                                className="p-1 text-xs border border-wedding-300 rounded focus:ring-1 focus:ring-wedding-500"
                              />
                              <select
                                value={editContribStatus}
                                onChange={(e) => setEditContribStatus(e.target.value as any)}
                                className="p-1 text-xs border border-wedding-300 rounded focus:ring-1 focus:ring-wedding-500"
                              >
                                <option value="pending">Pendente</option>
                                <option value="confirmed">Confirmado</option>
                              </select>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-wedding-800">{c.buyerName}</span>
                              <span className="text-gray-500 ml-2 font-medium">R$ {c.amount.toFixed(2)}</span>
                              <span className="text-xs text-gray-400 ml-2">({c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Sem data'})</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 self-end md:self-auto">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveContributionEdit(activeGiftForModal, c)}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 cursor-pointer font-serif"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => setEditingContributionId(null)}
                                  className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500 cursor-pointer font-serif"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                {c.status === 'confirmed' ? (
                                  <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/>Confirmado</span>
                                ) : (
                                  <>
                                    <span className="text-yellow-600 text-xs font-bold animate-pulse">Pendente</span>
                                    <button 
                                      onClick={() => handleConfirmContributionClick(activeGiftForModal, c)}
                                      className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 cursor-pointer font-serif"
                                    >
                                      Confirmar
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingContributionId(c.id);
                                    setEditContribName(c.buyerName);
                                    setEditContribAmount(c.amount);
                                    setEditContribStatus(c.status);
                                  }}
                                  className="text-blue-500 hover:text-blue-700 cursor-pointer p-1"
                                  title="Editar Contribuição"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => setConfirmModal({ 
                                    isOpen: true, 
                                    message: `Excluir contribuição de R$ ${c.amount.toFixed(2)} de ${c.buyerName}?`, 
                                    onConfirm: () => removeContribution(activeGiftForModal.id, c.id) 
                                  })}
                                  className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                                  title="Excluir Contribuição"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic p-4 bg-white rounded border border-wedding-100 text-center">Nenhuma contribuição registrada para este presente.</p>
                )}
              </div>
              
              <div className="flex justify-end pt-4 border-t border-wedding-200 shrink-0">
                <button
                  onClick={() => setExpandedGiftId(null)}
                  className="px-6 py-2 bg-wedding-800 text-white font-serif rounded hover:bg-wedding-700 transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Confirmation Modal */}
      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        title="Confirmação"
      >
        <div className="p-6 text-center">
            <p className="text-wedding-800 mb-6">{confirmModal.message}</p>
            <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { 
                    confirmModal.onConfirm(); 
                    setConfirmModal({ ...confirmModal, isOpen: false }); 
                  }} 
                  className="px-6 py-2 bg-wedding-800 text-white rounded hover:bg-wedding-700 transition"
                >
                  Confirmar
                </button>
            </div>
        </div>
      </Modal>

      {/* WhatsApp Send Modal */}
      <Modal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        title={`Enviar Mensagem para ${selectedGuestForWa?.name || ''}`}
      >
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto flex flex-col">
          <div>
            {!showManualPhoneInput ? (
              <div className="bg-wedding-50 border border-wedding-200 p-4 rounded-lg flex justify-between items-center shadow-sm">
                <div>
                  <span className="block text-xs font-bold text-wedding-700 uppercase tracking-wider mb-0.5">Telefone Cadastrado</span>
                  <span className="text-sm font-semibold font-mono text-wedding-900">{waPhoneNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualPhoneInput(true)}
                  className="text-xs text-wedding-700 hover:text-wedding-950 underline font-medium cursor-pointer"
                >
                  Alterar número
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-wedding-700">Telefone do Convidado</label>
                  {selectedGuestForWa?.phone && (
                    <button
                      type="button"
                      onClick={() => {
                        setWaPhoneNumber(selectedGuestForWa.phone);
                        setShowManualPhoneInput(false);
                      }}
                      className="text-xs text-wedding-700 hover:text-wedding-950 underline font-medium cursor-pointer"
                    >
                      Usar cadastrado
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={waPhoneNumber}
                  onChange={(e) => setWaPhoneNumber(e.target.value)}
                  placeholder="Ex: +55 (00) 0 0000-0000 ou 5500000000000"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-500 mt-1">Insira o número completo com DDD (ex: 11987654321). Se você alterar aqui, o número também será salvo no cadastro deste convidado.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-wedding-700 mb-1">Mensagem (Você pode alterar manualmente se quiser)</label>
            <textarea
              rows={8}
              value={waMessageText}
              onChange={(e) => setWaMessageText(e.target.value)}
              className={inputClass}
              placeholder="Digite a mensagem..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-wedding-100 shrink-0">
            <button
              type="button"
              onClick={() => setIsWaModalOpen(false)}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSendWaMessage}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-serif rounded transition flex items-center gap-2 shadow-md"
            >
              Enviar via WhatsApp
            </button>
          </div>
        </div>
      </Modal>

      <BannerCropModal
        isOpen={isBannerCropModalOpen}
        imageFile={cropModalImageFile}
        imageUrl={cropModalImageUrl}
        initialCropState={currentCroppingIndex !== null ? homeHero.bannerImages?.[currentCroppingIndex]?.cropState : undefined}
        onClose={() => {
          setIsBannerCropModalOpen(false);
          setCropModalImageFile(null);
          setCropModalImageUrl(null);
          setCurrentCroppingIndex(null);
        }}
        onSave={handleBannerCropSave}
      />
    </div>
  );
};