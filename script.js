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
                    data.content.includes('原始文案') && data.content.includes('改写建议')
                )) {
                    fullResponse = data.content;
                    console.log("找到完整回答，长度:", fullResponse.length);
                }
            }
        } catch (e) {
            console.warn(`解析响应行 #${index} 失败:`, e);
            console.warn("问题行内容:", line.substring(0, 100) + "...");
        }
    });
    
    // 如果找到了完整回答，使用它；否则使用累积的内容
    const finalContent = fullResponse || content;
    console.log("最终内容长度:", finalContent.length);
    
    // 提取内容部分
    return extractContentParts(finalContent, reasoning);
}

// 提取内容部分
function extractContentParts(fullText, reasoning) {
    console.log("提取内容部分...");
    
    // 尝试从完整响应中提取原始文案和改写建议
    let original = '';
    let rewritten = '';
    
    // 提取原始文案 - 支持多种可能的格式
    const originalPatterns = [
        /原视频文案如下：\s*([\s\S]*?)(?=\n\n爆款视频文案|$)/,
        /原始文案[：:]\s*([\s\S]*?)(?=\n\n改写建议|$)/,
        /原文[：:]\s*([\s\S]*?)(?=\n\n改写|$)/
    ];
    
    for (const pattern of originalPatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
            original = match[1].trim();
            console.log("使用模式提取到原始文案，长度:", original.length);
            break;
        }
    }
    
    // 提取改写建议 - 支持多种可能的格式
    const rewrittenPatterns = [
        /爆款视频文案如下：\s*([\s\S]*?)(?=$)/,
        /改写建议[：:]\s*([\s\S]*?)(?=$)/,
        /改写[：:]\s*([\s\S]*?)(?=$)/
    ];
    
    for (const pattern of rewrittenPatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
            rewritten = match[1].trim();
            console.log("使用模式提取到改写建议，长度:", rewritten.length);
            break;
        }
    }
    
    // 如果没有找到内容，记录完整文本的一部分用于调试
    if (!original || !rewritten) {
        console.warn("未能提取全部内容，完整文本前200字符:", fullText.substring(0, 200));
    }
    
    return {
        thinking: reasoning || '未找到模型思考过程',
        original: original || '未找到原始文案',
        rewritten: rewritten || '未找到改写建议'
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
