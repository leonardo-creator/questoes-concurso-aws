#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Analisar estrutura dos primeiros 3 objetos do chunk para entender os campos
const chunksDir = path.join(projectRoot, 'chunks');
const firstChunk = path.join(chunksDir, 'batch_001.json');

if (fs.existsSync(firstChunk)) {
  const data = JSON.parse(fs.readFileSync(firstChunk, 'utf8'));
  
  console.log('📊 Estrutura dos dados (primeiros 3 objetos):');
  
  for (let i = 0; i < Math.min(3, data.length); i++) {
    console.log(`\n=== Objeto ${i + 1} ===`);
    console.log('Campos disponíveis:', Object.keys(data[i]));
    console.log('Exemplo de dados:');
    
    const obj = data[i];
    for (const [key, value] of Object.entries(obj)) {
      const displayValue = typeof value === 'string' ? 
        value.substring(0, 100) + (value.length > 100 ? '...' : '') : 
        value;
      console.log(`  ${key}: ${JSON.stringify(displayValue)}`);
    }
  }
  
  // Estatísticas dos campos
  console.log('\n📈 Estatísticas dos campos:');
  const fieldStats = {};
  
  const sampleSize = Math.min(1000, data.length);
  for (let i = 0; i < sampleSize; i++) {
    const obj = data[i];
    for (const key of Object.keys(obj)) {
      if (!fieldStats[key]) {
        fieldStats[key] = { count: 0, hasValue: 0, examples: [] };
      }
      fieldStats[key].count++;
      if (obj[key] && obj[key] !== '' && obj[key] !== null && obj[key] !== undefined) {
        fieldStats[key].hasValue++;
        if (fieldStats[key].examples.length < 3) {
          fieldStats[key].examples.push(obj[key]);
        }
      }
    }
  }
  
  for (const [field, stats] of Object.entries(fieldStats)) {
    const percentage = ((stats.hasValue / stats.count) * 100).toFixed(1);
    console.log(`  ${field}: ${percentage}% preenchido (${stats.hasValue}/${stats.count})`);
    if (stats.examples.length > 0) {
      console.log(`    Exemplos: ${stats.examples.slice(0, 2).map(e => JSON.stringify(e)).join(', ')}`);
    }
  }
}
