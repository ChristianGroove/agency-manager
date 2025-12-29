# Script para actualizar todas las referencias legacy

# quotes-actions
(Get-Content "src\app\(dashboard)\quotes\page.tsx") -replace '@/app/actions/quotes-actions', '@/modules/verticals/agency/quotes/actions' | Set-Content "src\app\(dashboard)\quotes\page.tsx"

# invoices-actions  
(Get-Content "src\app\(dashboard)\invoices\page.tsx") -replace '@/app/actions/invoices-actions', '@/modules/core/billing/invoices-actions' | Set-Content "src\app\(dashboard)\invoices\page.tsx"

# services-actions
Get-ChildItem -Recurse -File "src\modules\verticals\agency\services\*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) -replace '@/app/actions/services-actions', '@/modules/verticals/agency/services/actions' | Set-Content $_.FullName
}

# category-actions
Get-ChildItem -Recurse -File "src\modules\verticals\agency\*.tsx" | ForEach-Object { 
    (Get-Content $_.FullName) -replace '@/app/actions/category-actions', '@/modules/verticals/agency/categories/actions' | Set-Content $_.FullName
}

# dashboard-actions
(Get-Content "src\app\(dashboard)\dashboard\page.tsx") -replace '@/app/actions/dashboard-actions', '@/modules/core/dashboard/actions' | Set-Content "src\app\(dashboard)\dashboard\page.tsx"

# admin actions in platform/admin components
Get-ChildItem -Recurse -File "src\app\(dashboard)\platform\admin\*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) -replace '@/app/actions/admin-dashboard-actions', '@/modules/core/admin/actions' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '@/app/actions/admin-integrations', '@/modules/core/admin/actions' | Set-Content $_.FullName
}

Write-Host "All legacy imports updated!" -ForegroundColor Green
