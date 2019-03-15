FROM mhart/alpine-node:10.15.1
USER root

WORKDIR /opt/mojaloop-app
COPY src /opt/mojaloop-app/src
COPY package.json /opt/mojaloop-app/
COPY tsconfig.json /opt/mojaloop-app/

RUN npm install typescript -g
RUN npm install

RUN npm run build

EXPOSE 3000
EXPOSE 2000
CMD node build/src/start.js