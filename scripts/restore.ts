import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import unzipper from 'unzipper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findProjectRoot(startDir) {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json')) &&
        fs.existsSync(path.join(currentDir, 'prisma'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return startDir;
}

const projectRoot = findProjectRoot(path.resolve(__dirname, '..'));

async function restoreData(zipFilePath) {
  if (!fs.existsSync(zipFilePath)) {
    console.error(`错误：文件不存在 ${zipFilePath}`);
    console.error(`请确保输入的是完整的备份文件路径`);
    return false;
  }

  console.log(`开始恢复数据...`);
  console.log(`备份文件：${zipFilePath}`);
  console.log(`项目目录：${projectRoot}`);

  const tempDir = path.join(projectRoot, 'backups', 'temp_restore');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  await new Promise((resolve, reject) => {
    fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: tempDir }))
      .on('close', () => resolve())
      .on('error', (err) => reject(err));
  });

  let restored = false;

  const dbBackupPath = path.join(tempDir, 'database', 'dev.db');
  if (fs.existsSync(dbBackupPath)) {
    const dbPath = path.join(projectRoot, 'prisma', 'dev.db');
    const dbBackupDir = path.join(projectRoot, 'prisma', 'backups');
    if (!fs.existsSync(dbBackupDir)) {
      fs.mkdirSync(dbBackupDir, { recursive: true });
    }
    if (fs.existsSync(dbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupName = `dev_backup_${timestamp}.db`;
      fs.copyFileSync(dbPath, path.join(dbBackupDir, backupName));
      console.log(`✓ 原数据库已备份到 prisma/backups/${backupName}`);
    }
    fs.copyFileSync(dbBackupPath, dbPath);
    console.log('✓ 恢复数据库文件');
    restored = true;
  } else {
    console.log('- 数据库文件不存在，跳过');
  }

  const photosBackupDir = path.join(tempDir, 'photos');
  if (fs.existsSync(photosBackupDir)) {
    const photosDir = path.join(projectRoot, 'photos');
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
    }
    const photosBackupList = fs.readdirSync(photosBackupDir);
    let copied = 0;
    for (const file of photosBackupList) {
      fs.copyFileSync(
        path.join(photosBackupDir, file),
        path.join(photosDir, file)
      );
      copied++;
    }
    console.log(`✓ 恢复 ${copied} 张照片`);
    restored = true;
  } else {
    console.log('- 照片目录不存在，跳过');
  }

  fs.rmSync(tempDir, { recursive: true });

  if (restored) {
    console.log('\n恢复完成！');
    return true;
  } else {
    console.log('\n警告：未恢复任何数据，可能是无效的备份文件');
    return false;
  }
}

const zipFilePath = process.argv[2];

console.log('='.repeat(50));
console.log('折柳建材 - 数据恢复工具');
console.log('='.repeat(50));

if (!zipFilePath) {
  console.log('\n用法：npx tsx scripts/restore.ts <备份文件路径>');
  console.log('示例：npx tsx scripts/restore.ts backups/折柳建材备份_2026-04-18.zip');
  console.log('\n提示：备份文件默认保存在项目的 backups/ 目录下');
  process.exit(1);
}

restoreData(zipFilePath)
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('恢复失败:', error);
    process.exit(1);
  });