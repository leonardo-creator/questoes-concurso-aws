#!/usr/bin/env node
/**
 * Script para testes rápidos do sistema com dados reais
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  try {
    console.log('🧪 Executando testes do sistema...\n');
    
    // 1. Verificar total de questões
    const totalQuestoes = await prisma.$queryRaw`SELECT COUNT(*) as count FROM questions`;
    console.log(`📊 Total de questões: ${Number(totalQuestoes[0].count).toLocaleString()}`);
    
    // 2. Testar API de disciplinas
    console.log('\n🔍 Testando filtros de disciplinas...');
    const disciplinas = await prisma.$queryRaw`
      SELECT disciplina as nome, COUNT(*) as count 
      FROM questions 
      WHERE disciplina IS NOT NULL 
      GROUP BY disciplina 
      ORDER BY count DESC 
      LIMIT 10
    `;
    
    console.log('Top 10 disciplinas:');
    disciplinas.forEach(d => {
      console.log(`   • ${d.nome}: ${Number(d.count).toLocaleString()} questões`);
    });
    
    // 3. Testar API de bancas
    console.log('\n🏛️ Testando filtros de bancas...');
    const bancas = await prisma.$queryRaw`
      SELECT banca as nome, COUNT(*) as count 
      FROM questions 
      WHERE banca IS NOT NULL 
      GROUP BY banca 
      ORDER BY count DESC 
      LIMIT 5
    `;
    
    console.log('Top 5 bancas:');
    bancas.forEach(b => {
      console.log(`   • ${b.nome}: ${Number(b.count).toLocaleString()} questões`);
    });
    
    // 4. Testar API de anos
    console.log('\n📅 Testando filtros de anos...');
    const anos = await prisma.$queryRaw`
      SELECT ano::text as nome, COUNT(*) as count 
      FROM questions 
      WHERE ano IS NOT NULL 
      GROUP BY ano 
      ORDER BY ano DESC 
      LIMIT 5
    `;
    
    console.log('Anos mais recentes:');
    anos.forEach(a => {
      console.log(`   • ${a.nome}: ${Number(a.count).toLocaleString()} questões`);
    });
    
    // 5. Teste de busca textual
    console.log('\n🔍 Testando busca textual...');
    const busca = await prisma.$queryRaw`
      SELECT enunciado, disciplina, banca 
      FROM questions 
      WHERE enunciado ILIKE '%constituição%' 
      LIMIT 3
    `;
    
    console.log(`Encontradas ${busca.length} questões sobre "constituição"`);
    
    console.log('\n✅ Todos os testes executados com sucesso!');
    console.log('🚀 Sistema pronto para uso em http://localhost:3000/estudar');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
