#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔧 Executando postinstall: Gerando Prisma Client...');

function execCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });

    process.on('error', reject);
  });
}

async function generatePrismaClient() {
  try {
    await execCommand('npx', ['prisma', 'generate']);
    console.log('✅ Prisma Client gerado com sucesso');
  } catch (error) {
    console.error('❌ Erro na geração do Prisma Client:', error.message);
    // Em ambiente de produção, não falhar se não conseguir gerar o Prisma Client
    // pois pode não ter acesso ao banco de dados
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Continuando build em produção sem Prisma Client');
    } else {
      throw error;
    }
  }
}

// Executar apenas se há um schema.prisma
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');

if (fs.existsSync(schemaPath)) {
  generatePrismaClient();
} else {
  console.log('ℹ️  Schema do Prisma não encontrado, pulando geração do client');
}
