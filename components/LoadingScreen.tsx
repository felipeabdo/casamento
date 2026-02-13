import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

interface LoadingScreenProps {
  isVisible: boolean;
  title: string;
  subtitle: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isVisible, title, subtitle }) => {
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      // Wait for transition to finish before unmounting
      const timer = setTimeout(() => setShouldRender(false), 1000); 
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-wedding-50 transition-all duration-1000 ease-in-out ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="text-center animate-fade-in-up">
        {/* Heart Pulse Animation */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Heart size={48} className="text-wedding-400 animate-pulse" fill="#c2ab91" />
            <div className="absolute inset-0 bg-wedding-400 blur-xl opacity-20 animate-pulse"></div>
          </div>
        </div>

        <h1 className="font-script text-5xl md:text-7xl text-wedding-800 mb-4 tracking-wider">
          {title}
        </h1>
        
        <p className="font-serif text-wedding-600 uppercase tracking-[0.3em] text-xs md:text-sm animate-pulse">
          {subtitle}
        </p>
      </div>
    </div>
  );
};