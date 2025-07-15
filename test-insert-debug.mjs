#!/usr/bin/env node
/**
 * Script para diagnosticar exatamente por que createMany retorna 0
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const CHUNKS_DIR = path.join(__dirname, 'chunks');

function normalizeQuestion(questao) {
  return {
    questaoId: Number(questao.id),
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

async function testSingleInsert() {
  console.log('🧪 TESTE: Inserção individual vs lote\n');
  
  try {
    await prisma.$connect();
    
    // 1. Pegar algumas questões que sabemos que não existem
    const filePath = path.join(CHUNKS_DIR, 'batch_001.json');
    const content = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(content);
    
    // Encontrar questões que não existem no banco
    const sample = questions.slice(0, 100); // Pegar 100 questões
    const ids = sample.map(q => Number(q.id));
    
    const existing = await prisma.question.findMany({
      where: { questaoId: { in: ids } },
      select: { questaoId: true }
    });
    
    const existingSet = new Set(existing.map(q => q.questaoId));
    const newQuestions = sample.filter(q => !existingSet.has(Number(q.id)));
    
    if (newQuestions.length === 0) {
      console.log('❌ Todas as questões já existem. Preciso encontrar questões novas.');
      return;
    }
    
    console.log(`✅ Encontradas ${newQuestions.length} questões novas para teste`);
    
    // 2. Testar inserção individual de UMA questão
    const testQuestion = newQuestions[0];
    console.log(`\n🎯 Testando questão ID: ${testQuestion.id}`);
    
    try {
      const normalized = normalizeQuestion(testQuestion);
      console.log('📋 Dados normalizados:');
      console.log(`   - questaoId: ${normalized.questaoId} (${typeof normalized.questaoId})`);
      console.log(`   - bancasSigla: "${normalized.bancasSigla}"`);
      console.log(`   - disciplinaReal: "${normalized.disciplinaReal}"`);
      console.log(`   - enunciado: "${normalized.enunciado.substring(0, 50)}..."`);
      
      // Teste 1: create individual
      console.log('\n🧪 TESTE 1: create() individual');
      const result1 = await prisma.question.create({
        data: normalized
      });
      console.log(`✅ Sucesso! ID inserido: ${result1.id}, questaoId: ${result1.questaoId}`);
      
      // Remover para teste do createMany
      await prisma.question.delete({ where: { id: result1.id } });
      console.log('🗑️  Questão removida para próximo teste');
      
    } catch (error) {
      console.error(`❌ Erro no create individual: ${error.message}`);
      
      // Vamos tentar identificar que campo está causando problema
      console.log('\n🔍 Analisando campos problemáticos...');
      
      const normalized = normalizeQuestion(testQuestion);
      const problematicFields = [];
      
      // Verificar campos que podem estar vazios ou nulos
      Object.entries(normalized).forEach(([key, value]) => {
        if (value === null || value === undefined || 
            (typeof value === 'string' && value.trim() === '') ||
            (Array.isArray(value) && value.length === 0)) {
          problematicFields.push(`${key}: ${JSON.stringify(value)}`);
        }
      });
      
      console.log('⚠️  Campos vazios/nulos:');
      problematicFields.forEach(field => console.log(`   - ${field}`));
      
      return;
    }
    
    // 3. Testar createMany com as mesmas questões
    console.log(`\n🧪 TESTE 2: createMany() com ${Math.min(5, newQuestions.length)} questões`);
    
    const testBatch = newQuestions.slice(0, 5);
    const normalizedBatch = testBatch.map(normalizeQuestion);
    
    try {
      const result2 = await prisma.question.createMany({
        data: normalizedBatch,
        skipDuplicates: true
      });
      
      console.log(`✅ createMany result: ${JSON.stringify(result2)}`);
      console.log(`📊 Count retornado: ${result2.count}`);
      
      // Verificar se realmente foram inseridas
      const inserted = await prisma.question.findMany({
        where: {
          questaoId: { in: normalizedBatch.map(q => q.questaoId) }
        },
        select: { questaoId: true }
      });
      
      console.log(`🔍 Questões encontradas após createMany: ${inserted.length}`);
      
      if (result2.count !== inserted.length) {
        console.warn(`⚠️  DISCREPÂNCIA: createMany reportou ${result2.count}, mas ${inserted.length} foram realmente inseridas`);
      }
      
    } catch (error) {
      console.error(`❌ Erro no createMany: ${error.message}`);
      console.error('Stack:', error.stack);
    }
    
    // 4. Verificar estado do banco
    const finalCount = await prisma.question.count();
    console.log(`\n📊 Total final no banco: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testSingleInsert().catch(console.error);
}

export { testSingleInsert };
