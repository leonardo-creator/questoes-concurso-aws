'use client';

import { X } from 'lucide-react';
import type { FiltroQuestoes } from '@/types';

interface FiltrosShoppingProps {
  filtros: FiltroQuestoes;
  onRemoverFiltro: (campo: keyof FiltroQuestoes, valor?: any) => void;
  onLimparTodos: () => void;
}

interface FiltroAtivo {
  campo: keyof FiltroQuestoes;
  label: string;
  valor: any;
  display: string;
}

export function FiltrosShopping({ filtros, onRemoverFiltro, onLimparTodos }: FiltrosShoppingProps) {
  const filtrosAtivos: FiltroAtivo[] = [];

  // Processar disciplinas
  if (filtros.disciplinas?.length) {
    filtros.disciplinas.forEach(disciplina => {
      filtrosAtivos.push({
        campo: 'disciplinas',
        label: 'Disciplina',
        valor: disciplina,
        display: disciplina
      });
    });
  }

  // Processar assuntos
  if (filtros.assuntos?.length) {
    filtros.assuntos.forEach(assunto => {
      filtrosAtivos.push({
        campo: 'assuntos',
        label: 'Assunto',
        valor: assunto,
        display: assunto
      });
    });
  }

  // Processar bancas
  if (filtros.bancas?.length) {
    filtros.bancas.forEach(banca => {
      filtrosAtivos.push({
        campo: 'bancas',
        label: 'Banca',
        valor: banca,
        display: banca
      });
    });
  }

  // Processar anos
  if (filtros.anos?.length) {
    const anosOrdenados = [...filtros.anos].sort((a, b) => a - b);
    if (anosOrdenados.length > 1) {
      filtrosAtivos.push({
        campo: 'anos',
        label: 'Anos',
        valor: filtros.anos,
        display: `${anosOrdenados[0]} - ${anosOrdenados[anosOrdenados.length - 1]}`
      });
    } else {
      filtrosAtivos.push({
        campo: 'anos',
        label: 'Ano',
        valor: filtros.anos,
        display: anosOrdenados[0].toString()
      });
    }
  }

  // Processar range de anos
  if (filtros.anoInicio || filtros.anoFim) {
    const inicio = filtros.anoInicio || 'Início';
    const fim = filtros.anoFim || 'Fim';
    filtrosAtivos.push({
      campo: 'anoInicio',
      label: 'Período',
      valor: { anoInicio: filtros.anoInicio, anoFim: filtros.anoFim },
      display: `${inicio} - ${fim}`
    });
  }

  // Processar dificuldades
  if (filtros.dificuldades?.length) {
    filtros.dificuldades.forEach((dif: string) => {
      filtrosAtivos.push({
        campo: 'dificuldades',
        label: 'Dificuldade',
        valor: dif,
        display: dif
      });
    });
  }



  // Processar caderno
  if (filtros.cadernoId) {
    filtrosAtivos.push({
      campo: 'cadernoId',
      label: 'Caderno',
      valor: filtros.cadernoId,
      display: 'Caderno Personalizado'
    });
  }

  // Processar opções booleanas
  if (filtros.naoRepetirRespondidas) {
    filtrosAtivos.push({
      campo: 'naoRepetirRespondidas',
      label: 'Opção',
      valor: true,
      display: 'Não repetir respondidas'
    });
  }

  if (filtros.incluirAnuladas) {
    filtrosAtivos.push({
      campo: 'incluirAnuladas',
      label: 'Opção',
      valor: true,
      display: 'Incluir anuladas'
    });
  }

  if (filtros.incluirDesatualizadas) {
    filtrosAtivos.push({
      campo: 'incluirDesatualizadas',
      label: 'Opção',
      valor: true,
      display: 'Incluir desatualizadas'
    });
  }

  if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
    filtrosAtivos.push({
      campo: 'statusResposta',
      label: 'Status',
      valor: filtros.statusResposta,
      display: filtros.statusResposta === 'acertadas' ? 'Apenas acertadas' : 'Apenas erradas'
    });
  }

  const handleRemoverFiltro = (filtroAtivo: FiltroAtivo) => {
    if (filtroAtivo.campo === 'anoInicio') {
      // Para range de anos, remover ambos
      onRemoverFiltro('anoInicio');
      onRemoverFiltro('anoFim');
    } else if (Array.isArray(filtros[filtroAtivo.campo])) {
      // Para arrays, remover o item específico
      const arrayAtual = filtros[filtroAtivo.campo] as any[];
      const novoArray = arrayAtual.filter(item => item !== filtroAtivo.valor);
      onRemoverFiltro(filtroAtivo.campo, novoArray.length > 0 ? novoArray : undefined);
    } else {
      // Para valores únicos, remover completamente
      onRemoverFiltro(filtroAtivo.campo, undefined);
    }
  };

  if (filtrosAtivos.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Filtros Aplicados ({filtrosAtivos.length})
        </h3>
        <button
          onClick={onLimparTodos}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Limpar Todos
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filtrosAtivos.map((filtro, index) => (
          <div
            key={`${filtro.campo}-${index}`}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <span className="text-xs font-medium text-blue-600">
              {filtro.label}:
            </span>
            <span className="font-medium max-w-32 truncate" title={filtro.display}>
              {filtro.display}
            </span>
            <button
              onClick={() => handleRemoverFiltro(filtro)}
              className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
              aria-label={`Remover filtro ${filtro.display}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
