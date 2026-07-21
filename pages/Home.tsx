import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useParams, useLocation } from 'react-router-dom';
import { Section, BannerImage } from '../types';

import { MapPin, Navigation, Car, Map, X, Clock, Heart } from 'lucide-react';

interface SectionRendererProps {
  section: Section;
}

const LocationSection: React.FC<SectionRendererProps> = ({ section }) => {
  const { isAuthenticated, currentGuest } = useStore();
  const { locationDetails } = section;
  if (!locationDetails) return null;

  if (!isAuthenticated && !currentGuest) {
    return (
      <div className="py-20 px-4 md:px-0 bg-white">
        <div className="max-w-3xl mx-auto text-center border border-wedding-200 p-12 rounded-2xl bg-wedding-50 shadow-sm">
          <MapPin size={48} className="mx-auto text-wedding-300 mb-6" />
          <h2 className="font-serif text-3xl text-wedding-800 mb-4">Local da Festa</h2>
          <p className="text-wedding-600 mb-6">
            Para ver os detalhes do local e como chegar, por favor, faça login.
          </p>
          <p className="text-sm text-wedding-500 italic">
            Seu login e senha serão enviados junto com o convite em breve!
          </p>
        </div>
      </div>
    );
  }

  const encodedAddress = encodeURIComponent(locationDetails.address);

  const googleMapsUrl = locationDetails.mapUrl && !locationDetails.mapUrl.includes('<iframe') 
    ? locationDetails.mapUrl 
    : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  const links = [
    {
      name: 'Google Maps',
      icon: <Map size={20} />,
      url: googleMapsUrl,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Waze',
      icon: <Navigation size={20} />,
      url: `https://waze.com/ul?q=${encodedAddress}&navigate=yes`,
      color: 'bg-cyan-500 hover:bg-cyan-600'
    },
    {
      name: 'Uber',
      icon: <Car size={20} />,
      url: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodedAddress}`,
      color: 'bg-black hover:bg-gray-800'
    },
    {
      name: '99',
      icon: <Car size={20} />,
      url: `99taxis://call?dropoff_title=${encodedAddress}`,
      color: 'bg-yellow-500 hover:bg-yellow-600 text-black'
    }
  ];

  // Extract src if user pasted full iframe, otherwise use auto-generated embed URL
  let iframeSrc = `https://maps.google.com/maps?q=${encodedAddress}&output=embed`;
  if (locationDetails.mapUrl && locationDetails.mapUrl.includes('<iframe')) {
    const match = locationDetails.mapUrl.match(/src="([^"]+)"/);
    if (match) {
      iframeSrc = match[1];
    }
  }

  return (
    <div className="py-20 px-4 md:px-0 bg-wedding-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          {section.title && <h2 className="font-serif text-3xl md:text-4xl text-wedding-800 mb-4">{section.title}</h2>}
          {section.content && <p className="text-wedding-600 text-lg">{section.content}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-wedding-200">
          <div className="flex flex-col md:flex-row">
            {/* Map Iframe */}
            <div className="w-full md:w-2/3 h-[400px] md:h-auto relative">
              <iframe
                src={iframeSrc}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '400px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 w-full h-full"
              ></iframe>
            </div>

            {/* Details and Links */}
            <div className="w-full md:w-1/3 p-8 flex flex-col justify-center bg-white">
              <div className="mb-8">
                <div className="flex items-start gap-3 text-wedding-800 mb-4">
                  <MapPin className="flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="font-bold text-lg mb-1">Endereço</h3>
                    <p className="text-wedding-600 leading-relaxed">{locationDetails.address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-wedding-800 uppercase tracking-wider mb-4 text-center">Como chegar</h4>
                <div className="grid grid-cols-1 gap-3">
                  {links.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white font-medium transition-colors shadow-sm ${link.color}`}
                    >
                      {link.icon}
                      Abrir no {link.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroSection: React.FC<SectionRendererProps> = ({ section }) => {
  // Normalize images list supporting legacy formats and the new detailed bannerImages
  const bannerImages = section.bannerImages && section.bannerImages.length > 0
    ? section.bannerImages
    : (section.imageUrls && section.imageUrls.length > 0 
        ? section.imageUrls.map((url, i) => ({ id: `legacy-${i}`, url, landscapeUrl: url, portraitUrl: url }))
        : (section.imageUrl 
            ? [{ id: 'legacy-single', url: section.imageUrl, landscapeUrl: section.imageUrl, portraitUrl: section.imageUrl }] 
            : []
          )
      );

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (bannerImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerImages.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [bannerImages.length]);

  return (
    <div className="relative h-[80vh] w-full flex items-center justify-center overflow-hidden bg-wedding-900">
      {/* Slideshow Backgrounds */}
      {bannerImages.length > 0 ? (
        bannerImages.map((bImg, index) => (
          <div 
            key={bImg.id || index}
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <picture className="block w-full h-full">
              {/* If landscapeUrl exists, show it on screens with min-width: 768px (md and larger) */}
              {bImg.landscapeUrl && <source media="(min-width: 768px)" srcSet={bImg.landscapeUrl} />}
              {/* If portraitUrl exists, show it on screens with max-width: 767px (mobile) */}
              {bImg.portraitUrl && <source media="(max-width: 767px)" srcSet={bImg.portraitUrl} />}
              {/* Fallback image */}
              <img 
                src={bImg.url || bImg.landscapeUrl || bImg.portraitUrl} 
                alt={`Background ${index + 1}`} 
                className={`w-full h-full object-cover ${
                  bImg.verticalAlign === 'top' 
                    ? 'object-top' 
                    : bImg.verticalAlign === 'bottom' 
                      ? 'object-bottom' 
                      : 'object-center'
                }`} 
              />
            </picture>
            <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
          </div>
        ))
      ) : (
        <div className="absolute inset-0 bg-wedding-300"></div>
      )}

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto animate-fade-in-up">
        <h1 className="font-script text-6xl md:text-8xl mb-6 drop-shadow-md">{section.title}</h1>
        <p className="font-serif text-lg md:text-2xl tracking-[0.2em] uppercase drop-shadow-sm border-t border-b border-white/50 py-4 inline-block">
          {section.content}
        </p>
      </div>

      {/* Dots Indicator (only if multiple images) */}
      {bannerImages.length > 1 && (
        <div className="absolute bottom-8 z-20 flex space-x-2">
          {bannerImages.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ScheduleSection: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="py-20 px-4 md:px-0 bg-wedding-50">
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="font-serif text-3xl md:text-4xl text-wedding-800 mb-4">{section.title}</h2>
        <div className="w-24 h-px bg-wedding-400 mx-auto"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-wedding-100 text-center">
          <div className="w-12 h-12 bg-wedding-100 rounded-full flex items-center justify-center mx-auto mb-4 text-wedding-800">
            <Clock size={24} />
          </div>
          <h3 className="font-bold text-wedding-800 mb-2">15:30h</h3>
          <p className="text-sm text-wedding-600 font-medium">Chegada dos Convidados</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-wedding-100 text-center">
          <div className="w-12 h-12 bg-wedding-800 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
            <Heart size={24} />
          </div>
          <h3 className="font-bold text-wedding-800 mb-2">16:00h</h3>
          <p className="text-sm text-wedding-600 font-bold">Início da Celebração</p>
        </div>
      </div>
    </div>
  </div>
);

const TextSection: React.FC<SectionRendererProps> = ({ section }) => {
  if (section.id === 'schedule-1') return <ScheduleSection section={section} />;
  return (
    <div className="py-20 px-4 md:px-0 bg-wedding-50">
      <div className="max-w-3xl mx-auto text-center">
        {section.title && <h2 className="font-serif text-3xl md:text-4xl text-wedding-800 mb-8">{section.title}</h2>}
        <div className="prose prose-stone prose-lg mx-auto text-wedding-600 font-sans leading-relaxed">
          {section.content?.split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
        </div>
        <div className="mt-12 flex justify-center">
          <div className="w-24 h-px bg-wedding-400"></div>
        </div>
      </div>
    </div>
  );
};

const ImageTextSection: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className={`flex flex-col md:flex-row items-center gap-12 ${section.imagePosition === 'right' ? 'md:flex-row-reverse' : ''}`}>
        <div className="w-full md:w-1/2">
          <div className="relative p-4 border border-wedding-200">
             <img 
               src={section.imageUrl || "https://picsum.photos/600/800"} 
               alt={section.title} 
               className="w-full h-auto object-cover shadow-lg"
             />
          </div>
        </div>
        <div className="w-full md:w-1/2 text-center md:text-left">
          <h2 className="font-serif text-3xl text-wedding-800 mb-6">{section.title}</h2>
          <div className="text-wedding-600 leading-loose text-lg">
             {section.content?.split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const DynamicPage: React.FC = () => {
  const { pages, isAuthenticated, currentGuest } = useStore();
  const [showBanner, setShowBanner] = useState(true);
  const reactLocation = useLocation();
  const locationSlug = reactLocation.pathname;
  
  // Find page by slug
  const page = pages.find(p => p.slug === locationSlug);

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-wedding-800 mb-4">Página não encontrada</h1>
          <p className="text-wedding-600">A página que você procura não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {!isAuthenticated && !currentGuest && locationSlug === '/' && showBanner && (
        <div className="bg-wedding-100 border-b border-wedding-200 py-3 px-4 relative flex items-center justify-center">
          <p className="text-wedding-800 text-sm font-medium pr-8 max-w-3xl text-center">
            Bem-vindo! Faça login para aproveitar toda a experiência do nosso site, confirmar presença, ver mais detalhes e concorrer a brindes exclusivos!
          </p>
          <button 
            onClick={() => setShowBanner(false)} 
            className="absolute right-4 text-wedding-600 hover:text-wedding-800 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      )}
      {page.sections.map(section => {
        switch (section.type) {
          case 'hero': return <HeroSection key={section.id} section={section} />;
          case 'text': return <TextSection key={section.id} section={section} />;
          case 'image-text': return <ImageTextSection key={section.id} section={section} />;
          case 'location': return <LocationSection key={section.id} section={section} />;
          default: return <TextSection key={section.id} section={section} />;
        }
      })}
    </div>
  );
};