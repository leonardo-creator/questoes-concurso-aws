#!/usr/bin/env node
/**
 * Script melhorado de migração com detecção rigorosa de falhas
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Configurações
const BATCH_SIZE = 500; // Reduzido para melhor controle
const CHUNKS_DIR = path.join(__dirname, 'chunks');

/**
 * Normaliza dados da questão para o formato do banco
 */
function normalizeQuestion(questao) {
  // Validação rigorosa dos dados obrigatórios
  if (!questao.id) {
    throw new Error(`Questão sem ID: ${JSON.stringify(questao).substring(0, 100)}...`);
  }

  return {
    questaoId: Number(questao.id), // Garantir que é número
    dificuldade: Number(questao.dificuldade || 1),
    bancasNome: String(questao.bancas_nome || '').trim(),
    bancasDescricao: String(questao.bancas_descricao || '').trim(),
    bancasSigla: String(questao.bancas_sigla || '').trim(),
    bancasOab: Boolean(questao.bancas_oab),
    cargosDescricao: String(questao.cargos_descricao || '').trim(),
    orgaosNome: String(questao.orgaos_nome || '').trim(),
    orgaosSigla: String(questao.orgaos_sigla || '').trim(),
    orgaosUf: String(questao.orgaos_uf || '').trim(),
    anos: Number(questao.anos || new Date().getFullYear()),
    tipo: String(questao.tipo || '').trim(),
    grupoQuestaoEnunciado: String(questao.grupoQuestao_enunciado || '').trim(),
    enunciado: String(questao.enunciado || '').trim(),
    hasImage: questao.hasImage === 'True' || questao.hasImage === true,
    hasImageItens: questao.hasImageItens === 'True' || questao.hasImageItens === true,
    provasNivel: String(questao.provas_nivel || '').trim(),
    areasDescricao: questao.areas_descricao ? String(questao.areas_descricao).trim() : null,
    itens: Array.isArray(questao.itens) ? questao.itens : [],
    resposta: String(questao.resposta || '').trim(),
    assuntosPalavrasChave: Array.isArray(questao.assuntos_palavrasChave) ? questao.assuntos_palavrasChave : [],
    codigoReal: String(questao.codigo_real || '').trim(),
    disciplinaReal: String(questao.disciplina_real || '').trim(),
    assuntoReal: String(questao.assunto_real || '').trim(),
    anulada: questao.anulada === 'True' || questao.anulada === true,
    desatualizada: questao.desatualizada === 'True' || questao.desatualizada === true
  };
}

/**
 * Remove duplicatas dentro do lote baseado em questaoId
 */
function removeDuplicatesFromBatch(questions) {
  const seen = new Set();
  const unique = [];
  let duplicates = 0;
  
  for (const question of questions) {
    const id = Number(question.id);
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(question);
    } else {
      duplicates++;
    }
  }
  
  if (duplicates > 0) {
    console.log(`🔍 Removidas ${duplicates} duplicatas dentro do lote`);
  }
  
  return unique;
}

/**
 * Verifica quais questões já existem no banco
 */
async function getExistingQuestions(questaoIds) {
  try {
    const existing = await prisma.question.findMany({
      where: {
        questaoId: {
          in: questaoIds
        }
      },
      select: { questaoId: true }
    });
    
    return new Set(existing.map(q => Number(q.questaoId)));
  } catch (error) {
    console.error(`❌ Erro ao verificar questões existentes: ${error.message}`);
    return new Set();
  }
}

/**
 * Tenta inserir uma questão individualmente com tratamento de erro detalhado
 */
async function insertSingleQuestion(question, questionIndex) {
  try {
    const normalized = normalizeQuestion(question);
    
    const result = await prisma.question.create({
      data: normalized
    });
    
    return { success: true, questaoId: result.questaoId };
    
  } catch (error) {
    console.error(`❌ Erro ao inserir questão ${question.id} (índice ${questionIndex}):`);
    console.error(`   - Erro: ${error.message}`);
    console.error(`   - Dados: bancas_sigla="${question.bancas_sigla}", disciplina_real="${question.disciplina_real}"`);
    
    // Verificar se é erro de duplicata
    if (error.message.includes('Unique constraint')) {
      return { success: false, reason: 'duplicate', questaoId: question.id };
    }
    
    return { success: false, reason: 'error', error: error.message, questaoId: question.id };
  }
}

/**
 * Processa um lote de questões com verificação rigorosa
 */
async function processBatchRigorous(questions, batchNumber, chunkFile) {
  console.log(`🔄 ${chunkFile} - Processando lote ${batchNumber} (${questions.length} questões)`);
  
  try {
    // 1. Remover duplicatas dentro do lote
    const uniqueQuestions = removeDuplicatesFromBatch(questions);
    
    // 2. Verificar quais já existem no banco
    const questaoIds = uniqueQuestions.map(q => Number(q.id));
    const existingIds = await getExistingQuestions(questaoIds);
    
    // 3. Filtrar apenas questões novas
    const newQuestions = uniqueQuestions.filter(q => !existingIds.has(Number(q.id)));
    
    const alreadyExisted = uniqueQuestions.length - newQuestions.length;
    
    if (newQuestions.length === 0) {
      console.log(`⏭️  ${chunkFile} - Lote ${batchNumber}: Todas as ${questions.length} questões já existem`);
      return { 
        inserted: 0, 
        alreadyExisted, 
        errors: 0, 
        duplicateAttempts: 0 
      };
    }
    
    console.log(`📋 ${chunkFile} - Lote ${batchNumber}: ${newQuestions.length} questões para inserir, ${alreadyExisted} já existiam`);
    
    // 4. Tentar inserção em lote primeiro
    let inserted = 0;
    let errors = 0;
    let duplicateAttempts = 0;
    
    try {
      const normalizedQuestions = newQuestions.map(normalizeQuestion);
      
      const result = await prisma.question.createMany({
        data: normalizedQuestions,
        skipDuplicates: true
      });
      
      inserted = result.count;
      
      if (inserted === newQuestions.length) {
        console.log(`✅ ${chunkFile} - Lote ${batchNumber}: ${inserted} inseridas com sucesso em lote`);
      } else {
        console.warn(`⚠️  ${chunkFile} - Lote ${batchNumber}: Inserção em lote retornou ${inserted}/${newQuestions.length}`);
      }
      
    } catch (batchError) {
      console.warn(`⚠️  Erro na inserção em lote: ${batchError.message}`);
      console.log(`🔄 Tentando inserção individual para ${newQuestions.length} questões...`);
      
      // 5. Inserir uma por vez para identificar problemas específicos
      for (let i = 0; i < newQuestions.length; i++) {
        const question = newQuestions[i];
        const result = await insertSingleQuestion(question, i);
        
        if (result.success) {
          inserted++;
        } else if (result.reason === 'duplicate') {
          duplicateAttempts++;
        } else {
          errors++;
        }
        
        // Progress indicator para lotes grandes
        if ((i + 1) % 100 === 0) {
          console.log(`   Progresso: ${i + 1}/${newQuestions.length} processadas`);
        }
      }
      
      console.log(`🔄 ${chunkFile} - Lote ${batchNumber}: Inserção individual: ${inserted} sucesso, ${duplicateAttempts} duplicatas, ${errors} erros`);
    }
    
    return { 
      inserted, 
      alreadyExisted, 
      errors, 
      duplicateAttempts 
    };
    
  } catch (error) {
    console.error(`❌ Erro grave no lote ${batchNumber}: ${error.message}`);
    return { 
      inserted: 0, 
      alreadyExisted: 0, 
      errors: questions.length, 
      duplicateAttempts: 0 
    };
  }
}

/**
 * Migra um arquivo específico com controle rigoroso
 */
async function migrateFileRigorous(chunkFile) {
  console.log(`\n📂 Iniciando migração rigorosa: ${chunkFile}`);
  
  try {
    const filePath = path.join(CHUNKS_DIR, chunkFile);
    const content = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(content);
    
    if (!Array.isArray(questions)) {
      console.warn(`⚠️  ${chunkFile} não contém array válido`);
      return null;
    }
    
    console.log(`📊 ${chunkFile}: ${questions.length} questões encontradas`);
    
    // Verificar contagem inicial no banco
    const initialCount = await prisma.question.count();
    console.log(`📊 Total no banco antes da migração: ${initialCount.toLocaleString()}`);
    
    let totals = {
      inserted: 0,
      alreadyExisted: 0,
      errors: 0,
      duplicateAttempts: 0
    };
    
    // Processar em lotes menores
    const totalBatches = Math.ceil(questions.length / BATCH_SIZE);
    
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`\n📦 Lote ${batchNumber}/${totalBatches}:`);
      
      const result = await processBatchRigorous(batch, batchNumber, chunkFile);
      
      totals.inserted += result.inserted;
      totals.alreadyExisted += result.alreadyExisted;
      totals.errors += result.errors;
      totals.duplicateAttempts += result.duplicateAttempts;
      
      // Pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Verificar contagem final
    const finalCount = await prisma.question.count();
    const actualInserted = finalCount - initialCount;
    
    console.log(`\n✅ ${chunkFile} - RESULTADO FINAL:`);
    console.log(`   - Inseridas: ${totals.inserted} (relatado) / ${actualInserted} (real)`);
    console.log(`   - Já existiam: ${totals.alreadyExisted}`);
    console.log(`   - Tentativas de duplicata: ${totals.duplicateAttempts}`);
    console.log(`   - Erros: ${totals.errors}`);
    console.log(`   - Total no banco: ${finalCount.toLocaleString()}`);
    
    if (totals.inserted !== actualInserted) {
      console.warn(`⚠️  DISCREPÂNCIA: Relatado ${totals.inserted} vs Real ${actualInserted}`);
    }
    
    return {
      ...totals,
      actualInserted,
      finalCount
    };
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${chunkFile}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔧 MIGRAÇÃO RIGOROSA - Detecção de falhas melhorada');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados\n');
    
    // Processar apenas batch_001.json como teste
    const result = await migrateFileRigorous('batch_001.json');
    
    if (result) {
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n🎉 Migração concluída em ${totalTime}s`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export { main as rigorousMigration };
