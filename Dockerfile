FROM python:3.11-slim

# Install ffmpeg and other dependencies
RUN apt-get update && apt-get install -y ffmpeg curl nodejs gcc g++ git python3-tk && rm -rf /var/lib/apt/lists/*

# Set up a non-root user (Hugging Face requirement)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy backend requirements and install
COPY --chown=user backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy application code
COPY --chown=user . .

# Expose Hugging Face default port
EXPOSE 7860

# Change working directory to backend
WORKDIR $HOME/app/backend

# Run the FastAPI server on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
