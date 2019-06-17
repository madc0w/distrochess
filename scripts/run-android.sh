#!/bin/bash

git pull
export NODE_OPTIONS='--max_old_space_size=2048'

cd ~/git/distrochess

echo ///////////////////////////////////
adb devices
# if no devices, then do:
#	adb  kill-server
#	adb start-server
echo ///////////////////////////////////

meteor npm install --save

settingsFile=~/distrochess/settings-prod.json

meteor run android-device -s $settingsFile
