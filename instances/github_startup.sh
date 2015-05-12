cd /sivart
git pull
export HOME=/root
/bin/rm -rf node_modules/sivart-*
npm install
export NODE_ENV=production
nodejs server.js 80
echo __ALIVE__
