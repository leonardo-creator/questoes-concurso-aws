# Script para criar repositório via curl (alternativa)
$headers = @{
    "Authorization" = "token SEU_GITHUB_TOKEN"
    "Accept" = "application/vnd.github.v3+json"
}

$body = @{
    name = "questoes-concurso-aws"
    description = "Sistema de Questoes de Concurso - Next.js 15 + Prisma + PostgreSQL"
    private = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Repositorio criado com sucesso!" -ForegroundColor Green
    Write-Host "URL: $($response.html_url)" -ForegroundColor Cyan
} catch {
    Write-Host "Erro ao criar repositorio. Use a interface web: https://github.com/new" -ForegroundColor Red
}
