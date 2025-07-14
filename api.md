# Documentação da API

## Tabela de APIs

| Caminho da API | Método(s) HTTP | Locais de Uso | Payload Esperado (Formato) | Funcionalidade | Observações Adicionais |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | `GET`, `POST` | NextAuth.js, Páginas de auth | JSON (credentials) | Gerencia autenticação e sessões via NextAuth | Configurado com estratégia JWT, requer NEXTAUTH_SECRET |
| `/api/auth/signup` | `POST` | `/auth/signup` | JSON: `{ "name": "string", "email": "string", "password": "string" }` | Registra novos usuários no sistema | Valida email único, criptografa senha com bcrypt |
| `/api/questoes` | `GET` | Componentes de listagem | Query params: page, limit, filtros | Retorna questões paginadas com filtros | Requer autenticação, suporta filtros avançados |
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
