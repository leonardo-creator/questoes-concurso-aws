import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ConfiguraÃ§Ãµes para static export
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  try {
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
      disciplinasRaw.map(async (disciplina) => {
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

