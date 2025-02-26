#!/bin/bash

# 测试Coze API是否正常工作
echo "开始测试Coze API..."

# 设置API密钥和请求URL
API_KEY="pat_vnJOJjNCzgkFCfuBxTiqeA69DWJSxNgnOrPZWKca6IfRca5LuJDYihHtfV359lqV"
API_URL="https://api.coze.cn/v3/chat"
BOT_ID="7475718510476509221"

# 创建请求数据
REQUEST_DATA='{
    "bot_id": "'$BOT_ID'",
    "user_id": "test_user_123",
    "stream": true,
    "auto_save_history": true,
    "additional_messages": [
        {
            "role": "user",
            "content": "你好，请分析一下这个抖音链接: https://v.douyin.com/example",
            "content_type": "text"
        }
    ]
}'

# 执行请求并保存响应
echo "发送请求到: $API_URL"
echo "请求数据: $REQUEST_DATA"

curl --location --request POST "$API_URL" \
  --header "Authorization: Bearer $API_KEY" \
  --header "Content-Type: application/json" \
  --data "$REQUEST_DATA" \
  --output response.txt

echo "响应已保存到 response.txt"
echo "测试完成"
