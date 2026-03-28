FROM node:20-alpine AS builder
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
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT 3000
ENV TZ=Asia/Tokyo
CMD ["node", "server.js"]
