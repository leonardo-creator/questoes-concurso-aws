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

    const filtrosSalvos = await prisma.savedFilter.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: filtrosSalvos.map(filtro => ({
        id: filtro.id,
        nome: filtro.nome,
        descricao: filtro.descricao,
        filtros: filtro.filtros,
        favorito: filtro.favorito,
        createdAt: filtro.createdAt,
        updatedAt: filtro.updatedAt
      }))
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nome, descricao, filtros } = body;

    if (!nome || !filtros) {
      return NextResponse.json(
        { success: false, error: 'Nome e filtros são obrigatórios' },
        { status: 400 }
      );
    }

    const filtroSalvo = await prisma.savedFilter.create({
      data: {
        nome: nome,
        descricao: descricao || '',
        filtros: filtros,
        userId: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: filtroSalvo.id,
        nome: filtroSalvo.nome,
        descricao: filtroSalvo.descricao,
        filtros: filtroSalvo.filtros,
        favorito: filtroSalvo.favorito,
        createdAt: filtroSalvo.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao salvar filtro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, nome, descricao, filtros, favorito } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório para atualização' },
        { status: 400 }
      );
    }

    // Verificar se o filtro pertence ao usuário
    const filtroExistente = await prisma.savedFilter.findFirst({
      where: { id, userId: session.user.id }
    });

    if (!filtroExistente) {
      return NextResponse.json(
        { success: false, error: 'Filtro não encontrado' },
        { status: 404 }
      );
    }

    // Preparar dados para atualização (apenas campos fornecidos)
    const dadosAtualizacao: any = {};
    if (nome !== undefined) dadosAtualizacao.nome = nome;
    if (filtros !== undefined) dadosAtualizacao.filtros = filtros;
    if (descricao !== undefined) dadosAtualizacao.descricao = descricao;
    if (favorito !== undefined) dadosAtualizacao.favorito = favorito;

    const filtroAtualizado = await prisma.savedFilter.update({
      where: { id },
      data: dadosAtualizacao
    });

    return NextResponse.json({
      success: true,
      data: {
        id: filtroAtualizado.id,
        nome: filtroAtualizado.nome,
        descricao: filtroAtualizado.descricao,
        filtros: filtroAtualizado.filtros,
        favorito: filtroAtualizado.favorito,
        updatedAt: filtroAtualizado.updatedAt
      }
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório para exclusão' },
        { status: 400 }
      );
    }

    // Verificar se o filtro pertence ao usuário e excluir
    const resultado = await prisma.savedFilter.deleteMany({
      where: { 
        id, 
        userId: session.user.id 
      }
    });

    if (resultado.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Filtro não encontrado' },
        { status: 404 }
      );
    }

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
