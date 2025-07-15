#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Build para Vercel iniciado...');

// Verificar se estamos no ambiente Vercel
const isVercel = process.env.VERCEL === '1';
console.log(`🔍 Ambiente: ${isVercel ? 'Vercel' : 'Local'}`);

try {
  // Criar apenas estrutura mínima necessária para o build
  const publicDataDir = path.join(__dirname, '../public/data');
  
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
    console.log('📁 Diretório public/data criado');
  }
  
  console.log('✅ Preparação simplificada concluída - dados dinâmicos via Prisma!');
} catch (error) {
  console.error('❌ Erro durante a preparação:', error);
  // Não falhar o build se a preparação falhar
  console.log('⚠️  Continuando o build sem otimizações...');
}
