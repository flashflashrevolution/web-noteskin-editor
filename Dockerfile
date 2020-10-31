FROM nginx:1.19.0-alpine
LABEL org.opencontainers.image.source https://github.com/flashflashrevolution/web-noteskin-editor
COPY . /usr/share/nginx/html
