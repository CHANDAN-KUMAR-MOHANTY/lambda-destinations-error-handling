import json, os, time, boto3

ddb = boto3.resource("dynamodb").Table(os.environ["TABLE"])
sns = boto3.client("sns")

def lambda_handler(event, context):
    for rec in event["Records"]:
        msg = json.loads(rec["body"])
        payload = msg["requestPayload"]
        order_id = str(payload.get("orderId", "UNKNOWN"))
        err = msg.get("responsePayload", {})
        err_msg = err.get("errorMessage", "unknown error")
        err_type = err.get("errorType", "Error")
        attempts = msg["requestContext"]["approximateInvokeCount"]

        ddb.update_item(
            Key={"orderId": order_id},
            UpdateExpression=("SET #s = :s, errorMessage = :m, errorType = :ty, "
                              "payload = :p, attempts = :a, failedAt = :t, "
                              "replayCount = if_not_exists(replayCount, :z)"),
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "FAILED", ":m": err_msg, ":ty": err_type,
                ":p": json.dumps(payload), ":a": attempts,
                ":t": int(time.time()), ":z": 0,
            },
        )
        sns.publish(
            TopicArn=os.environ["TOPIC_ARN"],
            Subject=f"[ALERT] Order {order_id} failed",
            Message=(f"Order: {order_id}\nError: {err_type}: {err_msg}\n"
                     f"Attempts: {attempts}\nRequestId: "
                     f"{msg['requestContext']['requestId']}"),
        )
