import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Cria um mapa hierárquico de disciplinas e assuntos baseado no arquivo materias_globais.txt
 */
function buildHierarchyMap() {
  const materiasPath = path.join(__dirname, '..', 'materias_globais.txt');
  
  if (!fs.existsSync(materiasPath)) {
    console.error('❌ Arquivo materias_globais.txt não encontrado');
    return null;
  }

  const content = fs.readFileSync(materiasPath, 'utf8');
  const lines = content.split('\n').slice(1); // Remove cabeçalho
  
  const hierarchy = {
    disciplinas: {},
    codigoParaAssunto: {},
    assuntoParaCodigo: {},
    filhosPorCodigo: {},
    paisPorCodigo: {}
  };

  console.log('🔄 Processando hierarquia de matérias...');

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split('\t');
    if (parts.length < 4) continue;

    const [indice, disciplina, codigo, titulo] = parts;
    
    if (!disciplina || !codigo || !titulo) continue;

    // Mapear código para assunto
    hierarchy.codigoParaAssunto[codigo] = titulo.trim();
    hierarchy.assuntoParaCodigo[titulo.trim()] = codigo;

    // Construir estrutura da disciplina
    if (!hierarchy.disciplinas[disciplina]) {
      hierarchy.disciplinas[disciplina] = {
        nome: disciplina,
        assuntos: {},
        codigos: []
      };
    }

    hierarchy.disciplinas[disciplina].codigos.push(codigo);
    hierarchy.disciplinas[disciplina].assuntos[codigo] = titulo.trim();

    // Construir relação pai-filho baseada no código hierárquico
    const codigoParts = codigo.split('.');
    
    // Encontrar código pai (remover último nível)
    if (codigoParts.length > 1) {
      const codigoPai = codigoParts.slice(0, -1).join('.');
      
      // Adicionar relação pai -> filho
      if (!hierarchy.filhosPorCodigo[codigoPai]) {
        hierarchy.filhosPorCodigo[codigoPai] = [];
      }
      if (!hierarchy.filhosPorCodigo[codigoPai].includes(codigo)) {
        hierarchy.filhosPorCodigo[codigoPai].push(codigo);
      }

      // Adicionar relação filho -> pai
      hierarchy.paisPorCodigo[codigo] = codigoPai;
    }
  }

  // Ordenar códigos filhos
  for (const codigoPai in hierarchy.filhosPorCodigo) {
    hierarchy.filhosPorCodigo[codigoPai].sort((a, b) => {
      // Ordenação numérica natural para códigos hierárquicos
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });
  }

  return hierarchy;
}

/**
 * Função recursiva para obter todos os códigos filhos de um código
 */
function getAllChildCodes(codigo, hierarchy) {
  const children = hierarchy.filhosPorCodigo[codigo] || [];
  let allChildren = [...children];
  
  for (const child of children) {
    allChildren = allChildren.concat(getAllChildCodes(child, hierarchy));
  }
  
  return allChildren;
}

/**
 * Cria índice otimizado para busca hierárquica
 */
function createHierarchicalSearchIndex(hierarchy) {
  const searchIndex = {
    codigoParaAssunto: hierarchy.codigoParaAssunto,
    assuntoParaCodigo: hierarchy.assuntoParaCodigo,
    disciplinas: {},
    buscaHierarquica: {}
  };

  // Organizar por disciplina com estrutura hierárquica
  for (const [disciplinaNome, disciplinaData] of Object.entries(hierarchy.disciplinas)) {
    searchIndex.disciplinas[disciplinaNome] = {
      nome: disciplinaNome,
      assuntos: []
    };

    // Organizar assuntos hierarquicamente
    const codigosOrdenados = disciplinaData.codigos.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });

    for (const codigo of codigosOrdenados) {
      const nivel = codigo.split('.').length;
      const titulo = disciplinaData.assuntos[codigo];
      const temFilhos = hierarchy.filhosPorCodigo[codigo]?.length > 0;
      
      searchIndex.disciplinas[disciplinaNome].assuntos.push({
        codigo,
        titulo,
        nivel,
        temFilhos,
        pai: hierarchy.paisPorCodigo[codigo] || null
      });
    }
  }

  // Criar índice de busca hierárquica (código -> todos os códigos filhos)
  for (const codigo of Object.keys(hierarchy.codigoParaAssunto)) {
    const todosFilhos = getAllChildCodes(codigo, hierarchy);
    searchIndex.buscaHierarquica[codigo] = {
      proprio: codigo,
      filhos: todosFilhos,
      todos: [codigo, ...todosFilhos]
    };
  }

  return searchIndex;
}

/**
 * Função principal para gerar hierarquia
 */
function generateHierarchy() {
  console.log('🚀 Iniciando geração de hierarquia de matérias...');
  
  const hierarchy = buildHierarchyMap();
  if (!hierarchy) {
    console.error('❌ Falha ao construir hierarquia');
    return;
  }

  const searchIndex = createHierarchicalSearchIndex(hierarchy);
  
  // Criar diretório de saída
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'indices');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Salvar hierarquia completa
  const hierarchyPath = path.join(outputDir, 'hierarquia.json');
  fs.writeFileSync(hierarchyPath, JSON.stringify(hierarchy, null, 2), 'utf8');
  console.log('✅ Criado: hierarquia.json');

  // Salvar índice de busca otimizado
  const searchIndexPath = path.join(outputDir, 'busca-hierarquica.json');
  fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2), 'utf8');
  console.log('✅ Criado: busca-hierarquica.json');

  // Estatísticas
  const totalDisciplinas = Object.keys(hierarchy.disciplinas).length;
  const totalCodigos = Object.keys(hierarchy.codigoParaAssunto).length;
  const totalRelacoesPaiFilho = Object.keys(hierarchy.filhosPorCodigo).length;

  console.log('\n📊 Estatísticas de Hierarquia:');
  console.log(`Disciplinas: ${totalDisciplinas}`);
  console.log(`Códigos/Assuntos: ${totalCodigos}`);
  console.log(`Relações Pai-Filho: ${totalRelacoesPaiFilho}`);
  
  // Mostrar algumas disciplinas principais
  console.log('\n📚 Disciplinas encontradas:');
  Object.keys(hierarchy.disciplinas).slice(0, 5).forEach(disc => {
    const count = hierarchy.disciplinas[disc].codigos.length;
    console.log(`  • ${disc} (${count} assuntos)`);
  });
  
  if (Object.keys(hierarchy.disciplinas).length > 5) {
    console.log(`  • ... e mais ${Object.keys(hierarchy.disciplinas).length - 5} disciplinas`);
  }

  console.log('\n✅ Hierarquia gerada com sucesso!');
  
  return searchIndex;
}

// Executar se chamado diretamente
generateHierarchy();
