import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Interface para questão
interface Questao {
  pergunta: string;
  alternativas: string[];
  resposta: string;
  explicacao?: string;
  codigo: string;
}

// Interface para metadados extraídos do nome do arquivo
interface QuestaoMetadata {
  banca: string;
  ano: string;
  disciplina: string;
  assunto: string;
  dificuldade: string;
  orgao: string;
  cargo: string;
  codigo: string;
  filename: string;
}

// Interface para filtros de busca
interface FiltrosBusca {
  banca?: string;
  ano?: string;
  disciplina?: string;
  assunto?: string;
  dificuldade?: string;
  orgao?: string;
  cargo?: string;
  page?: number;
  limit?: number;
}

// Função para extrair metadados do nome do arquivo
function extractMetadataFromFilename(filename: string): QuestaoMetadata | null {
  const regex = /banca-([^_]+)_ano-([^_]+)_disciplina-([^_]+)_assunto-([^_]+)_dificuldade-([^_]+)_orgao-([^_]+)_cargo-([^_]+)_codigo-([^.]+)\.json$/;
  const match = filename.match(regex);
  
  if (!match) {
    return null;
  }
  
  return {
    banca: match[1],
    ano: match[2],
    disciplina: match[3],
    assunto: match[4],
    dificuldade: match[5],
    orgao: match[6],
    cargo: match[7],
    codigo: match[8],
    filename
  };
}

// Função para filtrar arquivos baseado nos critérios
function filterFiles(files: string[], filtros: FiltrosBusca): string[] {
  return files.filter(filename => {
    const metadata = extractMetadataFromFilename(filename);
    if (!metadata) return false;
    
    // Aplicar filtros
    if (filtros.banca && metadata.banca !== filtros.banca.toLowerCase()) return false;
    if (filtros.ano && metadata.ano !== filtros.ano) return false;
    if (filtros.disciplina && metadata.disciplina !== filtros.disciplina.toLowerCase()) return false;
    if (filtros.assunto && metadata.assunto !== filtros.assunto.toLowerCase()) return false;
    if (filtros.dificuldade && metadata.dificuldade !== filtros.dificuldade.toLowerCase()) return false;
    if (filtros.orgao && metadata.orgao !== filtros.orgao.toLowerCase()) return false;
    if (filtros.cargo && metadata.cargo !== filtros.cargo.toLowerCase()) return false;
    
    return true;
  });
}

// Função para carregar questão do arquivo
function loadQuestion(filename: string, questoesDir: string): { questao: Questao; metadata: QuestaoMetadata } | null {
  try {
    const filepath = path.join(questoesDir, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const questao = JSON.parse(content) as Questao;
    const metadata = extractMetadataFromFilename(filename);
    
    if (!metadata) return null;
    
    return { questao, metadata };
  } catch (error) {
    console.error(`Erro carregando questão ${filename}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Extrair parâmetros de busca
    const searchParams = request.nextUrl.searchParams;
    const filtros: FiltrosBusca = {
      banca: searchParams.get('banca') || undefined,
      ano: searchParams.get('ano') || undefined,
      disciplina: searchParams.get('disciplina') || undefined,
      assunto: searchParams.get('assunto') || undefined,
      dificuldade: searchParams.get('dificuldade') || undefined,
      orgao: searchParams.get('orgao') || undefined,
      cargo: searchParams.get('cargo') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Máximo 100
    };

    // Diretório das questões
    const questoesDir = path.join(process.cwd(), 'public', 'data', 'questoes');
    
    if (!fs.existsSync(questoesDir)) {
      return NextResponse.json(
        { error: 'Diretório de questões não encontrado' },
        { status: 404 }
      );
    }

    // Listar todos os arquivos JSON
    const allFiles = fs.readdirSync(questoesDir)
      .filter(file => file.endsWith('.json') && !file.startsWith('_'))
      .sort();

    // Aplicar filtros
    const filteredFiles = filterFiles(allFiles, filtros);

    // Calcular paginação
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

    // Carregar questões da página atual
    const questoes = [];
    for (const filename of paginatedFiles) {
      const result = loadQuestion(filename, questoesDir);
      if (result) {
        questoes.push({
          ...result.questao,
          metadata: result.metadata
        });
      }
    }

    // Preparar resposta
    const response = {
      questoes,
      pagination: {
        page,
        limit,
        total: filteredFiles.length,
        totalPages: Math.ceil(filteredFiles.length / limit),
        hasNext: endIndex < filteredFiles.length,
        hasPrev: page > 1
      },
      filtros: filtros
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erro na API de questões:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
