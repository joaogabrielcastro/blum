# Backup e restauração do PostgreSQL

O backup deve ser executado diariamente, criptografado no armazenamento e mantido fora do servidor da aplicação. A recomendação inicial é RPO de 24 horas e RTO de 4 horas; esses valores precisam ser confirmados pelo responsável do negócio e pelo provedor de produção.

## Criar backup

Pré-requisitos: Docker em execução e o serviço `postgres` saudável.

```powershell
./scripts/backup-postgres.ps1 -OutputPath C:\backups\blum.dump
```

O script produz um dump PostgreSQL no formato custom e testa se o arquivo pode ser listado. Não grave dumps no Git.

## Testar restauração

Use um banco isolado, nunca o banco ativo:

```powershell
./scripts/verify-backup-restore.ps1 -BackupPath C:\backups\blum.dump
```

O script cria exclusivamente `blum_restore_check`, restaura o dump, compara contagens das tabelas críticas e remove o banco de verificação ao terminar. Se esse nome já existir, o script para sem alterá-lo.

## Rotina operacional

1. Automatizar o backup diário no provedor e alertar falhas.
2. Reter ao menos 7 diários, 4 semanais e 6 mensais, conforme LGPD e política comercial.
3. Executar o teste de restauração mensalmente e registrar data, duração e resultado.
4. Restringir acesso aos dumps e rotacionar as credenciais após qualquer exposição.
5. Antes de uma restauração real, interromper escritas, preservar um dump do estado atual e obter aprovação do responsável.
