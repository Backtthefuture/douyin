// Vercel API路由处理Coze API请求
const https = require('https');

// 获取API密钥，优先使用环境变量
const API_KEY = process.env.COZE_API_KEY || 'pat_vnJOJjNCzgkFCfuBxTiqeA69DWJSxNgnOrPZWKca6IfRca5LuJDYihHtfV359lqV';

// 解析请求体
const parseBody = (req) => {
  return new Promise((resolve) => {
    // 如果请求体已经被解析（Vercel环境中可能会自动解析）
    if (req.body) {
      console.log('请求体已被自动解析');
      resolve(req.body);
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        console.error('解析请求体失败:', e);
        resolve({});
      }
    });
  });
};

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只处理POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    // 解析请求体
    const body = await parseBody(req);
    console.log('收到API请求:', JSON.stringify({
      botId: body.bot_id,
      userId: body.user_id,
      stream: body.stream,
      messages: body.messages ? body.messages.length : 0
    }));
    
    if (!body.bot_id) {
      console.error('请求缺少bot_id参数');
      return res.status(400).json({ error: '缺少必要参数bot_id' });
    }
    
    // 准备请求选项
    const options = {
      hostname: 'api.coze.cn',
      path: '/v3/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    console.log('发送请求到Coze API');
    
    // 创建代理请求
    const proxyReq = https.request(options, (proxyRes) => {
      // 设置响应头
      res.statusCode = proxyRes.statusCode;
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });

      console.log(`收到来自Coze API的响应: ${proxyRes.statusCode}`);
      
      // 收集响应数据
      let responseData = '';
      
      // 处理响应数据
      proxyRes.on('data', (chunk) => {
        responseData += chunk.toString();
        res.write(chunk);
      });
      
      proxyRes.on('end', () => {
        console.log(`完整响应长度: ${responseData.length}`);
        // 记录响应的前200个字符用于调试
        if (responseData.length > 0) {
          console.log(`响应前200个字符: ${responseData.substring(0, 200)}`);
          
          // 尝试解析响应，检查是否有错误信息
          try {
            const jsonResponse = JSON.parse(responseData);
            if (jsonResponse.error) {
              console.error('API返回错误:', jsonResponse.error);
            }
          } catch (e) {
            // 如果不是JSON格式，可能是流式响应
            console.log('响应不是JSON格式，可能是流式响应');
          }
        }
        res.end();
      });
    });

    // 错误处理
    proxyReq.on('error', (error) => {
      console.error('代理请求错误:', error);
      res.status(500).json({ 
        error: '代理请求失败', 
        message: error.message,
        stack: error.stack
      });
    });

    // 发送请求体
    const requestBody = JSON.stringify(body);
    console.log('请求体长度:', requestBody.length);
    proxyReq.write(requestBody);
    proxyReq.end();
    
    console.log('请求已发送到Coze API');
    
    // 记录环境变量信息（不包含敏感信息）
    console.log('Node环境:', process.env.NODE_ENV);
    console.log('Vercel环境:', process.env.VERCEL ? '是' : '否');
  } catch (error) {
    console.error('服务器错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: error.message,
      stack: error.stack
    });
  }
};
