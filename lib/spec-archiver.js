// lib/spec-archiver.js
// 仕様書のCloud Storageアーカイブ管理

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const storage = new Storage();
const BUCKET_NAME = 'magi-specs';
const SPEC_DIR = path.join(process.cwd(), 'specifications');

/**
 * 現在の仕様書をアーカイブに保存
 * @param {string} version - バージョン番号 (例: "4.0")
 */
export async function archiveCurrentSpecs(version) {
  const bucket = storage.bucket(BUCKET_NAME);
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  
  const archivePath = `archive/${yearMonth}/specs-v${version}-${timestamp}`;
  const results = [];

  try {
    const files = fs.readdirSync(SPEC_DIR);
    
    for (const file of files) {
      const filePath = path.join(SPEC_DIR, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const destination = `${archivePath}/${file}`;
        await bucket.upload(filePath, { destination });
        results.push({ file, destination, status: 'archived' });
        console.log(`📦 Archived: ${file} -> gs://${BUCKET_NAME}/${destination}`);
      }
    }

    // メタデータファイル作成
    const metadata = {
      version,
      archivedAt: now.toISOString(),
      files: results.map(r => r.file),
      archivePath
    };
    
    const metaFile = bucket.file(`${archivePath}/_metadata.json`);
    await metaFile.save(JSON.stringify(metadata, null, 2));
    
    console.log(`✅ Archive complete: ${archivePath}`);
    return { success: true, archivePath, files: results };
    
  } catch (error) {
    console.error('❌ Archive failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 最新仕様書をcurrent/に同期
 */
export async function syncToCurrentBucket() {
  const bucket = storage.bucket(BUCKET_NAME);
  const results = [];

  try {
    // 既存のcurrent/ファイルを削除
    const [existingFiles] = await bucket.getFiles({ prefix: 'current/' });
    for (const file of existingFiles) {
      if (!file.name.endsWith('.keep')) {
        await file.delete();
      }
    }

    // 新しいファイルをアップロード
    const files = fs.readdirSync(SPEC_DIR);
    
    for (const file of files) {
      const filePath = path.join(SPEC_DIR, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const destination = `current/${file}`;
        await bucket.upload(filePath, { destination });
        results.push({ file, destination, status: 'synced' });
        console.log(`🔄 Synced: ${file} -> gs://${BUCKET_NAME}/${destination}`);
      }
    }

    console.log(`✅ Sync complete: ${results.length} files`);
    return { success: true, files: results };
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * アーカイブ一覧を取得
 */
export async function listArchives() {
  const bucket = storage.bucket(BUCKET_NAME);
  
  try {
    const [files] = await bucket.getFiles({ prefix: 'archive/' });
    const metaFiles = files.filter(f => f.name.endsWith('_metadata.json'));
    
    const archives = [];
    for (const meta of metaFiles) {
      const [content] = await meta.download();
      archives.push(JSON.parse(content.toString()));
    }
    
    return { 
      success: true, 
      count: archives.length,
      archives: archives.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt))
    };
    
  } catch (error) {
    console.error('❌ List archives failed:', error.message);
    return { success: false, error: error.message };
  }
}