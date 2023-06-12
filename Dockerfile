FROM node:16-alpine

WORKDIR /app

# Dependencies
RUN apk add --no-cache ffmpeg
RUN npm i -g pnpm

# npm
COPY package.json pnpm-lock.yaml  ./
RUN pnpm i

# copy all
COPY . .

# build
RUN pnpm run build

# run
EXPOSE 3000
CMD pnpm run start:prod
