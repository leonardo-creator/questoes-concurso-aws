#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando processamento das questões...');

// Diretórios
const chunksDir = path.join(__dirname, '../chunks');
const publicDataDir = path.join(__dirname, '../public/data');
const questoesDir = path.join(publicDataDir, 'questoes');
const indicesDir = path.join(publicDataDir, 'indices');

// Criar diretórios se não existirem
[publicDataDir, questoesDir, indicesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Função para ler todos os chunks
function lerTodosChunks() {
  console.log('📂 Lendo arquivos chunks...');
  const arquivos = fs.readdirSync(chunksDir)
    .filter(arquivo => arquivo.endsWith('.json'))
    .sort();

  let todasQuestoes = [];
  
  for (const arquivo of arquivos) {
    console.log(`   Processando ${arquivo}...`);
    const caminhoArquivo = path.join(chunksDir, arquivo);
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
    
    try {
      const questoes = JSON.parse(conteudo);
      if (Array.isArray(questoes)) {
        todasQuestoes = todasQuestoes.concat(questoes);
      } else {
        console.warn(`⚠️  ${arquivo} não contém um array de questões`);
      }
    } catch (error) {
      console.error(`❌ Erro ao parsear ${arquivo}:`, error.message);
    }
  }

  console.log(`✅ Total de questões carregadas: ${todasQuestoes.length}`);
  return todasQuestoes;
}

// Função para criar manifesto
function criarManifesto(questoes) {
  console.log('📋 Criando manifesto...');
  
  const manifesto = questoes.map(questao => ({
    codigo_real: questao.codigo_real,
    disciplina_real: questao.disciplina_real,
    assunto_real: questao.assunto_real,
    bancas_sigla: questao.bancas_sigla,
    ano: questao.ano,
    dificuldade: questao.dificuldade,
    anulada: questao.anulada || false,
    desatualizada: questao.desatualizada || false
  }));

  const manifestoPath = path.join(publicDataDir, 'manifest.json');
  fs.writeFileSync(manifestoPath, JSON.stringify(manifesto, null, 0));
  
  console.log(`✅ Manifesto criado com ${manifesto.length} questões`);
  return manifesto;
}

// Função para salvar questões individuais
function salvarQuestoesIndividuais(questoes) {
  console.log('💾 Salvando questões individuais...');
  
  let contador = 0;
  const batchSize = 100;
  
  for (let i = 0; i < questoes.length; i += batchSize) {
    const batch = questoes.slice(i, i + batchSize);
    
    batch.forEach(questao => {
      const nomeArquivo = `${questao.codigo_real}.json`;
      const caminhoArquivo = path.join(questoesDir, nomeArquivo);
      
      // Garantir que todos os campos necessários estão presentes
      const questaoCompleta = {
        id: questao.id,
        codigo_real: questao.codigo_real,
        dificuldade: questao.dificuldade,
        bancas_nome: questao.bancas_nome,
        bancas_sigla: questao.bancas_sigla,
        cargos_descricao: questao.cargos_descricao,
        orgaos_nome: questao.orgaos_nome,
        orgaos_sigla: questao.orgaos_sigla,
        ano: questao.ano,
        enunciado: questao.enunciado,
        itens: questao.itens || [],
        resposta: questao.resposta,
        disciplina_real: questao.disciplina_real,
        assunto_real: questao.assunto_real,
        anulada: questao.anulada || false,
        desatualizada: questao.desatualizada || false
      };
      
      fs.writeFileSync(caminhoArquivo, JSON.stringify(questaoCompleta, null, 0));
      contador++;
    });
    
    // Log de progresso
    if ((i + batchSize) % (batchSize * 10) === 0 || i + batchSize >= questoes.length) {
      console.log(`   Processadas ${Math.min(i + batchSize, questoes.length)} de ${questoes.length} questões`);
    }
  }
  
  console.log(`✅ ${contador} questões individuais salvas`);
}

// Função para criar índices
function criarIndices(questoes) {
  console.log('📊 Criando índices...');

  // Índice de disciplinas com assuntos
  const disciplinasMap = new Map();
  questoes.forEach(questao => {
    const disciplina = questao.disciplina_real;
    const assunto = questao.assunto_real;
    
    if (!disciplinasMap.has(disciplina)) {
      disciplinasMap.set(disciplina, {
        nome: disciplina,
        count: 0,
        assuntos: new Map()
      });
    }
    
    const discObj = disciplinasMap.get(disciplina);
    discObj.count++;
    
    if (!discObj.assuntos.has(assunto)) {
      discObj.assuntos.set(assunto, { nome: assunto, count: 0 });
    }
    discObj.assuntos.get(assunto).count++;
  });

  const indiceDisciplinas = Array.from(disciplinasMap.values()).map(disc => ({
    nome: disc.nome,
    count: disc.count,
    assuntos: Array.from(disc.assuntos.values()).sort((a, b) => b.count - a.count)
  })).sort((a, b) => b.count - a.count);

  // Índice de bancas
  const bancasMap = new Map();
  questoes.forEach(questao => {
    const sigla = questao.bancas_sigla;
    const nome = questao.bancas_nome;
    
    if (!bancasMap.has(sigla)) {
      bancasMap.set(sigla, { sigla, nome, count: 0 });
    }
    bancasMap.get(sigla).count++;
  });

  const indiceBancas = Array.from(bancasMap.values())
    .sort((a, b) => b.count - a.count);

  // Índice de anos
  const anosMap = new Map();
  questoes.forEach(questao => {
    const ano = questao.ano;
    if (!anosMap.has(ano)) {
      anosMap.set(ano, { ano, count: 0 });
    }
    anosMap.get(ano).count++;
  });

  const indiceAnos = Array.from(anosMap.values())
    .sort((a, b) => b.ano - a.ano);

  // Índice de dificuldades
  const dificuldadesMap = new Map();
  questoes.forEach(questao => {
    const dificuldade = questao.dificuldade;
    if (!dificuldadesMap.has(dificuldade)) {
      dificuldadesMap.set(dificuldade, { dificuldade, count: 0 });
    }
    dificuldadesMap.get(dificuldade).count++;
  });

  const indiceDificuldades = Array.from(dificuldadesMap.values())
    .sort((a, b) => {
      const ordem = { 'Fácil': 1, 'Média': 2, 'Difícil': 3 };
      return ordem[a.dificuldade] - ordem[b.dificuldade];
    });

  // Salvar índices
  fs.writeFileSync(
    path.join(indicesDir, 'disciplinas.json'), 
    JSON.stringify(indiceDisciplinas, null, 0)
  );
  
  fs.writeFileSync(
    path.join(indicesDir, 'bancas.json'), 
    JSON.stringify(indiceBancas, null, 0)
  );
  
  fs.writeFileSync(
    path.join(indicesDir, 'anos.json'), 
    JSON.stringify(indiceAnos, null, 0)
  );

  fs.writeFileSync(
    path.join(indicesDir, 'dificuldades.json'), 
    JSON.stringify(indiceDificuldades, null, 0)
  );

  console.log(`✅ Índices criados:`);
  console.log(`   - ${indiceDisciplinas.length} disciplinas`);
  console.log(`   - ${indiceBancas.length} bancas`);
  console.log(`   - ${indiceAnos.length} anos`);
  console.log(`   - ${indiceDificuldades.length} níveis de dificuldade`);
}

// Função para criar estatísticas gerais
function criarEstatisticas(questoes) {
  console.log('📈 Criando estatísticas gerais...');

  const stats = {
    totalQuestoes: questoes.length,
    questoesAtivas: questoes.filter(q => !q.anulada && !q.desatualizada).length,
    questoesAnuladas: questoes.filter(q => q.anulada).length,
    questoesDesatualizadas: questoes.filter(q => q.desatualizada).length,
    anoMaisAntigo: Math.min(...questoes.map(q => q.ano)),
    anoMaisRecente: Math.max(...questoes.map(q => q.ano)),
    processedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(publicDataDir, 'stats.json'), 
    JSON.stringify(stats, null, 2)
  );

  console.log(`✅ Estatísticas criadas: ${stats.totalQuestoes} questões totais`);
}

// Função principal
async function main() {
  try {
    const startTime = Date.now();

    // Verificar se existem arquivos chunks
    if (!fs.existsSync(chunksDir)) {
      throw new Error(`Diretório chunks não encontrado: ${chunksDir}`);
    }

    const arquivosChunks = fs.readdirSync(chunksDir).filter(f => f.endsWith('.json'));
    if (arquivosChunks.length === 0) {
      throw new Error(`Nenhum arquivo JSON encontrado em: ${chunksDir}`);
    }

    console.log(`📦 Encontrados ${arquivosChunks.length} arquivos chunks`);

    // Processar questões
    const questoes = lerTodosChunks();
    
    if (questoes.length === 0) {
      throw new Error('Nenhuma questão foi carregada dos arquivos chunks');
    }

    // Validar estrutura das questões
    const primeiraQuestao = questoes[0];
    const camposObrigatorios = ['codigo_real', 'disciplina_real', 'assunto_real', 'bancas_sigla', 'ano'];
    const camposFaltando = camposObrigatorios.filter(campo => !(campo in primeiraQuestao));
    
    if (camposFaltando.length > 0) {
      console.warn(`⚠️  Campos faltando na estrutura das questões: ${camposFaltando.join(', ')}`);
    }

    // Criar todos os arquivos necessários
    criarManifesto(questoes);
    salvarQuestoesIndividuais(questoes);
    criarIndices(questoes);
    criarEstatisticas(questoes);

    const endTime = Date.now();
    const tempo = (endTime - startTime) / 1000;

    console.log(`🎉 Processamento concluído em ${tempo.toFixed(2)} segundos!`);
    console.log(`📁 Arquivos gerados em: ${publicDataDir}`);

  } catch (error) {
    console.error('❌ Erro durante o processamento:', error.message);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
