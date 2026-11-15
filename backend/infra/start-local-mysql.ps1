$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$dataDirectory = Join-Path $workspace '.local\mysql'
$serverBinary = if ($env:MYSQL_SERVER_BIN) { $env:MYSQL_SERVER_BIN } else { 'D:\MySQL\server\bin\mysqld.exe' }
if (-not (Test-Path -LiteralPath $serverBinary)) { throw 'MySQL binary not found. Set MYSQL_SERVER_BIN or use infra/docker-compose.yml.' }
if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'mysql'))) { throw 'The isolated local database has not been initialized. Use the documented Docker Compose setup on a new computer.' }
$listener = Get-NetTCPConnection -LocalPort 3308 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  $existing = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener[0].OwningProcess)"
  if ($existing.CommandLine -notlike '*Dexa_Group_Technical_Test/.local/mysql*' -and $existing.CommandLine -notlike "*$dataDirectory*") { throw 'Port 3308 is occupied by another process.' }
  Write-Output 'Project MySQL is already running on 127.0.0.1:3308.'
  exit 0
}
$baseDirectory = Split-Path (Split-Path $serverBinary)
$arguments = @('--no-defaults', '--console', "--basedir=`"$baseDirectory`"", "--datadir=`"$dataDirectory`"", '--port=3308', '--bind-address=127.0.0.1', '--mysqlx=OFF')
$process = Start-Process -FilePath $serverBinary -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $workspace '.local\mysql.stdout.log') -RedirectStandardError (Join-Path $workspace '.local\mysql.stderr.log')
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Milliseconds 500
  $process.Refresh()
  if ($process.HasExited) { throw 'MySQL failed to start. Check .local/mysql.stderr.log.' }
  if (Get-NetTCPConnection -LocalPort 3308 -State Listen -ErrorAction SilentlyContinue) {
    Write-Output "Project MySQL started on 127.0.0.1:3308 (PID $($process.Id))."
    exit 0
  }
}
throw 'MySQL readiness timed out. Check .local/mysql.stderr.log.'
