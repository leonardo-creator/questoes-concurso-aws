import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para extrair dados de uma questão
function extractDataFromQuestao(questao, dataCollectors) {
  const { bancas, anos, disciplinas, orgaos, cargos, assuntos } = dataCollectors;
  
  // Extrair bancas
  if (questao.bancas_nome && questao.bancas_sigla) {
    bancas.add(JSON.stringify({
      nome: questao.bancas_nome,
      sigla: questao.bancas_sigla,
      descricao: questao.bancas_descricao || ''
    }));
  }
  
  // Extrair anos
  if (questao.anos) {
    anos.add(questao.anos);
  }
  
  // Extrair disciplinas
  if (questao.disciplina_real) {
    disciplinas.add(questao.disciplina_real);
  }
  
  // Extrair órgãos
  if (questao.orgaos_nome) {
    orgaos.add(JSON.stringify({
      nome: questao.orgaos_nome,
      sigla: questao.orgaos_sigla || '',
      uf: questao.orgaos_uf || ''
    }));
  }
  
  // Extrair cargos
  if (questao.cargos_descricao) {
    cargos.add(questao.cargos_descricao);
  }
  
  // Extrair assuntos
  if (questao.assunto_real) {
    assuntos.add(questao.assunto_real);
  }
}

// Função para processar um único arquivo de chunk
function processChunkFile(filePath, dataCollectors) {
  const content = fs.readFileSync(filePath, 'utf8');
  const questoes = JSON.parse(content);
  
  for (const questao of questoes) {
    extractDataFromQuestao(questao, dataCollectors);
  }
  
  return questoes.length;
}

// Função para converter Sets em arrays ordenados
function convertSetsToArrays(dataCollectors) {
  const { bancas, anos, disciplinas, orgaos, cargos, assuntos } = dataCollectors;
  
  return {
    bancas: Array.from(bancas).map(b => JSON.parse(b)).sort((a, b) => a.nome.localeCompare(b.nome)),
    anos: Array.from(anos).sort((a, b) => b - a),
    disciplinas: Array.from(disciplinas).sort(),
    orgaos: Array.from(orgaos).map(o => JSON.parse(o)).sort((a, b) => a.nome.localeCompare(b.nome)),
    cargos: Array.from(cargos).sort(),
    assuntos: Array.from(assuntos).sort()
  };
}

// Função para salvar índices em arquivos
function saveIndicesToFiles(indices, outputDir) {
  for (const [nome, dados] of Object.entries(indices)) {
    const arquivo = path.join(outputDir, `${nome}.json`);
    fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2), 'utf8');
    console.log(`✓ Criado: ${nome}.json (${dados.length} itens)`);
  }
}

// Função para criar arquivo de estatísticas
function createStatsFile(indices, totalQuestoes, outputDir) {
  const { bancas, anos, disciplinas, orgaos, cargos, assuntos } = indices;
  
  const stats = {
    totalQuestoes,
    totalBancas: bancas.length,
    totalAnos: anos.length,
    totalDisciplinas: disciplinas.length,
    totalOrgaos: orgaos.length,
    totalCargos: cargos.length,
    totalAssuntos: assuntos.length,
    atualizadoEm: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'stats.json'), 
    JSON.stringify(stats, null, 2), 
    'utf8'
  );
  
  return stats;
}

// Função principal para processar todos os chunks
function processChunks() {
  const chunksDir = path.join(__dirname, '..', 'chunks');
  const publicDataDir = path.join(__dirname, '..', 'public', 'data', 'indices');
  
  // Criar diretório se não existir
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }
  
  // Inicializar coletores de dados
  const dataCollectors = {
    bancas: new Set(),
    anos: new Set(),
    disciplinas: new Set(),
    orgaos: new Set(),
    cargos: new Set(),
    assuntos: new Set()
  };
  
  // Ler todos os arquivos de chunk
  const chunkFiles = fs.readdirSync(chunksDir).filter(file => file.endsWith('.json'));
  console.log(`Processando ${chunkFiles.length} arquivos de chunk...`);
  
  let totalQuestoes = 0;
  
  // Processar cada arquivo
  for (const file of chunkFiles) {
    try {
      const filePath = path.join(chunksDir, file);
      const questoesCount = processChunkFile(filePath, dataCollectors);
      totalQuestoes += questoesCount;
      console.log(`Processado: ${file} (${questoesCount} questões)`);
    } catch (error) {
      console.error(`Erro ao processar ${file}:`, error.message);
    }
  }
  
  // Converter e ordenar dados
  const indices = convertSetsToArrays(dataCollectors);
  
  // Salvar arquivos
  saveIndicesToFiles(indices, publicDataDir);
  const stats = createStatsFile(indices, totalQuestoes, publicDataDir);
  
  // Exibir estatísticas
  console.log('\n📊 Estatísticas:');
  console.log(`Total de questões: ${totalQuestoes.toLocaleString()}`);
  console.log(`Bancas: ${stats.totalBancas}`);
  console.log(`Anos: ${stats.totalAnos} (${Math.min(...indices.anos)} - ${Math.max(...indices.anos)})`);
  console.log(`Disciplinas: ${stats.totalDisciplinas}`);
  console.log(`Órgãos: ${stats.totalOrgaos}`);
  console.log(`Cargos: ${stats.totalCargos}`);
  console.log(`Assuntos: ${stats.totalAssuntos}`);
  console.log('\n✅ Todos os índices foram gerados com sucesso!');
  
  return indices;
}

// Executar o processamento
processChunks();

export { processChunks };
