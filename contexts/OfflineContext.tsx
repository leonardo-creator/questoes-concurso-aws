'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AcaoOffline, OfflineContextType } from '@/types';

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [acoesPendentes, setAcoesPendentes] = useState<AcaoOffline[]>([]);

  // Monitorar status de conexão
  useEffect(() => {
    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Verificar status inicial
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Carregar ações pendentes do IndexedDB
  useEffect(() => {
    if (typeof window !== 'undefined') {
      carregarAcoesPendentes();
    }
  }, []);

  // Sincronizar quando ficar online
  useEffect(() => {
    if (isOnline && acoesPendentes.length > 0) {
      sincronizar();
    }
  }, [isOnline]);

  const carregarAcoesPendentes = async () => {
    try {
      const db = await abrirIndexedDB();
      const transaction = db.transaction(['acoes'], 'readonly');
      const store = transaction.objectStore('acoes');
      const request = store.getAll();

      request.onsuccess = () => {
        setAcoesPendentes(request.result || []);
      };
    } catch (error) {
      console.error('Erro ao carregar ações pendentes:', error);
    }
  };

  const adicionarAcao = useCallback(async (acao: Omit<AcaoOffline, 'id' | 'timestamp' | 'sincronizado'>) => {
    const novaAcao: AcaoOffline = {
      ...acao,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      sincronizado: false,
    };

    try {
      // Salvar no IndexedDB
      const db = await abrirIndexedDB();
      const transaction = db.transaction(['acoes'], 'readwrite');
      const store = transaction.objectStore('acoes');
      store.add(novaAcao);

      setAcoesPendentes(prev => [...prev, novaAcao]);

      // Se estiver online, tentar sincronizar imediatamente
      if (isOnline) {
        await sincronizarAcao(novaAcao);
      }
    } catch (error) {
      console.error('Erro ao adicionar ação offline:', error);
    }
  }, [isOnline]);

  const sincronizar = useCallback(async () => {
    if (!isOnline || acoesPendentes.length === 0) return;

    console.log('Sincronizando ações offline...');

    for (const acao of acoesPendentes.filter(a => !a.sincronizado)) {
      await sincronizarAcao(acao);
    }
  }, [isOnline, acoesPendentes]);

  const sincronizarAcao = async (acao: AcaoOffline) => {
    try {
      let endpoint = '';
      let method = 'POST';

      switch (acao.tipo) {
        case 'resposta':
          endpoint = '/api/user/answers';
          break;
        case 'criar_caderno':
          endpoint = '/api/user/lists';
          break;
        case 'editar_caderno':
          endpoint = `/api/user/lists/${acao.dados.id}`;
          method = 'PUT';
          break;
        case 'excluir_caderno':
          endpoint = `/api/user/lists/${acao.dados.id}`;
          method = 'DELETE';
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'DELETE' ? JSON.stringify(acao.dados) : undefined,
      });

      if (response.ok) {
        // Marcar como sincronizado
        acao.sincronizado = true;

        // Atualizar no IndexedDB
        const db = await abrirIndexedDB();
        const transaction = db.transaction(['acoes'], 'readwrite');
        const store = transaction.objectStore('acoes');
        store.put(acao);

        // Remover da lista local após sincronização bem-sucedida
        setAcoesPendentes(prev => prev.filter(a => a.id !== acao.id));

        // Remover do IndexedDB
        store.delete(acao.id);

        console.log(`Ação ${acao.tipo} sincronizada com sucesso`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar ação:', error);
    }
  };

  const value: OfflineContextType = {
    isOnline,
    acoesPendentes,
    adicionarAcao,
    sincronizar,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
      {!isOnline && (
        <div className="offline-indicator">
          📱 Modo offline - Suas ações serão sincronizadas quando a conexão for restabelecida
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (typeof window === 'undefined') {
    // Durante SSR/SSG, retorna valores padrão
    return {
      isOnline: true,
      acoesPendentes: [],
      adicionarAcao: async () => {},
      sincronizar: async () => {},
    };
  }
  
  if (context === undefined) {
    throw new Error('useOffline deve ser usado dentro de um OfflineProvider');
  }
  return context;
}

// Função auxiliar para abrir IndexedDB
async function abrirIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('QuestoesConcurso', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('acoes')) {
        const store = db.createObjectStore('acoes', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('sincronizado', 'sincronizado', { unique: false });
      }

      if (!db.objectStoreNames.contains('questoes')) {
        const questoesStore = db.createObjectStore('questoes', { keyPath: 'codigo_real' });
        questoesStore.createIndex('disciplina', 'disciplina_real', { unique: false });
        questoesStore.createIndex('banca', 'bancas_sigla', { unique: false });
      }
    };
  });
}
