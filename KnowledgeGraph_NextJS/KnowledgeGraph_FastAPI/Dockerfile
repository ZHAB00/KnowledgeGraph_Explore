FROM python:3.12-slim

WORKDIR /app

# Install system deps for pdfplumber
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo libpng16-16 && rm -rf /var/lib/apt/lists/*

# Install torch CPU FIRST so sentence-transformers doesn't pull CUDA (~2.5 GB saved)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
