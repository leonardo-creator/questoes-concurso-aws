#!/usr/bin/env node
/**
 * Script para demonstrar como funciona a verificação de duplicatas
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const CHUNKS_DIR = path.join(__dirname, 'chunks');

async function demonstrateDuplicateCheck() {
  console.log('🔍 Demonstração: Como o script verifica duplicatas\n');
  
  try {
    await prisma.$connect();
    
    // 1. Ler um arquivo JSON pequeno como exemplo
    const files = await fs.readdir(CHUNKS_DIR);
    const firstChunk = files.find(f => f.startsWith('batch_') && f.endsWith('.json'));
    
    if (!firstChunk) {
      console.log('❌ Nenhum arquivo chunk encontrado');
      return;
    }
    
    console.log(`📂 Analisando arquivo: ${firstChunk}`);
    
    const content = await fs.readFile(path.join(CHUNKS_DIR, firstChunk), 'utf8');
    const questions = JSON.parse(content);
    
    console.log(`📊 Total de questões no arquivo: ${questions.length}`);
    
    // 2. Pegar os primeiros 10 IDs como exemplo
    const exampleIds = questions.slice(0, 10).map(q => q.id);
    console.log(`\n🎯 Exemplo: Verificando os primeiros 10 IDs:`);
    exampleIds.forEach((id, index) => {
      console.log(`  ${index + 1}. ID: ${id}`);
    });
    
    // 3. Verificar no banco quais já existem
    console.log(`\n🔍 Verificando no banco de dados...`);
    
    const existing = await prisma.question.findMany({
      where: {
        questaoId: {
          in: exampleIds
        }
      },
      select: { 
        questaoId: true,
        bancasSigla: true,
        disciplinaReal: true
      }
    });
    
    console.log(`\n📊 Resultado da verificação:`);
    console.log(`  - IDs verificados: ${exampleIds.length}`);
    console.log(`  - Já existem no banco: ${existing.length}`);
    console.log(`  - Seriam inseridos: ${exampleIds.length - existing.length}`);
    
    if (existing.length > 0) {
      console.log(`\n✅ Questões que JÁ EXISTEM no banco:`);
      existing.forEach((q, index) => {
        console.log(`  ${index + 1}. ID: ${q.questaoId} | ${q.bancasSigla} | ${q.disciplinaReal}`);
      });
    }
    
    const newIds = exampleIds.filter(id => !existing.some(e => e.questaoId === id));
    if (newIds.length > 0) {
      console.log(`\n🆕 Questões que seriam INSERIDAS:`);
      newIds.forEach((id, index) => {
        console.log(`  ${index + 1}. ID: ${id}`);
      });
    }
    
    // 4. Demonstrar detecção de duplicatas dentro do arquivo
    console.log(`\n🔍 Verificando duplicatas dentro do próprio arquivo...`);
    const allIds = questions.map(q => q.id);
    const uniqueIds = new Set(allIds);
    
    console.log(`📊 Análise do arquivo:`);
    console.log(`  - Total de questões: ${questions.length}`);
    console.log(`  - IDs únicos: ${uniqueIds.size}`);
    console.log(`  - Duplicatas no arquivo: ${questions.length - uniqueIds.size}`);
    
    if (questions.length > uniqueIds.size) {
      console.log(`\n⚠️  Encontradas duplicatas dentro do arquivo!`);
      
      // Encontrar quais IDs estão duplicados
      const idCounts = {};
      allIds.forEach(id => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      
      const duplicatedIds = Object.entries(idCounts)
        .filter(([id, count]) => count > 1)
        .slice(0, 5); // Mostrar apenas os primeiros 5
      
      console.log(`🔍 Exemplos de IDs duplicados:`);
      duplicatedIds.forEach(([id, count]) => {
        console.log(`  - ID ${id}: ${count} ocorrências`);
      });
    }
    
    console.log(`\n💡 RESUMO - Como funciona a verificação:`);
    console.log(`1. 📄 Ler arquivo JSON`);
    console.log(`2. 🧹 Remover duplicatas dentro do arquivo (baseado no campo 'id')`);
    console.log(`3. 🔍 Consultar banco para ver quais 'questaoId' já existem`);
    console.log(`4. ✅ Inserir apenas as questões novas`);
    console.log(`5. 📊 Campo usado: JSON.id → banco.questaoId`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  demonstrateDuplicateCheck().catch(console.error);
}

export { demonstrateDuplicateCheck };
