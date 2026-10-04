import json, os, boto3

lam = boto3.client("lambda")
PROCESSOR = os.environ["PROCESSOR_NAME"]

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return resp(400, {"error": "Invalid JSON"})

    if "orderId" not in body or "amount" not in body:
        return resp(400, {"error": "orderId and amount are required"})

    lam.invoke(
        FunctionName=PROCESSOR,
        InvocationType="Event",   # ASYNC: this is what enables Destinations
        Payload=json.dumps(body).encode(),
    )
    return resp(202, {"message": "Accepted", "orderId": body["orderId"]})

def resp(code, obj):
    return {"statusCode": code,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(obj)}
