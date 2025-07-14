import { useState } from 'react';
import type { FiltroQuestoes } from '@/types';

interface QuestaoOffline {
  codigo_real: string;
  enunciado: string;
  disciplina_real: string;
  assunto_real: string;
  banca_sigla: string;
  banca_nome: string;
  ano: number;
  dificuldade: string;
  gabarito_letra: string;
  anulada: boolean;
  desatualizada: boolean;
  itens: any[];
  timestamp_download: string;
  filtros_aplicados: FiltroQuestoes;
}

interface PackoteOffline {
  questoes: QuestaoOffline[];
  total: number;
  timestamp: string;
  filtros: FiltroQuestoes;
}

interface UseDownloadOfflineResult {
  downloading: boolean;
  progress: number;
  error: string | null;
  downloadQuestoes: (filtros: FiltroQuestoes, limite?: number) => Promise<boolean>;
  salvarOffline: (packote: PackoteOffline, nome: string) => boolean;
  carregarOffline: (nome: string) => PackoteOffline | null;
  listarOffline: () => string[];
  excluirOffline: (nome: string) => boolean;
  limparTodosOffline: () => void;
}

const STORAGE_KEY_PREFIX = 'questoes_offline_';
const STORAGE_INDEX_KEY = 'questoes_offline_index';

export function useDownloadOffline(): UseDownloadOfflineResult {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Download de questões do servidor
  const downloadQuestoes = async (
    filtros: FiltroQuestoes, 
    limite: number = 500
  ): Promise<boolean> => {
    try {
      setDownloading(true);
      setProgress(0);
      setError(null);

      const response = await fetch('/api/questoes/download-offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filtros,
          limite
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProgress(100);
        
        // Gerar nome automático para o download
        const timestamp = new Date().toLocaleString('pt-BR');
        const nomeAuto = `Download_${timestamp.replace(/[/\s:]/g, '_')}`;
        
        // Salvar no localStorage
        const sucesso = salvarOffline(data.data, nomeAuto);
        
        if (sucesso) {
          console.log(`Download offline concluído: ${data.data.total} questões salvas como "${nomeAuto}"`);
          return true;
        } else {
          setError('Erro ao salvar questões offline');
          return false;
        }
      } else {
        setError(data.error || 'Erro no download');
        return false;
      }
    } catch (err) {
      console.error('Erro no download offline:', err);
      setError('Erro de conexão durante o download');
      return false;
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  // Salvar packote offline no localStorage
  const salvarOffline = (packote: PackoteOffline, nome: string): boolean => {
    try {
      // Verificar espaço disponível
      const packoteString = JSON.stringify(packote);
      const tamanhoMB = new Blob([packoteString]).size / (1024 * 1024);
      
      if (tamanhoMB > 50) { // Limite de 50MB por packote
        setError('Packote muito grande (máximo 50MB)');
        return false;
      }

      // Salvar o packote
      const chave = STORAGE_KEY_PREFIX + nome;
      localStorage.setItem(chave, packoteString);

      // Atualizar índice
      const indice = listarOffline();
      if (!indice.includes(nome)) {
        indice.push(nome);
        localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(indice));
      }

      return true;
    } catch (err) {
      console.error('Erro ao salvar offline:', err);
      setError('Erro ao salvar no dispositivo (espaço insuficiente?)');
      return false;
    }
  };

  // Carregar packote offline do localStorage
  const carregarOffline = (nome: string): PackoteOffline | null => {
    try {
      const chave = STORAGE_KEY_PREFIX + nome;
      const dados = localStorage.getItem(chave);
      
      if (!dados) {
        return null;
      }

      return JSON.parse(dados) as PackoteOffline;
    } catch (err) {
      console.error('Erro ao carregar offline:', err);
      return null;
    }
  };

  // Listar todos os packotes offline
  const listarOffline = (): string[] => {
    try {
      const indice = localStorage.getItem(STORAGE_INDEX_KEY);
      return indice ? JSON.parse(indice) : [];
    } catch (err) {
      console.error('Erro ao listar offline:', err);
      return [];
    }
  };

  // Excluir packote offline
  const excluirOffline = (nome: string): boolean => {
    try {
      const chave = STORAGE_KEY_PREFIX + nome;
      localStorage.removeItem(chave);

      // Atualizar índice
      const indice = listarOffline().filter(n => n !== nome);
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(indice));

      return true;
    } catch (err) {
      console.error('Erro ao excluir offline:', err);
      return false;
    }
  };

  // Limpar todos os packotes offline
  const limparTodosOffline = (): void => {
    try {
      const indice = listarOffline();
      
      // Remover todos os packotes
      indice.forEach(nome => {
        const chave = STORAGE_KEY_PREFIX + nome;
        localStorage.removeItem(chave);
      });

      // Limpar índice
      localStorage.removeItem(STORAGE_INDEX_KEY);
    } catch (err) {
      console.error('Erro ao limpar offline:', err);
    }
  };

  return {
    downloading,
    progress,
    error,
    downloadQuestoes,
    salvarOffline,
    carregarOffline,
    listarOffline,
    excluirOffline,
    limparTodosOffline,
  };
}
