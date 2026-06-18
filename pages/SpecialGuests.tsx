import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { Navigate } from 'react-router-dom';
import { Star, Clock, MapPin, Info, Heart, Sparkles, Upload, Download, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { generateDressPreview } from '../services/geminiService';
import { Modal } from '../components/Modal';

import imageCompression from 'browser-image-compression';

export const SpecialGuests: React.FC = () => {
  const { currentGuest, isAuthenticated, settings, updateGuest, deleteDressPreview } = useStore();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPose, setSelectedPose] = useState<'frontal' | 'reference'>('reference');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(currentGuest?.dressPreviewUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSpecialGuest = currentGuest && currentGuest.category && currentGuest.category !== 'Comum';
  const canView = !!currentGuest || isAuthenticated;

  const specialCategories = [
    'Padrinho', 'Madrinha', 'Padrinhos', 'Madrinhas', 'Demoiselle', 
    'Mãe da Noiva', 'Mãe do Noivo', 'Pais da Noiva', 'Pais do Noivo', 
    'Pai da Noiva', 'Pai do Noivo'
  ];
  const isExcludedCategory = currentGuest && currentGuest.category && specialCategories.includes(currentGuest.category);
  const showForbiddenPalette = !isExcludedCategory;

  const cat = currentGuest?.category || '';
  const isCoupleOrFemale = 
    currentGuest?.gender === 'Couple' || 
    currentGuest?.gender === 'F' || 
    ['Madrinha', 'Madrinhas', 'Demoiselle', 'Mãe da Noiva', 'Mãe do Noivo', 'Pais da Noiva', 'Pais do Noivo', 'Padrinhos'].includes(cat) ||
    (currentGuest?.name && (
      currentGuest.name.toLowerCase().includes(' e ') || 
      currentGuest.name.toLowerCase().includes(' & ') ||
      currentGuest.name.split(' ')[0].toLowerCase().endsWith('a') ||
      currentGuest.name.split(' ')[0].toLowerCase().endsWith('ia') ||
      currentGuest.name.split(' ')[0].toLowerCase().endsWith('na') ||
      currentGuest.name.split(' ')[0].toLowerCase().endsWith('ra')
    ));

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  const getDressCode = () => {
    const category = currentGuest?.category;
    
    switch (category) {
      case 'Padrinho':
        return {
          traje: 'Terno Grafite',
          gravata: 'Verde Sage (será entregue junto com o convite oficial)',
          detalhes: 'Pedimos que o terno seja completo e esteja bem alinhado para as fotos oficiais.',
          illustration: 'https://picsum.photos/seed/suit-graphite/400/600'
        };
      case 'Madrinha':
        return {
          traje: 'Vestido Verde Sage',
          detalhes: 'O tom escolhido é o Verde Sage. Pedimos que os vestidos sejam longos e fluidos.',
          illustration: 'https://picsum.photos/seed/dress-sage/400/600'
        };
      case 'Padrinhos':
        return {
          traje: 'Madrinha: Vestido Verde Sage | Padrinho: Terno Grafite',
          gravata: 'Padrinho: Verde Sage',
          detalhes: 'Madrinhas: Vestido longo Verde Sage. Padrinhos: Terno grafite com gravata sage (entregue com o convite).',
          illustration: 'https://picsum.photos/seed/couple-sage/400/600'
        };
      case 'Madrinhas':
        return {
          traje: 'Vestidos Verde Sage',
          detalhes: 'O tom escolhido para nossas madrinhas é o Verde Sage. Pedimos que os vestidos sejam longos.',
          illustration: 'https://picsum.photos/seed/madrinhas-sage/400/600'
        };
      case 'Demoiselle':
        return {
          traje: 'Vestido Verde Musgo',
          detalhes: 'O tom escolhido para as nossas demoiselles é o Verde Musgo. Pedimos que os vestidos sejam longos.',
          illustration: 'https://picsum.photos/seed/dress-moss/400/600'
        };
      case 'Mãe da Noiva':
      case 'Mãe do Noivo':
        return {
          traje: 'Vestido Bordô',
          detalhes: 'Para as mães, escolhemos a elegância do Bordô. Pedimos que os vestidos sejam longos.',
          illustration: 'https://picsum.photos/seed/dress-burgundy/400/600'
        };
      case 'Pai da Noiva':
      case 'Pai do Noivo':
        return {
          traje: 'Terno Azul Escuro',
          gravata: 'Bordô',
          detalhes: 'Pedimos que o terno seja azul escuro, combinando com a gravata bordô.',
          illustration: 'https://picsum.photos/seed/suit-blue/400/600'
        };
      case 'Pais da Noiva':
      case 'Pais do Noivo':
        return {
          traje: 'Mãe: Vestido Bordô | Pai: Terno Azul Escuro',
          gravata: 'Pai: Bordô',
          detalhes: 'Para as mães, escolhemos a elegância do Bordô. Para os pais, terno azul escuro. Pedimos longo para os vestidos.',
          illustration: 'https://picsum.photos/seed/couple-burgundy/400/600'
        };
      case 'Noivo':
        return {
          traje: 'Terno Azul Claro',
          gravata: 'Dourado Pálido',
          detalhes: 'O grande dia chegou!',
          illustration: 'https://picsum.photos/seed/groom-blue/400/600'
        };
      default:
        return {
          traje: 'Traje Social Completo',
          detalhes: 'Pedimos que evitem essas cores (Verde Sage, Verde Musgo, Bordô, Grafite, Azul Escuro) e, claro, branco ou off-white.',
          illustration: 'https://picsum.photos/seed/wedding-guest/400/600'
        };
    }
  };

  const dressCode = getDressCode();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        // Fallback to original file
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleGenerate = async () => {
    if (!previewImage || !currentGuest) return;
    
    setIsGenerating(true);
    try {
      // Determine gender more accurately based on category and name if missing
      let detectedGender = currentGuest.gender;
      const cat = currentGuest.category?.toLowerCase() || '';
      const name = currentGuest.name.toLowerCase();

      if (!detectedGender || detectedGender === 'M') { 
        if (cat.includes('madrinha') || cat.includes('demoiselle') || cat.includes('mãe')) {
          detectedGender = 'F';
        } else if (cat.includes('padrinhos') || cat.includes('madrinhas') || name.includes(' e ') || name.includes(' & ')) {
          detectedGender = 'Couple';
        } else {
          // Name-based heuristic for individuals
          const firstName = currentGuest.name.split(' ')[0].toLowerCase();
          const isFemale = firstName.endsWith('a') || 
                           firstName.endsWith('ia') || 
                           firstName.endsWith('na') || 
                           firstName.endsWith('ra') ||
                           ['alice', 'beatriz', 'isabel', 'raquel', 'ester', 'ruth'].includes(firstName);
          if (isFemale) detectedGender = 'F';
        }
      }

      const result = await generateDressPreview(
        previewImage, 
        currentGuest.category || 'Comum', 
        detectedGender || 'M',
        selectedPose,
        settings.geminiApiKey,
        selectedColor || undefined
      );
      setGeneratedImage(result);
      // Update guest in store/firebase
      await updateGuest(currentGuest.id, { dressPreviewUrl: result });
    } catch (error: any) {
      console.error("Error generating dress preview:", error);
      const errorMessage = error.message || '';
      if (errorMessage.includes('SAFETY')) {
        alert('A imagem foi bloqueada pelos filtros de segurança da IA. Por favor, tente uma foto diferente com roupas mais neutras.');
      } else if (errorMessage.includes('Model returned text')) {
        alert(`A IA não conseguiu gerar a imagem e respondeu: ${errorMessage.split(': ')[1]}`);
      } else {
        alert('Erro ao gerar a demonstração. Por favor, tente novamente com uma foto diferente.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `meu-traje-casamento.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGreeting = () => {
    if (!currentGuest) return 'Queridos convidados de honra,';
    
    const name = currentGuest.name;
    const gender = currentGuest.gender;
    const category = currentGuest.category;

    // Helper to check if a name is likely female
    const isFemaleName = (n: string) => {
      const firstName = n.split(' ')[0].toLowerCase();
      return firstName.endsWith('a') || 
             firstName.endsWith('ia') || 
             firstName.endsWith('na') || 
             firstName.endsWith('ra') ||
             ['alice', 'beatriz', 'isabel', 'raquel', 'ester', 'ruth', 'carol', 'carolina'].includes(firstName);
    };

    if (gender === 'Couple' || category === 'Padrinhos' || category === 'Madrinhas' || category === 'Pais da Noiva' || category === 'Pais do Noivo') {
      const names = name.split(/ e | & /i).map(n => n.trim());
      
      if (names.length >= 2) {
        const allFemale = names.every(n => isFemaleName(n));
        if (allFemale || category === 'Madrinhas') {
          return `Queridas ${names.join(' e ')},`;
        }
        return `Queridos ${names.join(' e ')},`;
      }
      return `Queridos ${name},`;
    }

    if (gender === 'F') return `Querida ${name},`;

    if (isFemaleName(name)) return `Querida ${name},`;
    
    return `Querido ${name},`;
  };

  return (
    <div className="min-h-screen bg-wedding-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-wedding-100 text-wedding-800 mb-4">
            <Star size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-script text-wedding-800 mb-4">
            {isSpecialGuest ? 'Instruções Especiais' : 'Informações de Convidado'}
          </h1>
          <p className="font-serif text-wedding-600 uppercase tracking-widest text-sm">
            {isSpecialGuest ? 'Para nossos convidados de honra' : 'Dicas para o grande dia'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-wedding-200 overflow-hidden">
          <div className="p-8 md:p-12 space-y-12">
            
            {/* Welcome Message */}
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-lg text-wedding-700 font-serif italic">
                {getGreeting()}
              </p>
              <p className="text-wedding-600 mt-4 leading-relaxed">
                Se você está vendo esta página, é porque tem um papel fundamental na nossa história e no nosso grande dia. 
                Preparamos estas instruções com muito carinho para que tudo saia perfeito!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Dress Code Details & AI Button */}
              <div className="space-y-8">
                <div className="bg-wedding-50 p-6 rounded-xl border border-wedding-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-full text-wedding-800 shadow-sm">
                      <Info size={20} />
                    </div>
                    <h3 className="font-serif text-xl text-wedding-800">Traje & Cores</h3>
                  </div>
                  <div className="space-y-4 text-wedding-700 text-sm">
                    <p>
                      <strong>Traje:</strong> {dressCode.traje}
                    </p>
                    {dressCode.gravata && (
                      <p>
                        <strong>Gravata:</strong> {dressCode.gravata}
                      </p>
                    )}
                    <p>
                      <strong>Detalhes:</strong> {dressCode.detalhes}
                    </p>
                  </div>
                </div>

                {/* Cores Proibidas */}
                {showForbiddenPalette && (
                  <div className="bg-red-50/70 border-2 border-red-200 p-6 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-red-900">
                      <div className="p-1.5 bg-red-100 rounded-full text-red-800 shadow-sm flex items-center justify-center">
                        <X size={18} className="stroke-[3]" />
                      </div>
                      <h4 className="font-serif text-base font-bold uppercase tracking-wider">
                        Não usar — Paleta de Cores Reservadas ⚠️
                      </h4>
                    </div>
                    
                    <p className="text-red-850 text-sm leading-relaxed">
                      Por favor, <strong>NÃO utilize nenhum dos tons abaixo</strong> em seu traje. Estas cores são de uso <strong>exclusivo dos noivos, padrinhos, madrinhas, demoiselles e pais dos noivos</strong>. Também pedimos que evitem branco, off-white e tonalidades próximas:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                      {[
                        { name: 'Branco / Off-white', desc: 'Exclusivo da Noiva', hex: '#FFFFFF', isWhite: true },
                        { name: 'Azul Placid', desc: 'Reservado o Noivo', hex: '#7CA3CD' },
                        { name: 'Verde Sage', desc: 'Reservado Madrinhas', hex: '#87A987' },
                        { name: 'Verde Musgo', desc: 'Reservado Demoiselles', hex: '#4A5D4E' },
                        { name: 'Bordô / Vinho', desc: 'Reservado Mães', hex: '#800020' },
                        { name: 'Grafite / Cinza', desc: 'Reservado Padrinhos', hex: '#4C516D' },
                        { name: 'Azul Escuro / Marinho', desc: 'Reservado Pais', hex: '#1B263B' },
                      ].map((color) => (
                        <div key={color.name} className="bg-white rounded-lg p-3 flex flex-col items-center text-center shadow-sm border border-red-100">
                          <div 
                            className={`w-12 h-12 rounded-full mb-2 ${color.isWhite ? 'border border-gray-300' : 'shadow-inner'}`}
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-xs font-bold text-gray-800 leading-tight">{color.name}</span>
                          <span className="text-[10px] text-gray-500 mt-1">{color.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerta de salto para o gramado */}
                {isCoupleOrFemale && (
                  <div className="bg-emerald-50/60 border border-emerald-200 p-5 rounded-xl flex gap-3 items-start">
                    <span className="text-2xl shrink-0">🌿</span>
                    <div className="space-y-1">
                      <h4 className="font-serif text-sm font-bold text-emerald-950">
                        Aviso Importante: Cerimônia no Gramado
                      </h4>
                      <p className="text-emerald-800 text-xs leading-relaxed">
                        Como a nossa celebração será no <strong>gramado</strong>, recomendamos carinhosamente a todas as mulheres que <strong>não utilizem salto de bico fino</strong> (stiletto), pois ele pode afundar na grama. Sugerimos saltos mais grossos (bloco), anabela, rasteiras ou sapatilhas para seu total conforto!
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Dress Preview Button */}
                <div className="bg-gradient-to-br from-wedding-800 to-wedding-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Sparkles size={80} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-serif text-2xl mb-3 flex items-center gap-2">
                      <Sparkles className="text-wedding-200" size={24} />
                      Simulador de Traje IA
                    </h3>
                    <p className="text-wedding-100 text-sm mb-6 leading-relaxed">
                      Que tal se ver usando o traje oficial do nosso casamento? Nossa IA gera uma prévia personalizada para você!
                    </p>
                    <button 
                      onClick={() => setIsAiModalOpen(true)}
                      className="w-full bg-white text-wedding-900 py-3 rounded-xl font-bold hover:bg-wedding-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      Experimentar Agora
                    </button>
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-wedding-50 p-6 rounded-xl border border-wedding-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-full text-wedding-800 shadow-sm">
                      <Clock size={20} />
                    </div>
                    <h3 className="font-serif text-xl text-wedding-800">Horários Importantes</h3>
                  </div>
                  <div className="space-y-4 text-wedding-700 text-sm">
                    <p>
                      <strong>Chegada:</strong> 15h30
                    </p>
                    <p className="text-xs text-wedding-500 italic">
                      {isExcludedCategory 
                        ? '(Pedimos pontualidade especial para as fotos com os noivos)' 
                        : '(Aproveite para se acomodar e tirar lindas fotos no cenário)'}
                    </p>
                    <p>
                      <strong>Início da Celebração:</strong> 16h00
                    </p>
                    <p>
                      <strong>Data:</strong> {settings.weddingDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Modal */}
      <Modal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)}
        title="Simulador de Traje IA"
      >
        <div className="space-y-6">
          {!generatedImage ? (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800 text-sm">
                <p className="font-bold mb-1">Como funciona:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Envie uma foto sua</li>
                  <li>Nossa IA aplicará o traje da sua categoria</li>
                  <li>O fundo será um lindo cenário Boho Chic</li>
                </ul>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-wedding-200 rounded-2xl p-12 text-center hover:border-wedding-400 transition-colors cursor-pointer bg-wedding-50/50"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                {previewImage ? (
                  <div className="relative inline-block">
                    <img src={previewImage} alt="Preview" className="max-h-64 rounded-lg shadow-md" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-wedding-300 shadow-sm">
                      <Upload size={32} />
                    </div>
                    <div>
                      <p className="font-bold text-wedding-800">Clique para enviar sua foto</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-wedding-800">Escolha a pose desejada:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedPose('reference')}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      selectedPose === 'reference' 
                        ? 'border-wedding-800 bg-wedding-50 text-wedding-800' 
                        : 'border-gray-200 text-gray-500 hover:border-wedding-200'
                    }`}
                  >
                    Pose da foto original
                  </button>
                  <button
                    onClick={() => setSelectedPose('frontal')}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      selectedPose === 'frontal' 
                        ? 'border-wedding-800 bg-wedding-50 text-wedding-800' 
                        : 'border-gray-200 text-gray-500 hover:border-wedding-200'
                    }`}
                  >
                    Pose frontal e de pé
                  </button>
                </div>
              </div>

              {!isSpecialGuest && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-wedding-800">Sugestão de Cor (Opcional):</p>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-wedding-400 mb-2 font-bold">Tons para Vestidos</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Dusty Rose', hex: '#DCAE96' },
                          { name: 'Lavender', hex: '#E6E6FA' },
                          { name: 'Sky Blue', hex: '#87CEEB' },
                          { name: 'Peach', hex: '#FFDAB9' },
                          { name: 'Mauve', hex: '#E0B0FF' },
                          { name: 'Terracotta', hex: '#E2725B' },
                          { name: 'Mustard', hex: '#FFDB58' },
                          { name: 'Lilac', hex: '#C8A2C8' },
                          { name: 'Champagne', hex: '#F7E7CE' },
                          { name: 'Coral', hex: '#FF7F50' }
                        ].map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => setSelectedColor(selectedColor === c.name ? null : c.name)}
                            className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm ${selectedColor === c.name ? 'border-wedding-800 scale-110' : 'border-white hover:scale-105'}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-wedding-400 mb-2 font-bold">Tons para Ternos</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Light Grey', hex: '#D3D3D3' },
                          { name: 'Tan', hex: '#D2B48C' },
                          { name: 'Royal Blue', hex: '#4169E1' },
                          { name: 'Chocolate Brown', hex: '#5B3A29' },
                          { name: 'Khaki', hex: '#F0E68C' },
                          { name: 'Slate Grey', hex: '#708090' },
                          { name: 'Camel', hex: '#C19A6B' }
                        ].map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => setSelectedColor(selectedColor === c.name ? null : c.name)}
                            className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm ${selectedColor === c.name ? 'border-wedding-800 scale-110' : 'border-white hover:scale-105'}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {selectedColor && (
                    <p className="text-[10px] text-wedding-600 italic">
                      Cor selecionada: <strong>{selectedColor}</strong>
                    </p>
                  )}
                </div>
              )}

              <button
                disabled={!previewImage || isGenerating}
                onClick={handleGenerate}
                className="w-full bg-wedding-800 text-white py-4 rounded-xl font-bold hover:bg-wedding-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Gerando seu Traje...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Gerar Demonstração
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                <img src={generatedImage} alt="Traje Gerado" className="w-full h-auto" />
                <div className="absolute top-4 right-4">
                   <div className="bg-wedding-800/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                     <Sparkles size={12} />
                     IA
                   </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={downloadImage}
                  className="flex-1 bg-wedding-800 text-white py-3 rounded-xl font-bold hover:bg-wedding-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download size={20} />
                  Baixar Foto
                </button>
                <button
                  onClick={() => {
                    setGeneratedImage(null);
                    setPreviewImage(null);
                  }}
                  className="px-4 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  title="Gerar Novamente"
                >
                  <ImageIcon size={20} />
                </button>
              </div>
              
              <p className="text-center text-xs text-wedding-500 italic">
                Esta é uma simulação artística gerada por inteligência artificial.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
