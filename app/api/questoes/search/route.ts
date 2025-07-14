import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const searchParams = request.nextUrl.searchParams;
    const termo = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (!termo || termo.length < 3) {
      return NextResponse.json(
        { error: 'Termo de busca deve ter pelo menos 3 caracteres' },
        { status: 400 }
      );
    }

    // Busca avançada com PostgreSQL
    const questoes = await prisma.question.findMany({
      where: {
        AND: [
          { anulada: false },
          { desatualizada: false },
          {
            OR: [
              { enunciado: { contains: termo, mode: 'insensitive' } },
              { assuntoReal: { contains: termo, mode: 'insensitive' } },
              { disciplinaReal: { contains: termo, mode: 'insensitive' } },
              { bancasNome: { contains: termo, mode: 'insensitive' } },
              { orgaosNome: { contains: termo, mode: 'insensitive' } },
              { cargosDescricao: { contains: termo, mode: 'insensitive' } },
              {
                assuntosPalavrasChave: {
                  hasSome: [termo]
                }
              }
            ]
          }
        ]
      },
      select: {
        questaoId: true,
        codigoReal: true,
        enunciado: true,
        disciplinaReal: true,
        assuntoReal: true,
        bancasSigla: true,
        bancasNome: true,
        anos: true,
        dificuldade: true,
        tipo: true,
        provasNivel: true
      },
      orderBy: [
        { updatedAt: 'desc' },
        { anos: 'desc' }
      ],
      take: limit
    });

    // Destacar termos encontrados
    const questoesComDestaque = questoes.map(questao => ({
      ...questao,
      enunciadoDestacado: questao.enunciado.replace(
        new RegExp(termo, 'gi'),
        `<mark>$&</mark>`
      ),
      assuntoDestacado: questao.assuntoReal.replace(
        new RegExp(termo, 'gi'),
        `<mark>$&</mark>`
      )
    }));

    return NextResponse.json({
      questoes: questoesComDestaque,
      total: questoes.length,
      termo,
      success: true
    });

  } catch (error) {
    console.error('Erro na busca avançada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
