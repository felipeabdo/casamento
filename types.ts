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
}

export interface Message {
  id: string;
  author: string;
  type: 'audio' | 'video';
  content: string; // Base64 string do arquivo
  createdAt: string;
  giftId?: string;
}

export interface Section {
  id: string;
  type: 'hero' | 'text' | 'image-text' | 'gallery';
  title?: string;
  content?: string;
  imageUrl?: string; // Fallback / Primary image
  imageUrls?: string[]; // Added for Slideshow/Carousel
  imagePosition?: 'left' | 'right';
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  isSystem: boolean; // true for Home, Gifts, Transparency
  isVisible: boolean; // Added visibility toggle
  sections: Section[];
}

export interface AppSettings {
  coupleName: string;
  weddingDate: string;
  weddingLocation: string;
  pixKey: string;
  pixKeyType: 'CPF' | 'CNPJ' | 'Email' | 'Phone' | 'Random';
  primaryColor: string;
  adminPassword?: string;
  loadingTitle?: string;
  loadingSubtitle?: string;
  // Novos campos
  paymentUrl?: string; // Link para PicPay/MercadoPago
  showMessagesToPublic?: boolean; // Controle de visibilidade do mural
}

export interface AppState {
  settings: AppSettings;
  gifts: Gift[];
  pages: Page[];
  messages: Message[];
}

export const INITIAL_SETTINGS: AppSettings = {
  coupleName: "Jéssica & Felipe",
  weddingDate: "02.08.2026",
  weddingLocation: "Spazio Villa Regia - Brasília",
  pixKey: "123.456.789-00",
  pixKeyType: "CPF",
  primaryColor: "#b08d71",
  adminPassword: "123456",
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
        content: 'Save The Date - 02.08.2026',
        imageUrl: 'https://picsum.photos/1200/800',
        imageUrls: ['https://picsum.photos/1200/800']
      },
      {
        id: 'text-1',
        type: 'text',
        title: 'Como tudo começou',
        content: 'Nossa história começou de forma inesperada e maravilhosa. Cada momento juntos tem sido uma aventura...'
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