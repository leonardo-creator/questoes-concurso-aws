#!/usr/bin/env node
/**
 * Script de migração: JSON chunks → PostgreSQL AWS RDS
 * 
 * Este script migra todas as questões dos arquivos JSON para o banco PostgreSQL,
 * processando em lotes para evitar sobrecarga de memória e timeout.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Configurações
const BATCH_SIZE = 1000; // Processar 1000 questões por vez
const CHUNKS_DIR = path.join(__dirname, '../chunks');
const LOG_INTERVAL = 5000; // Log a cada 5000 questões

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
    bancasOab: questao.bancas_oab || false,
    cargosDescricao: questao.cargos_descricao || '',
    orgaosNome: questao.orgaos_nome || '',
    orgaosSigla: questao.orgaos_sigla || '',
    orgaosUf: questao.orgaos_uf || '',
    anos: questao.anos || new Date().getFullYear(),
    tipo: questao.tipo || '',
    grupoQuestaoEnunciado: questao.grupoQuestao_enunciado || '',
    enunciado: questao.enunciado || '',
    hasImage: questao.hasImage === 'True',
    hasImageItens: questao.hasImageItens === 'True',
    provasNivel: questao.provas_nivel || '',
    areasDescricao: questao.areas_descricao,
    itens: questao.itens || [],
    resposta: questao.resposta || '',
    assuntosPalavrasChave: questao.assuntos_palavrasChave || [],
    // 🔧 CORREÇÃO: Usar null em vez de string vazia para campos únicos
    codigoReal: questao.codigo_real && questao.codigo_real.trim() !== '' ? questao.codigo_real.trim() : null,
    disciplinaReal: questao.disciplina_real || '',
    assuntoReal: questao.assunto_real || '',
    anulada: questao.anulada === 'True',
    desatualizada: questao.desatualizada === 'True'
  };
}

/**
 * Remove duplicatas dentro do lote baseado em questaoId
 */
function removeDuplicatesFromBatch(questions) {
  const seen = new Set();
  const unique = [];
  
  for (const question of questions) {
    const id = question.id;
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(question);
    }
  }
  
  if (unique.length < questions.length) {
    console.log(`🔍 Removidas ${questions.length - unique.length} duplicatas dentro do lote`);
  }
  
  return unique;
}

/**
 * Verifica quais questões já existem no banco
 */
async function getExistingQuestions(questaoIds) {
  const existing = await prisma.question.findMany({
    where: {
      questaoId: {
        in: questaoIds
      }
    },
    select: { questaoId: true }
  });
  
  return new Set(existing.map(q => q.questaoId));
}

/**
 * Processa um lote de questões com verificação de duplicatas
 */
async function processBatch(questions, batchNumber, chunkFile) {
  try {
    // 1. Remover duplicatas dentro do próprio lote
    const uniqueQuestions = removeDuplicatesFromBatch(questions);
    
    // 2. Normalizar as questões
    const normalizedQuestions = uniqueQuestions.map(normalizeQuestion);
    
    // 3. Verificar quais já existem no banco
    const questaoIds = normalizedQuestions.map(q => q.questaoId);
    const existingIds = await getExistingQuestions(questaoIds);
    
    // 4. Filtrar apenas questões novas
    const newQuestions = normalizedQuestions.filter(q => !existingIds.has(q.questaoId));
    
    let inserted = 0;
    let skipped = questions.length - newQuestions.length;
    
    if (newQuestions.length === 0) {
      console.log(`⏭️  ${chunkFile} - Lote ${batchNumber}: Todas as ${questions.length} questões já existem`);
      return { inserted: 0, skipped };
    }
    
    // 5. Tentar inserção em lote primeiro
    try {
      await prisma.question.createMany({
        data: newQuestions,
        skipDuplicates: true
      });
      inserted = newQuestions.length;
      console.log(`✅ ${chunkFile} - Lote ${batchNumber}: ${inserted} inseridas, ${skipped} já existiam`);
    } catch (batchError) {
      console.warn(`⚠️  Erro na inserção em lote: ${batchError.message}`);
      console.log(`🔄 Tentando inserção individual...`);
      
      // 6. Se falhar, inserir uma por vez
      for (const question of newQuestions) {
        try {
          await prisma.question.upsert({
            where: { questaoId: question.questaoId },
            update: {}, // Não atualizar se já existir
            create: question
          });
          inserted++;
        } catch (singleError) {
          console.warn(`⚠️  Questão ${question.questaoId} ignorada: ${singleError.message}`);
          skipped++;
        }
      }
      
      console.log(`🔄 ${chunkFile} - Lote ${batchNumber}: ${inserted} inseridas individualmente, ${skipped} problemas`);
    }
    
    return { inserted, skipped };
    
  } catch (error) {
    console.error(`❌ Erro grave no lote ${batchNumber}:`, error.message);
    return { inserted: 0, skipped: questions.length };
  }
}

/**
 * Migra todas as questões de um arquivo chunk
 */
async function migrateChunk(chunkFile, chunkIndex, totalChunks) {
  console.log(`📂 [${chunkIndex}/${totalChunks}] Processando: ${chunkFile}`);
  
  try {
    const filePath = path.join(CHUNKS_DIR, chunkFile);
    const content = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(content);
    
    if (!Array.isArray(questions)) {
      console.warn(`⚠️  ${chunkFile} não contém array válido`);
      return { inserted: 0, skipped: 0 };
    }
    
    console.log(`📊 ${chunkFile}: ${questions.length} questões encontradas`);
    
    let totalInserted = 0;
    let totalSkipped = 0;
    
    // Processar em lotes
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(questions.length / BATCH_SIZE);
      
      console.log(`🔄 ${chunkFile}: Processando lote ${batchNumber}/${totalBatches} (${batch.length} questões)`);
      
      const result = await processBatch(batch, batchNumber, chunkFile);
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
      
      // Pequena pausa para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ ${chunkFile}: ${totalInserted} inseridas, ${totalSkipped} já existiam/problemas\n`);
    return { inserted: totalInserted, skipped: totalSkipped };
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${chunkFile}:`, error.message);
    return { inserted: 0, skipped: 0 };
  }
}

/**
 * Remove duplicatas do banco baseado em questaoId
 */
async function cleanDuplicates() {
  console.log('🧹 Verificando e removendo duplicatas...');
  
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
      return 0;
    }
    
    console.log(`📊 Encontradas ${duplicates.length} questões com duplicatas`);
    
    let totalRemoved = 0;
    
    for (const duplicate of duplicates) {
      const questaoId = Number(duplicate.questaoId);
      
      // Buscar todos os registros duplicados ordenados por data de criação
      const records = await prisma.question.findMany({
        where: { questaoId },
        orderBy: { createdAt: 'desc' } // Manter o mais recente
      });
      
      // Remover todos exceto o primeiro (mais recente)
      const toDelete = records.slice(1);
      
      for (const record of toDelete) {
        await prisma.question.delete({
          where: { id: record.id }
        });
        totalRemoved++;
      }
      
      console.log(`🗑️  questaoId ${questaoId}: removidas ${toDelete.length} duplicatas`);
    }
    
    console.log(`✅ Total de registros duplicados removidos: ${totalRemoved}\n`);
    return totalRemoved;
    
  } catch (error) {
    console.error('❌ Erro ao limpar duplicatas:', error.message);
    return 0;
  }
}

/**
 * Atualiza estatísticas do banco
 */
async function updateStats() {
  console.log('📈 Atualizando estatísticas...');
  
  const [
    totalQuestoes,
    bancas,
    anos,
    orgaos
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
      _count: { orgaosNome: true }
    })
  ]);
  
  await prisma.questionStats.upsert({
    where: { id: 'main' },
    update: {
      totalQuestoes,
      totalBancas: bancas.length,
      totalAnos: anos.length,
      totalOrgaos: orgaos.length,
      atualizadoEm: new Date()
    },
    create: {
      id: 'main',
      totalQuestoes,
      totalBancas: bancas.length,
      totalAnos: anos.length,
      totalOrgaos: orgaos.length
    }
  });
  
  console.log(`📊 Estatísticas atualizadas:
    - Total de questões: ${totalQuestoes.toLocaleString()}
    - Bancas: ${bancas.length}
    - Anos: ${anos.length}
    - Órgãos: ${orgaos.length}`);
}

/**
 * Função principal de migração
 */
async function main() {
  console.log('🚀 Iniciando migração JSON → PostgreSQL AWS RDS');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  const shouldClean = process.argv.includes('--clean');
  
  try {
    // Verificar conexão com banco
    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL AWS RDS\n');
    
    // Verificar estado atual do banco
    const existingCount = await prisma.question.count();
    console.log(`📊 Estado atual: ${existingCount.toLocaleString()} questões no banco`);
    
    // Limpar duplicatas se solicitado
    if (shouldClean) {
      console.log('🧹 Flag --clean detectada. Limpando duplicatas...');
      await cleanDuplicates();
      
      const newCount = await prisma.question.count();
      console.log(`📊 Após limpeza: ${newCount.toLocaleString()} questões no banco\n`);
    } else if (existingCount > 0) {
      console.log('ℹ️  Use --clean para remover duplicatas antes da migração\n');
    }
    
    // Listar arquivos de chunks
    const files = await fs.readdir(CHUNKS_DIR);
    const chunkFiles = files
      .filter(file => file.startsWith('batch_') && file.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/batch_(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/batch_(\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    console.log(`📁 Encontrados ${chunkFiles.length} arquivos chunk para processar`);
    
    if (chunkFiles.length === 0) {
      console.log('❌ Nenhum arquivo chunk encontrado em ./chunks/');
      console.log('📁 Verifique se os arquivos estão no formato batch_XXX.json');
      return;
    }
    
    // Verificar alguns arquivos como exemplo
    console.log('📋 Primeiros arquivos a serem processados:');
    chunkFiles.slice(0, 5).forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    if (chunkFiles.length > 5) {
      console.log(`   ... e mais ${chunkFiles.length - 5} arquivos`);
    }
    console.log('');
    
    // Processar cada chunk
    let totalInserted = 0;
    let totalSkipped = 0;
    let processedFiles = 0;
    let failedFiles = 0;
    
    for (let i = 0; i < chunkFiles.length; i++) {
      const chunkFile = chunkFiles[i];
      console.log(`🔄 Progresso geral: ${i + 1}/${chunkFiles.length} arquivos`);
      
      const result = await migrateChunk(chunkFile, i + 1, chunkFiles.length);
      
      if (result.inserted > 0 || result.skipped > 0) {
        processedFiles++;
        totalInserted += result.inserted;
        totalSkipped += result.skipped;
      } else {
        failedFiles++;
      }
      
      // Log de progresso a cada 10 arquivos ou quando atingir marcos
      if ((i + 1) % 10 === 0 || totalInserted % LOG_INTERVAL === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = totalInserted > 0 ? (totalInserted / parseFloat(elapsed)).toFixed(1) : '0';
        console.log(`📈 Progresso intermediário: ${totalInserted.toLocaleString()} questões inseridas em ${elapsed}s (${rate} q/s)\n`);
      }
    }
    
    // Atualizar estatísticas
    await updateStats();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = totalInserted > 0 ? (totalInserted / parseFloat(totalTime)).toFixed(1) : '0';
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Migração concluída!');
    console.log(`📊 Resultados finais:
    - Arquivos processados: ${processedFiles}/${chunkFiles.length} (${failedFiles} falharam)
    - Questões novas inseridas: ${totalInserted.toLocaleString()}
    - Questões já existiam/problemas: ${totalSkipped.toLocaleString()}
    - Total processado: ${(totalInserted + totalSkipped).toLocaleString()}
    - Tempo total: ${totalTime}s
    - Taxa média: ${avgRate} questões/segundo`);
    
    if (failedFiles > 0) {
      console.log(`\n⚠️  Atenção: ${failedFiles} arquivos falharam no processamento`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export { main as migrateToPostgres };
