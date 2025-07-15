'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface EstatisticaMateria {
  materia: string;
  assunto?: string;
  total: number;
  corretas: number;
  incorretas: number;
  naoRespondidas: number;
  percentualAcerto: number;
  tempoMedio: number; // em segundos
  ultimaResposta: string;
}

interface EstatisticasGerais {
  totalQuestoes: number;
  totalRespondidas: number;
  totalCorretas: number;
  percentualGeralAcerto: number;
  tempoTotalEstudo: number;
  sequenciaAtual: number;
  melhorSequencia: number;
  materiasFracas: EstatisticaMateria[];
  materiasFortes: EstatisticaMateria[];
  progressoDiario: Array<{
    data: string;
    questoesRespondidas: number;
    percentualAcerto: number;
  }>;
}

export default function EstatisticasPage() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroTempo, setFiltroTempo] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    carregarEstatisticas();
  }, [filtroTempo]);

  const carregarEstatisticas = async () => {
    try {
      setLoading(true);
      
      // Verificar se estamos no ambiente de build
      if (typeof window === 'undefined') {
        // Durante o build, definir dados mock
        setEstatisticas({
          totalQuestoes: 0,
          totalRespondidas: 0,
          totalCorretas: 0,
          percentualGeralAcerto: 0,
          tempoTotalEstudo: 0,
          sequenciaAtual: 0,
          melhorSequencia: 0,
          materiasFracas: [],
          materiasFortes: [],
          progressoDiario: []
        });
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/estatisticas?periodo=${filtroTempo}`);
      const data = await response.json();
      
      if (data.success) {
        setEstatisticas(data.estatisticas);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarTempo = (segundos: number): string => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    return `${horas}h ${minutos}m`;
  };

  const obterCorPorPercentual = (percentual: number): string => {
    if (percentual >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentual >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Analisando seu desempenho...</p>
        </div>
      </div>
    );
  }

  if (!estatisticas) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p>Erro ao carregar estatísticas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Suas Estatísticas de Estudo
          </h1>
          <p className="text-gray-600">Analise seu desempenho e identifique pontos de melhoria</p>
          
          {/* Filtros de Tempo */}
          <div className="flex gap-2 mt-4">
            {[
              { value: '7d', label: 'Últimos 7 dias' },
              { value: '30d', label: 'Últimos 30 dias' },
              { value: '90d', label: 'Últimos 90 dias' },
              { value: 'all', label: 'Todo período' }
            ].map((filtro) => (
              <button
                key={filtro.value}
                onClick={() => setFiltroTempo(filtro.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTempo === filtro.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxa de Acerto</p>
                  <p className="text-3xl font-bold text-green-600">
                    {estatisticas.percentualGeralAcerto.toFixed(1)}%
                  </p>
                </div>
                <div className="text-2xl">🏆</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Questões Respondidas</p>
                  <p className="text-3xl font-bold text-blue-600">{estatisticas.totalRespondidas}</p>
                  <p className="text-sm text-gray-500">de {estatisticas.totalQuestoes}</p>
                </div>
                <div className="text-2xl">📊</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tempo de Estudo</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatarTempo(estatisticas.tempoTotalEstudo)}
                  </p>
                </div>
                <div className="text-2xl">⏰</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Melhor Sequência</p>
                  <p className="text-3xl font-bold text-orange-600">{estatisticas.melhorSequencia}</p>
                  <p className="text-sm text-gray-500">atual: {estatisticas.sequenciaAtual}</p>
                </div>
                <div className="text-2xl">🔥</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="materias" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="materias">Matérias</TabsTrigger>
            <TabsTrigger value="progresso">Progresso Diário</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="materias" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pontos Fracos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    ⚠️ Pontos Fracos (Foco Aqui!)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {estatisticas.materiasFracas.slice(0, 5).map((materia) => (
                      <div key={`fraca-${materia.materia}-${materia.assunto || 'geral'}`} className="border rounded-lg p-4 bg-red-50 border-red-200">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{materia.materia}</h3>
                          <Badge variant="destructive">
                            {materia.percentualAcerto.toFixed(1)}%
                          </Badge>
                        </div>
                        {materia.assunto && (
                          <p className="text-sm text-gray-600 mb-2">{materia.assunto}</p>
                        )}
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>{materia.corretas}/{materia.total} corretas</span>
                          <span>Tempo médio: {formatarTempo(materia.tempoMedio)}</span>
                        </div>
                        <Progress 
                          value={materia.percentualAcerto} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pontos Fortes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    🏆 Pontos Fortes (Continue Assim!)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {estatisticas.materiasFortes.slice(0, 5).map((materia) => (
                      <div key={`forte-${materia.materia}-${materia.assunto || 'geral'}`} className="border rounded-lg p-4 bg-green-50 border-green-200">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{materia.materia}</h3>
                          <Badge className="bg-green-600">
                            {materia.percentualAcerto.toFixed(1)}%
                          </Badge>
                        </div>
                        {materia.assunto && (
                          <p className="text-sm text-gray-600 mb-2">{materia.assunto}</p>
                        )}
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>{materia.corretas}/{materia.total} corretas</span>
                          <span>Tempo médio: {formatarTempo(materia.tempoMedio)}</span>
                        </div>
                        <Progress 
                          value={materia.percentualAcerto} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progresso" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📈 Progresso Diário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {estatisticas.progressoDiario.map((dia) => (
                    <div key={`progresso-${dia.data}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{new Date(dia.data).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">{dia.questoesRespondidas} questões</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${obterCorPorPercentual(dia.percentualAcerto)}`}>
                          {dia.percentualAcerto.toFixed(1)}%
                        </p>
                        <Progress value={dia.percentualAcerto} className="w-20 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Recomendações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Foque nos Pontos Fracos</h4>
                      <p className="text-sm text-blue-700">
                        Dedique 60% do seu tempo às matérias com menor performance. 
                        Sua taxa de acerto geral pode aumentar significativamente.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Otimize seu Tempo</h4>
                      <p className="text-sm text-purple-700">
                        Matérias com tempo médio muito alto podem indicar dificuldade conceitual. 
                        Considere revisar a teoria antes de praticar.
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Mantenha a Consistência</h4>
                      <p className="text-sm text-green-700">
                        Estudar um pouco todos os dias é melhor que maratonas esporádicas. 
                        Tente manter uma rotina diária.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🚀 Metas Sugeridas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Meta Semanal</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Aumentar taxa de acerto em 5% nas 3 matérias mais fracas
                      </p>
                      <Progress value={75} className="h-2" />
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Meta Mensal</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Atingir 80% de acerto geral e responder 500 questões
                      </p>
                      <Progress value={60} className="h-2" />
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Meta de Consistência</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Estudar pelo menos 30 questões por dia durante 21 dias
                      </p>
                      <Progress value={85} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
