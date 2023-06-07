FROM node:16-alpine

WORKDIR /app

# npm
COPY package.json package-lock.json ./
RUN npm ci

# copy all
COPY . .

# build
RUN npm run build

# run
EXPOSE 80
CMD node dist/main.js
