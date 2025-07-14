'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface EstatisticasEstudoProps {
  totalQuestoes: number;
  indiceAtual: number;
  questoesTotais: number;
  filtrosAtivos: number;
}

interface EstatisticasUsuario {
  totalRespondidas: number;
  totalAcertos: number;
  percentualAcertos: number;
  sessoesEstudo: number;
  ultimaSessionData: Date | null;
}

export function EstatisticasEstudo({ 
  totalQuestoes, 
  indiceAtual, 
  questoesTotais,
  filtrosAtivos 
}: EstatisticasEstudoProps) {
  const [estatisticas, setEstatisticas] = useState<EstatisticasUsuario | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setEstatisticas(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(1)}%`;
  };

  const formatarData = (data: Date | null) => {
    if (!data) return 'Nunca';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-4">
      {/* Estatísticas da sessão atual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sessão Atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Questões encontradas:</span>
            <Badge variant="default">{totalQuestoes}</Badge>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Posição atual:</span>
            <span className="font-medium">
              {questoesTotais > 0 ? indiceAtual + 1 : 0} de {questoesTotais}
            </span>
          </div>
          
          {questoesTotais > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((indiceAtual + 1) / questoesTotais) * 100}%` }}
              />
            </div>
          )}

          {filtrosAtivos > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Filtros ativos:</span>
              <Badge variant="secondary">{filtrosAtivos}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas gerais do usuário */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Seu Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-4">
              Carregando estatísticas...
            </div>
          ) : estatisticas ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total respondidas:</span>
                <span className="font-medium">{estatisticas.totalRespondidas}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Acertos:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{estatisticas.totalAcertos}</span>
                  <Badge 
                    variant={estatisticas.percentualAcertos >= 70 ? "success" : 
                            estatisticas.percentualAcertos >= 50 ? "warning" : "destructive"}
                  >
                    {formatarPercentual(estatisticas.percentualAcertos)}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sessões de estudo:</span>
                <span className="font-medium">{estatisticas.sessoesEstudo}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Último estudo:</span>
                <span className="font-medium text-xs">
                  {formatarData(estatisticas.ultimaSessionData)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500 py-4">
              Comece a responder questões para ver suas estatísticas
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dicas de estudo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">💡 Dicas</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-600 space-y-2">
          <div>• Use <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Tab</kbd> para navegar entre filtros</div>
          <div>• Salve filtros personalizados para reutilizar</div>
          <div>• Cole listas de códigos diretamente na aba "Códigos"</div>
          <div>• Ative "Não repetir respondidas" para focar em questões novas</div>
        </CardContent>
      </Card>
    </div>
  );
}
