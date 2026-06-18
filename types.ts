export interface Contribution {
  id: string;
  amount: number;
  buyerName: string;
  status: 'pending' | 'confirmed';
  createdAt: string;
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  purchasedCount: number;
  // Novos campos
  status: 'available' | 'pending' | 'confirmed'; 
  buyerName?: string;
  contributions?: Contribution[];
  externalLink?: string;
}

export interface Message {
  id: string;
  author: string;
  authorId?: string; // ID do convidado que enviou
  type: 'audio' | 'video' | 'text' | 'audio+text' | 'video+text';
  content: string; // Base64 string do arquivo, URL da nuvem, ou texto
  fallbackContent?: string; // URL secundária (ex: Firebase Storage)
  cloudinaryPublicId?: string; // ID para deleção no Cloudinary
  firebasePath?: string; // Caminho para deleção no Firebase
  textContent?: string; // Texto escrito quando há mídia e texto
  createdAt: string;
  giftId?: string;
  status?: 'pending' | 'approved';
}

export interface Section {
  id: string;
  type: 'hero' | 'text' | 'image-text' | 'gallery' | 'location';
  title?: string;
  content?: string;
  imageUrl?: string; // Fallback / Primary image
  imageUrls?: string[]; // Added for Slideshow/Carousel
  imagePosition?: 'left' | 'right';
  locationDetails?: {
    address: string;
    mapUrl?: string;
  };
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  isSystem: boolean; // true for Home, Gifts, Transparency
  isVisible: boolean; // Legacy visibility toggle
  visibilityConfig?: {
    public: boolean;
    guest: boolean;
    admin: boolean;
  };
  sections: Section[];
}

export type GuestCategory = 'Comum' | 'Padrinho' | 'Madrinha' | 'Padrinhos' | 'Madrinhas' | 'Demoiselle' | 'Mãe da Noiva' | 'Pai da Noiva' | 'Pais da Noiva' | 'Mãe do Noivo' | 'Pai do Noivo' | 'Pais do Noivo' | 'Noivo' | 'Noiva';

export interface Guest {
  id: string;
  name: string;
  username: string; // Login
  password?: string; // Senha do convidado
  gender?: 'M' | 'F' | 'Couple';
  showWizard?: boolean; // Se o convidado deve ver o wizard
  photoUrl?: string; // Foto de perfil do convidado
  dressPreviewUrl?: string; // Foto gerada por IA do traje
  themeColor?: string; // Cor do tema escolhida pelo convidado
  category?: GuestCategory;
  phone?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  country?: string;
  countryCode?: string;
  email?: string;
  rsvpStatus?: 'pending' | 'confirmed' | 'declined';
}

export interface AppSettings {
  coupleName: string;
  weddingDate: string;
  weddingLocation: string;
  pixKey: string;
  pixKeyType: 'CPF' | 'CNPJ' | 'Email' | 'Phone' | 'Random';
  primaryColor: string;
  adminPassword?: string;
  guestPassword?: string; // Senha para convidados entrarem no site (Legacy)
  requireGuestLogin?: boolean; // Se true, exige login individual
  loadingTitle?: string;
  loadingSubtitle?: string;
  geminiApiKey?: string;
  // Novos campos
  paymentUrl?: string; // Link para PicPay/MercadoPago
  showMessagesToPublic?: boolean; // Controle de visibilidade do mural
}

export interface Photo {
  id: string;
  url: string;
  fallbackUrl?: string; // URL secundária (ex: Cloudinary)
  publicId?: string; // Caminho no Firebase
  cloudinaryPublicId?: string; // ID no Cloudinary
  drivePath?: string;
  uploaderName: string;
  uploaderId?: string; // ID do convidado que enviou
  createdAt: string;
  status: 'pending' | 'approved';
  deletionRequest?: {
    reason: string;
    requestedAt: string;
  };
}

export interface AppState {
  settings: AppSettings;
  gifts: Gift[];
  pages: Page[];
  messages: Message[];
  photos: Photo[];
  guests: Guest[];
}

export const INITIAL_SETTINGS: AppSettings = {
  coupleName: "Jéssica & Felipe",
  weddingDate: "02.08.2026",
  weddingLocation: "Spazio Villa Regia - Brasília",
  pixKey: "123.456.789-00",
  pixKeyType: "CPF",
  primaryColor: "#b08d71",
  adminPassword: "123456",
  guestPassword: "", // Vazio significa que o site é público
  requireGuestLogin: true,
  loadingTitle: "Jéssica & Felipe",
  loadingSubtitle: "Carregando nossa história...",
  paymentUrl: "",
  showMessagesToPublic: false
};

export const INITIAL_PAGES: Page[] = [
  {
    id: 'home',
    title: 'Nossa História',
    slug: '/',
    isSystem: true,
    isVisible: true,
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        title: 'Jéssica & Felipe',
        content: 'Save The Date - 02.08.2026 - 16:00h',
        imageUrl: 'https://picsum.photos/1200/800',
        imageUrls: ['https://picsum.photos/1200/800']
      },
      {
        id: 'schedule-1',
        type: 'text',
        title: 'Programação',
        content: 'A celebração do nosso casamento começará pontualmente às 16h.\n\nPedimos que os convidados cheguem com antecedência:\n• Todos os Convidados: 15h30'
      },
      {
        id: 'text-1',
        type: 'text',
        title: 'Como tudo começou',
        content: 'Nossa história começou de forma inesperada e maravilhosa. Cada momento juntos tem sido uma aventura...'
      },
      {
        id: 'location-1',
        type: 'location',
        title: 'Local da Festa',
        content: 'Esperamos você para celebrar conosco!',
        locationDetails: {
          address: 'Spazio Villa Regia - Vicente Pires, Brasília - DF',
          mapUrl: 'https://maps.app.goo.gl/Akc9pJNLCLjnCTk76'
        }
      }
    ]
  },
  {
    id: 'gifts-page',
    title: 'Lista de Presentes',
    slug: '/gifts',
    isSystem: true,
    isVisible: true,
    sections: []
  },
  {
    id: 'transparency-page',
    title: 'Transparência',
    slug: '/transparency',
    isSystem: true,
    isVisible: true,
    sections: []
  },
  {
    id: 'messages-page',
    title: 'Mural de Recados',
    slug: '/messages',
    isSystem: true,
    isVisible: true,
    sections: []
  },
  {
    id: 'gallery-page',
    title: 'Fotos da Festa',
    slug: '/gallery',
    isSystem: true,
    isVisible: true,
    sections: []
  },
  {
    id: 'rsvp-page',
    title: 'Confirmar Presença',
    slug: '/rsvp',
    isSystem: true,
    isVisible: true,
    sections: []
  },
  {
    id: 'special-guests-page',
    title: 'Informações de Convidado',
    slug: '/special-guests',
    isSystem: true,
    isVisible: true,
    sections: []
  },
  {
    id: 'bridal-party-page',
    title: 'Padrinhos',
    slug: '/padrinhos',
    isSystem: true,
    isVisible: true,
    sections: []
  },
  {
    id: 'pre-wedding-page',
    title: 'Ensaio Pré-Wedding',
    slug: '/pre-wedding',
    isSystem: true,
    isVisible: true,
    sections: []
  }
];

export const INITIAL_GIFTS: Gift[] = [
  {
    id: '1',
    name: 'Jantar Romântico na Lua de Mel',
    description: 'Ajude-nos a ter uma noite inesquecível.',
    price: 300,
    imageUrl: 'https://picsum.photos/400/300',
    purchasedCount: 2,
    status: 'available'
  },
  {
    id: '2',
    name: 'Cotas para a Casa Nova',
    description: 'Contribuição para nosso novo lar.',
    price: 150,
    imageUrl: 'https://picsum.photos/401/300',
    purchasedCount: 5,
    status: 'available'
  }
];