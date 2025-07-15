import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ConfiguraÃ§Ãµes para static export
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  try {
    // Buscar bancas com contagem
    const bancasRaw = await prisma.question.groupBy({
      by: ['bancasSigla', 'bancasNome'],
      _count: {
        bancasSigla: true,
      },
      orderBy: {
        bancasSigla: 'asc',
      },
    });

    const bancas = bancasRaw.map(banca => ({
      sigla: banca.bancasSigla,
      nome: banca.bancasNome,
      count: banca._count.bancasSigla,
    }));

    return NextResponse.json({
      success: true,
      data: bancas,
    });
  } catch (error) {
    console.error('Erro ao buscar bancas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

