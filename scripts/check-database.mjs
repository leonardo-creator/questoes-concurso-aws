#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Verificando estado do banco de dados...\n');
    
    // Verificar questões
    const questoesCount = await prisma.question.count();
    console.log(`📝 Questões no banco: ${questoesCount.toLocaleString()}`);
    
    // Verificar usuários
    const usersCount = await prisma.user.count();
    console.log(`👥 Usuários registrados: ${usersCount}`);
    
    // Verificar filtros salvos
    const filtrosCount = await prisma.savedFilter.count();
    console.log(`💾 Filtros salvos: ${filtrosCount}`);
    
    if (questoesCount === 0) {
      console.log('\n⚠️  BANCO VAZIO! Nenhuma questão encontrada.');
      console.log('💡 Execute o script de importação para popular o banco.');
      return false;
    } else {
      console.log('\n✅ Banco de dados populado e funcionando!');
      
      // Mostrar algumas estatísticas
      const disciplinas = await prisma.question.groupBy({
        by: ['disciplina'],
        _count: { disciplina: true },
        orderBy: { _count: { disciplina: 'desc' } },
        take: 5
      });
      
      console.log('\n📊 Top 5 disciplinas:');
      disciplinas.forEach(d => {
        console.log(`   • ${d.disciplina}: ${d._count.disciplina.toLocaleString()} questões`);
      });
      
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
