FROM node:20-alpine

# bucharest timezone for campaign launch date
RUN apk add --no-cache tzdata
ENV TZ=Europe/Bucharest

# create nonroot user and group
RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm ci

# copy source code
COPY --chown=app:app . .

ENV NODE_ENV=production TZ=UTC
EXPOSE 3000 4000
CMD ["node", "server/index.js"]