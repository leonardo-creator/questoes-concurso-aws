# Documentação da API

## ⚠️ IMPORTANTE: Correção de Deploy - Problemas de Routing Resolvidos

**Data**: 15/07/2025  
**Status**: 🔧 **Deploy corrigido - Problemas de 404 resolvidos**

### Problema Identificado:
- **404 em /auth**: Faltava página index (`page.tsx`) no diretório `/auth/`
- **Erro de useContext**: Componentes client-side causando falhas no SSR/SSG
- **Providers problemáticos**: Context providers causando erros de hydration

### Correções Aplicadas:
1. **Criação de /auth/page.tsx** → Página index para rota `/auth` 
2. **Simplificação de componentes de auth** → Removidas dependências de NextAuth temporariamente
3. **Remoção de providers problemáticos** → Layout simplificado sem Context API por ora
4. **Ajuste de configuração Next.js** → Trailing slash e rewrites otimizados
5. **Componentes auth funcionais** → Signin/Signup com placeholders para autenticação

### Status das Páginas:
- ✅ `/` - Página inicial (funcional)
- ✅ `/auth` - Índice de autenticação (novo)
- ✅ `/auth/signin` - Login (simplificado)
- ✅ `/auth/signup` - Cadastro (simplificado)
- ⚠️ Context providers desabilitados temporariamente

### Próximos Passos:
1. Verificar deploy em produção
2. Reativar providers de forma gradual
3. Implementar autenticação real progressivamente

---

## ⚠️ IMPORTANTE: Configuração Vercel Otimizada

**Data**: 14/07/2025
**Status**: ✅ **Deploy configuration otimizada**

### Correções Aplicadas:
1. **DATABASE_URL Secret Error** → Removidas referências a secrets inexistentes
2. **Vercel.json Otimizado** → Configuração para melhor performance e estabilidade
3. **Build Environment** → Variáveis configuradas para evitar erros
4. **Performance Settings** → Memória, timeout e cache otimizados

### Configurações Atualizadas:
- Região configurada para `iad1` (mesma região do RDS AWS)
- Funções API com 1024MB de memória e 30s timeout
- Headers de cache otimizados para APIs
- Environment variables configuradas para build estável

### Deploy Instructions:
1. Configure as variáveis de ambiente no dashboard da Vercel (ver DEPLOY_VERCEL.md)
2. Use `main` ou `HEAD` como commit reference
3. As configurações do vercel.json são aplicadas automaticamente

---

## Tabela de APIs

| Caminho da API | Método(s) HTTP | Locais de Uso | Payload Esperado (Formato) | Funcionalidade | Observações Adicionais |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | `GET`, `POST` | NextAuth.js, Páginas de auth, useSession hooks | JSON (credentials) para signin | Gerencia autenticação e sessões via NextAuth | Configurado com Prisma adapter, estratégia JWT, requer NEXTAUTH_SECRET |
| `/api/auth/signup` | `POST` | `/auth/signup` | JSON: `{ "name": "string", "email": "string", "password": "string" }` | Registra novos usuários no sistema | Valida email único, criptografa senha com bcrypt |
| `/api/materias` | `GET` | `/estudar/EstudarClient.tsx`, `/components/estudar/FiltrosHorizontal.tsx` | Query params opcionais: disciplina (string) | Lista disciplinas e assuntos do arquivo materias_globais.txt | Nova API que lê estrutura hierárquica disciplina-assunto do arquivo texto |
| `/api/questoes` | `GET` | `/estudar/EstudarClient.tsx`, `/components/estudar/FiltrosHorizontal.tsx` | Query params: disciplinas[], assuntos[], bancas[], anos[], anoInicio, anoFim, dificuldades[], tipoQuestao, ordenacao, etc. | Busca questões usando PostgreSQL para alta performance | **ATUALIZADO**: Modo `estudo_inteligente` corrigido - agora ordena todas as questões que atendem aos filtros do usuário (não filtra por assuntos específicos). Prioriza assuntos menos estudados e ordena por dificuldade (difícil→fácil). |
| `/api/questoes/count` | `GET` | `/estudar/EstudarClient.tsx`, `/components/estudar/FiltrosHorizontal.tsx` | Query params: disciplinas[], assuntos[], bancas[], anos[], anoInicio, anoFim, dificuldades[], tipoQuestao, etc. | Conta questões que correspondem aos filtros aplicados | Nova API para contar questões antes de aplicar filtros, melhora UX |
| `/api/questoes/progresso-assuntos` | `GET` | `/api/questoes` (internamente) | Query params: filtros opcionais | Analisa progresso do usuário por assunto para estudo inteligente | Nova API para modo estudo inteligente, calcula prioridades de assuntos |
| `/api/filtros/contadores` | `GET` | `/components/estudar/FiltrosHorizontal.tsx` | Query params: tipo (disciplinas|bancas|anos|dificuldades|assuntos), disciplina (para assuntos) | Retorna contadores para cada tipo de filtro | Nova API para substituir JSONs estáticos |
| `/api/indices/disciplinas` | `GET` | `/estudar/EstudarClient.tsx`, `/components/estudar/FiltrosHorizontal.tsx` | - | Lista disciplinas com assuntos e contadores do PostgreSQL | Substituiu JSON estático, estrutura: {nome, count, assuntos[]} |
| `/api/indices/bancas` | `GET` | `/estudar/EstudarClient.tsx`, `/components/estudar/FiltrosHorizontal.tsx` | - | Lista bancas com contadores do PostgreSQL | Substituiu JSON estático, estrutura: {nome, count} |
| `/api/indices/anos` | `GET` | `/estudar/EstudarClient.tsx`, `/components/estudar/FiltrosHorizontal.tsx` | - | Lista anos com contadores do PostgreSQL | Substituiu JSON estático, estrutura: {nome, count} |
| `/api/auth/signup` | `POST` | `/app/auth/signup/page.tsx` | JSON: `{ "email": "string", "password": "string", "name": "string" }` | Cadastro de novos usuários | Validação de senha (min 6 chars), hash bcrypt, verifica email único |
| `/api/filtros-salvos` | `GET`, `POST`, `DELETE`, `PUT` | `/components/estudar/FiltrosHorizontal.tsx`, `/hooks/useFiltrosSalvos.ts` | JSON: `{ "nome": "string", "filtros": "object", "descricao": "string?", "favorito": "boolean?" }` | CRUD completo de filtros salvos do usuário | Requer autenticação, suporte a favoritos, GET retorna array, POST/PUT/DELETE modificam |
| `/api/questoes/search` | `GET` | Componentes de busca | Query params: q (termo), limit | Busca textual avançada em questões | Nova API para busca com destaque de termos |
| `/api/questoes/stats` | `GET` | Dashboard, páginas de estatísticas | - | Retorna estatísticas agregadas do banco | Cache automático, estatísticas completas do PostgreSQL |
| `/data/indices/bancas.json` | `GET` | `/cadernos`, Filtros | - | Lista todas as bancas disponíveis | Arquivo estático gerado a partir dos chunks |
| `/data/indices/anos.json` | `GET` | `/cadernos`, Filtros | - | Lista todos os anos disponíveis | Arquivo estático ordenado decrescente |
| `/data/indices/disciplinas.json` | `GET` | `/cadernos`, Filtros | - | Lista todas as disciplinas disponíveis | Arquivo estático ordenado alfabeticamente |
| `/data/indices/orgaos.json` | `GET` | `/cadernos`, Filtros | - | Lista todos os órgãos disponíveis | Arquivo estático com nome, sigla e UF |
| `/data/indices/cargos.json` | `GET` | `/cadernos`, Filtros | - | Lista todos os cargos disponíveis | Arquivo estático ordenado alfabeticamente |
| `/data/indices/assuntos.json` | `GET` | `/cadernos`, Filtros | - | Lista todos os assuntos disponíveis | Arquivo estático com 70k+ assuntos únicos |
| `/data/indices/stats.json` | `GET` | `/cadernos`, Dashboard | - | Estatísticas gerais do sistema | Total de questões, bancas, anos, etc. |
| `/api/user/lists` | `GET`, `POST` | `/cadernos`, Componentes de cadernos | JSON: `{ "nome": "string", "descricao": "string", "questionCodes": "string[]" }` | Gerencia listas personalizadas do usuário | Requer autenticação de usuário |
| `/api/user/lists/[id]` | `GET`, `PUT`, `DELETE` | `/cadernos/[id]`, Componentes de edição | JSON: `{ "nome": "string", "descricao": "string", "questionCodes": "string[]" }` | CRUD de lista específica do usuário | Parâmetros como Promise<{ id: string }> (Next.js 15) |
| `/api/user/answers` | `GET`, `POST` | `/estudar`, Componentes de questões | JSON: `{ "questionCode": "string", "userAnswer": "string", "isCorrect": "boolean" }` | Gerencia respostas do usuário | Requer autenticação, histórico de estudo |
| `/api/user/stats` | `GET` | `/estudar`, Dashboard de estatísticas | - | Retorna estatísticas detalhadas do usuário | Progressão, acertos, sessões de estudo |
| `/api/user/saved-filters` | `GET`, `POST` | `/estudar`, Sistema de filtros | JSON: `{ "nome": "string", "descricao": "string", "filtros": "object", "favorito": "boolean" }` | Gerencia filtros salvos do usuário | Permite salvar e reutilizar combinações de filtros |
| `/api/user/saved-filters/[id]` | `GET`, `PATCH`, `DELETE` | `/estudar`, Edição de filtros | JSON: `{ "nome": "string", "descricao": "string", "filtros": "object", "favorito": "boolean" }` | CRUD de filtro específico | Parâmetros como Promise<{ id: string }> (Next.js 15) |
| `/api/questoes/validate-codes` | `POST` | `/estudar`, Validação de códigos | JSON: `{ "codes": "string[]" }` | Valida códigos de questões específicas | Retorna códigos válidos e inválidos |
| `/api/questoes/download-offline` | `POST` | `/components/estudar/FiltrosHorizontal.tsx`, `/hooks/useDownloadOffline.ts` | JSON: `{ "filtros": "FiltroQuestoes", "limite": "number?" }` | Download de questões para estudo offline | Máximo 1000 questões, salva histórico, retorna questões processadas em JSON |
| `/api/estatisticas` | `GET` | `/app/estudar/estatisticas/page.tsx` | Query params: periodo (7d|30d|90d|all) | Análise completa de performance do usuário | Retorna pontos fracos/fortes, sequências, progresso diário e recomendações de estudo para "ser top da galáxia" |

## Detalhes das APIs

### Autenticação (`/api/auth/[...nextauth]`)
- **Estratégia**: JWT com sessão de 30 dias
- **Provider**: Credentials (email/password)
- **Validação**: bcrypt para senhas
- **Retorno**: Session object com user.id

### Registro (`/api/auth/signup`)
- **Validação**: Email único no banco
- **Segurança**: Hash bcrypt da senha
- **Retorno**: Usuário criado (sem senha)

### Questões (`/api/questoes`)
- **Autenticação**: Requerida via getServerSession
- **Paginação**: Máximo 100 itens por página
- **Filtros**: disciplinas, assuntos, bancas, anos, dificuldades
- **Ordenação**: relevancia, data, dificuldade

### Busca de Questões (`/api/questoes/search`)
- **Funcionalidade**: Busca textual avançada em questões
- **Parâmetros**: `q` (termo de busca), `limit` (número máximo de resultados)
- **Retorno**: Questões que correspondem ao termo de busca, com destaque para os termos encontrados

### Estatísticas do Usuário (`/api/user/stats`)
- **Funcionalidade**: Retorna estatísticas detalhadas do progresso do usuário
- **Dados**: Total de respostas, acertos, percentual, sessões de estudo, última atividade
- **Autenticação**: Requerida via getServerSession

### Filtros Salvos (`/api/user/saved-filters`)
- **Funcionalidade**: Sistema completo de gerenciamento de filtros personalizados
- **Recursos**: Criar, listar, editar, excluir, favoritar filtros
- **Persistência**: Filtros salvos no banco com metadados (nome, descrição, favorito)

### Validação de Códigos (`/api/questoes/validate-codes`)
- **Funcionalidade**: Valida lista de códigos de questões contra o banco de dados
- **Entrada**: Array de códigos de questões
- **Retorno**: Códigos válidos e inválidos separadamente
- **Uso**: Feedback em tempo real na funcionalidade de códigos específicos

### Download Offline (`/api/questoes/download-offline`)
- **Funcionalidade**: Permite download de questões filtradas para estudo offline
- **Limite**: Máximo de 1000 questões por download
- **Histórico**: Salva registro dos downloads realizados
- **Retorno**: Questões processadas e prontas para estudo offline em formato JSON

### Índices de Dados (`/data/indices/*`)
- **Geração**: Automatizada via script `scripts/generate-indices.js`
- **Fonte**: Processamento de 168 chunks com 3.2M+ questões
- **Atualizações**: Dados atualizados com timestamp no `stats.json`
- **Performance**: Arquivos estáticos servidos pelo Next.js
- **Estrutura Bancas**: `[{ nome, sigla, descricao }]`
- **Estrutura Órgãos**: `[{ nome, sigla, uf }]`
- **Estrutura Stats**: `{ totalQuestoes, totalBancas, ..., atualizadoEm }`

### Listas do Usuário (`/api/user/lists`)
- **Autenticação**: Requerida via getServerSession
- **GET**: Retorna todas as listas do usuário autenticado
- **POST**: Cria nova lista com nome, descrição e códigos de questões
- **Validação**: Verifica propriedade do usuário

### Lista Específica (`/api/user/lists/[id]`)
- **Parâmetros**: `{ params: Promise<{ id: string }> }` (Next.js 15 compatível)
- **GET**: Retorna lista específica se pertencer ao usuário
- **PUT**: Atualiza lista existente (nome, descrição, questões)
- **DELETE**: Remove lista do usuário
- **Segurança**: Valida propriedade antes de qualquer operação

### Respostas do Usuário (`/api/user/answers`)
- **Funcionalidade**: Armazena histórico de respostas para estatísticas
- **POST**: Registra resposta do usuário (correta/incorreta)
- **GET**: Retorna histórico de respostas para análise de progresso
- **Análise**: Utilizado para gerar estatísticas de desempenho

## Estados de Resposta
- **200**: Sucesso
- **401**: Não autorizado (sem sessão)
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

## Exemplos de Uso

### Autenticação
```javascript
// Login
const response = await signIn('credentials', {
  email: 'user@example.com',
  password: 'password123'
});

// Verificar sessão
const session = await getSession();
```

### Buscar Questões
```javascript
const response = await fetch('/api/questoes?page=1&limit=50&disciplinas=informatica&ordenacao=relevancia');
const data = await response.json();
```

### Buscar Questões com Termo
```javascript
const response = await fetch('/api/questoes/search?q=matematica&limit=10');
const resultados = await response.json();
```

### Obter Estatísticas de Questões
```javascript
const response = await fetch('/api/questoes/stats');
const stats = await response.json();
```

### Gerenciar Listas de Usuário
```javascript
// Criar lista
const response = await fetch('/api/user/lists', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    nome: 'Minha Lista',
    descricao: 'Descrição da lista',
    questionCodes: ['questao1', 'questao2']
  })
});

// Obter listas
const response = await fetch('/api/user/lists', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const listas = await response.json();
```

### Gerenciar Respostas do Usuário
```javascript
// Enviar resposta
const response = await fetch('/api/user/answers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    questionCode: 'questao1',
    userAnswer: 'resposta do usuário',
    isCorrect: true
  })
});

// Obter histórico de respostas
const response = await fetch('/api/user/answers', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const historico = await response.json();
```

### Download de Questões para Offline
```javascript
const response = await fetch('/api/questoes/download-offline', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    filtros: { disciplinas: ['matematica'], anos: [2021] },
    limite: 500
  })
});
const questoesOffline = await response.json();
```

### Obter Estatísticas de Desempenho
```javascript
const response = await fetch('/api/estatisticas?periodo=30d', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const estatisticas = await response.json();
```
