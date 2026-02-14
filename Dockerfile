# Use a lightweight Python base image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Copy requirements first to leverage Docker's caching mechanism
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code (your main.py, etc.)
COPY . .

# Expose the port your app will run on (Cloud Run defaults to 8080)
EXPOSE 8080

# The command to run your application
# Using gunicorn or uvicorn is best for production
CMD ["python", "main.py"]
