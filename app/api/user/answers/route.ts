import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { questaoCodigoReal, alternativaSelecionada, acertou, tempoResposta } = await request.json();

    if (!questaoCodigoReal || !alternativaSelecionada || typeof acertou !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Criar ou atualizar resposta
    const resposta = await prisma.answer.upsert({
      where: {
        userId_questaoCodigoReal: {
          userId: session.user.id,
          questaoCodigoReal,
        }
      },
      update: {
        alternativaSelecionada,
        acertou,
        tempoResposta,
      },
      create: {
        userId: session.user.id,
        questaoCodigoReal,
        alternativaSelecionada,
        acertou,
        tempoResposta,
      },
    });

    return NextResponse.json({
      success: true,
      data: resposta,
    });

  } catch (error) {
    console.error('Erro ao salvar resposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

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
    const questaoCodigoReal = searchParams.get('questaoCodigoReal');

    if (questaoCodigoReal) {
      // Buscar resposta específica
      const resposta = await prisma.answer.findUnique({
        where: {
          userId_questaoCodigoReal: {
            userId: session.user.id,
            questaoCodigoReal,
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: resposta,
      });
    } else {
      // Buscar todas as respostas do usuário
      const respostas = await prisma.answer.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json({
        success: true,
        data: respostas,
      });
    }

  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
