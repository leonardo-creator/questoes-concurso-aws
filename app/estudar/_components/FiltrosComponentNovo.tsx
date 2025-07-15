'use client';

import { useState, useCallback } from 'react';
import type { FiltrosComponentProps, FiltroQuestoes } from '@/types';

interface DisciplinaComAssuntos {
  nome: string;
  count: number;
  assuntos: { nome: string; count: number }[];
}

export function FiltrosComponent({ 
  filtros, 
  onFiltrosChange, 
  indices, 
  cadernos 
}: FiltrosComponentProps) {
  const [filtrosAbertos, setFiltrosAbertos] = useState({
    disciplinas: false,
    bancas: false,
    anos: false,
    opcoes: false,
  });

  const atualizarFiltro = useCallback((campo: keyof FiltroQuestoes, valor: any) => {
    const novosFiltros = { ...filtros, [campo]: valor };
    onFiltrosChange(novosFiltros);
  }, [filtros, onFiltrosChange]);

  const limparFiltros = useCallback(() => {
    onFiltrosChange({});
  }, [onFiltrosChange]);

  const toggleFiltro = useCallback((secao: keyof typeof filtrosAbertos) => {
    setFiltrosAbertos(prev => ({
      ...prev,
      [secao]: !prev[secao]
    }));
  }, []);

  // Funcão para selecionar/deselecionar disciplina e seus assuntos
  const handleDisciplinaChange = useCallback((disciplina: DisciplinaComAssuntos, checked: boolean) => {
    const currentDisciplinas = filtros.disciplinas || [];
    const currentAssuntos = filtros.assuntos || [];
    
    let novasDisciplinas: string[];
    let novosAssuntos: string[];
    
    if (checked) {
      // Adicionar disciplina e todos seus assuntos
      novasDisciplinas = [...currentDisciplinas, disciplina.nome];
      const assuntosDisciplina = disciplina.assuntos.map(a => a.nome);
      novosAssuntos = [...new Set([...currentAssuntos, ...assuntosDisciplina])];
    } else {
      // Remover disciplina e todos seus assuntos
      novasDisciplinas = currentDisciplinas.filter(d => d !== disciplina.nome);
      const assuntosDisciplina = disciplina.assuntos.map(a => a.nome);
      novosAssuntos = currentAssuntos.filter(a => !assuntosDisciplina.includes(a));
    }
    
    atualizarFiltro('disciplinas', novasDisciplinas);
    atualizarFiltro('assuntos', novosAssuntos);
  }, [filtros.disciplinas, filtros.assuntos, atualizarFiltro]);

  // Função para selecionar/deselecionar assunto individual
  const handleAssuntoChange = useCallback((assunto: string, checked: boolean) => {
    const current = filtros.assuntos || [];
    let novosAssuntos: string[];
    
    if (checked) {
      novosAssuntos = [...current, assunto];
    } else {
      novosAssuntos = current.filter(a => a !== assunto);
    }
    
    atualizarFiltro('assuntos', novosAssuntos);
  }, [filtros.assuntos, atualizarFiltro]);

  // Função para seleção de múltiplos anos (range)
  const handleAnoRangeChange = useCallback((anoInicio: number, anoFim: number) => {
    const anosRange: number[] = [];
    for (let ano = anoInicio; ano <= anoFim; ano++) {
      anosRange.push(ano);
    }
    atualizarFiltro('anos', anosRange);
  }, [atualizarFiltro]);

  const contarFiltrosAtivos = (): number => {
    let count = 0;
    if (filtros.disciplinas?.length) count++;
    if (filtros.assuntos?.length) count++;
    if (filtros.bancas?.length) count++;
    if (filtros.anos?.length) count++;
    if (filtros.codigosPersonalizados?.length) count++;
    if (filtros.cadernoId) count++;
    if (filtros.naoRepetirRespondidas) count++;
    if (filtros.incluirAnuladas) count++;
    if (filtros.incluirDesatualizadas) count++;
    if (filtros.statusResposta && filtros.statusResposta !== 'todas') count++;
    return count;
  };

  return (
    <div className="w-full space-y-3">
      {/* Header dos filtros - Responsivo */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Filtros</h3>
            {contarFiltrosAtivos() > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {contarFiltrosAtivos()} ativo{contarFiltrosAtivos() > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={limparFiltros}
            className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 hover:bg-blue-50 rounded"
            disabled={contarFiltrosAtivos() === 0}
          >
            Limpar Todos
          </button>
        </div>

        {/* Disciplinas com Hierarquia */}
        <div className="mb-4">
          <button
            onClick={() => toggleFiltro('disciplinas')}
            className="flex justify-between items-center w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="font-medium text-gray-700">
              Disciplinas 
              {filtros.disciplinas && filtros.disciplinas.length > 0 && (
                <span className="ml-2 text-sm text-blue-600">
                  ({filtros.disciplinas.length} selecionada{filtros.disciplinas.length > 1 ? 's' : ''})
                </span>
              )}
            </span>
            <span className="text-gray-500 text-lg">
              {filtrosAbertos.disciplinas ? '−' : '+'}
            </span>
          </button>
          
          {filtrosAbertos.disciplinas && (
            <div className="mt-3 max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              {indices.disciplinas.map((disciplina) => {
                const disciplinaComAssuntos = disciplina as DisciplinaComAssuntos;
                const disciplinaSelecionada = filtros.disciplinas?.includes(disciplina.nome) || false;
                
                return (
                  <div key={disciplina.nome} className="border-b border-gray-100 last:border-b-0">
                    {/* Disciplina Principal */}
                    <label className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={disciplinaSelecionada}
                        onChange={(e) => handleDisciplinaChange(disciplinaComAssuntos, e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 block truncate">
                          {disciplina.nome}
                        </span>
                        <span className="text-xs text-gray-500">
                          {disciplina.count.toLocaleString()} questões
                        </span>
                      </div>
                    </label>
                    
                    {/* Assuntos da Disciplina */}
                    {disciplinaComAssuntos.assuntos && disciplinaComAssuntos.assuntos.length > 0 && (
                      <div className="pl-8 bg-gray-25">
                        {disciplinaComAssuntos.assuntos.slice(0, 5).map((assunto) => (
                          <label key={assunto.nome} className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={filtros.assuntos?.includes(assunto.nome) || false}
                              onChange={(e) => handleAssuntoChange(assunto.nome, e.target.checked)}
                              className="mr-2 h-3 w-3 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-gray-700 flex-1 truncate">{assunto.nome}</span>
                            <span className="text-xs text-gray-400 ml-2">({assunto.count})</span>
                          </label>
                        ))}
                        {disciplinaComAssuntos.assuntos.length > 5 && (
                          <div className="text-xs text-blue-600 px-3 py-2">
                            +{disciplinaComAssuntos.assuntos.length - 5} assuntos adicionais
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bancas */}
        <div className="mb-4">
          <button
            onClick={() => toggleFiltro('bancas')}
            className="flex justify-between items-center w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="font-medium text-gray-700">
              Bancas
              {filtros.bancas && filtros.bancas.length > 0 && (
                <span className="ml-2 text-sm text-blue-600">
                  ({filtros.bancas.length} selecionada{filtros.bancas.length > 1 ? 's' : ''})
                </span>
              )}
            </span>
            <span className="text-gray-500 text-lg">
              {filtrosAbertos.bancas ? '−' : '+'}
            </span>
          </button>
          
          {filtrosAbertos.bancas && (
            <div className="mt-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {indices.bancas.map((banca) => (
                  <label key={banca.sigla} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtros.bancas?.includes(banca.sigla) || false}
                      onChange={(e) => {
                        const current = filtros.bancas || [];
                        if (e.target.checked) {
                          atualizarFiltro('bancas', [...current, banca.sigla]);
                        } else {
                          atualizarFiltro('bancas', current.filter(b => b !== banca.sigla));
                        }
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 block truncate">
                        {banca.sigla}
                      </span>
                      <span className="text-xs text-gray-500">
                        {banca.count.toLocaleString()} questões
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Anos - Melhorado */}
        <div className="mb-4">
          <button
            onClick={() => toggleFiltro('anos')}
            className="flex justify-between items-center w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="font-medium text-gray-700">
              Anos
              {filtros.anos && filtros.anos.length > 0 && (
                <span className="ml-2 text-sm text-blue-600">
                  ({filtros.anos.length} selecionado{filtros.anos.length > 1 ? 's' : ''})
                </span>
              )}
            </span>
            <span className="text-gray-500 text-lg">
              {filtrosAbertos.anos ? '−' : '+'}
            </span>
          </button>
          
          {filtrosAbertos.anos && (
            <div className="mt-3 border border-gray-200 rounded-lg p-3">
              {/* Seleção rápida por décadas */}
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-700 block mb-2">Seleção rápida:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAnoRangeChange(2020, 2025)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    2020-2025
                  </button>
                  <button
                    onClick={() => handleAnoRangeChange(2010, 2019)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    2010-2019
                  </button>
                  <button
                    onClick={() => handleAnoRangeChange(2000, 2009)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    2000-2009
                  </button>
                </div>
              </div>
              
              {/* Lista de anos */}
              <div className="max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                  {indices.anos.map((ano) => (
                    <label key={ano.ano} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtros.anos?.includes(ano.ano) || false}
                        onChange={(e) => {
                          const current = filtros.anos || [];
                          if (e.target.checked) {
                            atualizarFiltro('anos', [...current, ano.ano]);
                          } else {
                            atualizarFiltro('anos', current.filter(a => a !== ano.ano));
                          }
                        }}
                        className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{ano.ano}</span>
                        <span className="text-xs text-gray-500 block">({ano.count})</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cadernos */}
        {cadernos.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Caderno</label>
            <select
              value={filtros.cadernoId || ''}
              onChange={(e) => atualizarFiltro('cadernoId', e.target.value || undefined)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os cadernos</option>
              {cadernos.map((caderno) => (
                <option key={caderno.id} value={caderno.id}>
                  {caderno.nome} ({caderno.questionCodes.length} questões)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Opções avançadas */}
        <div className="mb-4">
          <button
            onClick={() => toggleFiltro('opcoes')}
            className="flex justify-between items-center w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="font-medium text-gray-700">Opções Avançadas</span>
            <span className="text-gray-500 text-lg">
              {filtrosAbertos.opcoes ? '−' : '+'}
            </span>
          </button>
          
          {filtrosAbertos.opcoes && (
            <div className="mt-3 space-y-4 p-3 border border-gray-200 rounded-lg">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtros.naoRepetirRespondidas || false}
                  onChange={(e) => atualizarFiltro('naoRepetirRespondidas', e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Não repetir questões respondidas</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtros.incluirAnuladas || false}
                  onChange={(e) => atualizarFiltro('incluirAnuladas', e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Incluir questões anuladas</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtros.incluirDesatualizadas || false}
                  onChange={(e) => atualizarFiltro('incluirDesatualizadas', e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Incluir questões desatualizadas</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status das respostas</label>
                <select
                  value={filtros.statusResposta || 'todas'}
                  onChange={(e) => atualizarFiltro('statusResposta', e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todas</option>
                  <option value="acertadas">Apenas acertadas</option>
                  <option value="erradas">Apenas erradas</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Códigos personalizados */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Códigos específicos
          </label>
          <textarea
            value={filtros.codigosPersonalizados?.join('\n') || ''}
            onChange={(e) => {
              const codigos = e.target.value
                .split('\n')
                .map(c => c.trim())
                .filter(c => c.length > 0);
              atualizarFiltro('codigosPersonalizados', codigos.length > 0 ? codigos : undefined);
            }}
            placeholder="Cole os códigos das questões (um por linha)"
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
