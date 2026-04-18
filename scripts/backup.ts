import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

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

async function backupData() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFileName = `折柳建材备份_${timestamp}.zip`;
  const outputDir = path.join(projectRoot, 'backups');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, backupFileName);

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`\n备份完成！`);
    console.log(`项目目录：${projectRoot}`);
    console.log(`备份文件：${backupFileName}`);
    console.log(`大小：${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  const dbPath = path.join(projectRoot, 'prisma', 'dev.db');
  if (fs.existsSync(dbPath)) {
    archive.file(dbPath, { name: 'database/dev.db' });
    console.log('✓ 添加数据库文件');
  } else {
    console.log('- 数据库文件不存在，跳过');
  }

  const photosDir = path.join(projectRoot, 'photos');
  if (fs.existsSync(photosDir)) {
    archive.directory(photosDir, 'photos');
    const photoCount = fs.readdirSync(photosDir).length;
    console.log(`✓ 添加照片目录 (${photoCount} 张)`);
  } else {
    console.log('- 照片目录不存在，跳过');
  }

  const backupInfo = {
    timestamp: new Date().toISOString(),
    version: 'v2.7',
    projectRoot: projectRoot,
    includedFiles: ['database/dev.db', 'photos/'],
  };
  archive.append(JSON.stringify(backupInfo, null, 2), { name: 'backup_info.json' });
  console.log('✓ 添加备份信息');

  await archive.finalize();
}

console.log('='.repeat(50));
console.log('折柳建材 - 数据备份工具');
console.log('='.repeat(50));

backupData().catch((error) => {
  console.error('备份失败:', error);
  process.exit(1);
});