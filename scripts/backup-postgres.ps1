param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$resolvedParent = [System.IO.Path]::GetFullPath((Split-Path -Parent $OutputPath))
if (-not (Test-Path -LiteralPath $resolvedParent)) {
  New-Item -ItemType Directory -Path $resolvedParent | Out-Null
}
$resolvedOutput = Join-Path $resolvedParent (Split-Path -Leaf $OutputPath)
$container = ([string](docker compose ps -q postgres)).Trim()
if (-not $container) { throw "Container postgres não encontrado." }
docker compose exec -T postgres pg_dump -U blum -d blum -Fc -f /tmp/blum-backup.dump
docker cp "${container}:/tmp/blum-backup.dump" $resolvedOutput
docker compose exec -T postgres rm -f /tmp/blum-backup.dump
if ((Get-Item -LiteralPath $resolvedOutput).Length -le 0) { throw "O backup foi criado vazio." }
docker cp $resolvedOutput "${container}:/tmp/blum-backup-check.dump"
docker compose exec -T postgres pg_restore --list /tmp/blum-backup-check.dump | Out-Null
docker compose exec -T postgres rm -f /tmp/blum-backup-check.dump
Write-Output "Backup criado em $resolvedOutput"
