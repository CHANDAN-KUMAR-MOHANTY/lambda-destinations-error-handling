import os, time, json, boto3
from botocore.exceptions import ClientError

table = boto3.resource("dynamodb").Table(os.environ["TABLE"])

def lambda_handler(event, context):
    order_id = str(event.get("orderId", "")).strip()
    amount = event.get("amount")

    if not order_id:
        raise ValueError("Missing orderId")

    # Idempotency: skip only if this order already succeeded.
    # update_item keeps existing attributes such as replayCount.
    try:
        table.update_item(
            Key={"orderId": order_id},
            UpdateExpression="SET #s = :p, payload = :pl, updatedAt = :t",
            ConditionExpression="attribute_not_exists(orderId) OR #s <> :ok",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":p": "PROCESSING", ":pl": json.dumps(event),
                ":t": int(time.time()), ":ok": "SUCCESS",
            },
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            print(f"DUPLICATE_SKIPPED for order {order_id}")
            return {"orderId": order_id, "result": "DUPLICATE_SKIPPED"}
        raise

    if event.get("fail") is True:
        raise RuntimeError(f"Simulated failure for order {order_id}")
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount <= 0:
        raise ValueError(f"Invalid amount for order {order_id}: {amount}")

    table.update_item(
        Key={"orderId": order_id},
        UpdateExpression="SET #s = :s, updatedAt = :t",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "SUCCESS", ":t": int(time.time())},
    )
    return {"orderId": order_id, "result": "PROCESSED", "amount": amount}
