FROM node:8-alpine
RUN mkdir -p /srv/www/koop
ADD package.json /srv/www/koop
WORKDIR /srv/www/koop
RUN npm install
ADD . /srv/www/koop
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/node", "/srv/www/koop/server.js"]
