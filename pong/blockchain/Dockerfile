# Pull node image
FROM node:alpine3.19

# create directory structure
RUN mkdir -p /hardhat
WORKDIR /hardhat
RUN mkdir -p contracts ignition/modules test

# install hardhat
COPY ./hardhat/package.json .
COPY ./hardhat/package-lock.json .
RUN npm install

# copy hardhat config file
COPY ./hardhat/hardhat.config.js .
COPY ./hardhat/contracts/* ./contracts/
COPY ./hardhat/test/* ./test/

CMD ["npx", "hardhat", "node"]