import json, os, boto3
from boto3.dynamodb.conditions import Attr

ddb = boto3.resource("dynamodb").Table(os.environ["TABLE"])
lam = boto3.client("lambda")
sqs = boto3.client("sqs")
MAX_REPLAYS = 3

def lambda_handler(event, context):
    failed = ddb.scan(FilterExpression=Attr("status").eq("FAILED"))["Items"]
    replayed, parked = [], []

    for item in failed:
        oid = item["orderId"]
        count = int(item.get("replayCount", 0))
        payload = json.loads(item["payload"])

        if count >= MAX_REPLAYS:
            sqs.send_message(QueueUrl=os.environ["PARKING_QUEUE_URL"],
                             MessageBody=json.dumps(item, default=str))
            ddb.update_item(Key={"orderId": oid},
                            UpdateExpression="SET #s = :s",
                            ExpressionAttributeNames={"#s": "status"},
                            ExpressionAttributeValues={":s": "PARKED"})
            parked.append(oid)
            continue

        payload["fail"] = False   # simulates "bug fixed" so the replay can succeed
        ddb.update_item(Key={"orderId": oid},
                        UpdateExpression="SET replayCount = :c, #s = :s",
                        ExpressionAttributeNames={"#s": "status"},
                        ExpressionAttributeValues={":c": count + 1, ":s": "REPLAYING"})
        lam.invoke(FunctionName="processor-fn", InvocationType="Event",
                   Payload=json.dumps(payload).encode())
        replayed.append(oid)

    return {"replayed": replayed, "parked": parked}
