'use client';

import { useState } from 'react';
import { AssuntosHierarquicos } from './AssuntosHierarquicos';
import type { FiltrosComponentProps, FiltroQuestoes } from '@/types';

export function FiltrosComponent({ 
  filtros, 
  onFiltrosChange, 
  indices, 
  cadernos,
  buscaHierarquica
}: Readonly<FiltrosComponentProps>) {
  const [filtrosAbertos, setFiltrosAbertos] = useState({
    disciplinas: false,
    assuntos: false,
    bancas: false,
    anos: false,
    opcoes: false,
  });

  const [buscaBanca, setBuscaBanca] = useState('');

  const atualizarFiltro = (campo: keyof FiltroQuestoes, valor: any) => {
    const novosFiltros = { ...filtros, [campo]: valor };
    onFiltrosChange(novosFiltros);
  };

  const limparFiltros = () => {
    onFiltrosChange({});
  };

  const toggleFiltro = (secao: keyof typeof filtrosAbertos) => {
    setFiltrosAbertos(prev => ({
      ...prev,
      [secao]: !prev[secao]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="filtro-container">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Filtros</h3>
          <button
            onClick={limparFiltros}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Limpar
          </button>
        </div>

        {/* Disciplinas */}
        <div className="mb-4">
          <button
            onClick={() => toggleFiltro('disciplinas')}
            className="flex justify-between items-center w-full text-left p-2 bg-gray-50 rounded"
          >
            <span className="font-medium">Disciplinas</span>
            <span>{filtrosAbertos.disciplinas ? '−' : '+'}</span>
          </button>
          
          {filtrosAbertos.disciplinas && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {indices.disciplinas.map((disciplina) => (
                <label key={disciplina} className="flex items-center p-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={filtros.disciplinas?.includes(disciplina) || false}
                    onChange={(e) => {
                      const current = filtros.disciplinas || [];
                      if (e.target.checked) {
                        atualizarFiltro('disciplinas', [...current, disciplina]);
                      } else {
                        atualizarFiltro('disciplinas', current.filter(d => d !== disciplina));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm flex-1">{disciplina}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Assuntos Hierárquicos */}
        {buscaHierarquica && (
          <div className="mb-4">
            <button
              onClick={() => toggleFiltro('assuntos')}
              className="flex justify-between items-center w-full text-left p-2 bg-gray-50 rounded"
            >
              <span className="font-medium">Assuntos</span>
              <span>{filtrosAbertos.assuntos ? '−' : '+'}</span>
            </button>
            
            {filtrosAbertos.assuntos && (
              <div className="mt-2 max-h-80 overflow-y-auto">
                <AssuntosHierarquicos
                  disciplinas={buscaHierarquica.disciplinas}
                  assuntosSelecionados={filtros.assuntos || []}
                  onAssuntosChange={(assuntos) => atualizarFiltro('assuntos', assuntos)}
                />
              </div>
            )}
          </div>
        )}

        {/* Bancas */}
        <div className="mb-4">
          <button
            onClick={() => toggleFiltro('bancas')}
            className="flex justify-between items-center w-full text-left p-2 bg-gray-50 rounded"
          >
            <span className="font-medium">Bancas</span>
            <span>{filtrosAbertos.bancas ? '−' : '+'}</span>
          </button>
          
          {filtrosAbertos.bancas && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Buscar banca..."
                  value={buscaBanca}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                  onChange={(e) => setBuscaBanca(e.target.value)}
                />
              </div>
              {indices.bancas
                .filter(banca => 
                  buscaBanca === '' || 
                  banca.sigla.toLowerCase().includes(buscaBanca.toLowerCase()) ||
                  banca.nome.toLowerCase().includes(buscaBanca.toLowerCase())
                )
                .sort((a, b) => a.sigla.localeCompare(b.sigla))
                .map((banca) => (
                <label key={banca.sigla} className="flex items-center p-2 hover:bg-gray-50">
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
                    className="mr-2"
                  />
                  <span className="text-sm flex-1">{banca.sigla}</span>
                  <span className="text-xs text-gray-500" title={banca.nome}>
                    {banca.nome.length > 30 ? banca.nome.substring(0, 30) + '...' : banca.nome}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Anos */}
        <div className="mb-4">
          <button
            onClick={() => toggleFiltro('anos')}
            className="flex justify-between items-center w-full text-left p-2 bg-gray-50 rounded"
          >
            <span className="font-medium">Anos</span>
            <span>{filtrosAbertos.anos ? '−' : '+'}</span>
          </button>
          
          {filtrosAbertos.anos && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {[...indices.anos]
                .sort((a, b) => b - a) // Anos em ordem decrescente
                .map((ano) => (
                <label key={ano} className="flex items-center p-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={filtros.anos?.includes(ano) || false}
                    onChange={(e) => {
                      const current = filtros.anos || [];
                      if (e.target.checked) {
                        atualizarFiltro('anos', [...current, ano]);
                      } else {
                        atualizarFiltro('anos', current.filter(a => a !== ano));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm flex-1">{ano}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Cadernos */}
        {cadernos.length > 0 && (
          <div className="mb-4">
            <label htmlFor="caderno-select" className="block text-sm font-medium mb-2">Caderno</label>
            <select
              value={filtros.cadernoId || ''}
              onChange={(e) => atualizarFiltro('cadernoId', e.target.value || undefined)}
              className="w-full p-2 border border-gray-300 rounded"
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
            className="flex justify-between items-center w-full text-left p-2 bg-gray-50 rounded"
          >
            <span className="font-medium">Opções</span>
            <span>{filtrosAbertos.opcoes ? '−' : '+'}</span>
          </button>
          
          {filtrosAbertos.opcoes && (
            <div className="mt-2 space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtros.naoRepetirRespondidas || false}
                  onChange={(e) => atualizarFiltro('naoRepetirRespondidas', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Não repetir questões respondidas</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtros.incluirAnuladas || false}
                  onChange={(e) => atualizarFiltro('incluirAnuladas', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Incluir questões anuladas</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtros.incluirDesatualizadas || false}
                  onChange={(e) => atualizarFiltro('incluirDesatualizadas', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Incluir questões desatualizadas</span>
              </label>

              <div>
                <label htmlFor="status-resposta" className="block text-sm font-medium mb-1">Status das respostas</label>
                <select
                  value={filtros.statusResposta || 'todas'}
                  onChange={(e) => atualizarFiltro('statusResposta', e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
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
          <label htmlFor="codigos-personalizados" className="block text-sm font-medium mb-2">
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
            className="w-full p-2 border border-gray-300 rounded text-sm"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
