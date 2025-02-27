// 安全地获取DOM元素
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`元素 "${id}" 不存在`);
    }
    return element;
}

// 安全地设置元素内容
function safeSetContent(id, content) {
    const element = safeGetElement(id);
    if (element) {
        if (content.startsWith('<') && content.endsWith('>')) {
            // 如果内容包含HTML
            element.innerHTML = content;
        } else {
            element.textContent = content;
        }
        return true;
    }
    return false;
}

// 安全地显示/隐藏元素
function safeSetDisplay(id, display) {
    const element = safeGetElement(id);
    if (element) {
        element.style.display = display;
        return true;
    }
    return false;
}

// DOM元素
const videoUrlInput = safeGetElement('videoUrl');
const analyzeBtn = safeGetElement('analyzeBtn');
const loadingSection = safeGetElement('loadingSection');
const resultSection = safeGetElement('resultSection');
const originalContentBox = safeGetElement('originalContentBox');
const rewrittenContentBox = safeGetElement('rewrittenContentBox');
const modelThinkingBox = safeGetElement('modelThinkingBox');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const copyBtns = document.querySelectorAll('.copy-btn');

// API配置
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '/api/coze' // 本地开发环境
    : '/api/coze'; // Vercel或其他生产环境
const BOT_ID = "7475718510476509221";
const DEBUG_MODE = true; // 调试模式开关

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 隐藏结果区域
    safeSetDisplay('loadingSection', 'none');
    safeSetDisplay('resultSection', 'none');
    
    // 添加分析按钮点击事件
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', handleAnalyzeClick);
    }
    
    // 添加标签切换事件
    tabBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchTab(tabId);
            });
        }
    });
    
    // 添加复制按钮事件
    copyBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                copyContent(targetId);
            });
        }
    });
    
    // 在页面加载时记录环境信息
    console.log('页面加载完成');
    console.log('当前环境:', {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        pathname: window.location.pathname,
        apiUrl: API_URL,
        botId: BOT_ID,
        debugMode: DEBUG_MODE
    });
    
    // 如果是调试模式，显示环境信息
    if (DEBUG_MODE) {
        const debugSection = safeGetElement('debugSection');
        if (debugSection) {
            debugSection.style.display = 'block';
            const envInfo = document.createElement('div');
            envInfo.className = 'debug-info';
            envInfo.innerHTML = `
                <h4>环境信息</h4>
                <p>主机名: ${window.location.hostname}</p>
                <p>协议: ${window.location.protocol}</p>
                <p>API地址: ${API_URL}</p>
                <p>Bot ID: ${BOT_ID}</p>
            `;
            debugSection.prepend(envInfo);
        }
    }
});

// 处理分析按钮点击
async function handleAnalyzeClick() {
    const videoUrl = videoUrlInput.value.trim();
    
    if (!videoUrl) {
        alert('请输入抖音视频链接');
        return;
    }
    
    // 显示加载状态
    safeSetDisplay('loadingSection', 'block');
    safeSetDisplay('resultSection', 'none');
    
    try {
        const result = await analyzeVideo(videoUrl);
        displayResults(result);
    } catch (error) {
        console.error('分析失败:', error);
        alert('分析失败，请稍后重试');
    } finally {
        safeSetDisplay('loadingSection', 'none');
    }
}

// 调用API分析视频
async function analyzeVideo(videoUrl) {
    if (!videoUrl) {
        throw new Error('请输入有效的抖音视频链接');
    }

    // 准备请求数据
    const requestData = {
        bot_id: BOT_ID,
        user_id: generateUserId(),
        messages: [
            {
                role: 'user',
                content: `请分析这个抖音视频链接，提取原始文案并给出爆款改写建议：${videoUrl}`
            }
        ]
    };

    try {
        // 显示加载动画
        safeSetDisplay('loadingSection', 'block');
        safeSetDisplay('resultSection', 'none');
        
        console.log("发送API请求:", {
            url: API_URL,
            botId: BOT_ID,
            videoUrl: videoUrl
        });

        // 发送API请求
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // 检查响应状态
        if (!response.ok) {
            console.error('API请求失败:', response.status, response.statusText);
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        // 获取响应文本
        const responseText = await response.text();
        console.log('API响应长度:', responseText.length);
        
        // 调试模式下记录原始响应
        if (DEBUG_MODE) {
            console.log('API原始响应:', responseText.substring(0, 500) + '...');
            
            // 显示在调试区域
            const apiResponseDebug = document.getElementById('apiResponseDebug');
            if (apiResponseDebug) {
                // 限制显示长度，避免浏览器卡顿
                const maxLength = 5000;
                apiResponseDebug.textContent = responseText.length > maxLength 
                    ? responseText.substring(0, maxLength) + '... (响应过长，已截断)'
                    : responseText;
            }
            
            const debugSection = document.getElementById('debugSection');
            if (debugSection) {
                debugSection.style.display = 'block';
            }
        }

        // 检查响应是否为空
        if (!responseText || responseText.trim() === '') {
            throw new Error('API返回了空响应');
        }

        try {
            // 尝试解析API响应
            const result = parseApiResponse(responseText);
            
            // 检查是否成功提取到内容
            if (!result.original || result.original === '未找到原始文案') {
                console.warn('未能从API响应中提取到原始文案');
                
                // 在调试模式下提供更多信息
                if (DEBUG_MODE) {
                    console.log('API响应解析结果:', result);
                }
            }
            
            return result;
        } catch (parseError) {
            console.error('解析API响应时出错:', parseError);
            throw new Error(`解析API响应失败: ${parseError.message}`);
        }
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    } finally {
        // 确保无论如何都隐藏加载动画
        safeSetDisplay('loadingSection', 'none');
    }
}

// 解析API响应
function parseApiResponse(responseText) {
    console.log('开始解析API响应');
    
    // 默认结果
    const defaultResult = {
        original: '未找到原始文案',
        rewritten: '未找到改写建议',
        thinking: responseText
    };
    
    try {
        // 尝试多种方式解析响应
        let parsedData = null;
        
        // 方法1: 尝试解析为JSON
        try {
            parsedData = JSON.parse(responseText);
            console.log('成功解析为JSON');
        } catch (e) {
            console.log('非JSON格式，尝试其他解析方法');
        }
        
        // 方法2: 尝试提取JSON部分
        if (!parsedData) {
            try {
                // 查找JSON对象的开始和结束位置
                const jsonStart = responseText.indexOf('{');
                const jsonEnd = responseText.lastIndexOf('}') + 1;
                
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                    const jsonPart = responseText.substring(jsonStart, jsonEnd);
                    parsedData = JSON.parse(jsonPart);
                    console.log('成功从文本中提取JSON部分');
                }
            } catch (e) {
                console.log('无法从文本中提取JSON部分:', e.message);
            }
        }
        
        // 方法3: 尝试解析为行分隔的JSON对象
        if (!parsedData) {
            try {
                // 分割为行并尝试解析每一行
                const lines = responseText.split('\n');
                for (const line of lines) {
                    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
                        parsedData = JSON.parse(line);
                        console.log('成功从行中解析JSON');
                        break;
                    }
                }
            } catch (e) {
                console.log('无法从行中解析JSON:', e.message);
            }
        }
        
        // 方法4: 尝试查找JSON数组
        if (!parsedData) {
            try {
                const arrayStart = responseText.indexOf('[');
                const arrayEnd = responseText.lastIndexOf(']') + 1;
                
                if (arrayStart >= 0 && arrayEnd > arrayStart) {
                    const arrayPart = responseText.substring(arrayStart, arrayEnd);
                    const array = JSON.parse(arrayPart);
                    if (array.length > 0) {
                        parsedData = array[0];
                        console.log('成功从JSON数组中提取第一个对象');
                    }
                }
            } catch (e) {
                console.log('无法从文本中提取JSON数组:', e.message);
            }
        }
        
        // 方法5: 尝试查找并解析多个JSON对象
        if (!parsedData) {
            try {
                const regex = /{[^{}]*({[^{}]*})*[^{}]*}/g;
                const matches = responseText.match(regex);
                if (matches && matches.length > 0) {
                    for (const match of matches) {
                        try {
                            parsedData = JSON.parse(match);
                            console.log('成功从文本中提取JSON对象');
                            break;
                        } catch (e) {
                            // 继续尝试下一个匹配
                        }
                    }
                }
            } catch (e) {
                console.log('无法使用正则表达式提取JSON:', e.message);
            }
        }
        
        // 如果成功解析为JSON，提取内容
        if (parsedData) {
            console.log('解析到的数据结构:', Object.keys(parsedData));
            
            // 从JSON中提取内容
            if (parsedData.message) {
                return extractContentParts(parsedData.message.content, responseText);
            } else if (parsedData.content) {
                return extractContentParts(parsedData.content, responseText);
            } else if (parsedData.choices && parsedData.choices.length > 0) {
                const choice = parsedData.choices[0];
                if (choice.message && choice.message.content) {
                    return extractContentParts(choice.message.content, responseText);
                }
            } else if (parsedData.data) {
                // 尝试从data字段提取
                if (typeof parsedData.data === 'string') {
                    return extractContentParts(parsedData.data, responseText);
                } else if (parsedData.data.content) {
                    return extractContentParts(parsedData.data.content, responseText);
                } else if (parsedData.data.message) {
                    return extractContentParts(parsedData.data.message.content || parsedData.data.message, responseText);
                } else if (Array.isArray(parsedData.data) && parsedData.data.length > 0) {
                    // 如果data是数组，尝试提取第一个元素
                    const firstItem = parsedData.data[0];
                    if (firstItem.content) {
                        return extractContentParts(firstItem.content, responseText);
                    } else if (firstItem.message) {
                        return extractContentParts(firstItem.message.content || firstItem.message, responseText);
                    }
                }
            } else if (parsedData.result) {
                // 尝试从result字段提取
                if (typeof parsedData.result === 'string') {
                    return extractContentParts(parsedData.result, responseText);
                } else if (parsedData.result.content) {
                    return extractContentParts(parsedData.result.content, responseText);
                } else if (parsedData.result.message) {
                    return extractContentParts(parsedData.result.message.content || parsedData.result.message, responseText);
                }
            } else if (parsedData.response) {
                // 尝试从response字段提取
                if (typeof parsedData.response === 'string') {
                    return extractContentParts(parsedData.response, responseText);
                } else if (parsedData.response.content) {
                    return extractContentParts(parsedData.response.content, responseText);
                } else if (parsedData.response.message) {
                    return extractContentParts(parsedData.response.message.content || parsedData.response.message, responseText);
                }
            } else {
                // 尝试遍历所有字段，查找可能的内容
                for (const key in parsedData) {
                    if (typeof parsedData[key] === 'string' && parsedData[key].length > 50) {
                        // 如果找到长字符串，可能是内容
                        return extractContentParts(parsedData[key], responseText);
                    }
                }
            }
        }
        
        // 方法6: 直接从文本中提取内容
        console.log('尝试直接从文本中提取内容');
        return extractContentParts(responseText, responseText);
        
    } catch (error) {
        console.error('解析API响应时出错:', error);
        return defaultResult;
    }
}

// 从API响应中提取原始文案和改写建议
function extractContentParts(content, thinking) {
    console.log("提取内容部分...");
    
    // 记录原始内容的前200个字符，用于调试
    if (content && content.length > 0) {
        const previewContent = content.substring(0, 200);
        console.log(`原始内容前200字符: ${previewContent}`);
    } else {
        console.warn("内容为空，无法提取");
        return {
            thinking: thinking || '未找到思考过程',
            original: '未找到原始文案',
            rewritten: '未找到改写建议'
        };
    }
    
    // 定义可能的分隔标记
    const originalMarkers = [
        '原视频文案如下：', '原视频文案:', '原视频文案如下：', 
        '原始文案：', '原始文案：', 
        '原文：', '原文：', 
        '原始视频文案：', '原始视频文案：',
        '以下是原始文案：', '以下是原始文案：',
        '抖音视频原始文案：', '抖音视频原始文案：',
        '原始内容：', '原始内容：',
        '原抖音文案：', '原抖音文案：',
        '抖音原文：', '抖音原文：'
    ];
    
    const rewrittenMarkers = [
        '爆款视频文案：', '爆款视频文案：', 
        '改写建议：', '改写建议：', 
        '改写文案：', '改写文案：', 
        '改写后的文案：', '改写后的文案：',
        '以下是改写建议：', '以下是改写建议：',
        '爆款化建议：', '爆款化建议：',
        '爆款改写：', '爆款改写：',
        '爆款文案：', '爆款文案：',
        '爆款建议：', '爆款建议：',
        '改写后：', '改写后：'
    ];
    
    let original = '';
    let rewritten = '';
    
    // 尝试不同的提取方法
    
    // 方法1：使用分隔标记查找
    for (const startMarker of originalMarkers) {
        if (content.includes(startMarker)) {
            console.log(`找到原始文案标记: "${startMarker}"`);
            let startIndex = content.indexOf(startMarker) + startMarker.length;
            let endIndex = content.length;
            
            // 查找下一个可能的结束标记
            for (const endMarker of rewrittenMarkers) {
                const markerIndex = content.indexOf(endMarker, startIndex);
                if (markerIndex !== -1 && markerIndex < endIndex) {
                    endIndex = markerIndex;
                }
            }
            
            original = content.substring(startIndex, endIndex).trim();
            console.log(`提取的原始文案长度: ${original.length}`);
            break;
        }
    }
    
    // 方法2：如果方法1未找到原始文案，尝试查找可能的段落分隔
    if (!original) {
        console.log("使用段落分隔方法查找原始文案");
        const paragraphs = content.split(/\n\s*\n|\r\n\s*\r\n/);
        
        // 查找可能包含原始文案的段落
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].trim();
            if (paragraph.length > 10) { // 忽略太短的段落
                for (const marker of originalMarkers) {
                    if (paragraph.includes(marker)) {
                        original = paragraph.substring(paragraph.indexOf(marker) + marker.length).trim();
                        console.log(`从段落中提取原始文案，长度: ${original.length}`);
                        break;
                    }
                }
                if (original) break;
            }
        }
    }
    
    // 方法3：如果仍未找到，尝试使用正则表达式
    if (!original) {
        console.log("使用正则表达式查找原始文案");
        try {
            const regex = new RegExp(`(${originalMarkers.join('|')})[\\s\\n]*(.*?)(?=(${rewrittenMarkers.join('|')})|$)`, 's');
            const match = content.match(regex);
            if (match && match[2]) {
                original = match[2].trim();
                console.log(`使用正则表达式提取原始文案，长度: ${original.length}`);
            }
        } catch (e) {
            console.warn("正则表达式匹配失败:", e);
        }
    }
    
    // 方法4：尝试查找关键词
    if (!original) {
        console.log("尝试通过关键词查找原始文案");
        const keywords = ["抖音", "视频", "原文", "文案"];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.length > 10) {
                let hasKeyword = false;
                for (const keyword of keywords) {
                    if (line.includes(keyword)) {
                        hasKeyword = true;
                        break;
                    }
                }
                
                if (hasKeyword && !line.includes("改写") && !line.includes("爆款")) {
                    original = line.trim();
                    console.log(`通过关键词找到可能的原始文案: ${original}`);
                    break;
                }
            }
        }
    }
    
    // 提取改写建议
    for (const startMarker of rewrittenMarkers) {
        if (content.includes(startMarker)) {
            console.log(`找到改写建议标记: "${startMarker}"`);
            const startIndex = content.indexOf(startMarker) + startMarker.length;
            rewritten = content.substring(startIndex).trim();
            console.log(`提取的改写建议长度: ${rewritten.length}`);
            break;
        }
    }
    
    // 方法2：如果方法1未找到改写建议，尝试查找可能的段落分隔
    if (!rewritten) {
        console.log("使用段落分隔方法查找改写建议");
        const paragraphs = content.split(/\n\s*\n|\r\n\s*\r\n/);
        
        // 查找可能包含改写建议的段落
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].trim();
            if (paragraph.length > 10) { // 忽略太短的段落
                for (const marker of rewrittenMarkers) {
                    if (paragraph.includes(marker)) {
                        rewritten = paragraph.substring(paragraph.indexOf(marker) + marker.length).trim();
                        console.log(`从段落中提取改写建议，长度: ${rewritten.length}`);
                        break;
                    }
                }
                if (rewritten) break;
            }
        }
    }
    
    // 方法3：如果仍未找到，尝试使用正则表达式
    if (!rewritten) {
        console.log("使用正则表达式查找改写建议");
        try {
            const regex = new RegExp(`(${rewrittenMarkers.join('|')})[\\s\\n]*(.*)`, 's');
            const match = content.match(regex);
            if (match && match[2]) {
                rewritten = match[2].trim();
                console.log(`使用正则表达式提取改写建议，长度: ${rewritten.length}`);
            }
        } catch (e) {
            console.warn("正则表达式匹配失败:", e);
        }
    }
    
    // 方法4：尝试查找关键词
    if (!rewritten) {
        console.log("尝试通过关键词查找改写建议");
        const keywords = ["爆款", "改写", "建议"];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.length > 10) {
                let hasKeyword = false;
                for (const keyword of keywords) {
                    if (line.includes(keyword)) {
                        hasKeyword = true;
                        break;
                    }
                }
                
                if (hasKeyword) {
                    rewritten = line.trim();
                    console.log(`通过关键词找到可能的改写建议: ${rewritten}`);
                    break;
                }
            }
        }
    }
    
    // 方法5：如果仍然没有找到任何内容，尝试将内容分为两部分
    if (!original && !rewritten && content.length > 20) {
        console.log("尝试将内容分为两部分");
        const midpoint = Math.floor(content.length / 2);
        original = content.substring(0, midpoint).trim();
        rewritten = content.substring(midpoint).trim();
        console.log("通过内容分割找到可能的原始文案和改写建议");
    }
    
    // 最后检查是否成功提取
    if (!original) {
        console.warn("未能提取到原始文案");
        original = '未能提取到原始文案，请确认链接是否有效，或者尝试其他抖音视频链接。';
    }
    
    if (!rewritten) {
        console.warn("未能提取到改写建议");
        rewritten = '未能提取到改写建议，请确认链接是否有效，或者尝试其他抖音视频链接。';
    }
    
    // 如果内容太长，可能是提取错误，记录警告
    if (original && original.length > 2000) {
        console.warn("原始文案可能提取错误，内容过长");
        // 尝试截取更合理的长度
        original = original.substring(0, 1000) + '...';
    }
    
    if (rewritten && rewritten.length > 2000) {
        console.warn("改写建议可能提取错误，内容过长");
        // 尝试截取更合理的长度
        rewritten = rewritten.substring(0, 1000) + '...';
    }
    
    return {
        thinking: thinking || '',
        original: original,
        rewritten: rewritten
    };
}

// 显示分析结果
function displayResults(result) {
    // 填充内容
    if (result.original && result.original !== '未找到原始文案') {
        const originalContent = document.getElementById('originalContentBox');
        if (originalContent) {
            originalContent.innerHTML = `<p>${result.original}</p>`;
        }
    } else {
        const originalContent = document.getElementById('originalContentBox');
        if (originalContent) {
            originalContent.innerHTML = `<p class="error-message">未能提取到原始文案，请确认链接是否有效，或者尝试其他抖音视频链接。</p>`;
        }
    }
    
    if (result.rewritten && result.rewritten !== '未找到改写建议') {
        const rewrittenContent = document.getElementById('rewrittenContentBox');
        if (rewrittenContent) {
            rewrittenContent.innerHTML = `<p>${result.rewritten}</p>`;
        }
    } else {
        const rewrittenContent = document.getElementById('rewrittenContentBox');
        if (rewrittenContent) {
            rewrittenContent.innerHTML = `<p class="error-message">未能生成改写建议，请确认链接是否有效，或者尝试其他抖音视频链接。</p>`;
        }
    }
    
    // 处理思考过程，添加换行以提高可读性
    const formattedThinking = result.thinking ? result.thinking.replace(/\n/g, '<br>') : '未找到思考过程';
    const thinkingContent = document.getElementById('modelThinkingBox');
    if (thinkingContent) {
        thinkingContent.innerHTML = `<p>${formattedThinking}</p>`;
    }
    
    // 显示结果区域
    safeSetDisplay('resultSection', 'block');
    
    // 默认显示原始文案标签
    switchTab('originalContent');
    
    // 调试模式下显示API响应
    if (DEBUG_MODE) {
        const apiResponseDebug = document.getElementById('apiResponseDebug');
        if (apiResponseDebug) {
            apiResponseDebug.textContent = JSON.stringify(result, null, 2);
        }
        
        const debugSection = document.getElementById('debugSection');
        if (debugSection) {
            debugSection.style.display = 'block';
        }
    }
}

// 切换标签
function switchTab(tabId) {
    // 更新标签按钮状态
    tabBtns.forEach(btn => {
        if (btn && btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 更新标签内容显示
    tabPanes.forEach(pane => {
        if (pane && pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
}

// 复制内容
function copyContent(targetId) {
    const contentElement = safeGetElement(targetId);
    if (!contentElement) {
        alert('无法找到内容元素');
        return;
    }
    
    const textToCopy = contentElement.innerText;
    
    if (!textToCopy || textToCopy.includes('分析后将显示')) {
        alert('没有可复制的内容');
        return;
    }
    
    // 创建临时文本区域
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    document.body.appendChild(textarea);
    
    // 选择并复制文本
    textarea.select();
    document.execCommand('copy');
    
    // 移除临时元素
    document.body.removeChild(textarea);
    
    // 显示复制成功提示
    alert('内容已复制到剪贴板');
}

// 生成随机用户ID
function generateUserId() {
    return 'user_' + Math.random().toString(36).substring(2, 15);
}
