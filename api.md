# Documentação da API

## Tabela de APIs

| Caminho da API | Método(s) HTTP | Locais de Uso | Payload Esperado (Formato) | Funcionalidade | Observações Adicionais |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | `GET`, `POST` | NextAuth.js, Páginas de auth | JSON (credentials) | Gerencia autenticação e sessões via NextAuth | Configurado com estratégia JWT, requer NEXTAUTH_SECRET |
| `/api/auth/signup` | `POST` | `/auth/signup` | JSON: `{ "name": "string", "email": "string", "password": "string" }` | Registra novos usuários no sistema | Valida email único, criptografa senha com bcrypt |
| `/api/questoes` | `GET` | `/estudar`, Componentes de filtro | Query params com busca hierárquica | **ATUALIZADO**: Agora suporta busca hierárquica de assuntos | Quando um assunto pai é selecionado, inclui automaticamente todos os assuntos filhos |
| `/data/indices/bancas.json` | `GET` | `/cadernos`, Filtros | - | Lista todas as bancas disponíveis | Arquivo estático gerado a partir dos chunks |
| `/data/indices/anos.json` | `GET` | `/cadernos`, Filtros | - | Lista todos os anos disponíveis | Arquivo estático ordenado decrescente |
| `/data/indices/disciplinas.json` | `GET` | `/cadernos`, Filtros | - | Lista todas as disciplinas disponíveis | Arquivo estático ordenado alfabeticamente |
| `/data/indices/orgaos.json` | `GET` | `/cadernos`, Filtros | - | Lista todos os órgãos disponíveis | Arquivo estático com nome, sigla e UF |
| `/data/indices/cargos.json` | `GET` | `/cadernos`, Filtros | - | Lista todos os cargos disponíveis | Arquivo estático ordenado alfabeticamente |
| `/data/indices/assuntos.json` | `GET` | `/cadernos`, Filtros | - | Lista todos os assuntos disponíveis | Arquivo estático com 70k+ assuntos únicos |
| `/data/indices/stats.json` | `GET` | `/cadernos`, Dashboard | - | Estatísticas gerais do sistema | Total de questões, bancas, anos, etc. |
| `/data/indices/hierarquia.json` | `GET` | Sistema interno, Scripts | - | Estrutura hierárquica completa de disciplinas e assuntos | Mapeia relações pai-filho entre códigos de assuntos |
| `/data/indices/busca-hierarquica.json` | `GET` | `/estudar`, API de questões | - | Índice otimizado para busca hierárquica de assuntos | Permite expansão automática de códigos pai para incluir filhos |

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
- **Busca Hierárquica**: Suporte para seleção de assuntos pai e inclusão automática de filhos

### Índices de Dados (`/data/indices/*`)
- **Geração**: Automatizada via script `scripts/generate-indices.js`
- **Fonte**: Processamento de 168 chunks com 3.2M+ questões
- **Atualizações**: Dados atualizados com timestamp no `stats.json`
- **Performance**: Arquivos estáticos servidos pelo Next.js
- **Estrutura Bancas**: `[{ nome, sigla, descricao }]`
- **Estrutura Órgãos**: `[{ nome, sigla, uf }]`
- **Estrutura Stats**: `{ totalQuestoes, totalBancas, ..., atualizadoEm }`
- **Estrutura Hierarquia**: `[{ codigo, nome, filhos: [{ codigo, nome }] }]`

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
