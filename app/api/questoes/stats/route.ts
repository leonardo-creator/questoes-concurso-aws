import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// ConfiguraÃ§Ãµes para static export
export const dynamic = 'force-static';
export const revalidate = false;

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticaÃ§Ã£o
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso nÃ£o autorizado' },
        { status: 401 }
      );
    }

    // Buscar estatÃ­sticas do cache primeiro
    const cachedStats = await prisma.questionStats.findUnique({
      where: { id: 'main' }
    });

    // Se o cache existe e Ã© recente (menos de 1 hora), retornar
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (cachedStats && cachedStats.atualizadoEm > oneHourAgo) {
      return NextResponse.json({
        ...cachedStats,
        cached: true,
        success: true
      });
    }

    // Calcular estatÃ­sticas em paralelo
    const [
      totalQuestoes,
      totalAnuladas,
      totalDesatualizadas,
      bancas,
      anos,
      disciplinas,
      orgaos,
      dificuldades,
      tipos,
      niveis
    ] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { anulada: true } }),
      prisma.question.count({ where: { desatualizada: true } }),
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
        by: ['disciplinaReal'],
        _count: { disciplinaReal: true },
        where: { disciplinaReal: { not: '' } },
        orderBy: { _count: { disciplinaReal: 'desc' } }
      }),
      prisma.question.groupBy({
        by: ['orgaosNome', 'orgaosSigla', 'orgaosUf'],
        _count: { orgaosNome: true },
        where: { orgaosNome: { not: '' } },
        orderBy: { _count: { orgaosNome: 'desc' } }
      }),
      prisma.question.groupBy({
        by: ['dificuldade'],
        _count: { dificuldade: true },
        orderBy: { dificuldade: 'asc' }
      }),
      prisma.question.groupBy({
        by: ['tipo'],
        _count: { tipo: true },
        where: { tipo: { not: '' } },
        orderBy: { _count: { tipo: 'desc' } }
      }),
      prisma.question.groupBy({
        by: ['provasNivel'],
        _count: { provasNivel: true },
        where: { provasNivel: { not: '' } },
        orderBy: { _count: { provasNivel: 'desc' } }
      })
    ]);

    // Formatar dados para resposta
    const stats = {
      id: 'main',
      totalQuestoes,
      totalAnuladas,
      totalDesatualizadas,
      totalBancas: bancas.length,
      totalAnos: anos.length,
      totalDisciplinas: disciplinas.length,
      totalOrgaos: orgaos.length,
      bancas: bancas.slice(0, 20).map(b => ({
        sigla: b.bancasSigla,
        nome: b.bancasNome,
        total: b._count.bancasSigla
      })),
      anos: anos.slice(0, 10).map(a => ({
        ano: a.anos,
        total: a._count.anos
      })),
      disciplinas: disciplinas.slice(0, 15).map(d => ({
        nome: d.disciplinaReal,
        total: d._count.disciplinaReal
      })),
      orgaos: orgaos.slice(0, 15).map(o => ({
        nome: o.orgaosNome,
        sigla: o.orgaosSigla,
        uf: o.orgaosUf,
        total: o._count.orgaosNome
      })),
      dificuldades: dificuldades.map(d => ({
        nivel: d.dificuldade,
        total: d._count.dificuldade
      })),
      tipos: tipos.map(t => ({
        tipo: t.tipo,
        total: t._count.tipo
      })),
      niveis: niveis.map(n => ({
        nivel: n.provasNivel,
        total: n._count.provasNivel
      })),
      atualizadoEm: new Date()
    };

    // Atualizar cache
    await prisma.questionStats.upsert({
      where: { id: 'main' },
      update: {
        totalQuestoes,
        totalBancas: bancas.length,
        totalAnos: anos.length,
        totalOrgaos: orgaos.length,
        atualizadoEm: new Date()
      },
      create: {
        id: 'main',
        totalQuestoes,
        totalBancas: bancas.length,
        totalAnos: anos.length,
        totalOrgaos: orgaos.length
      }
    });

    return NextResponse.json({
      ...stats,
      cached: false,
      success: true
    });

  } catch (error) {
    console.error('Erro ao buscar estatÃ­sticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

