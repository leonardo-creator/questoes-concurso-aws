#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Configurações para otimização de memória
const BATCH_SIZE = 10; // Processar 10 chunks por vez
const MEMORY_LIMIT_MB = 400; // Limite de memória em MB

console.log('🚀 Iniciando build otimizado para deploy...');

// Função para verificar uso de memória
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return Math.round(usage.heapUsed / 1024 / 1024);
}

// Função para forçar garbage collection
function forceGC() {
  if (global.gc) {
    global.gc();
  }
}

// Função para processar uma questão individual
function processQuestao(questao, globalStats) {
  globalStats.totalQuestoes++;
  
  // Coletar disciplinas
  if (questao.disciplina_real) {
    globalStats.disciplinas.add(questao.disciplina_real);
  }
  
  // Coletar assuntos
  if (questao.assunto_real) {
    globalStats.assuntos.add(questao.assunto_real);
  }
  
  // Coletar bancas
  if (questao.bancas_sigla && questao.bancas_nome) {
    if (!globalStats.bancas.has(questao.bancas_sigla)) {
      globalStats.bancas.set(questao.bancas_sigla, questao.bancas_nome);
    }
  }
  
  // Coletar anos
  if (questao.anos) {
    globalStats.anos.add(questao.anos);
  } else if (questao.ano) {
    globalStats.anos.add(questao.ano);
  }
}

// Função para processar um chunk individual
function processChunk(chunkPath, globalStats) {
  try {
    // Verificar memória antes do processamento
    const memBefore = getMemoryUsage();
    if (memBefore > MEMORY_LIMIT_MB) {
      console.log(`⚠️  Memória alta (${memBefore}MB), forçando GC...`);
      forceGC();
    }

    // Ler e processar chunk
    let chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
    
    if (chunkData.questoes && Array.isArray(chunkData.questoes)) {
      for (const questao of chunkData.questoes) {
        processQuestao(questao, globalStats);
      }
    }
    
    // Limpar variável do chunk da memória
    chunkData = null;
    
  } catch (error) {
    const chunkFile = path.basename(chunkPath);
    console.error(`❌ Erro ao processar ${chunkFile}:`, error.message);
  }
}

// Função para processar chunks em lotes
async function processChunksInBatches() {
  const chunksDir = path.join(projectRoot, 'chunks');
  const chunkFiles = fs.readdirSync(chunksDir)
    .filter(file => file.startsWith('batch_') && file.endsWith('.json'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  console.log(`📦 Encontrados ${chunkFiles.length} chunks para processar`);

  // Inicializar contadores globais
  const globalStats = {
    disciplinas: new Set(),
    assuntos: new Set(),
    bancas: new Map(),
    anos: new Set(),
    totalQuestoes: 0
  };

  // Processar chunks em lotes
  for (let i = 0; i < chunkFiles.length; i += BATCH_SIZE) {
    const batch = chunkFiles.slice(i, i + BATCH_SIZE);
    console.log(`📊 Processando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunkFiles.length/BATCH_SIZE)}: chunks ${i + 1}-${Math.min(i + BATCH_SIZE, chunkFiles.length)}`);
    
    // Processar cada chunk do lote
    for (const chunkFile of batch) {
      const chunkPath = path.join(chunksDir, chunkFile);
      processChunk(chunkPath, globalStats);
    }
    
    // Forçar garbage collection após cada lote
    forceGC();
    
    const memAfter = getMemoryUsage();
    console.log(`   Memória: ${memAfter}MB | Questões processadas: ${globalStats.totalQuestoes}`);
  }

  return globalStats;
}

// Função para gerar índices otimizados
function generateOptimizedIndices(stats) {
  console.log('📋 Gerando índices otimizados...');
  
  const indices = {
    disciplinas: Array.from(stats.disciplinas).sort(),
    assuntos: Array.from(stats.assuntos).sort(),
    bancas: Array.from(stats.bancas.entries())
      .map(([sigla, nome]) => ({ sigla, nome }))
      .sort((a, b) => a.sigla.localeCompare(b.sigla)),
    anos: Array.from(stats.anos)
      .filter(ano => ano && !isNaN(ano))
      .map(ano => parseInt(ano))
      .sort((a, b) => b - a)
  };

  return indices;
}

// Função para salvar arquivos de índices
function saveIndices(indices) {
  const dataDir = path.join(projectRoot, 'public', 'data');
  const indicesDir = path.join(dataDir, 'indices');
  
  // Criar diretórios se não existirem
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(indicesDir)) {
    fs.mkdirSync(indicesDir, { recursive: true });
  }

  // Salvar cada índice separadamente
  fs.writeFileSync(
    path.join(indicesDir, 'disciplinas.json'),
    JSON.stringify(indices.disciplinas, null, 2)
  );
  
  fs.writeFileSync(
    path.join(indicesDir, 'assuntos.json'),
    JSON.stringify(indices.assuntos, null, 2)
  );
  
  fs.writeFileSync(
    path.join(indicesDir, 'bancas.json'),
    JSON.stringify(indices.bancas, null, 2)
  );
  
  fs.writeFileSync(
    path.join(indicesDir, 'anos.json'),
    JSON.stringify(indices.anos, null, 2)
  );

  console.log('💾 Índices salvos em public/data/indices/');
}

// Função para gerar manifesto leve
function generateLightManifest(stats, indices) {
  console.log('📄 Gerando manifesto leve...');
  
  const manifest = {
    meta: {
      totalQuestoes: stats.totalQuestoes,
      totalDisciplinas: indices.disciplinas.length,
      totalAssuntos: indices.assuntos.length,
      totalBancas: indices.bancas.length,
      totalAnos: indices.anos.length,
      geradoEm: new Date().toISOString()
    },
    indices: {
      disciplinas: indices.disciplinas,
      bancas: indices.bancas,
      anos: indices.anos
    }
  };

  const manifestPath = path.join(projectRoot, 'public', 'data', 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log('📋 Manifesto leve salvo em public/data/manifest.json');
  return manifest;
}

// Função principal
async function main() {
  try {
    const startTime = Date.now();
    const startMemory = getMemoryUsage();
    
    console.log(`🔧 Memória inicial: ${startMemory}MB`);
    console.log(`⚙️  Node.js version: ${process.version}`);
    
    // Processar todos os chunks em lotes
    const stats = await processChunksInBatches();
    
    // Gerar índices
    const indices = generateOptimizedIndices(stats);
    
    // Salvar arquivos
    saveIndices(indices);
    generateLightManifest(stats, indices);
    
    const endTime = Date.now();
    const endMemory = getMemoryUsage();
    
    console.log('\n✅ Build otimizado concluído!');
    console.log(`📊 Estatísticas:`);
    console.log(`   • Questões processadas: ${stats.totalQuestoes.toLocaleString()}`);
    console.log(`   • Disciplinas: ${indices.disciplinas.length}`);
    console.log(`   • Assuntos: ${indices.assuntos.length}`);
    console.log(`   • Bancas: ${indices.bancas.length}`);
    console.log(`   • Anos: ${indices.anos.length}`);
    console.log(`   • Tempo: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    console.log(`   • Memória final: ${endMemory}MB`);
    
  } catch (error) {
    console.error('❌ Erro no build otimizado:', error);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
