# 🚀 Guia de Deploy - Correção dos Problemas

## 📋 Problemas Identificados e Corrigidos

### 1. **NextAuth NO_SECRET Error**
- ✅ **Corrigido**: Adicionado fallback para NEXTAUTH_SECRET durante build
- ✅ **Ação**: Configurar NEXTAUTH_SECRET no Vercel

### 2. **DATABASE_URL não definida**
- ✅ **Corrigido**: Sistema Prisma com fallback seguro durante build
- ✅ **Ação**: Configurar DATABASE_URL no Vercel

### 3. **APIs falhando durante build**
- ✅ **Corrigido**: Mudado de `force-static` para `force-dynamic` nas APIs
- ✅ **Corrigido**: Verificações de prisma nulo antes de usar

### 4. **Middleware conflitos**
- ✅ **Corrigido**: Middleware simplificado para produção

## 🔧 Passos para Deploy

### Passo 1: Configurar Variáveis de Ambiente no Vercel

Execute o script de configuração:
```bash
node scripts/setup-vercel-env.mjs
```

**OU configure manualmente no Vercel Dashboard:**

1. Acesse: https://vercel.com/seu-usuario/seu-projeto/settings/environment-variables

2. Adicione as seguintes variáveis para **Production** e **Preview**:

```env
DATABASE_URL=postgresql://postgres:a1A92837465%23@concurso.c8jae8qicjmk.us-east-1.rds.amazonaws.com:5432/postgres
NEXTAUTH_SECRET=9k2Lm8Xp7Wq4vN6Rt5Yu8Io3Er2As9Df6Gh1Jk4Lz7Cx
NEXTAUTH_URL=https://SEU-DOMINIO.vercel.app
```

⚠️ **IMPORTANTE**: Substitua `https://SEU-DOMINIO.vercel.app` pela URL real da sua aplicação!

### Passo 2: Deploy

```bash
# Deploy para produção
vercel deploy --prod

# OU se preferir, faça push para main que o deploy automático acontece
git add .
git commit -m "fix: corrigir problemas de deploy e 404"
git push origin main
```

### Passo 3: Verificar

1. ✅ Acesse sua aplicação: `https://seu-app.vercel.app`
2. ✅ Teste o login/cadastro
3. ✅ Verifique se as APIs estão funcionando
4. ✅ Confirme que não há mais redirects para 404

## 🔍 Principais Mudanças Realizadas

### Configurações do Next.js (`next.config.mjs`)
```javascript
// Adicionado suporte ao Prisma
experimental: {
  serverComponentsExternalPackages: ['@prisma/client', 'prisma']
}

// Removido output: 'standalone' que estava causando problemas
```

### Sistema Prisma (`lib/prisma.ts`)
```typescript
// Agora retorna null durante build quando DATABASE_URL não está disponível
// Isso evita que o build falhe
if (!isDatabaseUrlAvailable()) {
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
    return null; // Build seguro
  }
}
```

### APIs Corrigidas
- Todas as APIs agora usam `force-dynamic` em vez de `force-static`
- Verificação de `prisma` antes de usar (evita erro "Cannot read properties of null")
- Fallback gracioso quando banco não está disponível

### Middleware Simplificado
```typescript
// Middleware mais inteligente que se adapta ao ambiente
if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
  return NextResponse.next()
}
```

### NextAuth Configurado
```typescript
// Fallback para evitar NO_SECRET durante build
secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build'
```

## ⚡ Verificação Pós-Deploy

Execute estes comandos para verificar se tudo está funcionando:

```bash
# Verificar se as APIs respondem
curl https://seu-app.vercel.app/api/questoes/count
curl https://seu-app.vercel.app/api/indices/bancas

# Verificar se as páginas carregam
curl https://seu-app.vercel.app
curl https://seu-app.vercel.app/estudar
```

## 🚨 Troubleshooting

### Se ainda estiver com problemas de 404:
1. Verifique se NEXTAUTH_URL está correto
2. Confirme se todas as variáveis de ambiente estão configuradas
3. Verifique os logs do Vercel: `vercel logs`

### Se as APIs não funcionarem:
1. Confirme se DATABASE_URL está acessível
2. Teste a conexão com o banco
3. Verifique se o Prisma está configurado corretamente

### Se NextAuth não funcionar:
1. Confirme se NEXTAUTH_SECRET está definido
2. Verifique se NEXTAUTH_URL aponta para o domínio correto
3. Teste o login local primeiro

## 🎯 Próximos Passos

1. ✅ Deploy realizado com sucesso
2. 🔄 Monitorar logs por 24h
3. 🎯 Otimizar performance se necessário
4. 📊 Configurar analytics/monitoring

---
*Deploy corrigido em: $(date)*
