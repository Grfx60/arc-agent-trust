FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .
ENV NODE_ENV=production
ENV DASHBOARD_PORT=3000
ENV LIVE_API_PORT=3100
EXPOSE 3000

CMD ["npm", "start"]
