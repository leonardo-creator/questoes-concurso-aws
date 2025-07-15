import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ConfiguraÃ§Ãµes para static export
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'NÃ£o autorizado' },
        { status: 401 }
      );
    }

    // Teste 1: Busca geral sem filtros
    const totalQuestoes = await prisma.question.count();

    // Teste 2: QuestÃµes com um filtro simples (uma disciplina)
    const questoesDisciplina = await prisma.question.count({
      where: {
        disciplinaReal: 'Direito Constitucional'
      }
    });

    // Teste 3: QuestÃµes com cÃ³digos especÃ­ficos
    const questoesCodigos = await prisma.question.count({
      where: {
        codigoReal: { in: ['140.3.3.3', '2.3.3'] }
      }
    });

    // Teste 4: Verificar se os cÃ³digos existem no banco
    const codigosExistentes = await prisma.question.findMany({
      where: {
        codigoReal: { in: ['140.3.3.3', '2.3.3'] }
      },
      select: {
        codigoReal: true,
        disciplinaReal: true,
        assuntoReal: true
      }
    });

    // Teste 5: Buscar padrÃµes similares aos cÃ³digos
    const padroesSimilares = await prisma.question.findMany({
      where: {
        OR: [
          { codigoReal: { contains: '140.3' } },
          { codigoReal: { contains: '2.3' } }
        ]
      },
      select: {
        codigoReal: true,
        disciplinaReal: true,
        assuntoReal: true
      },
      take: 10
    });

    // Teste 6: Verificar alguns cÃ³digos reais que existem
    const amostraCodigosReais = await prisma.question.findMany({
      select: {
        codigoReal: true,
        disciplinaReal: true,
        assuntoReal: true
      },
      take: 20,
      orderBy: { id: 'asc' }
    });

    return NextResponse.json({
      success: true,
      testes: {
        totalQuestoes,
        questoesDisciplina,
        questoesCodigos,
        codigosExistentes,
        padroesSimilares,
        amostraCodigosReais
      }
    });

  } catch (error) {
    console.error('Erro no teste:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

