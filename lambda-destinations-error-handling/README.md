# AWS Lambda Destinations and Error Handling Design

Team: Y24-SAA-Team351 | Project ID: 24CC3014-P069 | Region: ap-south-1 (Mumbai)

## Overview
An asynchronous order-processing pipeline that demonstrates Lambda Destinations
(on success / on failure), automatic retries, SNS alerts, idempotency, replay with
a poison-message parking queue, and a comparison against Dead-Letter Queues.

## Architecture
```
Client -> API Gateway -> ingestion-fn -> processor-fn (async)
  On success            -> success-queue -> success-handler-fn -> DynamoDB
  On failure (2 retries)-> failure-queue -> error-handler-fn -> DynamoDB + SNS email
  replay-fn resubmits FAILED orders; after 3 replays they go to parking-queue
  processor-dlq-fn uses a DLQ (dlq-demo-queue) for the comparison
```
Add your diagram at `docs/architecture.png`.

## AWS resources
| Type | Name |
|---|---|
| DynamoDB | `OrdersAudit` (partition key `orderId`, String) |
| SQS | `success-queue`, `failure-queue`, `parking-queue`, `dlq-demo-queue` |
| SNS | `alerts-topic` (email subscription) |
| IAM role | `hackathon-lambda-role` |
| HTTP API | `orders-api` with `POST /orders` |

## Lambda functions
| Function | Code | Env vars | Purpose |
|---|---|---|---|
| ingestion-fn | `ingestion/app.py` | `PROCESSOR_NAME=processor-fn` | Validates request, invokes processor async, returns 202 |
| processor-fn | `processor/app.py` | `TABLE=OrdersAudit` | Idempotent processing, simulated failures |
| success-handler-fn | `handlers/success_handler.py` | `TABLE` | Records success metadata (trigger: success-queue) |
| error-handler-fn | `handlers/error_handler.py` | `TABLE`, `TOPIC_ARN` | Marks FAILED, sends SNS alert (trigger: failure-queue) |
| replay-fn | `handlers/replay.py` | `TABLE`, `PARKING_QUEUE_URL` | Replays FAILED orders, parks after 3 |
| processor-dlq-fn | `processor/dlq_app.py` | `TABLE` | Same logic, DLQ only, for comparison |

## Configuration
- `processor-fn`: async retries = 2, max event age = 1 hour, no DLQ.
  Destinations: On success -> `success-queue`, On failure -> `failure-queue`.
- `processor-dlq-fn`: DLQ = `dlq-demo-queue`, no Destinations.
- Handler triggers: SQS `success-queue` (batch 5), SQS `failure-queue` (batch 1).

## Sample requests
`POST <invoke-url>/orders` with header `Content-Type: application/json`

| Body | Result |
|---|---|
| `{"orderId":"1","amount":500,"fail":false}` | 202, then SUCCESS |
| `{"orderId":"2","amount":500,"fail":true}` | 202, 3 attempts, FAILED, email alert |
| `{"orderId":"3","amount":-5}` | 202, then FAILED (invalid amount) |
| `{"amount":500}` | 400 |

## Destinations vs DLQ
| | DLQ | Destinations |
|---|---|---|
| Captures success | No | Yes |
| Message content | Original event only | Request, response, error, stack trace, invoke count |
| Targets | SQS, SNS | SQS, SNS, Lambda, EventBridge |

## Screenshots
See `docs/screenshots/`.

## Team
| Member | Module |
|---|---|
| Chandan Kumar Mohanty | Ingestion |
| Kunaparaju Abhishek Varma | Processor + Destinations |
| Tatikonda Sai Uday Kiran | Handlers, replay, DLQ comparison |
| Nalluri Sathwik | Monitoring, docs |

## Production hardening (not implemented)
Least-privilege IAM, KMS encryption, API authentication, rate limiting, SQS redrive policy.
