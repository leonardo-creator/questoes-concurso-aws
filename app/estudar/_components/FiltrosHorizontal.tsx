'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, Filter, RefreshCw, Search, Target, Brain, Shuffle, Star, Save, Download, Upload, Trash2 } from 'lucide-react';
import type { FiltrosComponentProps, FiltroQuestoes, OrdenacaoQuestoes } from '@/types';
import { useFiltrosSalvos } from '@/hooks/useFiltrosSalvos';
import { useDownloadOffline } from '@/hooks/useDownloadOffline';

interface FiltrosHorizontalProps extends FiltrosComponentProps {
  onFiltrar?: (filtros: FiltroQuestoes) => void;
  contandoQuestoes?: boolean;
  totalQuestoes?: number;
  ordenacao?: OrdenacaoQuestoes;
  onOrdenacaoChange?: (ordenacao: OrdenacaoQuestoes) => void;
}

export function FiltrosHorizontal({ 
  filtros, 
  onFiltrosChange, 
  indices, 
  cadernos,
  onFiltrar,
  contandoQuestoes = false,
  totalQuestoes = 0,
  disciplinas = [],
  assuntosDisponiveis = [],
  onDisciplinasChange,
  carregandoDisciplinas = false,
  ordenacao = 'relevancia',
  onOrdenacaoChange
}: FiltrosHorizontalProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [anoInicio, setAnoInicio] = useState<string>(filtros.anoInicio?.toString() || '');
  const [anoFim, setAnoFim] = useState<string>(filtros.anoFim?.toString() || '');
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  // Estados para filtros personalizados
  const [codigosAssuntos, setCodigosAssuntos] = useState<string>('');
  const [nomeFiltroSalvar, setNomeFiltroSalvar] = useState<string>('');
  const [mostrarSalvarFiltro, setMostrarSalvarFiltro] = useState(false);

  // Hooks para funcionalidades avançadas
  const { 
    filtrosSalvos, 
    loading: loadingFiltros, 
    salvarFiltro, 
    carregarFiltro, 
    excluirFiltro, 
    toggleFavorito 
  } = useFiltrosSalvos();

  const {
    downloading,
    downloadQuestoes,
    listarOffline,
    carregarOffline,
    excluirOffline
  } = useDownloadOffline();

  const atualizarFiltro = useCallback((campo: keyof FiltroQuestoes, valor: any) => {
    const novosFiltros = { ...filtros, [campo]: valor };
    onFiltrosChange(novosFiltros);
  }, [filtros, onFiltrosChange]);

  const limparFiltros = useCallback(() => {
    onFiltrosChange({});
    setAnoInicio('');
    setAnoFim('');
    setCodigosAssuntos('');
  }, [onFiltrosChange]);

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
    // NÃO limpar busca ao abrir dropdown - apenas ao fechar
  };

  const closeDropdown = (dropdown: string) => {
    if (activeDropdown === dropdown) {
      setActiveDropdown(null);
      setSearchTerms(prev => ({ ...prev, [dropdown]: '' }));
    }
  };

  const updateSearchTerm = (dropdown: string, term: string) => {
    setSearchTerms(prev => ({ ...prev, [dropdown]: term }));
  };

  // Função para filtrar itens baseado na busca (usando dados locais)
  const filterItems = useCallback((items: any[], searchField: string, dropdown: string) => {
    const searchTerm = searchTerms[dropdown]?.toLowerCase() || '';
    if (!searchTerm) return items;
    
    return items.filter(item => {
      const fieldValue = item[searchField]?.toLowerCase() || '';
      // Busca também por sigla nas bancas
      const siglaValue = item.sigla?.toLowerCase() || '';
      return fieldValue.includes(searchTerm) || siglaValue.includes(searchTerm);
    });
  }, [searchTerms]);

  // Função para obter contadores locais (evita API calls)
  const getLocalCount = useCallback((field: keyof FiltroQuestoes, value: string) => {
    const currentValues = filtros[field] as string[] || [];
    return currentValues.includes(value) ? 1 : 0;
  }, [filtros]);

  const handleCheckboxChange = (campo: keyof FiltroQuestoes, valor: string, checked: boolean) => {
    const current = (filtros[campo] as string[]) || [];
    let newArray: string[];
    
    if (checked) {
      newArray = [...current, valor];
    } else {
      newArray = current.filter(item => item !== valor);
    }
    
    // Se for disciplinas, usar callback especial
    if (campo === 'disciplinas' && onDisciplinasChange) {
      onDisciplinasChange(newArray);
    } else {
      atualizarFiltro(campo, newArray.length > 0 ? newArray : undefined);
    }
  };

  // Funções para filtros salvos
  const handleSalvarFiltro = async () => {
    if (!nomeFiltroSalvar.trim()) return;

    const sucesso = await salvarFiltro(nomeFiltroSalvar, filtros);
    if (sucesso) {
      setNomeFiltroSalvar('');
      setMostrarSalvarFiltro(false);
      setActiveDropdown(null);
    }
  };

  const handleCarregarFiltro = (id: string) => {
    const filtro = carregarFiltro(id);
    if (filtro) {
      onFiltrosChange(filtro.filtros);
      // Atualizar estados locais
      setAnoInicio(filtro.filtros.anoInicio?.toString() || '');
      setAnoFim(filtro.filtros.anoFim?.toString() || '');
      const codigos = filtro.filtros.codigosPersonalizados?.join(', ') || '';
      setCodigosAssuntos(codigos);
    }
    setActiveDropdown(null);
  };

  const handleDownloadOffline = async () => {
    const sucesso = await downloadQuestoes(filtros, 500);
    if (sucesso) {
      setActiveDropdown(null);
    }
  };

  const handleRangeChange = () => {
    const inicio = anoInicio ? parseInt(anoInicio) : undefined;
    const fim = anoFim ? parseInt(anoFim) : undefined;
    
    atualizarFiltro('anoInicio', inicio);
    atualizarFiltro('anoFim', fim);
  };

  const contarFiltrosAtivos = (): number => {
    let count = 0;
    if (filtros.disciplinas?.length) count++;
    if (filtros.assuntos?.length) count++;
    if (filtros.bancas?.length) count++;
    if (filtros.anos?.length) count++;
    if (filtros.anoInicio || filtros.anoFim) count++;
    if (filtros.dificuldades?.length) count++;
    if (filtros.tipoQuestao && filtros.tipoQuestao !== 'todas') count++;
    if (filtros.codigosPersonalizados?.length) count++;
    if (filtros.cadernoId) count++;
    if (filtros.naoRepetirRespondidas) count++;
    if (filtros.incluirAnuladas) count++;
    if (filtros.incluirDesatualizadas) count++;
    if (filtros.statusResposta && filtros.statusResposta !== 'todas') count++;
    return count;
  };

  const Dropdown = ({ 
    id, 
    label, 
    children, 
    count,
    searchable = false 
  }: { 
    id: string; 
    label: string; 
    children: React.ReactNode; 
    count?: number;
    searchable?: boolean;
  }) => (
    <div className="relative">
      <button
        onClick={() => toggleDropdown(id)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
          activeDropdown === id
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Filter size={16} />
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
        <ChevronDown 
          size={16} 
          className={`transition-transform ${activeDropdown === id ? 'rotate-180' : ''}`}
        />
      </button>
      
      {activeDropdown === id && (
        <div 
          className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64 max-w-80"
          onClick={(e) => e.stopPropagation()} // Prevenir fechamento quando clica no dropdown
        >
          {searchable && (
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  value={searchTerms[id] || ''}
                  onChange={(e) => updateSearchTerm(id, e.target.value)}
                  onClick={(e) => e.stopPropagation()} // Prevenir fechamento quando clica no input
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus={searchable}
                />
              </div>
            </div>
          )}
          <div className="max-h-80 overflow-y-auto p-3">
            {children}
          </div>
          <div className="p-2 border-t border-gray-200 text-right">
            <button
              onClick={() => closeDropdown(id)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const CheckboxItem = ({ 
    campo, 
    valor, 
    label
  }: { 
    campo: keyof FiltroQuestoes; 
    valor: string; 
    label: string;
  }) => {
    const current = (filtros[campo] as string[]) || [];
    const isChecked = current.includes(valor);
    
    return (
      <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => handleCheckboxChange(campo, valor, e.target.checked)}
          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <span className="flex-1">{label}</span>
      </label>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex flex-col space-y-4">
        {/* Linha superior - Filtros principais */}
        <div className="flex flex-wrap gap-3">
          {/* Disciplinas */}
          <Dropdown
            id="disciplinas"
            label="Disciplinas"
            count={filtros.disciplinas?.length}
            searchable={true}
          >
            {carregandoDisciplinas ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Carregando disciplinas...
              </div>
            ) : (
              <div className="space-y-1">
                {filterItems(disciplinas, 'nome', 'disciplinas').map((disciplina) => (
                  <CheckboxItem
                    key={disciplina.nome}
                    campo="disciplinas"
                    valor={disciplina.nome}
                    label={disciplina.nome}
                  />
                ))}
              </div>
            )}
          </Dropdown>

          {/* Assuntos */}
          <Dropdown
            id="assuntos"
            label="Assuntos"
            count={filtros.assuntos?.length}
            searchable={true}
          >
            {assuntosDisponiveis.length === 0 && filtros.disciplinas?.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Selecione uma disciplina para ver os assuntos
              </div>
            ) : assuntosDisponiveis.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nenhum assunto disponível para as disciplinas selecionadas
              </div>
            ) : (
              <div className="space-y-1">
                {filterItems(assuntosDisponiveis, 'titulo', 'assuntos').map((assunto) => (
                  <CheckboxItem
                    key={assunto.codigo}
                    campo="assuntos"
                    valor={assunto.titulo}
                    label={`${assunto.titulo} (${assunto.codigo})`}
                  />
                ))}
              </div>
            )}
          </Dropdown>

          {/* Bancas */}
          <Dropdown
            id="bancas"
            label="Bancas"
            count={filtros.bancas?.length}
            searchable={true}
          >
            <div className="space-y-1">
              {filterItems(indices.bancas, 'nome', 'bancas').map((banca) => (
                <CheckboxItem
                  key={banca.sigla}
                  campo="bancas"
                  valor={banca.sigla}
                  label={`${banca.sigla} - ${banca.nome}`}
                />
              ))}
            </div>
          </Dropdown>

          {/* Anos (Range) */}
          <Dropdown
            id="anos"
            label="Período"
            count={filtros.anoInicio || filtros.anoFim ? 1 : 0}
          >
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Selecionar período:
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Ano Início
                  </label>
                  <input
                    type="number"
                    value={anoInicio}
                    onChange={(e) => setAnoInicio(e.target.value)}
                    placeholder="Ex: 2020"
                    min="1990"
                    max="2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Ano Fim
                  </label>
                  <input
                    type="number"
                    value={anoFim}
                    onChange={(e) => setAnoFim(e.target.value)}
                    placeholder="Ex: 2024"
                    min="1990"
                    max="2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <button
                onClick={handleRangeChange}
                className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Aplicar Período
              </button>
              
              <div className="border-t pt-3 mt-3">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Ou selecionar anos específicos:
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {indices.anos.map((ano) => (
                    <CheckboxItem
                      key={ano.ano}
                      campo="anos"
                      valor={ano.ano.toString()}
                      label={ano.ano.toString()}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Dropdown>

          {/* Filtros Salvos */}
          <Dropdown
            id="filtrosSalvos"
            label="Filtros Salvos"
            count={filtrosSalvos.length}
          >
            <div className="space-y-3">
              {/* Salvar filtro atual */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-700 mb-2">
                  Salvar filtros atuais
                </div>
                {!mostrarSalvarFiltro ? (
                  <button
                    onClick={() => setMostrarSalvarFiltro(true)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Save size={14} />
                    Salvar como novo filtro
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={nomeFiltroSalvar}
                      onChange={(e) => setNomeFiltroSalvar(e.target.value)}
                      placeholder="Nome do filtro"
                      className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                      onClick={(e) => e.stopPropagation()}
                      onKeyPress={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          handleSalvarFiltro();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSalvarFiltro}
                        disabled={!nomeFiltroSalvar.trim()}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-blue-300"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setMostrarSalvarFiltro(false);
                          setNomeFiltroSalvar('');
                        }}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de filtros salvos */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Filtros salvos ({filtrosSalvos.length})
                </div>
                {loadingFiltros ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  </div>
                ) : filtrosSalvos.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Nenhum filtro salvo
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {filtrosSalvos.map((filtro) => (
                      <div
                        key={filtro.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavorito(filtro.id)}
                              className={`${filtro.favorito ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}
                            >
                              <Star size={14} fill={filtro.favorito ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => handleCarregarFiltro(filtro.id)}
                              className="text-sm font-medium text-left hover:text-blue-600"
                            >
                              {filtro.nome}
                            </button>
                          </div>
                          {filtro.descricao && (
                            <div className="text-xs text-gray-500 ml-6">
                              {filtro.descricao}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => excluirFiltro(filtro.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Dropdown>

          {/* Download Offline */}
          <Dropdown
            id="downloadOffline"
            label="Download Offline"
            count={listarOffline().length}
          >
            <div className="space-y-3">
              {/* Download atual */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-700 mb-2">
                  Baixar questões para offline
                </div>
                <div className="text-xs text-purple-600 mb-3">
                  Questões serão baixadas com os filtros atuais aplicados
                </div>
                <button
                  onClick={handleDownloadOffline}
                  disabled={downloading}
                  className="w-full bg-purple-600 text-white px-3 py-2 rounded-md text-sm hover:bg-purple-700 disabled:bg-purple-300 transition-colors flex items-center justify-center gap-2"
                >
                  {downloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Baixando...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Baixar para Offline
                    </>
                  )}
                </button>
              </div>

              {/* Downloads salvos */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Downloads offline ({listarOffline().length})
                </div>
                {listarOffline().length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Nenhum download offline
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {listarOffline().map((nome) => {
                      const packote = carregarOffline(nome);
                      return (
                        <div
                          key={nome}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {nome}
                            </div>
                            {packote && (
                              <div className="text-xs text-gray-500">
                                {packote.total} questões • {new Date(packote.timestamp).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => excluirOffline(nome)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sincronização */}
              <div className="border-t pt-3">
                <button
                  onClick={() => {
                    console.log('Sincronizar respostas offline');
                  }}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={14} />
                  Sincronizar Respostas
                </button>
              </div>
            </div>
          </Dropdown>

          {/* Ordenação / Modo de Estudo */}
          <Dropdown
            id="ordenacao"
            label="Modo de Estudo"
            count={ordenacao !== 'relevancia' ? 1 : 0}
          >
            <div className="space-y-1">
              <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                <input
                  type="radio"
                  name="ordenacao"
                  value="relevancia"
                  checked={ordenacao === 'relevancia'}
                  onChange={(e) => onOrdenacaoChange?.(e.target.value as OrdenacaoQuestoes)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <Shuffle size={16} className="mr-2 text-gray-500" />
                <div>
                  <div className="font-medium">Modo Padrão</div>
                  <div className="text-xs text-gray-500">Questões por relevância</div>
                </div>
              </label>
              
              <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                <input
                  type="radio"
                  name="ordenacao"
                  value="estudo_inteligente"
                  checked={ordenacao === 'estudo_inteligente'}
                  onChange={(e) => onOrdenacaoChange?.(e.target.value as OrdenacaoQuestoes)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <Brain size={16} className="mr-2 text-purple-500" />
                <div>
                  <div className="font-medium text-purple-700">Estudo Inteligente</div>
                  <div className="text-xs text-gray-500">
                    Prioriza assuntos menos estudados, das questões mais difíceis para as mais fáceis
                  </div>
                </div>
              </label>
              
              <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                <input
                  type="radio"
                  name="ordenacao"
                  value="data_desc"
                  checked={ordenacao === 'data_desc'}
                  onChange={(e) => onOrdenacaoChange?.(e.target.value as OrdenacaoQuestoes)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="mr-2">📅</span>
                <div>
                  <div className="font-medium">Mais Recentes</div>
                  <div className="text-xs text-gray-500">Das questões mais novas para as mais antigas</div>
                </div>
              </label>
              
              <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                <input
                  type="radio"
                  name="ordenacao"
                  value="dificuldade_desc"
                  checked={ordenacao === 'dificuldade_desc'}
                  onChange={(e) => onOrdenacaoChange?.(e.target.value as OrdenacaoQuestoes)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="mr-2">🔥</span>
                <div>
                  <div className="font-medium">Mais Difíceis</div>
                  <div className="text-xs text-gray-500">Das questões mais difíceis para as mais fáceis</div>
                </div>
              </label>
            </div>
            
            {ordenacao === 'estudo_inteligente' && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Brain size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-purple-700">
                    <div className="font-medium mb-1">Como funciona o Estudo Inteligente:</div>
                    <ul className="space-y-1 text-purple-600">
                      <li>• Prioriza assuntos que você respondeu menos questões</li>
                      <li>• Dentro de cada assunto, mostra primeiro as questões mais difíceis</li>
                      <li>• Otimiza seu aprendizado focando em pontos fracos</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </Dropdown>

          {/* Dificuldades */}
          <Dropdown
            id="dificuldades"
            label="Dificuldade"
            count={filtros.dificuldades?.length}
          >
            <div className="space-y-1">
              {['Fácil', 'Média', 'Difícil'].map((dificuldade) => (
                <CheckboxItem
                  key={dificuldade}
                  campo="dificuldades"
                  valor={dificuldade}
                  label={dificuldade}
                />
              ))}
            </div>
          </Dropdown>

          {/* Tipo de Questão */}
          <Dropdown
            id="tipoQuestao"
            label="Tipo"
            count={filtros.tipoQuestao && filtros.tipoQuestao !== 'todas' ? 1 : 0}
          >
            <div className="space-y-1">
              {[
                { value: 'todas', label: 'Todas', icon: '📝' },
                { value: 'multipla_escolha', label: 'Múltipla Escolha', icon: '🔤' },
                { value: 'certo_errado', label: 'Certo/Errado', icon: '✓✗' }
              ].map((tipo) => (
                <label key={tipo.value} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                  <input
                    type="radio"
                    name="tipoQuestao"
                    value={tipo.value}
                    checked={(filtros.tipoQuestao || 'todas') === tipo.value}
                    onChange={(e) => atualizarFiltro('tipoQuestao', e.target.value === 'todas' ? undefined : e.target.value)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="mr-2">{tipo.icon}</span>
                  <span>{tipo.label}</span>
                </label>
              ))}
            </div>
          </Dropdown>

          {/* Opções */}
          <Dropdown
            id="opcoes"
            label="Opções"
            count={[
              filtros.naoRepetirRespondidas,
              filtros.incluirAnuladas,
              filtros.incluirDesatualizadas,
              filtros.statusResposta && filtros.statusResposta !== 'todas'
            ].filter(Boolean).length}
          >
            <div className="space-y-3">
              <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                <input
                  type="checkbox"
                  checked={filtros.naoRepetirRespondidas || false}
                  onChange={(e) => atualizarFiltro('naoRepetirRespondidas', e.target.checked || undefined)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span>Não repetir questões já respondidas</span>
              </label>
              
              <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                <input
                  type="checkbox"
                  checked={filtros.incluirAnuladas || false}
                  onChange={(e) => atualizarFiltro('incluirAnuladas', e.target.checked || undefined)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span>Incluir questões anuladas</span>
              </label>
              
              <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                <input
                  type="checkbox"
                  checked={filtros.incluirDesatualizadas || false}
                  onChange={(e) => atualizarFiltro('incluirDesatualizadas', e.target.checked || undefined)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span>Incluir questões desatualizadas</span>
              </label>
              
              <div className="border-t pt-3">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Status das respostas:
                </div>
                <div className="space-y-1">
                  {[
                    { value: 'todas', label: 'Todas as questões' },
                    { value: 'acertadas', label: 'Apenas acertadas' },
                    { value: 'erradas', label: 'Apenas erradas' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded text-sm">
                      <input
                        type="radio"
                        name="statusResposta"
                        value={option.value}
                        checked={(filtros.statusResposta || 'todas') === option.value}
                        onChange={(e) => atualizarFiltro('statusResposta', e.target.value === 'todas' ? undefined : e.target.value)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Dropdown>

          {/* Códigos de Assuntos */}
          <Dropdown
            id="codigosAssuntos"
            label="Códigos de Assuntos"
            count={codigosAssuntos ? 1 : 0}
          >
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">
                Digite códigos separados por vírgula:
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={codigosAssuntos}
                  onChange={(e) => setCodigosAssuntos(e.target.value)}
                  placeholder="Ex: 1.2, 5.4, 3.1, 7.8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="text-xs text-gray-500">
                  Use vírgula para separar múltiplos códigos
                </div>
              </div>
              <button
                onClick={() => {
                  if (codigosAssuntos.trim()) {
                    const codigos = codigosAssuntos
                      .split(',')
                      .map(c => c.trim().replace(/^["']|["']$/g, '')) // Remove aspas do início e fim
                      .filter(c => c.length > 0);
                    atualizarFiltro('codigosPersonalizados', codigos.length > 0 ? codigos : undefined);
                  } else {
                    atualizarFiltro('codigosPersonalizados', undefined);
                  }
                }}
                className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Aplicar Códigos
              </button>
              {(filtros.codigosPersonalizados?.length ?? 0) > 0 && (
                <div className="text-xs text-green-600">
                  ✓ {filtros.codigosPersonalizados?.length ?? 0} código(s) aplicado(s)
                </div>
              )}
            </div>
          </Dropdown>
        </div>

        {/* Linha inferior - Ações */}
        <div className="flex justify-between items-center pt-3 border-t">
          <div className="text-sm text-gray-600">
            {contarFiltrosAtivos()} filtro(s) selecionado(s)
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={limparFiltros}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Limpar Filtros
            </button>
            
            {onFiltrar && (
              <button
                onClick={() => onFiltrar(filtros)}
                disabled={contandoQuestoes}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
              >
                {contandoQuestoes ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Contando...
                  </>
                ) : (
                  <>
                    <Target size={16} />
                    {totalQuestoes > 0 ? `Filtrar ${totalQuestoes.toLocaleString()} questões` : 'Filtrar Questões'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
