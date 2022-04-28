FROM node

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y toot cron

ADD / /app
WORKDIR /app

RUN yarn install && cp /app/tools/crontab /etc/cron.d/mastobot

CMD /usr/sbin/cron -f