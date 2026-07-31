FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json tsconfig.app.json vite.config.ts index.html /app/
COPY src /app/src

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

ENV VITE_API_PROXY_TARGET=http://api:8000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
