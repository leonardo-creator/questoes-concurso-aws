# Script de Migração Rápida para Novo Repositório
# Substitua as variáveis abaixo pelos valores corretos

$GITHUB_USER = "leonardo-creator"
$REPO_NAME = "questoes-concurso-aws"

Write-Host "=== INICIANDO MIGRAÇÃO RÁPIDA ===" -ForegroundColor Green

# Verificar se existem mudanças não commitadas
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Existem mudanças não commitadas. Commitando automaticamente..." -ForegroundColor Yellow
    git add .
    git commit -m "Final commit before migration"
}

# Adicionar novo remote
Write-Host "📡 Adicionando novo remote..." -ForegroundColor Blue
git remote add new-origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

# Verificar remotes
Write-Host "🔍 Remotes configurados:" -ForegroundColor Blue
git remote -v

# Push completo com histórico
Write-Host "🚀 Fazendo push completo com histórico..." -ForegroundColor Green
git push new-origin main

# Push de todas as branches (se existirem)
Write-Host "🌿 Fazendo push de todas as branches..." -ForegroundColor Green
git push new-origin --all

# Push de todas as tags (se existirem)
Write-Host "🏷️  Fazendo push de todas as tags..." -ForegroundColor Green
git push new-origin --tags

Write-Host "✅ MIGRAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "🔗 Seu novo repositório: https://github.com/$GITHUB_USER/$REPO_NAME" -ForegroundColor Cyan

# Opcional: Configurar novo remote como origin principal
Write-Host "🔄 Deseja configurar o novo repositório como origin principal? (s/n)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "s" -or $response -eq "S") {
    git remote remove origin
    git remote rename new-origin origin
    Write-Host "✅ Novo repositório configurado como origin principal!" -ForegroundColor Green
}

Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Configurar variáveis de ambiente no novo projeto" -ForegroundColor White
Write-Host "2. Configurar deploy (Vercel/Netlify)" -ForegroundColor White
Write-Host "3. Testar build: npm run build" -ForegroundColor White
Write-Host "4. Verificar funcionamento: npm run dev" -ForegroundColor White
