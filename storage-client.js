import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const BUCKET_NAME = process.env.BUCKET_NAME || 'magi-specifications';

/**
 * Cloud Storage バケット取得
 */
export function getBucket() {
  return storage.bucket(BUCKET_NAME);
}

/**
 * 仕様書一覧取得
 */
export async function listSpecifications() {
  try {
    const bucket = getBucket();
    const [files] = await bucket.getFiles({ prefix: 'specifications/' });
    
    return files.map(file => ({
      name: file.name.replace('specifications/', ''),
      fullPath: file.name,
      updated: file.metadata.updated,
      size: file.metadata.size
    }));
  } catch (error) {
    console.error('Failed to list specifications:', error);
    throw error;
  }
}

/**
 * 仕様書取得
 */
export async function getSpecification(category) {
  try {
    const bucket = getBucket();
    const filePath = `specifications/${category}`;
    const file = bucket.file(filePath);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`Specification not found: ${category}`);
    }
    
    const [contents] = await file.download();
    return contents.toString('utf-8');
  } catch (error) {
    console.error(`Failed to get specification ${category}:`, error);
    throw error;
  }
}

/**
 * 仕様書アップロード
 */
export async function uploadSpecification(category, content) {
  try {
    const bucket = getBucket();
    const filePath = `specifications/${category}`;
    const file = bucket.file(filePath);
    
    await file.save(content, {
      metadata: {
        contentType: category.endsWith('.json') ? 'application/json' : 'text/markdown',
        metadata: {
          updated: new Date().toISOString()
        }
      }
    });
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error(`Failed to upload specification ${category}:`, error);
    throw error;
  }
}
