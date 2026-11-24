FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        libreoffice-writer \
        fonts-liberation \
    && python3 -m venv /opt/venv \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/venv/bin:${PATH}"

COPY package*.json ./
RUN npm ci --omit=dev

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

RUN useradd --system --create-home --uid 10001 appuser
COPY --chown=appuser:appuser . .

ENV NODE_ENV=production
USER appuser

CMD ["npm", "start"]
