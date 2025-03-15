FROM python:3.9-slim
WORKDIR /app
COPY SharedService ./SharedService
COPY DashboardService ./DashboardService
RUN pip install --no-cache-dir -r DashboardService/requirements.txt
RUN pip install --no-cache-dir python-decouple
CMD ["uvicorn", "DashboardService.main:app", "--host", "0.0.0.0", "--port", "8003"]