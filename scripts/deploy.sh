#!/bin/bash

SECONDS=0
cd /home/mad/git/distrochess/.deploy

git pull

# must run as root!
# sudo -i
export METEOR_ALLOW_SUPERUSER=true
mup setup
mup deploy

echo 
echo "************************************************"
echo "*** DEPLOYMENT FINISHED IN $SECONDS SECONDS! ***"
echo "************************************************"
echo 

