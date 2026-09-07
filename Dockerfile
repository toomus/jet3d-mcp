FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src/ ./src/
RUN npm install
RUN npm run build

FROM node:20-alpine AS release
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/build/ ./build/

EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["node", "build/index.js"]
