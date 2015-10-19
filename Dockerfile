FROM ubuntu:trusty
MAINTAINER EverythingMe Geeks <opensource@everything.me>
LABEL description="Development image for the redshift-console project"

RUN apt-get update && apt-get install -y --force-yes --no-install-recommends\
      apt-transport-https \
      build-essential \
      curl \
      ca-certificates \
      git \
      lsb-release \
      python-all \
      python-dev \
      python-pip \
      libpq-dev \
      rlwrap \
    && rm -rf /var/lib/apt/lists/*;

RUN curl https://deb.nodesource.com/node_0.12/pool/main/n/nodejs/nodejs_0.12.7-1nodesource1~trusty1_amd64.deb > node.deb \
 && dpkg -i node.deb \
 && rm node.deb

RUN npm install -g pangyp\
 && ln -s $(which pangyp) $(dirname $(which pangyp))/node-gyp\
 && npm cache clear\
 && node-gyp configure || echo ""

# Allow running bower as root user
RUN echo '{ "allow_root": true }' > /root/.bowerrc

COPY requirements.txt /app/requirements.txt
COPY package.json /app/package.json
COPY .bowerrc /app/.bowerrc
COPY redshift_console/static/bower.json /app/redshift_console/static/bower.json

WORKDIR /app
RUN npm install -g gulp bower
RUN npm install
RUN bower install
RUN pip install -r requirements.txt

RUN echo 'api: python -m redshift_console runserver --debug\nfe: gulp watch' > /app/Procfile
RUN pip install honcho

VOLUME /app

# API server
EXPOSE 5000
# Frontend server
EXPOSE 3000

ENTRYPOINT ["honcho"]
CMD ["start"]
