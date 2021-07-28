FROM node:13.2.0 AS build-env
WORKDIR /app
COPY . /app
RUN npm ci --only=production
CMD ["index.js"]