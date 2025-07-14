#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Criando manifesto rápido...');

// Ler apenas o primeiro chunk para criar um manifesto básico
const chunksDir = path.join(__dirname, '../chunks');
const publicDataDir = path.join(__dirname, '../public/data');

// Criar diretório se não existir
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}

try {
  const primeiroChunk = path.join(chunksDir, 'batch_001.json');
  console.log('📂 Lendo primeiro chunk...');
  
  const questoes = JSON.parse(fs.readFileSync(primeiroChunk, 'utf8'));
  
  console.log(`📊 Encontradas ${questoes.length} questões no primeiro chunk`);
  
  // Criar manifesto com as primeiras questões
  const manifesto = questoes.slice(0, 1000).map(questao => ({
    codigo_real: questao.codigo_real,
    disciplina_real: questao.disciplina_real,
    assunto_real: questao.assunto_real,
    bancas_sigla: questao.bancas_sigla,
    ano: questao.anos || questao.ano,
    dificuldade: questao.dificuldade === 1 ? 'Fácil' : questao.dificuldade === 3 ? 'Média' : questao.dificuldade === 5 ? 'Difícil' : 'Média',
    anulada: questao.anulada === 'True' || questao.anulada === true,
    desatualizada: questao.desatualizada === 'True' || questao.desatualizada === true
  }));
  
  const manifestoPath = path.join(publicDataDir, 'manifest.json');
  fs.writeFileSync(manifestoPath, JSON.stringify(manifesto, null, 2));
  
  console.log(`✅ Manifesto criado com ${manifesto.length} questões em: ${manifestoPath}`);
  
} catch (error) {
  console.error('❌ Erro ao criar manifesto:', error);
  process.exit(1);
}
