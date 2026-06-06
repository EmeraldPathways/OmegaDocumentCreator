FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.json tsconfig.app.json vite.config.ts index.html /app/
COPY src /app/src

RUN npm install

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
