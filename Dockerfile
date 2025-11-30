# Этап 1: сборка фронтенда
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Этап 2: nginx сервер
FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/frontend/dist /var/app
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
