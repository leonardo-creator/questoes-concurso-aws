# Documentação da API

## Tabela de APIs

| Caminho da API | Método(s) HTTP | Locais de Uso | Payload Esperado (Formato) | Funcionalidade | Observações Adicionais |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | `GET`, `POST` | NextAuth.js, Páginas de auth | JSON (credentials) | Gerencia autenticação e sessões via NextAuth | Configurado com estratégia JWT, requer NEXTAUTH_SECRET |
| `/api/auth/signup` | `POST` | `/auth/signup` | JSON: `{ "name": "string", "email": "string", "password": "string" }` | Registra novos usuários no sistema | Valida email único, criptografa senha com bcrypt |
| `/api/questoes` | `GET` | Componentes de listagem | Query params: page, limit, filtros | Retorna questões paginadas com filtros | Requer autenticação, suporta filtros avançados |

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
