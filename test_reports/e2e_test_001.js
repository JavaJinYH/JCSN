const { chromium } = require('playwright');

async function testE2E001() {
  const results = [];

  console.log("=" .repeat(60));
  console.log("E2E-001: 完整业务周期测试");
  console.log("=" .repeat(60));

  // 使用用户下载的 Chrome
  const CHROME_PATH = 'D:/Devtools/chrome-win64/chrome.exe';

  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME_PATH
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    console.log("\n[Step 1] 访问首页 Dashboard...");
    await page.goto('http://localhost:3000', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    console.log(`  URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);

    await page.screenshot({ path: 'd:/折柳建材/test_reports/01_dashboard.png', fullPage: true });
    console.log("  Screenshot: 01_dashboard.png");

    const bodyContent = await page.locator('body').innerHTML();
    if (bodyContent.length < 100) {
      console.log("  ⚠️ 页面内容过少，可能白屏");
      results.push({ name: "Dashboard 加载", status: "⚠️ 内容异常" });
    } else {
      console.log("  ✅ Dashboard 加载正常");
      results.push({ name: "Dashboard 加载", status: "✅ 正常" });
    }

    console.log("\n[Step 2] 测试侧边栏导航...");
    const navItems = [
      { nav: '库存', name: '库存管理' },
      { nav: '进货', name: '进货管理' },
      { nav: '销售', name: '销售管理' },
      { nav: '商品', name: '商品管理' },
      { nav: '客户', name: '客户管理' },
      { nav: '报表', name: '报表统计' },
    ];

    for (const item of navItems) {
      try {
        const navLink = page.locator(`text=${item.nav}`).first();
        if (await navLink.isVisible({ timeout: 2000 })) {
          console.log(`  ✅ 找到导航项: ${item.name}`);
          results.push({ name: `导航-${item.name}`, status: "✅ 存在" });
        } else {
          console.log(`  ⚠️ 未找到导航项: ${item.name}`);
          results.push({ name: `导航-${item.name}`, status: "⚠️ 未找到" });
        }
      } catch (e) {
        console.log(`  ❌ 导航项错误: ${item.name} - ${e.message.substring(0, 50)}`);
        results.push({ name: `导航-${item.name}`, status: `❌ ${e.message.substring(0, 30)}` });
      }
    }

    console.log("\n[Step 3] 导航到销售管理...");
    try {
      await page.locator('text=销售').first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'd:/折柳建材/test_reports/02_sales.png', fullPage: true });
      console.log("  ✅ 销售页面截图已保存");
      results.push({ name: "销售页面", status: "✅ 正常" });
    } catch (e) {
      console.log(`  ❌ 销售页面错误: ${e.message.substring(0, 50)}`);
      results.push({ name: "销售页面", status: `❌ ${e.message.substring(0, 30)}` });
    }

    console.log("\n[Step 4] 测试新增销售按钮...");
    try {
      const newSaleBtn = page.locator('text=新增销售').first();
      if (await newSaleBtn.isVisible({ timeout: 3000 })) {
        await newSaleBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'd:/折柳建材/test_reports/03_new_sale_dialog.png', fullPage: true });
        console.log("  ✅ 新增销售对话框已打开");
        results.push({ name: "新增销售Dialog", status: "✅ 正常" });

        const closeBtn = page.locator('text=取消').first();
        if (await closeBtn.isVisible({ timeout: 2000 })) {
          await closeBtn.click();
          await page.waitForTimeout(1000);
        }
      } else {
        console.log("  ⚠️ 未找到新增销售按钮");
        results.push({ name: "新增销售Dialog", status: "⚠️ 按钮未找到" });
      }
    } catch (e) {
      console.log(`  ❌ 新增销售错误: ${e.message.substring(0, 50)}`);
      results.push({ name: "新增销售Dialog", status: `❌ ${e.message.substring(0, 30)}` });
    }

    console.log("\n[Step 5] 导航到商品管理...");
    try {
      await page.locator('text=商品').first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'd:/折柳建材/test_reports/04_products.png', fullPage: true });
      console.log("  ✅ 商品管理页面截图已保存");
      results.push({ name: "商品管理页面", status: "✅ 正常" });
    } catch (e) {
      console.log(`  ❌ 商品管理错误: ${e.message.substring(0, 50)}`);
      results.push({ name: "商品管理页面", status: `❌ ${e.message.substring(0, 30)}` });
    }

    console.log("\n[Step 6] 导航到客户管理...");
    try {
      await page.locator('text=客户').first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'd:/折柳建材/test_reports/05_customers.png', fullPage: true });
      console.log("  ✅ 客户管理页面截图已保存");
      results.push({ name: "客户管理页面", status: "✅ 正常" });
    } catch (e) {
      console.log(`  ❌ 客户管理错误: ${e.message.substring(0, 50)}`);
      results.push({ name: "客户管理页面", status: `❌ ${e.message.substring(0, 30)}` });
    }

    console.log("\n[Step 7] 导航到报表统计...");
    try {
      await page.locator('text=报表').first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'd:/折柳建材/test_reports/06_reports.png', fullPage: true });
      console.log("  ✅ 报表统计页面截图已保存");
      results.push({ name: "报表统计页面", status: "✅ 正常" });
    } catch (e) {
      console.log(`  ❌ 报表统计错误: ${e.message.substring(0, 50)}`);
      results.push({ name: "报表统计页面", status: `❌ ${e.message.substring(0, 30)}` });
    }

  } catch (e) {
    console.log(`\n❌ 测试过程错误: ${e.message}`);
    results.push({ name: "测试过程", status: `❌ ${e.message.substring(0, 50)}` });
  } finally {
    await browser.close();
  }

  console.log("\n" + "=" .repeat(60));
  console.log("测试结果汇总");
  console.log("=" .repeat(60));

  let passed = 0, failed = 0, warning = 0;
  for (const r of results) {
    console.log(`  ${r.status.padEnd(10)} | ${r.name}`);
    if (r.status.startsWith("✅")) passed++;
    else if (r.status.startsWith("❌")) failed++;
    else if (r.status.startsWith("⚠️")) warning++;
  }

  console.log("-".repeat(60));
  console.log(`  总计: ${results.length} 项`);
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  ⚠️ 警告: ${warning}`);
  console.log("=" .repeat(60));

  return { passed, failed, warning };
}

testE2E001().catch(console.error);
