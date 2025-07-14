#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🚀 Convertendo chunks para arquivos individuais...');

// Função para sanitizar string para nome de arquivo
function sanitizeForFilename(str) {
  if (!str) return 'indefinido';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .substring(0, 50); // Limita tamanho
}

// Função para criar nome de arquivo com metadados
function createFilename(questao, index) {
  const banca = sanitizeForFilename(questao.bancas_sigla || questao.bancas_nome || questao.banca || questao.organizadora);
  const ano = questao.anos || questao.ano || 'indefinido';
  const disciplina = sanitizeForFilename(questao.disciplina_real || questao.disciplina || questao.materia);
  const assunto = sanitizeForFilename(questao.assunto_real || questao.assunto || questao.topico);
  const dificuldade = sanitizeForFilename(questao.provas_nivel || questao.dificuldade || questao.nivel || 'medio');
  const orgao = sanitizeForFilename(questao.orgaos_sigla || questao.orgaos_nome || questao.orgao || questao.instituicao);
  const cargo = sanitizeForFilename(questao.cargos_descricao || questao.cargo || questao.funcao);
  
  // Usar id se disponível, senão usar index como código único
  const codigo = questao.id || questao.codigo || questao.codigo_real || `Q${String(index).padStart(7, '0')}`;
  
  return `banca-${banca}_ano-${ano}_disciplina-${disciplina}_assunto-${assunto}_dificuldade-${dificuldade}_orgao-${orgao}_cargo-${cargo}_codigo-${codigo}.json`;
}

// Função para extrair conteúdo da questão (sem metadados)
function extractQuestionContent(questao) {
  // Extrair alternativas dos itens
  const alternativas = [];
  if (questao.itens && Array.isArray(questao.itens)) {
    alternativas.push(...questao.itens.map(item => ({
      id: item.id,
      texto: item.corpo_clean || item.corpo,
      rotulo: item.rotulo
    })));
  }
  
  return {
    pergunta: questao.enunciado || questao.pergunta || questao.texto,
    grupoEnunciado: questao.grupoQuestao_enunciado || null,
    alternativas: alternativas,
    resposta: questao.resposta || questao.gabarito,
    tipo: questao.tipo || 'multipla escolha',
    explicacao: questao.explicacao || questao.justificativa,
    codigo: questao.id || questao.codigo || questao.codigo_real,
    anulada: questao.anulada === 'True' || questao.anulada === true,
    desatualizada: questao.desatualizada === 'True' || questao.desatualizada === true,
    hasImage: questao.hasImage === 'True' || questao.hasImage === true,
    hasImageItens: questao.hasImageItens === 'True' || questao.hasImageItens === true
  };
}

// Função principal
async function convertChunksToIndividualFiles() {
  const chunksDir = path.join(projectRoot, 'chunks');
  const outputDir = path.join(projectRoot, 'public', 'data', 'questoes');
  
  // Criar diretório de saída
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Limpar diretório existente
  console.log('🧹 Limpando diretório de questões...');
  const existingFiles = fs.readdirSync(outputDir);
  for (const file of existingFiles) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(outputDir, file));
    }
  }
  
  let totalQuestoes = 0;
  let processedFiles = 0;
  
  // Processar cada chunk
  const chunkFiles = fs.readdirSync(chunksDir)
    .filter(file => file.startsWith('batch_') && file.endsWith('.json'))
    .sort();
  
  console.log(`📁 Encontrados ${chunkFiles.length} arquivos de chunks`);
  
  for (const chunkFile of chunkFiles) {
    try {
      console.log(`   Processando ${chunkFile}...`);
      
      const chunkPath = path.join(chunksDir, chunkFile);
      const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
      
      // Processar cada questão no chunk
      for (const questao of chunkData) {
        // Criar nome de arquivo com metadados
        const filename = createFilename(questao, totalQuestoes + 1);
        
        // Extrair apenas conteúdo da questão
        const content = extractQuestionContent(questao);
        
        // Salvar arquivo individual
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(content, null, 2), 'utf8');
        
        totalQuestoes++;
        
        // Log de progresso a cada 1000 questões
        if (totalQuestoes % 1000 === 0) {
          console.log(`     Processadas ${totalQuestoes} questões...`);
        }
      }
      
      processedFiles++;
      console.log(`   ✅ ${chunkFile} processado (${chunkData.length} questões)`);
      
      // Força garbage collection a cada 10 arquivos
      if (processedFiles % 10 === 0) {
        if (global.gc) {
          global.gc();
        }
        console.log(`     🗑️  Garbage collection executado`);
      }
      
    } catch (error) {
      console.error(`   ❌ Erro processando ${chunkFile}:`, error.message);
    }
  }
  
  // Criar índice de arquivos para busca rápida
  console.log('📋 Criando índice de arquivos...');
  const allFiles = fs.readdirSync(outputDir)
    .filter(file => file.endsWith('.json'))
    .sort();
  
  const index = {
    totalQuestoes,
    totalArquivos: allFiles.length,
    geradoEm: new Date().toISOString(),
    estrutura: 'banca-{}_ano-{}_disciplina-{}_assunto-{}_dificuldade-{}_orgao-{}_cargo-{}_codigo-{}.json',
    exemplos: allFiles.slice(0, 5)
  };
  
  fs.writeFileSync(
    path.join(outputDir, '_index.json'),
    JSON.stringify(index, null, 2),
    'utf8'
  );
  
  console.log(`\n🎉 Conversão concluída!`);
  console.log(`   📊 Total de questões: ${totalQuestoes.toLocaleString()}`);
  console.log(`   📁 Arquivos criados: ${allFiles.length.toLocaleString()}`);
  console.log(`   📍 Diretório: ${outputDir}`);
  
  return { totalQuestoes, totalArquivos: allFiles.length };
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  convertChunksToIndividualFiles()
    .then((result) => {
      console.log('✅ Conversão finalizada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na conversão:', error);
      process.exit(1);
    });
}

export { convertChunksToIndividualFiles };
