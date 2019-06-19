#!/bin/bash

SECONDS=0

git config --global credential.helper 'cache --timeout 86400'
git pull

meteor reset

#export METEOR_ALLOW_SUPERUSER=true
meteor build --verbose ~/distrochess-build --server=https://www.distrochess.com

cd ~/git/distrochess/.meteor/local/cordova-build/platforms/android/app/build/outputs/apk/release
rm signed.apk

# keytool -genkey -alias distrochess -keyalg RSA -keysize 2048 -validity 10000
jarsigner -verbose -sigalg SHA1withRSA -tsa http://timestamp.digicert.com -digestalg SHA1 app-release-unsigned.apk distrochess

$ANDROID_HOME/build-tools/23.0.1/zipalign 4 app-release-unsigned.apk signed.apk

filenameDate=`date +%Y-%m-%d`
mv signed.apk distrochess_${filenameDate}.apk

echo 
echo "***********************************************"
echo "*** APK BUILD FINISHED IN $SECONDS SECONDS! ***"
echo "***********************************************"
echo 

date
