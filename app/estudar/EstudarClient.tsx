'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { FiltrosHorizontal } from '@/components/estudar/FiltrosHorizontal';
import { QuestaoComponent } from '@/components/estudar/QuestaoComponent';
import type { Questao, FiltroQuestoes, TipoQuestao, OrdenacaoQuestoes } from '@/types';

interface QuestoesResponse {
  success: boolean;
  data: Questao[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filtrosAplicados: FiltroQuestoes;
  ordenacao: string;
}

interface DisciplinaComAssuntos {
  nome: string;
  assuntos: AssuntoItem[];
}

interface AssuntoItem {
  codigo: string;
  titulo: string;
  nivel: number;
}

export default function EstudarClient() {
  const { data: session, status } = useSession();
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [totalQuestoes, setTotalQuestoes] = useState(0);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  
  // Estados para disciplinas e assuntos
  const [disciplinas, setDisciplinas] = useState<DisciplinaComAssuntos[]>([]);
  const [assuntosDisponiveis, setAssuntosDisponiveis] = useState<AssuntoItem[]>([]);
  const [carregandoDisciplinas, setCarregandoDisciplinas] = useState(false);

  // Estados para índices dos filtros
  const [indices, setIndices] = useState({
    disciplinas: [] as Array<{ nome: string; count: number; assuntos: Array<{ nome: string; count: number }> }>,
    bancas: [] as Array<{ sigla: string; nome: string; count: number }>,
    anos: [] as Array<{ ano: number; count: number }>
  });
  const [carregandoIndices, setCarregandoIndices] = useState(true);

  // Estados separados: filtros pendentes vs aplicados
  const [filtros, setFiltros] = useState<FiltroQuestoes>({
    disciplinas: [],
    assuntos: [],
    bancas: [],
    anos: [],
    anoInicio: undefined,
    anoFim: undefined,
    dificuldades: [],
    tipoQuestao: 'todas' as TipoQuestao,
    incluirAnuladas: false,
    incluirDesatualizadas: false,
    naoRepetirRespondidas: false,
    statusResposta: 'todas',
    codigosPersonalizados: [],
    cadernoId: undefined,
  });

  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltroQuestoes>(filtros);
  const [contandoQuestoes, setContandoQuestoes] = useState(false);
  const [contadorQuestoes, setContadorQuestoes] = useState(0);

  // Estado para ordenação
  const [ordenacao, setOrdenacao] = useState<OrdenacaoQuestoes>('relevancia');

  // Carregar disciplinas ao montar o componente
  const carregarDisciplinas = async () => {
    setCarregandoDisciplinas(true);
    try {
      const response = await fetch('/api/materias');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDisciplinas(data.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    } finally {
      setCarregandoDisciplinas(false);
    }
  };

  // Carregar assuntos quando disciplinas mudarem
  const carregarAssuntos = async (disciplinasSelecionadas: string[]) => {
    if (disciplinasSelecionadas.length === 0) {
      setAssuntosDisponiveis([]);
      return;
    }

    const todosAssuntos: AssuntoItem[] = [];
    
    for (const disciplinaNome of disciplinasSelecionadas) {
      const disciplina = disciplinas.find(d => d.nome === disciplinaNome);
      if (disciplina) {
        todosAssuntos.push(...disciplina.assuntos);
      }
    }

    setAssuntosDisponiveis(todosAssuntos);
  };

  // Função para lidar com mudanças nas disciplinas
  const handleDisciplinasChange = (novasDisciplinas: string[]) => {
    // Atualizar filtros
    const novosFiltros = {
      ...filtros,
      disciplinas: novasDisciplinas.length > 0 ? novasDisciplinas : undefined,
      // Limpar assuntos se não há disciplinas selecionadas
      assuntos: novasDisciplinas.length === 0 ? undefined : filtros.assuntos
    };
    setFiltros(novosFiltros);

    // Carregar assuntos para as disciplinas selecionadas
    carregarAssuntos(novasDisciplinas);
  };

  // Carregamento das disciplinas e índices
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [bancasRes, anosRes] = await Promise.all([
          fetch('/api/indices/bancas'),
          fetch('/api/indices/anos')
        ]);

        if (!bancasRes.ok || !anosRes.ok) {
          throw new Error('Erro ao carregar índices');
        }

        const [bancasData, anosData] = await Promise.all([
          bancasRes.json(),
          anosRes.json()
        ]);

        setIndices({
          disciplinas: [], // Agora usamos o estado disciplinas
          bancas: bancasData.success ? bancasData.data : [],
          anos: anosData.success ? anosData.data : []
        });

        // Carregar disciplinas após os outros dados
        await carregarDisciplinas();
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setErro('Erro ao carregar filtros. Tente atualizar a página.');
      } finally {
        setCarregandoIndices(false);
      }
    };

    carregarDados();
  }, []);

  // Carregar questões iniciais
  useEffect(() => {
    if (!carregandoIndices && session) {
      aplicarFiltros();
    }
  }, [carregandoIndices, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualizar contador quando filtros mudarem
  useEffect(() => {
    if (!carregandoIndices && session) {
      // Só contar se há diferenças entre filtros pendentes e aplicados
      const filtrosMudaram = JSON.stringify(filtros) !== JSON.stringify(filtrosAplicados);
      if (filtrosMudaram) {
        contarQuestoes();
      }
    }
  }, [filtros, filtrosAplicados, carregandoIndices, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar assuntos quando disciplinas selecionadas mudarem
  useEffect(() => {
    if (filtros.disciplinas && filtros.disciplinas.length > 0) {
      carregarAssuntos(filtros.disciplinas);
    } else {
      setAssuntosDisponiveis([]);
    }
  }, [filtros.disciplinas, disciplinas]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading' || carregandoIndices) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Carregando...</div>
    </div>;
  }

  if (!session) {
    redirect('/auth/login');
  }

  // Função para contar questões com filtros pendentes
  const contarQuestoes = async () => {
    if (contandoQuestoes) return;
    
    setContandoQuestoes(true);
    try {
      const params = new URLSearchParams();
      
      // Aplicar filtros aos parâmetros
      if (filtros.disciplinas?.length) {
        params.append('disciplinas', filtros.disciplinas.join(','));
      }
      if (filtros.assuntos?.length) {
        params.append('assuntos', filtros.assuntos.join(','));
      }
      if (filtros.bancas?.length) {
        params.append('bancas', filtros.bancas.join(','));
      }
      if (filtros.anos?.length) {
        params.append('anos', filtros.anos.join(','));
      }
      if (filtros.anoInicio) {
        params.append('anoInicio', filtros.anoInicio.toString());
      }
      if (filtros.anoFim) {
        params.append('anoFim', filtros.anoFim.toString());
      }
      if (filtros.dificuldades?.length) {
        params.append('dificuldades', filtros.dificuldades.join(','));
      }
      if (filtros.tipoQuestao && filtros.tipoQuestao !== 'todas') {
        params.append('tipoQuestao', filtros.tipoQuestao);
      }
      if (filtros.incluirAnuladas) {
        params.append('incluirAnuladas', 'true');
      }
      if (filtros.incluirDesatualizadas) {
        params.append('incluirDesatualizadas', 'true');
      }
      if (filtros.naoRepetirRespondidas) {
        params.append('naoRepetirRespondidas', 'true');
      }
      if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
        params.append('statusResposta', filtros.statusResposta);
      }
      if (filtros.codigosPersonalizados?.length) {
        params.append('codigosPersonalizados', filtros.codigosPersonalizados.join(','));
      }
      if (filtros.cadernoId) {
        params.append('cadernoId', filtros.cadernoId);
      }

      const response = await fetch(`/api/questoes/count?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao contar questões');
      }

      const data = await response.json();
      setContadorQuestoes(data.count);
    } catch (error) {
      console.error('Erro ao contar questões:', error);
      setContadorQuestoes(0);
    } finally {
      setContandoQuestoes(false);
    }
  };

  // Função para aplicar filtros
  const aplicarFiltros = async () => {
    setCarregando(true);
    setErro(null);
    setPaginaAtual(1);

    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '120');
      
      // Aplicar filtros aos parâmetros
      if (filtros.disciplinas?.length) {
        params.append('disciplinas', filtros.disciplinas.join(','));
      }
      if (filtros.assuntos?.length) {
        params.append('assuntos', filtros.assuntos.join(','));
      }
      if (filtros.bancas?.length) {
        params.append('bancas', filtros.bancas.join(','));
      }
      if (filtros.anos?.length) {
        params.append('anos', filtros.anos.join(','));
      }
      if (filtros.anoInicio) {
        params.append('anoInicio', filtros.anoInicio.toString());
      }
      if (filtros.anoFim) {
        params.append('anoFim', filtros.anoFim.toString());
      }
      if (filtros.dificuldades?.length) {
        params.append('dificuldades', filtros.dificuldades.join(','));
      }
      if (filtros.tipoQuestao && filtros.tipoQuestao !== 'todas') {
        params.append('tipoQuestao', filtros.tipoQuestao);
      }
      if (filtros.incluirAnuladas) {
        params.append('incluirAnuladas', 'true');
      }
      if (filtros.incluirDesatualizadas) {
        params.append('incluirDesatualizadas', 'true');
      }
      if (filtros.naoRepetirRespondidas) {
        params.append('naoRepetirRespondidas', 'true');
      }
      if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
        params.append('statusResposta', filtros.statusResposta);
      }
      if (filtros.codigosPersonalizados?.length) {
        params.append('codigosPersonalizados', filtros.codigosPersonalizados.join(','));
      }
      if (filtros.cadernoId) {
        params.append('cadernoId', filtros.cadernoId);
      }
      
      // Adicionar ordenação
      params.append('ordenacao', ordenacao);

      const response = await fetch(`/api/questoes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar questões');
      }

      const data: QuestoesResponse = await response.json();
      
      if (data.success) {
        setQuestoes(data.data);
        setTotalQuestoes(data.total);
        setTotalPaginas(data.totalPages);
        setFiltrosAplicados({ ...filtros }); // Salvar filtros aplicados
      } else {
        throw new Error('Erro no servidor');
      }
    } catch (error) {
      console.error('Erro ao buscar questões:', error);
      setErro('Erro ao carregar questões. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarMaisPaginas = async (pagina: number) => {
    if (carregando) return;

    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagina.toString());
      params.append('limit', '120');
      
      // Usar filtros aplicados para paginação
      if (filtrosAplicados.disciplinas?.length) {
        params.append('disciplinas', filtrosAplicados.disciplinas.join(','));
      }
      if (filtrosAplicados.assuntos?.length) {
        params.append('assuntos', filtrosAplicados.assuntos.join(','));
      }
      if (filtrosAplicados.bancas?.length) {
        params.append('bancas', filtrosAplicados.bancas.join(','));
      }
      if (filtrosAplicados.anos?.length) {
        params.append('anos', filtrosAplicados.anos.join(','));
      }
      if (filtrosAplicados.anoInicio) {
        params.append('anoInicio', filtrosAplicados.anoInicio.toString());
      }
      if (filtrosAplicados.anoFim) {
        params.append('anoFim', filtrosAplicados.anoFim.toString());
      }
      if (filtrosAplicados.dificuldades?.length) {
        params.append('dificuldades', filtrosAplicados.dificuldades.join(','));
      }
      if (filtrosAplicados.tipoQuestao && filtrosAplicados.tipoQuestao !== 'todas') {
        params.append('tipoQuestao', filtrosAplicados.tipoQuestao);
      }
      
      // Adicionar ordenação
      params.append('ordenacao', ordenacao);

      const response = await fetch(`/api/questoes?${params.toString()}`);
      const data: QuestoesResponse = await response.json();
      
      if (data.success) {
        setQuestoes(data.data);
        setPaginaAtual(pagina);
      }
    } catch (error) {
      console.error('Erro ao carregar página:', error);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Estudar Questões
          </h1>
          <p className="text-gray-600">
            Use os filtros para encontrar questões específicas
          </p>
        </div>

        {/* Filtros Horizontais */}
        <FiltrosHorizontal
          filtros={filtros}
          onFiltrosChange={setFiltros}
          onFiltrar={aplicarFiltros}
          contandoQuestoes={contandoQuestoes}
          totalQuestoes={contadorQuestoes}
          indices={indices}
          cadernos={[]}
          disciplinas={disciplinas}
          assuntosDisponiveis={assuntosDisponiveis}
          onDisciplinasChange={handleDisciplinasChange}
          carregandoDisciplinas={carregandoDisciplinas}
          ordenacao={ordenacao}
          onOrdenacaoChange={setOrdenacao}
        />

        {/* Resultados */}
        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {erro}
          </div>
        )}

        {carregando && questoes.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Informações dos resultados */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{totalQuestoes}</span> questões encontradas
                  {totalPaginas > 1 && (
                    <span className="ml-2">
                      (Página {paginaAtual} de {totalPaginas})
                    </span>
                  )}
                </div>
                {carregando && (
                  <div className="text-sm text-blue-600">
                    Carregando...
                  </div>
                )}
              </div>
            </div>

            {/* Lista de questões */}
            <div className="space-y-6">
              {questoes.map((questao, index) => (
                <QuestaoComponent
                  key={`${questao.codigo_real}-${index}`}
                  questao={questao}
                  onResposta={() => {}}
                />
              ))}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="mt-8 flex justify-center space-x-2">
                {Array.from({ length: Math.min(totalPaginas, 10) }, (_, i) => {
                  const pagina = i + 1;
                  return (
                    <button
                      key={pagina}
                      onClick={() => carregarMaisPaginas(pagina)}
                      disabled={carregando}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        pagina === paginaAtual
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } ${carregando ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {pagina}
                    </button>
                  );
                })}
              </div>
            )}

            {questoes.length === 0 && !carregando && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">
                  Nenhuma questão encontrada com os filtros selecionados.
                </div>
                <div className="text-gray-400 text-sm mt-2">
                  Tente ajustar os filtros para encontrar questões.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}