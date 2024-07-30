# Pull node image
FROM node:alpine3.19

# create directory structure
RUN mkdir -p /hardhat
WORKDIR /hardhat
RUN mkdir -p contracts ignition/modules test

# install hardhat
RUN npm init -y
RUN npm install --save-dev hardhat@2.22.6 \
							@nomicfoundation/hardhat-toolbox

# copy hardhat config file
COPY ./hardhat/hardhat.config.js .

CMD ["npx", "hardhat", "node"]