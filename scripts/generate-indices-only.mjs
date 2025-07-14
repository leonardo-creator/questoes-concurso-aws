#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Gerando apenas índices para deploy...');

// Diretórios
const chunksDir = path.join(__dirname, '../chunks');
const publicDataDir = path.join(__dirname, '../public/data');
const indicesDir = path.join(publicDataDir, 'indices');

// Criar diretórios se não existirem
[publicDataDir, indicesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Função para processar apenas os primeiros chunks para extrair índices
function gerarIndicesLeves() {
  console.log('📊 Gerando índices leves...');
  
  // Usar apenas os primeiros 5 chunks para extrair os índices
  const arquivos = fs.readdirSync(chunksDir)
    .filter(arquivo => arquivo.endsWith('.json'))
    .sort()
    .slice(0, 5); // Apenas os primeiros 5 para economizar memória

  const disciplinas = new Set();
  const bancas = new Map();
  const anos = new Set();
  
  for (const arquivo of arquivos) {
    console.log(`   Processando ${arquivo} para índices...`);
    const caminhoArquivo = path.join(chunksDir, arquivo);
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
    
    try {
      const questoes = JSON.parse(conteudo);
      if (Array.isArray(questoes)) {
        questoes.forEach(questao => {
          // Disciplinas
          if (questao.disciplina_real) {
            disciplinas.add(questao.disciplina_real);
          }
          
          // Bancas
          if (questao.bancas_sigla && questao.bancas_nome) {
            bancas.set(questao.bancas_sigla, questao.bancas_nome);
          }
          
          // Anos
          if (questao.anos && questao.anos > 1990) {
            anos.add(questao.anos);
          }
        });
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${arquivo}:`, error.message);
    }
  }

  // Salvar índices
  const disciplinasArray = Array.from(disciplinas).sort();
  const bancasArray = Array.from(bancas.entries()).map(([sigla, nome]) => ({
    sigla,
    nome
  })).sort((a, b) => a.sigla.localeCompare(b.sigla));
  const anosArray = Array.from(anos).sort((a, b) => b - a);

  fs.writeFileSync(
    path.join(indicesDir, 'disciplinas.json'),
    JSON.stringify(disciplinasArray, null, 2)
  );

  fs.writeFileSync(
    path.join(indicesDir, 'bancas.json'),
    JSON.stringify(bancasArray, null, 2)
  );

  fs.writeFileSync(
    path.join(indicesDir, 'anos.json'),
    JSON.stringify(anosArray, null, 2)
  );

  console.log(`✅ Índices gerados:`);
  console.log(`   - ${disciplinasArray.length} disciplinas`);
  console.log(`   - ${bancasArray.length} bancas`);
  console.log(`   - ${anosArray.length} anos`);
}

// Gerar manifest.json leve se não existir
function gerarManifestLeve() {
  const manifestPath = path.join(publicDataDir, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.log('📋 Gerando manifest leve...');
    
    // Usar apenas o primeiro chunk para gerar um manifest básico
    const primeiroChunk = path.join(chunksDir, 'batch_001.json');
    
    if (fs.existsSync(primeiroChunk)) {
      const conteudo = fs.readFileSync(primeiroChunk, 'utf8');
      const questoes = JSON.parse(conteudo);
      
      // Pegar apenas as primeiras 1000 questões
      const questoesLimitadas = questoes.slice(0, 1000);
      
      const manifest = questoesLimitadas.map(questao => ({
        codigo_real: questao.codigo_real,
        disciplina_real: questao.disciplina_real,
        assunto_real: questao.assunto_real,
        bancas_sigla: questao.bancas_sigla,
        ano: questao.ano,
        dificuldade: questao.dificuldade === 1 ? 'Fácil' : 
                    questao.dificuldade === 2 ? 'Média' : 'Difícil',
        anulada: Boolean(questao.anulada),
        desatualizada: Boolean(questao.desatualizada)
      }));
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`✅ Manifest gerado com ${manifest.length} questões`);
    }
  } else {
    console.log('📋 Manifest já existe, pulando...');
  }
}

// Executar
try {
  gerarIndicesLeves();
  gerarManifestLeve();
  console.log('🎉 Processamento concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro durante o processamento:', error);
  process.exit(1);
}
