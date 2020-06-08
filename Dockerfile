FROM node:12-buster

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN npm install .
