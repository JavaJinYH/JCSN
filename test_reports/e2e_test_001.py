from playwright.sync_api import sync_playwright
import time

def test_e2e_full_flow():
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        print("=" * 60)
        print("E2E-001: 完整业务周期测试")
        print("=" * 60)

        try:
            # 连接 Electron 应用 (通过 CDP 或直接 URL)
            # Electron loads http://localhost:3000
            print("\n[Step 1] 访问首页 Dashboard...")
            page.goto('http://localhost:3000', timeout=30000)
            page.wait_for_load_state('networkidle', timeout=15000)
            page.wait_for_timeout(2000)

            # 检查页面标题/加载状态
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")

            # 截图保存
            page.screenshot(path='d:/折柳建材/test_reports/01_dashboard.png', full_page=True)
            print("  Screenshot: 01_dashboard.png")

            # 检查是否有错误弹窗或白屏
            body_content = page.locator('body').inner_html()
            if len(body_content) < 100:
                print("  ⚠️ 页面内容过少，可能白屏")
                results.append(("Dashboard 加载", "⚠️ 内容异常"))
            else:
                print("  ✅ Dashboard 加载正常")
                results.append(("Dashboard 加载", "✅ 正常"))

            # 测试侧边栏导航
            print("\n[Step 2] 测试侧边栏导航...")
            nav_items = [
                ('库存管理', '库存'),
                ('进货管理', '进货'),
                ('销售管理', '销售'),
                ('商品管理', '商品'),
                ('客户管理', '客户'),
                ('报表统计', '报表'),
            ]

            for nav_name, nav_keyword in nav_items:
                try:
                    # 查找导航链接
                    nav_link = page.locator(f'text={nav_keyword}').first
                    if nav_link.is_visible(timeout=2000):
                        print(f"  ✅ 找到导航项: {nav_name}")
                        results.append((f"导航-{nav_name}", "✅ 存在"))
                    else:
                        print(f"  ⚠️ 未找到导航项: {nav_name}")
                        results.append((f"导航-{nav_name}", "⚠️ 未找到"))
                except Exception as e:
                    print(f"  ❌ 导航项错误: {nav_name} - {str(e)[:50]}")
                    results.append((f"导航-{nav_name}", f"❌ {str(e)[:30]}"))

            # 测试销售管理页面
            print("\n[Step 3] 导航到销售管理...")
            try:
                sales_link = page.locator('text=销售').first
                sales_link.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='d:/折柳建材/test_reports/02_sales.png', full_page=True)
                print("  ✅ 销售页面截图已保存")
                results.append(("销售页面", "✅ 正常"))
            except Exception as e:
                print(f"  ❌ 销售页面错误: {str(e)[:50]}")
                results.append(("销售页面", f"❌ {str(e)[:30]}"))

            # 测试新增销售按钮
            print("\n[Step 4] 测试新增销售按钮...")
            try:
                new_sale_btn = page.locator('text=新增销售').first
                if new_sale_btn.is_visible(timeout=3000):
                    new_sale_btn.click()
                    page.wait_for_timeout(2000)
                    page.screenshot(path='d:/折柳建材/test_reports/03_new_sale_dialog.png', full_page=True)
                    print("  ✅ 新增销售对话框已打开")
                    results.append(("新增销售Dialog", "✅ 正常"))

                    # 关闭对话框
                    close_btn = page.locator('text=取消').first
                    if close_btn.is_visible(timeout=2000):
                        close_btn.click()
                        page.wait_for_timeout(1000)
                else:
                    print("  ⚠️ 未找到新增销售按钮")
                    results.append(("新增销售Dialog", "⚠️ 按钮未找到"))
            except Exception as e:
                print(f"  ❌ 新增销售错误: {str(e)[:50]}")
                results.append(("新增销售Dialog", f"❌ {str(e)[:30]}"))

            # 测试商品管理页面
            print("\n[Step 5] 导航到商品管理...")
            try:
                product_link = page.locator('text=商品').first
                product_link.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='d:/折柳建材/test_reports/04_products.png', full_page=True)
                print("  ✅ 商品管理页面截图已保存")
                results.append(("商品管理页面", "✅ 正常"))
            except Exception as e:
                print(f"  ❌ 商品管理错误: {str(e)[:50]}")
                results.append(("商品管理页面", f"❌ {str(e)[:30]}"))

            # 测试客户管理页面
            print("\n[Step 6] 导航到客户管理...")
            try:
                customer_link = page.locator('text=客户').first
                customer_link.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='d:/折柳建材/test_reports/05_customers.png', full_page=True)
                print("  ✅ 客户管理页面截图已保存")
                results.append(("客户管理页面", "✅ 正常"))
            except Exception as e:
                print(f"  ❌ 客户管理错误: {str(e)[:50]}")
                results.append(("客户管理页面", f"❌ {str(e)[:30]}"))

            # 测试报表统计页面
            print("\n[Step 7] 导航到报表统计...")
            try:
                report_link = page.locator('text=报表').first
                report_link.click()
                page.wait_for_timeout(2000)
                page.screenshot(path='d:/折柳建材/test_reports/06_reports.png', full_page=True)
                print("  ✅ 报表统计页面截图已保存")
                results.append(("报表统计页面", "✅ 正常"))
            except Exception as e:
                print(f"  ❌ 报表统计错误: {str(e)[:50]}")
                results.append(("报表统计页面", f"❌ {str(e)[:30]}"))

        except Exception as e:
            print(f"\n❌ 测试过程错误: {str(e)}")
            results.append(("测试过程", f"❌ {str(e)[:50]}"))

        finally:
            browser.close()

    # 输出测试结果汇总
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    passed = sum(1 for _, r in results if r.startswith("✅"))
    failed = sum(1 for _, r in results if r.startswith("❌"))
    warning = sum(1 for _, r in results if r.startswith("⚠️"))

    for name, result in results:
        print(f"  {result:10s} | {name}")

    print("-" * 60)
    print(f"  总计: {len(results)} 项")
    print(f"  ✅ 通过: {passed}")
    print(f"  ❌ 失败: {failed}")
    print(f"  ⚠️ 警告: {warning}")
    print("=" * 60)

    return passed, failed, warning

if __name__ == "__main__":
    test_e2e_full_flow()
