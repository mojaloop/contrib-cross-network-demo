FROM mhart/alpine-node:10.15.1
USER root

WORKDIR /opt/ml-routing
COPY src /opt/ml-routing/src
COPY package.json /opt/ml-routing/
COPY tsconfig.json /opt/ml-routing/

# RUN apk --no-cache add git
# RUN apk add --no-cache -t build-dependencies make gcc g++ python libtool autoconf automake \
#     && cd $(npm root -g)/npm \
#     && npm config set unsafe-perm true \
#     && npm install -g node-gyp

RUN npm install typescript -g
RUN npm install

# RUN apk del build-dependencies
RUN npm run build

EXPOSE 3000
CMD node lib/index.js