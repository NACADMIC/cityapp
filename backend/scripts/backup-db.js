// 데이터베이스 백업 스크립트
const fs = require('fs');
const path = require('path');
const DB = require('../database');

const BACKUP_DIR = process.env.DB_BACKUP_PATH || path.join(__dirname, '../backups');

// 백업 디렉토리 생성
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backupDatabase() {
  try {
    const db = new DB();
    const dbPath = path.join(__dirname, '../restaurant.db');
    
    if (!fs.existsSync(dbPath)) {
      console.log('❌ 데이터베이스 파일을 찾을 수 없습니다.');
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `restaurant-${timestamp}.db`);
    
    // 데이터베이스 파일 복사
    fs.copyFileSync(dbPath, backupPath);
    
    console.log('✅ 데이터베이스 백업 완료:', backupPath);
    
    // 오래된 백업 파일 삭제 (30일 이상)
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > thirtyDays) {
        fs.unlinkSync(filePath);
        console.log('🗑️ 오래된 백업 파일 삭제:', file);
      }
    });
    
    return backupPath;
  } catch (error) {
    console.error('❌ 백업 오류:', error.message);
    throw error;
  }
}

// 직접 실행 시
if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase };

