import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Edit2, Wand2, Loader2, Save, LogOut, Eye, EyeOff, Image as ImageIcon, CheckCircle, Video, Mic, Clock } from 'lucide-react';
import { generatePageContent } from '../services/geminiService';
import { Gift, Page, Section } from '../types';

export const AdminPage: React.FC = () => {
  const { 
    settings, updateSettings, 
    gifts, addGift, updateGift, removeGift, confirmGiftPayment,
    pages, addPage, removePage, updatePage, 
    messages, deleteMessage,
    resetStore, logout, isAuthenticated 
  } = useStore();
  
  const navigate = useNavigate();
  // Added 'messages' tab
  const [activeTab, setActiveTab] = useState<'general' | 'gifts' | 'pages' | 'messages'>('general');
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  
  // States for Gift Form
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [newGift, setNewGift] = useState<Partial<Gift>>({ name: '', price: 0, description: '', imageUrl: 'https://picsum.photos/400/300' });

  // States for AI Page Gen
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // States for Home Page Edit
  const [homeHero, setHomeHero] = useState<Partial<Section>>({});
  const [newHeroImageUrl, setNewHeroImageUrl] = useState('');

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
        setHomeHero(loadedHero);
    }
  }, [pages]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditGift = (gift: Gift) => {
    setEditingGiftId(gift.id);
    setNewGift({
        name: gift.name,
        price: gift.price,
        description: gift.description,
        imageUrl: gift.imageUrl
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditGift = () => {
    setEditingGiftId(null);
    setNewGift({ name: '', price: 0, description: '', imageUrl: 'https://picsum.photos/400/300' });
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
        });
        setEditingGiftId(null);
      } else {
        addGift({
            name: newGift.name,
            price: Number(newGift.price),
            description: newGift.description || '',
            imageUrl: newGift.imageUrl || 'https://picsum.photos/400/300',
        });
      }
      setNewGift({ name: '', price: 0, description: '', imageUrl: 'https://picsum.photos/400/300' });
    }
  };

  const addHeroImage = () => {
      if (newHeroImageUrl) {
          const currentImages = homeHero.imageUrls || [];
          setHomeHero({
              ...homeHero,
              imageUrls: [...currentImages, newHeroImageUrl],
              imageUrl: newHeroImageUrl 
          });
          setNewHeroImageUrl('');
      }
  };

  const removeHeroImage = (index: number) => {
      const currentImages = homeHero.imageUrls || [];
      const newImages = currentImages.filter((_, i) => i !== index);
      setHomeHero({
          ...homeHero,
          imageUrls: newImages,
          imageUrl: newImages.length > 0 ? newImages[0] : '' 
      });
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

  const togglePageVisibility = (pageId: string, currentVisibility: boolean) => {
      updatePage(pageId, { isVisible: !currentVisibility });
  };

  const handleGeneratePage = async () => {
    if (!apiKey) {
      alert("Por favor, insira uma API Key do Google Gemini válida.");
      return;
    }
    if (!aiTopic) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const generatedPage = await generatePageContent(aiTopic, pages, apiKey);
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

  const inputClass = "w-full p-2 border border-wedding-600 rounded bg-wedding-900 text-white placeholder-wedding-400 focus:ring-2 focus:ring-wedding-500 focus:border-wedding-500 transition-colors";

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
             <button onClick={() => { if(confirm('Resetar tudo para o padrão?')) resetStore() }} className="text-xs bg-red-800 hover:bg-red-900 text-white/80 px-3 py-1 rounded transition">Resetar App</button>
             <button onClick={handleLogout} className="flex items-center gap-2 bg-wedding-600 hover:bg-wedding-700 px-4 py-2 rounded text-sm transition font-medium">
                <LogOut size={16} /> Sair
             </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-wedding-200 overflow-x-auto">
          {['general', 'gifts', 'messages', 'pages'].map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-4 font-serif text-lg transition-colors capitalize min-w-[120px] ${activeTab === tab ? 'bg-wedding-50 text-wedding-800 border-b-2 border-wedding-800' : 'text-wedding-400 hover:text-wedding-600'}`}
            >
                {tab === 'general' ? 'Geral' : tab === 'gifts' ? 'Presentes' : tab === 'messages' ? 'Recados' : 'Páginas'}
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
                 <div className="flex items-center justify-between">
                     <div>
                         <p className="font-bold text-wedding-800">Mural de Recados Público</p>
                         <p className="text-sm text-wedding-600">Se ativo, qualquer pessoa poderá ver e ouvir os recados deixados no site.</p>
                     </div>
                     <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={settings.showMessagesToPublic}
                            onChange={(e) => updateSettings({ showMessagesToPublic: e.target.checked })}
                            className="w-5 h-5 accent-wedding-800"
                        />
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
                         <div className="space-y-2 mb-3">
                             {homeHero.imageUrls && homeHero.imageUrls.map((url, idx) => (
                                 <div key={idx} className="flex gap-2 items-center bg-wedding-100 p-2 rounded border border-wedding-200">
                                     <img src={url} alt="Miniatura" className="w-10 h-10 object-cover rounded" />
                                     <span className="text-xs text-wedding-700 truncate flex-1">{url}</span>
                                     <button onClick={() => removeHeroImage(idx)} className="text-red-500 hover:text-red-700 p-1">
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                             ))}
                         </div>
                         <div className="flex gap-2">
                             <input 
                                type="text"
                                placeholder="URL da nova imagem"
                                value={newHeroImageUrl}
                                onChange={(e) => setNewHeroImageUrl(e.target.value)}
                                className={inputClass}
                             />
                             <button onClick={addHeroImage} className="bg-wedding-600 text-white px-3 rounded hover:bg-wedding-700 flex items-center">
                                 <Plus size={18} />
                             </button>
                         </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleUpdateHomeHero} className="bg-wedding-800 text-white px-6 py-2 rounded hover:bg-wedding-700 font-serif shadow-md flex items-center gap-2">
                            <Save size={16} /> Salvar Capa
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
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className={inputClass}
                    />
                    <button className="bg-wedding-600 text-white px-4 rounded hover:bg-wedding-700">OK</button>
                 </div>
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
                <form onSubmit={handleGiftSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                  <div className="flex gap-2">
                     <button type="submit" className="bg-wedding-800 text-white p-2 rounded hover:bg-wedding-700 font-serif h-[42px] flex-1">
                        {editingGiftId ? 'Atualizar' : 'Adicionar'}
                     </button>
                     {editingGiftId && (
                         <button type="button" onClick={cancelEditGift} className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 font-serif h-[42px]">
                            Cancelar
                         </button>
                     )}
                  </div>
                  <div className="md:col-span-4">
                     <label className="block text-xs font-bold text-wedding-600 uppercase mb-1">Descrição</label>
                     <input 
                      type="text"
                      value={newGift.description}
                      onChange={e => setNewGift({...newGift, description: e.target.value})}
                      className={inputClass}
                    />
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
                      <tr key={gift.id} className={editingGiftId === gift.id ? "bg-wedding-50" : ""}>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-wedding-800 font-bold">
                            {gift.buyerName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                          {gift.status !== 'confirmed' && (
                              <button 
                                onClick={() => { if(confirm("Confirmar que recebeu o pagamento?")) confirmGiftPayment(gift.id) }}
                                className="text-green-600 hover:text-green-800 mr-2" 
                                title="Confirmar Recebimento"
                              >
                                <CheckCircle size={20} />
                              </button>
                          )}
                          <button onClick={() => handleEditGift(gift)} className="text-blue-500 hover:text-blue-700" title="Editar">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => removeGift(gift.id)} className="text-red-500 hover:text-red-700" title="Excluir">
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

          {/* MESSAGES TAB (NEW) */}
          {activeTab === 'messages' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {messages.length === 0 && <p className="text-gray-500 col-span-3 text-center">Nenhum recado ainda.</p>}
                  {messages.map(msg => (
                      <div key={msg.id} className="bg-white border border-wedding-200 rounded p-4 relative">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h4 className="font-bold text-wedding-800">{msg.author}</h4>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock size={10} /> {new Date(msg.createdAt).toLocaleDateString()}
                                  </span>
                              </div>
                              <button onClick={() => { if(confirm("Apagar mensagem?")) deleteMessage(msg.id) }} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                          <div className="bg-gray-100 rounded overflow-hidden">
                              {msg.type === 'video' ? (
                                  <video src={msg.content} controls className="w-full h-40 object-cover" />
                              ) : (
                                  <div className="p-4 flex items-center justify-center">
                                      <audio src={msg.content} controls className="w-full" />
                                  </div>
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

          {/* PAGES & AI */}
          {activeTab === 'pages' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* List of Pages */}
               <div className="space-y-4">
                 <h3 className="text-xl font-serif text-wedding-800 mb-4">Gerenciar Páginas</h3>
                 {pages.map(page => (
                   <div key={page.id} className={`bg-white p-4 rounded border flex justify-between items-center shadow-sm transition-all ${page.isVisible ? 'border-wedding-200 opacity-100' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-wedding-800">{page.title}</h4>
                            {!page.isVisible && <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-1 rounded">Oculta</span>}
                        </div>
                        <span className="text-xs text-wedding-500 font-mono bg-wedding-100 px-1 rounded">{page.slug}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                         <div className="flex items-center mr-2">
                            <input 
                                type="checkbox" 
                                id={`vis-${page.id}`}
                                checked={page.isVisible} 
                                onChange={() => togglePageVisibility(page.id, page.isVisible)}
                                className="hidden"
                            />
                            <label htmlFor={`vis-${page.id}`} className="cursor-pointer text-wedding-600 hover:text-wedding-800 p-2">
                                {page.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                            </label>
                         </div>
                         {!page.isSystem && (
                           <button onClick={() => removePage(page.id)} className="text-red-400 hover:text-red-600 p-2">
                             <Trash2 size={18} />
                           </button>
                         )}
                      </div>
                   </div>
                 ))}
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
    </div>
  );
};