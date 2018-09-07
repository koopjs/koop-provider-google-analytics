#!/bin/bash
export DEPLOY="dev"
export NODE_ENV="test"
export KOOP_LOG_LEVEL="debug"
export NODE_CONFIG_DIR="./config"
export NODE_CONFIG_ENV="index"
export GOOGLE_CLIENT_EMAIL=`echo test | base64`
export GOOGLE_PRIVATE_KEY=`echo test | base64`
export GOOGLE_VIEW_ID="test"
export GOOGLE_ANALYTICS_TIMEZONE="America/New_York"