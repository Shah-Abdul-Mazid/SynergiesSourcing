FROM python:3.11-slim

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
# Filter requirements.txt to remove torch and nvidia packages, then install them.
# We manually install CPU versions of torch and torchvision, plus uvicorn and fastapi.
RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel && \
    python -c "import re; p = open('requirements.txt'); lines = [l for l in p if not re.match(r'^(torch|nvidia)', l.lower())]; open('reqs_no_torch.txt', 'w').writelines(lines)" && \
    pip install --no-cache-dir -r reqs_no_torch.txt && \
    pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.13.0+cpu torchvision==0.28.0+cpu && \
    pip install --no-cache-dir "uvicorn[standard]" fastapi

# Copy application code
COPY . .

# Render dynamically assigns a PORT — expose it as a hint
EXPOSE 8080

# Use sh -c so ${PORT} will be expanded at runtime by the shell
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
