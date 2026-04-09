$renameMap = @{
    "src/modules/core/dashboard/actions.ts" = "dashboard-actions.ts"
    "src/modules/core/data-vault/actions.ts" = "data-vault-actions.ts"
    "src/modules/core/domains/actions.ts" = "domain-actions.ts"
    "src/modules/core/iam/actions.ts" = "iam-actions.ts"
    "src/modules/core/integrations/actions.ts" = "integration-actions.ts"
    "src/modules/core/integrations/marketplace/actions.ts" = "marketplace-actions.ts"
    "src/modules/core/knowledge/actions.ts" = "knowledge-actions.ts"
    "src/modules/core/lifecycle/actions.ts" = "lifecycle-actions.ts"
    "src/modules/core/logging/actions.ts" = "logging-actions.ts"
    "src/modules/core/messaging/actions.ts" = "messaging-actions.ts"
    "src/modules/core/messaging/ai/actions.ts" = "ai-actions.ts"
    "src/modules/core/settings/actions.ts" = "settings-actions.ts"
    "src/modules/core/storage/actions.ts" = "storage-actions.ts"
    "src/modules/core/tools/contract-generator/actions.ts" = "contract-actions.ts"
    "src/modules/core/trash/actions.ts" = "trash-actions.ts"
}

# 1. Perform Renames
foreach ($oldPath in $renameMap.Keys) {
    $newName = $renameMap[$oldPath]
    if (Test-Path $oldPath) {
        $parent = Split-Path $oldPath -Parent
        Rename-Item -LiteralPath $oldPath -NewName $newName -Force
        Write-Host "Renamed: $oldPath -> $newName"
    }
}

# 2. Update Imports
$files = Get-ChildItem -Path src -Recurse -Include *.ts, *.tsx
foreach ($file in $files) {
    try {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        $changed = $false
        
        foreach ($oldPath in $renameMap.Keys) {
            $parentDir = Split-Path $oldPath -Parent
            $parentDir = $parentDir -replace 'src\\', '@/' -replace '\\', '/'
            $oldImport = "$parentDir/actions"
            $newImport = "$parentDir/" + ($renameMap[$oldPath] -replace '\.ts$', '')
            
            if ($content -match [regex]::Escape($oldImport)) {
                $content = $content -replace [regex]::Escape($oldImport), $newImport
                $changed = $true
            }
        }
        
        if ($changed) {
            $content | Set-Content -LiteralPath $file.FullName -NoNewline
            Write-Host "Updated: $($file.FullName)"
        }
    } catch {
        Write-Warning "Failed: $($file.FullName)"
    }
}
