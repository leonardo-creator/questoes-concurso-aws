#!/usr/bin/env node
/**
 * Utilitários para gerenciamento do banco de dados
 * 
 * Scripts auxiliares para limpeza, verificação e manutenção do banco
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Remove todas as questões duplicadas baseadas no questaoId
 */
async function removeDuplicates() {
  console.log('🧹 Iniciando remoção de duplicatas...');
  
  try {
    // Encontrar duplicatas
    const duplicates = await prisma.$queryRaw`
      SELECT "questaoId", COUNT(*) as count 
      FROM questions 
      GROUP BY "questaoId" 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada');
      return;
    }
    
    console.log(`📊 Encontradas ${duplicates.length} questões com duplicatas`);
    
    let totalRemoved = 0;
    
    for (const duplicate of duplicates) {
      const questaoId = duplicate.questaoId;
      const count = Number(duplicate.count);
      
      console.log(`🔍 Processando questão ${questaoId} (${count} duplicatas)...`);
      
      // Buscar todos os registros duplicados
      const records = await prisma.question.findMany({
        where: { questaoId },
        orderBy: [
          { createdAt: 'desc' }, // Manter o mais recente
          { id: 'asc' } // Critério de desempate
        ]
      });
      
      // Manter apenas o primeiro (mais recente)
      const recordsToDelete = records.slice(1);
      
      // Deletar os duplicados
      for (const record of recordsToDelete) {
        await prisma.question.delete({
          where: { id: record.id }
        });
        totalRemoved++;
      }
      
      console.log(`   ✅ Removidas ${recordsToDelete.length} duplicatas`);
    }
    
    console.log(`🎉 Remoção concluída! Total removido: ${totalRemoved} registros`);
    
  } catch (error) {
    console.error('❌ Erro ao remover duplicatas:', error);
  }
}

/**
 * Limpa completamente a tabela de questões
 */
async function clearAllQuestions() {
  console.log('⚠️  ATENÇÃO: Esta operação irá remover TODAS as questões!');
  console.log('   Esta ação é irreversível.');
  
  try {
    const count = await prisma.question.count();
    console.log(`📊 Total de questões a serem removidas: ${count.toLocaleString()}`);
    
    if (count === 0) {
      console.log('✅ Tabela já está vazia');
      return;
    }
    
    // Confirmar operação
    if (!process.argv.includes('--force')) {
      console.log('\n💡 Para confirmar, execute novamente com --force');
      return;
    }
    
    console.log('🗑️  Removendo todas as questões...');
    const result = await prisma.question.deleteMany({});
    
    console.log(`✅ ${result.count.toLocaleString()} questões removidas com sucesso`);
    
    // Resetar estatísticas
    await prisma.questionStats.deleteMany({});
    console.log('📊 Estatísticas resetadas');
    
  } catch (error) {
    console.error('❌ Erro ao limpar questões:', error);
  }
}

/**
 * Exibe estatísticas detalhadas do banco
 */
async function showStats() {
  console.log('📊 Coletando estatísticas do banco...\n');
  
  try {
    const [
      totalQuestoes,
      duplicateStats,
      bancasStats,
      anosStats,
      dificuldadeStats,
      tipoStats
    ] = await Promise.all([
      prisma.question.count(),
      
      // Verificar duplicatas
      prisma.$queryRaw`
        SELECT COUNT(*) as duplicates
        FROM (
          SELECT "questaoId"
          FROM questions 
          GROUP BY "questaoId" 
          HAVING COUNT(*) > 1
        ) as dups
      `,
      
      // Top bancas
      prisma.question.groupBy({
        by: ['bancasSigla'],
        _count: { bancasSigla: true },
        orderBy: { _count: { bancasSigla: 'desc' } },
        take: 10
      }),
      
      // Anos disponíveis
      prisma.question.groupBy({
        by: ['anos'],
        _count: { anos: true },
        orderBy: { anos: 'desc' },
        take: 10
      }),
      
      // Distribuição por dificuldade
      prisma.question.groupBy({
        by: ['dificuldade'],
        _count: { dificuldade: true },
        orderBy: { dificuldade: 'asc' }
      }),
      
      // Tipos de questão
      prisma.question.groupBy({
        by: ['tipo'],
        _count: { tipo: true },
        orderBy: { _count: { tipo: 'desc' } }
      })
    ]);
    
    console.log('=' .repeat(60));
    console.log('📈 ESTATÍSTICAS GERAIS');
    console.log('=' .repeat(60));
    console.log(`Total de questões: ${totalQuestoes.toLocaleString()}`);
    console.log(`Duplicatas encontradas: ${Number(duplicateStats[0]?.duplicates || 0)}`);
    
    console.log('\n📚 TOP 10 BANCAS:');
    bancasStats.forEach((banca, index) => {
      const sigla = banca.bancasSigla || 'Não informado';
      const count = banca._count.bancasSigla;
      console.log(`  ${index + 1}. ${sigla}: ${count.toLocaleString()} questões`);
    });
    
    console.log('\n📅 QUESTÕES POR ANO (últimos 10):');
    anosStats.forEach((ano, index) => {
      console.log(`  ${index + 1}. ${ano.anos}: ${ano._count.anos.toLocaleString()} questões`);
    });
    
    console.log('\n⭐ DISTRIBUIÇÃO POR DIFICULDADE:');
    dificuldadeStats.forEach((diff) => {
      const nivel = diff.dificuldade;
      const descricao = ['', 'Muito Fácil', 'Fácil', 'Médio', 'Difícil', 'Muito Difícil'][nivel] || `Nível ${nivel}`;
      console.log(`  ${descricao}: ${diff._count.dificuldade.toLocaleString()} questões`);
    });
    
    console.log('\n📝 TIPOS DE QUESTÃO:');
    tipoStats.forEach((tipo) => {
      const tipoNome = tipo.tipo || 'Não informado';
      console.log(`  ${tipoNome}: ${tipo._count.tipo.toLocaleString()} questões`);
    });
    
    console.log('\n' + '=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Erro ao coletar estatísticas:', error);
  }
}

/**
 * Verifica a integridade dos dados
 */
async function verifyIntegrity() {
  console.log('🔍 Verificando integridade dos dados...\n');
  
  try {
    // Verificar campos obrigatórios vazios
    const emptyFields = await Promise.all([
      prisma.question.count({ where: { questaoId: null } }),
      prisma.question.count({ where: { codigoReal: '' } }),
      prisma.question.count({ where: { enunciado: '' } }),
      prisma.question.count({ where: { resposta: '' } })
    ]);
    
    console.log('📋 CAMPOS OBRIGATÓRIOS:');
    console.log(`  questaoId nulos: ${emptyFields[0]}`);
    console.log(`  codigoReal vazios: ${emptyFields[1]}`);
    console.log(`  enunciado vazios: ${emptyFields[2]}`);
    console.log(`  resposta vazias: ${emptyFields[3]}`);
    
    // Verificar questões com itens malformados
    const questionsWithBadItens = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM questions 
      WHERE itens::text = '[]' OR itens IS NULL
    `;
    
    console.log(`  itens vazios/nulos: ${Number(questionsWithBadItens[0]?.count || 0)}`);
    
    // Verificar unicidade de questaoId
    const duplicateQuestaoIds = await prisma.$queryRaw`
      SELECT "questaoId", COUNT(*) as count
      FROM questions 
      GROUP BY "questaoId" 
      HAVING COUNT(*) > 1
      LIMIT 5
    `;
    
    if (duplicateQuestaoIds.length > 0) {
      console.log('\n⚠️  QUESTÕES DUPLICADAS (primeiras 5):');
      duplicateQuestaoIds.forEach(dup => {
        console.log(`  questaoId ${dup.questaoId}: ${dup.count} registros`);
      });
    } else {
      console.log('\n✅ Nenhuma duplicata de questaoId encontrada');
    }
    
    // Verificar unicidade de codigoReal
    const duplicateCodigoReal = await prisma.$queryRaw`
      SELECT "codigoReal", COUNT(*) as count
      FROM questions 
      WHERE "codigoReal" != ''
      GROUP BY "codigoReal" 
      HAVING COUNT(*) > 1
      LIMIT 5
    `;
    
    if (duplicateCodigoReal.length > 0) {
      console.log('\n⚠️  CÓDIGOS REAIS DUPLICADOS (primeiros 5):');
      duplicateCodigoReal.forEach(dup => {
        console.log(`  codigoReal ${dup.codigoReal}: ${dup.count} registros`);
      });
    } else {
      console.log('\n✅ Nenhuma duplicata de codigoReal encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar integridade:', error);
  }
}

/**
 * Função principal
 */
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log(`
🛠️  Utilitários do Banco de Dados

Comandos disponíveis:
  stats           - Exibir estatísticas detalhadas
  duplicates      - Remover questões duplicadas
  clear           - Limpar todas as questões (use --force para confirmar)
  integrity       - Verificar integridade dos dados
  
Exemplos:
  node db-utils.mjs stats
  node db-utils.mjs duplicates
  node db-utils.mjs clear --force
  node db-utils.mjs integrity
`);
    return;
  }
  
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados\n');
    
    switch (command) {
      case 'stats':
        await showStats();
        break;
      case 'duplicates':
        await removeDuplicates();
        break;
      case 'clear':
        await clearAllQuestions();
        break;
      case 'integrity':
        await verifyIntegrity();
        break;
      default:
        console.log(`❌ Comando desconhecido: ${command}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Conexão encerrada');
  }
}

main().catch(console.error);
