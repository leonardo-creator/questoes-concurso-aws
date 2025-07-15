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

    // Buscar disciplinas com contagem
    const disciplinasRaw = await prisma.question.groupBy({
      by: ['disciplinaReal'],
      _count: {
        disciplinaReal: true,
      },
      orderBy: {
        disciplinaReal: 'asc',
      },
    });

    // Para cada disciplina, buscar os assuntos
    const disciplinasComAssuntos = await Promise.all(
      disciplinasRaw
        .filter(disciplina => disciplina.disciplinaReal) // Filtrar valores nulos
        .map(async (disciplina) => {
          const assuntosRaw = await prisma.question.groupBy({
            by: ['assuntoReal'],
            where: {
              disciplinaReal: disciplina.disciplinaReal,
            },
            _count: {
              assuntoReal: true,
          },
          orderBy: {
            assuntoReal: 'asc',
          },
        });

        const assuntos = assuntosRaw.map(assunto => ({
          nome: assunto.assuntoReal,
          count: assunto._count.assuntoReal,
        }));

        return {
          nome: disciplina.disciplinaReal,
          count: disciplina._count.disciplinaReal,
          assuntos,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: disciplinasComAssuntos,
    });
  } catch (error) {
    console.error('Erro ao buscar disciplinas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

