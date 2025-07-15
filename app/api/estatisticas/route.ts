import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30d';

    // Calcular data de inÃ­cio baseada no perÃ­odo
    const agora = new Date();
    let dataInicio: Date;
    
    switch (periodo) {
      case '7d':
        dataInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dataInicio = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dataInicio = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dataInicio = new Date('2020-01-01'); // Todo perÃ­odo desde o inÃ­cio
    }

    // Buscar todas as respostas do usuÃ¡rio no perÃ­odo
    const respostas = await prisma.answer.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: dataInicio
        }
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Buscar dados das questÃµes para obter informaÃ§Ãµes sobre matÃ©rias
    const codigosQuestoes = respostas.map(r => r.questaoCodigoReal);
    const questoes = await prisma.question.findMany({
      where: {
        codigoReal: {
          in: codigosQuestoes
        }
      },
      select: {
        codigoReal: true,
        disciplinaReal: true,
        assuntoReal: true
      }
    });

    // Calcular estatÃ­sticas gerais
    const totalRespondidas = respostas.length;
    const totalCorretas = respostas.filter((r: any) => r.acertou).length;
    const percentualGeralAcerto = totalRespondidas > 0 ? (totalCorretas / totalRespondidas) * 100 : 0;

    // Calcular tempo total de estudo (estimativa: 2 minutos por questÃ£o)
    const tempoTotalEstudo = totalRespondidas * 120; // em segundos

    // Calcular sequÃªncias
    let sequenciaAtual = 0;
    let melhorSequencia = 0;
    let sequenciaTemp = 0;

    const respostasOrdenadas = [...respostas].reverse(); // Do mais antigo para o mais recente
    
    for (const resposta of respostasOrdenadas) {
      if (resposta.acertou) {
        sequenciaTemp++;
        melhorSequencia = Math.max(melhorSequencia, sequenciaTemp);
      } else {
        sequenciaTemp = 0;
      }
    }

    // A sequÃªncia atual Ã© a do final
    sequenciaAtual = sequenciaTemp;

    // Agrupar por matÃ©ria para identificar pontos fracos e fortes
    const estatisticasPorMateria = new Map<string, {
      total: number;
      corretas: number;
      tempoTotal: number;
      ultimaResposta: Date;
    }>();

    respostas.forEach((resposta: any) => {
      const questao = questoes.find(q => q.codigoReal === resposta.questaoCodigoReal);
      const materia = questao?.disciplinaReal || 'Sem matÃ©ria';
      const stats = estatisticasPorMateria.get(materia) || {
        total: 0,
        corretas: 0,
        tempoTotal: 0,
        ultimaResposta: new Date(0)
      };

      stats.total++;
      if (resposta.acertou) stats.corretas++;
      stats.tempoTotal += resposta.tempoResposta || 120; // Tempo real ou 2 minutos estimados
      stats.ultimaResposta = new Date(Math.max(stats.ultimaResposta.getTime(), resposta.createdAt.getTime()));

      estatisticasPorMateria.set(materia, stats);
    });

    // Converter para array e calcular percentuais
    const materiasComEstatisticas = Array.from(estatisticasPorMateria.entries())
      .map(([materia, stats]) => ({
        materia,
        total: stats.total,
        corretas: stats.corretas,
        incorretas: stats.total - stats.corretas,
        naoRespondidas: 0, // Por enquanto nÃ£o temos essa informaÃ§Ã£o
        percentualAcerto: stats.total > 0 ? (stats.corretas / stats.total) * 100 : 0,
        tempoMedio: stats.total > 0 ? stats.tempoTotal / stats.total : 0,
        ultimaResposta: stats.ultimaResposta.toISOString()
      }))
      .filter(m => m.total >= 3); // SÃ³ considerar matÃ©rias com pelo menos 3 questÃµes

    // Separar pontos fracos (< 70%) e fortes (>= 80%)
    const materiasFracas = materiasComEstatisticas
      .filter(m => m.percentualAcerto < 70)
      .sort((a, b) => a.percentualAcerto - b.percentualAcerto)
      .slice(0, 10);

    const materiasFortes = materiasComEstatisticas
      .filter(m => m.percentualAcerto >= 80)
      .sort((a, b) => b.percentualAcerto - a.percentualAcerto)
      .slice(0, 10);

    // Calcular progresso diÃ¡rio dos Ãºltimos 14 dias
    const progressoDiario = [];
    for (let i = 13; i >= 0; i--) {
      const data = new Date(agora.getTime() - i * 24 * 60 * 60 * 1000);
      const inicioDia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
      const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

      const respostasDoDia = respostas.filter(r => 
        r.createdAt >= inicioDia && r.createdAt < fimDia
      );

      const questoesRespondidas = respostasDoDia.length;
      const acertosDoDia = respostasDoDia.filter((r: any) => r.acertou).length;
      const percentualAcerto = questoesRespondidas > 0 ? (acertosDoDia / questoesRespondidas) * 100 : 0;

      progressoDiario.push({
        data: inicioDia.toISOString().split('T')[0],
        questoesRespondidas,
        percentualAcerto
      });
    }

    // Buscar total de questÃµes disponÃ­veis (para contexto)
    const totalQuestoes = await prisma.question.count();

    const estatisticas = {
      totalQuestoes,
      totalRespondidas,
      totalCorretas,
      percentualGeralAcerto,
      tempoTotalEstudo,
      sequenciaAtual,
      melhorSequencia,
      materiasFracas,
      materiasFortes,
      progressoDiario
    };

    return NextResponse.json({
      success: true,
      estatisticas
    });

  } catch (error) {
    console.error('Erro na API de estatÃ­sticas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

