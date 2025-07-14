#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Iniciando build otimizado (sem JSONs)...');

// Função para executar comando
function execCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`▶️  Executando: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
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

// Função para limpar build anterior
async function cleanPreviousBuild() {
  console.log('🧹 Limpando build anterior...');
  
  try {
    // Finalizar processos Node.js
    await execCommand('taskkill', ['/f', '/im', 'node.exe'], { stdio: 'pipe' }).catch(() => {
      console.log('  ↳ Nenhum processo Node.js para finalizar');
    });
    
    // Aguardar processos finalizarem
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remover .next se existir
    if (fs.existsSync('.next')) {
      await execCommand('rmdir', ['/s', '/q', '.next'], { stdio: 'pipe' }).catch(() => {
        console.log('  ↳ Erro ao remover .next - continuando...');
      });
    }
    
    console.log('✅ Limpeza concluída');
  } catch (error) {
    console.log('⚠️  Erro na limpeza, continuando...', error.message);
  }
}

// Função principal do build
async function buildProject() {
  console.log('🏗️  Executando build do Next.js...');
  
  try {
    // Definir variáveis de ambiente otimizadas
    const env = {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=2048',
      // Desabilitar análise de bundle para acelerar
      ANALYZE: 'false'
    };
    
    await execCommand('npx', ['next', 'build'], { env });
    
    console.log('✅ Build concluído com sucesso!');
    
    // Mostrar estatísticas do build
    if (fs.existsSync('.next')) {
      console.log('📊 Build completado em .next/');
    }
    
  } catch (error) {
    console.error('❌ Erro no build:', error.message);
    throw error;
  }
}

// Executar build completo
async function main() {
  try {
    await cleanPreviousBuild();
    await buildProject();
    
    console.log('🎉 Build otimizado concluído com sucesso!');
    console.log('📦 Projeto pronto para deploy');
    
  } catch (error) {
    console.error('💥 Build falhou:', error.message);
    process.exit(1);
  }
}

main();
