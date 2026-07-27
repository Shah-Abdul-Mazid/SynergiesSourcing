FROM python:3.11-slim

WORKDIR /app

# Keep Python output buffered and avoid writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install minimal system-level build/runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    gcc \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python dependencies
COPY requirements.txt .
RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Render dynamically assigns a PORT — expose it as a hint
EXPOSE 8080

# Use sh -c so ${PORT} will be expanded at runtime by the shell
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
