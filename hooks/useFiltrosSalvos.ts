import { useState, useEffect } from 'react';
import type { FiltroQuestoes } from '@/types';

interface FiltroSalvo {
  id: string;
  nome: string;
  descricao?: string;
  filtros: FiltroQuestoes;
  favorito: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseFiltrosSalvosResult {
  filtrosSalvos: FiltroSalvo[];
  loading: boolean;
  error: string | null;
  salvarFiltro: (nome: string, filtros: FiltroQuestoes, descricao?: string) => Promise<boolean>;
  carregarFiltro: (id: string) => FiltroSalvo | null;
  excluirFiltro: (id: string) => Promise<boolean>;
  toggleFavorito: (id: string) => Promise<boolean>;
  recarregarFiltros: () => Promise<void>;
}

export function useFiltrosSalvos(): UseFiltrosSalvosResult {
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar filtros salvos do servidor
  const carregarFiltrosSalvos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/filtros-salvos');
      const data = await response.json();

      if (data.success) {
        setFiltrosSalvos(data.data || []);
      } else {
        setError(data.error || 'Erro ao carregar filtros salvos');
      }
    } catch (err) {
      console.error('Erro ao carregar filtros salvos:', err);
      setError('Erro de conexão ao carregar filtros');
    } finally {
      setLoading(false);
    }
  };

  // Salvar novo filtro
  const salvarFiltro = async (
    nome: string, 
    filtros: FiltroQuestoes, 
    descricao?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/filtros-salvos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          filtros,
          descricao
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Recarregar lista de filtros
        await carregarFiltrosSalvos();
        return true;
      } else {
        setError(data.error || 'Erro ao salvar filtro');
        return false;
      }
    } catch (err) {
      console.error('Erro ao salvar filtro:', err);
      setError('Erro de conexão ao salvar filtro');
      return false;
    }
  };

  // Carregar filtro específico pelo ID
  const carregarFiltro = (id: string): FiltroSalvo | null => {
    return filtrosSalvos.find(f => f.id === id) || null;
  };

  // Excluir filtro
  const excluirFiltro = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/filtros-salvos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        // Remover da lista local
        setFiltrosSalvos(prev => prev.filter(f => f.id !== id));
        return true;
      } else {
        setError(data.error || 'Erro ao excluir filtro');
        return false;
      }
    } catch (err) {
      console.error('Erro ao excluir filtro:', err);
      setError('Erro de conexão ao excluir filtro');
      return false;
    }
  };

  // Alternar favorito
  const toggleFavorito = async (id: string): Promise<boolean> => {
    try {
      const filtro = filtrosSalvos.find(f => f.id === id);
      if (!filtro) return false;

      const response = await fetch('/api/filtros-salvos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          favorito: !filtro.favorito
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar estado local
        setFiltrosSalvos(prev => 
          prev.map(f => 
            f.id === id ? { ...f, favorito: !f.favorito } : f
          )
        );
        return true;
      } else {
        setError(data.error || 'Erro ao atualizar favorito');
        return false;
      }
    } catch (err) {
      console.error('Erro ao atualizar favorito:', err);
      setError('Erro de conexão ao atualizar favorito');
      return false;
    }
  };

  // Recarregar filtros manualmente
  const recarregarFiltros = async () => {
    await carregarFiltrosSalvos();
  };

  // Carregar filtros na inicialização
  useEffect(() => {
    carregarFiltrosSalvos();
  }, []);

  return {
    filtrosSalvos,
    loading,
    error,
    salvarFiltro,
    carregarFiltro,
    excluirFiltro,
    toggleFavorito,
    recarregarFiltros,
  };
}
