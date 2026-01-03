import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Document upload module
import { initCohere, processDocumentUpload } from './lib/document-upload.js';

// Shared AI Providers
import {
  GrokProvider,
  GeminiProvider,
  ClaudeProvider,
  MistralProvider,
  OpenAIProvider
} from './magi-shared/ai-providers/index.js';

// Role management
import rolesRouter from './src/routes/roles.js';
import { roleManager } from './src/services/role-manager.js';

// Credit management
import creditsRouter from './src/routes/credits.js';
import { creditManager } from './src/services/credit-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPEC_DIR = path.join(__dirname, 'specifications');

const app = express();
const PORT = process.env.PORT || 8080;

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: PDF, TXT, MD'));
    }
  }
});

// 仕様書をメモリにキャッシュ
let specifications = null;

// AI Providers (shared package)
let providers = {};

// 起動時に仕様書とプロバイダーを初期化
(async () => {
  specifications = loadLocalSpecifications();
  if (specifications) {
    console.log('✅ Specifications loaded and cached');
  } else {
    console.warn('⚠️  Failed to load specifications');
  }

  // Initialize role manager
  try {
    await roleManager.initialize();
    console.log('✅ Role manager initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize role manager:', error.message);
  }

  // Initialize credit manager
  try {
    await creditManager.initialize();
    console.log('✅ Credit manager initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize credit manager:', error.message);
  }

  // Initialize AI providers
  if (process.env.XAI_API_KEY) {
    providers.grok = new GrokProvider(process.env.XAI_API_KEY, {
      model: process.env.XAI_MODEL || 'grok-2-latest'
    });
  }
  if (process.env.GEMINI_API_KEY) {
    providers.gemini = new GeminiProvider(process.env.GEMINI_API_KEY, {
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    providers.claude = new ClaudeProvider(process.env.ANTHROPIC_API_KEY, {
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.openai = new OpenAIProvider(process.env.OPENAI_API_KEY, {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    });
  }
  if (process.env.MISTRAL_API_KEY) {
    providers.mistral = new MistralProvider(process.env.MISTRAL_API_KEY, {
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest'
    });
  }
  console.log('✅ AI Providers initialized:', Object.keys(providers).join(', '));

  // Initialize Cohere for document embeddings
  if (process.env.COHERE_API_KEY) {
    initCohere(process.env.COHERE_API_KEY);
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

// Register role management routes
app.use('/', rolesRouter);

// Register credit management routes
app.use('/', creditsRouter);

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
    grok: !!providers.grok,
    gemini: !!providers.gemini,
    claude: !!providers.claude,
    openai: !!providers.openai,
    mistral: !!providers.mistral,
    specifications: specifications !== null,
    shared_providers: true
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
// AI呼び出し関数（Shared Providers使用）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function callGrok(prompt) {
  if (!providers.grok) throw new Error('Grok provider not initialized');
  return await providers.grok.generate(prompt, { temperature: 0.5 });
}

async function callGemini(prompt) {
  if (!providers.gemini) throw new Error('Gemini provider not initialized');
  return await providers.gemini.generate(prompt, { temperature: 0.2 });
}

async function callClaude(prompt) {
  if (!providers.claude) throw new Error('Claude provider not initialized');
  return await providers.claude.generate(prompt, { temperature: 0.4 });
}

async function callOpenAI(prompt) {
  if (!providers.openai) throw new Error('OpenAI provider not initialized');
  return await providers.openai.generate(prompt, { temperature: 0.3 });
}

async function callMistral(prompt) {
  if (!providers.mistral) throw new Error('Mistral provider not initialized');
  return await providers.mistral.generate(prompt, { temperature: 0.3 });
}

async function integrateResponses(responses, originalPrompt) {
  if (!providers.openai) throw new Error('OpenAI provider not initialized');
  const integrationPrompt = `Integrate these 5 AI responses into a unified answer: ${JSON.stringify(responses)}`;
  return await providers.openai.generate(integrationPrompt, { temperature: 0.3 });
}

async function synthesizeResponses(responses, originalPrompt) {
  if (!providers.openai) throw new Error('OpenAI provider not initialized');
  const synthesisPrompt = `Create emergent insight from these diverse perspectives: ${JSON.stringify(responses)}`;
  return await providers.openai.generate(synthesisPrompt, { temperature: 0.7 });
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
// AI重み管理API（Learning Engine連携）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 現在のAI重み（メモリ保持）
let currentWeights = {
  unit_b2: 0.25,  // Grok
  unit_m1: 0.25,  // Gemini
  unit_c3: 0.25,  // Claude
  unit_r4: 0.25,  // Mistral
  updated_at: null
};

// 重み取得（認証あり）
app.get('/api/weights', (req, res) => {
  res.json(currentWeights);
});

// 重み更新（magi-decisionから呼び出される）
app.post('/api/weights/update', (req, res) => {
  const { unit_b2, unit_m1, unit_c3, unit_r4 } = req.body;

  if (unit_b2 !== undefined && unit_m1 !== undefined && unit_c3 !== undefined && unit_r4 !== undefined) {
    currentWeights = {
      unit_b2: parseFloat(unit_b2),
      unit_m1: parseFloat(unit_m1),
      unit_c3: parseFloat(unit_c3),
      unit_r4: parseFloat(unit_r4),
      updated_at: new Date().toISOString()
    };
    console.log('[WEIGHTS] Updated:', currentWeights);
    res.json({ success: true, weights: currentWeights });
  } else {
    res.status(400).json({ error: 'All weights required (unit_b2, unit_m1, unit_c3, unit_r4)' });
  }
});

// 公開エンドポイント（認証不要）
app.get('/public/weights', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    success: true,
    source: 'magi-stg',
    weights: currentWeights,
    description: {
      unit_b2: 'Grok (BALTHASAR-2) - センチメント分析',
      unit_m1: 'Gemini (MELCHIOR-1) - ニュース分析',
      unit_c3: 'Claude (CASPER-3) - ESG分析',
      unit_r4: 'Mistral (SOPHIA-5) - 高速スクリーニング'
    },
    timestamp: new Date().toISOString()
  });
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

// LLM設定API（8プロバイダー対応）
app.get('/public/llm-config', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const configPath = path.join(__dirname, 'public', 'llm-config.json');
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'LLM config not found' });
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    res.json({
      success: true,
      source: 'magi-stg',
      ...config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// サーバー起動

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LLM Config 管理API（新規追加）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LLM_CONFIG_PATH = path.join(__dirname, 'public', 'llm-config.json');
const LLM_HISTORY_PATH = path.join(__dirname, 'public', 'llm-config-history.json');

// 変更履歴を保存
function saveHistory(action, provider, changes, oldValue) {
  let history = [];
  if (fs.existsSync(LLM_HISTORY_PATH)) {
    history = JSON.parse(fs.readFileSync(LLM_HISTORY_PATH, 'utf-8'));
  }
  history.unshift({
    timestamp: new Date().toISOString(),
    action: action,
    provider: provider,
    changes: changes,
    old_value: oldValue
  });
  history = history.slice(0, 100);
  fs.writeFileSync(LLM_HISTORY_PATH, JSON.stringify(history, null, 2));
}

// GET /admin/llm-config - 整形済み設定取得
app.get('/admin/llm-config', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(LLM_CONFIG_PATH, 'utf-8'));
    const summary = Object.entries(config.providers).map(([name, p]) => ({
      provider: name,
      model: p.model,
      enabled: p.enabled,
      role: p.role,
      unit: p.unit_names?.magi_ac || p.unit_names?.magi_sys || '-'
    }));
    res.json({ success: true, version: config.version, updated_at: config.updated_at, providers: summary, full_config: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /admin/llm-config/:provider - 特定プロバイダ取得
app.get('/admin/llm-config/:provider', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(LLM_CONFIG_PATH, 'utf-8'));
    const provider = req.params.provider.toLowerCase();
    if (!config.providers[provider]) {
      return res.status(404).json({ success: false, error: 'Provider not found', available: Object.keys(config.providers) });
    }
    res.json({ success: true, provider: provider, config: config.providers[provider] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /admin/llm-config/:provider - プロバイダ設定更新
app.put('/admin/llm-config/:provider', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(LLM_CONFIG_PATH, 'utf-8'));
    const provider = req.params.provider.toLowerCase();
    if (!config.providers[provider]) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    const oldConfig = JSON.parse(JSON.stringify(config.providers[provider]));
    const updates = req.body;
    const allowedFields = ['model', 'temperature', 'max_tokens', 'timeout_ms', 'enabled'];
    const changes = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        changes[field] = { from: config.providers[provider][field], to: updates[field] };
        config.providers[provider][field] = updates[field];
      }
    }
    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update', allowed: allowedFields });
    }
    config.updated_at = new Date().toISOString().split('T')[0];
    config.version = (parseFloat(config.version) + 0.1).toFixed(1);
    fs.writeFileSync(LLM_CONFIG_PATH, JSON.stringify(config, null, 2));
    saveHistory('update', provider, changes, oldConfig);
    res.json({ success: true, message: 'Updated ' + provider, version: config.version, changes: changes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /admin/llm-config/:provider/toggle - 有効/無効切替
app.post('/admin/llm-config/:provider/toggle', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(LLM_CONFIG_PATH, 'utf-8'));
    const provider = req.params.provider.toLowerCase();
    if (!config.providers[provider]) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    const oldEnabled = config.providers[provider].enabled;
    config.providers[provider].enabled = !oldEnabled;
    config.updated_at = new Date().toISOString().split('T')[0];
    config.version = (parseFloat(config.version) + 0.1).toFixed(1);
    fs.writeFileSync(LLM_CONFIG_PATH, JSON.stringify(config, null, 2));
    saveHistory('toggle', provider, { enabled: { from: oldEnabled, to: !oldEnabled } }, null);
    res.json({ success: true, provider: provider, enabled: !oldEnabled, version: config.version });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /admin/llm-config-history - 変更履歴取得
app.get('/admin/llm-config-history', (req, res) => {
  try {
    if (!fs.existsSync(LLM_HISTORY_PATH)) {
      return res.json({ success: true, history: [] });
    }
    const history = JSON.parse(fs.readFileSync(LLM_HISTORY_PATH, 'utf-8'));
    const limit = parseInt(req.query.limit) || 20;
    res.json({ success: true, count: history.length, history: history.slice(0, limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /admin/llm-config/reload - 全サービスにリロード通知（将来用）
app.post('/admin/llm-config/reload', (req, res) => {
  res.json({ success: true, message: 'Reload signal sent (services will fetch on next request)', timestamp: new Date().toISOString() });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Document Upload API（手動アップロード用）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST /api/documents/upload - ドキュメントアップロード
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { symbol, doc_type, title, source_url, published_at, uploaded_by } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }

    console.log(`📄 Processing upload: ${req.file.originalname} for ${symbol}`);

    const result = await processDocumentUpload(req.file, {
      symbol,
      doc_type: doc_type || 'analyst_report',
      title,
      source_url,
      published_at,
      uploaded_by: uploaded_by || 'api'
    });

    console.log(`✅ Upload complete: ${result.id}`);

    res.json({
      success: true,
      message: 'Document uploaded and processed',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/documents/stats - アップロード統計
app.get('/api/documents/stats', async (req, res) => {
  try {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bigquery = new BigQuery();

    const query = `
      SELECT
        symbol,
        doc_type,
        COUNT(*) as count,
        MAX(created_at) as latest_upload
      FROM \`magi_analytics.analysis_vectors\`
      GROUP BY symbol, doc_type
      ORDER BY latest_upload DESC
    `;

    const [rows] = await bigquery.query({ query });

    res.json({
      success: true,
      stats: rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/documents/list - ドキュメント一覧取得
app.get('/api/documents/list', async (req, res) => {
  try {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bigquery = new BigQuery();

    const { symbol, doc_type, limit = 50, offset = 0 } = req.query;

    let whereClause = '';
    const conditions = [];
    if (symbol) conditions.push(`symbol = '${symbol.toUpperCase()}'`);
    if (doc_type) conditions.push(`doc_type = '${doc_type}'`);
    if (conditions.length > 0) whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT
        id,
        symbol,
        doc_type,
        title,
        file_name,
        file_path,
        source_url,
        uploaded_by,
        published_at,
        created_at,
        LENGTH(content) as content_length
      FROM \`magi_analytics.analysis_vectors\`
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
      OFFSET ${parseInt(offset)}
    `;

    const [rows] = await bigquery.query({ query });

    res.json({
      success: true,
      count: rows.length,
      documents: rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/documents/:id - ドキュメント削除
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const { Storage } = await import('@google-cloud/storage');
    const bigquery = new BigQuery();
    const storage = new Storage();

    const { id } = req.params;

    // まずドキュメント情報を取得
    const selectQuery = `
      SELECT id, file_path, symbol, title
      FROM \`magi_analytics.analysis_vectors\`
      WHERE id = '${id}'
    `;
    const [rows] = await bigquery.query({ query: selectQuery });

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const doc = rows[0];

    // GCSからファイル削除
    if (doc.file_path && doc.file_path.startsWith('gs://')) {
      try {
        const bucketName = process.env.DOCUMENTS_BUCKET || 'magi-documents-screen-share-459802';
        const filePath = doc.file_path.replace(`gs://${bucketName}/`, '');
        await storage.bucket(bucketName).file(filePath).delete();
        console.log(`🗑️  Deleted from GCS: ${filePath}`);
      } catch (gcsError) {
        console.warn(`⚠️  GCS delete failed (continuing): ${gcsError.message}`);
      }
    }

    // BigQueryから削除
    const deleteQuery = `
      DELETE FROM \`magi_analytics.analysis_vectors\`
      WHERE id = '${id}'
    `;
    await bigquery.query({ query: deleteQuery });

    console.log(`✅ Document deleted: ${id} (${doc.title})`);

    res.json({
      success: true,
      message: 'Document deleted',
      deleted: {
        id: doc.id,
        symbol: doc.symbol,
        title: doc.title
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, function() {
  console.log('');
  console.log('========================================');
  console.log('  MAGI-STG v7.1');
  console.log('  Document Upload + List/Delete API');
  console.log('========================================');
  console.log('  Port:', PORT);
  console.log('  Shared Providers: Enabled');
  console.log('  Learning Engine: Enabled');
  console.log('  Document Upload: Enabled');
  console.log('  Public API:');
  console.log('    /public/specs');
  console.log('    /public/overview');
  console.log('    /public/task');
  console.log('    /public/llm-config');
  console.log('    /public/weights');
  console.log('  Document API:');
  console.log('    POST   /api/documents/upload');
  console.log('    GET    /api/documents/list');
  console.log('    GET    /api/documents/stats');
  console.log('    DELETE /api/documents/:id');
  console.log('========================================');
  console.log('');
});
