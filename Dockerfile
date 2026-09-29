# Containerized run of the inventory optimization pipeline.
#
# Build:
#   docker build -t inventory-optimization .
#
# Run the pipeline (default):
#   docker run inventory-optimization
#
# Run the test suite:
#   docker run inventory-optimization python -m pytest tests/ -v

FROM python:3.11-slim

WORKDIR /app

# System deps for scipy/statsmodels wheels on slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first so this layer is cached across code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "run_all.py", "--with-frontend-data"]

