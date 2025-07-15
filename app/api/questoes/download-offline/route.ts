import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { FiltroQuestoes } from '@/types';

// ConfiguraÃ§Ãµes para static export
export const dynamic = 'force-static';
export const revalidate = false;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'NÃ£o autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { filtros, limite = 500 } = body as { filtros: FiltroQuestoes, limite?: number };

    // Construir condiÃ§Ãµes de busca baseadas nos filtros
    const whereConditions: any = {};

    // Aplicar filtros de disciplinas
    if (filtros.disciplinas?.length) {
      whereConditions.disciplinaReal = { in: filtros.disciplinas };
    }

    // Aplicar filtros de assuntos
    if (filtros.assuntos?.length) {
      whereConditions.assuntoReal = { in: filtros.assuntos };
    }

    // Aplicar filtros de bancas
    if (filtros.bancas?.length) {
      whereConditions.bancasSigla = { in: filtros.bancas };
    }

    // Aplicar filtros de anos
    if (filtros.anos?.length || filtros.anoInicio || filtros.anoFim) {
      const anoConditions: any = {};
      
      if (filtros.anos?.length) {
        anoConditions.in = filtros.anos;
      } else {
        if (filtros.anoInicio) anoConditions.gte = filtros.anoInicio;
        if (filtros.anoFim) anoConditions.lte = filtros.anoFim;
      }
      
      whereConditions.anos = anoConditions;
    }

    // Aplicar filtros de dificuldade
    if (filtros.dificuldades?.length) {
      const dificuldadeNums = filtros.dificuldades.map(d => {
        switch (d) {
          case 'FÃ¡cil': return 1;
          case 'MÃ©dia': return 2;
          case 'DifÃ­cil': return 3;
          default: return 2;
        }
      });
      whereConditions.dificuldade = { in: dificuldadeNums };
    }

    // Buscar questÃµes do PostgreSQL
    const questoes = await prisma.question.findMany({
      where: whereConditions,
      take: Math.min(limite, 1000), // Limitar a 1000 questÃµes mÃ¡ximo
      orderBy: { id: 'asc' }
    });

    // Processar questÃµes para formato offline
    const questoesOffline = questoes.map(q => ({
      codigo_real: q.codigoReal,
      enunciado: q.enunciado,
      disciplina_real: q.disciplinaReal,
      assunto_real: q.assuntoReal,
      banca_sigla: q.bancasSigla,
      banca_nome: q.bancasNome,
      ano: q.anos,
      dificuldade: getDificuldadeTexto(q.dificuldade),
      gabarito_letra: q.resposta,
      anulada: q.anulada,
      desatualizada: q.desatualizada,
      itens: Array.isArray(q.itens) ? q.itens : [],
      timestamp_download: new Date().toISOString(),
      filtros_aplicados: filtros
    }));

    // Criar registro de download usando OfflineAction
    await prisma.offlineAction.create({
      data: {
        userId: session.user.id,
        tipo: 'download_offline',
        dados: {
          filtros,
          questionCount: questoesOffline.length,
          downloadedAt: new Date().toISOString()
        },
        timestamp: BigInt(Date.now()),
        sincronizado: true // JÃ¡ estÃ¡ sincronizado pois Ã© servidor
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        questoes: questoesOffline,
        total: questoesOffline.length,
        timestamp: new Date().toISOString(),
        filtros: filtros
      }
    });

  } catch (error) {
    console.error('Erro no download offline:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

function getDificuldadeTexto(dificuldade: number): string {
  switch (dificuldade) {
    case 1: return 'FÃ¡cil';
    case 3: return 'DifÃ­cil';
    default: return 'MÃ©dia';
  }
}

