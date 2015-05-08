#! /bin/bash
apt-get update
curl -sL https://deb.nodesource.com/setup | sudo bash -
apt-get install -y git nodejs libwww-perl build-essential
git clone https://github.com/zzo/sivart
cd sivart
HOME=/root npm install
if [[ $? -gt 0 ]] 
  then
    echo __ERROR__
  else 
    echo __DONE__
fi
