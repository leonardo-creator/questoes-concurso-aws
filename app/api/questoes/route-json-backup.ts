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

// Cache simples para listagem de arquivos (válido por 5 minutos)
let fileListCache: { files: string[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para extrair metadados do nome do arquivo
function extractMetadataFromFilename(filename: string): QuestaoMetadata | null {
  const regex = /banca-([^_]+)_ano-([^_]+)_disciplina-([^_]+)_assunto-([^_]+)_dificuldade-([^_]+)_orgao-([^_]+)_cargo-([^_]+)_codigo-([^.]+)\.json$/;
  const match = regex.exec(filename);
  
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

// Função para listar arquivos com cache
function getQuestionFiles(questoesDir: string): string[] {
  const now = Date.now();
  
  // Verificar cache
  if (fileListCache && (now - fileListCache.timestamp) < CACHE_DURATION) {
    return fileListCache.files;
  }
  
  // Recarregar arquivos
  const files = fs.readdirSync(questoesDir)
    .filter(file => file.endsWith('.json') && !file.startsWith('_'))
    .sort((a, b) => a.localeCompare(b));
  
  // Atualizar cache
  fileListCache = { files, timestamp: now };
  
  return files;
}

// Função para filtrar arquivos baseado nos critérios
function filterFiles(files: string[], filtros: FiltrosBusca): string[] {
  return files.filter(filename => {
    const metadata = extractMetadataFromFilename(filename);
    if (!metadata) return false;
    
    // Aplicar filtros (case-insensitive)
    if (filtros.banca && !metadata.banca.includes(filtros.banca.toLowerCase())) return false;
    if (filtros.ano && metadata.ano !== filtros.ano) return false;
    if (filtros.disciplina && !metadata.disciplina.includes(filtros.disciplina.toLowerCase())) return false;
    if (filtros.assunto && !metadata.assunto.includes(filtros.assunto.toLowerCase())) return false;
    if (filtros.dificuldade && metadata.dificuldade !== filtros.dificuldade.toLowerCase()) return false;
    if (filtros.orgao && !metadata.orgao.includes(filtros.orgao.toLowerCase())) return false;
    if (filtros.cargo && !metadata.cargo.includes(filtros.cargo.toLowerCase())) return false;
    
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
      banca: searchParams.get('bancas') || searchParams.get('banca') || undefined,
      ano: searchParams.get('anos') || searchParams.get('ano') || undefined,
      disciplina: searchParams.get('disciplinas') || searchParams.get('disciplina') || undefined,
      assunto: searchParams.get('assuntos') || searchParams.get('assunto') || undefined,
      dificuldade: searchParams.get('dificuldades') || searchParams.get('dificuldade') || undefined,
      orgao: searchParams.get('orgaos') || searchParams.get('orgao') || undefined,
      cargo: searchParams.get('cargos') || searchParams.get('cargo') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Máximo 100
    };

    // Diretório das questões
    const questoesDir = path.join(process.cwd(), 'public', 'data', 'questoes');
    
    if (!fs.existsSync(questoesDir)) {
      return NextResponse.json(
        { error: 'Diretório de questões não encontrado. Execute o script de conversão primeiro.' },
        { status: 404 }
      );
    }

    // Listar todos os arquivos JSON (com cache)
    const allFiles = getQuestionFiles(questoesDir);

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma questão encontrada. Execute o script de conversão primeiro.' },
        { status: 404 }
      );
    }

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
      filtros,
      success: true
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
