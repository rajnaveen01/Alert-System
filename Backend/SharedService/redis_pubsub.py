import redis
import json

redis_client = redis.Redis(host='redis', port=6379, db=0)

def publish_message(channel, message):
    serialized_message = json.dumps(message)
    redis_client.publish(channel, serialized_message)

def subscribe_to_channel(channel):
    pubsub = redis_client.pubsub()
    pubsub.subscribe(channel)
    return pubsub