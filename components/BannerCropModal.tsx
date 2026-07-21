import React, { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Modal } from './Modal';
import { Monitor, Smartphone, Check, X, Loader2 } from 'lucide-react';

const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous'; // Enable CORS
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/webp', 0.85); // Compress as WebP for optimal performance
    };
    image.onerror = (err) => {
      reject(err);
    };
  });
};

interface BannerCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  imageUrl: string | null;
  initialCropState?: {
    landscape?: { x: number; y: number; zoom: number };
    portrait?: { x: number; y: number; zoom: number };
  };
  onClose: () => void;
  onSave: (
    landscapeBlob: Blob, 
    portraitBlob: Blob, 
    cropState: {
      landscape: { x: number; y: number; zoom: number };
      portrait: { x: number; y: number; zoom: number };
    }
  ) => Promise<void>;
}

export const BannerCropModal: React.FC<BannerCropModalProps> = ({
  isOpen,
  imageFile,
  imageUrl,
  initialCropState,
  onClose,
  onSave,
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'landscape' | 'portrait'>('landscape');
  const [isProcessing, setIsProcessing] = useState(false);

  // Landscape crop state
  const [landscapeCrop, setLandscapeCrop] = useState({ x: 0, y: 0 });
  const [landscapeZoom, setLandscapeZoom] = useState(1);
  const [landscapePixels, setLandscapePixels] = useState<Area | null>(null);

  // Portrait crop state
  const [portraitCrop, setPortraitCrop] = useState({ x: 0, y: 0 });
  const [portraitZoom, setPortraitZoom] = useState(1);
  const [portraitPixels, setPortraitPixels] = useState<Area | null>(null);

  // Reset or load initial crop state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialCropState?.landscape) {
        setLandscapeCrop({ x: initialCropState.landscape.x, y: initialCropState.landscape.y });
        setLandscapeZoom(initialCropState.landscape.zoom);
      } else {
        setLandscapeCrop({ x: 0, y: 0 });
        setLandscapeZoom(1);
      }

      if (initialCropState?.portrait) {
        setPortraitCrop({ x: initialCropState.portrait.x, y: initialCropState.portrait.y });
        setPortraitZoom(initialCropState.portrait.zoom);
      } else {
        setPortraitCrop({ x: 0, y: 0 });
        setPortraitZoom(1);
      }
    }
  }, [isOpen, initialCropState]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageSrc(url);
      return () => URL.revokeObjectURL(url);
    } else if (imageUrl) {
      setImageSrc(imageUrl);
    }
  }, [imageFile, imageUrl, isOpen]);

  const onLandscapeCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setLandscapePixels(croppedAreaPixels);
  }, []);

  const onPortraitCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setPortraitPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!landscapePixels || !portraitPixels || !imageSrc) {
      alert('Por favor, ajuste o recorte em ambas as orientações.');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Generate both cropped blobs in parallel
      const [landscapeBlob, portraitBlob] = await Promise.all([
        getCroppedImg(imageSrc, landscapePixels),
        getCroppedImg(imageSrc, portraitPixels),
      ]);

      await onSave(landscapeBlob, portraitBlob, {
        landscape: { x: landscapeCrop.x, y: landscapeCrop.y, zoom: landscapeZoom },
        portrait: { x: portraitCrop.x, y: portraitCrop.y, zoom: portraitZoom },
      });
    } catch (error) {
      console.error('Error cropping images:', error);
      alert('Erro ao recortar imagem. Por favor, tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajustar Foto do Banner">
      <div className="flex flex-col h-[75vh] max-h-[600px]">
        {/* Help text */}
        <p className="text-xs text-wedding-600 mb-3 bg-wedding-50 p-2 rounded border border-wedding-100">
          Ajuste o recorte da foto para que ela apareça perfeitamente tanto em computadores quanto em celulares.
        </p>

        {/* Orientation Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('landscape')}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'landscape'
                ? 'border-wedding-600 text-wedding-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Monitor size={16} />
            Deitado (Computador)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('portrait')}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'portrait'
                ? 'border-wedding-600 text-wedding-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Smartphone size={16} />
            Em Pé (Celular)
          </button>
        </div>

        {/* Cropper Container */}
        <div className="flex-1 relative bg-gray-950 rounded-lg overflow-hidden min-h-[250px] mb-4">
          {imageSrc && activeTab === 'landscape' && (
            <Cropper
              image={imageSrc}
              crop={landscapeCrop}
              zoom={landscapeZoom}
              aspect={16 / 9}
              onCropChange={setLandscapeCrop}
              onCropComplete={onLandscapeCropComplete}
              onZoomChange={setLandscapeZoom}
            />
          )}
          {imageSrc && activeTab === 'portrait' && (
            <Cropper
              image={imageSrc}
              crop={portraitCrop}
              zoom={portraitZoom}
              aspect={9 / 16}
              onCropChange={setPortraitCrop}
              onCropComplete={onPortraitCropComplete}
              onZoomChange={setPortraitZoom}
            />
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-between gap-4 mb-4 px-2">
          <span className="text-xs text-gray-500 font-medium">Zoom:</span>
          <div className="flex-1 flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'landscape') {
                  setLandscapeZoom(Math.max(1, landscapeZoom - 0.1));
                } else {
                  setPortraitZoom(Math.max(1, portraitZoom - 0.1));
                }
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-bold"
            >
              -
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={activeTab === 'landscape' ? landscapeZoom : portraitZoom}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (activeTab === 'landscape') {
                  setLandscapeZoom(val);
                } else {
                  setPortraitZoom(val);
                }
              }}
              className="flex-1 accent-wedding-600"
            />
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'landscape') {
                  setLandscapeZoom(Math.min(3, landscapeZoom + 0.1));
                } else {
                  setPortraitZoom(Math.min(3, portraitZoom + 0.1));
                }
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <X size={18} />
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-wedding-800 text-white font-medium hover:bg-wedding-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check size={18} />
                Confirmar Recortes
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
