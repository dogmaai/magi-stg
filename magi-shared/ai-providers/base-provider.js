/**
 * AI Provider 基底クラス
 * 全プロバイダーの共通インターフェース
 */

import { fetchWithRetry, handleAPIError, AIProviderError } from './utils/error-handler.js';

export class BaseAIProvider {
  constructor(config) {
    this.name = config.name;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.timeout = config.timeout || 30000;
    this.maxTokens = config.maxTokens || 2048;
  }

  /**
   * プロンプトを送信してレスポンスを取得
   * サブクラスでオーバーライド
   */
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * 投資分析用プロンプト実行
   */
  async analyzeStock(symbol, stockData, context = '', constitution = '') {
    const prompt = this.buildAnalysisPrompt(symbol, stockData, context, constitution);
    const response = await this.generate(prompt);
    return this.parseAnalysisResponse(response);
  }

  /**
   * 汎用Q&A実行
   */
  async askQuestion(question, systemPrompt = '') {
    return await this.generate(question, { systemPrompt });
  }

  /**
   * 投資分析プロンプト構築
   */
  buildAnalysisPrompt(symbol, stockData, context, constitution) {
    let prompt = '';

    if (constitution) {
      prompt += `${constitution}\n\n`;
    }

    prompt += `## 銘柄分析: ${symbol}\n\n`;
    prompt += `### 株価データ\n${JSON.stringify(stockData, null, 2)}\n\n`;

    if (context) {
      prompt += `### 追加コンテキスト\n${context}\n\n`;
    }

    prompt += `### 指示\n`;
    prompt += `上記データを分析し、以下の形式で回答してください：\n`;
    prompt += `- action: BUY / HOLD / SELL\n`;
    prompt += `- confidence: 0-100の数値\n`;
    prompt += `- reason: 判断理由（日本語）\n`;

    return prompt;
  }

  /**
   * 分析レスポンスをパース
   */
  parseAnalysisResponse(response) {
    // JSONとして解析を試みる
    try {
      if (typeof response === 'object') {
        return this.normalizeAnalysisResult(response);
      }

      // JSON部分を抽出
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.normalizeAnalysisResult(parsed);
      }
    } catch (e) {
      // パース失敗
    }

    // テキストから抽出
    return this.extractFromText(response);
  }

  /**
   * 結果を正規化
   */
  normalizeAnalysisResult(result) {
    const action = (result.action || result.recommendation || 'HOLD').toUpperCase();
    const validActions = ['BUY', 'HOLD', 'SELL'];

    return {
      provider: this.name,
      action: validActions.includes(action) ? action : 'HOLD',
      confidence: Math.min(100, Math.max(0, Number(result.confidence) || 50)),
      reason: result.reason || result.rationale || result.explanation || ''
    };
  }

  /**
   * テキストから判断を抽出
   */
  extractFromText(text) {
    const upperText = text.toUpperCase();
    let action = 'HOLD';

    if (upperText.includes('BUY') || upperText.includes('買い')) {
      action = 'BUY';
    } else if (upperText.includes('SELL') || upperText.includes('売り')) {
      action = 'SELL';
    }

    // 信頼度の抽出を試みる
    const confidenceMatch = text.match(/(\d{1,3})%|confidence[:\s]+(\d{1,3})/i);
    const confidence = confidenceMatch ?
      parseInt(confidenceMatch[1] || confidenceMatch[2]) : 50;

    return {
      provider: this.name,
      action,
      confidence: Math.min(100, Math.max(0, confidence)),
      reason: text.substring(0, 500)
    };
  }

  /**
   * ヘルスチェック
   */
  async healthCheck() {
    try {
      await this.generate('Hello', { maxTokens: 10 });
      return { provider: this.name, status: 'healthy' };
    } catch (error) {
      return { provider: this.name, status: 'unhealthy', error: error.message };
    }
  }
}
