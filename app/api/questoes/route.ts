import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import type { QuestaoManifesto, Questao, FiltroQuestoes, OrdenacaoQuestoes } from '@/types';

// Interface para busca hierárquica
interface BuscaHierarquica {
  codigoParaAssunto: Record<string, string>;
  assuntoParaCodigo: Record<string, string>;
  disciplinas: Record<string, any>;
  buscaHierarquica: Record<string, {
    proprio: string;
    filhos: string[];
    todos: string[];
  }>;
}

const QUESTOES_PER_PAGE = 120;

/**
 * Função para expandir códigos de assuntos considerando hierarquia
 */
function expandirAssuntosHierarquicos(assuntos: string[], buscaHierarquica: BuscaHierarquica['buscaHierarquica']): string[] {
  if (!assuntos || assuntos.length === 0) return [];

  const codigosExpandidos = new Set<string>();

  for (const assunto of assuntos) {
    // Adicionar o assunto selecionado
    codigosExpandidos.add(assunto);

    // Se existe na busca hierárquica, adicionar todos os filhos
    if (buscaHierarquica[assunto]) {
      buscaHierarquica[assunto].todos.forEach(codigo => {
        codigosExpandidos.add(codigo);
      });
    }
  }

  return Array.from(codigosExpandidos);
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
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || String(QUESTOES_PER_PAGE)), 120);
    
    // Parâmetros de filtro
    const filtros: FiltroQuestoes = {
      disciplinas: searchParams.get('disciplinas')?.split(',').filter(Boolean),
      assuntos: searchParams.get('assuntos')?.split(',').filter(Boolean),
      bancas: searchParams.get('bancas')?.split(',').filter(Boolean),
      anos: searchParams.get('anos')?.split(',').map(Number).filter(Boolean),
      dificuldades: searchParams.get('dificuldades')?.split(',').filter(Boolean),
      incluirAnuladas: searchParams.get('incluirAnuladas') === 'true',
      incluirDesatualizadas: searchParams.get('incluirDesatualizadas') === 'true',
      naoRepetirRespondidas: searchParams.get('naoRepetirRespondidas') === 'true',
      statusResposta: searchParams.get('statusResposta') as any,
      codigosPersonalizados: searchParams.get('codigosPersonalizados')?.split(',').filter(Boolean),
      cadernoId: searchParams.get('cadernoId') || undefined,
    };

    const ordenacao = (searchParams.get('ordenacao') || 'relevancia') as OrdenacaoQuestoes;

    // Carregar manifesto
    const manifestoPath = path.join(process.cwd(), 'public/data/manifest.json');
    if (!fs.existsSync(manifestoPath)) {
      return NextResponse.json(
        { success: false, error: 'Manifesto não encontrado. Execute o build primeiro.' },
        { status: 500 }
      );
    }

    // Carregar busca hierárquica
    const buscaHierarquicaPath = path.join(process.cwd(), 'public/data/indices/busca-hierarquica.json');
    let buscaHierarquica: BuscaHierarquica | null = null;
    
    if (fs.existsSync(buscaHierarquicaPath)) {
      try {
        buscaHierarquica = JSON.parse(fs.readFileSync(buscaHierarquicaPath, 'utf8'));
      } catch (error) {
        console.warn('Erro ao carregar busca hierárquica:', error);
      }
    }

    const manifesto: QuestaoManifesto[] = JSON.parse(fs.readFileSync(manifestoPath, 'utf8'));

    // Expandir assuntos considerando hierarquia
    let assuntosExpandidos = filtros.assuntos;
    if (buscaHierarquica && filtros.assuntos?.length) {
      // Tentar mapear nomes de assuntos para códigos
      const codigosAssuntos = filtros.assuntos.map(assunto => {
        return buscaHierarquica!.assuntoParaCodigo[assunto] || assunto;
      });
      
      assuntosExpandidos = expandirAssuntosHierarquicos(codigosAssuntos, buscaHierarquica.buscaHierarquica);
      
      // Converter códigos de volta para nomes de assuntos
      assuntosExpandidos = assuntosExpandidos.map(codigo => {
        return buscaHierarquica!.codigoParaAssunto[codigo] || codigo;
      });
    }

    // Se usuário escolheu não repetir questões, buscar questões já respondidas
    let questoesRespondidas: Set<string> = new Set();
    if (filtros.naoRepetirRespondidas) {
      const respostas = await prisma.answer.findMany({
        where: { userId: session.user.id },
        select: { questaoCodigoReal: true }
      });
      questoesRespondidas = new Set(respostas.map(r => r.questaoCodigoReal));
    }

    // Se filtro por status de resposta, buscar questões corretas/incorretas
    let questoesPorStatus: Set<string> = new Set();
    if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
      const acertou = filtros.statusResposta === 'acertadas';
      const respostas = await prisma.answer.findMany({
        where: { 
          userId: session.user.id,
          acertou 
        },
        select: { questaoCodigoReal: true }
      });
      questoesPorStatus = new Set(respostas.map(r => r.questaoCodigoReal));
    }

    // Se filtro por caderno, buscar códigos do caderno
    let codigosCaderno: Set<string> = new Set();
    if (filtros.cadernoId) {
      const caderno = await prisma.customList.findFirst({
        where: {
          id: filtros.cadernoId,
          userId: session.user.id
        }
      });
      if (caderno) {
        codigosCaderno = new Set(caderno.questionCodes);
      }
    }

    // Aplicar filtros ao manifesto
    let questoesFiltradas = manifesto.filter(questao => {
      // Filtro por disciplinas
      if (filtros.disciplinas?.length && !filtros.disciplinas.includes(questao.disciplina_real)) {
        return false;
      }

      // Filtro por assuntos (agora com hierarquia)
      if (assuntosExpandidos?.length && !assuntosExpandidos.includes(questao.assunto_real)) {
        return false;
      }

      // Filtro por bancas
      if (filtros.bancas?.length && !filtros.bancas.includes(questao.bancas_sigla)) {
        return false;
      }

      // Filtro por anos
      if (filtros.anos?.length && !filtros.anos.includes(questao.ano)) {
        return false;
      }

      // Filtro por dificuldades
      if (filtros.dificuldades?.length && !filtros.dificuldades.includes(questao.dificuldade)) {
        return false;
      }

      // Filtro de questões anuladas
      if (!filtros.incluirAnuladas && questao.anulada) {
        return false;
      }

      // Filtro de questões desatualizadas
      if (!filtros.incluirDesatualizadas && questao.desatualizada) {
        return false;
      }

      // Não repetir questões respondidas
      if (filtros.naoRepetirRespondidas && questoesRespondidas.has(questao.codigo_real)) {
        return false;
      }

      // Filtro por status de resposta
      if (filtros.statusResposta && filtros.statusResposta !== 'todas') {
        if (!questoesPorStatus.has(questao.codigo_real)) {
          return false;
        }
      }

      // Filtro por códigos personalizados
      if (filtros.codigosPersonalizados?.length && !filtros.codigosPersonalizados.includes(questao.codigo_real)) {
        return false;
      }

      // Filtro por caderno
      if (filtros.cadernoId && !codigosCaderno.has(questao.codigo_real)) {
        return false;
      }

      return true;
    });

    // Aplicar ordenação
    questoesFiltradas.sort((a, b) => {
      switch (ordenacao) {
        case 'data_asc':
          return a.ano - b.ano;
        case 'data_desc':
          return b.ano - a.ano;
        case 'dificuldade_asc':
          const ordemDificuldade = { 'Fácil': 1, 'Média': 2, 'Difícil': 3 };
          return ordemDificuldade[a.dificuldade] - ordemDificuldade[b.dificuldade];
        case 'dificuldade_desc':
          const ordemDificuldadeDesc = { 'Fácil': 3, 'Média': 2, 'Difícil': 1 };
          return ordemDificuldadeDesc[a.dificuldade] - ordemDificuldadeDesc[b.dificuldade];
        default: // relevancia
          return 0; // Manter ordem original
      }
    });

    // Aplicar paginação
    const total = questoesFiltradas.length;
    const offset = (page - 1) * limit;
    const questoesPaginadas = questoesFiltradas.slice(offset, offset + limit);

    // Carregar dados completos das questões
    const questoesCompletas: Questao[] = [];
    for (const questaoManifesto of questoesPaginadas) {
      const questaoPath = path.join(process.cwd(), 'public/data/questoes', `${questaoManifesto.codigo_real}.json`);
      
      if (fs.existsSync(questaoPath)) {
        try {
          const questaoCompleta = JSON.parse(fs.readFileSync(questaoPath, 'utf8'));
          questoesCompletas.push(questaoCompleta);
        } catch (error) {
          console.error(`Erro ao carregar questão ${questaoManifesto.codigo_real}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: questoesCompletas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filtrosAplicados: filtros,
      ordenacao
    });

  } catch (error) {
    console.error('Erro na API de questões:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
