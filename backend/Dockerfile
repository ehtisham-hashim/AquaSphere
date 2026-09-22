FROM node:22-alpine

# Install OpenSSL for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Enable pnpm
RUN npm install -g pnpm@12

# Copy dependency definitions and prisma schema first
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Approve build scripts for packages that need them (generated inline to avoid CRLF issues)
RUN printf '%s\n' \
  'only-built-dependencies[]=@prisma/engines' \
  'only-built-dependencies[]=@scarf/scarf' \
  'only-built-dependencies[]=bcrypt' \
  'only-built-dependencies[]=prisma' > .npmrc

# Install dependencies (including devDependencies required for Prisma generate)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Expose backend port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# On container start, push database schema to postgres and start express
CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
