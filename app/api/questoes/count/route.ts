import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, ensurePrismaConnection } from '@/lib/prisma';
import type { FiltroQuestoes } from '@/types';

// Configurações para permitir runtime dinâmico
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'NÃ£o autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // ParÃ¢metros de filtro - mesma lÃ³gica da API principal
    const filtros: FiltroQuestoes = {
      disciplinas: searchParams.get('disciplinas')?.split(',').filter(Boolean),
      assuntos: searchParams.get('assuntos')?.split(',').filter(Boolean),
      bancas: searchParams.get('bancas')?.split(',').filter(Boolean),
      anos: searchParams.get('anos')?.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a)),
      anoInicio: searchParams.get('anoInicio') ? parseInt(searchParams.get('anoInicio')!) : undefined,
      anoFim: searchParams.get('anoFim') ? parseInt(searchParams.get('anoFim')!) : undefined,
      dificuldades: searchParams.get('dificuldades')?.split(',').filter(Boolean),
      tipoQuestao: (searchParams.get('tipoQuestao') as any) || undefined,
      incluirAnuladas: searchParams.get('incluirAnuladas') === 'true',
      incluirDesatualizadas: searchParams.get('incluirDesatualizadas') === 'true',
      naoRepetirRespondidas: searchParams.get('naoRepetirRespondidas') === 'true',
      statusResposta: searchParams.get('statusResposta') as any,
      codigosPersonalizados: searchParams.get('codigosPersonalizados')?.split(',')
        .filter(Boolean)
        .map(codigo => codigo.trim().replace(/^["']|["']$/g, '')), // Remove aspas do inÃ­cio e fim
      provasNivel: searchParams.get('provasNivel')?.split(',').filter(Boolean),
      cadernoId: searchParams.get('cadernoId') || undefined,
    };

    const contagem = await contarQuestoesComFiltros(filtros, session.user.id);

    return NextResponse.json({
      success: true,
      total: contagem
    });

  } catch (error) {
    console.error('Erro na API de contagem:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function contarQuestoesComFiltros(filtros: FiltroQuestoes, userId: string): Promise<number> {
  try {
    const isConnected = await ensurePrismaConnection();
    if (!isConnected) {
      return 0;
    }

    // Construir filtros WHERE - mesma lÃ³gica da API principal
    const whereConditions: any = {};

    if (!filtros.incluirAnuladas) {
      whereConditions.anulada = false;
    }
    
    if (!filtros.incluirDesatualizadas) {
      whereConditions.desatualizada = false;
    }

    if (filtros.disciplinas?.length) {
      whereConditions.disciplinaReal = { in: filtros.disciplinas };
    }

    if (filtros.assuntos?.length) {
      whereConditions.assuntoReal = { in: filtros.assuntos };
    }

    if (filtros.bancas?.length) {
      whereConditions.bancasSigla = { in: filtros.bancas };
    }

    if (filtros.anos?.length) {
      whereConditions.anos = { in: filtros.anos };
    } else if (filtros.anoInicio || filtros.anoFim) {
      const anoFilter: any = {};
      if (filtros.anoInicio) anoFilter.gte = filtros.anoInicio;
      if (filtros.anoFim) anoFilter.lte = filtros.anoFim;
      whereConditions.anos = anoFilter;
    }

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

    if (filtros.codigosPersonalizados?.length) {
      whereConditions.codigoReal = { in: filtros.codigosPersonalizados };
    }

    if (filtros.cadernoId) {
      try {
        const caderno = await prisma.customList.findFirst({
          where: { id: filtros.cadernoId, userId }
        });
        if (caderno?.questionCodes?.length) {
          whereConditions.codigoReal = { in: caderno.questionCodes };
        } else {
          return 0;
        }
      } catch (error) {
        return 0;
      }
    }

    if (filtros.naoRepetirRespondidas || filtros.statusResposta !== 'todas') {
      try {
        const respostas = await prisma.answer.findMany({
          where: { userId },
          select: { questaoCodigoReal: true, acertou: true }
        });

        let codigosParaFiltrar: string[] = [];
        
        if (filtros.naoRepetirRespondidas) {
          codigosParaFiltrar = respostas.map(r => r.questaoCodigoReal);
          whereConditions.codigoReal = { notIn: codigosParaFiltrar };
        } else if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
          const acertou = filtros.statusResposta === 'acertadas';
          codigosParaFiltrar = respostas
            .filter(r => r.acertou === acertou)
            .map(r => r.questaoCodigoReal);
          whereConditions.codigoReal = { in: codigosParaFiltrar };
        }
      } catch (error) {
        console.warn('Erro ao buscar respostas do usuÃ¡rio:', error);
      }
    }

    // Para tipo de questÃ£o, precisamos buscar as questÃµes e analisar os itens
    if (filtros.tipoQuestao && filtros.tipoQuestao !== 'todas') {
      const questoesComItens = await prisma.question.findMany({
        where: whereConditions,
        select: { itens: true }
      });

      const questoesFiltradas = questoesComItens.filter(q => {
        let numAlternativas = 0;
        
        try {
          if (Array.isArray(q.itens)) {
            numAlternativas = q.itens.length;
          } else if (typeof q.itens === 'string') {
            const parsed = JSON.parse(q.itens);
            if (Array.isArray(parsed)) {
              numAlternativas = parsed.length;
            }
          }
        } catch (error) {
          return false;
        }

        if (filtros.tipoQuestao === 'certo_errado') {
          return numAlternativas <= 2;
        } else if (filtros.tipoQuestao === 'multipla_escolha') {
          return numAlternativas > 2;
        }
        return true;
      });

      return questoesFiltradas.length;
    }

    // Se nÃ£o hÃ¡ filtro de tipo de questÃ£o, usar count simples
    return await prisma.question.count({ where: whereConditions });

  } catch (error) {
    console.error('Erro na contagem PostgreSQL:', error);
    return 0;
  }
}

