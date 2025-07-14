import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar estatísticas do usuário
    const [respostasTotal, respostasAcertos] = await Promise.all([
      prisma.answer.count({
        where: {
          userId: session.user.id,
        },
      }),
      prisma.answer.count({
        where: {
          userId: session.user.id,
          acertou: true,
        },
      }),
    ]);

    // Calcular número de sessões de estudo (dias únicos com respostas)
    const sessoesBruto = await prisma.answer.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Contar dias únicos
    const diasUnicos = new Set();
    sessoesBruto.forEach(resposta => {
      const dia = resposta.createdAt.toISOString().split('T')[0];
      diasUnicos.add(dia);
    });

    // Última sessão
    const ultimaResposta = sessoesBruto[0];

    const percentualAcertos = respostasTotal > 0 ? (respostasAcertos / respostasTotal) * 100 : 0;

    const estatisticas = {
      totalRespondidas: respostasTotal,
      totalAcertos: respostasAcertos,
      percentualAcertos,
      sessoesEstudo: diasUnicos.size,
      ultimaSessionData: ultimaResposta?.createdAt || null,
    };

    return NextResponse.json({
      success: true,
      data: estatisticas,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do usuário:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
