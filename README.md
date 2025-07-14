<<<<<<< HEAD
# 📚 Sistema de Questões de Concurso - Alta Performance

Uma aplicação web de alta performance para resolução de questões de concurso, construída com Next.js 15, projetada para ser extremamente rápida, funcionar offline e contornar limitações de tempo de execução.

## 🚀 Características Principais

### ⚡ Performance Otimizada
- **Estratégia de Build Inteligente**: Questões são pré-processadas durante o build
- **Manifesto Otimizado**: Metadados separados para filtragem ultra-rápida
- **Paginação Eficiente**: Carregamento apenas das questões necessárias
- **Cache Estratégico**: Service Worker com cache inteligente

### 🔄 Funcionalidade Offline (PWA)
- **Progressive Web App**: Instalável e funciona offline
- **Sincronização Automática**: Dados offline sincronizados ao reconectar
- **IndexedDB**: Armazenamento local das ações do usuário

### 👥 Multi-usuário
- **Autenticação NextAuth**: Suporte a múltiplos provedores
- **Dados Isolados**: Progresso e listas separados por usuário
- **Segurança**: Validação de sessão em todas as APIs

### 📋 Funcionalidades Avançadas
- **Cadernos Personalizados**: Criação e gerenciamento de listas de questões
- **Filtros Inteligentes**: Por disciplina, banca, ano, status, etc.
- **Histórico de Respostas**: Tracking completo do progresso
- **Análise de Performance**: Estatísticas detalhadas

## 🏗️ Arquitetura

### Estrutura de Dados
```
/public/data/
├── manifest.json              # Metadados de todas as questões
├── questoes/
│   ├── Q123456.json          # Questão individual
│   └── Q789012.json          # Questão individual
└── indices/
    ├── disciplinas.json      # Índice de disciplinas
    ├── bancas.json          # Índice de bancas
    └── anos.json            # Índice de anos
```

### Fluxo de Build
1. **Script de Processamento** (`/scripts/process-questoes.mjs`)
   - Lê arquivos JSON da pasta `/chunks/`
   - Gera manifesto com metadados
   - Cria arquivos individuais por questão
   - Gera índices para filtros

2. **Otimização durante Build**
   - Executado automaticamente no `next build`
   - Pré-processamento de dados massivos
   - Criação de estrutura otimizada

### API Strategy
- **GET /api/questoes**: Filtros e paginação baseados no manifesto
- **POST /api/user/answers**: Salvar respostas do usuário
- **GET /api/user/lists**: Gerenciar cadernos personalizados

## 🛠️ Tecnologias

- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Autenticação**: NextAuth.js
- **Banco de Dados**: PostgreSQL (Vercel Postgres)
- **ORM**: Prisma
- **Estilização**: Tailwind CSS
- **PWA**: next-pwa
- **Deploy**: Vercel

## 📦 Instalação e Configuração

### 1. Clone e Instale Dependências
```bash
git clone <repositorio>
 cd concurso-otimizado
npm install
```

### 2. Configure Variáveis de Ambiente
```bash
cp .env.example .env
```

Configure as seguintes variáveis no `.env`:
```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers (opcional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### 3. Configure o Banco de Dados
```bash
npx prisma generate
npx prisma db push
```

### 4. Processe as Questões
```bash
# Coloque seus arquivos JSON na pasta /chunks/
node scripts/process-questoes.mjs
```

### 5. Execute o Projeto
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 📊 Estrutura do Banco de Dados

### Modelos Principais

#### User
```sql
- id: String (cuid)
- email: String (unique)
- name: String?
- createdAt: DateTime
- updatedAt: DateTime
```

#### Answer
```sql
- id: String (cuid)
- userId: String
- questaoCodigoReal: String
- alternativaSelecionada: String
- acertou: Boolean
- tempoResposta: Int?
- createdAt: DateTime
- updatedAt: DateTime
```

#### CustomList (Cadernos)
```sql
- id: String (cuid)
- userId: String
- nome: String
- descricao: String?
- questionCodes: String[]
- createdAt: DateTime
- updatedAt: DateTime
```

## 🔧 Configuração Avançada

### Performance do Build
O sistema processa automaticamente arquivos JSON grandes durante o build:

1. **Coloque os dados** na pasta `/chunks/` (arquivos .json)
2. **Execute o build** com `npm run build`
3. **O script processa automaticamente** todos os dados

### Configuração PWA
O service worker é configurado automaticamente com:
- Cache de app shell
- Cache de dados estáticos
- Sincronização offline
- Atualizações automáticas

### Filtros Personalizados
```typescript
interface FiltroQuestoes {
  disciplinas?: string[];
  bancas?: string[];
  anos?: number[];
  dificuldade?: 'Fácil' | 'Média' | 'Difícil';
  apenas_nao_respondidas?: boolean;
  apenas_erradas?: boolean;
  apenas_certas?: boolean;
  caderno_id?: string;
  codigo_questoes?: string[];
}
```

## 🚀 Deploy

### Vercel (Recomendado)
```bash
# Instale a CLI da Vercel
npm i -g vercel

# Deploy
vercel --prod
```

### Configurações de Environment
- Configure todas as variáveis de ambiente no painel da Vercel
- O banco de dados será criado automaticamente (Vercel Postgres)
- O build process executará automaticamente o script de processamento

## 🎯 Funcionalidades Detalhadas

### Página de Estudos
- **Interface Responsiva**: Funciona em desktop e mobile
- **Filtros Avançados**: Múltiplos critérios simultâneos
- **Navegação Rápida**: Entre questões sem recarregar
- **Estado Persistente**: Filtros salvos entre sessões

### Cadernos Personalizados
- **Criação Dinâmica**: Interface para criar listas
- **Importação em Massa**: Cole códigos de questões
- **Compartilhamento**: URLs diretas para cadernos
- **Organização**: Categorize por tema ou dificuldade

### Sistema de Progresso
- **Tracking Completo**: Todas as respostas são salvas
- **Estatísticas**: Percentual de acertos por disciplina
- **Histórico**: Visualize progresso ao longo do tempo
- **Análise**: Identifique pontos de melhoria

## 🔍 Monitoramento e Debug

### Logs de Performance
O sistema registra automaticamente:
- Tempo de carregamento de questões
- Performance da API
- Erros de sincronização offline
- Estatísticas de uso

### Debug Mode
```bash
DEBUG=1 npm run dev
```

## 📈 Otimizações Implementadas

### 1. Estratégia de Cache
- **Build-time**: Pré-processamento de dados
- **Runtime**: Cache em memória da API
- **Browser**: Service Worker para assets

### 2. Lazy Loading
- **Questões**: Carregadas sob demanda
- **Imagens**: Lazy loading automático
- **Componentes**: Code splitting automático

### 3. Compressão
- **Gzip**: Automático no Vercel
- **Minificação**: Assets otimizados
- **Tree Shaking**: Código não utilizado removido

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para dúvidas e suporte:
- Abra uma issue no GitHub
- Entre em contato via email

---

**Desenvolvido com ❤️ para otimizar seus estudos para concursos!**
=======
# questoes-concurso-aws
>>>>>>> 7c3461a415b077e0d6fa0eedd4c22600d6398e27
