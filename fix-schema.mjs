#!/usr/bin/env node
/**
 * Script para corrigir problemas de schema e duplicatas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicatesCodigoReal() {
  console.log('🔍 Verificando duplicatas no campo codigoReal...');
  
  try {
    const duplicates = await prisma.$queryRaw`
      SELECT "codigoReal", COUNT(*) as count 
      FROM questions 
      GROUP BY "codigoReal" 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;
    
    console.log(`📊 Encontradas ${duplicates.length} valores duplicados em codigoReal`);
    
    if (duplicates.length > 0) {
      console.log('Primeiros 10 códigos duplicados:');
      duplicates.slice(0, 10).forEach(dup => {
        console.log(`  - ${dup.codigoReal}: ${dup.count} ocorrências`);
      });
    }
    
    return duplicates.length;
    
  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error.message);
    return 0;
  }
}

async function checkDuplicatesQuestaoId() {
  console.log('🔍 Verificando duplicatas no campo questaoId...');
  
  try {
    const duplicates = await prisma.$queryRaw`
      SELECT "questaoId", COUNT(*) as count 
      FROM questions 
      GROUP BY "questaoId" 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;
    
    console.log(`📊 Encontradas ${duplicates.length} valores duplicados em questaoId`);
    
    if (duplicates.length > 0) {
      console.log('Primeiros 10 IDs duplicados:');
      duplicates.slice(0, 10).forEach(dup => {
        console.log(`  - ${dup.questaoId}: ${dup.count} ocorrências`);
      });
    }
    
    return duplicates.length;
    
  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error.message);
    return 0;
  }
}

async function removeCodigoRealConstraint() {
  console.log('🔧 Removendo constraint de unicidade do codigoReal...');
  
  try {
    // Verificar se existe a constraint
    const constraints = await prisma.$queryRaw`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'questions' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%codigoReal%'
    `;
    
    if (constraints.length > 0) {
      console.log(`Encontradas ${constraints.length} constraints relacionadas ao codigoReal`);
      
      for (const constraint of constraints) {
        console.log(`Removendo constraint: ${constraint.constraint_name}`);
        await prisma.$executeRaw`
          ALTER TABLE questions DROP CONSTRAINT ${constraint.constraint_name}
        `;
      }
      
      console.log('✅ Constraints removidas com sucesso');
    } else {
      console.log('ℹ️  Nenhuma constraint encontrada para codigoReal');
    }
    
  } catch (error) {
    console.error('Erro ao remover constraint:', error.message);
  }
}

async function cleanDuplicatesByQuestaoId() {
  console.log('🧹 Removendo duplicatas baseado em questaoId...');
  
  try {
    const duplicates = await prisma.$queryRaw`
      SELECT "questaoId", COUNT(*) as count 
      FROM questions 
      GROUP BY "questaoId" 
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada');
      return 0;
    }
    
    let totalRemoved = 0;
    
    for (const duplicate of duplicates) {
      const questaoId = duplicate.questaoId;
      
      // Buscar todos os registros duplicados
      const records = await prisma.question.findMany({
        where: { questaoId },
        orderBy: { createdAt: 'desc' }
      });
      
      // Manter apenas o primeiro (mais recente)
      const toDelete = records.slice(1);
      
      for (const record of toDelete) {
        await prisma.question.delete({
          where: { id: record.id }
        });
        totalRemoved++;
      }
      
      console.log(`🗑️  questaoId ${questaoId}: removidas ${toDelete.length} duplicatas`);
    }
    
    console.log(`✅ Total removidas: ${totalRemoved} duplicatas`);
    return totalRemoved;
    
  } catch (error) {
    console.error('Erro ao limpar duplicatas:', error.message);
    return 0;
  }
}

async function main() {
  console.log('🔧 Iniciando correção de schema e limpeza de duplicatas');
  console.log('=' .repeat(60));
  
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados\n');
    
    // 1. Verificar duplicatas atuais
    await checkDuplicatesQuestaoId();
    await checkDuplicatesCodigoReal();
    
    console.log('\n' + '-'.repeat(40));
    
    // 2. Remover constraint de unicidade do codigoReal se existir
    await removeCodigoRealConstraint();
    
    console.log('\n' + '-'.repeat(40));
    
    // 3. Limpar duplicatas baseado em questaoId
    await cleanDuplicatesByQuestaoId();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Correção concluída!');
    
    // Verificar estado final
    console.log('\n📊 Estado final:');
    const totalQuestions = await prisma.question.count();
    console.log(`Total de questões: ${totalQuestions.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { main as fixSchema };
