import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ConfiguraÃ§Ãµes para static export
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  try {
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

    const anos = anosRaw.map(ano => ({
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

