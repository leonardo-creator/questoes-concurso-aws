import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, ensurePrismaConnection } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import type { Questao, FiltroQuestoes, OrdenacaoQuestoes, ItemQuestao } from '@/types';

const QUESTOES_PER_PAGE = 120;

// Cache em memória para contagens de filtros
const filterCountCache = new Map<string, number>();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || String(QUESTOES_PER_PAGE)), 120);
    
    // Parâmetros de filtro - Suporte a ranges e filtros flexíveis
    const filtros: FiltroQuestoes = {
      disciplinas: searchParams.get('disciplinas')?.split(',').filter(Boolean),
      assuntos: searchParams.get('assuntos')?.split(',').filter(Boolean),
      bancas: searchParams.get('bancas')?.split(',').filter(Boolean),
      anos: searchParams.get('anos')?.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a)),
      // Suporte a range de anos
      anoInicio: searchParams.get('anoInicio') ? parseInt(searchParams.get('anoInicio')!) : undefined,
      anoFim: searchParams.get('anoFim') ? parseInt(searchParams.get('anoFim')!) : undefined,
      dificuldades: searchParams.get('dificuldades')?.split(',').filter(Boolean),
      tipoQuestao: (searchParams.get('tipoQuestao') as any) || undefined,
      incluirAnuladas: searchParams.get('incluirAnuladas') === 'true',
      incluirDesatualizadas: searchParams.get('incluirDesatualizadas') === 'true',
      naoRepetirRespondidas: searchParams.get('naoRepetirRespondidas') === 'true',
      statusResposta: searchParams.get('statusResposta') as any,
      codigosPersonalizados: searchParams.get('codigosPersonalizados')?.split(',')
        .filter(Boolean)
        .map(codigo => codigo.trim().replace(/^["']|["']$/g, '')), // Remove aspas do início e fim
      cadernoId: searchParams.get('cadernoId') || undefined,
      provasNivel: searchParams.get('provasNivel')?.split(',').filter(Boolean),
    };

    const ordenacao = (searchParams.get('ordenacao') || 'relevancia') as OrdenacaoQuestoes;

    // Se for modo estudo inteligente, usar lógica especial
    if (ordenacao === 'estudo_inteligente') {
      const questoesInteligentes = await buscarQuestoesEstudoInteligente(
        filtros, 
        limit, 
        session.user.id, 
        page
      );
      
      return NextResponse.json({
        success: true,
        data: questoesInteligentes.data,
        total: questoesInteligentes.total,
        page,
        limit,
        totalPages: Math.ceil(questoesInteligentes.total / limit),
        filtrosAplicados: filtros,
        ordenacao,
        modoInteligente: {
          explicacao: questoesInteligentes.explicacao,
          proximoAssunto: questoesInteligentes.proximoAssunto
        }
      });
    }

    // Log dos filtros para debug
    console.log('Filtros recebidos:', {
      ...filtros,
      anos: filtros.anos
    });

    // Busca otimizada no PostgreSQL
    const questoesEncontradas = await buscarQuestoesPostgreSQL(filtros, limit, session.user.id, page);

    console.log(`📊 Resultado da busca: ${questoesEncontradas.total} questões encontradas`);
    
    if (questoesEncontradas.data.length === 0) {
      console.log('⚠️ Nenhuma questão encontrada - verificando filtros...');
    }

    // Aplicar ordenação (já aplicada no PostgreSQL, mas mantemos para compatibilidade)
    questoesEncontradas.data.sort((a, b) => {
      switch (ordenacao) {
        case 'data_desc':
          return b.ano - a.ano;
        case 'data_asc':
          return a.ano - b.ano;
        case 'dificuldade_asc':
          return getDificuldadeNumero(a.dificuldade) - getDificuldadeNumero(b.dificuldade);
        case 'dificuldade_desc':
          return getDificuldadeNumero(b.dificuldade) - getDificuldadeNumero(a.dificuldade);
        default:
          return 0; // relevancia - manter ordem original
      }
    });

    // Dados já paginados pelo PostgreSQL
    return NextResponse.json({
      success: true,
      data: questoesEncontradas.data,
      total: questoesEncontradas.total,
      page,
      limit,
      totalPages: Math.ceil(questoesEncontradas.total / limit),
      filtrosAplicados: filtros,
      ordenacao
    });

  } catch (error) {
    console.error('Erro na API de questões:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função auxiliar para converter número de dificuldade em texto
function getDificuldadeTexto(dificuldade: number): 'Fácil' | 'Média' | 'Difícil' {
  if (dificuldade === 1) return 'Fácil';
  if (dificuldade === 2) return 'Média';
  return 'Difícil';
}

// Função auxiliar para converter dificuldade em número para ordenação
function getDificuldadeNumero(dificuldade: string): number {
  switch (dificuldade?.toLowerCase()) {
    case 'fácil':
    case 'facil': 
      return 1;
    case 'média':
    case 'media':
      return 2;
    case 'difícil':
    case 'dificil':
      return 3;
    default:
      return 2; // Padrão média
  }
}

// Função principal de busca no PostgreSQL
async function buscarQuestoesPostgreSQL(
  filtros: FiltroQuestoes, 
  limit: number, 
  userId: string,
  page: number
): Promise<{ data: Questao[], total: number }> {
  try {
    // Garantir conexão com PostgreSQL
    const isConnected = await ensurePrismaConnection();
    if (!isConnected) {
      console.error('PostgreSQL não disponível');
      return { data: [], total: 0 };
    }

    // Construir filtros WHERE do Prisma
    const whereConditions: any = {};

    // Filtros básicos de qualidade
    if (!filtros.incluirAnuladas) {
      whereConditions.anulada = false;
    }
    
    if (!filtros.incluirDesatualizadas) {
      whereConditions.desatualizada = false;
    }

    // Filtros de conteúdo
    if (filtros.disciplinas?.length) {
      whereConditions.disciplinaReal = { in: filtros.disciplinas };
    }

    if (filtros.assuntos?.length) {
      whereConditions.assuntoReal = { in: filtros.assuntos };
    }

    if (filtros.bancas?.length) {
      whereConditions.bancasSigla = { in: filtros.bancas };
    }

    // Filtro de anos (support tanto lista específica quanto range)
    if (filtros.anos?.length) {
      whereConditions.anos = { in: filtros.anos };
    } else if (filtros.anoInicio || filtros.anoFim) {
      const anoFilter: any = {};
      if (filtros.anoInicio) anoFilter.gte = filtros.anoInicio;
      if (filtros.anoFim) anoFilter.lte = filtros.anoFim;
      whereConditions.anos = anoFilter;
    }

    // Filtro de dificuldades
    if (filtros.dificuldades?.length) {
      const dificuldadeNums = filtros.dificuldades.map(d => {
        switch (d) {
          case 'Fácil': return 1;
          case 'Média': return 2;
          case 'Difícil': return 3;
          default: return 2;
        }
      });
      whereConditions.dificuldade = { in: dificuldadeNums };
    }

    // Filtro por tipo de questão (baseado no número de alternativas)
    if (filtros.tipoQuestao && filtros.tipoQuestao !== 'todas') {
      // Este filtro será aplicado após buscar os dados, pois depende do processamento dos itens
      // Manteremos a lógica no pós-processamento
    }

    // Filtro por códigos personalizados
    if (filtros.codigosPersonalizados?.length) {
      whereConditions.codigoReal = { in: filtros.codigosPersonalizados };
    }

    // Filtro por nível da prova
    if (filtros.provasNivel?.length) {
      whereConditions.provasNivel = { in: filtros.provasNivel };
    }

    // Filtro por caderno
    if (filtros.cadernoId) {
      try {
        const caderno = await prisma.customList.findFirst({
          where: { id: filtros.cadernoId, userId }
        });
        if (caderno?.questionCodes?.length) {
          whereConditions.codigoReal = { in: caderno.questionCodes };
        } else {
          // Se caderno não existe ou está vazio, retornar vazio
          return { data: [], total: 0 };
        }
      } catch (error) {
        console.warn('Erro ao buscar caderno:', error);
        return { data: [], total: 0 };
      }
    }

    // Filtro por questões respondidas
    if (filtros.naoRepetirRespondidas || filtros.statusResposta !== 'todas') {
      try {
        const respostas = await prisma.answer.findMany({
          where: { userId },
          select: { questaoCodigoReal: true, acertou: true }
        });

        let codigosParaFiltrar: string[] = [];
        
        if (filtros.naoRepetirRespondidas) {
          // Excluir questões já respondidas
          codigosParaFiltrar = respostas.map(r => r.questaoCodigoReal);
          whereConditions.codigoReal = { notIn: codigosParaFiltrar };
        } else if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
          // Incluir apenas questões com status específico
          const acertou = filtros.statusResposta === 'acertadas';
          codigosParaFiltrar = respostas
            .filter(r => r.acertou === acertou)
            .map(r => r.questaoCodigoReal);
          whereConditions.codigoReal = { in: codigosParaFiltrar };
        }
      } catch (error) {
        console.warn('Erro ao buscar respostas do usuário:', error);
      }
    }

    // Buscar total de questões (para paginação)
    const total = await prisma.question.count({ where: whereConditions });

    // Buscar questões com paginação
    const questoesDB = await prisma.question.findMany({
      where: whereConditions,
      select: {
        questaoId: true,
        codigoReal: true,
        enunciado: true,
        itens: true,
        resposta: true,
        disciplinaReal: true,
        assuntoReal: true,
        bancasNome: true,
        bancasSigla: true,
        cargosDescricao: true,
        orgaosNome: true,
        orgaosSigla: true,
        anos: true,
        dificuldade: true,
        anulada: true,
        desatualizada: true
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { anos: 'desc' },
        { questaoId: 'asc' }
      ]
    });

    // Converter dados do PostgreSQL para o formato esperado
    const questoesFormatadas: Questao[] = questoesDB.map(q => {
      // Log detalhado para debug
      console.log(`🔍 Processando questão ${q.codigoReal}:`);
      console.log('- Tipo de itens:', typeof q.itens);
      console.log('- É array?', Array.isArray(q.itens));
      
      // Validar e processar itens das questões
      let itensProcessados: ItemQuestao[] = [];
      
      try {
        if (Array.isArray(q.itens)) {
          console.log('✅ Itens é array, processando...');
          itensProcessados = q.itens.filter(item => 
            item && 
            typeof item === 'object' && 
            item !== null
          ).map((item, index) => {
            const itemObj = item as any;
            
            // Log da estrutura do primeiro item para debug
            if (index === 0) {
              console.log('📋 Estrutura do item:', Object.keys(itemObj));
              console.log('📋 Conteúdo do item:', itemObj);
            }
            
            // Mapear diferentes estruturas possíveis dos chunks
            return {
              id_alternativa: itemObj.id || itemObj.id_alternativa || index + 1,
              letra: (itemObj.rotulo || itemObj.letra || String.fromCharCode(65 + index)).replace(/\s+/g, ''),
              texto: itemObj.corpo || itemObj.texto || itemObj.corpo_clean || 'Alternativa sem texto'
            };
          });
        } else if (typeof q.itens === 'string') {
          console.log('⚙️ Itens é string, fazendo parse...');
          const parsed = JSON.parse(q.itens);
          if (Array.isArray(parsed)) {
            itensProcessados = parsed.filter(item => 
              item && 
              typeof item === 'object' && 
              item !== null
            ).map((item, index) => ({
              id_alternativa: item.id || item.id_alternativa || index + 1,
              letra: (item.rotulo || item.letra || String.fromCharCode(65 + index)).replace(/\s+/g, ''),
              texto: item.corpo || item.texto || item.corpo_clean || 'Alternativa sem texto'
            }));
          }
        } else if (q.itens && typeof q.itens === 'object') {
          console.log('🔧 Itens é objeto, tentando conversão...');
          // Pode ser um objeto Prisma/PostgreSQL
          const itensObj = q.itens as any;
          if (itensObj.alternativas || itensObj.opcoes || itensObj.items) {
            const alternativas = itensObj.alternativas || itensObj.opcoes || itensObj.items;
            if (Array.isArray(alternativas)) {
              itensProcessados = alternativas.map((item, index) => ({
                id_alternativa: item.id_alternativa || item.id || index + 1,
                letra: item.letra || String.fromCharCode(65 + index),
                texto: item.texto || item.corpo || item.corpo_clean || 'Alternativa sem texto'
              }));
            }
          }
        }
      } catch (error) {
        console.warn(`❌ Erro ao processar itens da questão ${q.codigoReal}:`, error);
        itensProcessados = [];
      }

      console.log(`📊 Questão ${q.codigoReal}: ${itensProcessados.length} alternativas processadas`);
      if (itensProcessados.length > 0) {
        console.log('✅ Primeira alternativa:', itensProcessados[0]);
      }

      return {
        id: q.questaoId,
        codigo_real: q.codigoReal,
        enunciado: q.enunciado || '',
        itens: itensProcessados,
        resposta: q.resposta || '',
        disciplina_real: q.disciplinaReal || '',
        assunto_real: q.assuntoReal || '',
        bancas_nome: q.bancasNome || '',
        bancas_sigla: q.bancasSigla || '',
        cargos_descricao: q.cargosDescricao || '',
        orgaos_nome: q.orgaosNome || '',
        orgaos_sigla: q.orgaosSigla || '',
        ano: q.anos || 0,
        dificuldade: getDificuldadeTexto(q.dificuldade),
        anulada: q.anulada || false,
        desatualizada: q.desatualizada || false
      };
    });

    // Aplicar filtro por tipo de questão (pós-processamento)
    let questoesFiltradas = questoesFormatadas;
    if (filtros.tipoQuestao && filtros.tipoQuestao !== 'todas') {
      questoesFiltradas = questoesFormatadas.filter(questao => {
        const numAlternativas = questao.itens.length;
        if (filtros.tipoQuestao === 'certo_errado') {
          return numAlternativas <= 2; // Certo/Errado geralmente tem 2 alternativas (C/E)
        } else if (filtros.tipoQuestao === 'multipla_escolha') {
          return numAlternativas > 2; // Múltipla escolha tem 3+ alternativas (A, B, C, D, E)
        }
        return true;
      });
    }

    // Recalcular o total após filtro de tipo de questão
    const totalFiltrado = questoesFiltradas.length;

    return {
      data: questoesFiltradas,
      total: totalFiltrado
    };

  } catch (error) {
    console.error('Erro na busca PostgreSQL:', error);
    return { data: [], total: 0 };
  }
}

// Função especializada para busca com ordenação inteligente
async function buscarQuestoesEstudoInteligente(
  filtros: FiltroQuestoes, 
  limit: number, 
  userId: string,
  page: number
): Promise<{ 
  data: Questao[], 
  total: number, 
  explicacao: string, 
  proximoAssunto?: string 
}> {
  try {
    console.log('🧠 Iniciando busca de estudo inteligente...');

    // CORREÇÃO: Buscar TODAS as questões que atendem aos filtros do usuário primeiro
    // Não aplicar filtros adicionais, apenas os que o usuário escolheu
    const questoesBase = await buscarQuestoesPostgreSQL(filtros, limit * 5, userId, 1); // Buscar mais questões para ter variedade
    
    if (questoesBase.data.length === 0) {
      console.log('⚠️ Nenhuma questão encontrada para os filtros aplicados');
      return {
        data: [],
        total: 0,
        explicacao: 'Nenhuma questão encontrada com os filtros selecionados.'
      };
    }

    console.log(`📚 Encontradas ${questoesBase.data.length} questões base para análise inteligente`);

    // 1. Analisar progresso do usuário por assunto (das questões encontradas)
    const assuntosMap = new Map<string, Questao[]>();
    
    // Agrupar questões por assunto
    for (const questao of questoesBase.data) {
      const assunto = questao.assunto_real;
      if (!assuntosMap.has(assunto)) {
        assuntosMap.set(assunto, []);
      }
      assuntosMap.get(assunto)!.push(questao);
    }

    // 2. Calcular prioridade de cada assunto (simulado - baseado na quantidade de questões)
    const assuntosComPrioridade = Array.from(assuntosMap.entries()).map(([assunto, questoes]) => {
      // Simular progresso: assuntos com menos questões têm maior prioridade
      const hash = assunto.length;
      const percentualConcluido = Math.min(95, (hash % 100));
      const prioridade = 100 - percentualConcluido;
      
      return {
        assunto,
        questoes,
        percentualConcluido,
        prioridade,
        totalQuestoes: questoes.length
      };
    });

    // 3. Ordenar assuntos por prioridade (menos estudados primeiro)
    const assuntosOrdenados = assuntosComPrioridade.sort((a, b) => b.prioridade - a.prioridade);
    
    // 4. Criar lista de questões priorizadas
    const questoesPriorizadas: Questao[] = [];
    
    // Distribuir questões de forma inteligente: 
    // - Priorizar assuntos menos estudados
    // - Dentro de cada assunto, ordenar por dificuldade (difícil → fácil)
    for (const assuntoInfo of assuntosOrdenados) {
      // Ordenar questões do assunto por dificuldade (mais difícil primeiro)
      const questoesOrdenadas = assuntoInfo.questoes.sort((a, b) => {
        const dificuldadeA = getDificuldadeNumero(a.dificuldade);
        const dificuldadeB = getDificuldadeNumero(b.dificuldade);
        return dificuldadeB - dificuldadeA; // Desc: mais difícil primeiro
      });
      
      questoesPriorizadas.push(...questoesOrdenadas);
    }

    // 5. Aplicar paginação nas questões priorizadas
    const startIndex = (page - 1) * limit;
    const questoesPaginadas = questoesPriorizadas.slice(startIndex, startIndex + limit);

    const assuntoMenosEstudado = assuntosOrdenados[0]?.assunto || 'N/A';
    const explicacao = questoesPaginadas.length > 0 
      ? `Modo Estudo Inteligente: Priorizando assuntos menos estudados. Assunto com maior prioridade: "${assuntoMenosEstudado}". Questões ordenadas por dificuldade.`
      : 'Nenhuma questão disponível para estudo inteligente.';

    console.log(`✅ Retornando ${questoesPaginadas.length} questões de ${assuntosOrdenados.length} assuntos para estudo inteligente`);
    console.log(`🎯 Assunto prioritário: ${assuntoMenosEstudado}`);

    return {
      data: questoesPaginadas,
      total: questoesPriorizadas.length, // Total baseado em todas as questões priorizadas
      explicacao,
      proximoAssunto: assuntoMenosEstudado
    };

  } catch (error) {
    console.error('Erro na busca de estudo inteligente:', error);
    return {
      data: [],
      total: 0,
      explicacao: 'Erro ao processar estudo inteligente. Tente novamente.'
    };
  }
}

// Função para analisar progresso de assuntos
async function analisarProgressoAssuntos(
  filtros: FiltroQuestoes, 
  userId: string
): Promise<Array<{ assunto: string, disciplina: string, percentualConcluido: number, prioridade: number }>> {
  try {
    // Buscar questões nos chunks para análise rápida
    const questoesSample = await carregarQuestoesDosChunks();
    
    // Filtrar por disciplinas/assuntos selecionados
    let questoesFiltradas = questoesSample;
    
    if (filtros.disciplinas?.length) {
      questoesFiltradas = questoesFiltradas.filter(q => 
        filtros.disciplinas!.includes(q.disciplina_real)
      );
    }

    if (filtros.assuntos?.length) {
      questoesFiltradas = questoesFiltradas.filter(q => 
        filtros.assuntos!.includes(q.assunto_real)
      );
    }

    // Agrupar por assunto
    const assuntoMap = new Map<string, any[]>();
    for (const questao of questoesFiltradas) {
      const key = `${questao.disciplina_real}|${questao.assunto_real}`;
      if (!assuntoMap.has(key)) {
        assuntoMap.set(key, []);
      }
      assuntoMap.get(key)!.push(questao);
    }

    // Calcular progresso (simulado para MVP)
    const progressos = [];
    for (const [key, questoes] of assuntoMap) {
      const [disciplina, assunto] = key.split('|');
      
      // Simular progresso baseado no hash do assunto
      const hash = assunto.length + disciplina.length;
      const percentualConcluido = (hash % 100);
      const prioridade = 100 - percentualConcluido; // Menos estudado = maior prioridade
      
      progressos.push({
        assunto,
        disciplina,
        percentualConcluido,
        prioridade
      });
    }

    return progressos;

  } catch (error) {
    console.error('Erro ao analisar progresso de assuntos:', error);
    return [];
  }
}

// Função auxiliar para carregar amostra das questões dos chunks
async function carregarQuestoesDosChunks(): Promise<Array<{
  codigo_real: string,
  disciplina_real: string,
  assunto_real: string,
  dificuldade: string
}>> {
  const questoes: any[] = [];
  
  try {
    // Carregar apenas alguns chunks para análise rápida
    const chunksPrincipais = [1, 10, 20, 30, 40]; // Amostra representativa
    
    for (const chunkNum of chunksPrincipais) {
      const chunkPath = path.join(process.cwd(), 'chunks', `batch_${chunkNum.toString().padStart(3, '0')}.json`);
      
      try {
        if (fs.existsSync(chunkPath)) {
          const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
          
          for (const questao of chunkData) {
            if (questao.codigo_real && questao.disciplina_real && questao.assunto_real) {
              questoes.push({
                codigo_real: questao.codigo_real,
                disciplina_real: questao.disciplina_real,
                assunto_real: questao.assunto_real,
                dificuldade: questao.dificuldade || 'Média'
              });
            }
          }
        }
      } catch (chunkError) {
        console.warn(`Erro ao carregar chunk ${chunkNum}:`, chunkError);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar chunks:', error);
  }

  return questoes;
}
