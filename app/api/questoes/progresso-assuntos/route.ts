import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

interface AssuntoProgresso {
  assunto: string;
  disciplina: string;
  totalQuestoes: number;
  questoesRespondidas: number;
  questoesCorretas: number;
  percentualConcluido: number;
  prioridade: number; // Menor = mais prioritário
}

interface QuestaoSimplificada {
  codigo_real: string;
  disciplina_real: string;
  assunto_real: string;
  dificuldade: 'Fácil' | 'Média' | 'Difícil';
}

interface RespostaUsuario {
  questionCode: string;
  isCorrect: boolean;
}

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
    const disciplinasFiltradas = searchParams.get('disciplinas')?.split(',') || [];
    const assuntosFiltrados = searchParams.get('assuntos')?.split(',') || [];

    // Buscar respostas do usuário (simulação - você pode conectar ao Prisma)
    const respostasUsuario = await buscarRespostasUsuario(session.user.id);

    // Carregar todas as questões dos chunks para análise
    const todasQuestoes = await carregarQuestoesDosChunks();

    // Filtrar questões por disciplinas/assuntos se especificado
    let questoesFiltradas = todasQuestoes;
    
    if (disciplinasFiltradas.length > 0) {
      questoesFiltradas = questoesFiltradas.filter(q => 
        disciplinasFiltradas.includes(q.disciplina_real)
      );
    }

    if (assuntosFiltrados.length > 0) {
      questoesFiltradas = questoesFiltradas.filter(q => 
        assuntosFiltrados.includes(q.assunto_real)
      );
    }

    // Agrupar questões por assunto
    const questoesPorAssunto = new Map<string, QuestaoSimplificada[]>();
    
    for (const questao of questoesFiltradas) {
      const key = `${questao.disciplina_real}|${questao.assunto_real}`;
      if (!questoesPorAssunto.has(key)) {
        questoesPorAssunto.set(key, []);
      }
      questoesPorAssunto.get(key)!.push(questao);
    }

    // Calcular progresso por assunto
    const progressoAssuntos: AssuntoProgresso[] = [];

    for (const [key, questoes] of questoesPorAssunto) {
      const [disciplina, assunto] = key.split('|');
      
      const codigosQuestoes = questoes.map(q => q.codigo_real);
      const respostasAssunto = respostasUsuario.filter(r => 
        codigosQuestoes.includes(r.questionCode)
      );

      const questoesRespondidas = respostasAssunto.length;
      const questoesCorretas = respostasAssunto.filter(r => r.isCorrect).length;
      const totalQuestoes = questoes.length;
      const percentualConcluido = totalQuestoes > 0 ? (questoesRespondidas / totalQuestoes) * 100 : 0;

      // Calcular prioridade (menor = mais prioritário)
      // Fórmula: questões não respondidas + peso da dificuldade média
      const questoesNaoRespondidas = totalQuestoes - questoesRespondidas;
      const pesoMediaDificuldade = calcularPesoMediaDificuldade(questoes);
      const prioridade = questoesNaoRespondidas * 10 + pesoMediaDificuldade;

      progressoAssuntos.push({
        assunto,
        disciplina,
        totalQuestoes,
        questoesRespondidas,
        questoesCorretas,
        percentualConcluido: Math.round(percentualConcluido * 100) / 100,
        prioridade
      });
    }

    // Ordenar por prioridade (assuntos menos estudados primeiro)
    progressoAssuntos.sort((a, b) => b.prioridade - a.prioridade);

    return NextResponse.json({
      success: true,
      data: progressoAssuntos,
      metadata: {
        totalAssuntos: progressoAssuntos.length,
        usuarioId: session.user.id,
        filtrosAplicados: {
          disciplinas: disciplinasFiltradas,
          assuntos: assuntosFiltrados
        }
      }
    });

  } catch (error) {
    console.error('Erro ao calcular progresso por assuntos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function buscarRespostasUsuario(userId: string): Promise<RespostaUsuario[]> {
  // Simulação de busca de respostas - implementar com Prisma quando necessário
  try {
    // Aqui você pode implementar a busca real no banco de dados
    console.log('Buscando respostas para usuário:', userId);
    return [];
  } catch (error) {
    console.error('Erro ao buscar respostas do usuário:', error);
    return [];
  }
}

async function carregarQuestoesDosChunks(): Promise<QuestaoSimplificada[]> {
  const questoes: QuestaoSimplificada[] = [];
  
  try {
    // Carregar apenas alguns chunks para análise (otimização)
    const chunksPrincipais = [1, 10, 20, 30, 40, 50]; // Amostra representativa
    
    for (const chunkNum of chunksPrincipais) {
      const chunkPath = join(process.cwd(), 'chunks', `batch_${chunkNum.toString().padStart(3, '0')}.json`);
      
      try {
        const chunkData = JSON.parse(readFileSync(chunkPath, 'utf-8'));
        
        for (const questao of chunkData) {
          if (questao.codigo_real && questao.disciplina_real && questao.assunto_real && questao.dificuldade) {
            questoes.push({
              codigo_real: questao.codigo_real,
              disciplina_real: questao.disciplina_real,
              assunto_real: questao.assunto_real,
              dificuldade: questao.dificuldade
            });
          }
        }
      } catch (chunkError) {
        console.warn(`Erro ao carregar chunk ${chunkNum}:`, chunkError);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar chunks:', error);
  }

  return questoes;
}

function calcularPesoMediaDificuldade(questoes: QuestaoSimplificada[]): number {
  if (questoes.length === 0) return 0;

  const pesos = { 'Fácil': 1, 'Média': 2, 'Difícil': 3 };
  const somasPesos = questoes.reduce((soma, q) => soma + (pesos[q.dificuldade] || 2), 0);
  
  return somasPesos / questoes.length;
}
