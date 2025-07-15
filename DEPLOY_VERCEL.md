# Guia de Deploy na Vercel - ATUALIZADO

## ✅ Configuração Otimizada

O `vercel.json` foi otimizado com as seguintes melhorias:
- **Região**: Configurada para `iad1` (US East) para melhor performance com AWS RDS
- **Memória**: Aumentada para 1024MB nas funções API
- **Cache**: Headers otimizados para APIs
- **Build**: Variáveis de ambiente configuradas para evitar erros

## 🔧 Configuração de Variáveis de Ambiente

Para fazer o deploy deste projeto na Vercel, você precisa configurar as seguintes variáveis de ambiente no dashboard da Vercel:

### Variáveis Obrigatórias

1. **DATABASE_URL**
   - Valor: `postgresql://postgres:a1A92837465%23@concurso.c8jae8qicjmk.us-east-1.rds.amazonaws.com:5432/postgres`
   - Descrição: URL de conexão com o banco PostgreSQL na AWS RDS
   - ⚠️ **IMPORTANTE**: Use exatamente este valor com `%23` (URL encoded para `#`)

2. **NEXTAUTH_SECRET**
   - Valor: `9k2Lm8Xp7Wq4vN6Rt5Yu8Io3Er2As9Df6Gh1Jk4Lz7Cx`
   - Descrição: Chave secreta para o NextAuth.js

3. **NEXTAUTH_URL**
   - Valor: `https://seu-dominio.vercel.app` (substitua pelo seu domínio)
   - Descrição: URL base da aplicação em produção

### Configuração Passo a Passo na Vercel

1. Acesse o dashboard da Vercel
2. Vá para o seu projeto
3. Clique em **Settings** → **Environment Variables**
4. Para cada variável:
   - Clique em **"Add New"**
   - Digite o **Name** (ex: `DATABASE_URL`)
   - Cole o **Value** correspondente
   - Selecione todos os ambientes: **Production**, **Preview**, **Development**
   - Clique em **Save**

## 🚀 Deploy Instructions

### Commit Reference para Deploy

Use uma dessas opções no campo "Commit or Branch Reference":

**Opção 1 - Branch principal:**
```
main
```

**Opção 2 - Commit mais recente:**
```
HEAD
```

**Opção 3 - URL completa:**
```
https://github.com/leonardo-creator/questoes-concurso-aws/tree/main
```

### Build Commands

O `vercel.json` já está configurado com:
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Framework**: Next.js (detectado automaticamente)

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique:

1. **Database Connection**: 
   - Acesse `/api/questoes/count` para testar a conexão
   - Deve retornar um número > 0

2. **Authentication**: 
   - Acesse `/auth/signin` para testar o NextAuth
   - Deve carregar sem erros

3. **APIs Performance**:
   - APIs configuradas com cache de 60s e 1024MB de memória
   - Timeout de 30s para operações complexas

## 🛠️ Troubleshooting

### Erro "DATABASE_URL not found"
- ✅ **Solução**: Verifique se a variável foi adicionada corretamente no dashboard
- ✅ **Verificação**: Acesse Settings → Environment Variables na Vercel

### Erro de Build/Timeout
- ✅ **Solução**: O `vercel.json` já inclui `SKIP_ENV_VALIDATION=true`
- ✅ **Memória**: Funções configuradas com 1024MB

### Erro de Conexão com Banco
- ✅ **Verificação**: Confirme que o RDS está acessível publicamente
- ✅ **String**: Use exatamente a string com `%23` no lugar de `#`

## 📊 Performance

- **Região**: US East (iad1) - mesma região do RDS AWS
- **Cache**: APIs com cache inteligente (60s + stale-while-revalidate)
- **Memory**: 1024MB para funções pesadas
- **Timeout**: 30s para consultas complexas
