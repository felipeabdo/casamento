import React from 'react';
import { useStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const TransparencyPage: React.FC = () => {
  const { gifts } = useStore();

  const totalGifts = gifts.reduce((acc, curr) => acc + curr.purchasedCount, 0);
  const totalValue = gifts.reduce((acc, curr) => acc + (curr.price * curr.purchasedCount), 0);

  // Prepare data for chart - Top 5 most popular gifts
  const chartData = [...gifts]
    .sort((a, b) => b.purchasedCount - a.purchasedCount)
    .slice(0, 5)
    .map(g => ({
      name: g.name.length > 15 ? g.name.substring(0, 15) + '...' : g.name,
      count: g.purchasedCount
    }));

  return (
    <div className="min-h-screen bg-wedding-50 py-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="font-script text-6xl text-wedding-800 mb-6">Transparência</h1>
          <p className="font-serif text-wedding-600 text-lg max-w-2xl mx-auto">
            Acompanhe o carinho dos nossos convidados em números.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white p-8 border border-wedding-200 shadow-sm text-center rounded-sm">
            <p className="text-wedding-500 uppercase tracking-widest text-sm font-bold mb-2">Total de Presentes Recebidos</p>
            <p className="font-serif text-6xl text-wedding-800">{totalGifts}</p>
          </div>
          <div className="bg-white p-8 border border-wedding-200 shadow-sm text-center rounded-sm">
             {/* Note: In a real scenario, you might hide the total value or make it optional */}
            <p className="text-wedding-500 uppercase tracking-widest text-sm font-bold mb-2">Valor Total Arrecadado (Estimado)</p>
            <p className="font-serif text-6xl text-wedding-800">R$ {totalValue.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Chart Section */}
        {totalGifts > 0 ? (
          <div className="bg-white p-8 border border-wedding-200 shadow-sm rounded-sm mb-16">
            <h3 className="font-serif text-2xl text-wedding-800 mb-8 text-center">Presentes Mais Populares</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#7d5e4a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#7d5e4a" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{fill: '#f2efe9'}}
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#d5c8b5', fontFamily: 'serif' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#b08d71" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-wedding-400 italic">
            Nenhum presente recebido ainda. Seja o primeiro!
          </div>
        )}

        {/* Recent Activity List (Anonymized) */}
        <div className="bg-white border border-wedding-200 shadow-sm rounded-sm">
          <div className="p-6 border-b border-wedding-100">
             <h3 className="font-serif text-xl text-wedding-800">Lista de Itens (Status)</h3>
          </div>
          <div className="divide-y divide-wedding-100">
            {gifts.map((gift) => (
              <div key={gift.id} className="p-4 flex justify-between items-center hover:bg-wedding-50 transition">
                <div className="flex items-center gap-4">
                  <img src={gift.imageUrl} alt={gift.name} className="w-12 h-12 object-cover rounded-sm" />
                  <div>
                    <p className="font-medium text-wedding-800">{gift.name}</p>
                    <p className="text-xs text-wedding-500">R$ {gift.price}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gift.purchasedCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {gift.purchasedCount} comprados
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};