import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, ensurePrismaConnection } from '@/lib/prisma';

// ConfiguraÃ§Ãµes para static export
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'NÃ£o autorizado' },
        { status: 401 }
      );
    }

    // Garantir conexÃ£o com PostgreSQL
    const isConnected = await ensurePrismaConnection();
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados nÃ£o disponÃ­vel' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'disciplinas', 'bancas', 'anos', 'dificuldades'

    switch (tipo) {
      case 'disciplinas':
        const disciplinas = await prisma.question.groupBy({
          by: ['disciplinaReal'],
          _count: { disciplinaReal: true },
          where: { anulada: false, desatualizada: false },
          orderBy: { _count: { disciplinaReal: 'desc' } }
        });

        return NextResponse.json({
          success: true,
          data: disciplinas.map(d => ({
            nome: d.disciplinaReal,
            count: d._count.disciplinaReal
          }))
        });

      case 'bancas':
        const bancas = await prisma.question.groupBy({
          by: ['bancasSigla', 'bancasNome'],
          _count: { bancasSigla: true },
          where: { anulada: false, desatualizada: false },
          orderBy: { _count: { bancasSigla: 'desc' } }
        });

        return NextResponse.json({
          success: true,
          data: bancas.map(b => ({
            sigla: b.bancasSigla,
            nome: b.bancasNome,
            count: b._count.bancasSigla
          }))
        });

      case 'anos':
        const anos = await prisma.question.groupBy({
          by: ['anos'],
          _count: { anos: true },
          where: { anulada: false, desatualizada: false },
          orderBy: { anos: 'desc' }
        });

        return NextResponse.json({
          success: true,
          data: anos.map(a => ({
            ano: a.anos,
            count: a._count.anos
          }))
        });

      case 'dificuldades':
        const dificuldades = await prisma.question.groupBy({
          by: ['dificuldade'],
          _count: { dificuldade: true },
          where: { anulada: false, desatualizada: false },
          orderBy: { dificuldade: 'asc' }
        });

        const dificuldadeTextos = ['FÃ¡cil', 'MÃ©dia', 'DifÃ­cil'];
        
        return NextResponse.json({
          success: true,
          data: dificuldades.map(d => ({
            dificuldade: dificuldadeTextos[d.dificuldade - 1] || 'MÃ©dia',
            count: d._count.dificuldade
          }))
        });

      case 'assuntos':
        const disciplinaSelecionada = searchParams.get('disciplina');
        const whereAssuntos: any = { anulada: false, desatualizada: false };
        
        if (disciplinaSelecionada) {
          whereAssuntos.disciplinaReal = disciplinaSelecionada;
        }

        const assuntos = await prisma.question.groupBy({
          by: ['assuntoReal'],
          _count: { assuntoReal: true },
          where: whereAssuntos,
          orderBy: { _count: { assuntoReal: 'desc' } },
          take: 100 // Limitar para evitar sobrecarga
        });

        return NextResponse.json({
          success: true,
          data: assuntos.map(a => ({
            nome: a.assuntoReal,
            count: a._count.assuntoReal
          }))
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de filtro nÃ£o suportado' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Erro na API de contadores de filtros:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

