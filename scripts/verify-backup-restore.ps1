param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$ErrorActionPreference = "Stop"
$database = "blum_restore_check"
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
$container = ([string](docker compose ps -q postgres)).Trim()
if (-not $container) { throw "Container postgres não encontrado." }
$exists = [string](docker compose exec -T postgres psql -U blum -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$database'")
if ($exists -eq "1") { throw "O banco isolado $database já existe; nada foi alterado." }

try {
  docker compose exec -T postgres createdb -U blum $database
  docker cp $resolvedBackup "${container}:/tmp/blum-restore-check.dump"
  docker compose exec -T postgres pg_restore -U blum -d $database --no-owner --no-privileges /tmp/blum-restore-check.dump
  $tables = @("tenants", "users", "clients", "products", "orders", "order_items")
  foreach ($table in $tables) {
    $source = ([string](docker compose exec -T postgres psql -U blum -d blum -tAc "SELECT COUNT(*) FROM $table")).Trim()
    $restored = ([string](docker compose exec -T postgres psql -U blum -d $database -tAc "SELECT COUNT(*) FROM $table")).Trim()
    if ($source -ne $restored) { throw "Contagem divergente em ${table}: origem=$source restauração=$restored" }
  }
  Write-Output "Restauração verificada com sucesso em $database."
} finally {
  docker compose exec -T postgres rm -f /tmp/blum-restore-check.dump
  docker compose exec -T postgres dropdb -U blum --if-exists $database
}
