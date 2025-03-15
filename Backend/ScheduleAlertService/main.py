from celery import Celery
from ScheduleAlertService.tasks import schedule_alert_status_update
from celery.signals import worker_process_init
from SharedService.redis_pubsub import subscribe_to_channel
import json
import ScheduleAlertService.tasks
import SendAlertService.tasks

celery_app = Celery('ScheduleAlertService', broker='redis://redis:6379/0')
celery_app.conf.update(
    beat_scheduler='redbeat.RedBeatScheduler',
    redbeat_redis_url='redis://redis:6379/2',
    task_routes={'ScheduleAlertService.tasks.schedule_alert_status_update': {'queue': 'schedule_queue'},
    'SendAlertService.tasks.send_email_alert': {'queue': 'send_queue'}},
    timezone='Asia/Kolkata',
    enable_utc=False,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
)

celery_app.autodiscover_tasks(['SendAlertService.tasks','ScheduleAlertService.tasks'])

@worker_process_init.connect
def startup_event(*args, **kwargs):
    pubsub = subscribe_to_channel("alert_created")
    pubsub.subscribe("alerts_created")
    pubsub.subscribe("alerts_uploaded")

def handle_message(message):
    if message['type'] == 'message':
        data = json.loads(message['data'])
        print(f"Received message: {data}")

if __name__ == '__main__':
    celery_app.start()

