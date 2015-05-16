apt-get update
curl -sL https://deb.nodesource.com/setup | sudo bash -
apt-get install -y git nodejs libwww-perl build-essential
git clone https://github.com/zzo/sivart-ui
cd sivart-ui
HOME=/root npm install
export NODE_ENV=production
nodejs server.js 80
