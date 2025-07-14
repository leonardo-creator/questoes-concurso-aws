#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQuestions() {
  try {
    // Usar o nome correto da tabela
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM questions`;
    console.log(`📊 Total de questões no banco: ${count[0].count}`);
    
    if (count[0].count === '0') {
      console.log('\n🚨 BANCO VAZIO! Vamos importar as questões...');
      return false;
    } else {
      console.log('\n✅ Banco populado! Questões disponíveis para teste.');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

checkQuestions();
