from celery import shared_task
from SharedService.database import db
from bson import ObjectId
from email.mime.text import MIMEText
import smtplib
import pytz
import logging

logger = logging.getLogger(__name__)
ist = pytz.timezone('Asia/Kolkata')

smtp_server = "smtp.gmail.com"
smtp_port = 587
smtp_user = " "
smtp_password = " "

@shared_task(name='SendAlertService.tasks.send_email_alert')
def send_email_alert(alert_id):
    try:
        alert = db["Alerts"].find_one({"_id": ObjectId(alert_id)})
        if alert:
            recipient = alert['recipients'][0] 
            subject = alert['subject']
            content = alert['content']
            
            msg = MIMEText(content)
            msg['Subject'] = subject
            msg['From'] = smtp_user
            msg['To'] = recipient

            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, recipient, msg.as_string())
                logger.info(f"Email sent to {recipient} with subject '{subject}'.")

                db["Alerts"].update_one({"_id": ObjectId(alert_id)}, {"$set": {"status": "Sent"}})
    except Exception as e:
        logger.error(f"Failed to send email for alert {alert_id}: {e}")
