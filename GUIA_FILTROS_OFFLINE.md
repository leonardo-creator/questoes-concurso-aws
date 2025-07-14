# 📚 Guia de Uso: Filtros Salvos e Sistema Offline

## 🎯 Como Usar Filtros Salvos

### 1. **Salvar um Filtro**
1. Configure seus filtros desejados (disciplinas, bancas, anos, etc.)
2. Clique no dropdown "**Filtros Salvos**"
3. Clique em "**Salvar como novo filtro**"
4. Digite um nome para o filtro
5. Clique "**Salvar**"

### 2. **Carregar um Filtro Salvo**
1. Clique no dropdown "**Filtros Salvos**"
2. Na seção "Filtros salvos", clique no nome do filtro desejado
3. Todos os filtros serão aplicados automaticamente

### 3. **Marcar como Favorito**
1. No dropdown "Filtros Salvos"
2. Clique na **estrela** ao lado do nome do filtro
3. Filtros favoritos aparecem primeiro na lista

### 4. **Excluir um Filtro**
1. No dropdown "Filtros Salvos" 
2. Clique no ícone de **lixeira** (🗑️) ao lado do filtro
3. O filtro será removido permanentemente

---

## 📱 Como Usar o Sistema Offline

### 1. **Baixar Questões para Offline**
1. Configure os filtros desejados (disciplinas, bancas, etc.)
2. Clique no dropdown "**Download Offline**"
3. Clique em "**Baixar para Offline**"
4. Aguarde o download (máximo 1000 questões)
5. As questões são salvas no seu navegador

### 2. **Gerenciar Downloads Offline**
1. No dropdown "Download Offline"
2. Visualize todos os downloads na seção inferior
3. Cada download mostra:
   - Nome automático com data/hora
   - Quantidade de questões
   - Data do download

### 3. **Excluir Download Offline**
1. No dropdown "Download Offline"
2. Clique no ícone de **lixeira** (🗑️) ao lado do download
3. O pacote será removido do navegador

### 4. **Sincronizar Respostas** (Futuro)
1. Quando voltar online
2. Clique em "**Sincronizar Respostas**"
3. Suas respostas offline serão enviadas ao servidor

---

## 🔍 Como Usar Códigos de Assuntos

### 1. **Formato Aceito**
- `140.3.3.3, 2.3.3` (separado por vírgula)
- `"140.3.3.3", "2.3.3"` (com aspas - serão removidas automaticamente)
- Um código por linha também funciona

### 2. **Aplicar Códigos**
1. Clique no dropdown "**Códigos de Assuntos**"
2. Digite os códigos no formato indicado
3. Clique "**Aplicar Códigos**"
4. O sistema mostra quantos códigos foram aplicados

---

## 🧠 Modos de Estudo

### **Relevância** (Padrão)
- Questões ordenadas por relevância geral
- Considerações: ano, banca, dificuldade

### **Estudo Inteligente** 
- **FUNCIONAMENTO CORRETO**: 
  - Aplica TODOS os filtros que você escolheu
  - Ordena as questões priorizando assuntos menos estudados
  - Questões mais difíceis aparecem primeiro
  - Mantém o limite de 120 questões
- **Não filtra** assuntos específicos além dos seus filtros

### **Outros Modos**
- **Data (Crescente/Decrescente)**: Por ano da questão
- **Dificuldade (Fácil→Difícil / Difícil→Fácil)**: Por nível

---

## ⚠️ Troubleshooting

### **Problema**: "0 questões encontradas" com códigos
**Causa**: Códigos podem não existir no banco ou formato incorreto
**Solução**: 
1. Verifique se removeu aspas extras
2. Teste com códigos mais simples primeiro
3. Use a API de teste: `/api/debug/questoes-test`

### **Problema**: Filtros salvos não aparecem
**Causa**: Não está logado ou erro de conexão
**Solução**: 
1. Verifique se está logado
2. Recarregue a página
3. Abra o console do navegador para ver erros

### **Problema**: Download offline falha
**Causa**: Muitas questões ou pouco espaço no navegador
**Solução**:
1. Reduza os filtros para menos questões
2. Limpe downloads offline antigos
3. Verifique espaço disponível no navegador

---

## 🔧 Informações Técnicas

### **Armazenamento**
- **Filtros Salvos**: Banco de dados (sincronizado)
- **Downloads Offline**: localStorage do navegador (local)
- **Limite**: 50MB por pacote offline

### **Sincronização**
- Filtros salvos: Automática (requer internet)
- Downloads offline: Manual (quando você escolher)
- Respostas offline: Manual (botão "Sincronizar")

### **Compatibilidade**
- Funciona em todos os navegadores modernos
- Dados offline persistem mesmo fechando o navegador
- Filtros salvos sincronizam entre dispositivos (mesmo login)
