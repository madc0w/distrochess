#!/bin/bash

SECONDS=0

git config --global credential.helper 'cache --timeout 86400'
git pull

#meteor npm install --save

#meteor login
DEPLOY_HOSTNAME=us-east-1.galaxy-deploy.meteor.com meteor deploy www.distrochess.com --settings settings.json

echo 
echo "************************************************"
echo "*** DEPLOYMENT FINISHED IN $SECONDS SECONDS! ***"
echo "************************************************"
echo 

