import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface para filtros de busca compatível com o frontend existente
interface FiltrosBusca {
  disciplinas?: string;
  assuntos?: string;
  bancas?: string;
  anos?: string;
  dificuldades?: string;
  orgaos?: string;
  cargos?: string;
  tipos?: string;
  nivel?: string;
  anuladas?: boolean;
  page?: number;
  limit?: number;
  busca?: string; // Para busca textual
  ordenacao?: 'relevancia' | 'data' | 'dificuldade';
}

/**
 * Constrói filtros do Prisma a partir dos parâmetros de busca
 */
function buildPrismaFilters(filtros: FiltrosBusca) {
  const where: any = {};

  // Filtros simples
  if (filtros.disciplinas) {
    const disciplinas = filtros.disciplinas.split(',').map(d => d.trim());
    where.disciplinaReal = { in: disciplinas };
  }

  if (filtros.bancas) {
    const bancas = filtros.bancas.split(',').map(b => b.trim());
    where.bancasSigla = { in: bancas };
  }

  if (filtros.anos) {
    const anos = filtros.anos.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a));
    if (anos.length > 0) {
      where.anos = { in: anos };
    }
  }

  if (filtros.dificuldades) {
    const dificuldades = filtros.dificuldades.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    if (dificuldades.length > 0) {
      where.dificuldade = { in: dificuldades };
    }
  }

  if (filtros.orgaos) {
    const orgaos = filtros.orgaos.split(',').map(o => o.trim());
    where.orgaosNome = { in: orgaos };
  }

  if (filtros.tipos) {
    const tipos = filtros.tipos.split(',').map(t => t.trim());
    where.tipo = { in: tipos };
  }

  if (filtros.nivel) {
    where.provasNivel = filtros.nivel;
  }

  // Filtro para questões anuladas (padrão: não mostrar anuladas)
  if (filtros.anuladas !== undefined) {
    where.anulada = filtros.anuladas;
  } else {
    where.anulada = false; // Por padrão, não mostrar anuladas
  }

  // Não mostrar questões desatualizadas por padrão
  where.desatualizada = false;

  // Busca textual no enunciado e assunto
  if (filtros.busca) {
    const termo = filtros.busca.trim();
    where.OR = [
      { enunciado: { contains: termo, mode: 'insensitive' } },
      { assuntoReal: { contains: termo, mode: 'insensitive' } },
      { disciplinaReal: { contains: termo, mode: 'insensitive' } }
    ];
  }

  // Filtro por assuntos (busca parcial)
  if (filtros.assuntos) {
    const assuntos = filtros.assuntos.split(',').map(a => a.trim());
    where.assuntoReal = {
      in: assuntos.map(assunto => ({ contains: assunto, mode: 'insensitive' }))
    };
  }

  return where;
}

/**
 * Constrói ordenação do Prisma
 */
function buildPrismaOrderBy(ordenacao?: string) {
  switch (ordenacao) {
    case 'data':
      return [{ anos: 'desc' as const }, { createdAt: 'desc' as const }];
    case 'dificuldade':
      return [{ dificuldade: 'asc' as const }, { anos: 'desc' as const }];
    case 'relevancia':
    default:
      return [{ updatedAt: 'desc' as const }, { anos: 'desc' as const }];
  }
}

/**
 * Formata questão para compatibilidade com frontend existente
 */
function formatQuestionForAPI(question: any) {
  return {
    id: question.questaoId,
    codigo: question.codigoReal,
    pergunta: question.enunciado,
    alternativas: question.itens,
    resposta: question.resposta,
    metadata: {
      banca: question.bancasSigla,
      bancaNome: question.bancasNome,
      ano: question.anos.toString(),
      disciplina: question.disciplinaReal,
      assunto: question.assuntoReal,
      dificuldade: question.dificuldade.toString(),
      orgao: question.orgaosNome,
      orgaoSigla: question.orgaosSigla,
      orgaoUf: question.orgaosUf,
      cargo: question.cargosDescricao,
      tipo: question.tipo,
      nivel: question.provasNivel,
      hasImage: question.hasImage,
      hasImageItens: question.hasImageItens,
      anulada: question.anulada,
      desatualizada: question.desatualizada,
      grupoEnunciado: question.grupoQuestaoEnunciado,
      palavrasChave: question.assuntosPalavrasChave,
      areas: question.areasDescricao
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      );
    }

    // Extrair parâmetros de busca
    const searchParams = request.nextUrl.searchParams;
    const filtros: FiltrosBusca = {
      disciplinas: searchParams.get('disciplinas') || undefined,
      assuntos: searchParams.get('assuntos') || undefined,
      bancas: searchParams.get('bancas') || undefined,
      anos: searchParams.get('anos') || undefined,
      dificuldades: searchParams.get('dificuldades') || undefined,
      orgaos: searchParams.get('orgaos') || undefined,
      cargos: searchParams.get('cargos') || undefined,
      tipos: searchParams.get('tipos') || undefined,
      nivel: searchParams.get('nivel') || undefined,
      anuladas: searchParams.get('anuladas') === 'true',
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // Máximo 100
      busca: searchParams.get('busca') || undefined,
      ordenacao: (searchParams.get('ordenacao') as any) || 'relevancia'
    };

    // Construir filtros do Prisma
    const where = buildPrismaFilters(filtros);
    const orderBy = buildPrismaOrderBy(filtros.ordenacao);

    // Calcular paginação
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    // Executar queries em paralelo para otimização
    const [questoes, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          questaoId: true,
          codigoReal: true,
          enunciado: true,
          itens: true,
          resposta: true,
          bancasSigla: true,
          bancasNome: true,
          anos: true,
          disciplinaReal: true,
          assuntoReal: true,
          dificuldade: true,
          orgaosNome: true,
          orgaosSigla: true,
          orgaosUf: true,
          cargosDescricao: true,
          tipo: true,
          provasNivel: true,
          hasImage: true,
          hasImageItens: true,
          anulada: true,
          desatualizada: true,
          grupoQuestaoEnunciado: true,
          assuntosPalavrasChave: true,
          areasDescricao: true
        }
      }),
      prisma.question.count({ where })
    ]);

    // Formatar questões para compatibilidade
    const questoesFormatadas = questoes.map(formatQuestionForAPI);

    // Preparar resposta
    const response = {
      questoes: questoesFormatadas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1
      },
      filtros,
      success: true,
      source: 'postgresql' // Indicador de que está usando PostgreSQL
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erro na API de questões (PostgreSQL):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
