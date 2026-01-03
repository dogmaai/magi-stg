import { Storage } from '@google-cloud/storage';
import { BigQuery } from '@google-cloud/bigquery';
import { CohereClient } from 'cohere-ai';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';

const storage = new Storage();
const bigquery = new BigQuery();

const BUCKET_NAME = process.env.DOCUMENTS_BUCKET || 'magi-documents-screen-share-459802';
const DATASET_ID = 'magi_analytics';
const TABLE_ID = 'analysis_vectors';

// Cohere client initialization
let cohereClient = null;

export function initCohere(apiKey) {
  if (apiKey) {
    cohereClient = new CohereClient({ token: apiKey });
    console.log('✅ Cohere client initialized');
  } else {
    console.warn('⚠️  COHERE_API_KEY not set');
  }
}

/**
 * Extract text from uploaded file
 */
export async function extractText(buffer, mimeType, filename) {
  if (mimeType === 'application/pdf') {
    const data = await pdf(buffer);
    return data.text;
  } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8');
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Generate embedding using Cohere embed-multilingual-v3.0 (1024 dimensions)
 */
export async function generateEmbedding(text) {
  if (!cohereClient) {
    throw new Error('Cohere client not initialized');
  }

  // Truncate text if too long (Cohere has token limits)
  const maxChars = 10000;
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

  const response = await cohereClient.embed({
    texts: [truncatedText],
    model: 'embed-multilingual-v3.0',
    inputType: 'search_document'
  });

  return response.embeddings[0];
}

/**
 * Upload file to Cloud Storage
 */
export async function uploadToStorage(buffer, filename, mimeType, symbol) {
  const bucket = storage.bucket(BUCKET_NAME);
  const timestamp = new Date().toISOString().split('T')[0];
  const filePath = `uploads/${symbol}/${timestamp}/${filename}`;
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        symbol: symbol,
        uploadedAt: new Date().toISOString()
      }
    }
  });

  return `gs://${BUCKET_NAME}/${filePath}`;
}

/**
 * Save document vector to BigQuery
 */
export async function saveToBigQuery(data) {
  const row = {
    id: data.id,
    symbol: data.symbol,
    doc_type: data.doc_type,
    title: data.title,
    content: data.content,
    embedding: data.embedding,
    source_url: data.source_url || null,
    file_path: data.file_path,
    file_name: data.file_name,
    uploaded_by: data.uploaded_by || 'api',
    published_at: data.published_at || null,
    metadata: JSON.stringify(data.metadata || {})
  };

  await bigquery
    .dataset(DATASET_ID)
    .table(TABLE_ID)
    .insert([row]);

  return row.id;
}

/**
 * Process document upload
 */
export async function processDocumentUpload(file, options) {
  const {
    symbol,
    doc_type = 'analyst_report',
    title,
    source_url,
    published_at,
    uploaded_by
  } = options;

  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const id = uuidv4();
  const filename = file.originalname;
  const mimeType = file.mimetype;
  const buffer = file.buffer;

  // 1. Extract text
  const content = await extractText(buffer, mimeType, filename);

  // 2. Generate embedding (1024 dimensions)
  const embedding = await generateEmbedding(content);

  // 3. Upload to Cloud Storage
  const filePath = await uploadToStorage(buffer, filename, mimeType, symbol);

  // 4. Save to BigQuery
  const savedId = await saveToBigQuery({
    id,
    symbol: symbol.toUpperCase(),
    doc_type,
    title: title || filename,
    content: content.substring(0, 50000), // Limit content size
    embedding,
    source_url,
    file_path: filePath,
    file_name: filename,
    uploaded_by,
    published_at: published_at ? new Date(published_at) : null,
    metadata: {
      original_size: buffer.length,
      mime_type: mimeType,
      embedding_model: 'embed-multilingual-v3.0',
      embedding_dimensions: 1024
    }
  });

  return {
    id: savedId,
    symbol: symbol.toUpperCase(),
    doc_type,
    title: title || filename,
    file_path: filePath,
    embedding_dimensions: embedding.length,
    content_length: content.length
  };
}
