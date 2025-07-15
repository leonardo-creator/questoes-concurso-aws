#!/usr/bin/env node
/**
 * Script para remover constraint de unicidade do codigoReal
 */

import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

async function removeCodigoRealConstraint() {
  console.log('🔧 Removendo constraint de unicidade do codigoReal...\n');
  
  try {
    await prisma.$connect();
    
    // 1. Verificar constraints existentes
    console.log('1️⃣ Verificando constraints existentes...');
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
        AND tc.constraint_type = 'UNIQUE'
    `;
    
    console.log(`📊 Constraints UNIQUE encontradas para codigoReal: ${constraints.length}`);
    
    if (constraints.length === 0) {
      console.log('✅ Nenhuma constraint UNIQUE encontrada para codigoReal');
      console.log('ℹ️  O campo já está configurado corretamente');
      return;
    }
    
    // 2. Remover cada constraint encontrada
    for (const constraint of constraints) {
      console.log(`\n2️⃣ Removendo constraint: ${constraint.constraint_name}`);
      
      try {
        await prisma.$executeRaw`
          ALTER TABLE questions DROP CONSTRAINT ${constraint.constraint_name}
        `;
        console.log(`✅ Constraint ${constraint.constraint_name} removida com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao remover constraint ${constraint.constraint_name}:`, error.message);
      }
    }
    
    // 3. Verificar se há registros com codigoReal vazio
    console.log('\n3️⃣ Verificando registros com codigoReal vazio...');
    const emptyCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM questions 
      WHERE "codigoReal" = '' OR "codigoReal" IS NULL
    `;
    
    console.log(`📊 Registros com codigoReal vazio/null: ${emptyCount[0].count}`);
    
    // 4. Verificar duplicatas
    console.log('\n4️⃣ Verificando duplicatas de codigoReal...');
    const duplicates = await prisma.$queryRaw`
      SELECT "codigoReal", COUNT(*) as count 
      FROM questions 
      WHERE "codigoReal" IS NOT NULL AND "codigoReal" != ''
      GROUP BY "codigoReal" 
      HAVING COUNT(*) > 1 
      ORDER BY count DESC 
      LIMIT 5
    `;
    
    console.log(`📊 Códigos duplicados encontrados: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log('🔍 Top 5 códigos duplicados:');
      duplicates.forEach((dup, index) => {
        console.log(`  ${index + 1}. "${dup.codigoReal}": ${dup.count} ocorrências`);
      });
    }
    
    console.log('\n✅ Operação concluída!');
    console.log('💡 O campo codigoReal agora pode ter valores duplicados e vazios');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  removeCodigoRealConstraint().catch(console.error);
}

export { removeCodigoRealConstraint };
