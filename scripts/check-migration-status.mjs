#!/usr/bin/env node
/**
 * Script para verificar o status da migração
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMigrationStatus() {
  try {
    console.log('📊 Verificando status da migração...\n');
    
    // Estatísticas básicas
    const [totalQuestions, stats] = await Promise.all([
      prisma.question.count(),
      prisma.question.groupBy({
        by: ['bancasSigla'],
        _count: { bancasSigla: true },
        orderBy: { _count: { bancasSigla: 'desc' } },
        take: 5
      })
    ]);
    
    console.log(`✅ Total de questões migradas: ${totalQuestions.toLocaleString()}`);
    
    // Top 5 bancas
    console.log('\n🏢 Top 5 bancas migradas:');
    stats.forEach((banca, index) => {
      console.log(`${index + 1}. ${banca.bancasSigla}: ${banca._count.bancasSigla.toLocaleString()} questões`);
    });
    
    // Amostras de questões
    const samples = await prisma.question.findMany({
      take: 3,
      select: {
        questaoId: true,
        codigoReal: true,
        disciplinaReal: true,
        bancasSigla: true,
        anos: true,
        tipo: true
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log('\n📝 Últimas questões migradas:');
    samples.forEach((questao, index) => {
      console.log(`${index + 1}. ID: ${questao.questaoId} | ${questao.disciplinaReal} | ${questao.bancasSigla} (${questao.anos}) | Tipo: ${questao.tipo}`);
    });
    
    // Estimativa do progresso (baseada em ~3.2M questões nos chunks)
    const estimatedTotal = 3200000;
    const progress = (totalQuestions / estimatedTotal * 100).toFixed(1);
    console.log(`\n📈 Progresso estimado: ${progress}% (${totalQuestions.toLocaleString()}/${estimatedTotal.toLocaleString()})`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrationStatus();
