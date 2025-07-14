import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import type { Questao, FiltroQuestoes, OrdenacaoQuestoes } from '@/types';

const QUESTOES_PER_PAGE = 120;
const MAX_CHUNKS_TO_SEARCH = 10; // Limitar busca para economizar memória

// Cache em memória para chunks já carregados
const chunkCache = new Map<string, any[]>();

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
    
    // Parâmetros de filtro
    const filtros: FiltroQuestoes = {
      disciplinas: searchParams.get('disciplinas')?.split(',').filter(Boolean),
      assuntos: searchParams.get('assuntos')?.split(',').filter(Boolean),
      bancas: searchParams.get('bancas')?.split(',').filter(Boolean),
      anos: searchParams.get('anos')?.split(',').map(Number).filter(Boolean),
      dificuldades: searchParams.get('dificuldades')?.split(',').filter(Boolean),
      incluirAnuladas: searchParams.get('incluirAnuladas') === 'true',
      incluirDesatualizadas: searchParams.get('incluirDesatualizadas') === 'true',
      naoRepetirRespondidas: searchParams.get('naoRepetirRespondidas') === 'true',
      statusResposta: searchParams.get('statusResposta') as any,
      codigosPersonalizados: searchParams.get('codigosPersonalizados')?.split(',').filter(Boolean),
      cadernoId: searchParams.get('cadernoId') || undefined,
    };

    const ordenacao = (searchParams.get('ordenacao') || 'relevancia') as OrdenacaoQuestoes;

    // Busca otimizada por chunks limitados
    const questoesEncontradas = await buscarQuestoesOtimizada(filtros, limit, session.user.id);

    // Aplicar ordenação
    questoesEncontradas.sort((a, b) => {
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

    // Paginação
    const startIndex = (page - 1) * limit;
    const questoesPaginadas = questoesEncontradas.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: questoesPaginadas,
      total: questoesEncontradas.length,
      page,
      limit,
      totalPages: Math.ceil(questoesEncontradas.length / limit),
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

async function buscarQuestoesOtimizada(
  filtros: FiltroQuestoes, 
  limit: number, 
  userId: string
): Promise<Questao[]> {
  const questoesEncontradas: Questao[] = [];
  const chunksDir = path.join(process.cwd(), 'chunks');
  
  // Listar chunks disponíveis
  const chunkFiles = fs.readdirSync(chunksDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .slice(0, MAX_CHUNKS_TO_SEARCH); // Limitar para economizar memória

  // Buscar questões já respondidas se necessário
  let questoesRespondidas: Set<string> = new Set();
  if (filtros.naoRepetirRespondidas || filtros.statusResposta !== 'todas') {
    const respostas = await prisma.answer.findMany({
      where: { userId },
      select: { questaoCodigoReal: true, acertou: true }
    });
    
    if (filtros.naoRepetirRespondidas) {
      questoesRespondidas = new Set(respostas.map(r => r.questaoCodigoReal));
    }
    
    if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
      const acertou = filtros.statusResposta === 'acertadas';
      questoesRespondidas = new Set(
        respostas.filter(r => r.acertou === acertou).map(r => r.questaoCodigoReal)
      );
    }
  }

  // Buscar códigos do caderno se necessário
  let codigosCaderno: Set<string> = new Set();
  if (filtros.cadernoId) {
    const caderno = await prisma.customList.findFirst({
      where: { id: filtros.cadernoId, userId }
    });
    if (caderno) {
      codigosCaderno = new Set(caderno.questionCodes);
    }
  }

  // Processar chunks um por vez para economizar memória
  for (const chunkFile of chunkFiles) {
    if (questoesEncontradas.length >= limit * 2) break; // Parar quando tiver questões suficientes

    try {
      let questoesChunk: any[];
      
      // Verificar cache primeiro
      if (chunkCache.has(chunkFile)) {
        questoesChunk = chunkCache.get(chunkFile)!;
      } else {
        const chunkPath = path.join(chunksDir, chunkFile);
        const chunkContent = fs.readFileSync(chunkPath, 'utf8');
        questoesChunk = JSON.parse(chunkContent);
        
        // Cache apenas se for pequeno
        if (questoesChunk.length < 5000) {
          chunkCache.set(chunkFile, questoesChunk);
        }
      }

      // Filtrar questões do chunk
      for (const questao of questoesChunk) {
        if (questoesEncontradas.length >= limit * 2) break;

        if (!aplicarFiltros(questao, filtros, questoesRespondidas, codigosCaderno)) {
          continue;
        }

        // Normalizar questão
        const questaoNormalizada = normalizarQuestao(questao);
        questoesEncontradas.push(questaoNormalizada);
      }

    } catch (error) {
      console.error(`Erro ao processar chunk ${chunkFile}:`, error);
      continue;
    }
  }

  return questoesEncontradas;
}

function aplicarFiltros(
  questao: any,
  filtros: FiltroQuestoes,
  questoesRespondidas: Set<string>,
  codigosCaderno: Set<string>
): boolean {
  // Filtro por códigos personalizados (maior prioridade)
  if (filtros.codigosPersonalizados?.length) {
    if (!filtros.codigosPersonalizados.includes(questao.codigo_real)) {
      return false;
    }
  }

  // Filtro por caderno
  if (filtros.cadernoId && codigosCaderno.size > 0) {
    if (!codigosCaderno.has(questao.codigo_real)) {
      return false;
    }
  }

  // Filtro por questões respondidas
  if (filtros.naoRepetirRespondidas && questoesRespondidas.has(questao.codigo_real)) {
    return false;
  }

  // Filtro por status de resposta
  if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
    if (!questoesRespondidas.has(questao.codigo_real)) {
      return false;
    }
  }

  // Filtro por disciplinas
  if (filtros.disciplinas?.length && !filtros.disciplinas.includes(questao.disciplina_real)) {
    return false;
  }

  // Filtro por assuntos
  if (filtros.assuntos?.length && !filtros.assuntos.includes(questao.assunto_real)) {
    return false;
  }

  // Filtro por bancas
  if (filtros.bancas?.length && !filtros.bancas.includes(questao.bancas_sigla)) {
    return false;
  }

  // Filtro por anos
  if (filtros.anos?.length && !filtros.anos.includes(questao.anos)) {
    return false;
  }

  // Filtro por dificuldades
  if (filtros.dificuldades?.length) {
    const dificuldadeTexto = questao.dificuldade === 1 ? 'Fácil' : 
                           questao.dificuldade === 2 ? 'Média' : 'Difícil';
    if (!filtros.dificuldades.includes(dificuldadeTexto)) {
      return false;
    }
  }

  // Filtro por questões anuladas
  if (!filtros.incluirAnuladas && questao.anulada) {
    return false;
  }

  // Filtro por questões desatualizadas
  if (!filtros.incluirDesatualizadas && questao.desatualizada) {
    return false;
  }

  return true;
}

function normalizarQuestao(questao: any): Questao {
  return {
    id: questao.id,
    codigo_real: questao.codigo_real,
    dificuldade: questao.dificuldade === 1 ? 'Fácil' : 
                questao.dificuldade === 2 ? 'Média' : 'Difícil',
    bancas_nome: questao.bancas_nome,
    bancas_sigla: questao.bancas_sigla,
    cargos_descricao: questao.cargos_descricao,
    orgaos_nome: questao.orgaos_nome,
    orgaos_sigla: questao.orgaos_sigla,
    ano: questao.anos || questao.ano, // Mapear anos -> ano
    enunciado: questao.enunciado,
    itens: questao.itens || [],
    resposta: String(questao.resposta),
    disciplina_real: questao.disciplina_real,
    assunto_real: questao.assunto_real,
    anulada: Boolean(questao.anulada),
    desatualizada: Boolean(questao.desatualizada),
  };
}

function getDificuldadeNumero(dificuldade: string): number {
  switch (dificuldade) {
    case 'Fácil': return 1;
    case 'Média': return 2;
    case 'Difícil': return 3;
    default: return 2;
  }
}
