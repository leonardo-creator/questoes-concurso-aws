/**
 * Script de teste para verificar os modos de estudo
 * Execute este script com: node scripts/test-modos-estudo.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testarModosEstudo() {
  console.log('🔬 Iniciando teste dos modos de estudo...\n');

  try {
    // Teste 1: Contagem total de questões
    const totalQuestoes = await prisma.question.count();
    console.log(`📊 Total de questões no banco: ${totalQuestoes.toLocaleString()}`);

    // Teste 2: Questões com códigos específicos
    const codigosPersonalizados = ['140.3.3.3', '2.3.3'];
    const questoesCodigos = await prisma.question.count({
      where: {
        codigoReal: { in: codigosPersonalizados }
      }
    });
    console.log(`🔍 Questões com códigos [${codigosPersonalizados.join(', ')}]: ${questoesCodigos}`);

    // Teste 3: Amostra de códigos reais do banco
    const amostraCodigosReais = await prisma.question.findMany({
      select: {
        codigoReal: true,
        disciplinaReal: true,
        assuntoReal: true
      },
      take: 10,
      orderBy: { id: 'asc' }
    });
    console.log('\n📋 Amostra de códigos reais no banco:');
    amostraCodigosReais.forEach((q, i) => {
      console.log(`${i + 1}. Código: ${q.codigoReal} | Disciplina: ${q.disciplinaReal} | Assunto: ${q.assuntoReal}`);
    });

    // Teste 4: Buscar códigos similares
    const padroesSimilares = await prisma.question.findMany({
      where: {
        OR: [
          { codigoReal: { contains: '140' } },
          { codigoReal: { contains: '2.3' } }
        ]
      },
      select: {
        codigoReal: true,
        disciplinaReal: true,
        assuntoReal: true
      },
      take: 5
    });
    console.log('\n🔎 Códigos similares encontrados:');
    padroesSimilares.forEach((q, i) => {
      console.log(`${i + 1}. Código: ${q.codigoReal} | Disciplina: ${q.disciplinaReal}`);
    });

    // Teste 5: Filtro simples (uma disciplina)
    const questoesDireitoConst = await prisma.question.count({
      where: {
        disciplinaReal: 'Direito Constitucional'
      }
    });
    console.log(`\n⚖️ Questões de Direito Constitucional: ${questoesDireitoConst.toLocaleString()}`);

    // Teste 6: Disciplinas mais comuns
    const disciplinasCount = await prisma.question.groupBy({
      by: ['disciplinaReal'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });
    console.log('\n📚 Top 5 disciplinas com mais questões:');
    disciplinasCount.forEach((d, i) => {
      console.log(`${i + 1}. ${d.disciplinaReal}: ${d._count.id.toLocaleString()} questões`);
    });

    // Teste 7: Formato de códigos reais
    const formatosCodigos = await prisma.question.findMany({
      select: {
        codigoReal: true
      },
      take: 20,
      orderBy: { id: 'desc' }
    });
    console.log('\n🏷️ Formatos de códigos reais (últimos 20):');
    formatosCodigos.forEach((q, i) => {
      console.log(`${i + 1}. ${q.codigoReal}`);
    });

    console.log('\n✅ Teste concluído!\n');

    // Teste 8: Simulação de busca com filtros
    console.log('🧪 Simulando busca com diferentes modos de ordenação:\n');

    const filtroTeste = {
      disciplinaReal: 'Direito Constitucional'
    };

    // Modo relevância (padrão)
    const questoesRelevancia = await prisma.question.findMany({
      where: filtroTeste,
      take: 10,
      orderBy: { id: 'asc' }
    });
    console.log(`📊 Modo Relevância: ${questoesRelevancia.length} questões retornadas`);

    // Modo dificuldade decrescente
    const questoesDificuldade = await prisma.question.findMany({
      where: filtroTeste,
      take: 10,
      orderBy: { dificuldade: 'desc' }
    });
    console.log(`🔥 Modo Dificuldade (Difícil→Fácil): ${questoesDificuldade.length} questões retornadas`);

    // Modo ano decrescente
    const questoesAno = await prisma.question.findMany({
      where: filtroTeste,
      take: 10,
      orderBy: { anos: 'desc' }
    });
    console.log(`📅 Modo Ano (Recente→Antigo): ${questoesAno.length} questões retornadas`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testarModosEstudo();
