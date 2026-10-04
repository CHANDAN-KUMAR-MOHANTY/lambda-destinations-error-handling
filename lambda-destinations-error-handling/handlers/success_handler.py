import json, os, time, boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE"])

def lambda_handler(event, context):
    for rec in event["Records"]:
        msg = json.loads(rec["body"])
        order_id = str(msg["requestPayload"]["orderId"])
        table.update_item(
            Key={"orderId": order_id},
            UpdateExpression="SET successNotifiedAt = :t, invokeCount = :c",
            ExpressionAttributeValues={
                ":t": int(time.time()),
                ":c": msg["requestContext"]["approximateInvokeCount"],
            },
        )
        print(f"SUCCESS confirmed for {order_id}")
