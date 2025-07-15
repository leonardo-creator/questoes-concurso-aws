# Script para adicionar configurações de static export nas APIs
$apiFiles = @(
    "app\api\auth\signup\route.ts",
    "app\api\debug\questoes-test\route.ts",
    "app\api\estatisticas\route.ts",
    "app\api\filtros\contadores\route.ts",
    "app\api\filtros-salvos\route.ts",
    "app\api\indices\anos\route.ts",
    "app\api\indices\bancas\route.ts",
    "app\api\indices\disciplinas\route.ts",
    "app\api\questoes\route.ts",
    "app\api\questoes\count\route.ts",
    "app\api\questoes\download-offline\route.ts",
    "app\api\questoes\progresso-assuntos\route.ts",
    "app\api\questoes\search\route.ts",
    "app\api\questoes\stats\route.ts",
    "app\api\questoes\validate-codes\route.ts",
    "app\api\user\answers\route.ts",
    "app\api\user\lists\route.ts",
    "app\api\user\lists\[id]\route.ts",
    "app\api\user\saved-filters\route.ts",
    "app\api\user\saved-filters\[id]\route.ts",
    "app\api\user\stats\route.ts"
)

$exportConfig = @"

// Configurações para static export
export const dynamic = 'force-static';
export const revalidate = false;
"@

foreach ($file in $apiFiles) {
    if (Test-Path $file) {
        Write-Host "Processando: $file"
        $content = Get-Content $file -Raw
        
        # Verifica se já tem as configurações
        if ($content -notmatch "export const dynamic") {
            # Encontra a primeira linha de import
            $lines = $content -split "`n"
            $importEndIndex = 0
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import" -or $lines[$i] -match "^\/\*" -or $lines[$i] -match "^\/\/") {
                    $importEndIndex = $i + 1
                }
                elseif ($lines[$i].Trim() -eq "") {
                    continue
                }
                else {
                    break
                }
            }
            
            # Insere as configurações após os imports
            $newLines = @()
            $newLines += $lines[0..($importEndIndex-1)]
            $newLines += $exportConfig
            $newLines += $lines[$importEndIndex..($lines.Count-1)]
            
            $newContent = $newLines -join "`n"
            Set-Content $file $newContent -Encoding UTF8
            Write-Host "✅ Adicionado configurações em: $file"
        } else {
            Write-Host "⏭️ Já possui configurações: $file"
        }
    } else {
        Write-Host "❌ Arquivo não encontrado: $file"
    }
}

Write-Host "🎉 Processamento concluído!"
