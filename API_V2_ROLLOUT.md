# API v2 Rollout Guide

## Objective

Roll out `/api/v2` with camelCase-only responses while keeping `/api/v1` stable for current clients.

## What is already implemented

- `/api/v1` and `/api/v2` are both mounted in the backend.
- `v1` keeps compatibility fields.
- `v2` can return camelCase-only on the mapped endpoints.
- Optional deprecation headers for `v1` are supported by environment variables.

## Environment configuration

Use these variables in the backend service:

```env
ENABLE_V1_DEPRECATION_HEADERS=true
API_V1_SUNSET_DATE=Wed, 31 Dec 2026 23:59:59 GMT
```

If deprecation headers are disabled, `v1` keeps working with no warning headers.

## Recommended rollout phases

### Phase 1: Internal validation

1. Keep frontend on `/api/v1`.
2. Validate `v2` with smoke tests (below).
3. Monitor backend logs for unexpected 4xx/5xx in `v2`.

### Phase 2: Controlled client migration

1. Move one screen or one API consumer at a time to `/api/v2`.
2. Prefer low-risk reads first (`GET /products`, `GET /orders`).
3. After stable reads, migrate writes (`POST/PUT`).

### Phase 3: Sunset preparation

1. Enable deprecation headers in production.
2. Communicate sunset date to all consumers.
3. Freeze new feature work on `v1`.

## Smoke test checklist

Assume:

- API base URL is in `$BASE_URL`
- Token is in `$TOKEN`

### 1) Version header

```bash
curl -i "$BASE_URL/api/v2/status" | grep -i "x-api-version"
```

Expected: `x-api-version: v2`

### 2) v1 deprecation headers (when enabled)

```bash
curl -i "$BASE_URL/api/v1/status" | grep -Ei "deprecation|sunset|link|x-api-version"
```

Expected: `x-api-version: v1` and deprecation headers when enabled.

### 3) Products contract (v2 camelCase)

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v2/products?page=1&limit=2"
```

Expected in items: `productCode`, `subCode`, `minStock`, `createdAt`.

### 4) Orders contract (v2 camelCase)

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v2/orders"
```

Expected in each order: `clientId`, `totalPrice`, `documentType`, `paymentMethod`, `createdAt`.

### 5) Backward compatibility in v1

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v1/orders"
```

Expected: legacy-compatible keys are still available for existing frontend.

## Rollback plan

If any issue appears:

1. Keep frontend on `/api/v1`.
2. Disable deprecation headers:
   - `ENABLE_V1_DEPRECATION_HEADERS=false`
3. Keep `/api/v2` available for internal fixes and retesting.

No database rollback is required for API versioning-only changes.
