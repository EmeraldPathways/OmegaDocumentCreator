FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json tsconfig.app.json vite.config.ts index.html /app/
COPY src /app/src

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
