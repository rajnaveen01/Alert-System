from celery import shared_task
from SharedService.database import db
from bson import ObjectId
from datetime import datetime
import pytz
import logging

logger = logging.getLogger(__name__)
ist = pytz.timezone('Asia/Kolkata')

@shared_task(name='ScheduleAlertService.tasks.schedule_alert_status_update')
def schedule_alert_status_update(alert_id, recipient):
    current_time_ist = datetime.now(ist)
    try:
        alert = db["Alerts"].find_one({"_id": ObjectId(alert_id)})
        if alert:
            if alert["status"] == "Unsent" and alert["received"] <= current_time_ist.isoformat():
                db["Alerts"].update_one(
                    {"_id": ObjectId(alert_id)},
                    {"$set": {"status": "Sent"}}
                )
                logger.info(f"Alert {alert_id} status updated to 'Sent' for recipient: {recipient}")
        else:
            logger.warning(f"No alert found with id {alert_id}")
    except Exception as e:
        logger.error(f"Error updating alert status for alert {alert_id}, recipient {recipient}: {e}")



