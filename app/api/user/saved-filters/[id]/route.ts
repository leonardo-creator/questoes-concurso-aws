import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const filtro = await prisma.savedFilter.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!filtro) {
      return NextResponse.json(
        { success: false, error: 'Filtro não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: filtro,
    });
  } catch (error) {
    console.error('Erro ao buscar filtro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nome, descricao, filtros, favorito } = body;

    const filtroAtualizado = await prisma.savedFilter.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        ...(nome !== undefined && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(filtros !== undefined && { filtros }),
        ...(favorito !== undefined && { favorito }),
        updatedAt: new Date(),
      },
    });

    if (filtroAtualizado.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Filtro não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Filtro atualizado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar filtro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const filtroExcluido = await prisma.savedFilter.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (filtroExcluido.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Filtro não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Filtro excluído com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir filtro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
