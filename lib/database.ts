/**
 * Utilitário para conexão e operações com PostgreSQL
 * Gerencia conexões singleton e operações comuns do banco
 */

import { PrismaClient } from '@prisma/client';

// Singleton do Prisma Client para evitar múltiplas conexões
declare global {
  var __prisma: PrismaClient | undefined;
}

// Instância singleton do Prisma
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Testa a conectividade com o banco de dados
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Erro de conexão com o banco:', error);
    return false;
  }
}

/**
 * Obtém estatísticas básicas do banco
 */
export async function getDatabaseStats() {
  try {
    const [questionsCount, usersCount, answersCount] = await Promise.all([
      prisma.question.count(),
      prisma.user.count(),
      prisma.answer.count()
    ]);

    return {
      questoes: questionsCount,
      usuarios: usersCount,
      respostas: answersCount,
      status: 'connected'
    };
  } catch (error) {
    return {
      questoes: 0,
      usuarios: 0,
      respostas: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Filtros otimizados para questões
 */
export interface QuestionFilters {
  disciplinas?: string[];
  bancas?: string[];
  anos?: number[];
  dificuldades?: number[];
  tipos?: string[];
  busca?: string;
  page?: number;
  limit?: number;
}

/**
 * Busca otimizada de questões com filtros
 */
export async function searchQuestions(filters: QuestionFilters) {
  const {
    disciplinas,
    bancas,
    anos,
    dificuldades,
    tipos,
    busca,
    page = 1,
    limit = 20
  } = filters;

  const where: any = {
    anulada: false,
    desatualizada: false
  };

  // Aplicar filtros
  if (disciplinas?.length) {
    where.disciplinaReal = { in: disciplinas };
  }

  if (bancas?.length) {
    where.bancasSigla = { in: bancas };
  }

  if (anos?.length) {
    where.anos = { in: anos };
  }

  if (dificuldades?.length) {
    where.dificuldade = { in: dificuldades };
  }

  if (tipos?.length) {
    where.tipo = { in: tipos };
  }

  if (busca) {
    where.OR = [
      { enunciado: { contains: busca, mode: 'insensitive' } },
      { assuntoReal: { contains: busca, mode: 'insensitive' } },
      { disciplinaReal: { contains: busca, mode: 'insensitive' } }
    ];
  }

  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { updatedAt: 'desc' },
        { anos: 'desc' }
      ]
    }),
    prisma.question.count({ where })
  ]);

  return {
    questions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: skip + limit < total,
      hasPrev: page > 1
    }
  };
}

/**
 * Obtém listas de valores únicos para filtros
 */
export async function getFilterOptions() {
  const [disciplinas, bancas, anos, tipos, niveis] = await Promise.all([
    prisma.question.groupBy({
      by: ['disciplinaReal'],
      where: { disciplinaReal: { not: '' } },
      _count: { disciplinaReal: true },
      orderBy: { _count: { disciplinaReal: 'desc' } }
    }),
    prisma.question.groupBy({
      by: ['bancasSigla', 'bancasNome'],
      _count: { bancasSigla: true },
      orderBy: { _count: { bancasSigla: 'desc' } }
    }),
    prisma.question.groupBy({
      by: ['anos'],
      _count: { anos: true },
      orderBy: { anos: 'desc' }
    }),
    prisma.question.groupBy({
      by: ['tipo'],
      where: { tipo: { not: '' } },
      _count: { tipo: true },
      orderBy: { _count: { tipo: 'desc' } }
    }),
    prisma.question.groupBy({
      by: ['provasNivel'],
      where: { provasNivel: { not: '' } },
      _count: { provasNivel: true },
      orderBy: { _count: { provasNivel: 'desc' } }
    })
  ]);

  return {
    disciplinas: disciplinas.map(d => ({
      nome: d.disciplinaReal,
      total: d._count.disciplinaReal
    })),
    bancas: bancas.map(b => ({
      sigla: b.bancasSigla,
      nome: b.bancasNome,
      total: b._count.bancasSigla
    })),
    anos: anos.map(a => ({
      ano: a.anos,
      total: a._count.anos
    })),
    tipos: tipos.map(t => ({
      tipo: t.tipo,
      total: t._count.tipo
    })),
    niveis: niveis.map(n => ({
      nivel: n.provasNivel,
      total: n._count.provasNivel
    }))
  };
}

/**
 * Graceful shutdown do Prisma
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

// Cleanup automático em shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', disconnectDatabase);
  process.on('SIGINT', disconnectDatabase);
  process.on('SIGTERM', disconnectDatabase);
}
