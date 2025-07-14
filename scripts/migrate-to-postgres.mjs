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
    codigoReal: questao.codigo_real || '',
    disciplinaReal: questao.disciplina_real || '',
    assuntoReal: questao.assunto_real || '',
    anulada: questao.anulada === 'True',
    desatualizada: questao.desatualizada === 'True'
  };
}

/**
 * Processa um lote de questões
 */
async function processBatch(questions, batchNumber) {
  try {
    const normalizedQuestions = questions.map(normalizeQuestion);
    
    // Usar createMany para inserção em lote eficiente
    await prisma.question.createMany({
      data: normalizedQuestions,
      skipDuplicates: true // Evita erro se já existir
    });
    
    console.log(`✅ Lote ${batchNumber}: ${questions.length} questões processadas`);
    return questions.length;
  } catch (error) {
    console.error(`❌ Erro no lote ${batchNumber}:`, error.message);
    
    // Tentar inserir uma por vez para identificar problemas específicos
    let inserted = 0;
    for (const question of questions) {
      try {
        await prisma.question.create({
          data: normalizeQuestion(question)
        });
        inserted++;
      } catch (singleError) {
        console.warn(`⚠️  Questão ${question.id} ignorada:`, singleError.message);
      }
    }
    
    console.log(`🔄 Lote ${batchNumber}: ${inserted}/${questions.length} questões salvas individualmente`);
    return inserted;
  }
}

/**
 * Migra todas as questões de um arquivo chunk
 */
async function migrateChunk(chunkFile) {
  console.log(`📂 Processando arquivo: ${chunkFile}`);
  
  try {
    const filePath = path.join(CHUNKS_DIR, chunkFile);
    const content = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(content);
    
    if (!Array.isArray(questions)) {
      console.warn(`⚠️  Arquivo ${chunkFile} não contém array válido`);
      return 0;
    }
    
    console.log(`📊 ${questions.length} questões encontradas em ${chunkFile}`);
    
    let totalProcessed = 0;
    
    // Processar em lotes
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      const processed = await processBatch(batch, `${chunkFile}-${batchNumber}`);
      totalProcessed += processed;
      
      // Pequena pausa para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ ${chunkFile}: ${totalProcessed} questões migradas\n`);
    return totalProcessed;
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${chunkFile}:`, error.message);
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
  
  try {
    // Verificar conexão com banco
    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL AWS RDS\n');
    
    // Limpar dados existentes (opcional)
    const existingCount = await prisma.question.count();
    if (existingCount > 0) {
      console.log(`⚠️  Encontradas ${existingCount} questões existentes`);
      console.log('⏭️  Pulando limpeza. Use --clean para limpar antes da migração\n');
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
    
    console.log(`📁 Encontrados ${chunkFiles.length} arquivos chunk`);
    
    if (chunkFiles.length === 0) {
      console.log('❌ Nenhum arquivo chunk encontrado em ./chunks/');
      return;
    }
    
    // Processar cada chunk
    let totalMigrated = 0;
    let processedFiles = 0;
    
    for (const chunkFile of chunkFiles) {
      const migrated = await migrateChunk(chunkFile);
      totalMigrated += migrated;
      processedFiles++;
      
      if (totalMigrated > 0 && totalMigrated % LOG_INTERVAL === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (totalMigrated / parseFloat(elapsed)).toFixed(1);
        console.log(`⏱️  Progresso: ${totalMigrated.toLocaleString()} questões em ${elapsed}s (${rate} q/s)`);
      }
    }
    
    // Atualizar estatísticas
    await updateStats();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (totalMigrated / parseFloat(totalTime)).toFixed(1);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Migração concluída com sucesso!');
    console.log(`📊 Resultados:
    - Arquivos processados: ${processedFiles}/${chunkFiles.length}
    - Questões migradas: ${totalMigrated.toLocaleString()}
    - Tempo total: ${totalTime}s
    - Taxa média: ${avgRate} questões/segundo`);
    
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
