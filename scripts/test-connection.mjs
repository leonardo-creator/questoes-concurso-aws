#!/usr/bin/env node
/**
 * Teste de conexão com PostgreSQL AWS RDS
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 Testando conexão com PostgreSQL AWS RDS...');
    
    await prisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Testar uma query simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query de teste executada:', result);
    
    // Verificar se as tabelas existem
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📋 Tabelas encontradas:', tables);
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
