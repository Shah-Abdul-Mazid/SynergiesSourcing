FROM python:3.11-slim

WORKDIR /app

# Install system-level dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Render dynamically assigns a PORT — expose it as a hint
EXPOSE 8080

# Use shell form so $PORT is expanded at runtime (Render sets this env var)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
