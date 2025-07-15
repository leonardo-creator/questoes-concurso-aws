# Guia de Deploy na Vercel

## Configuração de Variáveis de Ambiente

Para fazer o deploy deste projeto na Vercel, você precisa configurar as seguintes variáveis de ambiente no dashboard da Vercel:

### Variáveis Obrigatórias

1. **DATABASE_URL**
   - Valor: `postgresql://postgres:a1A92837465%23@concurso.c8jae8qicjmk.us-east-1.rds.amazonaws.com:5432/postgres`
   - Descrição: URL de conexão com o banco PostgreSQL na AWS RDS

2. **NEXTAUTH_SECRET**
   - Valor: `9k2Lm8Xp7Wq4vN6Rt5Yu8Io3Er2As9Df6Gh1Jk4Lz7Cx`
   - Descrição: Chave secreta para o NextAuth.js

3. **NEXTAUTH_URL**
   - Valor: `https://seu-dominio.vercel.app` (substitua pelo seu domínio)
   - Descrição: URL base da aplicação em produção

### Como Configurar na Vercel

1. Acesse o dashboard da Vercel
2. Vá para o seu projeto
3. Clique em "Settings" → "Environment Variables"
4. Adicione cada variável acima com seus respectivos valores
5. Certifique-se de marcar para todos os ambientes (Production, Preview, Development)

### Verificação

Após configurar as variáveis, faça um novo deploy para que as mudanças tenham efeito.

## Troubleshooting

- Se ainda houver erros relacionados ao banco, verifique se a string de conexão está correta
- Certifique-se de que o banco AWS RDS está acessível publicamente
- Verifique se o usuário e senha do banco estão corretos

## Comandos Úteis

```bash
# Gerar o cliente Prisma
npm run db:generate

# Verificar conexão com o banco
npm run db:check

# Fazer push do schema para o banco
npm run db:push
```
