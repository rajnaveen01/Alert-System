from fastapi import FastAPI, HTTPException, Depends
from SharedService.database_operations import insert_document
from SharedService.model import AlertModel
from datetime import datetime
from typing import Optional, List
import pytz
from fastapi.encoders import jsonable_encoder
from celery import Celery 
from fastapi.responses import StreamingResponse
from fastapi import File, UploadFile
import pandas as pd
from io import BytesIO
from SharedService.redis_pubsub import publish_message
from fastapi.middleware.cors import CORSMiddleware
import json
import logging

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

celery_app = Celery('tasks', broker='redis://redis:6379/0')

ist = pytz.timezone('Asia/Kolkata')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/create-alert")
async def create_alert(alerts: Optional[List[AlertModel]] = None, alert: Optional[AlertModel] = None):
    current_time_ist = datetime.now(ist)

    if alerts:  
        created_alerts = []
        for alert_data in alerts:
            try:
                scheduled_time = datetime.fromisoformat(alert_data.received) if isinstance(alert_data.received, str) else alert_data.received
                scheduled_time_ist = scheduled_time.astimezone(ist)
            except Exception as e:
                logger.error(f"Invalid received time format for alert: {alert_data}. Error: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid received time format: {e}")
            
            for recipient in alert_data.recipients:
                alert_record = {
                    "alertType": alert_data.alertType,
                    "recipients": [recipient],
                    "subject": alert_data.subject,
                    "content": alert_data.content,
                    "sent": current_time_ist.isoformat(),
                    "received": scheduled_time_ist.isoformat(),
                    "priority": alert_data.priority,
                    "status": alert_data.status or "Unsent",
                }

                alert_id = insert_document("Alerts", jsonable_encoder(alert_record))
                created_alerts.append(alert_id)
                
                scheduled_time_utc = scheduled_time_ist.astimezone(pytz.utc)
                
                if alert_data.alertType in ["MS Teams", "SMS"]:
                    celery_app.send_task(
                        'ScheduleAlertService.tasks.schedule_alert_status_update',
                        args=[alert_id, recipient],
                        eta=scheduled_time_utc
                    )

                if alert_data.alertType == "Email":
                    celery_app.send_task(
                        'ScheduleAlertService.tasks.schedule_alert_status_update',
                        args=[alert_id, recipient],
                        eta=scheduled_time_utc
                    )
                    celery_app.send_task(
                        'SendAlertService.tasks.send_email_alert',
                        args=[alert_id],
                        eta=scheduled_time_utc
                    )
                
                logger.info(f"Scheduled tasks for alert_id {alert_id} at {scheduled_time_utc} for recipient: {recipient}")

        publish_message("alerts_created", jsonable_encoder(alerts))
        return {"message": "Alerts created", "alert_ids": created_alerts}

    elif alert:
        try:
            scheduled_time = datetime.fromisoformat(alert.received) if isinstance(alert.received, str) else alert.received
            scheduled_time_ist = scheduled_time.astimezone(ist)
        except ValueError as e:
            logger.error("Invalid ISO format for received time")
            raise HTTPException(status_code=400, detail="Invalid ISO format for received time")
        except Exception as e:
            logger.error(f"Internal Server Error: {e}")
            raise HTTPException(status_code=500, detail="Internal Server Error")

        created_alerts = []
        for recipient in alert.recipients:
            alert_record = {
                "alertType": alert.alertType,
                "recipients": [recipient],
                "subject": alert.subject,
                "content": alert.content,
                "sent": current_time_ist.isoformat(),
                "received": scheduled_time_ist.isoformat(),
                "priority": alert.priority,
                "status": alert.status or "Unsent",
            }

            alert_id = insert_document("Alerts", jsonable_encoder(alert_record))
            created_alerts.append(alert_id)

            scheduled_time_utc = scheduled_time_ist.astimezone(pytz.utc)

            if alert.alertType in ["MS Teams", "SMS"]:
                celery_app.send_task(
                    'ScheduleAlertService.tasks.schedule_alert_status_update',
                    args=[alert_id, recipient],
                    eta=scheduled_time_utc
                )
            elif alert.alertType == "Email":
                celery_app.send_task(
                    'SendAlertService.tasks.send_email_alert',
                    args=[alert_id],
                    eta=scheduled_time_utc
                )
                celery_app.send_task(
                    'ScheduleAlertService.tasks.schedule_alert_status_update',
                    args=[alert_id, recipient],
                    eta=scheduled_time_utc
                )
            
            logger.info(f"Scheduled tasks for alert_id {alert_id} at {scheduled_time_utc} for recipient: {recipient}")

        publish_message("alert_created", jsonable_encoder(alert))
        return {"message": "Alert created successfully", "alert_ids": created_alerts}

    else:
        raise HTTPException(status_code=400, detail="No alert data provided")

 
@app.post("/upload-alerts-excel")
async def upload_alerts_excel(file: UploadFile = File(...)):
    if file.content_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        content = await file.read()
        df = pd.read_excel(BytesIO(content))

        if 'Receive Time' not in df.columns:
            raise HTTPException(status_code=400, detail="Excel file must contain 'Receive Time' column.")

        alerts = df.to_dict(orient='records')
        created_alerts = []

        for alert in alerts:
            try:
                receive_time = alert.get('Receive Time')
                if isinstance(receive_time, str):
                    alert['Receive Time'] = datetime.fromisoformat(receive_time)

                recipients = alert.get('Recipients')
                recipients = recipients.split(',') if isinstance(recipients, str) else [str(recipients)]

                for recipient in recipients:
                    alert_record = {
                        "alertType": alert.get('Alert Type'),
                        "recipients": [recipient],
                        "subject": alert.get('Subject'),
                        "content": alert.get('Content'),
                        "sent": datetime.utcnow().isoformat(),
                        "received": alert['Receive Time'].isoformat(),
                        "priority": alert.get('Priority'),
                        "status": 'Unsent'
                    }

                    alert_id = insert_document("Alerts", jsonable_encoder(alert_record))
                    created_alerts.append(str(alert_id))

                    scheduled_time_utc = alert['Receive Time'].astimezone(pytz.utc)
                    celery_app.send_task('ScheduleAlertService.tasks.schedule_alert_status_update', args=[alert_id], eta=scheduled_time_utc)
                    celery_app.send_task('SendAlertService.tasks.send_email_alert', args=[alert_id], eta=scheduled_time_utc)

            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error processing alert {alert}: {str(e)}")

        publish_message("alerts_uploaded", jsonable_encoder(alerts))
        return {"message": "Alerts uploaded successfully", "alert_ids": created_alerts}

    else:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")

@app.get("/download-excel-template")
async def download_template():
    df = pd.DataFrame({
        'Alert Type': [],
        'Recipients': [],
        'Subject': [],
        'Content': [],
        'Receive Time': [],
        'Priority': [],
    })

    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False)

    output.seek(0)
    return StreamingResponse(output, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                             headers={"Content-Disposition": "attachment; filename=alert_template.xlsx"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)