#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Processando questões individuais...');

// Ler apenas o primeiro chunk para criar questões individuais
const chunksDir = path.join(__dirname, '../chunks');
const questoesDir = path.join(__dirname, '../public/data/questoes');

// Criar diretório se não existir
if (!fs.existsSync(questoesDir)) {
  fs.mkdirSync(questoesDir, { recursive: true });
}

try {
  const primeiroChunk = path.join(chunksDir, 'batch_001.json');
  console.log('📂 Lendo primeiro chunk...');
  
  const questoes = JSON.parse(fs.readFileSync(primeiroChunk, 'utf8'));
  
  console.log(`📊 Processando ${Math.min(questoes.length, 1000)} questões...`);
  
  // Processar apenas as primeiras 1000 questões
  const questoesParaProcessar = questoes.slice(0, 1000);
  
  let processadas = 0;
  
  for (const questao of questoesParaProcessar) {
    try {
      // Transformar questão no formato esperado
      const questaoFormatada = {
        id: questao.id,
        codigo_real: questao.codigo_real,
        disciplina_real: questao.disciplina_real,
        assunto_real: questao.assunto_real,
        bancas_nome: questao.bancas_nome,
        bancas_sigla: questao.bancas_sigla,
        orgaos_nome: questao.orgaos_nome,
        cargos_descricao: questao.cargos_descricao,
        ano: questao.anos || questao.ano,
        nivel: questao.provas_nivel,
        tipo: questao.tipo,
        enunciado: questao.enunciado,
        grupoQuestao_enunciado: questao.grupoQuestao_enunciado,
        alternativas: questao.itens || [],
        resposta_correta: questao.resposta,
        dificuldade: questao.dificuldade === 1 ? 'Fácil' : questao.dificuldade === 3 ? 'Média' : questao.dificuldade === 5 ? 'Difícil' : 'Média',
        anulada: questao.anulada === 'True' || questao.anulada === true,
        desatualizada: questao.desatualizada === 'True' || questao.desatualizada === true,
        hasImage: questao.hasImage === 'True',
        hasImageItens: questao.hasImageItens === 'True'
      };
      
      // Salvar questão individual
      const questaoPath = path.join(questoesDir, `${questao.codigo_real}.json`);
      fs.writeFileSync(questaoPath, JSON.stringify(questaoFormatada, null, 2));
      
      processadas++;
      
      if (processadas % 100 === 0) {
        console.log(`📝 Processadas ${processadas} questões...`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar questão ${questao.codigo_real}:`, error);
    }
  }
  
  console.log(`✅ ${processadas} questões processadas com sucesso!`);
  
} catch (error) {
  console.error('❌ Erro ao processar questões:', error);
  process.exit(1);
}
