// test-openrouter-search.js
// 專用測試腳本：測試 OpenRouter 呼叫 5年財務趨勢分析 (帶 Web Search 插件)
// 執行方式：node test-openrouter-search.js [股票代號/名稱，預設 台積電 2330.TW]

import fs from 'fs';
import path from 'path';

// 1. 自動讀取 .env.local 檔案中的環境變數
try {
  if (fs.existsSync('.env.local')) {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn('讀取 .env.local 失敗:', e.message);
}

// 取得 5年財務趨勢的真實 Prompt 格式 (完全與 src/app/api/financial-trend/route.js 一致)
function getFinancialTrendPrompt(displayName) {
  return `分析股票 ${displayName} 過去 5 年的財務數據。
請拆解：
• 營收成長
• 淨利趨勢
• 自由現金流
• 利潤率
• 負債水準
• 股東權益報酬率（ROE）

並判斷這家公司目前是財務體質正在變強，還是開始走弱。
請以精簡、專業的 繁體中文 Markdown 格式輸出，包含清晰的小標題、重點清單與比較表格。`;
}

async function runTest() {
  const stockSymbol = process.argv[2] || '台積電 (2330.TW)';
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_GEMINI_API_KEY;
  const apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const modelName = process.env.OPENROUTER_MODEL_NAME || process.env.OPENROUTER_GEMINI_MODEL_NAME || 'google/gemini-2.5-flash';

  console.log('====================================================');
  console.log('🚀 OpenRouter 5年財務趨勢 Web Search 測試腳本');
  console.log('====================================================');
  console.log(`📈 分析標的   : ${stockSymbol}`);
  console.log(`📡 API Endpoint: ${apiUrl}`);
  console.log(`🤖 Model Name  : ${modelName}`);
  console.log(`🔑 API Key     : ${apiKey ? apiKey.substring(0, 10) + '...' : '❌ 未設定 (UNSET)'}`);
  console.log('====================================================\n');

  if (!apiKey) {
    console.error('❌ 錯誤: 未找到 OPENROUTER_API_KEY。');
    console.error('請在 .env.local 中寫入: OPENROUTER_API_KEY=your_key_here');
    return;
  }

  const prompt = getFinancialTrendPrompt(stockSymbol);
  console.log(`📝 發送 Prompt (5年財務趨勢):\n----------------------------------------------------\n${prompt}\n----------------------------------------------------`);
  console.log('🔧 帶入 Web 搜尋插件 Payload: plugins: [{ id: "web" }]\n');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/google/antigravity',
        'X-Title': 'Stock Analysis Platform 5-Year Financial Trend Test'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        plugins: [{ id: 'web' }]
      })
    });

    console.log(`📥 HTTP 回應狀態碼: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error('\n❌ OpenRouter 回傳 API 錯誤:');
      console.error(errText);
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const annotations = data.choices?.[0]?.message?.annotations;

    console.log('\n📄 === 5年財務趨勢 AI 生成內容 (Content) ===');
    if (!content || !content.trim()) {
      console.warn('⚠️ 警報：API 成功返回 200，但 content 欄位為空！');
      console.log('完整 choices[0] 物件細節:', JSON.stringify(data.choices?.[0], null, 2));
    } else {
      console.log(content);
      console.log('\n✅ 內容長度:', content.length, '字元');
    }

    if (annotations && annotations.length > 0) {
      console.log('\n🔗 === Web Search 引用的網址 (Citations) ===');
      annotations.forEach((anno, index) => {
        if (anno.type === 'url_citation' && anno.url_citation) {
          console.log(`[${index + 1}] ${anno.url_citation.title || '無標題'} -> ${anno.url_citation.url}`);
        }
      });
    }
  } catch (err) {
    console.error('\n❌ 執行腳本時發生異常:', err.message);
  }
}

runTest();
