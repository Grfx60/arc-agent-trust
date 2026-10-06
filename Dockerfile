FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
ENV LIVE_API_PORT=3100
ENV DASHBOARD_HOST=0.0.0.0
ENV LIVE_API_HOST=127.0.0.1
EXPOSE 10000
CMD ["npm", "start"]
