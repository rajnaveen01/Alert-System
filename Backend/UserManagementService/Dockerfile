FROM python:3.9-slim
WORKDIR /app
COPY SharedService ./SharedService
COPY UserManagementService ./UserManagementService
RUN pip install --no-cache-dir -r UserManagementService/requirements.txt
RUN pip install --no-cache-dir python-decouple
CMD ["uvicorn", "UserManagementService.main:app", "--host", "0.0.0.0", "--port", "8001"]