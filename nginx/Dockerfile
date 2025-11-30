FROM nginx:alpine

# Копируем nginx.conf из контекста server/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Фронтенд будет подмонтирован volume'ом в docker-compose
# или скопирован из frontend сервиса (multi-stage)
EXPOSE 80
CMD ["nginx", " -g", "daemon off;"]
