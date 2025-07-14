import fs from 'fs';
import path from 'path';

/**
 * Script para testar a busca hierárquica
 */
function testHierarchicalSearch() {
  console.log('🧪 Testando busca hierárquica...');
  
  // Carregar busca hierárquica
  const buscaPath = path.join(process.cwd(), 'public/data/indices/busca-hierarquica.json');
  
  if (!fs.existsSync(buscaPath)) {
    console.error('❌ Arquivo busca-hierarquica.json não encontrado');
    return;
  }

  const busca = JSON.parse(fs.readFileSync(buscaPath, 'utf8'));
  
  // Teste 1: Verificar se códigos hierárquicos estão funcionando
  console.log('\n📊 Teste 1: Códigos Hierárquicos');
  
  // Testar código "1.1" (Noções Gerais sobre a Administração de Materiais)
  const codigo11 = busca.buscaHierarquica['1.1'];
  if (codigo11) {
    console.log(`✅ Código 1.1 encontrado:`);
    console.log(`   - Próprio: ${codigo11.proprio}`);
    console.log(`   - Filhos: ${codigo11.filhos.slice(0, 5).join(', ')}${codigo11.filhos.length > 5 ? '...' : ''}`);
    console.log(`   - Total incluindo filhos: ${codigo11.todos.length}`);
  } else {
    console.log('❌ Código 1.1 não encontrado');
  }

  // Teste 2: Verificar disciplinas
  console.log('\n📚 Teste 2: Disciplinas');
  const disciplinas = Object.keys(busca.disciplinas).slice(0, 3);
  disciplinas.forEach(disc => {
    const assuntos = busca.disciplinas[disc].assuntos;
    console.log(`✅ ${disc}: ${assuntos.length} assuntos`);
    
    // Mostrar alguns assuntos de diferentes níveis
    const nivel1 = assuntos.filter(a => a.nivel === 1).length;
    const nivel2 = assuntos.filter(a => a.nivel === 2).length;
    const nivel3 = assuntos.filter(a => a.nivel === 3).length;
    console.log(`   - Nível 1: ${nivel1}, Nível 2: ${nivel2}, Nível 3: ${nivel3}`);
  });

  // Teste 3: Verificar questões existentes com códigos
  console.log('\n🔍 Teste 3: Verificar dados das questões');
  
  // Carregar algumas questões para verificar se os códigos batem
  const chunksDir = path.join(process.cwd(), 'chunks');
  const firstChunk = path.join(chunksDir, 'batch_001.json');
  
  if (fs.existsSync(firstChunk)) {
    const questoes = JSON.parse(fs.readFileSync(firstChunk, 'utf8'));
    const codigosEncontrados = new Set();
    
    questoes.slice(0, 100).forEach(q => {
      if (q.codigo_real && q.codigo_real.match(/^\d+(\.\d+)*$/)) {
        codigosEncontrados.add(q.codigo_real);
      }
    });

    console.log(`✅ Códigos válidos encontrados nas questões: ${codigosEncontrados.size}`);
    
    // Verificar se alguns códigos das questões existem na hierarquia
    let codigosComHierarquia = 0;
    codigosEncontrados.forEach(codigo => {
      if (busca.buscaHierarquica[codigo]) {
        codigosComHierarquia++;
      }
    });
    
    console.log(`✅ Códigos com hierarquia mapeada: ${codigosComHierarquia}/${codigosEncontrados.size}`);
    
    // Mostrar alguns exemplos
    console.log('\n📝 Exemplos de mapeamento:');
    Array.from(codigosEncontrados).slice(0, 5).forEach(codigo => {
      const assunto = busca.codigoParaAssunto[codigo];
      const hierarquia = busca.buscaHierarquica[codigo];
      
      if (assunto) {
        console.log(`   ${codigo} → "${assunto}"`);
        if (hierarquia && hierarquia.filhos.length > 0) {
          console.log(`     └─ ${hierarquia.filhos.length} filhos`);
        }
      }
    });
  }

  console.log('\n✅ Teste da busca hierárquica concluído!');
}

// Executar teste
testHierarchicalSearch();
