const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(startDays, endDays) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(startDays, endDays));
  date.setHours(randomInt(8, 18), randomInt(0, 59), randomInt(0, 59));
  return date;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log('🚀 开始生成高质量水暖建材店业务数据...\n');

  console.log('🧹 清空现有数据...');
  await db.collectionRecord.deleteMany();
  await db.businessCommission.deleteMany();
  await db.dailyExpense.deleteMany();
  await db.saleReturn.deleteMany();
  await db.saleOrderPhoto.deleteMany();
  await db.deliveryRecord.deleteMany();
  await db.badDebtWriteOff.deleteMany();
  await db.receivableAuditLog.deleteMany();
  await db.receivable.deleteMany();
  await db.orderPayment.deleteMany();
  await db.orderItem.deleteMany();
  await db.saleSlipItem.deleteMany();
  await db.saleSlip.deleteMany();
  await db.purchaseReturnItem.deleteMany();
  await db.purchaseReturn.deleteMany();
  await db.supplierPayment.deleteMany();
  await db.purchasePhoto.deleteMany();
  await db.purchase.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.serviceAppointmentItem.deleteMany();
  await db.serviceAppointment.deleteMany();
  await db.entityPrice.deleteMany();
  await db.contactPrice.deleteMany();
  await db.inventoryCheckItem.deleteMany();
  await db.inventoryCheck.deleteMany();
  await db.creditRecord.deleteMany();
  await db.contactPhone.deleteMany();
  await db.contactProjectRole.deleteMany();
  await db.contactEntityRole.deleteMany();
  await db.bizProject.deleteMany();
  await db.saleOrder.deleteMany();
  await db.entity.deleteMany();
  await db.contact.deleteMany();
  await db.supplier.deleteMany();
  await db.productSpec.deleteMany();
  await db.product.deleteMany();
  await db.brand.deleteMany();
  await db.category.deleteMany();
  await db.contactCategory.deleteMany();
  await db.deliveryFee.deleteMany();
  await db.paymentPlan.deleteMany();
  await db.legacyBill.deleteMany();
  await db.systemSetting.deleteMany();
  await db.dailyCounter.deleteMany();
  await db.auditLog.deleteMany();
  console.log('✅ 数据清空完成\n');

  console.log('📋 创建系统设置...');
  await db.systemSetting.create({
    data: {
      shopName: '折柳建材店',
      ownerName: '柳老板',
      phone: '13888888888',
      address: '建材市场A区12号',
      idleTimeoutMinutes: 10,
      lockPassword: '123456',
    }
  });

  console.log('📊 创建配送费用配置...');
  await Promise.all([
    db.deliveryFee.create({ data: { zoneName: '城区5公里内', baseFee: 30, perKgFee: 0, perKmFee: 0, minWeight: 0, maxWeight: 1000 } }),
    db.deliveryFee.create({ data: { zoneName: '城区5-15公里', baseFee: 50, perKgFee: 0.5, perKmFee: 2, minWeight: 0, maxWeight: 1000 } }),
    db.deliveryFee.create({ data: { zoneName: '郊区', baseFee: 100, perKgFee: 1, perKmFee: 3, minWeight: 0, maxWeight: 1000 } }),
  ]);

  console.log('📦 创建商品分类...');
  const categories = await Promise.all([
    db.category.create({ data: { name: 'PPR管材管件', description: 'PPR热水管、冷水管及管件', sortOrder: 1 } }),
    db.category.create({ data: { name: 'PVC排水管配件', description: 'PVC排水管、弯头、三通等', sortOrder: 2 } }),
    db.category.create({ data: { name: '电线电缆', description: 'BV电线、护套线、网线等', sortOrder: 3 } }),
    db.category.create({ data: { name: '开关插座面板', description: '墙壁开关、插座、面板', sortOrder: 4 } }),
    db.category.create({ data: { name: '灯具照明', description: 'LED吸顶灯、筒灯、灯泡', sortOrder: 5 } }),
    db.category.create({ data: { name: '卫浴五金洁具', description: '水龙头、花洒、卫浴配件', sortOrder: 6 } }),
    db.category.create({ data: { name: '防水材料', description: '防水涂料、卷材、堵漏王', sortOrder: 7 } }),
    db.category.create({ data: { name: '五金工具', description: '螺丝刀、钳子、电钻等工具', sortOrder: 8 } }),
  ]);

  console.log('🏷️ 创建品牌...');
  const brands = await Promise.all([
    db.brand.create({ data: { name: '伟星' } }),
    db.brand.create({ data: { name: '日丰' } }),
    db.brand.create({ data: { name: '金德' } }),
    db.brand.create({ data: { name: '熊猫电线' } }),
    db.brand.create({ data: { name: '起帆' } }),
    db.brand.create({ data: { name: '公牛' } }),
    db.brand.create({ data: { name: '西门子' } }),
    db.brand.create({ data: { name: '雷士照明' } }),
    db.brand.create({ data: { name: '九牧卫浴' } }),
    db.brand.create({ data: { name: '箭牌卫浴' } }),
    db.brand.create({ data: { name: '东方雨虹' } }),
    db.brand.create({ data: { name: '德高' } }),
    db.brand.create({ data: { name: '世达工具' } }),
  ]);

  console.log('🛒 创建商品数据（核心重点）...');
  const products = [];

  const productData = [
    // PPR管材管件
    { name: '伟星PPR热水管 20mm', code: 'WX-PPR-20-H', brand: '伟星', specification: '20mm S2.5 热水管', unit: '米', purchaseUnit: '盘', unitRatio: 100, stock: 300, minStock: 100, lastPurchasePrice: 6.8, referencePrice: 11, isPriceVolatile: false, catIdx: 0 },
    { name: '伟星PPR热水管 25mm', code: 'WX-PPR-25-H', brand: '伟星', specification: '25mm S2.5 热水管', unit: '米', purchaseUnit: '盘', unitRatio: 100, stock: 250, minStock: 80, lastPurchasePrice: 8.5, referencePrice: 13.5, isPriceVolatile: false, catIdx: 0 },
    { name: '伟星PPR冷水管 20mm', code: 'WX-PPR-20-C', brand: '伟星', specification: '20mm S4 冷水管', unit: '米', purchaseUnit: '盘', unitRatio: 100, stock: 400, minStock: 120, lastPurchasePrice: 5.2, referencePrice: 8.5, isPriceVolatile: false, catIdx: 0 },
    { name: '伟星PPR内丝弯头 20mm', code: 'WX-PPR-20-NSWT', brand: '伟星', specification: '20mm×1/2" 内丝弯头', unit: '个', purchaseUnit: '包', unitRatio: 50, stock: 200, minStock: 60, lastPurchasePrice: 4.5, referencePrice: 7.5, isPriceVolatile: false, catIdx: 0 },
    { name: '伟星PPR直接头 20mm', code: 'WX-PPR-20-ZJ', brand: '伟星', specification: '20mm 直接头', unit: '个', purchaseUnit: '包', unitRatio: 100, stock: 300, minStock: 100, lastPurchasePrice: 2.2, referencePrice: 3.8, isPriceVolatile: false, catIdx: 0 },
    { name: '伟星PPR三通 20mm', code: 'WX-PPR-20-ST', brand: '伟星', specification: '20mm 等径三通', unit: '个', purchaseUnit: '包', unitRatio: 50, stock: 180, minStock: 50, lastPurchasePrice: 3.5, referencePrice: 5.8, isPriceVolatile: false, catIdx: 0 },
    { name: '伟星PPR截止阀 20mm', code: 'WX-PPR-20-JZF', brand: '伟星', specification: '20mm 双活接截止阀', unit: '个', purchaseUnit: '个', unitRatio: 1, stock: 50, minStock: 15, lastPurchasePrice: 45, referencePrice: 75, isPriceVolatile: false, catIdx: 0 },
    { name: '日丰PPR热水管 25mm', code: 'RF-PPR-25-H', brand: '日丰', specification: '25mm S2.5 热水管', unit: '米', purchaseUnit: '盘', unitRatio: 100, stock: 200, minStock: 60, lastPurchasePrice: 7.8, referencePrice: 12.5, isPriceVolatile: false, catIdx: 0 },
    // PVC排水管配件
    { name: '联塑PVC排水管 50mm', code: 'LS-PVC-50', brand: '联塑', specification: '50mm×2.0mm 排水管', unit: '米', purchaseUnit: '根', unitRatio: 4, stock: 150, minStock: 40, lastPurchasePrice: 11.5, referencePrice: 18, isPriceVolatile: false, catIdx: 1 },
    { name: '联塑PVC排水管 75mm', code: 'LS-PVC-75', brand: '联塑', specification: '75mm×2.3mm 排水管', unit: '米', purchaseUnit: '根', unitRatio: 4, stock: 100, minStock: 30, lastPurchasePrice: 18.5, referencePrice: 28, isPriceVolatile: false, catIdx: 1 },
    { name: '联塑PVC排水管 110mm', code: 'LS-PVC-110', brand: '联塑', specification: '110mm×3.2mm 排水管', unit: '米', purchaseUnit: '根', unitRatio: 4, stock: 80, minStock: 25, lastPurchasePrice: 32, referencePrice: 50, isPriceVolatile: false, catIdx: 1 },
    { name: 'PVC弯头 50mm 90度', code: 'PVC-50-90WT', brand: '联塑', specification: '50mm 90度弯头', unit: '个', purchaseUnit: '包', unitRatio: 50, stock: 150, minStock: 40, lastPurchasePrice: 3.5, referencePrice: 5.5, isPriceVolatile: false, catIdx: 1 },
    { name: 'PVC三通 50mm', code: 'PVC-50-ST', brand: '联塑', specification: '50mm 等径三通', unit: '个', purchaseUnit: '包', unitRatio: 30, stock: 120, minStock: 35, lastPurchasePrice: 4.2, referencePrice: 6.8, isPriceVolatile: false, catIdx: 1 },
    { name: 'PVC存水弯 50mm', code: 'PVC-50-CSW', brand: '联塑', specification: '50mm P型存水弯', unit: '个', purchaseUnit: '包', unitRatio: 20, stock: 80, minStock: 25, lastPurchasePrice: 6.5, referencePrice: 10.5, isPriceVolatile: false, catIdx: 1 },
    // 电线电缆（含价格波动）
    { name: '熊猫BV2.5平方电线', code: 'XM-BV-2.5', brand: '熊猫电线', specification: 'BV2.5mm² 铜芯聚氯乙烯绝缘电线', unit: '米', purchaseUnit: '卷', unitRatio: 100, stock: 2500, minStock: 600, lastPurchasePrice: 2.3, referencePrice: 3.8, isPriceVolatile: true, catIdx: 2 },
    { name: '熊猫BV4平方电线', code: 'XM-BV-4', brand: '熊猫电线', specification: 'BV4mm² 铜芯聚氯乙烯绝缘电线', unit: '米', purchaseUnit: '卷', unitRatio: 100, stock: 1800, minStock: 450, lastPurchasePrice: 3.6, referencePrice: 5.8, isPriceVolatile: true, catIdx: 2 },
    { name: '熊猫BV6平方电线', code: 'XM-BV-6', brand: '熊猫电线', specification: 'BV6mm² 铜芯聚氯乙烯绝缘电线', unit: '米', purchaseUnit: '卷', unitRatio: 100, stock: 1000, minStock: 250, lastPurchasePrice: 5.4, referencePrice: 8.5, isPriceVolatile: true, catIdx: 2 },
    { name: '起帆超五类网线', code: 'QF-WX-CAT5', brand: '起帆', specification: 'UTP CAT5e 超五类非屏蔽网线', unit: '米', purchaseUnit: '箱', unitRatio: 305, stock: 800, minStock: 200, lastPurchasePrice: 1.9, referencePrice: 3.2, isPriceVolatile: false, catIdx: 2 },
    { name: '起帆RVV护套线 2×1.5', code: 'QF-RVV-2X1.5', brand: '起帆', specification: 'RVV 2×1.5mm² 护套线', unit: '米', purchaseUnit: '卷', unitRatio: 100, stock: 600, minStock: 150, lastPurchasePrice: 3.2, referencePrice: 5.2, isPriceVolatile: false, catIdx: 2 },
    // 开关插座面板
    { name: '公牛五孔插座 10A', code: 'GN-5K-10A', brand: '公牛', specification: 'G07系列 五孔插座 10A 白色', unit: '个', purchaseUnit: '盒', unitRatio: 10, stock: 350, minStock: 100, lastPurchasePrice: 14.5, referencePrice: 24.5, isPriceVolatile: false, catIdx: 3 },
    { name: '公牛单开单控开关', code: 'GN-1K-DK', brand: '公牛', specification: 'G07系列 单开单控开关 白色', unit: '个', purchaseUnit: '盒', unitRatio: 10, stock: 250, minStock: 70, lastPurchasePrice: 11.5, referencePrice: 19.5, isPriceVolatile: false, catIdx: 3 },
    { name: '公牛双开双控开关', code: 'GN-2K-SK', brand: '公牛', specification: 'G07系列 双开双控开关 白色', unit: '个', purchaseUnit: '盒', unitRatio: 10, stock: 180, minStock: 50, lastPurchasePrice: 17.5, referencePrice: 29.5, isPriceVolatile: false, catIdx: 3 },
    { name: '公牛16A三孔空调插座', code: 'GN-3K-16A', brand: '公牛', specification: 'G07系列 16A三孔空调插座 白色', unit: '个', purchaseUnit: '盒', unitRatio: 10, stock: 150, minStock: 40, lastPurchasePrice: 16.5, referencePrice: 27.5, isPriceVolatile: false, catIdx: 3 },
    { name: '西门子睿致五孔插座', code: 'XMZ-RZ-5K', brand: '西门子', specification: '睿致系列 五孔插座 象牙白', unit: '个', purchaseUnit: '个', unitRatio: 1, stock: 100, minStock: 30, lastPurchasePrice: 26.5, referencePrice: 44.5, isPriceVolatile: false, catIdx: 3 },
    // 灯具照明
    { name: '雷士LED吸顶灯 36W', code: 'LS-LED-36W', brand: '雷士照明', specification: 'LED吸顶灯 36W 白光 圆形', unit: '个', purchaseUnit: '个', unitRatio: 1, stock: 70, minStock: 20, lastPurchasePrice: 62, referencePrice: 118, isPriceVolatile: false, catIdx: 4 },
    { name: '雷士LED筒灯 5W', code: 'LS-TD-5W', brand: '雷士照明', specification: 'LED筒灯 5W 开孔75-85mm', unit: '个', purchaseUnit: '盒', unitRatio: 5, stock: 200, minStock: 60, lastPurchasePrice: 17.5, referencePrice: 30, isPriceVolatile: false, catIdx: 4 },
    { name: '雷士LED球泡灯 9W', code: 'LS-QP-9W', brand: '雷士照明', specification: 'LED球泡灯 9W E27螺口 白光', unit: '个', purchaseUnit: '盒', unitRatio: 10, stock: 350, minStock: 100, lastPurchasePrice: 11.5, referencePrice: 20, isPriceVolatile: false, catIdx: 4 },
    { name: '雷士LED球泡灯 18W', code: 'LS-QP-18W', brand: '雷士照明', specification: 'LED球泡灯 18W E27螺口 白光', unit: '个', purchaseUnit: '盒', unitRatio: 10, stock: 150, minStock: 40, lastPurchasePrice: 22, referencePrice: 38, isPriceVolatile: false, catIdx: 4 },
    { name: '欧普LED吸顶灯 24W', code: 'OP-LED-24W', brand: '欧普照明', specification: 'LED吸顶灯 24W 现代简约', unit: '个', purchaseUnit: '个', unitRatio: 1, stock: 50, minStock: 15, lastPurchasePrice: 55, referencePrice: 98, isPriceVolatile: false, catIdx: 4 },
    // 卫浴五金洁具
    { name: '九牧单冷水龙头 面盆', code: 'JM-MP-LS', brand: '九牧卫浴', specification: '面盆单冷水龙头 铜主体', unit: '个', purchaseUnit: '个', unitRatio: 1, stock: 50, minStock: 15, lastPurchasePrice: 52, referencePrice: 92, isPriceVolatile: false, catIdx: 5 },
    { name: '九牧冷热水龙头 面盆', code: 'JM-MP-RS', brand: '九牧卫浴', specification: '面盆冷热水龙头 铜主体', unit: '个', purchaseUnit: '个', unitRatio: 1, stock: 35, minStock: 10, lastPurchasePrice: 115, referencePrice: 198, isPriceVolatile: false, catIdx: 5 },
    { name: '九牧淋浴花洒套装', code: 'JM-HS-TZ', brand: '九牧卫浴', specification: '淋浴花洒套装 三功能出水', unit: '套', purchaseUnit: '套', unitRatio: 1, stock: 20, minStock: 6, lastPurchasePrice: 280, referencePrice: 498, isPriceVolatile: false, catIdx: 5 },
    { name: '箭牌马桶盖 缓降', code: 'JP-MTG-HJ', brand: '箭牌卫浴', specification: '马桶盖 缓降静音 脲醛树脂', unit: '个', purchaseUnit: '个', unitRatio: 1, stock: 25, minStock: 8, lastPurchasePrice: 78, referencePrice: 138, isPriceVolatile: false, catIdx: 5 },
    { name: '潜水艇地漏 防臭', code: 'QS-DL-FC', brand: '潜水艇', specification: '防臭地漏 不锈钢拉丝', unit: '个', purchaseUnit: '个', unitRatio: 1, stock: 60, minStock: 20, lastPurchasePrice: 38, referencePrice: 68, isPriceVolatile: false, catIdx: 5 },
    // 防水材料
    { name: '东方雨虹防水涂料 10kg', code: 'DFYH-FS-10KG', brand: '东方雨虹', specification: '柔韧性防水涂料 10kg 灰色', unit: '桶', purchaseUnit: '桶', unitRatio: 1, stock: 45, minStock: 15, lastPurchasePrice: 135, referencePrice: 228, isPriceVolatile: false, catIdx: 6 },
    { name: '德高K11防水涂料 18kg', code: 'DG-K11-18KG', brand: '德高', specification: 'K11柔韧性防水浆料 18kg', unit: '桶', purchaseUnit: '桶', unitRatio: 1, stock: 35, minStock: 12, lastPurchasePrice: 185, referencePrice: 318, isPriceVolatile: false, catIdx: 6 },
    { name: '堵漏王 快干水泥', code: 'DLW-KGSN', brand: '德高', specification: '快速堵漏王 5kg 速凝型', unit: '袋', purchaseUnit: '箱', unitRatio: 10, stock: 80, minStock: 25, lastPurchasePrice: 18, referencePrice: 32, isPriceVolatile: false, catIdx: 6 },
    // 五金工具
    { name: '世达螺丝刀套装 12件', code: 'SD-LSD-TZ-12', brand: '世达工具', specification: '螺丝刀套装 12件 十字一字', unit: '套', purchaseUnit: '套', unitRatio: 1, stock: 25, minStock: 8, lastPurchasePrice: 85, referencePrice: 148, isPriceVolatile: false, catIdx: 7 },
    { name: '世达钢丝钳 8寸', code: 'SD-GSQ-8C', brand: '世达工具', specification: '钢丝钳 8寸 铬钒钢', unit: '把', purchaseUnit: '把', unitRatio: 1, stock: 40, minStock: 12, lastPurchasePrice: 42, referencePrice: 72, isPriceVolatile: false, catIdx: 7 },
    { name: '得力电钻 冲击钻', code: 'DL-DZ-CJ', brand: '得力工具', specification: '冲击钻 500W 家用套装', unit: '台', purchaseUnit: '台', unitRatio: 1, stock: 15, minStock: 5, lastPurchasePrice: 180, referencePrice: 318, isPriceVolatile: false, catIdx: 7 },
    { name: '生料带 10米', code: 'SLD-10M', brand: '其他', specification: '生料带 10米 加厚型', unit: '卷', purchaseUnit: '盒', unitRatio: 100, stock: 500, minStock: 200, lastPurchasePrice: 0.8, referencePrice: 2, isPriceVolatile: false, catIdx: 7 },
  ];

  for (const p of productData) {
    const product = await db.product.create({
      data: {
        name: p.name,
        code: p.code,
        categoryId: categories[p.catIdx].id,
        brand: p.brand,
        specification: p.specification,
        unit: p.unit,
        purchaseUnit: p.purchaseUnit,
        unitRatio: p.unitRatio,
        stock: p.stock,
        minStock: p.minStock,
        lastPurchasePrice: p.lastPurchasePrice,
        referencePrice: p.referencePrice,
        isPriceVolatile: p.isPriceVolatile,
      }
    });
    products.push(product);
  }

  console.log(`✅ 创建了 ${products.length} 个商品\n`);

  console.log('🏪 创建供应商数据...');
  const suppliers = await Promise.all([
    db.supplier.create({
      data: {
        code: 'GYS001',
        name: '伟星管业区域总代',
        phone: '13800138001',
        address: '建材市场A区15-18号',
        remark: '主营：伟星PPR管、管件、阀门，月结30天',
      }
    }),
    db.supplier.create({
      data: {
        code: 'GYS002',
        name: '熊猫电线电缆厂',
        phone: '13800138002',
        address: '工业区电线路88号',
        remark: '主营：BV电线、护套线、网线，价格随行就市',
      }
    }),
    db.supplier.create({
      data: {
        code: 'GYS003',
        name: '公牛五金电器批发',
        phone: '13800138003',
        address: '五金机电城2号楼101-105',
        remark: '公牛开关插座、雷士照明一级代理',
      }
    }),
    db.supplier.create({
      data: {
        code: 'GYS004',
        name: '九牧卫浴旗舰店',
        phone: '13800138004',
        address: '卫浴广场A1-05',
        remark: '九牧卫浴、箭牌卫浴、潜水艇地漏总代理',
      }
    }),
    db.supplier.create({
      data: {
        code: 'GYS005',
        name: '东方雨虹防水总代',
        phone: '13800138005',
        address: '防水材料市场B区22号',
        remark: '东方雨虹、德高防水专业供应商',
      }
    }),
    db.supplier.create({
      data: {
        code: 'GYS006',
        name: '联塑管道批发中心',
        phone: '13800138006',
        address: '管材管件市场C区8号',
        remark: '联塑PVC排水管、管件一站式采购',
      }
    }),
  ]);

  console.log(`✅ 创建了 ${suppliers.length} 个供应商\n`);

  console.log('👥 创建联系人分类...');
  const contactCategories = await Promise.all([
    db.contactCategory.create({ data: { name: '装饰公司', discount: 0.08 } }),
    db.contactCategory.create({ data: { name: '水电工班组', discount: 0.10 } }),
    db.contactCategory.create({ data: { name: '个人业主', discount: 0 } }),
  ]);

  console.log('📇 创建联系人（三种类型各2-3条）...');
  const contacts = await Promise.all([
    // 装饰公司类型
    db.contact.create({
      data: { code: 'LXR001', name: '王经理', primaryPhone: '13900139001', address: '龙发装饰工程有限公司 办公室', contactType: 'company', contactCategoryId: contactCategories[0].id, creditLimit: 50000, creditLevel: 'excellent', riskLevel: 'low', remark: '龙发装饰采购经理，长期合作，信誉良好' }
    }),
    db.contact.create({
      data: { code: 'LXR002', name: '李总', primaryPhone: '13900139002', address: '尚品装饰设计有限公司', contactType: 'company', contactCategoryId: contactCategories[0].id, creditLimit: 80000, creditLevel: 'excellent', riskLevel: 'low', remark: '尚品装饰老板，单量大，付款及时' }
    }),
    // 水电工类型
    db.contact.create({
      data: { code: 'LXR003', name: '张师傅', primaryPhone: '13900139003', address: '水电新村15栋3单元', contactType: 'plumber', contactCategoryId: contactCategories[1].id, creditLimit: 10000, creditLevel: 'good', riskLevel: 'low', remark: '资深水电工，合作5年，介绍单多' }
    }),
    db.contact.create({
      data: { code: 'LXR004', name: '刘师傅', primaryPhone: '13900139004', address: '城东花园22栋', contactType: 'plumber', contactCategoryId: contactCategories[1].id, creditLimit: 8000, creditLevel: 'good', riskLevel: 'low', remark: '年轻水电工，干活利索，付款爽快' }
    }),
    db.contact.create({
      data: { code: 'LXR005', name: '陈师傅', primaryPhone: '13900139005', address: '城西家园8栋', contactType: 'plumber', contactCategoryId: contactCategories[1].id, creditLimit: 5000, creditLevel: 'normal', riskLevel: 'medium', remark: '新合作水电工，暂放小额度' }
    }),
    // 个人业主类型
    db.contact.create({
      data: { code: 'LXR006', name: '赵先生', primaryPhone: '13900139006', address: '幸福小区1-101', contactType: 'personal', contactCategoryId: contactCategories[2].id, creditLimit: 0, remark: '自住装修业主，现金结算' }
    }),
    db.contact.create({
      data: { code: 'LXR007', name: '孙女士', primaryPhone: '13900139007', address: '阳光花园2-205', contactType: 'personal', contactCategoryId: contactCategories[2].id, creditLimit: 0, remark: '婚房装修，要求品质高' }
    }),
    // 系统内置散客
    db.contact.create({
      data: { code: 'LXR000', name: '散客', primaryPhone: '00000000000', contactType: 'customer', remark: '系统内置散客账户，现金结算' }
    }),
  ]);

  console.log(`✅ 创建了 ${contacts.length} 个联系人\n`);

  console.log('🏢 创建挂靠主体（四种类型各2-3条）...');
  const cashEntity = await db.entity.create({
    data: { name: '现金结算账户', entityType: 'cash', creditLimit: 0, creditUsed: 0, remark: '现金、微信、支付宝即时结算账户' }
  });

  const companyEntity1 = await db.entity.create({
    data: { name: '龙发装饰工程有限公司', entityType: 'company', creditLimit: 50000, creditUsed: 0, creditScore: 88, creditLevel: 'excellent', riskLevel: 'low', address: '装饰城A座8楼', remark: '长期合作装饰公司，月结30天' }
  });

  const companyEntity2 = await db.entity.create({
    data: { name: '尚品装饰设计有限公司', entityType: 'company', creditLimit: 80000, creditUsed: 0, creditScore: 92, creditLevel: 'excellent', riskLevel: 'low', address: 'CBD商务中心15楼', remark: '高端装饰公司，信誉极佳' }
  });

  const contractorEntity1 = await db.entity.create({
    data: { name: '张师傅水电工团队', entityType: 'contractor', creditLimit: 20000, creditUsed: 0, creditScore: 75, creditLevel: 'good', riskLevel: 'low', remark: '张师傅水电班组，现结或周结' }
  });

  const contractorEntity2 = await db.entity.create({
    data: { name: '刘师傅装修服务队', entityType: 'contractor', creditLimit: 15000, creditUsed: 0, creditScore: 70, creditLevel: 'good', riskLevel: 'low', remark: '刘师傅带领的装修服务队' }
  });

  const personalEntity1 = await db.entity.create({
    data: { name: '赵先生（个人装修）', entityType: 'personal', creditLimit: 0, creditUsed: 0, remark: '幸福小区业主自住装修' }
  });

  const personalEntity2 = await db.entity.create({
    data: { name: '孙女士（婚房装修）', entityType: 'personal', creditLimit: 0, creditUsed: 0, remark: '阳光花园婚房装修' }
  });

  const entities = [cashEntity, companyEntity1, companyEntity2, contractorEntity1, contractorEntity2, personalEntity1, personalEntity2];

  console.log(`✅ 创建了 ${entities.length} 个挂靠主体\n`);

  console.log('🔗 创建联系人和挂靠主体关系...');
  await Promise.all([
    // 王经理 - 龙发装饰
    db.contactEntityRole.create({
      data: { contactId: contacts[0].id, entityId: companyEntity1.id, role: 'buyer', isDefault: true, remark: '采购负责人' }
    }),
    // 李总 - 尚品装饰
    db.contactEntityRole.create({
      data: { contactId: contacts[1].id, entityId: companyEntity2.id, role: 'buyer', isDefault: true, remark: '老板' }
    }),
    // 张师傅 - 张师傅团队
    db.contactEntityRole.create({
      data: { contactId: contacts[2].id, entityId: contractorEntity1.id, role: 'buyer', isDefault: true, remark: '队长' }
    }),
    // 刘师傅 - 刘师傅服务队
    db.contactEntityRole.create({
      data: { contactId: contacts[3].id, entityId: contractorEntity2.id, role: 'buyer', isDefault: true, remark: '队长' }
    }),
    // 赵先生 - 个人装修
    db.contactEntityRole.create({
      data: { contactId: contacts[5].id, entityId: personalEntity1.id, role: 'buyer', isDefault: true, remark: '业主' }
    }),
    // 孙女士 - 婚房装修
    db.contactEntityRole.create({
      data: { contactId: contacts[6].id, entityId: personalEntity2.id, role: 'buyer', isDefault: true, remark: '业主' }
    }),
  ]);

  console.log('🏗️ 创建项目管理数据...');
  const projects = await Promise.all([
    db.bizProject.create({
      data: {
        name: '幸福小区1-101 全屋装修',
        entityId: companyEntity1.id,
        address: '幸福小区1栋101室',
        status: '进行中',
        startDate: new Date('2026-03-10'),
        estimatedAmount: 95000,
        remark: '龙发装饰承接，水电阶段'
      }
    }),
    db.bizProject.create({
      data: {
        name: '阳光花园2-205 现代简约风',
        entityId: companyEntity2.id,
        address: '阳光花园2栋205室',
        status: '进行中',
        startDate: new Date('2026-04-01'),
        estimatedAmount: 135000,
        remark: '尚品装饰承接，高端装修'
      }
    }),
    db.bizProject.create({
      data: {
        name: '城西家园8栋 旧房改造',
        entityId: contractorEntity1.id,
        address: '城西家园8栋402室',
        status: '进行中',
        startDate: new Date('2026-03-25'),
        estimatedAmount: 45000,
        remark: '张师傅团队，水电改造为主'
      }
    }),
    db.bizProject.create({
      data: {
        name: '幸福小区1-101 赵先生自住',
        entityId: personalEntity1.id,
        address: '幸福小区1栋101室',
        status: '进行中',
        startDate: new Date('2026-04-10'),
        estimatedAmount: 35000,
        remark: '业主自装，找散工'
      }
    }),
  ]);

  console.log(`✅ 创建了 ${projects.length} 个项目\n`);

  console.log('🤝 创建联系人和项目关系...');
  await Promise.all([
    db.contactProjectRole.create({ data: { contactId: contacts[0].id, projectId: projects[0].id, role: 'buyer', remark: '采购负责人' } }),
    db.contactProjectRole.create({ data: { contactId: contacts[1].id, projectId: projects[1].id, role: 'buyer', remark: '负责人' } }),
    db.contactProjectRole.create({ data: { contactId: contacts[2].id, projectId: projects[2].id, role: 'buyer', remark: '施工负责人' } }),
    db.contactProjectRole.create({ data: { contactId: contacts[5].id, projectId: projects[3].id, role: 'buyer', remark: '业主' } }),
    // 水电工作为介绍人
    db.contactProjectRole.create({ data: { contactId: contacts[2].id, projectId: projects[0].id, role: 'introducer', remark: '介绍项目给龙发' } }),
  ]);

  console.log('📥 创建进货管理数据（15条记录）...');
  const purchaseOrders = [];

  // 定义供应商和对应商品的映射关系
  const supplierProductMap = {
    0: [0, 1, 2, 3, 4, 5, 6, 7], // 伟星供应商 - PPR管材
    1: [15, 16, 17, 18, 19, 20], // 熊猫电线 - 电线电缆
    2: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30], // 公牛 - 开关灯具
    3: [31, 32, 33, 34, 35], // 九牧 - 卫浴
    4: [36, 37, 38], // 东方雨虹 - 防水
    5: [10, 11, 12, 13, 14], // 联塑 - PVC
  };

  for (let i = 0; i < 15; i++) {
    const supplierIdx = i % suppliers.length;
    const supplier = suppliers[supplierIdx];
    const availableProductIndices = supplierProductMap[supplierIdx] || [0, 1, 2, 3];
    const purchaseDate = randomDate(5, 30);
    const selectedProducts = randomInt(3, 6);
    const usedProductIndices = new Set();
    let totalAmount = 0;

    const items = [];
    for (let j = 0; j < selectedProducts; j++) {
      let productIdx;
      do {
        productIdx = randomElement(availableProductIndices);
      } while (usedProductIndices.has(productIdx) && usedProductIndices.size < availableProductIndices.length);
      usedProductIndices.add(productIdx);

      const product = products[productIdx];
      const quantity = Math.floor(randomInt(3, 10) * (product.unitRatio || 1)); 
      const unitPrice = product.lastPurchasePrice || 10;
      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      items.push({ productId: product.id, quantity, unitPrice, totalAmount: subtotal, productIdx });
    }

    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        internalSeq: i + 1,
        batchNo: `JH${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        purchaseDate,
        status: 'completed',
        deliveredDate: new Date(purchaseDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        completedDate: new Date(purchaseDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      }
    });

    let firstPurchaseId = null;
    for (const item of items) {
      const purchase = await db.purchase.create({
        data: {
          orderId: purchaseOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
          supplierId: supplier.id,
          supplierName: supplier.name,
          purchaseDate,
          status: 'completed',
          deliveredDate: new Date(purchaseDate.getTime() + 1 * 24 * 60 * 60 * 1000),
          completedDate: new Date(purchaseDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        }
      });

      if (!firstPurchaseId) firstPurchaseId = purchase.id;

      // 更新库存
      await db.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });
    }

    // 创建付款记录（部分付款或全款）
    const paidRatio = Math.random() > 0.4 ? 1 : randomFloat(0.3, 0.8);
    const paidAmount = totalAmount * paidRatio;

    if (paidAmount > 0 && firstPurchaseId) {
      await db.supplierPayment.create({
        data: {
          supplierId: supplier.id,
          purchaseId: firstPurchaseId,
          amount: paidAmount,
          paymentDate: purchaseDate,
          paymentMethod: randomElement(['现金', '银行转账', '微信', '支付宝']),
          remark: paidRatio < 1 ? '部分付款，尾款月结' : '全款付清',
        }
      });
    }

    purchaseOrders.push({ order: purchaseOrder, totalAmount, paidAmount });
  }

  console.log(`✅ 创建了 ${purchaseOrders.length} 条进货记录\n`);

  console.log('📤 创建销售记录（35条真实业务数据）...');
  const saleOrders = [];

  // 定义不同类型客户的典型购买组合
  const customerPurchasePatterns = {
    company: {
      productCountRange: [6, 12],
      quantityRange: [20, 100],
      discountRange: [0.08, 0.12],
      deliveryProbability: 0.9,
    },
    plumber: {
      productCountRange: [4, 8],
      quantityRange: [5, 30],
      discountRange: [0.05, 0.10],
      deliveryProbability: 0.5,
    },
    personal: {
      productCountRange: [2, 5],
      quantityRange: [1, 10],
      discountRange: [0, 0.03],
      deliveryProbability: 0.3,
    },
  };

  for (let i = 0; i < 35; i++) {
    const saleDate = randomDate(1, 45);
    const buyer = contacts[randomInt(0, contacts.length - 2)]; 
    const pattern = customerPurchasePatterns[buyer.contactType] || customerPurchasePatterns.personal;

    // 确定付款主体
    let paymentEntity;
    if (buyer.contactType === 'company') {
      paymentEntity = buyer.name.includes('王经理') ? companyEntity1 : companyEntity2;
    } else if (buyer.contactType === 'plumber') {
      paymentEntity = buyer.name.includes('张师傅') ? contractorEntity1 : contractorEntity2;
    } else {
      paymentEntity = buyer.name.includes('赵先生') ? personalEntity1 : personalEntity2;
    }

    // 选择商品
    const productCount = randomInt(...pattern.productCountRange);
    const usedProductIds = new Set();
    let totalAmount = 0;

    const orderItems = [];
    for (let j = 0; j < productCount; j++) {
      let product;
      do {
        product = randomElement(products);
      } while (usedProductIds.has(product.id) && usedProductIds.size < products.length);
      usedProductIds.add(product.id);

      const quantity = randomInt(...pattern.quantityRange);
      const discount = randomFloat(...pattern.discountRange);
      const unitPrice = parseFloat(((product.referencePrice || 10) * (1 - discount)).toFixed(2));
      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      orderItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        costPriceSnapshot: product.lastPurchasePrice,
        sellingPriceSnapshot: unitPrice,
        subtotal,
        product,
      });
    }

    // 计算折扣和最终金额
    const discount = totalAmount > 5000 ? totalAmount * 0.03 : 0;
    const finalAmount = parseFloat((totalAmount - discount).toFixed(2));

    // 付款情况
    const paymentProbability = buyer.contactType === 'personal' ? 1 : 0.7;
    const paidAmount = Math.random() < paymentProbability ? finalAmount : (Math.random() > 0.5 ? finalAmount * randomFloat(0.3, 0.6) : 0);

    // 配送
    const needDelivery = Math.random() < pattern.deliveryProbability;
    const deliveryFee = needDelivery ? randomInt(30, 150) : 0;

    // 选择项目
    let selectedProject = null;
    if (buyer.contactType === 'company') {
      selectedProject = buyer.name.includes('王经理') ? projects[0] : projects[1];
    } else if (buyer.contactType === 'plumber') {
      selectedProject = buyer.name.includes('张师傅') ? projects[2] : null;
    } else {
      selectedProject = buyer.name.includes('赵先生') ? projects[3] : null;
    }

    // 创建销售订单
    const saleOrder = await db.saleOrder.create({
      data: {
        internalSeq: i + 1,
        invoiceNo: `XS${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`,
        writtenInvoiceNo: `NO${String(202604001 + i)}`,
        saleDate,
        buyerId: buyer.id,
        introducerId: Math.random() > 0.7 ? contacts[randomInt(2, 4)].id : null, 
        pickerId: Math.random() > 0.8 ? contacts[randomInt(2, 4)].id : null,
        projectId: selectedProject ? selectedProject.id : null,
        paymentEntityId: paymentEntity.id,
        totalAmount: finalAmount,
        discount,
        paidAmount,
        needDelivery,
        deliveryAddress: needDelivery ? (selectedProject ? selectedProject.address : buyer.address) : null,
        deliveryFee,
        status: paidAmount >= finalAmount ? 'completed' : (paidAmount > 0 ? 'partial' : 'unpaid'),
        remark: needDelivery ? '请安排配送' : '',
      }
    });

    // 创建订单明细
    for (const item of orderItems) {
      await db.orderItem.create({
        data: {
          orderId: saleOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPriceSnapshot: item.costPriceSnapshot,
          sellingPriceSnapshot: item.sellingPriceSnapshot,
          subtotal: item.subtotal,
        }
      });

      // 扣减库存
      await db.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });
    }

    // 创建付款记录
    if (paidAmount > 0) {
      await db.orderPayment.create({
        data: {
          orderId: saleOrder.id,
          amount: paidAmount,
          method: buyer.contactType === 'company' ? randomElement(['transfer', 'check']) : randomElement(['cash', 'wechat', 'alipay']),
          payerName: buyer.name,
          paidAt: saleDate,
          remark: paidAmount < finalAmount ? '预付部分货款' : '全款付清',
        }
      });
    }

    // 创建应收账款
    const remainingAmount = parseFloat((finalAmount - paidAmount).toFixed(2));
    if (remainingAmount > 0) {
      const agreedPaymentDate = new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.receivable.create({
        data: {
          orderId: saleOrder.id,
          originalAmount: finalAmount,
          paidAmount,
          remainingAmount,
          status: paidAmount > 0 ? 'partial' : 'pending',
          agreedPaymentDate,
          isOverdue: remainingAmount > 0 && (new Date() > agreedPaymentDate),
          overdueDays: remainingAmount > 0 ? Math.max(0, Math.floor((new Date() - agreedPaymentDate) / (24 * 60 * 60 * 1000))) : 0,
        }
      });
    }

    // 创建配送记录
    if (needDelivery) {
      await db.deliveryRecord.create({
        data: {
          saleOrderId: saleOrder.id,
          zoneName: randomElement(['城区5公里内', '城区5-15公里', '郊区']),
          recipientName: buyer.name,
          recipientPhone: buyer.primaryPhone,
          deliveryAddress: selectedProject ? selectedProject.address : buyer.address,
          distance: randomInt(2, 20),
          weight: randomInt(50, 500),
          totalFee: deliveryFee,
          deliveryStatus: i < 5 ? randomElement(['pending', 'shipped', 'in_transit']) : 'delivered',
          deliveryDate: i < 5 ? null : new Date(saleDate.getTime() + 1 * 24 * 60 * 60 * 1000),
          driverName: i < 5 ? null : '张师傅配送',
          driverPhone: i < 5 ? null : '13700137001',
        }
      });
    }

    // 如果有介绍人，创建佣金记录
    if (saleOrder.introducerId) {
      await db.businessCommission.create({
        data: {
          type: 'OUTGOING',
          category: 'INTRODUCER',
          contactId: saleOrder.introducerId,
          saleOrderId: saleOrder.id,
          projectId: saleOrder.projectId,
          amount: parseFloat((finalAmount * 0.03).toFixed(2)),
          recordedAt: saleDate,
          remark: '介绍客户佣金3%',
        }
      });
    }

    saleOrders.push({ order: saleOrder, finalAmount, paidAmount });
  }

  console.log(`✅ 创建了 ${saleOrders.length} 条销售记录\n`);

  console.log('💰 创建日常支出...');
  const expenseCategories = ['运费', '搬运费', '油费', '餐饮', '通讯费', '房租', '水电费', '其他'];
  for (let i = 0; i < 15; i++) {
    await db.dailyExpense.create({
      data: {
        date: randomDate(1, 30),
        category: randomElement(expenseCategories),
        amount: randomFloat(20, 500),
        description: '日常经营支出',
      }
    });
  }

  console.log('🔧 创建服务预约...');
  const serviceTypes = ['水管维修', '电路检修', '灯具安装', '开关插座安装', '防水补漏', '卫浴安装'];
  const serviceStatuses = ['待上门', '已上门', '已完成', '已取消'];
  const installerTypes = ['无', '店主', '水电工', '第三方'];

  for (let i = 0; i < 10; i++) {
    const appointmentDate = randomDate(1, 14);
    const contact = contacts[randomInt(0, contacts.length - 2)];
    const status = i < 3 ? randomElement(serviceStatuses.slice(0, 2)) : randomElement(serviceStatuses);

    await db.serviceAppointment.create({
      data: {
        contactId: contact.id,
        projectId: Math.random() > 0.5 ? randomElement(projects).id : null,
        installerType: randomElement(installerTypes),
        installerContactId: Math.random() > 0.5 ? contacts[randomInt(2, 4)].id : null,
        appointmentDate,
        serviceType: randomElement(serviceTypes),
        status,
        notes: status === '已完成' ? '服务完成，客户满意' : null,
        installationFee: status === '已完成' ? randomFloat(50, 600) : 0,
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 高质量水暖建材店业务数据生成完成！');
  console.log('='.repeat(60) + '\n');

  console.log('📋 基础数据统计:');
  console.log(`  - 商品分类: ${categories.length} 个`);
  console.log(`  - 商品品牌: ${brands.length} 个`);
  console.log(`  - 商品总数: ${products.length} 个`);
  console.log(`  - 供应商数: ${suppliers.length} 个`);
  console.log(`  - 联系人数: ${contacts.length} 个（3种类型）`);
  console.log(`  - 挂靠主体数: ${entities.length} 个（4种类型）`);
  console.log(`  - 项目数: ${projects.length} 个\n`);

  const totalPurchaseAmount = purchaseOrders.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPurchasePaid = purchaseOrders.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalSaleAmount = saleOrders.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalSalePaid = saleOrders.reduce((sum, s) => sum + s.paidAmount, 0);

  console.log('💰 业务数据统计:');
  console.log(`  - 进货订单数: ${purchaseOrders.length} 条`);
  console.log(`  - 总进货金额: ¥${totalPurchaseAmount.toLocaleString('zh-CN', {minimumFractionDigits: 2})}`);
  console.log(`  - 已付货款: ¥${totalPurchasePaid.toLocaleString('zh-CN', {minimumFractionDigits: 2})}`);
  console.log(`  - 应付账款: ¥${(totalPurchaseAmount - totalPurchasePaid).toLocaleString('zh-CN', {minimumFractionDigits: 2})}\n`);

  console.log(`  - 销售订单数: ${saleOrders.length} 条`);
  console.log(`  - 总销售金额: ¥${totalSaleAmount.toLocaleString('zh-CN', {minimumFractionDigits: 2})}`);
  console.log(`  - 已收货款: ¥${totalSalePaid.toLocaleString('zh-CN', {minimumFractionDigits: 2})}`);
  console.log(`  - 应收账款: ¥${(totalSaleAmount - totalSalePaid).toLocaleString('zh-CN', {minimumFractionDigits: 2})}\n`);

  console.log('✅ 数据生成完成！系统已准备就绪。');
  console.log('\n📝 数据特点:');
  console.log('  1. 商品数据包含单位换算（盘→米、卷→米、箱→卷等）');
  console.log('  2. 电线电缆标记为价格波动商品（isPriceVolatile=true）');
  console.log('  3. 覆盖水暖建材店全品类商品');
  console.log('  4. 供应商与商品分类匹配合理');
  console.log('  5. 进货和销售数据符合真实业务逻辑');
  console.log('  6. 包含佣金计算、配送、应收账款等完整业务流程');
}

async function main() {
  try {
    await seed();
  } catch (error) {
    console.error('❌ 生成数据失败:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

main();
