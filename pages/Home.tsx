import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useParams } from 'react-router-dom';
import { Section } from '../types';

interface SectionRendererProps {
  section: Section;
}

const HeroSection: React.FC<SectionRendererProps> = ({ section }) => {
  // Determine which images to use. If imageUrls is present and has items, use it. 
  // Otherwise fallback to single imageUrl wrapped in array, or empty array.
  const images = section.imageUrls && section.imageUrls.length > 0 
    ? section.imageUrls 
    : (section.imageUrl ? [section.imageUrl] : []);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative h-[80vh] w-full flex items-center justify-center overflow-hidden bg-wedding-900">
      {/* Slideshow Backgrounds */}
      {images.length > 0 ? (
        images.map((img, index) => (
          <div 
            key={index}
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <img src={img} alt={`Background ${index + 1}`} className="w-full h-full object-cover" />
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
      {images.length > 1 && (
        <div className="absolute bottom-8 z-20 flex space-x-2">
          {images.map((_, idx) => (
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

const TextSection: React.FC<SectionRendererProps> = ({ section }) => (
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
  const { pages } = useStore();
  const location = window.location.hash.replace('#', '') || '/';
  
  // Find page by slug
  const page = pages.find(p => p.slug === location);

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
      {page.sections.map(section => {
        switch (section.type) {
          case 'hero': return <HeroSection key={section.id} section={section} />;
          case 'text': return <TextSection key={section.id} section={section} />;
          case 'image-text': return <ImageTextSection key={section.id} section={section} />;
          default: return <TextSection key={section.id} section={section} />;
        }
      })}
    </div>
  );
};