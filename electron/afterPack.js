const fs = require('fs');
const path = require('path');

function copyFolderSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

exports.default = async function(context) {
  console.log('=== 执行 afterPack 脚本 ===');
  
  const appOutDir = context.appOutDir;
  const sourcePrisma = path.join(process.cwd(), 'node_modules', '.prisma');
  const targetPrisma = path.join(appOutDir, 'resources', 'app', 'node_modules', '.prisma');
  
  console.log(`源: ${sourcePrisma}`);
  console.log(`目标: ${targetPrisma}`);
  
  if (fs.existsSync(sourcePrisma)) {
    console.log('正在复制 .prisma 文件夹...');
    copyFolderSync(sourcePrisma, targetPrisma);
    console.log('✅ .prisma 文件夹复制完成!');
  } else {
    console.error('❌ 找不到 .prisma 文件夹!');
  }
  
  console.log('=== afterPack 脚本执行完成 ===');
};
