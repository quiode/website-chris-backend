FROM node:16-alpine

WORKDIR /app

# Dependencies
RUN apk add --no-cache ffmpeg

# npm
COPY package.json package-lock.json ./
RUN npm ci

# copy all
COPY . .

# build
RUN npm run build

# run
EXPOSE 3000
CMD npm run start:prod
