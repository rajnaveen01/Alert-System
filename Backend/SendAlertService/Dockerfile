FROM python:3.9-slim
WORKDIR /app
COPY SharedService ./SharedService
COPY SendAlertService ./SendAlertService
COPY ScheduleAlertService ./ScheduleAlertService  
RUN pip install --no-cache-dir -r SendAlertService/requirements.txt
RUN pip install --no-cache-dir python-decouple
RUN pip install --no-cache-dir pytz
CMD ["celery", "-A", "SendAlertService.main", "worker", "--loglevel=info"]