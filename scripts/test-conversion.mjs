#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🧪 Testando conversão com um único chunk...');

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

async function testConversion() {
  const chunksDir = path.join(projectRoot, 'chunks');
  const outputDir = path.join(projectRoot, 'public', 'data', 'questoes-test');
  
  // Criar diretório de teste
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Processar apenas o primeiro chunk para teste
  const firstChunk = path.join(chunksDir, 'batch_001.json');
  
  if (!fs.existsSync(firstChunk)) {
    console.error('❌ Arquivo batch_001.json não encontrado');
    return;
  }
  
  console.log('📁 Carregando batch_001.json...');
  const chunkData = JSON.parse(fs.readFileSync(firstChunk, 'utf8'));
  
  console.log(`📊 Encontradas ${chunkData.length} questões no chunk`);
  
  // Processar apenas as primeiras 10 questões para teste
  const questoesToProcess = chunkData.slice(0, 10);
  
  for (let i = 0; i < questoesToProcess.length; i++) {
    const questao = questoesToProcess[i];
    
    // Criar nome de arquivo com metadados
    const filename = createFilename(questao, i + 1);
    
    // Extrair apenas conteúdo da questão
    const content = extractQuestionContent(questao);
    
    // Salvar arquivo individual
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(content, null, 2), 'utf8');
    
    console.log(`   ✅ Criado: ${filename}`);
  }
  
  console.log(`\n🎉 Teste concluído! ${questoesToProcess.length} arquivos criados em ${outputDir}`);
  
  // Listar arquivos criados
  const files = fs.readdirSync(outputDir);
  console.log('\n📁 Arquivos criados:');
  files.forEach(file => console.log(`   - ${file}`));
}

testConversion().catch(console.error);
