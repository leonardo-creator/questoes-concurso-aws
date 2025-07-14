'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { FiltrosComponent } from '@/components/estudar/FiltrosComponent';
import { QuestaoComponent } from '@/components/estudar/QuestaoComponent';
import { Header } from '@/components/layout/Header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { 
  Questao, 
  FiltroQuestoes, 
  OrdenacaoQuestoes, 
  CadernoPersonalizado,
  IndiceDisciplinas,
  IndiceBancas,
  IndiceAnos
} from '@/types';

export function EstudarClient() {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, adicionarAcao } = useOffline();
  
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [questaoAtual, setQuestaoAtual] = useState<Questao | null>(null);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState<FiltroQuestoes>({});
  const [ordenacao, setOrdenacao] = useState<OrdenacaoQuestoes>('relevancia');
  
  // Dados para os filtros
  const [indices, setIndices] = useState<{
    disciplinas: IndiceDisciplinas;
    bancas: IndiceBancas;
    anos: IndiceAnos;
  }>({
    disciplinas: [],
    bancas: [],
    anos: [],
  });
  
  const [cadernos, setCadernos] = useState<CadernoPersonalizado[]>([]);
  const [totalQuestoes, setTotalQuestoes] = useState(0);

  // Carregar índices na inicialização
  useEffect(() => {
    carregarIndices();
  }, []);

  // Carregar cadernos do usuário
  useEffect(() => {
    if (user) {
      carregarCadernos();
    }
  }, [user]);

  // Carregar questões quando filtros ou ordenação mudarem
  useEffect(() => {
    carregarQuestoes();
  }, [filtros, ordenacao]);

  const carregarIndices = async () => {
    try {
      const [disciplinasRes, bancasRes, anosRes] = await Promise.all([
        fetch('/data/indices/disciplinas.json'),
        fetch('/data/indices/bancas.json'),
        fetch('/data/indices/anos.json'),
      ]);

      const [disciplinas, bancas, anos] = await Promise.all([
        disciplinasRes.json(),
        bancasRes.json(),
        anosRes.json(),
      ]);

      setIndices({ disciplinas, bancas, anos });
    } catch (error) {
      console.error('Erro ao carregar índices:', error);
    }
  };

  const carregarCadernos = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/user/lists');
      if (response.ok) {
        const data = await response.json();
        setCadernos(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar cadernos:', error);
    }
  };

  const carregarQuestoes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        ordenacao,
        ...Object.entries(filtros).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              acc[key] = value.join(',');
            } else {
              acc[key] = String(value);
            }
          }
          return acc;
        }, {} as Record<string, string>),
      });

      const response = await fetch(`/api/questoes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQuestoes(data.data || []);
        setTotalQuestoes(data.total || 0);
        setIndiceAtual(0);
        setQuestaoAtual(data.data?.[0] || null);
      }
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
    } finally {
      setLoading(false);
    }
  };

  const navegarQuestao = (direcao: 'anterior' | 'proxima') => {
    let novoIndice = indiceAtual;
    
    if (direcao === 'anterior' && indiceAtual > 0) {
      novoIndice = indiceAtual - 1;
    } else if (direcao === 'proxima' && indiceAtual < questoes.length - 1) {
      novoIndice = indiceAtual + 1;
    }

    setIndiceAtual(novoIndice);
    setQuestaoAtual(questoes[novoIndice]);
  };

  const handleResposta = async (alternativa: string) => {
    if (!questaoAtual || !user) return;

    const respostaCorreta = questaoAtual.resposta;
    const acertou = alternativa === respostaCorreta;

    const dadosResposta = {
      questaoCodigoReal: questaoAtual.codigo_real,
      alternativaSelecionada: alternativa,
      acertou,
      tempoResposta: 0, // Implementar cronômetro se necessário
    };

    if (isOnline) {
      try {
        await fetch('/api/user/answers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dadosResposta),
        });
      } catch (error) {
        console.error('Erro ao salvar resposta:', error);
        // Adicionar à fila offline
        adicionarAcao({
          tipo: 'resposta',
          dados: dadosResposta,
        });
      }
    } else {
      // Adicionar à fila offline
      adicionarAcao({
        tipo: 'resposta',
        dados: dadosResposta,
      });
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <p className="text-gray-600 mb-4">
            Você precisa estar logado para acessar as questões.
          </p>
          <a 
            href="/auth/signin" 
            className="btn-primary"
          >
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar com filtros */}
          <div className="lg:col-span-1">
            <FiltrosComponent
              filtros={filtros}
              onFiltrosChange={setFiltros}
              indices={indices}
              cadernos={cadernos}
            />
            
            {/* Estatísticas */}
            <div className="filtro-container mt-4">
              <h3 className="font-semibold mb-2">Estatísticas</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total encontrado:</span>
                  <span className="font-medium">{totalQuestoes}</span>
                </div>
                <div className="flex justify-between">
                  <span>Questão atual:</span>
                  <span className="font-medium">
                    {questoes.length > 0 ? indiceAtual + 1 : 0} de {questoes.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Área principal da questão */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : questaoAtual ? (
              <div>
                <QuestaoComponent
                  questao={questaoAtual}
                  onResposta={handleResposta}
                />
                
                {/* Navegação */}
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={() => navegarQuestao('anterior')}
                    disabled={indiceAtual === 0}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Anterior
                  </button>
                  
                  <div className="text-sm text-gray-600">
                    Questão {indiceAtual + 1} de {questoes.length}
                  </div>
                  
                  <button
                    onClick={() => navegarQuestao('proxima')}
                    disabled={indiceAtual >= questoes.length - 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            ) : (
              <div className="questao-container text-center">
                <h2 className="text-xl font-semibold mb-4">Nenhuma questão encontrada</h2>
                <p className="text-gray-600">
                  Tente ajustar os filtros para encontrar questões.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
