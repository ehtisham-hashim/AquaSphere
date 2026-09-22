# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@12

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build argument for API URL (e.g. https://api.yourdomain.com/api/v1)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build

# Production serve stage with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
