#!/usr/bin/env node
/**
 * Script para investigar problemas com codigoReal
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const CHUNKS_DIR = path.join(__dirname, 'chunks');

async function investigateCodigoReal() {
  console.log('🔍 Investigando problemas com codigoReal\n');
  
  try {
    await prisma.$connect();
    
    // 1. Verificar codigoReal vazios no banco
    console.log('1️⃣ Verificando codigoReal vazios no banco...');
    try {
      const emptyCodigoReal = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM questions 
        WHERE "codigoReal" = '' OR "codigoReal" IS NULL
      `;
      console.log(`   📊 Registros com codigoReal vazio/null: ${emptyCodigoReal[0].count}`);
    } catch (error) {
      console.log(`   ⚠️  Erro ao verificar vazios: ${error.message}`);
    }
    
    // 2. Verificar duplicatas de codigoReal no banco
    console.log('\n2️⃣ Verificando duplicatas de codigoReal no banco...');
    const duplicateCodigoReal = await prisma.$queryRaw`
      SELECT "codigoReal", COUNT(*) as count 
      FROM questions 
      WHERE "codigoReal" IS NOT NULL AND "codigoReal" != ''
      GROUP BY "codigoReal" 
      HAVING COUNT(*) > 1 
      ORDER BY count DESC 
      LIMIT 10
    `;
    
    console.log(`   📊 Códigos duplicados encontrados: ${duplicateCodigoReal.length}`);
    if (duplicateCodigoReal.length > 0) {
      console.log('   🔍 Top 10 códigos duplicados:');
      duplicateCodigoReal.forEach((dup, index) => {
        console.log(`     ${index + 1}. "${dup.codigoReal}": ${dup.count} ocorrências`);
      });
    }
    
    // 3. Verificar codigoReal nos arquivos JSON
    console.log('\n3️⃣ Analisando codigoReal nos arquivos JSON...');
    
    const files = await fs.readdir(CHUNKS_DIR);
    const chunkFiles = files.filter(f => f.startsWith('batch_') && f.endsWith('.json')).slice(0, 3); // Apenas 3 arquivos para teste
    
    let emptyInFiles = 0;
    let totalInFiles = 0;
    const codigoRealSet = new Set();
    const codigoRealCounts = {};
    
    for (const file of chunkFiles) {
      console.log(`   📂 Analisando ${file}...`);
      
      const content = await fs.readFile(path.join(CHUNKS_DIR, file), 'utf8');
      const questions = JSON.parse(content);
      
      questions.forEach(q => {
        totalInFiles++;
        const codigoReal = q.codigo_real || '';
        
        if (!codigoReal || codigoReal.trim() === '') {
          emptyInFiles++;
        } else {
          codigoRealSet.add(codigoReal);
          codigoRealCounts[codigoReal] = (codigoRealCounts[codigoReal] || 0) + 1;
        }
      });
    }
    
    const duplicatesInFiles = Object.entries(codigoRealCounts)
      .filter(([code, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    console.log(`   📊 Análise dos arquivos (${chunkFiles.length} arquivos):`);
    console.log(`     - Total de questões: ${totalInFiles}`);
    console.log(`     - codigoReal vazios: ${emptyInFiles}`);
    console.log(`     - codigoReal únicos: ${codigoRealSet.size}`);
    console.log(`     - codigoReal duplicados: ${duplicatesInFiles.length}`);
    
    if (duplicatesInFiles.length > 0) {
      console.log('   🔍 Top 10 códigos duplicados nos arquivos:');
      duplicatesInFiles.forEach(([code, count], index) => {
        console.log(`     ${index + 1}. "${code}": ${count} ocorrências`);
      });
    }
    
    // 4. Verificar constraint no schema
    console.log('\n4️⃣ Verificando constraints no banco...');
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'questions' 
        AND kcu.column_name = 'codigoReal'
    `;
    
    console.log(`   📊 Constraints encontradas: ${constraints.length}`);
    constraints.forEach((constraint, index) => {
      console.log(`     ${index + 1}. ${constraint.constraint_type}: ${constraint.constraint_name}`);
    });
    
    // 5. Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    
    if (emptyCodigoReal > 0 || duplicateCodigoReal.length > 0) {
      console.log('⚠️  PROBLEMA CONFIRMADO: codigoReal não é único!');
      console.log('🔧 SOLUÇÕES:');
      console.log('   1. Remover constraint @unique do campo codigoReal no schema.prisma');
      console.log('   2. Criar migration para remover a constraint do banco');
      console.log('   3. Usar apenas questaoId como chave única (que já é único)');
    } else {
      console.log('✅ codigoReal parece estar único no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  investigateCodigoReal().catch(console.error);
}

export { investigateCodigoReal };
