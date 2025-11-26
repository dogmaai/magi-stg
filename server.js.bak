import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import MistralClient from '@mistralai/mistralai';
import { loadSpecifications, enhancePromptWithSpec } from './spec-client.js';

const app = express();
const PORT = process.env.PORT || 8080;

// 仕様書をメモリにキャッシュ
let specifications = null;

// 起動時に仕様書を読み込み
(async () => {
  specifications = await loadSpecifications();
  if (specifications) {
    console.log('✅ Specifications loaded and cached');
  } else {
    console.warn('⚠️  Failed to load specifications, continuing without spec context');
  }
})();

app.use(express.json());
app.use(express.static('public'));

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    specifications_loaded: specifications !== null,
    timestamp: new Date().toISOString()
  });
});

// 既存のコンセンサスエンドポイントを修正
app.post('/api/consensus', async (req, res) => {
  try {
    const { prompt, meta = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 仕様書をプロンプトに挿入
    const enhancedPrompt = specifications 
      ? enhancePromptWithSpec(prompt, specifications)
      : prompt;

    console.log('📝 Processing consensus request with spec context:', !!specifications);

    // 5つのAIを並列実行
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

    // レスポンス集約
    const responses = {
      balthasar: balthasarResponse.status === 'fulfilled' ? balthasarResponse.value : null,
      melchior: melchiorResponse.status === 'fulfilled' ? melchiorResponse.value : null,
      casper: casperResponse.status === 'fulfilled' ? casperResponse.value : null,
      mary: maryResponse.status === 'fulfilled' ? maryResponse.value : null,
      sophia: sophiaResponse.status === 'fulfilled' ? sophiaResponse.value : null
    };

    const validResponses = Object.values(responses).filter(r => r !== null).length;

    // モードに応じた統合
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

// AI呼び出し関数（省略版 - 既存コードを使用）
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
  const integrationPrompt = `Integrate these 5 AI responses: ${JSON.stringify(responses)}`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: integrationPrompt }],
    temperature: 0.3
  });
  return completion.choices[0]?.message?.content;
}

async function synthesizeResponses(responses, originalPrompt) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const synthesisPrompt = `Create emergent insight from: ${JSON.stringify(responses)}`;
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

app.listen(PORT, () => {
  console.log(`✅ MAGI System running on port ${PORT}`);
});
