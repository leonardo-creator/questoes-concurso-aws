import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Configurações para permitir runtime dinâmico
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Verificar se o prisma está disponível
    if (!prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not available',
        data: []
      }, { status: 503 });
    }

    // Buscar anos com contagem
    const anosRaw = await prisma.question.groupBy({
      by: ['anos'],
      _count: {
        anos: true,
      },
      orderBy: {
        anos: 'desc',
      },
    });

    const anos = anosRaw
      .filter(ano => ano.anos) // Filtrar valores nulos
      .map(ano => ({
        ano: ano.anos,
        count: ano._count.anos,
      }));

    return NextResponse.json({
      success: true,
      data: anos,
    });
  } catch (error) {
    console.error('Erro ao buscar anos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

