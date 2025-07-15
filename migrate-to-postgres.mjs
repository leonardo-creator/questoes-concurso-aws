#!/usr/bin/env node
/**
 * Script de migração: JSON chunks → PostgreSQL AWS RDS
 * 
 * Este script migra todas as questões dos arquivos JSON para o banco PostgreSQL,
 * processando em lotes, removendo duplicatas e garantindo integridade dos dados.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Configurações
const BATCH_SIZE = 500; // Reduzir para evitar timeout
const CHUNKS_DIR = path.join(__dirname, 'chunks');
const LOG_INTERVAL = 2000; // Log a cada 2000 questões
const CLEAN_BEFORE_MIGRATION = process.argv.includes('--clean');

/**
 * Normaliza dados da questão para o formato do banco
 */
function normalizeQuestion(questao) {
  return {
    questaoId: questao.id,
    dificuldade: questao.dificuldade || 1,
    bancasNome: questao.bancas_nome || '',
    bancasDescricao: questao.bancas_descricao || '',
    bancasSigla: questao.bancas_sigla || '',
    bancasOab: questao.bancas_oab === true || questao.bancas_oab === 'true',
    cargosDescricao: questao.cargos_descricao || '',
    orgaosNome: questao.orgaos_nome || '',
    orgaosSigla: questao.orgaos_sigla || '',
    orgaosUf: questao.orgaos_uf || '',
    anos: questao.anos || new Date().getFullYear(),
    tipo: questao.tipo || '',
    grupoQuestaoEnunciado: questao.grupoQuestao_enunciado || '',
    enunciado: questao.enunciado || '',
    hasImage: questao.hasImage === 'True' || questao.hasImage === true,
    hasImageItens: questao.hasImageItens === 'True' || questao.hasImageItens === true,
    provasNivel: questao.provas_nivel || '',
    areasDescricao: questao.areas_descricao,
    itens: questao.itens || [],
    resposta: questao.resposta || '',
    assuntosPalavrasChave: questao.assuntos_palavrasChave || [],
    codigoReal: questao.codigo_real || '',
    disciplinaReal: questao.disciplina_real || '',
    assuntoReal: questao.assunto_real || '',
    anulada: questao.anulada === 'True' || questao.anulada === true,
    desatualizada: questao.desatualizada === 'True' || questao.desatualizada === true
  };
}

/**
 * Remove duplicatas baseado no questaoId
 */
function removeDuplicates(questions) {
  const uniqueQuestions = new Map();
  
  for (const question of questions) {
    const key = question.id || question.questaoId;
    if (!uniqueQuestions.has(key)) {
      uniqueQuestions.set(key, question);
    } else {
      console.log(`⚠️  Duplicata encontrada: questaoId ${key}`);
    }
  }
  
  return Array.from(uniqueQuestions.values());
}

/**
 * Limpa duplicatas do banco de dados
 */
async function cleanDuplicatesFromDatabase() {
  console.log('🧹 Removendo duplicatas do banco de dados...');
  
  try {
    // Encontrar duplicatas por questaoId
    const duplicates = await prisma.$queryRaw`
      SELECT "questaoId", COUNT(*) as count 
      FROM questions 
      GROUP BY "questaoId" 
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada no banco.');
      return 0;
    }
    
    console.log(`📊 Encontradas ${duplicates.length} questões duplicadas.`);
    
    let removedCount = 0;
    
    for (const duplicate of duplicates) {
      const questaoId = duplicate.questaoId;
      
      // Manter apenas o registro mais recente
      const duplicateRecords = await prisma.question.findMany({
        where: { questaoId },
        orderBy: { createdAt: 'desc' }
      });
      
      // Remover todos exceto o primeiro (mais recente)
      const recordsToDelete = duplicateRecords.slice(1);
      
      for (const record of recordsToDelete) {
        await prisma.question.delete({
          where: { id: record.id }
        });
        removedCount++;
      }
      
      console.log(`🗑️  Removidas ${recordsToDelete.length} duplicatas da questão ${questaoId}`);
    }
    
    console.log(`✅ Total de duplicatas removidas: ${removedCount}`);
    return removedCount;
    
  } catch (error) {
    console.error('❌ Erro ao remover duplicatas:', error);
    return 0;
  }
}

/**
 * Processa um lote de questões com verificação de duplicatas
 */
async function processBatch(questions, batchNumber) {
  try {
    const normalizedQuestions = questions.map(normalizeQuestion);
    
    // Verificar quais questões já existem no banco
    const existingIds = await prisma.question.findMany({
      where: {
        questaoId: {
          in: normalizedQuestions.map(q => q.questaoId)
        }
      },
      select: { questaoId: true }
    });
    
    const existingIdSet = new Set(existingIds.map(q => q.questaoId));
    
    // Filtrar apenas questões novas
    const newQuestions = normalizedQuestions.filter(q => !existingIdSet.has(q.questaoId));
    
    if (newQuestions.length === 0) {
      console.log(`⏭️  Lote ${batchNumber}: Todas as questões já existem no banco`);
      return { inserted: 0, skipped: normalizedQuestions.length };
    }
    
    // Inserir questões novas usando upsert para garantir atomicidade
    let inserted = 0;
    const errors = [];
    
    for (const question of newQuestions) {
      try {
        await prisma.question.upsert({
          where: { questaoId: question.questaoId },
          update: {}, // Não atualizar se já existir
          create: question
        });
        inserted++;
      } catch (error) {
        errors.push({
          questaoId: question.questaoId,
          error: error.message
        });
      }
    }
    
    const skipped = normalizedQuestions.length - newQuestions.length;
    
    console.log(`✅ Lote ${batchNumber}: ${inserted} inseridas, ${skipped} já existiam`);
    
    if (errors.length > 0) {
      console.log(`⚠️  Lote ${batchNumber}: ${errors.length} erros encontrados`);
      errors.forEach(err => {
        console.log(`   - Questão ${err.questaoId}: ${err.error}`);
      });
    }
    
    return { inserted, skipped, errors: errors.length };
    
  } catch (error) {
    console.error(`❌ Erro no lote ${batchNumber}:`, error.message);
    return { inserted: 0, skipped: 0, errors: questions.length };
  }
}

/**
 * Migra todas as questões de um arquivo chunk
 */
async function migrateChunk(chunkFile) {
  console.log(`📂 Processando arquivo: ${chunkFile}`);
  
  try {
    const filePath = path.join(CHUNKS_DIR, chunkFile);
    
    // Verificar se o arquivo existe
    try {
      await fs.access(filePath);
    } catch {
      console.warn(`⚠️  Arquivo ${chunkFile} não encontrado`);
      return { inserted: 0, skipped: 0, errors: 0 };
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    
    if (!content.trim()) {
      console.warn(`⚠️  Arquivo ${chunkFile} está vazio`);
      return { inserted: 0, skipped: 0, errors: 0 };
    }
    
    let questions;
    try {
      questions = JSON.parse(content);
    } catch (parseError) {
      console.error(`❌ Erro ao fazer parse do JSON em ${chunkFile}:`, parseError.message);
      return { inserted: 0, skipped: 0, errors: 1 };
    }
    
    if (!Array.isArray(questions)) {
      console.warn(`⚠️  Arquivo ${chunkFile} não contém array válido`);
      return { inserted: 0, skipped: 0, errors: 1 };
    }
    
    if (questions.length === 0) {
      console.warn(`⚠️  Arquivo ${chunkFile} contém array vazio`);
      return { inserted: 0, skipped: 0, errors: 0 };
    }
    
    // Remover duplicatas dentro do próprio arquivo
    const uniqueQuestions = removeDuplicates(questions);
    const duplicatesInFile = questions.length - uniqueQuestions.length;
    
    if (duplicatesInFile > 0) {
      console.log(`🧹 ${chunkFile}: Removidas ${duplicatesInFile} duplicatas internas`);
    }
    
    console.log(`📊 ${uniqueQuestions.length} questões únicas encontradas em ${chunkFile}`);
    
    let totalResults = { inserted: 0, skipped: 0, errors: 0 };
    
    // Processar em lotes
    for (let i = 0; i < uniqueQuestions.length; i += BATCH_SIZE) {
      const batch = uniqueQuestions.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      const results = await processBatch(batch, `${chunkFile}-${batchNumber}`);
      
      totalResults.inserted += results.inserted;
      totalResults.skipped += results.skipped;
      totalResults.errors += results.errors;
      
      // Pequena pausa para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ ${chunkFile}: ${totalResults.inserted} inseridas, ${totalResults.skipped} já existiam, ${totalResults.errors} erros\n`);
    return totalResults;
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${chunkFile}:`, error.message);
    return { inserted: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Atualiza estatísticas do banco
 */
async function updateStats() {
  console.log('📈 Atualizando estatísticas...');
  
  try {
    const [
      totalQuestoes,
      bancasData,
      anosData,
      orgaosData
    ] = await Promise.all([
      prisma.question.count(),
      prisma.question.groupBy({
        by: ['bancasSigla'],
        _count: { bancasSigla: true }
      }),
      prisma.question.groupBy({
        by: ['anos'],
        _count: { anos: true }
      }),
      prisma.question.groupBy({
        by: ['orgaosNome'],
        _count: { orgaosNome: true },
        where: {
          orgaosNome: {
            not: ''
          }
        }
      })
    ]);
    
    await prisma.questionStats.upsert({
      where: { id: 'main' },
      update: {
        totalQuestoes,
        totalBancas: bancasData.length,
        totalAnos: anosData.length,
        totalOrgaos: orgaosData.length,
        atualizadoEm: new Date()
      },
      create: {
        id: 'main',
        totalQuestoes,
        totalBancas: bancasData.length,
        totalAnos: anosData.length,
        totalOrgaos: orgaosData.length
      }
    });
    
    console.log(`📊 Estatísticas atualizadas:
      - Total de questões: ${totalQuestoes.toLocaleString()}
      - Bancas: ${bancasData.length}
      - Anos: ${anosData.length}
      - Órgãos: ${orgaosData.length}`);
      
  } catch (error) {
    console.error('❌ Erro ao atualizar estatísticas:', error);
  }
}

/**
 * Lista e valida arquivos de chunks
 */
async function getChunkFiles() {
  try {
    const files = await fs.readdir(CHUNKS_DIR);
    const chunkFiles = files
      .filter(file => file.startsWith('batch_') && file.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/batch_(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/batch_(\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    console.log(`📁 Encontrados ${chunkFiles.length} arquivos chunk válidos`);
    
    if (chunkFiles.length === 0) {
      console.log('❌ Nenhum arquivo chunk encontrado em ./chunks/');
      console.log('💡 Arquivos devem seguir o padrão: batch_XXX.json');
      return [];
    }
    
    // Validar alguns arquivos aleatoriamente
    const sampleFiles = chunkFiles.slice(0, Math.min(3, chunkFiles.length));
    for (const file of sampleFiles) {
      try {
        const filePath = path.join(CHUNKS_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        JSON.parse(content); // Validar JSON
      } catch (error) {
        console.warn(`⚠️  Arquivo ${file} tem JSON inválido: ${error.message}`);
      }
    }
    
    return chunkFiles;
  } catch (error) {
    console.error('❌ Erro ao listar arquivos chunk:', error);
    return [];
  }
}

/**
 * Função principal de migração
 */
async function main() {
  console.log('🚀 Iniciando migração JSON → PostgreSQL AWS RDS');
  console.log('=' .repeat(70));
  
  const startTime = Date.now();
  let totalResults = { inserted: 0, skipped: 0, errors: 0 };
  
  try {
    // Verificar conexão com banco
    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL AWS RDS\n');
    
    // Verificar dados existentes
    const existingCount = await prisma.question.count();
    console.log(`📊 Questões existentes no banco: ${existingCount.toLocaleString()}`);
    
    // Limpar dados se solicitado
    if (CLEAN_BEFORE_MIGRATION) {
      console.log('🧹 Limpando dados existentes...');
      const deleted = await prisma.question.deleteMany();
      console.log(`🗑️  ${deleted.count} questões removidas\n`);
    } else if (existingCount > 0) {
      // Remover duplicatas do banco
      await cleanDuplicatesFromDatabase();
    }
    
    // Listar e validar arquivos de chunks
    const chunkFiles = await getChunkFiles();
    
    if (chunkFiles.length === 0) {
      console.log('❌ Nenhum arquivo válido encontrado para migração');
      return;
    }
    
    console.log(`\n🔄 Iniciando processamento de ${chunkFiles.length} arquivos...\n`);
    
    // Processar cada chunk
    let processedFiles = 0;
    
    for (const chunkFile of chunkFiles) {
      const results = await migrateChunk(chunkFile);
      
      totalResults.inserted += results.inserted;
      totalResults.skipped += results.skipped;
      totalResults.errors += results.errors;
      processedFiles++;
      
      // Log de progresso
      if (totalResults.inserted > 0 && totalResults.inserted % LOG_INTERVAL === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (totalResults.inserted / parseFloat(elapsed)).toFixed(1);
        console.log(`⏱️  Progresso: ${totalResults.inserted.toLocaleString()} questões inseridas em ${elapsed}s (${rate} q/s)`);
      }
    }
    
    // Atualizar estatísticas
    await updateStats();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalProcessed = totalResults.inserted + totalResults.skipped;
    const avgRate = totalProcessed > 0 ? (totalProcessed / parseFloat(totalTime)).toFixed(1) : '0';
    
    console.log('\n' + '=' .repeat(70));
    console.log('🎉 Migração concluída!');
    console.log(`📊 Resultados finais:
      - Arquivos processados: ${processedFiles}/${chunkFiles.length}
      - Questões inseridas: ${totalResults.inserted.toLocaleString()}
      - Questões já existiam: ${totalResults.skipped.toLocaleString()}
      - Erros encontrados: ${totalResults.errors.toLocaleString()}
      - Tempo total: ${totalTime}s
      - Taxa média: ${avgRate} questões/segundo`);
    
    if (totalResults.errors > 0) {
      console.log('\n⚠️  Alguns erros foram encontrados. Verifique os logs acima para detalhes.');
    }
    
    // Verificação final
    const finalCount = await prisma.question.count();
    console.log(`\n✅ Total de questões no banco após migração: ${finalCount.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    console.log('\n💡 Dicas para resolução:');
    console.log('   - Verifique a conexão com o banco de dados');
    console.log('   - Confirme que os arquivos JSON estão válidos');
    console.log('   - Tente executar com --clean para limpar dados existentes');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Conexão com banco encerrada');
  }
}

// Executar se chamado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export { main as migrateToPostgres };
