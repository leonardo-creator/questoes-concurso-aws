#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🚀 Iniciando teste de build...');

// Verificar se o diretório chunks existe
const chunksDir = path.join(projectRoot, 'chunks');
if (!fs.existsSync(chunksDir)) {
  console.error('❌ Diretório chunks não encontrado:', chunksDir);
  process.exit(1);
}

const chunkFiles = fs.readdirSync(chunksDir)
  .filter(file => file.startsWith('batch_') && file.endsWith('.json'));

console.log(`📦 Encontrados ${chunkFiles.length} chunks`);

// Testar leitura de um chunk
const firstChunk = chunkFiles[0];
if (firstChunk) {
  console.log(`📋 Testando leitura do primeiro chunk: ${firstChunk}`);
  try {
    const chunkPath = path.join(chunksDir, firstChunk);
    const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
    console.log(`✅ Chunk lido com sucesso. Questões: ${chunkData.questoes?.length || 0}`);
  } catch (error) {
    console.error('❌ Erro ao ler chunk:', error.message);
  }
}

console.log('✅ Teste concluído!');
