const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const morgan = require('morgan');

const app = express();

// 启用详细日志记录
app.use(morgan('dev'));

// 启用CORS
app.use(cors());

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 代理API请求
app.use('/api/coze', createProxyMiddleware({
    target: 'https://api.coze.cn',
    changeOrigin: true,
    pathRewrite: {
        '^/api/coze': '/v3/chat'
    },
    onProxyReq: (proxyReq, req, res) => {
        // 添加必要的请求头
        const apiKey = process.env.COZE_API_KEY || 'pat_vnJOJjNCzgkFCfuBxTiqeA69DWJSxNgnOrPZWKca6IfRca5LuJDYihHtfV359lqV';
        proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
        console.log(`代理请求到Coze API: ${req.method} ${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`收到来自Coze API的响应: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('代理请求错误:', err);
        res.status(500).send({ 
            error: '代理请求失败', 
            message: err.message 
        });
    }
}));

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).send({
        error: '服务器错误',
        message: err.message
    });
});

// 所有其他请求返回index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`代理服务器运行在 http://localhost:${PORT}`);
    console.log('API密钥:', process.env.COZE_API_KEY ? '已设置环境变量' : '使用默认值');
    console.log('按 Ctrl+C 停止服务器');
});
