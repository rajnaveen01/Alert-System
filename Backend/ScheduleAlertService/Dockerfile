FROM python:3.9-slim
WORKDIR /app
COPY SharedService ./SharedService
COPY ScheduleAlertService ./ScheduleAlertService
COPY SendAlertService ./SendAlertService  
RUN pip install --no-cache-dir -r ScheduleAlertService/requirements.txt
RUN pip install --no-cache-dir python-decouple
RUN pip install --no-cache-dir pytz
CMD ["celery", "-A", "ScheduleAlertService.main", "worker", "--loglevel=info"]