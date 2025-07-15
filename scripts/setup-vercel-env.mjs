#!/usr/bin/env node

/**
 * Script para configurar variáveis de ambiente no Vercel
 * Execute: node scripts/setup-vercel-env.mjs
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Ler variáveis do arquivo .env.local
function loadEnvVariables() {
  try {
    const envContent = readFileSync('.env.local', 'utf8');
    const variables = {};
    
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']/, '').replace(/["']$/, '');
          variables[key.trim()] = value;
        }
      }
    });
    
    return variables;
  } catch (error) {
    console.error('Erro ao ler .env.local:', error.message);
    return {};
  }
}

// Configurar variáveis no Vercel
function setupVercelEnvironment() {
  const variables = loadEnvVariables();
  
  console.log('🚀 Configurando variáveis de ambiente no Vercel...\n');
  
  const envVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET', 
    'NEXTAUTH_URL'
  ];
  
  envVars.forEach(varName => {
    if (variables[varName]) {
      try {
        // Configurar para produção
        const prodCommand = `vercel env add ${varName} production`;
        console.log(`⚙️  Configurando ${varName} para produção...`);
        execSync(prodCommand, { 
          input: variables[varName],
          stdio: ['pipe', 'inherit', 'inherit'] 
        });
        
        // Configurar para preview
        const previewCommand = `vercel env add ${varName} preview`;
        console.log(`⚙️  Configurando ${varName} para preview...`);
        execSync(previewCommand, { 
          input: variables[varName],
          stdio: ['pipe', 'inherit', 'inherit'] 
        });
        
      } catch (error) {
        console.error(`❌ Erro ao configurar ${varName}:`, error.message);
      }
    } else {
      console.warn(`⚠️  Variável ${varName} não encontrada em .env.local`);
    }
  });
  
  // Configurar NEXTAUTH_URL para produção (deve ser o domínio da aplicação)
  try {
    console.log('\n📝 Configurando NEXTAUTH_URL para produção...');
    console.log('💡 IMPORTANTE: Você precisa definir a URL de produção manualmente no Vercel!');
    console.log('   Exemplo: https://seu-app.vercel.app');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  console.log('\n✅ Configuração concluída!');
  console.log('\n📋 Próximos passos:');
  console.log('   1. Atualize NEXTAUTH_URL no Vercel com sua URL de produção');
  console.log('   2. Execute: vercel deploy --prod');
  console.log('   3. Verifique se todas as variáveis estão corretas em vercel.com');
}

// Executar configuração
setupVercelEnvironment();
