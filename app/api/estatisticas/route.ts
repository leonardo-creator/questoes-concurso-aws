import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30d';

    // Calcular data de início baseada no período
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
        dataInicio = new Date('2020-01-01'); // Todo período desde o início
    }

    // Buscar todas as respostas do usuário no período
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

    // Buscar dados das questões para obter informações sobre matérias
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

    // Calcular estatísticas gerais
    const totalRespondidas = respostas.length;
    const totalCorretas = respostas.filter((r: any) => r.acertou).length;
    const percentualGeralAcerto = totalRespondidas > 0 ? (totalCorretas / totalRespondidas) * 100 : 0;

    // Calcular tempo total de estudo (estimativa: 2 minutos por questão)
    const tempoTotalEstudo = totalRespondidas * 120; // em segundos

    // Calcular sequências
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

    // A sequência atual é a do final
    sequenciaAtual = sequenciaTemp;

    // Agrupar por matéria para identificar pontos fracos e fortes
    const estatisticasPorMateria = new Map<string, {
      total: number;
      corretas: number;
      tempoTotal: number;
      ultimaResposta: Date;
    }>();

    respostas.forEach((resposta: any) => {
      const questao = questoes.find(q => q.codigoReal === resposta.questaoCodigoReal);
      const materia = questao?.disciplinaReal || 'Sem matéria';
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
        naoRespondidas: 0, // Por enquanto não temos essa informação
        percentualAcerto: stats.total > 0 ? (stats.corretas / stats.total) * 100 : 0,
        tempoMedio: stats.total > 0 ? stats.tempoTotal / stats.total : 0,
        ultimaResposta: stats.ultimaResposta.toISOString()
      }))
      .filter(m => m.total >= 3); // Só considerar matérias com pelo menos 3 questões

    // Separar pontos fracos (< 70%) e fortes (>= 80%)
    const materiasFracas = materiasComEstatisticas
      .filter(m => m.percentualAcerto < 70)
      .sort((a, b) => a.percentualAcerto - b.percentualAcerto)
      .slice(0, 10);

    const materiasFortes = materiasComEstatisticas
      .filter(m => m.percentualAcerto >= 80)
      .sort((a, b) => b.percentualAcerto - a.percentualAcerto)
      .slice(0, 10);

    // Calcular progresso diário dos últimos 14 dias
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

    // Buscar total de questões disponíveis (para contexto)
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
    console.error('Erro na API de estatísticas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
