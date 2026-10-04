# Order Request Simulator (Front End)

React app that builds and sends order requests to the API, one click per test case.

## Request types

| Type | Backend path it exercises |
|---|---|
| Successful order | Success destination, success-handler-fn |
| Processing failure | 3 attempts, failure destination, FAILED, email alert |
| Invalid amount | Failure path with a validation error |
| Duplicate order | Idempotency (DUPLICATE_SKIPPED) |
| Missing orderId | Edge validation, instant 400 |

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Update `.env` with the real API URL before running. API Gateway needs CORS enabled for the page's origin, or use the Vite dev proxy.
