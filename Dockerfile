FROM node:latest

ADD . /golos-baby-bot

ENTRYPOINT node /golos-baby-bot/main.js
