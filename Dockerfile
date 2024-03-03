FROM node:hydrogen-buster
WORKDIR /usr/app
COPY package.json .
RUN npm install --quiet
COPY src/. .