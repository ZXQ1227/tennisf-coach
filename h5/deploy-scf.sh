#!/bin/bash
# 腾讯云 SCF 部署脚本 — tennisf-coach
# 用法: bash h5/deploy-scf.sh
set -e

REGION="ap-shanghai"
NAMESPACE="default"
FUNC_NAME="tennisf-coach"
RUNTIME="Nodejs16.13"
HANDLER="index.main_handler"
TIMEOUT=30
ZIP_PATH="h5/scf-coach.zip"

echo ">>> 1. 创建/更新云函数..."
tccli scf CreateFunction \
  --region $REGION \
  --FunctionName $FUNC_NAME \
  --Runtime $RUNTIME \
  --Handler $HANDLER \
  --Timeout $TIMEOUT \
  --Namespace $NAMESPACE \
  --Code "{\"ZipFile\":\"$(base64 < $ZIP_PATH)\"}" 2>/dev/null \
|| tccli scf UpdateFunctionCode \
  --region $REGION \
  --FunctionName $FUNC_NAME \
  --Namespace $NAMESPACE \
  --Handler $HANDLER \
  --Code "{\"ZipFile\":\"$(base64 < $ZIP_PATH)\"}"

echo ">>> 2. 创建 API 网关触发器..."
tccli scf CreateTrigger \
  --region $REGION \
  --FunctionName $FUNC_NAME \
  --Namespace $NAMESPACE \
  --TriggerName "coach-api" \
  --Type apigw \
  --TriggerDesc '{"api":{"authRequired":"FALSE","requestConfig":{"method":"ANY"},"isIntegratedResponse":true},"service":{"serviceName":"tennisf"},"release":{"environmentName":"release"}}' 2>/dev/null || echo "(触发器已存在，跳过)"

echo ""
echo ">>> 部署完成。请去控制台获取 API 网关 URL："
echo "    https://console.cloud.tencent.com/scf/list?rid=4&ns=default"
