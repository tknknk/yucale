# Node 20 は 2026-04 にメンテナンス期間を終えており、ベースイメージの
# OSパッケージにも Node 本体にもセキュリティ修正が入らない (2026-10-21 の
# 依存監査)。22 は 2027-04 まで Maintenance LTS。
FROM node:25-alpine AS builder
WORKDIR /app

# Build arguments for NEXT_PUBLIC_ environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ICS_FILENAME
ARG NEXT_PUBLIC_DEFAULT_START_TIME
ARG NEXT_PUBLIC_DEFAULT_END_TIME

# Set as environment variables for build time
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ICS_FILENAME=$NEXT_PUBLIC_ICS_FILENAME
ENV NEXT_PUBLIC_DEFAULT_START_TIME=$NEXT_PUBLIC_DEFAULT_START_TIME
ENV NEXT_PUBLIC_DEFAULT_END_TIME=$NEXT_PUBLIC_DEFAULT_END_TIME

COPY package*.json ./
# npm install ではなく npm ci。install は package-lock.json を無視して ^ の
# 範囲内で勝手に新しい版を解決するため、監査した lockfile と実際に出荷される
# イメージの中身が一致する保証がなくなる (2026-10-21 の依存監査で検出)。
# ci は lockfile どおりに入れ、lockfile と package.json がずれていれば失敗する。
RUN npm ci
COPY . .
RUN npm run build

FROM node:25-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT 3000
ENV TZ=Asia/Tokyo
CMD ["node", "server.js"]
