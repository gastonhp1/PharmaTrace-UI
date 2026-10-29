# Static build of the UI served by unprivileged nginx on :8080.
# VITE_* values are baked in at build time. The default "/" makes the UI call the
# API on its own origin (/api/...), which is how the cluster routes it.
# Leave VITE_API_KEY empty for real deployments: anything baked in is readable in the bundle.
# Users load the API key at runtime from the key button in the UI (kept in sessionStorage).
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL=/
ARG VITE_API_KEY=
RUN VITE_API_URL="$VITE_API_URL" VITE_API_KEY="$VITE_API_KEY" npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
# OS security updates on top of the base image (the base runs as the nginx user).
USER root
RUN apk upgrade --no-cache
USER 101
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
