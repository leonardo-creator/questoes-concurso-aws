# Projeto - Sistema de Questões de Concurso

## Visão Geral
Sistema web desenvolvido em Next.js 15 para gerenciamento e estudo de questões de concursos públicos, com autenticação via NextAuth e banco de dados PostgreSQL via Prisma.

## Tecnologias Principais
- **Framework**: Next.js 15 (App Router)
- **ORM**: Prisma
- **Banco de Dados**: PostgreSQL (Neon)
- **Autenticação**: NextAuth.js
- **Estilização**: Tailwind CSS
- **Linguagem**: TypeScript

## Estrutura do Projeto
```
├── app/                    # App Router do Next.js 15
│   ├── api/               # API Routes
│   │   ├── auth/          # Rotas de autenticação
│   │   └── questoes/      # API de questões
│   ├── auth/              # Páginas de autenticação
│   └── estudar/           # Páginas de estudo
├── components/            # Componentes React reutilizáveis
├── lib/                   # Utilitários e configurações
├── prisma/                # Schema e migrações do banco
├── types/                 # Definições TypeScript
└── memory-bank/           # Documentação e contexto do projeto
```

## Configurações de Ambiente
- `DATABASE_URL`: String de conexão PostgreSQL
- `NEXTAUTH_SECRET`: Chave secreta para criptografia JWT (32 bytes)
- `NEXTAUTH_URL`: URL base da aplicação

## Funcionalidades Implementadas
- [x] Autenticação com credenciais
- [x] Sistema de sessão JWT
- [x] API de questões com paginação
- [x] Filtros avançados de questões
- [x] Interface de estudo

## Problemas Resolvidos Recentemente
- **JWT Decryption Error**: Configurado NEXTAUTH_SECRET para resolver erro de descriptografia
- **Git Lock Issue**: Removido arquivo .git/index.lock que bloqueava operações Git
- **Security**: Atualizado .gitignore para proteger arquivos sensíveis

## Próximos Passos
- Implementar sistema de cadernos de questões
- Adicionar estatísticas de desempenho
- Melhorar interface responsiva
- Adicionar testes automatizados

## Comandos Úteis
```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Prisma
npx prisma generate
npx prisma db push

# Testes
npm test
```

## Notas de Segurança
- Todas as variáveis de ambiente estão protegidas no .gitignore
- Senhas são criptografadas com bcrypt
- Autenticação baseada em JWT com secret seguro
- Validação de entrada em todas as APIs
