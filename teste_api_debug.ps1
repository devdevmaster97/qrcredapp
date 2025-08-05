# Script PowerShell para testar API de lançamentos diretamente
# Execute: .\teste_api_debug.ps1

Write-Host "=== TESTE DA API DE LANÇAMENTOS ===" -ForegroundColor Green

# 1. Primeiro, vamos pegar o token do convênio
try {
    $loginBody = @{
        usuario = "hosp.otorrino"
        senha = "123456"
    } | ConvertTo-Json

    Write-Host "1. Fazendo login..." -ForegroundColor Yellow
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/convenio/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable session

    if ($loginResponse.success) {
        Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
        Write-Host "Token obtido: $($loginResponse.convenio.id)" -ForegroundColor Cyan
        
        # 2. Agora vamos buscar os lançamentos
        Write-Host "`n2. Buscando lançamentos..." -ForegroundColor Yellow
        $lancamentosResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/convenio/lancamentos" -Method Get -WebSession $session

        Write-Host "`n=== RESULTADOS ===" -ForegroundColor Green
        Write-Host "Success: $($lancamentosResponse.success)" -ForegroundColor Cyan
        Write-Host "Total de lançamentos: $($lancamentosResponse.data.Length)" -ForegroundColor Cyan
        
        if ($lancamentosResponse.data -and $lancamentosResponse.data.Length -gt 0) {
            Write-Host "`nPrimeiros 5 lançamentos:" -ForegroundColor Yellow
            $primeiros5 = $lancamentosResponse.data | Select-Object -First 5
            $primeiros5 | ForEach-Object {
                Write-Host "ID: $($_.id) | Data: $($_.data) | Mês: $($_.mes) | Valor: $($_.valor) | Associado: $($_.associado)" -ForegroundColor White
            }
            
            # Verificar meses únicos
            $mesesUnicos = $lancamentosResponse.data | Group-Object mes | Select-Object Name, Count
            Write-Host "`nMeses únicos encontrados:" -ForegroundColor Yellow
            $mesesUnicos | ForEach-Object {
                Write-Host "Mês: $($_.Name) | Quantidade: $($_.Count)" -ForegroundColor White
            }
            
            # Verificar especificamente AGO/2025
            $ago2025 = $lancamentosResponse.data | Where-Object { $_.mes -eq "AGO/2025" }
            Write-Host "`nLançamentos AGO/2025: $($ago2025.Count)" -ForegroundColor $(if($ago2025.Count -gt 0) { "Green" } else { "Red" })
            
            if ($ago2025.Count -gt 0) {
                Write-Host "Detalhes AGO/2025:" -ForegroundColor Green
                $ago2025 | Select-Object -First 3 | ForEach-Object {
                    Write-Host "ID: $($_.id) | Data: $($_.data) | Valor: $($_.valor)" -ForegroundColor White
                }
            }
            
        } else {
            Write-Host "❌ Nenhum lançamento retornado!" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Erro no login: $($loginResponse.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erro durante o teste: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== TESTE DA API PHP DIRETA ===" -ForegroundColor Green

# 3. Teste direto da API PHP (se soubermos o código do convênio)
Write-Host "3. Testando API PHP diretamente..." -ForegroundColor Yellow
try {
    # Tente alguns códigos comuns de convênio
    $codigosComuns = @(1, 2, 3, 4, 5)
    
    foreach ($codigo in $codigosComuns) {
        try {
            Write-Host "Testando código convênio: $codigo" -ForegroundColor Cyan
            $phpResponse = Invoke-RestMethod -Uri "https://sas.makecard.com.br/listar_lancamentos_convenio_app.php?cod_convenio=$codigo" -Method Get -TimeoutSec 10
            
            if ($phpResponse.success -and $phpResponse.total -gt 0) {
                Write-Host "✅ Código $codigo funcionou! Total: $($phpResponse.total)" -ForegroundColor Green
                Write-Host "Meses encontrados: $($phpResponse.meses_encontrados -join ', ')" -ForegroundColor White
                Write-Host "Tem AGO/2025: $($phpResponse.debug.tem_ago_2025)" -ForegroundColor $(if($phpResponse.debug.tem_ago_2025) { "Green" } else { "Yellow" })
                break
            } else {
                Write-Host "⚠️ Código $codigo: sem dados" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Código $codigo: erro na consulta" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Erro ao testar API PHP: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== CONCLUSÃO ===" -ForegroundColor Green
Write-Host "1. Execute este script para verificar onde está o problema" -ForegroundColor White
Write-Host "2. Verifique os logs do console do navegador também" -ForegroundColor White
Write-Host "3. Compare os resultados do teste direto com o que aparece no app" -ForegroundColor White