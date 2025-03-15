FROM python:3.9-slim
WORKDIR /app
COPY SharedService ./SharedService
COPY CreateAlertService ./CreateAlertService
RUN pip install --no-cache-dir -r CreateAlertService/requirements.txt
RUN pip install --no-cache-dir python-decouple
CMD ["uvicorn", "CreateAlertService.main:app", "--host", "0.0.0.0", "--port", "8002"]