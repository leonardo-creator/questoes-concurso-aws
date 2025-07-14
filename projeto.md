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
│   ├── cadernos/          # Página de navegação de cadernos
│   └── estudar/           # Páginas de estudo
├── components/            # Componentes React reutilizáveis
├── chunks/                # Arquivos JSON com questões (168 batches)
├── lib/                   # Utilitários e configurações
├── prisma/                # Schema e migrações do banco
├── public/
│   └── data/
│       └── indices/       # Arquivos JSON de índices gerados
├── scripts/               # Scripts de processamento de dados
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
- [x] **Página de Cadernos** (/cadernos) com navegação por categorias
- [x] **Índices de Dados**: Geração automatizada de arquivos JSON com:
  - 491 bancas organizadoras
  - 28 anos (1998-2025)
  - 627 disciplinas
  - 4.910 órgãos
  - 20.457 cargos
  - 70.350 assuntos únicos
- [x] **Processamento de Dados**: Script para extrair dados únicos de 3.2M+ questões
- [x] **Interface Responsiva**: Design otimizado para mobile e desktop

## Problemas Resolvidos Recentemente
- **JWT Decryption Error**: Configurado NEXTAUTH_SECRET para resolver erro de descriptografia
- **Git Lock Issue**: Removido arquivo .git/index.lock que bloqueava operações Git
- **Security**: Atualizado .gitignore para proteger arquivos sensíveis
- **404 Errors**: 
  - Criada página `/cadernos` que estava gerando 404
  - Gerados arquivos JSON de índices em `/data/indices/` que estavam ausentes
  - Processados 168 arquivos de chunks para extrair 3.218.880 questões
- **Data Processing**: Implementado script de geração de índices automatizada
- **Performance**: Arquivos estáticos para rápido carregamento de dados de filtros

## Próximos Passos
- Implementar sistema de favoritos e listas pessoais
- Adicionar estatísticas de desempenho do usuário
- Criar sistema de simulados personalizados
- Implementar busca full-text nas questões
- Adicionar testes automatizados
- Melhorar SEO e performance (Core Web Vitals)
- Implementar cache Redis para otimização

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
