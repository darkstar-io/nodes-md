FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY data/.gitkeep ./data/.gitkeep

ENV PORT=3000
ENV DATA_DIR=/app/data

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app
USER appuser

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "src/index.js"]
