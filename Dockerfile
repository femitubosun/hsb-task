FROM node:20-alpine AS builder

RUN npm install -g pnpm @nestjs/cli

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Install netcat for the wait-for-it script
RUN apk add --no-cache netcat-openbsd

COPY entrypoint.sh wait-for-it.sh ./

# Ensure correct line endings and permissions
RUN sed -i 's/\r$//' entrypoint.sh && \
    sed -i 's/\r$//' wait-for-it.sh && \
    chmod +x entrypoint.sh wait-for-it.sh
COPY . .

RUN pnpm run build

ENTRYPOINT ["./entrypoint.sh"]

FROM node:20-alpine AS production

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 5800

CMD ["pnpm", "run", "start:prod"]
