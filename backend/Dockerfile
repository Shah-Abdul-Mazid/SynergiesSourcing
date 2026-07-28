FROM python:3.10-slim

WORKDIR /app

# Keep Python output buffered and avoid writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install minimal system-level build/runtime deps and OpenCV dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    gcc \
    ca-certificates \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python dependencies
COPY requirements.txt .

RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    # ultralytics pulls in full opencv-python as a transitive dep; remove it and keep only headless \
    pip uninstall -y opencv-python || true && \
    pip install --no-cache-dir --force-reinstall opencv-python-headless==4.10.0.84

# Copy application code
COPY . .

# Render dynamically assigns a PORT — expose it as a hint
EXPOSE 8080

# Use sh -c so ${PORT} will be expanded at runtime by the shell
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
