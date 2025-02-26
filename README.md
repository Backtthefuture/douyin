# 抖音文案提取与改写工具

## 项目介绍
这是一个网页应用，可以帮助用户从抖音视频中提取文案并进行智能改写。用户只需输入抖音视频链接，系统会通过Coze API分析视频内容，提取文案并提供改写建议。

## 功能特点
- 简洁美观的用户界面
- 支持抖音视频链接输入
- 通过Coze API进行内容分析
- 清晰展示原始文案和改写内容
- 区分模型思考过程和最终输出
- 支持API流式输出处理

## 使用方法
1. 打开网站首页
2. 在输入框中粘贴抖音视频链接
3. 点击"分析"按钮
4. 等待系统处理（页面会显示加载状态）
5. 查看分析结果，包括提取的原始文案和改写建议

## 技术实现
- 前端：HTML, CSS, JavaScript
- API集成：与Coze API对接，处理流式响应
- 界面设计：响应式设计，适配不同设备

## 文件结构
- `index.html`：网站主页
- `styles.css`：样式表文件
- `script.js`：JavaScript脚本文件
- `README.md`：项目说明文档

## API说明
本项目使用Coze API进行内容分析，API调用示例：
```
curl --location --request POST 'https://api.coze.cn/v3/chat' \
--header 'Authorization: Bearer pat_vnJOJjNCzgkFCfuBxTiqeA69DWJSxNgnOrPZWKca6IfRca5LuJDYihHtfV359lqV' \
--header 'Content-Type: application/json' \
--data-raw '{
    "bot_id": "7475718510476509221",
    "user_id": "123456789",
    "stream": true,
    "auto_save_history":true,
    "additional_messages":[
        {
            "role":"user",
            "content":"抖音视频链接",
            "content_type":"text"
        }
    ]
}'
```

## 注意事项
- API密钥应妥善保管，避免泄露
- 网站仅用于合法内容的分析和改写
- 使用流式输出模式可能会导致响应时间略长，请耐心等待
