#!/bin/bash
CURRENT_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )
PARENT_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && cd .. && pwd )
PACKAGE_VERSION=$(node -pe "require('$PARENT_DIR/package.json').version")
CONFIG_FILE=$(envsubst < $PARENT_DIR/../api-config.yaml | base64)
IMAGE_TAG=${2:-v$PACKAGE_VERSION}
NAMESPACE=${1:-staging}

if [[ ! -f $PARENT_DIR/../api-config.yaml ]]; then
  read -p "api-config.yaml was not found. press any key to use an empty config, or ctrl + c to exit"
fi;

read -p "Deploying $IMAGE_TAG to $NAMESPACE. Press [enter] to continue..."

set -x

helm upgrade --install --atomic api-gateway-${NAMESPACE} \
  --set "env=$NAMESPACE" \
  --set "image.tag=$IMAGE_TAG" \
  --set "ingress.hostname=api.chega.ai" \
  --set "environment.MAPS_FILE_URL=\"$CONFIG_FILE\"" \
  --set "environment.AUTH_JWT_SECRET=$AUTH_JWT_SECRET" \
  --set "environment.AUTH_JWT_ISSUER=$AUTH_JWT_ISSUER" \
  --namespace $NAMESPACE \
  $CURRENT_DIR/api-gateway
