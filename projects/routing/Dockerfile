FROM mhart/alpine-node:10.15.1
USER root

WORKDIR /opt/ml-routing-serivce
COPY src /opt/ml-routing-serivce/src
COPY package.json /opt/ml-routing-serivce/
COPY tsconfig.json /opt/ml-routing-serivce/

RUN npm install typescript -g
RUN npm install

RUN npm run build

EXPOSE 3000
CMD node lib/index.js