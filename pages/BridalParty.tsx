import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Navigate } from 'react-router-dom';
import { Star, Info } from 'lucide-react';
import { Guest } from '../types';

export const BridalParty: React.FC = () => {
  const { currentGuest, isAuthenticated, settings, guests } = useStore();

  const canView = !!currentGuest || isAuthenticated;

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  // Categories to include
  const categoriesToInclude = [
    'Padrinho', 'Madrinha', 'Padrinhos', 'Madrinhas', 'Demoiselle', 
    'Mãe da Noiva', 'Pai da Noiva', 'Mãe do Noivo', 'Pai do Noivo',
    'Pais da Noiva', 'Pais do Noivo'
  ];

  const getDressCode = (category: string) => {
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
      default:
        return null;
    }
  };

  const categorizedGuests = useMemo(() => {
    const categories: Record<string, Guest[]> = {};
    guests.forEach(g => {
      if (g.category && categoriesToInclude.includes(g.category)) {
        if (!categories[g.category]) categories[g.category] = [];
        categories[g.category].push(g);
      }
    });

    // Sort guests in each category by name
    Object.values(categories).forEach(list => {
      list.sort((a, b) => a.name.localeCompare(b.name));
    });

    return categories;
  }, [guests]);

  const orderedCategories = [
    'Padrinhos', 'Madrinhas', 'Padrinho', 'Madrinha', 'Demoiselle', 
    'Mãe da Noiva', 'Pai da Noiva', 'Pais da Noiva',
    'Mãe do Noivo', 'Pai do Noivo', 'Pais do Noivo'
  ];

  return (
    <div className="pt-24 pb-20 min-h-screen bg-wedding-50">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <Star className="w-12 h-12 text-wedding-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-serif text-wedding-800 mb-4 tracking-tight">Padrinhos & Convidados Especiais</h1>
          <p className="text-wedding-600 max-w-2xl mx-auto">
            Homenageamos aqui aqueles que têm um papel muito especial na nossa história.
          </p>
        </div>

        <div className="space-y-16">
          {orderedCategories.map(cat => {
            if (!categorizedGuests[cat] || categorizedGuests[cat].length === 0) return null;
            const dressCode = getDressCode(cat);

            return (
              <div key={cat} className="bg-white rounded-2xl p-8 shadow-sm border border-wedding-100">
                <h2 className="text-2xl font-serif text-wedding-800 mb-6 pb-4 border-b border-wedding-100">{cat}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Dress Code info */}
                  {dressCode && (
                    <div className="bg-wedding-50 p-6 rounded-xl border border-wedding-100 h-fit">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white rounded-full text-wedding-800 shadow-sm">
                          <Info size={20} />
                        </div>
                        <h3 className="font-serif text-lg text-wedding-800">Traje & Cores</h3>
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
                  )}

                  {/* Guest List */}
                  <div>
                    <h3 className="font-serif text-lg text-wedding-800 mb-4">Nossos Queridos:</h3>
                    <ul className="space-y-2">
                      {categorizedGuests[cat].map(g => (
                        <li key={g.id} className="text-wedding-700 text-lg flex items-center gap-2">
                          <Star size={14} className="text-wedding-400" />
                          {g.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
