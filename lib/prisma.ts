import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined;
};

// Verificar se DATABASE_URL está disponível
const isDatabaseUrlAvailable = (): boolean => {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.length > 0 && url !== 'undefined');
};

// Configurar Prisma com timeout e retry
const createPrismaClient = () => {
  // Verificar se estamos em um ambiente que requer conexão de banco
  if (!isDatabaseUrlAvailable()) {
    // Durante o build, retornar um client mock para evitar erros
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
      console.warn('DATABASE_URL não encontrada. Retornando cliente mock para build.');
      return null as any;
    }
    
    throw new Error(
      'DATABASE_URL não está definida. Verifique suas variáveis de ambiente.'
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Criar instância do Prisma de forma segura
let prismaInstance: PrismaClient | null = null;

try {
  prismaInstance = globalForPrisma.prisma ?? createPrismaClient();
} catch (error) {
  console.error('Erro ao criar PrismaClient:', error);
  prismaInstance = null;
}

export const prisma = prismaInstance as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaInstance;
}

// Função para garantir conexão
export async function ensurePrismaConnection() {
  try {
    if (!prismaInstance) {
      console.warn('PrismaClient não está disponível');
      return false;
    }
    await prismaInstance.$connect();
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return false;
  }
}

// Função para verificar se o Prisma está disponível
export function isPrismaAvailable(): boolean {
  return prismaInstance !== null && isDatabaseUrlAvailable();
}

// Desconectar quando o processo terminar
process.on('beforeExit', async () => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
  }
});

process.on('SIGINT', async () => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
  }
  process.exit(0);
});
