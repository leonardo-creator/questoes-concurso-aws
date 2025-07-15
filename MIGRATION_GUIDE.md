# 🗄️ Migração de Dados - Guia de Uso

Este documento explica como usar os scripts de migração de dados dos arquivos JSON para o banco PostgreSQL.

## 📋 Scripts Disponíveis

### 🚀 Migração Principal
```bash
# Migração normal (preserva dados existentes)
npm run migrate

# Migração com limpeza (remove todos os dados antes)
npm run migrate:clean
```

### 🛠️ Utilitários do Banco
```bash
# Exibir estatísticas detalhadas
npm run db:stats

# Remover questões duplicadas
npm run db:duplicates

# Verificar integridade dos dados
npm run db:integrity

# Limpar todas as questões (com confirmação)
npm run db:clear

# Limpar todas as questões (forçado)
npm run db:clear:force

# Menu de utilitários
npm run db:utils
```

## 🔧 Funcionalidades Implementadas

### ✅ Problemas Corrigidos

1. **Processamento Completo dos Arquivos**
   - ✅ Processa TODOS os arquivos JSON da pasta `chunks/`
   - ✅ Valida cada arquivo antes do processamento
   - ✅ Ordena arquivos numericamente (`batch_001.json`, `batch_002.json`, etc.)

2. **Verificação de Duplicatas**
   - ✅ Remove duplicatas dentro de cada arquivo JSON
   - ✅ Verifica duplicatas existentes no banco antes de inserir
   - ✅ Usa `upsert` para garantir atomicidade
   - ✅ Script específico para limpar duplicatas do banco

3. **Gerenciamento de Erros Robusto**
   - ✅ Validação de JSON malformado
   - ✅ Arquivos vazios ou corrompidos
   - ✅ Tratamento de erros de conexão
   - ✅ Log detalhado de problemas

4. **Performance Otimizada**
   - ✅ Processamento em lotes menores (500 questões)
   - ✅ Pausas entre lotes para não sobrecarregar o banco
   - ✅ Índices otimizados no banco
   - ✅ Estatísticas de performance em tempo real

## 📊 Estrutura dos Dados

### Campos Normalizados
```javascript
{
  questaoId: number,          // ID único da questão
  dificuldade: number,        // 1-5 (Muito Fácil - Muito Difícil)
  bancasNome: string,         // Nome completo da banca
  bancasSigla: string,        // Sigla da banca
  cargosDescricao: string,    // Descrição do cargo
  orgaosNome: string,         // Nome do órgão
  orgaosUf: string,           // UF do órgão
  anos: number,               // Ano da prova
  tipo: string,               // "multipla escolha" ou "certo e errado"
  enunciado: string,          // Texto da questão
  itens: Array,               // Alternativas da questão
  resposta: string,           // ID da resposta correta
  codigoReal: string,         // Código único da questão
  disciplinaReal: string,     // Disciplina
  assuntoReal: string,        // Assunto específico
  anulada: boolean,           // Se a questão foi anulada
  desatualizada: boolean      // Se a questão está desatualizada
}
```

## 🚦 Como Usar

### 1️⃣ Primeira Migração
```bash
# Verificar estatísticas atuais do banco
npm run db:stats

# Executar migração completa
npm run migrate

# Verificar resultado
npm run db:stats
```

### 2️⃣ Remigração Completa
```bash
# Limpar dados existentes e migrar tudo novamente
npm run migrate:clean
```

### 3️⃣ Manutenção Regular
```bash
# Verificar e remover duplicatas
npm run db:duplicates

# Verificar integridade dos dados
npm run db:integrity
```

## 📈 Monitoramento

### Durante a Migração
O script exibe:
- ✅ Questões inseridas com sucesso
- ⏭️ Questões que já existiam (puladas)
- ❌ Erros encontrados
- ⏱️ Estatísticas de performance em tempo real

### Após a Migração
```bash
# Ver estatísticas completas
npm run db:stats
```

Exibe:
- Total de questões no banco
- Top 10 bancas por número de questões
- Distribuição por anos
- Distribuição por dificuldade
- Tipos de questão disponíveis
- Número de duplicatas (se houver)

## 🛡️ Segurança e Backup

### Antes de Executar
1. **Backup do Banco**: Sempre faça backup antes de operações destrutivas
2. **Teste de Conexão**: Verifique se o banco está acessível
3. **Validação dos JSONs**: Scripts validam automaticamente

### Recuperação de Erros
```bash
# Se algo der errado, verificar integridade
npm run db:integrity

# Remover apenas duplicatas problemáticas
npm run db:duplicates

# Em último caso, limpar e remigrar
npm run migrate:clean
```

## 🎯 Resultados Esperados

### Dados Limpos
- ✅ Zero duplicatas baseadas em `questaoId`
- ✅ Todos os campos obrigatórios preenchidos
- ✅ JSON válido em campos estruturados
- ✅ Índices otimizados para consultas rápidas

### Performance
- ✅ Migração de ~600k questões em < 30 minutos
- ✅ Consultas de busca < 100ms
- ✅ Estatísticas atualizadas automaticamente

## 🐛 Troubleshooting

### Erro de Conexão
```bash
# Verificar conexão
npm run db:test
```

### JSON Malformado
```bash
# O script detecta e reporta arquivos problemáticos
npm run migrate
# Logs mostrarão qual arquivo tem problema
```

### Duplicatas Persistentes
```bash
# Forçar limpeza de duplicatas
npm run db:duplicates
```

### Performance Lenta
```bash
# Verificar estatísticas e otimizações
npm run db:stats
npm run db:integrity
```

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs detalhados do script
2. Executar `npm run db:integrity` para diagnóstico
3. Consultar este README para soluções comuns
4. Em último caso, usar `npm run migrate:clean` para recomeçar
