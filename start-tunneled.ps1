# Start Interstellar and Tunnel Script
Write-Host "🚀 Starting Interstellar Proxy..." -ForegroundColor Green

# Start Interstellar in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start" -WindowStyle Minimized

# Wait for Interstellar to start
Start-Sleep -Seconds 5

Write-Host "🌐 Creating public tunnel..." -ForegroundColor Yellow
Write-Host ""

# Start localtunnel and capture URL
$tunnel = Start-Process -FilePath "lt" -ArgumentList "--port", "8080" -PassThru -NoNewWindow -RedirectStandardOutput "tunnel-url.txt" -RedirectStandardError "tunnel-error.txt"

Start-Sleep -Seconds 8

# Try to extract URL from output
if (Test-Path "tunnel-url.txt") {
    $output = Get-Content "tunnel-url.txt" -Raw
    if ($output -match "https://[a-z0-9-]+\.loca\.lt") {
        $url = $matches[0]
        Write-Host "✅ Public URL: $url" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Copy this URL and paste it in Justaline admin settings!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  Keep this window open! Closing it will stop the tunnel." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press Ctrl+C to stop both Interstellar and tunnel"
    } else {
        Write-Host "⚠️  Tunnel starting... Check the window that opened for the URL" -ForegroundColor Yellow
        Write-Host "Look for a line that says 'your url is: https://...'" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Tunnel starting... A new window should open with the URL" -ForegroundColor Yellow
}

# Keep script running
Write-Host "Running... Press Ctrl+C to stop"
try {
    while ($true) {
        Start-Sleep -Seconds 10
    }
} finally {
    Write-Host "Stopping..."
    Stop-Process -Name "node" -ErrorAction SilentlyContinue
    Stop-Process -Name "lt" -ErrorAction SilentlyContinue
}

