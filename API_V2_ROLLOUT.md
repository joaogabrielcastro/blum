# API v2

O backend expõe apenas **`/api/v2`**. Não há mais rotas `/api/v1`.

- Cabeçalho **`x-api-version: v2`** nas rotas versionadas.
- Contrato camelCase: ver `blum_backend/scripts/check_v2_contract.js` e `npm run contract:v2 --prefix blum_backend`.
