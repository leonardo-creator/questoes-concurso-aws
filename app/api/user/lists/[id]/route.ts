import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const caderno = await prisma.customList.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    });

    if (!caderno) {
      return NextResponse.json(
        { success: false, error: 'Caderno não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: caderno,
    });

  } catch (error) {
    console.error('Erro ao buscar caderno:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { nome, descricao, questionCodes } = await request.json();
    const resolvedParams = await params;

    const caderno = await prisma.customList.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    });

    if (!caderno) {
      return NextResponse.json(
        { success: false, error: 'Caderno não encontrado' },
        { status: 404 }
      );
    }

    const cadernoAtualizado = await prisma.customList.update({
      where: {
        id: resolvedParams.id,
      },
      data: {
        nome: nome || caderno.nome,
        descricao: descricao !== undefined ? descricao : caderno.descricao,
        questionCodes: questionCodes || caderno.questionCodes,
      },
    });

    return NextResponse.json({
      success: true,
      data: cadernoAtualizado,
    });

  } catch (error) {
    console.error('Erro ao atualizar caderno:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const caderno = await prisma.customList.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    });

    if (!caderno) {
      return NextResponse.json(
        { success: false, error: 'Caderno não encontrado' },
        { status: 404 }
      );
    }

    await prisma.customList.delete({
      where: {
        id: resolvedParams.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Caderno excluído com sucesso',
    });

  } catch (error) {
    console.error('Erro ao excluir caderno:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
