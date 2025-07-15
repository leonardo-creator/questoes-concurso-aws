#!/usr/bin/env node
/**
 * Script para diagnosticar problemas na migração
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const CHUNKS_DIR = path.join(__dirname, 'chunks');

/**
 * Função para normalizar questão (mesma do script de migração)
 */
function normalizeQuestion(questao) {
  return {
    questaoId: questao.id,
    dificuldade: questao.dificuldade || 1,
    bancasNome: questao.bancas_nome || '',
    bancasDescricao: questao.bancas_descricao || '',
    bancasSigla: questao.bancas_sigla || '',
    bancasOab: questao.bancas_oab || false,
    cargosDescricao: questao.cargos_descricao || '',
    orgaosNome: questao.orgaos_nome || '',
    orgaosSigla: questao.orgaos_sigla || '',
    orgaosUf: questao.orgaos_uf || '',
    anos: questao.anos || new Date().getFullYear(),
    tipo: questao.tipo || '',
    grupoQuestaoEnunciado: questao.grupoQuestao_enunciado || '',
    enunciado: questao.enunciado || '',
    hasImage: questao.hasImage === 'True',
    hasImageItens: questao.hasImageItens === 'True',
    provasNivel: questao.provas_nivel || '',
    areasDescricao: questao.areas_descricao,
    itens: questao.itens || [],
    resposta: questao.resposta || '',
    assuntosPalavrasChave: questao.assuntos_palavrasChave || [],
    codigoReal: questao.codigo_real || '',
    disciplinaReal: questao.disciplina_real || '',
    assuntoReal: questao.assunto_real || '',
    anulada: questao.anulada === 'True',
    desatualizada: questao.desatualizada === 'True'
  };
}

async function investigateMigrationIssues() {
  console.log('🔍 INVESTIGAÇÃO: Por que ainda há questões para inserir?\n');
  
  try {
    await prisma.$connect();
    
    // 1. Analisar o primeiro arquivo que estava sendo processado
    const filePath = path.join(CHUNKS_DIR, 'batch_001.json');
    const content = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(content);
    
    console.log(`📂 Analisando batch_001.json`);
    console.log(`📊 Total de questões no arquivo: ${questions.length}`);
    
    // 2. Remover duplicatas como o script faz
    const seen = new Set();
    const unique = [];
    
    for (const question of questions) {
      const id = question.id;
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(question);
      }
    }
    
    console.log(`🧹 Após remover duplicatas: ${unique.length} questões únicas`);
    console.log(`🔍 Duplicatas removidas: ${questions.length - unique.length}`);
    
    // 3. Normalizar todas as questões
    const normalized = unique.map(normalizeQuestion);
    const allIds = normalized.map(q => q.questaoId);
    
    console.log(`📋 IDs para verificar: ${allIds.length}`);
    
    // 4. Verificar em pequenos lotes para evitar problemas de performance
    const BATCH_SIZE = 1000;
    let totalInDatabase = 0;
    let problematicIds = [];
    
    console.log(`\n🔍 Verificando existência no banco em lotes de ${BATCH_SIZE}...`);
    
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batchIds = allIds.slice(i, i + BATCH_SIZE);
      
      try {
        const existing = await prisma.question.findMany({
          where: {
            questaoId: {
              in: batchIds
            }
          },
          select: { questaoId: true }
        });
        
        const existingSet = new Set(existing.map(q => q.questaoId));
        totalInDatabase += existing.length;
        
        // Encontrar IDs que deveriam existir mas não estão sendo encontrados
        const notFound = batchIds.filter(id => !existingSet.has(id));
        if (notFound.length > 0) {
          problematicIds.push(...notFound.slice(0, 10)); // Pegar apenas os primeiros 10 para análise
        }
        
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        console.log(`  Lote ${batchNum}: ${existing.length}/${batchIds.length} encontradas`);
        
      } catch (error) {
        console.error(`❌ Erro no lote ${i}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 RESULTADO DA INVESTIGAÇÃO:`);
    console.log(`  - Questões no arquivo: ${questions.length}`);
    console.log(`  - Questões únicas: ${unique.length}`);
    console.log(`  - Questões encontradas no banco: ${totalInDatabase}`);
    console.log(`  - Questões que DEVERIAM ser inseridas: ${unique.length - totalInDatabase}`);
    
    // 5. Investigar alguns IDs problemáticos
    if (problematicIds.length > 0) {
      console.log(`\n🔍 INVESTIGANDO IDs PROBLEMÁTICOS (primeiros 5):`);
      
      for (let i = 0; i < Math.min(5, problematicIds.length); i++) {
        const id = problematicIds[i];
        
        console.log(`\n🎯 ID: ${id}`);
        
        // Buscar no banco com diferentes métodos
        const methods = [
          { name: 'questaoId direto', query: { questaoId: id } },
          { name: 'questaoId como string', query: { questaoId: String(id) } },
          { name: 'questaoId como number', query: { questaoId: Number(id) } }
        ];
        
        for (const method of methods) {
          try {
            const result = await prisma.question.findFirst({
              where: method.query,
              select: { questaoId: true, id: true }
            });
            
            if (result) {
              console.log(`  ✅ ${method.name}: Encontrado (questaoId: ${result.questaoId}, id: ${result.id})`);
            } else {
              console.log(`  ❌ ${method.name}: NÃO encontrado`);
            }
          } catch (error) {
            console.log(`  ⚠️  ${method.name}: Erro - ${error.message}`);
          }
        }
        
        // Verificar se o JSON tem algum problema
        const originalQuestion = questions.find(q => q.id === id);
        if (originalQuestion) {
          console.log(`  📄 JSON original:`);
          console.log(`    - id: ${originalQuestion.id} (tipo: ${typeof originalQuestion.id})`);
          console.log(`    - bancas_sigla: "${originalQuestion.bancas_sigla}"`);
          console.log(`    - disciplina_real: "${originalQuestion.disciplina_real}"`);
        }
      }
    }
    
    // 6. Verificar se há problemas com tipos de dados
    console.log(`\n🔍 VERIFICANDO TIPOS DE DADOS:`);
    const sampleQuestion = normalized[0];
    console.log(`Questão de exemplo (normalizada):`);
    console.log(`  - questaoId: ${sampleQuestion.questaoId} (tipo: ${typeof sampleQuestion.questaoId})`);
    console.log(`  - bancasSigla: "${sampleQuestion.bancasSigla}"`);
    console.log(`  - disciplinaReal: "${sampleQuestion.disciplinaReal}"`);
    
    // 7. Contar total real no banco
    const totalInDb = await prisma.question.count();
    console.log(`\n📊 TOTAL ATUAL NO BANCO: ${totalInDb.toLocaleString()} questões`);
    
    // 8. Verificar se há duplicatas no banco
    const duplicatesInDb = await prisma.$queryRaw`
      SELECT "questaoId", COUNT(*) as count 
      FROM questions 
      GROUP BY "questaoId" 
      HAVING COUNT(*) > 1
      LIMIT 5
    `;
    
    if (duplicatesInDb.length > 0) {
      console.log(`\n⚠️  DUPLICATAS NO BANCO ENCONTRADAS:`);
      duplicatesInDb.forEach(dup => {
        console.log(`  - questaoId ${dup.questaoId}: ${dup.count} ocorrências`);
      });
    } else {
      console.log(`\n✅ Nenhuma duplicata encontrada no banco`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante investigação:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  investigateMigrationIssues().catch(console.error);
}

export { investigateMigrationIssues };
