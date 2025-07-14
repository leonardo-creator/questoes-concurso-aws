import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const cadernos = await prisma.customList.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: cadernos,
    });

  } catch (error) {
    console.error('Erro ao buscar cadernos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { nome, descricao, questionCodes } = await request.json();

    if (!nome || !Array.isArray(questionCodes)) {
      return NextResponse.json(
        { success: false, error: 'Nome e códigos das questões são obrigatórios' },
        { status: 400 }
      );
    }

    const caderno = await prisma.customList.create({
      data: {
        userId: session.user.id,
        nome,
        descricao: descricao || null,
        questionCodes,
      },
    });

    return NextResponse.json({
      success: true,
      data: caderno,
    });

  } catch (error) {
    console.error('Erro ao criar caderno:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
