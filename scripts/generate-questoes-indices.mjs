#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔧 Gerando índices otimizados de questões...');

const QUESTOES_PER_PAGE = 120;
const MAX_QUESTOES_POR_INDICE = 1000; // Limitar tamanho dos arquivos

// Função para criar hash simples de filtros
function createFilterHash(filtros) {
  const keys = Object.keys(filtros).sort();
  const hashString = keys.map(key => `${key}:${JSON.stringify(filtros[key])}`).join('|');
  return Buffer.from(hashString).toString('base64').replace(/[/+=]/g, '').substring(0, 16);
}

// Função para filtrar questões
function aplicarFiltros(questoes, filtros) {
  return questoes.filter(questao => {
    // Filtro por disciplinas
    if (filtros.disciplinas?.length > 0) {
      if (!filtros.disciplinas.includes(questao.disciplina)) return false;
    }

    // Filtro por assuntos
    if (filtros.assuntos?.length > 0) {
      if (!filtros.assuntos.some(assunto => questao.assuntos?.includes(assunto))) return false;
    }

    // Filtro por bancas
    if (filtros.bancas?.length > 0) {
      if (!filtros.bancas.includes(questao.banca)) return false;
    }

    // Filtro por anos
    if (filtros.anos?.length > 0) {
      if (!filtros.anos.includes(questao.ano)) return false;
    }

    // Filtro por dificuldades
    if (filtros.dificuldades?.length > 0) {
      if (!filtros.dificuldades.includes(questao.dificuldade)) return false;
    }

    // Incluir anuladas
    if (!filtros.incluirAnuladas && questao.anulada) return false;

    // Incluir desatualizadas
    if (!filtros.incluirDesatualizadas && questao.desatualizada) return false;

    return true;
  });
}

// Função para paginar questões
function paginarQuestoes(questoes, page = 1) {
  const startIndex = (page - 1) * QUESTOES_PER_PAGE;
  return {
    data: questoes.slice(startIndex, startIndex + QUESTOES_PER_PAGE),
    total: questoes.length,
    page,
    limit: QUESTOES_PER_PAGE,
    totalPages: Math.ceil(questoes.length / QUESTOES_PER_PAGE)
  };
}

async function gerarIndicesQuestoes() {
  try {
    const indicesDir = path.join(projectRoot, 'public', 'data', 'indices', 'questoes');
    
    // Criar diretório se não existir
    if (!fs.existsSync(indicesDir)) {
      fs.mkdirSync(indicesDir, { recursive: true });
    }

    // Limpar índices antigos
    if (fs.existsSync(indicesDir)) {
      const files = fs.readdirSync(indicesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(indicesDir, file));
      });
    }

    const chunksDir = path.join(projectRoot, 'chunks');
    const chunkFiles = fs.readdirSync(chunksDir)
      .filter(file => file.endsWith('.json'))
      .sort();

    console.log(`📦 Processando ${chunkFiles.length} chunks...`);

    // Carregar todas as questões (vamos otimizar isto)
    const todasQuestoes = [];
    let chunkCount = 0;

    for (const chunkFile of chunkFiles.slice(0, 20)) { // Limitar para evitar OOM
      chunkCount++;
      const chunkPath = path.join(chunksDir, chunkFile);
      const questoesChunk = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
      
      // Filtrar apenas campos essenciais para reduzir tamanho
      const questoesOtimizadas = questoesChunk.map(questao => ({
        codigo: questao.codigo,
        enunciado: questao.enunciado?.substring(0, 500) + '...', // Truncar para economizar espaço
        disciplina: questao.disciplina,
        assuntos: questao.assuntos?.slice(0, 3), // Limitar assuntos
        banca: questao.banca,
        ano: questao.ano,
        orgao: questao.orgao,
        dificuldade: questao.dificuldade,
        alternativas: questao.alternativas,
        gabarito: questao.gabarito,
        anulada: questao.anulada || false,
        desatualizada: questao.desatualizada || false
      }));

      todasQuestoes.push(...questoesOtimizadas);
      
      if (chunkCount % 5 === 0) {
        console.log(`   Processados ${chunkCount}/${Math.min(20, chunkFiles.length)} chunks (${todasQuestoes.length} questões)`);
        
        // Forçar garbage collection se disponível
        if (global.gc) {
          global.gc();
        }
      }

      // Limitar total de questões para não estourar memória
      if (todasQuestoes.length > MAX_QUESTOES_POR_INDICE) {
        console.log(`⚠️  Limitando a ${MAX_QUESTOES_POR_INDICE} questões para evitar OOM`);
        break;
      }
    }

    console.log(`✅ Total de questões carregadas: ${todasQuestoes.length}`);

    // Gerar índice geral paginado (primeiras páginas)
    console.log('📄 Gerando índices paginados gerais...');
    
    for (let page = 1; page <= 10; page++) { // Primeiras 10 páginas
      const resultado = paginarQuestoes(todasQuestoes, page);
      const filePath = path.join(indicesDir, `geral-page-${page}.json`);
      fs.writeFileSync(filePath, JSON.stringify(resultado, null, 2));
    }

    // Gerar alguns índices para filtros comuns
    const filtrosComuns = [
      { disciplinas: ['DIREITO CONSTITUCIONAL'] },
      { disciplinas: ['DIREITO ADMINISTRATIVO'] },
      { disciplinas: ['INFORMATICA'] },
      { disciplinas: ['PORTUGUES'] },
      { bancas: ['CESPE'] },
      { bancas: ['FCC'] },
      { anos: [2024] },
      { anos: [2023] }
    ];

    console.log('🔍 Gerando índices para filtros comuns...');
    
    for (const filtro of filtrosComuns) {
      try {
        const questoesFiltradas = aplicarFiltros(todasQuestoes, filtro);
        
        if (questoesFiltradas.length > 0) {
          const hash = createFilterHash(filtro);
          
          // Gerar primeiras páginas para cada filtro
          for (let page = 1; page <= 3; page++) {
            const resultado = paginarQuestoes(questoesFiltradas, page);
            if (resultado.data.length > 0) {
              const filePath = path.join(indicesDir, `filter-${hash}-page-${page}.json`);
              fs.writeFileSync(filePath, JSON.stringify({
                ...resultado,
                filtros: filtro
              }, null, 2));
            }
          }
          
          console.log(`   ✓ Gerado índice para ${JSON.stringify(filtro)} (${questoesFiltradas.length} questões)`);
        }
      } catch (error) {
        console.log(`   ⚠️  Erro ao gerar índice para ${JSON.stringify(filtro)}:`, error.message);
      }
    }

    // Gerar manifesto dos índices disponíveis
    const manifestPath = path.join(indicesDir, 'manifest.json');
    const manifest = {
      geradoEm: new Date().toISOString(),
      totalQuestoes: todasQuestoes.length,
      paginasGerais: 10,
      filtrosComuns: filtrosComuns.length,
      info: 'Índices pré-gerados para otimização da API'
    };
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log('🎉 Índices de questões gerados com sucesso!');
    console.log(`   📁 Diretório: ${indicesDir}`);
    console.log(`   📊 Total de questões: ${todasQuestoes.length}`);
    console.log(`   📄 Páginas gerais: 10`);
    console.log(`   🔍 Filtros comuns: ${filtrosComuns.length}`);

  } catch (error) {
    console.error('❌ Erro ao gerar índices de questões:', error);
    throw error;
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  gerarIndicesQuestoes();
}

export { gerarIndicesQuestoes };
