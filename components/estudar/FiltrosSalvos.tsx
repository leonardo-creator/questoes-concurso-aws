'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { FiltroQuestoes } from '@/types';

interface FiltroSalvo {
  id: string;
  nome: string;
  descricao?: string;
  filtros: FiltroQuestoes;
  favorito: boolean;
  criadoEm: string;
  totalQuestoes?: number;
}

interface FiltrosSalvosProps {
  filtrosAtuais: FiltroQuestoes;
  onAplicarFiltro: (filtros: FiltroQuestoes) => void;
  onSalvarFiltro?: (filtro: Omit<FiltroSalvo, 'id' | 'criadoEm'>) => Promise<void>;
}

export function FiltrosSalvos({ filtrosAtuais, onAplicarFiltro, onSalvarFiltro }: FiltrosSalvosProps) {
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvandoFiltro, setSalvandoFiltro] = useState(false);
  const [novoFiltroNome, setNovoFiltroNome] = useState('');
  const [novoFiltroDescricao, setNovoFiltroDescricao] = useState('');
  const [mostrarFormSalvar, setMostrarFormSalvar] = useState(false);

  // Carregar filtros salvos
  useEffect(() => {
    carregarFiltrosSalvos();
  }, []);

  const carregarFiltrosSalvos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/saved-filters');
      if (response.ok) {
        const data = await response.json();
        setFiltrosSalvos(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar filtros salvos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Salvar novo filtro
  const handleSalvarFiltro = async () => {
    if (!novoFiltroNome.trim() || !onSalvarFiltro) return;

    setSalvandoFiltro(true);
    try {
      await onSalvarFiltro({
        nome: novoFiltroNome.trim(),
        descricao: novoFiltroDescricao.trim() || undefined,
        filtros: filtrosAtuais,
        favorito: false,
      });

      setNovoFiltroNome('');
      setNovoFiltroDescricao('');
      setMostrarFormSalvar(false);
      await carregarFiltrosSalvos();
    } catch (error) {
      console.error('Erro ao salvar filtro:', error);
    } finally {
      setSalvandoFiltro(false);
    }
  };

  // Excluir filtro
  const handleExcluirFiltro = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este filtro?')) return;

    try {
      const response = await fetch(`/api/user/saved-filters/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await carregarFiltrosSalvos();
      }
    } catch (error) {
      console.error('Erro ao excluir filtro:', error);
    }
  };

  // Alternar favorito
  const handleToggleFavorito = async (id: string, favorito: boolean) => {
    try {
      const response = await fetch(`/api/user/saved-filters/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favorito: !favorito }),
      });
      
      if (response.ok) {
        await carregarFiltrosSalvos();
      }
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
    }
  };

  // Formatar resumo do filtro
  const formatarResumoFiltro = (filtros: FiltroQuestoes): string => {
    const resumo: string[] = [];

    if (filtros.disciplinas?.length) {
      resumo.push(`${filtros.disciplinas.length} disciplina(s)`);
    }
    if (filtros.bancas?.length) {
      resumo.push(`${filtros.bancas.length} banca(s)`);
    }
    if (filtros.anos?.length) {
      resumo.push(`${filtros.anos.length} ano(s)`);
    }
    if (filtros.codigosPersonalizados?.length) {
      resumo.push(`${filtros.codigosPersonalizados.length} código(s)`);
    }
    if (filtros.cadernoId) {
      resumo.push('caderno específico');
    }

    return resumo.length > 0 ? resumo.join(', ') : 'Sem filtros específicos';
  };

  // Verificar se há filtros ativos para salvar
  const temFiltrosAtivos = Object.values(filtrosAtuais).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });

  // Ordenar filtros (favoritos primeiro, depois por data)
  const filtrosOrdenados = [...filtrosSalvos].sort((a, b) => {
    if (a.favorito && !b.favorito) return -1;
    if (!a.favorito && b.favorito) return 1;
    return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Filtros Salvos</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFormSalvar(!mostrarFormSalvar)}
            disabled={!temFiltrosAtivos}
          >
            💾 Salvar Atual
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Formulário para salvar novo filtro */}
        {mostrarFormSalvar && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Nome do filtro *
              </label>
              <Input
                value={novoFiltroNome}
                onChange={(e) => setNovoFiltroNome(e.target.value)}
                placeholder="Ex: Questões de Direito Constitucional"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Descrição (opcional)
              </label>
              <Input
                value={novoFiltroDescricao}
                onChange={(e) => setNovoFiltroDescricao(e.target.value)}
                placeholder="Descrição adicional do filtro..."
                className="w-full"
              />
            </div>

            <div className="text-sm text-blue-700 bg-white p-2 rounded border">
              <strong>Resumo:</strong> {formatarResumoFiltro(filtrosAtuais)}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSalvarFiltro}
                disabled={!novoFiltroNome.trim() || salvandoFiltro}
                size="sm"
              >
                {salvandoFiltro ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarFormSalvar(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de filtros salvos */}
        {loading ? (
          <div className="text-center py-4 text-gray-500">
            Carregando filtros salvos...
          </div>
        ) : filtrosOrdenados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">📁</div>
            <div className="text-sm">Nenhum filtro salvo ainda</div>
            <div className="text-xs mt-1">Configure filtros e salve para reutilizar</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrosOrdenados.map((filtro) => (
              <div
                key={filtro.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{filtro.nome}</h4>
                      {filtro.favorito && (
                        <Badge variant="warning" className="text-xs">⭐</Badge>
                      )}
                    </div>
                    {filtro.descricao && (
                      <p className="text-sm text-gray-600 mt-1">{filtro.descricao}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorito(filtro.id, filtro.favorito)}
                      className="h-8 w-8 p-0"
                    >
                      {filtro.favorito ? '⭐' : '☆'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluirFiltro(filtro.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  {formatarResumoFiltro(filtro.filtros)}
                  {filtro.totalQuestoes && (
                    <span className="ml-2">• {filtro.totalQuestoes} questões</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-400">
                    Criado em {new Date(filtro.criadoEm).toLocaleDateString('pt-BR')}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAplicarFiltro(filtro.filtros)}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
