import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Modal } from './Modal';

// Helper to get cropped image
const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
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
      }, 'image/jpeg');
    };
  });
};

interface PhotoCropperProps {
  imageSrc: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

export const PhotoCropper: React.FC<PhotoCropperProps> = ({ imageSrc, onSave, onClose }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (croppedAreaPixels) {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onSave(croppedImage);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Ajustar Foto">
      <div className="relative h-64 w-full mb-4">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>
      <div className="flex justify-center gap-4 mb-4">
        <button onClick={() => setZoom(Math.max(1, zoom - 0.1))} className="bg-wedding-200 text-wedding-800 px-4 py-2 rounded-lg">-</button>
        <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="bg-wedding-200 text-wedding-800 px-4 py-2 rounded-lg">+</button>
      </div>
      <button onClick={handleSave} className="w-full bg-wedding-800 text-white py-2 rounded-lg">
        Salvar
      </button>
    </Modal>
  );
};
