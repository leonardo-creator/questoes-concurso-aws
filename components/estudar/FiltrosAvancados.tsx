'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { CodigosEspecificos } from './CodigosEspecificos';
import { FiltrosSalvos } from './FiltrosSalvos';
import type { 
  FiltroQuestoes, 
  IndiceDisciplinas, 
  IndiceBancas, 
  IndiceAnos,
  CadernoPersonalizado 
} from '@/types';

interface FiltrosAvancadosProps {
  filtros: FiltroQuestoes;
  onFiltrosChange: (novosFiltros: FiltroQuestoes) => void;
  indices: {
    disciplinas: IndiceDisciplinas;
    bancas: IndiceBancas;
    anos: IndiceAnos;
  };
  cadernos: CadernoPersonalizado[];
  totalQuestoes?: number;
}

export function FiltrosAvancados({ 
  filtros, 
  onFiltrosChange, 
  indices, 
  cadernos,
  totalQuestoes = 0
}: FiltrosAvancadosProps) {
  const [activeTab, setActiveTab] = useState('basicos');
  const [buscaDisciplina, setBuscaDisciplina] = useState('');
  const [buscaBanca, setBuscaBanca] = useState('');
  const [buscaAssunto, setBuscaAssunto] = useState('');

  // Filtrar disciplinas por busca
  const disciplinasFiltradas = useMemo(() => {
    if (!buscaDisciplina) return indices.disciplinas;
    return indices.disciplinas.filter(d => 
      d.nome.toLowerCase().includes(buscaDisciplina.toLowerCase())
    );
  }, [indices.disciplinas, buscaDisciplina]);

  // Filtrar bancas por busca
  const bancasFiltradas = useMemo(() => {
    if (!buscaBanca) return indices.bancas;
    return indices.bancas.filter(b => 
      b.sigla.toLowerCase().includes(buscaBanca.toLowerCase()) ||
      b.nome.toLowerCase().includes(buscaBanca.toLowerCase())
    );
  }, [indices.bancas, buscaBanca]);

  // Assuntos disponíveis baseados nas disciplinas selecionadas
  const assuntosDisponiveis = useMemo(() => {
    if (!filtros.disciplinas?.length) {
      // Se nenhuma disciplina selecionada, retornar todos os assuntos
      return indices.disciplinas.flatMap(d => d.assuntos);
    }
    
    // Se disciplinas selecionadas, retornar apenas assuntos dessas disciplinas
    const disciplinasSelecionadas = indices.disciplinas.filter(d => 
      filtros.disciplinas?.includes(d.nome)
    );
    
    return disciplinasSelecionadas.flatMap(d => d.assuntos);
  }, [indices.disciplinas, filtros.disciplinas]);

  // Filtrar assuntos por busca
  const assuntosFiltrados = useMemo(() => {
    if (!buscaAssunto) return assuntosDisponiveis;
    return assuntosDisponiveis.filter(a => 
      a.nome.toLowerCase().includes(buscaAssunto.toLowerCase())
    );
  }, [assuntosDisponiveis, buscaAssunto]);
  const anosPorPeriodo = useMemo(() => {
    const anosOrdenados = [...indices.anos].sort((a, b) => b.ano - a.ano);
    return {
      recentes: anosOrdenados.filter(a => a.ano >= 2020),
      medios: anosOrdenados.filter(a => a.ano >= 2010 && a.ano < 2020),
      antigos: anosOrdenados.filter(a => a.ano < 2010),
    };
  }, [indices.anos]);

  const atualizarFiltro = (campo: keyof FiltroQuestoes, valor: any) => {
    const novosFiltros = { ...filtros, [campo]: valor };
    
    // Se alterou disciplinas, limpar assuntos que não são mais válidos
    if (campo === 'disciplinas') {
      const disciplinasSelecionadas = valor as string[] || [];
      if (disciplinasSelecionadas.length > 0 && filtros.assuntos?.length) {
        // Buscar assuntos válidos para as novas disciplinas
        const assuntosValidos = indices.disciplinas
          .filter(d => disciplinasSelecionadas.includes(d.nome))
          .flatMap(d => d.assuntos)
          .map(a => a.nome);
        
        // Filtrar apenas assuntos que ainda são válidos
        const assuntosFiltrados = filtros.assuntos.filter(a => assuntosValidos.includes(a));
        novosFiltros.assuntos = assuntosFiltrados.length > 0 ? assuntosFiltrados : undefined;
      } else if (disciplinasSelecionadas.length === 0) {
        // Se removeu todas as disciplinas, limpar assuntos
        novosFiltros.assuntos = undefined;
      }
    }
    
    onFiltrosChange(novosFiltros);
  };

  const toggleArrayItem = (campo: keyof FiltroQuestoes, item: string | number) => {
    const current = filtros[campo] as any[] || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    atualizarFiltro(campo, updated);
  };

  const limparFiltros = () => {
    onFiltrosChange({});
  };

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.disciplinas?.length) count++;
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

  // Validar códigos específicos
  const validarCodigos = async (codigos: string[]) => {
    try {
      const response = await fetch('/api/questoes/validate-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codes: codigos }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          valid: data.valid || [],
          invalid: data.invalid || [],
        };
      }
    } catch (error) {
      console.error('Erro ao validar códigos:', error);
    }

    return { valid: [], invalid: codigos };
  };

  const filtrosAtivos = contarFiltrosAtivos();

  return (
    <div className="space-y-4">
      {/* Header com estatísticas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Filtros
              {indices.disciplinas.length > 0 && (
                <Badge variant="success" className="text-xs">
                  Carregado
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                {totalQuestoes.toLocaleString()} questões
              </Badge>
              {filtrosAtivos > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filtrosAtivos} filtro(s)
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={limparFiltros}
                disabled={filtrosAtivos === 0}
              >
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs de filtros */}
      <Card>
        <CardContent className="p-0">
          <Tabs>
            <TabsList className="w-full">
              <TabsTrigger 
                value="basicos" 
                isActive={activeTab === 'basicos'}
                onClick={() => setActiveTab('basicos')}
              >
                Básicos
              </TabsTrigger>
              <TabsTrigger 
                value="avancados" 
                isActive={activeTab === 'avancados'}
                onClick={() => setActiveTab('avancados')}
              >
                Avançados
              </TabsTrigger>
              <TabsTrigger 
                value="codigos" 
                isActive={activeTab === 'codigos'}
                onClick={() => setActiveTab('codigos')}
              >
                Códigos
              </TabsTrigger>
              <TabsTrigger 
                value="salvos" 
                isActive={activeTab === 'salvos'}
                onClick={() => setActiveTab('salvos')}
              >
                Salvos
              </TabsTrigger>
            </TabsList>

            {/* Tab: Filtros Básicos */}
            <TabsContent value="basicos" isActive={activeTab === 'basicos'}>
              <div className="p-6 space-y-6">
                {/* Disciplinas */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Disciplinas {filtros.disciplinas?.length && `(${filtros.disciplinas.length})`}
                    </label>
                    {filtros.disciplinas?.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => atualizarFiltro('disciplinas', [])}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  
                  <Input
                    placeholder="Buscar disciplinas..."
                    value={buscaDisciplina}
                    onChange={(e) => setBuscaDisciplina(e.target.value)}
                    className="mb-3"
                  />
                  
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {disciplinasFiltradas.map((disciplina) => (
                      <label 
                        key={disciplina.nome} 
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={filtros.disciplinas?.includes(disciplina.nome) || false}
                          onChange={() => toggleArrayItem('disciplinas', disciplina.nome)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{disciplina.nome}</div>
                          <div className="text-xs text-gray-500">{disciplina.count} questões</div>
                        </div>
                      </label>
                    )                    )}
                  </div>
                </div>

                {/* Assuntos */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Assuntos {filtros.assuntos?.length && `(${filtros.assuntos.length})`}
                    </label>
                    {filtros.assuntos?.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => atualizarFiltro('assuntos', [])}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  
                  {filtros.disciplinas?.length ? (
                    <>
                      <Input
                        placeholder="Buscar assuntos..."
                        value={buscaAssunto}
                        onChange={(e) => setBuscaAssunto(e.target.value)}
                        className="mb-3"
                      />
                      
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                        {assuntosFiltrados.map((assunto, index) => (
                          <label 
                            key={`${assunto.nome}-${index}`}
                            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={filtros.assuntos?.includes(assunto.nome) || false}
                              onChange={() => toggleArrayItem('assuntos', assunto.nome)}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{assunto.nome}</div>
                              <div className="text-xs text-gray-500">{assunto.count} questões</div>
                            </div>
                          </label>
                        ))}
                        {assuntosFiltrados.length === 0 && (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Nenhum assunto encontrado
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
                      Selecione uma ou mais disciplinas para visualizar os assuntos disponíveis
                    </div>
                  )}
                </div>

                {/* Bancas */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Bancas {filtros.bancas?.length && `(${filtros.bancas.length})`}
                    </label>
                    {filtros.bancas?.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => atualizarFiltro('bancas', [])}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  
                  <Input
                    placeholder="Buscar bancas..."
                    value={buscaBanca}
                    onChange={(e) => setBuscaBanca(e.target.value)}
                    className="mb-3"
                  />
                  
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {bancasFiltradas.map((banca) => (
                      <label 
                        key={banca.sigla} 
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={filtros.bancas?.includes(banca.sigla) || false}
                          onChange={() => toggleArrayItem('bancas', banca.sigla)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{banca.sigla}</div>
                          <div className="text-xs text-gray-500">{banca.nome} • {banca.count} questões</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Anos */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Anos {filtros.anos?.length && `(${filtros.anos.length})`}
                    </label>
                    {filtros.anos?.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => atualizarFiltro('anos', [])}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {anosPorPeriodo.recentes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">2020-2025 (Recentes)</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {anosPorPeriodo.recentes.map((ano) => (
                            <label 
                              key={ano.ano} 
                              className="flex items-center text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filtros.anos?.includes(ano.ano) || false}
                                onChange={() => toggleArrayItem('anos', ano.ano)}
                                className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span>{ano.ano}</span>
                              <span className="text-xs text-gray-500 ml-1">({ano.count})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {anosPorPeriodo.medios.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">2010-2019</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {anosPorPeriodo.medios.map((ano) => (
                            <label 
                              key={ano.ano} 
                              className="flex items-center text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filtros.anos?.includes(ano.ano) || false}
                                onChange={() => toggleArrayItem('anos', ano.ano)}
                                className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span>{ano.ano}</span>
                              <span className="text-xs text-gray-500 ml-1">({ano.count})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {anosPorPeriodo.antigos.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Antes de 2010</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {anosPorPeriodo.antigos.map((ano) => (
                            <label 
                              key={ano.ano} 
                              className="flex items-center text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filtros.anos?.includes(ano.ano) || false}
                                onChange={() => toggleArrayItem('anos', ano.ano)}
                                className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span>{ano.ano}</span>
                              <span className="text-xs text-gray-500 ml-1">({ano.count})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Filtros Avançados */}
            <TabsContent value="avancados" isActive={activeTab === 'avancados'}>
              <div className="p-6 space-y-6">
                {/* Cadernos */}
                {cadernos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caderno Personalizado
                    </label>
                    <select
                      value={filtros.cadernoId || ''}
                      onChange={(e) => atualizarFiltro('cadernoId', e.target.value || undefined)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
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

                {/* Opções de filtro */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Opções de Estudo</h3>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtros.naoRepetirRespondidas || false}
                      onChange={(e) => atualizarFiltro('naoRepetirRespondidas', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Não repetir questões respondidas</div>
                      <div className="text-xs text-gray-500">Evita questões já respondidas anteriormente</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtros.incluirAnuladas || false}
                      onChange={(e) => atualizarFiltro('incluirAnuladas', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Incluir questões anuladas</div>
                      <div className="text-xs text-gray-500">Inclui questões que foram anuladas pelas bancas</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtros.incluirDesatualizadas || false}
                      onChange={(e) => atualizarFiltro('incluirDesatualizadas', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Incluir questões desatualizadas</div>
                      <div className="text-xs text-gray-500">Inclui questões com conteúdo desatualizado</div>
                    </div>
                  </label>
                </div>

                {/* Status das respostas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status das Respostas
                  </label>
                  <select
                    value={filtros.statusResposta || 'todas'}
                    onChange={(e) => atualizarFiltro('statusResposta', e.target.value as any)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    <option value="todas">Todas as questões</option>
                    <option value="acertadas">Apenas questões acertadas</option>
                    <option value="erradas">Apenas questões erradas</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Códigos Específicos */}
            <TabsContent value="codigos" isActive={activeTab === 'codigos'}>
              <div className="p-6">
                <CodigosEspecificos
                  codigos={filtros.codigosPersonalizados || []}
                  onChange={(codigos) => atualizarFiltro('codigosPersonalizados', codigos.length > 0 ? codigos : undefined)}
                  onValidate={validarCodigos}
                />
              </div>
            </TabsContent>

            {/* Tab: Filtros Salvos */}
            <TabsContent value="salvos" isActive={activeTab === 'salvos'}>
              <div className="p-6">
                <FiltrosSalvos
                  filtrosAtuais={filtros}
                  onAplicarFiltro={onFiltrosChange}
                  onSalvarFiltro={async (filtro) => {
                    // Implementar salvamento via API
                    const response = await fetch('/api/user/saved-filters', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(filtro),
                    });
                    
                    if (!response.ok) {
                      throw new Error('Erro ao salvar filtro');
                    }
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
