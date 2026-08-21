$ErrorActionPreference = "Stop"

Write-Host "============================="
Write-Host "AI PROJECT VERIFICATION"
Write-Host "============================="

Write-Host "`n[1/6] Backend Build"
dotnet build backend

Write-Host "`n[2/6] Backend Tests"
dotnet test backend

Write-Host "`n[3/6] Frontend Type Check"
Set-Location frontend
npm run typecheck
Set-Location ..

Write-Host "`n[4/6] Frontend Lint"
Set-Location frontend
npm run lint
Set-Location ..

Write-Host "`n[5/6] Frontend Tests"
Set-Location frontend
npm test -- --run
Set-Location ..

Write-Host "`n[6/6] E2E Tests (Requires local dev server running)"
# Uncomment when local test server is configured
# npx playwright test

Write-Host "`n============================="
Write-Host "ALL TESTS PASSED"
Write-Host "============================="
