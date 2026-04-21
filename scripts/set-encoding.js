/**
 * 折柳建材项目 - 统一编码设置模块
 * 解决 Windows 终端中文乱码问题
 * 
 * 使用方法：在你的 Node.js 脚本第一行引入：
 *   require('../scripts/set-encoding');
 */

if (process.platform === 'win32') {
  try {
    const { execSync } = require('child_process');
    execSync('chcp 65001', { stdio: 'ignore' });
  } catch (e) {
    // 忽略错误，不影响脚本执行
  }
}
