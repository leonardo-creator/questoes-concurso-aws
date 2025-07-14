#!/usr/bin/env node
/**
 * Teste de migração com um chunk pequeno
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

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

async function testMigration() {
  try {
    console.log('🧪 Teste de migração com batch_001.json...');
    
    await prisma.$connect();
    
    // Ler apenas o primeiro arquivo
    const filePath = path.join(__dirname, '../chunks/batch_001.json');
    const content = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(content);
    
    console.log(`📊 ${questions.length} questões encontradas`);
    
    // Testar com apenas as primeiras 10 questões
    const testQuestions = questions.slice(0, 10);
    console.log(`🔬 Testando com ${testQuestions.length} questões...`);
    
    const normalizedQuestions = testQuestions.map(normalizeQuestion);
    
    console.log('📝 Exemplo de questão normalizada:', JSON.stringify(normalizedQuestions[0], null, 2));
    
    // Inserir no banco
    const result = await prisma.question.createMany({
      data: normalizedQuestions,
      skipDuplicates: true
    });
    
    console.log(`✅ ${result.count} questões inseridas com sucesso!`);
    
    // Verificar se foram inseridas
    const count = await prisma.question.count();
    console.log(`📊 Total de questões no banco: ${count}`);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMigration();
