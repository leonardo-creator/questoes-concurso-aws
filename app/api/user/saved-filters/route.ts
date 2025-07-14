import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const filtrosSalvos = await prisma.savedFilter.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [
        { favorito: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json({
      success: true,
      data: filtrosSalvos,
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

    const { nome, descricao, filtros, favorito } = await request.json();

    if (!nome || !filtros) {
      return NextResponse.json(
        { success: false, error: 'Nome e filtros são obrigatórios' },
        { status: 400 }
      );
    }

    const novoFiltro = await prisma.savedFilter.create({
      data: {
        userId: session.user.id,
        nome,
        descricao,
        filtros,
        favorito: favorito || false,
      },
    });

    return NextResponse.json({
      success: true,
      data: novoFiltro,
    });
  } catch (error) {
    console.error('Erro ao criar filtro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
