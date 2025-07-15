import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, isPrismaAvailable } from '@/lib/prisma';

export async function GET() {
  try {
    if (!isPrismaAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados não disponível' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const filtrosSalvos = await prisma!.savedFilter.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { favorito: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: filtrosSalvos
    });

  } catch (error) {
    console.error('Erro ao buscar filtros salvos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isPrismaAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados não disponível' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nome, filtros, descricao, favorito } = body;

    if (!nome || !filtros) {
      return NextResponse.json(
        { success: false, error: 'Nome e filtros são obrigatórios' },
        { status: 400 }
      );
    }

    const filtroSalvo = await prisma!.savedFilter.create({
      data: {
        userId: session.user.id,
        nome,
        filtros,
        descricao: descricao || null,
        favorito: favorito || false,
      }
    });

    return NextResponse.json({
      success: true,
      data: filtroSalvo
    });

  } catch (error) {
    console.error('Erro ao criar filtro salvo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isPrismaAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados não disponível' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, nome, filtros, descricao, favorito } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o filtro pertence ao usuário
    const filtroExistente = await prisma!.savedFilter.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!filtroExistente) {
      return NextResponse.json(
        { success: false, error: 'Filtro não encontrado' },
        { status: 404 }
      );
    }

    const filtroAtualizado = await prisma!.savedFilter.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(filtros && { filtros }),
        ...(descricao !== undefined && { descricao }),
        ...(favorito !== undefined && { favorito }),
      }
    });

    return NextResponse.json({
      success: true,
      data: filtroAtualizado
    });

  } catch (error) {
    console.error('Erro ao atualizar filtro salvo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isPrismaAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados não disponível' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o filtro pertence ao usuário
    const filtroExistente = await prisma!.savedFilter.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!filtroExistente) {
      return NextResponse.json(
        { success: false, error: 'Filtro não encontrado' },
        { status: 404 }
      );
    }

    await prisma!.savedFilter.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Filtro excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir filtro salvo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
