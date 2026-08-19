# =========================================================
# eVault — Launch All Microservices (Windows PowerShell)
# =========================================================
# Starts each service in its own titled PowerShell window.

$workspace = "C:\updated evault"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " Starting eVault Microservices & Frontend...  " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Auth Service (Port 8081)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\evault-auth'; `$host.UI.RawUI.WindowTitle='1. Auth Service (8081)'; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 2

# 2. Document Service (Port 8082)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\scratch_doc_service'; `$host.UI.RawUI.WindowTitle='2. Document Service (8082)'; uvicorn app.main:app --host 0.0.0.0 --port 8082 --reload"
Start-Sleep -Seconds 2

# 3. Blockchain Service (Port 8083)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\evault-blockchain'; `$host.UI.RawUI.WindowTitle='3. Blockchain Service (8083)'; npm start"
Start-Sleep -Seconds 2

# 4. Audit Service (Port 8084)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\evault-audit'; `$host.UI.RawUI.WindowTitle='4. Audit Service (8084)'; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 2

# 5. Notification Service (Port 8085)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\evault-notifications'; `$host.UI.RawUI.WindowTitle='5. Notifications (8085)'; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 2

# 6. Integration Service (Port 8086)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\evault-integration'; `$host.UI.RawUI.WindowTitle='6. Integration (8086)'; uvicorn main:app --host 0.0.0.0 --port 8086 --reload"
Start-Sleep -Seconds 3

# 7. Gateway Service (Port 8080)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\evault-gateway'; `$host.UI.RawUI.WindowTitle='7. API Gateway (8080)'; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 3

# 8. Frontend (Port 3000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\evault-frontend'; `$host.UI.RawUI.WindowTitle='8. Frontend (3000)'; npm run dev"

Write-Host "`nAll 8 services launched in separate windows!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "API Gateway: http://localhost:8080" -ForegroundColor Yellow
