#!/usr/bin/env node
/**
 * Script para remover FORÇADAMENTE a constraint única do codigoReal
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceRemoveConstraint() {
  console.log('🔧 FORÇANDO remoção da constraint única do codigoReal...\n');
  
  try {
    await prisma.$connect();
    
    // 1. Listar TODAS as constraints da tabela questions
    console.log('1️⃣ Listando TODAS as constraints da tabela questions...');
    const allConstraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'questions'
      ORDER BY tc.constraint_type, tc.constraint_name
    `;
    
    console.log(`📊 Total de constraints: ${allConstraints.length}`);
    allConstraints.forEach((c, index) => {
      console.log(`  ${index + 1}. ${c.constraint_type}: ${c.constraint_name} (${c.column_name || 'N/A'})`);
    });
    
    // 2. Encontrar constraints relacionadas ao codigoReal
    const codigoRealConstraints = allConstraints.filter(c => 
      c.column_name === 'codigoReal' || 
      c.constraint_name.toLowerCase().includes('codigoreal') ||
      c.constraint_name.toLowerCase().includes('codigo_real')
    );
    
    console.log(`\n2️⃣ Constraints relacionadas ao codigoReal: ${codigoRealConstraints.length}`);
    codigoRealConstraints.forEach((c, index) => {
      console.log(`  ${index + 1}. ${c.constraint_type}: ${c.constraint_name}`);
    });
    
    // 3. Remover cada constraint relacionada
    for (const constraint of codigoRealConstraints) {
      console.log(`\n3️⃣ Removendo constraint: ${constraint.constraint_name}`);
      
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE questions DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"
        `);
        console.log(`✅ Constraint ${constraint.constraint_name} removida`);
      } catch (error) {
        console.error(`❌ Erro ao remover ${constraint.constraint_name}:`, error.message);
      }
    }
    
    // 4. Tentar remover constraints comuns que podem existir
    const commonConstraintNames = [
      'questions_codigoReal_key',
      'questions_codigo_real_key', 
      'Question_codigoReal_key',
      'Question_codigo_real_key'
    ];
    
    console.log(`\n4️⃣ Tentando remover constraints comuns...`);
    for (const constraintName of commonConstraintNames) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE questions DROP CONSTRAINT IF EXISTS "${constraintName}"
        `);
        console.log(`✅ Tentativa de remover ${constraintName}: OK`);
      } catch (error) {
        console.log(`ℹ️  ${constraintName}: não existe ou já removida`);
      }
    }
    
    // 5. Verificar estado final
    console.log(`\n5️⃣ Verificando estado final...`);
    const finalConstraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'questions' 
        AND (kcu.column_name = 'codigoReal' OR tc.constraint_name ILIKE '%codigoreal%')
    `;
    
    console.log(`📊 Constraints restantes para codigoReal: ${finalConstraints.length}`);
    finalConstraints.forEach(c => {
      console.log(`   - ${c.constraint_type}: ${c.constraint_name}`);
    });
    
    if (finalConstraints.length === 0) {
      console.log('\n🎉 SUCESSO! Todas as constraints do codigoReal foram removidas!');
      console.log('✅ O campo codigoReal agora pode ter valores duplicados e nulos');
    } else {
      console.log('\n⚠️  Ainda existem constraints para codigoReal');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  forceRemoveConstraint().catch(console.error);
}

export { forceRemoveConstraint };
