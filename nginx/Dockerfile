FROM nginx:latest

# Копируем статические файлы фронтенда
COPY frontend/dist /var/app

# Копируем конфиг nginx (создать папку nginx/ в корне проекта)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]