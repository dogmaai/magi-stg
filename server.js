import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import MistralClient from '@mistralai/mistralai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPEC_DIR = path.join(__dirname, 'specifications');

const app = express();
const PORT = process.env.PORT || 8080;

// 仕様書をメモリにキャッシュ
let specifications = null;

// 起動時に仕様書を読み込み
(async () => {
  specifications = loadLocalSpecifications();
  if (specifications) {
    console.log('✅ Specifications loaded and cached');
  } else {
    console.warn('⚠️  Failed to load specifications');
  }
})();

// ローカルファイルから仕様書読み込み
function loadLocalSpecifications() {
  try {
    const specs = {
      systemOverview: fs.readFileSync(path.join(SPEC_DIR, 'system-overview.md'), 'utf-8'),
      magiSysSpec: fs.readFileSync(path.join(SPEC_DIR, 'magi-sys-spec.md'), 'utf-8'),
      magiAcSpec: fs.readFileSync(path.join(SPEC_DIR, 'magi-ac-spec.md'), 'utf-8'),
      aiModels: JSON.parse(fs.readFileSync(path.join(SPEC_DIR, 'ai-models-config.json'), 'utf-8'))
    };
    return specs;
  } catch (error) {
    console.error('Failed to load specifications:', error.message);
    return null;
  }
}

// AIプロンプトに仕様書を挿入
function enhancePromptWithSpec(prompt, specs) {
  if (!specs || !specs.magiSysSpec) {
    return prompt;
  }
  return `
# MAGI System Context (Reference Only)
${specs.magiSysSpec}

---
# User Question:
${prompt}
`;
}

app.use(express.json());
app.use(express.static('public'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 仕様書配信API（新規追加）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 仕様書一覧取得
app.get('/api/specs', (req, res) => {
  try {
    const files = fs.readdirSync(SPEC_DIR);
    const specs = files.map(file => ({
      filename: file,
      path: `/api/spec/${file}`
    }));
    res.json({ 
      success: true, 
      count: specs.length,
      specifications: specs 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 個別仕様書取得
app.get('/api/spec/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(SPEC_DIR, filename);
    
    // セキュリティチェック（ディレクトリトラバーサル防止）
    if (!filePath.startsWith(SPEC_DIR)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Specification not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({
      success: true,
      filename,
      content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 全仕様書を一括取得
app.get('/api/specs/all', (req, res) => {
  try {
    const files = fs.readdirSync(SPEC_DIR);
    const allSpecs = {};
    
    files.forEach(file => {
      const content = fs.readFileSync(path.join(SPEC_DIR, file), 'utf-8');
      allSpecs[file] = file.endsWith('.json') ? JSON.parse(content) : content;
    });
    
    res.json({
      success: true,
      count: files.length,
      specifications: allSpecs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 既存エンドポイント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'magi-stg',
    specifications_loaded: specifications !== null,
    timestamp: new Date().toISOString()
  });
});

// ステータス確認
app.get('/status', (req, res) => {
  res.json({
    grok: !!process.env.XAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    claude: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
    specifications: specifications !== null
  });
});

// コンセンサスエンドポイント
app.post('/api/consensus', async (req, res) => {
  try {
    const { prompt, meta = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const enhancedPrompt = specifications 
      ? enhancePromptWithSpec(prompt, specifications)
      : prompt;

    console.log('📝 Processing consensus request with spec context:', !!specifications);

    const startTime = Date.now();
    
    const [balthasarResponse, melchiorResponse, casperResponse, maryResponse, sophiaResponse] = 
      await Promise.allSettled([
        callGrok(enhancedPrompt),
        callGemini(enhancedPrompt),
        callClaude(enhancedPrompt),
        callOpenAI(enhancedPrompt),
        callMistral(enhancedPrompt)
      ]);

    const responseTime = Date.now() - startTime;

    const responses = {
      balthasar: balthasarResponse.status === 'fulfilled' ? balthasarResponse.value : null,
      melchior: melchiorResponse.status === 'fulfilled' ? melchiorResponse.value : null,
      casper: casperResponse.status === 'fulfilled' ? casperResponse.value : null,
      mary: maryResponse.status === 'fulfilled' ? maryResponse.value : null,
      sophia: sophiaResponse.status === 'fulfilled' ? sophiaResponse.value : null
    };

    const validResponses = Object.values(responses).filter(r => r !== null).length;

    let final;
    const mode = meta.mode || 'consensus';
    
    if (mode === 'integration' && responses.mary) {
      final = await integrateResponses(responses, enhancedPrompt);
    } else if (mode === 'synthesis') {
      final = await synthesizeResponses(responses, enhancedPrompt);
    } else {
      final = findConsensus(responses);
    }

    res.json({
      final,
      ...responses,
      metrics: {
        response_time_ms: responseTime,
        valid_responses: validResponses,
        agreement_ratio: validResponses / 5,
        spec_context_used: !!specifications
      },
      judge: {
        model: 'gpt-4o-mini',
        method: mode
      }
    });

  } catch (error) {
    console.error('Error in consensus:', error);
    res.status(500).json({ error: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI呼び出し関数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function callGrok(prompt) {
  const groq = new Groq({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1'
  });
  const completion = await groq.chat.completions.create({
    model: process.env.XAI_MODEL || 'grok-2-latest',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5
  });
  return completion.choices[0]?.message?.content || 'No response';
}

async function callGemini(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    generationConfig: { temperature: 0.2 }
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callClaude(prompt) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt }]
  });
  return message.content[0].text;
}

async function callOpenAI(prompt) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });
  return completion.choices[0]?.message?.content || 'No response';
}

async function callMistral(prompt) {
  const mistral = new MistralClient(process.env.MISTRAL_API_KEY);
  const response = await mistral.chat({
    model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });
  return response.choices[0]?.message?.content || 'No response';
}

async function integrateResponses(responses, originalPrompt) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const integrationPrompt = `Integrate these 5 AI responses into a unified answer: ${JSON.stringify(responses)}`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: integrationPrompt }],
    temperature: 0.3
  });
  return completion.choices[0]?.message?.content;
}

async function synthesizeResponses(responses, originalPrompt) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const synthesisPrompt = `Create emergent insight from these diverse perspectives: ${JSON.stringify(responses)}`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: synthesisPrompt }],
    temperature: 0.7
  });
  return completion.choices[0]?.message?.content;
}

function findConsensus(responses) {
  const validResponses = Object.values(responses).filter(r => r !== null);
  if (validResponses.length === 0) return 'No valid responses';
  return validResponses.reduce((a, b) => a.length > b.length ? a : b);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 公開API（認証不要 - Claude参照用）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/public/specs', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const files = fs.readdirSync(SPEC_DIR);
    const allSpecs = {};
    files.forEach(file => {
      const content = fs.readFileSync(path.join(SPEC_DIR, file), 'utf-8');
      allSpecs[file] = file.endsWith('.json') ? JSON.parse(content) : content;
    });
    res.json({
      success: true,
      source: 'magi-stg',
      version: '4.0',
      count: files.length,
      specifications: allSpecs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/public/overview', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const overview = fs.readFileSync(path.join(SPEC_DIR, 'system-overview.md'), 'utf-8');
    res.json({
      success: true,
      content: overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// タスク管理API（会話継続用）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TASK_FILE = path.join(__dirname, 'current-task.json');

// タスク保存
app.post('/api/task', (req, res) => {
  try {
    const taskData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(TASK_FILE, JSON.stringify(taskData, null, 2));
    res.json({ success: true, message: 'Task saved', data: taskData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// タスク取得（認証不要）
app.get('/public/task', (req, res) => {
  try {
    if (!fs.existsSync(TASK_FILE)) {
      return res.json({ success: true, task: null, message: 'No active task' });
    }
    const taskData = JSON.parse(fs.readFileSync(TASK_FILE, 'utf-8'));
    res.json({ success: true, task: taskData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// タスク削除
app.delete('/api/task', (req, res) => {
  try {
    if (fs.existsSync(TASK_FILE)) {
      fs.unlinkSync(TASK_FILE);
    }
    res.json({ success: true, message: 'Task cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constitution API（全AI共有の憲法）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/public/constitution', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const constitutionPath = path.join(SPEC_DIR, 'constitution.md');
    const exists = fs.existsSync(constitutionPath);
    if (!exists) {
      return res.status(404).json({ error: 'Constitution not found' });
    }
    const constitution = fs.readFileSync(constitutionPath, 'utf-8');
    res.json({
      success: true,
      version: '1.0',
      north_star: 'MAGIは市場情報を安全に取り扱い、複数AIの知性を統合して、透明性のある投資判断と執行を行うシステムである',
      content: constitution,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// サーバー起動
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, function() {
  console.log('MAGI-STG running on port ' + PORT);
  console.log('Public API: /public/specs, /public/overview, /public/task');
});
