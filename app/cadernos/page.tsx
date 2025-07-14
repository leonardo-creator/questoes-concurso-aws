'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Banca {
  nome: string;
  sigla: string;
  descricao: string;
}

interface Stats {
  totalQuestoes: number;
  totalBancas: number;
  totalAnos: number;
  totalDisciplinas: number;
  totalOrgaos: number;
  totalCargos: number;
  totalAssuntos: number;
  atualizadoEm: string;
}

export default function CadernosPage() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [bancasRes, anosRes, disciplinasRes, statsRes] = await Promise.all([
          fetch('/data/indices/bancas.json'),
          fetch('/data/indices/anos.json'),
          fetch('/data/indices/disciplinas.json'),
          fetch('/data/indices/stats.json')
        ]);

        if (!bancasRes.ok || !anosRes.ok || !disciplinasRes.ok || !statsRes.ok) {
          throw new Error('Erro ao carregar dados');
        }

        const [bancasData, anosData, disciplinasData, statsData] = await Promise.all([
          bancasRes.json(),
          anosRes.json(),
          disciplinasRes.json(),
          statsRes.json()
        ]);

        setBancas(bancasData);
        setAnos(anosData);
        setDisciplinas(disciplinasData);
        setStats(statsData);
      } catch (err) {
        setError('Erro ao carregar os dados dos cadernos');
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cadernos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Erro</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Questões de Concurso
              </Link>
            </div>
            <nav className="flex space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Início
              </Link>
              <Link href="/cadernos" className="text-blue-600 font-medium">
                Cadernos
              </Link>
              <Link href="/estudar" className="text-gray-600 hover:text-gray-900">
                Estudar
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Cadernos de Questões</h1>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalQuestoes.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Questões</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.totalBancas}</div>
                <div className="text-sm text-gray-600">Bancas</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.totalDisciplinas}</div>
                <div className="text-sm text-gray-600">Disciplinas</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.totalAnos}</div>
                <div className="text-sm text-gray-600">Anos</div>
              </div>
            </div>
          </div>
        )}

        {/* Grid de Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bancas */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Bancas ({bancas.length})
            </h2>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {bancas.slice(0, 20).map((banca) => (
                <div key={`${banca.sigla}-${banca.nome}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{banca.sigla}</div>
                    <div className="text-xs text-gray-500 truncate" title={banca.nome}>
                      {banca.nome}
                    </div>
                  </div>
                  <Link 
                    href={`/estudar?banca=${encodeURIComponent(banca.sigla)}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Ver →
                  </Link>
                </div>
              ))}
              {bancas.length > 20 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  + {bancas.length - 20} bancas...
                </div>
              )}
            </div>
          </div>

          {/* Anos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Anos ({anos.length})
            </h2>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {anos.slice(0, 21).map((ano) => (
                  <Link
                    key={ano}
                    href={`/estudar?ano=${ano}`}
                    className="text-center p-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded font-medium text-sm transition-colors"
                  >
                    {ano}
                  </Link>
                ))}
              </div>
              {anos.length > 21 && (
                <div className="text-center text-sm text-gray-500 pt-4">
                  + {anos.length - 21} anos...
                </div>
              )}
            </div>
          </div>

          {/* Disciplinas */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Disciplinas ({disciplinas.length})
            </h2>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {disciplinas.slice(0, 20).map((disciplina) => (
                <div key={disciplina} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="font-medium text-sm text-gray-900 truncate" title={disciplina}>
                    {disciplina}
                  </div>
                  <Link 
                    href={`/estudar?disciplina=${encodeURIComponent(disciplina)}`}
                    className="text-blue-600 hover:text-blue-800 text-sm ml-2"
                  >
                    Ver →
                  </Link>
                </div>
              ))}
              {disciplinas.length > 20 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  + {disciplinas.length - 20} disciplinas...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Pronto para começar a estudar?</h2>
          <p className="text-blue-100 mb-6">
            Escolha suas preferências e comece a resolver questões personalizadas para seu concurso
          </p>
          <Link 
            href="/estudar"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Começar a Estudar
          </Link>
        </div>

        {/* Footer da página */}
        {stats && (
          <div className="mt-8 text-center text-sm text-gray-500">
            Dados atualizados em: {new Date(stats.atualizadoEm).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </main>
    </div>
  );
}
