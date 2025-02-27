// DOM元素
const videoUrlInput = document.getElementById('videoUrl');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSection = document.getElementById('loadingSection');
const resultSection = document.getElementById('resultSection');
const originalContentBox = document.getElementById('originalContentBox');
const rewrittenContentBox = document.getElementById('rewrittenContentBox');
const modelThinkingBox = document.getElementById('modelThinkingBox');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const copyBtns = document.querySelectorAll('.copy-btn');

// API配置
const API_URL = "/api/coze"; // 使用相对路径，会自动适应部署环境
const BOT_ID = "7475718510476509221";
const DEBUG_MODE = true; // 调试模式开关

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 隐藏结果区域
    loadingSection.style.display = 'none';
    resultSection.style.display = 'none';
    
    // 添加分析按钮点击事件
    analyzeBtn.addEventListener('click', handleAnalyzeClick);
    
    // 添加标签切换事件
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 添加复制按钮事件
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            copyContent(targetId);
        });
    });
});

// 处理分析按钮点击
async function handleAnalyzeClick() {
    const videoUrl = videoUrlInput.value.trim();
    
    if (!videoUrl) {
        alert('请输入抖音视频链接');
        return;
    }
    
    // 显示加载状态
    loadingSection.style.display = 'block';
    resultSection.style.display = 'none';
    
    try {
        const result = await analyzeVideo(videoUrl);
        displayResults(result);
    } catch (error) {
        console.error('分析失败:', error);
        alert('分析失败，请稍后重试');
    } finally {
        loadingSection.style.display = 'none';
    }
}

// 调用API分析视频
async function analyzeVideo(videoUrl) {
    const requestData = {
        bot_id: BOT_ID,
        user_id: generateUserId(), // 生成随机用户ID
        stream: true,
        auto_save_history: true,
        additional_messages: [
            {
                role: "user",
                content: videoUrl,
                content_type: "text"
            }
        ]
    };

    try {
        // 显示加载动画
        loadingSection.style.display = 'block';
        resultSection.style.display = 'none';
        
        console.log("发送API请求:", {
            url: API_URL,
            botId: BOT_ID,
            videoUrl: videoUrl
        });
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        console.log("API响应状态:", response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API错误响应:", errorText);
            throw new Error(`API请求失败: ${response.status} - ${errorText || response.statusText}`);
        }

        // 处理流式响应
        const reader = response.body.getReader();
        let result = '';
        let decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }
            
            // 将二进制数据转换为文本并累加
            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
        }
        
        // 确保解码器处理完所有数据
        result += decoder.decode();
        
        console.log("API响应长度:", result.length);
        console.log("API响应前100个字符:", result.substring(0, 100));
        
        return parseApiResponse(result);
    } catch (error) {
        console.error('API请求错误:', error);
        // 隐藏加载动画
        loadingSection.style.display = 'none';
        
        // 显示错误信息
        resultSection.style.display = 'block';
        originalContentBox.innerHTML = `<p class="error-message">
            <strong>分析失败:</strong> ${error.message}<br>
            <small>请检查网络连接并重试，或者尝试其他抖音视频链接。</small>
        </p>`;
        rewrittenContentBox.innerHTML = `<p class="error-message">
            <strong>无法生成改写建议</strong><br>
            <small>由于分析失败，无法生成改写建议。</small>
        </p>`;
        modelThinkingBox.innerHTML = `<p class="error-message">
            <strong>错误详情:</strong><br>
            ${error.stack || error}
        </p>`;
        
        // 切换到错误详情标签
        switchTab('modelThinking');
        
        throw error;
    } finally {
        // 确保无论如何都隐藏加载动画
        loadingSection.style.display = 'none';
    }
}

// 解析API响应
function parseApiResponse(responseText) {
    console.log("开始解析API响应...");
    
    // 检查是否为空响应
    if (!responseText || responseText.trim() === '') {
        console.error("收到空响应");
        return {
            thinking: '收到空响应，请检查API连接',
            original: '未找到原始文案',
            rewritten: '未找到改写建议'
        };
    }
    
    // 尝试直接解析整个响应（适用于Vercel环境可能的非流式响应）
    try {
        const directJson = JSON.parse(responseText);
        if (directJson && directJson.content) {
            console.log("直接解析JSON成功，内容长度:", directJson.content.length);
            return extractContentParts(directJson.content, directJson.reasoning_content || '');
        }
    } catch (e) {
        console.log("直接JSON解析失败，尝试流式响应解析");
    }
    
    // 分离响应中的数据行
    const dataLines = responseText.split('\n').filter(line => line.trim().startsWith('data:'));
    console.log(`找到 ${dataLines.length} 行数据`);
    
    let fullResponse = '';
    let reasoning = '';
    let content = '';
    
    // 处理所有数据行
    dataLines.forEach((line, index) => {
        try {
            const jsonStr = line.substring(5).trim(); // 移除 'data:' 前缀
            if (jsonStr) {
                const data = JSON.parse(jsonStr);
                
                // 记录每个数据块的类型
                if (index < 3 || index > dataLines.length - 3) {
                    console.log(`数据块 #${index} 类型:`, data.type, "内容长度:", data.content ? data.content.length : 0);
                }
                
                // 收集模型思考内容
                if (data.reasoning_content) {
                    reasoning += data.reasoning_content;
                }
                
                // 收集实际输出内容
                if (data.content && data.type === 'answer' && !data.reasoning_content) {
                    content += data.content;
                }
                
                // 如果是完整的最终回答
                if (data.content && (
                    data.content.includes('原视频文案') && data.content.includes('爆款视频文案') ||
                    data.content.includes('原始文案') && data.content.includes('改写建议') ||
                    data.content.includes('原文') && data.content.includes('改写')
                )) {
                    fullResponse = data.content;
                    console.log("找到完整回答，长度:", fullResponse.length);
                }
            }
        } catch (e) {
            console.warn(`解析响应行 #${index} 失败:`, e);
            if (line.length > 100) {
                console.warn("问题行内容:", line.substring(0, 100) + "...");
            } else {
                console.warn("问题行内容:", line);
            }
        }
    });
    
    // 如果找到了完整回答，使用它；否则使用累积的内容
    const finalContent = fullResponse || content || responseText;
    console.log("最终内容长度:", finalContent.length);
    
    // 如果没有通过常规方式找到内容，尝试直接从原始响应中提取
    if (!fullResponse && !content && responseText.length > 0) {
        console.log("尝试从原始响应中直接提取内容");
        // 尝试查找常见的内容标记
        if (responseText.includes('原视频文案') || 
            responseText.includes('原始文案') || 
            responseText.includes('原文') ||
            responseText.includes('爆款视频文案') ||
            responseText.includes('改写建议') ||
            responseText.includes('改写')) {
            console.log("在原始响应中找到内容标记，直接使用原始响应");
            return extractContentParts(responseText, '');
        }
    }
    
    // 提取内容部分
    return extractContentParts(finalContent, reasoning);
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
        '原视频文案如下：', '原视频文案:', '原视频文案如下:', 
        '原始文案：', '原始文案:', 
        '原文：', '原文:', 
        '原始视频文案：', '原始视频文案:',
        '以下是原始文案：', '以下是原始文案:',
        '抖音视频原始文案：', '抖音视频原始文案:'
    ];
    
    const rewrittenMarkers = [
        '爆款视频文案：', '爆款视频文案:', 
        '改写建议：', '改写建议:', 
        '改写文案：', '改写文案:', 
        '改写后的文案：', '改写后的文案:',
        '以下是改写建议：', '以下是改写建议:',
        '爆款化建议：', '爆款化建议:',
        '爆款改写：', '爆款改写:'
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
        const regex = new RegExp(`(${originalMarkers.join('|')})[\\s\\n]*(.*?)(?=(${rewrittenMarkers.join('|')})|$)`, 's');
        const match = content.match(regex);
        if (match && match[2]) {
            original = match[2].trim();
            console.log(`使用正则表达式提取原始文案，长度: ${original.length}`);
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
        const regex = new RegExp(`(${rewrittenMarkers.join('|')})[\\s\\n]*(.*)`, 's');
        const match = content.match(regex);
        if (match && match[2]) {
            rewritten = match[2].trim();
            console.log(`使用正则表达式提取改写建议，长度: ${rewritten.length}`);
        }
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
        console.warn("未能提取全部内容，完整文本前200字符: " + content.substring(0, 200));
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
        originalContentBox.innerHTML = `<p>${result.original}</p>`;
    } else {
        originalContentBox.innerHTML = `<p class="error-message">未能提取到原始文案，请确认链接是否有效，或者尝试其他抖音视频链接。</p>`;
    }
    
    if (result.rewritten && result.rewritten !== '未找到改写建议') {
        rewrittenContentBox.innerHTML = `<p>${result.rewritten}</p>`;
    } else {
        rewrittenContentBox.innerHTML = `<p class="error-message">未能生成改写建议，请确认链接是否有效，或者尝试其他抖音视频链接。</p>`;
    }
    
    // 处理思考过程，添加换行以提高可读性
    const formattedThinking = result.thinking.replace(/。/g, '。<br>').replace(/！/g, '！<br>').replace(/？/g, '？<br>');
    modelThinkingBox.innerHTML = `<p>${formattedThinking}</p>`;
    
    // 显示结果区域
    resultSection.style.display = 'block';
    
    // 默认显示原始文案标签
    switchTab('originalContent');
    
    // 如果没有提取到原始文案，自动切换到模型思考过程标签，帮助用户理解
    if (result.original === '未找到原始文案') {
        switchTab('modelThinking');
    }
    
    // 调试模式下显示API响应
    if (DEBUG_MODE) {
        const apiResponseBox = document.getElementById('apiResponseBox');
        apiResponseBox.innerHTML = `<pre>${result.thinking}</pre>`;
        apiResponseBox.style.display = 'block';
    }
}

// 切换标签
function switchTab(tabId) {
    // 更新标签按钮状态
    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 更新标签内容显示
    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
}

// 复制内容
function copyContent(targetId) {
    const contentElement = document.getElementById(targetId);
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

// 添加示例链接填充功能（仅用于演示）
function fillExampleUrl() {
    videoUrlInput.value = 'https://v.douyin.com/example';
}
