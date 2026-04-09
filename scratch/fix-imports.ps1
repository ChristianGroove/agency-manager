$files = Get-ChildItem -Path src -Recurse -Include *.ts, *.tsx
foreach ($file in $files) {
    try {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        if ($content -match '@/modules/core/organizations/actions') {
            $newContent = $content -replace '@/modules/core/organizations/actions', '@/modules/core/organizations/organization-actions'
            $newContent | Set-Content -LiteralPath $file.FullName -NoNewline
            Write-Host "Updated: $($file.FullName)"
        }
    } catch {
        Write-Warning "Failed to process: $($file.FullName)"
    }
}
