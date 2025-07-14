# Estrutura de Dados - Formato dos Chunks

Este documento descreve o formato esperado dos arquivos JSON na pasta `/chunks/`.

## Formato dos Arquivos JSON

Cada arquivo na pasta `/chunks/` deve conter um array de objetos representando questões, seguindo esta estrutura:

```json
[
  {
    "id": 1,
    "codigo_real": "Q123456",
    "dificuldade": "Média",
    "bancas_nome": "Fundação Carlos Chagas",
    "bancas_sigla": "FCC",
    "cargos_descricao": "Analista Judiciário",
    "orgaos_nome": "Tribunal Regional Federal da 3ª Região",
    "orgaos_sigla": "TRF3",
    "ano": 2023,
    "enunciado": "<p>Considerando os princípios constitucionais...</p>",
    "itens": [
      {
        "texto": "A) é sempre aplicável.",
        "id_alternativa": 1,
        "letra": "A"
      },
      {
        "texto": "B) não se aplica em situações excepcionais.",
        "id_alternativa": 2,
        "letra": "B"
      },
      {
        "texto": "C) tem aplicação restrita aos casos previstos em lei.",
        "id_alternativa": 3,
        "letra": "C"
      },
      {
        "texto": "D) deve ser interpretado sistematicamente.",
        "id_alternativa": 4,
        "letra": "D"
      },
      {
        "texto": "E) possui eficácia limitada.",
        "id_alternativa": 5,
        "letra": "E"
      }
    ],
    "resposta": "4",
    "disciplina_real": "Direito Constitucional",
    "assunto_real": "Princípios Constitucionais",
    "anulada": false,
    "desatualizada": false
  }
]
```

## Campos Obrigatórios

### Campos Principais
- **id** (number): Identificador único da questão
- **codigo_real** (string): Código único da questão (usado como chave primária)
- **enunciado** (string): Texto da questão em HTML
- **resposta** (string): ID da alternativa correta
- **disciplina_real** (string): Disciplina da questão
- **assunto_real** (string): Assunto específico

### Metadados da Banca
- **bancas_nome** (string): Nome completo da banca
- **bancas_sigla** (string): Sigla da banca
- **cargos_descricao** (string): Descrição do cargo
- **orgaos_nome** (string): Nome do órgão
- **orgaos_sigla** (string): Sigla do órgão
- **ano** (number): Ano da prova

### Classificação
- **dificuldade** (string): "Fácil", "Média" ou "Difícil"
- **anulada** (boolean): Se a questão foi anulada
- **desatualizada** (boolean): Se a questão está desatualizada

### Alternativas
- **itens** (array): Array de objetos com as alternativas
  - **texto** (string): Texto da alternativa
  - **id_alternativa** (number): ID único da alternativa
  - **letra** (string): Letra da alternativa (A, B, C, D, E)

## Exemplo de Arquivo Chunk

```json
[
  {
    "id": 1,
    "codigo_real": "Q001234",
    "dificuldade": "Fácil",
    "bancas_nome": "Cespe/Cebraspe",
    "bancas_sigla": "CESPE",
    "cargos_descricao": "Técnico Judiciário",
    "orgaos_nome": "Superior Tribunal de Justiça",
    "orgaos_sigla": "STJ",
    "ano": 2023,
    "enunciado": "<p>A Constituição Federal estabelece que...</p>",
    "itens": [
      {
        "texto": "A) Correto.",
        "id_alternativa": 1,
        "letra": "A"
      },
      {
        "texto": "B) Errado.",
        "id_alternativa": 2,
        "letra": "B"
      }
    ],
    "resposta": "1",
    "disciplina_real": "Direito Constitucional",
    "assunto_real": "Direitos Fundamentais",
    "anulada": false,
    "desatualizada": false
  },
  {
    "id": 2,
    "codigo_real": "Q001235",
    "dificuldade": "Média",
    "bancas_nome": "Fundação Carlos Chagas",
    "bancas_sigla": "FCC",
    "cargos_descricao": "Analista Judiciário",
    "orgaos_nome": "Tribunal de Justiça de São Paulo",
    "orgaos_sigla": "TJSP",
    "ano": 2022,
    "enunciado": "<p>No que se refere ao processo administrativo...</p>",
    "itens": [
      {
        "texto": "A) É obrigatória a motivação.",
        "id_alternativa": 1,
        "letra": "A"
      },
      {
        "texto": "B) A motivação é dispensável.",
        "id_alternativa": 2,
        "letra": "B"
      },
      {
        "texto": "C) Depende da discricionariedade.",
        "id_alternativa": 3,
        "letra": "C"
      },
      {
        "texto": "D) Somente em casos específicos.",
        "id_alternativa": 4,
        "letra": "D"
      },
      {
        "texto": "E) Não há previsão legal.",
        "id_alternativa": 5,
        "letra": "E"
      }
    ],
    "resposta": "1",
    "disciplina_real": "Direito Administrativo",
    "assunto_real": "Processo Administrativo",
    "anulada": false,
    "desatualizada": false
  }
]
```

## Validações Aplicadas

O script de processamento valida:

1. **Estrutura básica**: Verifica se é um array válido
2. **Campos obrigatórios**: Todos os campos essenciais devem estar presentes
3. **Tipos de dados**: Verifica se os tipos estão corretos
4. **Códigos únicos**: `codigo_real` deve ser único em toda a base
5. **Alternativas válidas**: Verifica estrutura das alternativas
6. **Resposta válida**: Verifica se a resposta corresponde a uma alternativa existente

## Exemplo de Uso

1. **Coloque seus arquivos** na pasta `/chunks/`:
   ```
   /chunks/
   ├── df_pf_chunk_1.json
   ├── df_pf_chunk_2.json
   ├── df_pf_chunk_3.json
   └── df_pf_chunk_4.json
   ```

2. **Execute o processamento**:
   ```bash
   node scripts/process-questoes.mjs
   ```

3. **Resultado esperado**:
   ```
   /public/data/
   ├── manifest.json
   ├── questoes/
   │   ├── Q001234.json
   │   ├── Q001235.json
   │   └── ...
   └── indices/
       ├── disciplinas.json
       ├── bancas.json
       └── anos.json
   ```

## Dicas de Otimização

1. **Tamanho dos chunks**: Mantenha arquivos entre 20-50MB para otimizar processamento
2. **Encoding**: Use UTF-8 para suporte a caracteres especiais
3. **Validação prévia**: Valide a estrutura antes do processamento
4. **Backup**: Mantenha backup dos dados originais

## Solução de Problemas

### Erro: "Arquivo não contém array"
- Verifique se o JSON é um array válido iniciando com `[` e terminando com `]`

### Erro: "Campo obrigatório ausente"
- Verifique se todos os campos listados acima estão presentes

### Erro: "Código duplicado"
- Certifique-se de que `codigo_real` é único em toda a base

### Erro: "Resposta inválida"
- Verifique se o campo `resposta` corresponde a um `id_alternativa` existente
