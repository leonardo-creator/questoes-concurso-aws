#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🚀 Iniciando build completo para deploy...');

// Função para executar comando de forma segura
function execCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`▶️  Executando: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot,
      ...options
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

// Função para limpar ambiente de build
async function cleanBuildEnvironment() {
  console.log('🧹 Limpando ambiente de build...');
  
  try {
    // Finalizar processos Node.js que possam estar bloqueando arquivos
    await execCommand('taskkill', ['/f', '/im', 'node.exe'], { stdio: 'pipe' }).catch(() => {
      // Ignorar erro se não houver processos para finalizar
    });
    
    // Aguardar um momento para os processos serem finalizados
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Remover diretórios de build
    const dirsToRemove = ['.next', 'dist', 'build'];
    
    for (const dir of dirsToRemove) {
      const dirPath = path.join(projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`   Removendo ${dir}/`);
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
        } catch (error) {
          console.log(`   ⚠️  Aviso: Não foi possível remover ${dir}/ - ${error.message}`);
        }
      }
    }
    
    console.log('✅ Ambiente limpo');
  } catch (error) {
    console.log(`⚠️  Aviso durante limpeza: ${error.message}`);
  }
}

// Função para converter chunks em arquivos individuais
async function convertToIndividualFiles() {
  console.log('📁 Convertendo chunks para arquivos individuais...');
  
  try {
    await execCommand('node', [
      '--max-old-space-size=512',
      '--expose-gc',
      'scripts/convert-to-individual-files.mjs'
    ]);
    
    console.log('✅ Conversão para arquivos individuais concluída');
  } catch (error) {
    console.error('❌ Erro na conversão para arquivos individuais:', error.message);
    throw error;
  }
}

// Função para gerar o Prisma Client
async function generatePrismaClient() {
  console.log('🔧 Gerando Prisma Client...');
  
  try {
    await execCommand('npx', ['prisma', 'generate']);
    console.log('✅ Prisma Client gerado com sucesso');
  } catch (error) {
    console.error('❌ Erro na geração do Prisma Client:', error.message);
    throw error;
  }
}

// Função para executar o build otimizado
async function runOptimizedBuild() {
  console.log('📦 Executando processamento otimizado de chunks...');
  
  try {
    await execCommand('node', [
      '--max-old-space-size=512',
      '--expose-gc',
      'scripts/build-optimized.mjs'
    ]);
    
    console.log('✅ Processamento de chunks concluído');
  } catch (error) {
    console.error('❌ Erro no processamento de chunks:', error.message);
    throw error;
  }
}

// Função para executar o build do Next.js
async function runNextBuild() {
  console.log('🏗️  Executando build do Next.js...');
  
  try {
    // Definir variável de ambiente para otimização
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    process.env.NODE_ENV = 'production';
    
    await execCommand('npx', [
      'next',
      'build'
    ], {
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=1024'
      }
    });
    
    console.log('✅ Build do Next.js concluído');
  } catch (error) {
    console.error('❌ Erro no build do Next.js:', error.message);
    throw error;
  }
}

// Função para verificar o resultado do build
function verifyBuild() {
  console.log('🔍 Verificando resultado do build...');
  
  const nextDir = path.join(projectRoot, '.next');
  const publicDataDir = path.join(projectRoot, 'public', 'data');
  
  const checks = [
    { path: nextDir, name: 'Diretório .next' },
    { path: path.join(nextDir, 'static'), name: 'Assets estáticos' },
    { path: path.join(publicDataDir, 'manifest.json'), name: 'Manifesto de dados' },
    { path: path.join(publicDataDir, 'indices'), name: 'Índices otimizados' }
  ];
  
  let allChecksPass = true;
  
  for (const check of checks) {
    const exists = fs.existsSync(check.path);
    console.log(`   ${exists ? '✅' : '❌'} ${check.name}`);
    if (!exists) allChecksPass = false;
  }
  
  if (allChecksPass) {
    console.log('🎉 Build verificado com sucesso!');
  } else {
    console.log('⚠️  Alguns arquivos de build estão faltando');
  }
  
  return allChecksPass;
}

// Função principal
async function main() {
  try {
    const startTime = Date.now();
    
    console.log(`🔧 Node.js version: ${process.version}`);
    console.log(`🔧 Platform: ${process.platform}`);
    console.log(`🔧 Working directory: ${projectRoot}`);
    
    // Etapa 1: Limpar ambiente
    await cleanBuildEnvironment();
    
    // Etapa 2: Gerar Prisma Client
    await generatePrismaClient();
    
    // Etapa 3: Converter para arquivos individuais
    await convertToIndividualFiles();
    
    // Etapa 4: Build do Next.js
    await runNextBuild();
    
    // Etapa 5: Verificação
    const buildValid = verifyBuild();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎯 Build completo finalizado em ${duration}s`);
    
    if (buildValid) {
      console.log('🚀 Pronto para deploy!');
      process.exit(0);
    } else {
      console.log('⚠️  Build com avisos - revisar arquivos');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Erro no build completo:', error.message);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
