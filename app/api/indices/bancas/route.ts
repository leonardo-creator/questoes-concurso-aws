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

    const bancas = bancasRaw
      .filter(banca => banca.bancasSigla && banca.bancasNome) // Filtrar valores nulos
      .map(banca => ({
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

