require('../scripts/set-encoding');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('正在清空现有数据...');

  const tables = [
    'auditLog',
    'businessCommission',
    'dailyExpense',
    'serviceAppointment',
    'deliveryRecord',
    'badDebtWriteOff',
    'saleReturnItem',
    'saleReturn',
    'purchaseReturnItem',
    'purchaseReturn',
    'collectionRecord',
    'receivableAuditLog',
    'receivable',
    'orderPayment',
    'orderItem',
    'saleOrderPhoto',
    'saleOrder',
    'purchasePhoto',
    'purchase',
    'purchaseOrder',
    'customerFavoriteProduct',
    'customerPrice',
    'customerPhone',
    'contactPhone',
    'creditRecord',
    'contactProjectRole',
    'contactEntityRole',
    'bizProject',
    'entity',
    'contact',
    'supplier',
    'productSpec',
    'brand',
    'product',
    'category',
    'inventoryCheckItem',
    'inventoryCheck',
    'systemSetting',
    'saleSlipItem',
    'saleSlip',
    'paymentPlan',
    'deliveryFee',
    'customerCategory',
  ];

  for (const table of tables) {
    try {
      await prisma[table].deleteMany({});
    } catch (e) {
      // 忽略不存在的表
    }
  }

  console.log('✅ 数据已清空');
}

async function main() {
  console.log('========== 折柳建材 - 精选测试数据 ==========');
  await clearDatabase();

  const now = new Date();

  console.log('\n📦 1. 创建商品分类...');
  const categories = await Promise.all([
    prisma.category.create({ data: { name: '水管管材', description: 'PPR管、PVC管、PE管等', sortOrder: 1 } }),
    prisma.category.create({ data: { name: '阀门水表', description: '阀门、球阀、角阀、水表', sortOrder: 2 } }),
    prisma.category.create({ data: { name: '厨房卫浴', description: '龙头、花洒、马桶配件', sortOrder: 3 } }),
    prisma.category.create({ data: { name: '电工电料', description: '电线、电缆、开关、插座', sortOrder: 4 } }),
    prisma.category.create({ data: { name: '工具辅材', description: '工具、胶带、螺丝、支架', sortOrder: 5 } }),
  ]);
  console.log(`   ✅ ${categories.length} 个分类`);

  console.log('\n🏷️ 2. 创建品牌...');
  const brands = await Promise.all([
    prisma.brand.create({ data: { name: '联塑' } }),
    prisma.brand.create({ data: { name: '日丰' } }),
    prisma.brand.create({ data: { name: '公牛' } }),
    prisma.brand.create({ data: { name: '九牧' } }),
    prisma.brand.create({ data: { name: '伟星' } }),
  ]);
  console.log(`   ✅ ${brands.length} 个品牌`);

  console.log('\n📋 3. 创建商品（覆盖各种场景）...');

  const products = await Promise.all([
    // 场景1: 标准商品 - 有品牌、有规格、有库存
    prisma.product.create({
      data: {
        name: 'PPR热水管 25mm',
        categoryId: categories[0].id,
        brand: '日丰',
        specification: '25mm*4.2mm*4m',
        unit: '根',
        stock: 200,
        minStock: 30,
        lastPurchasePrice: 18.5,
        referencePrice: 28.0,
        isPriceVolatile: false,
      }
    }),

    // 场景2: 标准商品 - 有品牌、有规格
    prisma.product.create({
      data: {
        name: 'PPR冷水管 20mm',
        categoryId: categories[0].id,
        brand: '联塑',
        specification: '20mm*2.8mm*4m',
        unit: '根',
        stock: 150,
        minStock: 25,
        lastPurchasePrice: 15.0,
        referencePrice: 22.0,
        isPriceVolatile: false,
      }
    }),

    // 场景3: PVC排水管
    prisma.product.create({
      data: {
        name: 'PVC排水管 50mm',
        categoryId: categories[0].id,
        brand: '联塑',
        specification: '50mm*2.0mm*4m',
        unit: '根',
        stock: 100,
        minStock: 20,
        lastPurchasePrice: 22.0,
        referencePrice: 35.0,
        isPriceVolatile: false,
      }
    }),

    // 场景4: 辅材 - 无品牌、无规格、低价值
    prisma.product.create({
      data: {
        name: '生料带',
        categoryId: categories[4].id,
        specification: '20mm*50m',
        unit: '卷',
        stock: 500,
        minStock: 50,
        lastPurchasePrice: 3.5,
        referencePrice: 5.0,
        isPriceVolatile: false,
      }
    }),

    // 场景5: 辅材 - 玻璃胶
    prisma.product.create({
      data: {
        name: '玻璃胶',
        categoryId: categories[4].id,
        brand: '道康宁',
        specification: '300ml',
        unit: '支',
        stock: 80,
        minStock: 20,
        lastPurchasePrice: 25.0,
        referencePrice: 38.0,
        isPriceVolatile: false,
      }
    }),

    // 场景6: 阀门类 - 铜制球阀
    prisma.product.create({
      data: {
        name: '铜制球阀 20mm',
        categoryId: categories[1].id,
        brand: '九牧',
        specification: '铜制dn20',
        unit: '个',
        stock: 60,
        minStock: 10,
        lastPurchasePrice: 35.0,
        referencePrice: 55.0,
        isPriceVolatile: false,
      }
    }),

    // 场景7: 阀门类 - 不锈钢角阀
    prisma.product.create({
      data: {
        name: '不锈钢角阀',
        categoryId: categories[1].id,
        brand: '九牧',
        specification: 'dn15',
        unit: '个',
        stock: 100,
        minStock: 15,
        lastPurchasePrice: 28.0,
        referencePrice: 45.0,
        isPriceVolatile: false,
      }
    }),

    // 场景8: 卫浴 - 厨房龙头
    prisma.product.create({
      data: {
        name: '厨房龙头 单冷',
        categoryId: categories[2].id,
        brand: '九牧',
        specification: '不锈钢',
        unit: '个',
        stock: 30,
        minStock: 5,
        lastPurchasePrice: 120.0,
        referencePrice: 188.0,
        isPriceVolatile: false,
      }
    }),

    // 场景9: 卫浴 - 花洒套装
    prisma.product.create({
      data: {
        name: '浴室花洒套装',
        categoryId: categories[2].id,
        brand: '九牧',
        specification: '三档切换',
        unit: '套',
        stock: 20,
        minStock: 3,
        lastPurchasePrice: 180.0,
        referencePrice: 288.0,
        isPriceVolatile: false,
      }
    }),

    // 场景10: 电工 - 电线（按米销售）
    prisma.product.create({
      data: {
        name: '2.5平方电线',
        categoryId: categories[3].id,
        brand: '公牛',
        specification: '100米/卷',
        unit: '卷',
        stock: 50,
        minStock: 10,
        lastPurchasePrice: 185.0,
        referencePrice: 280.0,
        isPriceVolatile: true,
      }
    }),

    // 场景11: 电工 - 开关插座
    prisma.product.create({
      data: {
        name: '墙壁开关 单开',
        categoryId: categories[3].id,
        brand: '公牛',
        specification: '86型',
        unit: '个',
        stock: 200,
        minStock: 30,
        lastPurchasePrice: 8.5,
        referencePrice: 15.0,
        isPriceVolatile: false,
      }
    }),

    // 场景12: 电工 - PVC穿线管
    prisma.product.create({
      data: {
        name: 'PVC电工套管 20mm',
        categoryId: categories[3].id,
        specification: '直径20mm*3m',
        unit: '根',
        stock: 300,
        minStock: 50,
        lastPurchasePrice: 8.0,
        referencePrice: 12.0,
        isPriceVolatile: false,
      }
    }),

    // 场景13: 低库存预警商品
    prisma.product.create({
      data: {
        name: 'PE给水管 32mm',
        categoryId: categories[0].id,
        brand: '伟星',
        specification: '32mm*3.0mm*4m',
        unit: '根',
        stock: 8,
        minStock: 15,
        lastPurchasePrice: 45.0,
        referencePrice: 68.0,
        isPriceVolatile: false,
      }
    }),

    // 场景14: 无库存商品
    prisma.product.create({
      data: {
        name: '马桶进水阀',
        categoryId: categories[2].id,
        specification: '通用型',
        unit: '个',
        stock: 0,
        minStock: 10,
        lastPurchasePrice: 22.0,
        referencePrice: 35.0,
        isPriceVolatile: false,
      }
    }),

    // 场景15: 价格波动商品 - 铜
    prisma.product.create({
      data: {
        name: '铜直接头 25mm',
        categoryId: categories[0].id,
        brand: '日丰',
        specification: 'dn25',
        unit: '个',
        stock: 150,
        minStock: 20,
        lastPurchasePrice: 12.0,
        referencePrice: 18.0,
        isPriceVolatile: true,
      }
    }),

    // 场景16: 大件商品 - 太阳能支架
    prisma.product.create({
      data: {
        name: '太阳能支架套装',
        categoryId: categories[4].id,
        specification: '家用型',
        unit: '套',
        stock: 5,
        minStock: 2,
        lastPurchasePrice: 580.0,
        referencePrice: 880.0,
        isPriceVolatile: false,
      }
    }),
  ]);
  console.log(`   ✅ ${products.length} 个商品（覆盖各种属性场景）`);

  console.log('\n🏭 4. 创建供应商...');
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { code: 'G001', name: '江城建材批发市场', phone: '13800001001', address: '江城市建材批发市场A区1-15号' } }),
    prisma.supplier.create({ data: { code: 'G002', name: '华东建材有限公司', phone: '13800001002', address: '江城市工业区建材路88号' } }),
    prisma.supplier.create({ data: { code: 'G003', name: '顺发水管批发部', phone: '13800001003', address: '江城市水管批发中心' } }),
  ]);
  console.log(`   ✅ ${suppliers.length} 个供应商`);

  console.log('\n👥 5. 创建联系人...');
  const contacts = await Promise.all([
    prisma.contact.create({ data: { code: 'C001', name: '张伟', primaryPhone: '13812345601', address: '阳光小区3栋201', contactType: 'customer', remark: 'VIP客户' } }),
    prisma.contact.create({ data: { code: 'C002', name: '李娜', primaryPhone: '13812345602', address: '幸福花园5栋1201', contactType: 'customer' } }),
    prisma.contact.create({ data: { code: 'C003', name: '王强', primaryPhone: '13812345603', address: '江城市水电大街12号', contactType: 'plumber', remark: '水电工' } }),
    prisma.contact.create({ data: { code: 'C004', name: '赵师傅', primaryPhone: '13812345604', address: '江城市解放路45号', contactType: 'plumber' } }),
    prisma.contact.create({ data: { code: 'C005', name: '刘洋', primaryPhone: '13812345607', address: '御景湾别墅区12号', contactType: 'customer', remark: '别墅业主' } }),
    prisma.contact.create({ data: { code: 'C006', name: '李经理', primaryPhone: '13812345615', address: '江城装饰有限公司', contactType: 'company' } }),
    prisma.contact.create({ data: { code: 'C007', name: '散客', primaryPhone: '00000000000', address: '系统', contactType: 'customer', remark: '系统内置' } }),
  ]);
  console.log(`   ✅ ${contacts.length} 个联系人`);

  console.log('\n🏢 6. 创建实体...');
  const entities = await Promise.all([
    prisma.entity.create({ data: { name: '江城装饰有限公司', entityType: 'company', contactId: contacts[5].id, address: '江城市中心大道188号', creditLimit: 50000 } }),
    prisma.entity.create({ data: { name: '现金账户', entityType: 'cash', address: '系统内置', creditLimit: 0 } }),
  ]);
  console.log(`   ✅ ${entities.length} 个实体`);

  console.log('\n📅 7. 创建项目...');
  const projects = await Promise.all([
    prisma.bizProject.create({ data: { name: '阳光小区张伟新居装修', entityId: entities[0].id, address: '阳光小区3栋201', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 1, 15), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 30) } }),
    prisma.bizProject.create({ data: { name: '御景湾刘洋别墅装修', entityId: entities[0].id, address: '御景湾别墅区12号', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 1, 10), endDate: new Date(now.getFullYear(), now.getMonth() + 3, 1) } }),
    prisma.bizProject.create({ data: { name: '江城装饰-龙湖天街项目', entityId: entities[0].id, address: '龙湖天街商业中心', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: new Date(now.getFullYear(), now.getMonth() + 2, 30) } }),
  ]);
  console.log(`   ✅ ${projects.length} 个项目`);

  console.log('\n🛒 8. 创建销售订单...');
  // 订单1: 赊账客户
  const order1 = await prisma.saleOrder.create({
    data: {
      buyerId: contacts[0].id,
      projectId: projects[0].id,
      paymentEntityId: entities[0].id,
      totalAmount: 1250.0,
      discount: 50.0,
      paidAmount: 0,
      status: 'pending',
      saleDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    }
  });
  await prisma.orderItem.createMany({
    data: [
      { orderId: order1.id, productId: products[0].id, quantity: 20, unitPrice: 28.0, costPriceSnapshot: 18.5, sellingPriceSnapshot: 28.0, subtotal: 560.0 },
      { orderId: order1.id, productId: products[1].id, quantity: 15, unitPrice: 22.0, costPriceSnapshot: 15.0, sellingPriceSnapshot: 22.0, subtotal: 330.0 },
      { orderId: order1.id, productId: products[3].id, quantity: 20, unitPrice: 5.0, costPriceSnapshot: 3.5, sellingPriceSnapshot: 5.0, subtotal: 100.0 },
    ]
  });

  // 订单2: 已付款
  const order2 = await prisma.saleOrder.create({
    data: {
      buyerId: contacts[1].id,
      paymentEntityId: entities[0].id,
      totalAmount: 890.0,
      discount: 0,
      paidAmount: 890.0,
      status: 'completed',
      saleDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      needDelivery: true,
      deliveryAddress: '幸福花园5栋1201',
      deliveryFee: 30.0,
    }
  });
  await prisma.orderItem.createMany({
    data: [
      { orderId: order2.id, productId: products[5].id, quantity: 10, unitPrice: 55.0, costPriceSnapshot: 35.0, sellingPriceSnapshot: 55.0, subtotal: 550.0 },
      { orderId: order2.id, productId: products[6].id, quantity: 8, unitPrice: 42.5, costPriceSnapshot: 28.0, sellingPriceSnapshot: 42.5, subtotal: 340.0 },
    ]
  });

  // 订单3: 部分付款
  const order3 = await prisma.saleOrder.create({
    data: {
      buyerId: contacts[4].id,
      projectId: projects[1].id,
      paymentEntityId: entities[0].id,
      totalAmount: 5680.0,
      discount: 180.0,
      paidAmount: 3000.0,
      status: 'partial',
      saleDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    }
  });
  await prisma.orderItem.createMany({
    data: [
      { orderId: order3.id, productId: products[7].id, quantity: 3, unitPrice: 188.0, costPriceSnapshot: 120.0, sellingPriceSnapshot: 188.0, subtotal: 564.0 },
      { orderId: order3.id, productId: products[8].id, quantity: 2, unitPrice: 288.0, costPriceSnapshot: 180.0, sellingPriceSnapshot: 288.0, subtotal: 576.0 },
      { orderId: order3.id, productId: products[0].id, quantity: 50, unitPrice: 28.0, costPriceSnapshot: 18.5, sellingPriceSnapshot: 28.0, subtotal: 1400.0 },
    ]
  });

  // 订单4: 公司客户
  const order4 = await prisma.saleOrder.create({
    data: {
      buyerId: contacts[5].id,
      projectId: projects[2].id,
      paymentEntityId: entities[0].id,
      totalAmount: 3500.0,
      discount: 100.0,
      paidAmount: 0,
      status: 'pending',
      saleDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    }
  });
  await prisma.orderItem.createMany({
    data: [
      { orderId: order4.id, productId: products[9].id, quantity: 10, unitPrice: 280.0, costPriceSnapshot: 185.0, sellingPriceSnapshot: 280.0, subtotal: 2800.0 },
      { orderId: order4.id, productId: products[10].id, quantity: 50, unitPrice: 14.0, costPriceSnapshot: 8.5, sellingPriceSnapshot: 14.0, subtotal: 700.0 },
    ]
  });
  console.log(`   ✅ 4 个销售订单`);

  console.log('\n📝 9. 创建服务预约（今日）...');
  const appointment1 = await prisma.serviceAppointment.create({
    data: {
      contactId: contacts[0].id,
      appointmentDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0),
      serviceType: '水暖安装',
      installerType: '店主',
      status: '待上门',
      installationFee: 100.0,
      notes: '厨房龙头安装',
    }
  });

  await prisma.serviceAppointmentItem.create({
    data: {
      appointmentId: appointment1.id,
      productId: products[7].id,
      quantity: 1,
      remark: '厨房龙头',
    }
  });

  const appointment2 = await prisma.serviceAppointment.create({
    data: {
      contactId: contacts[1].id,
      appointmentDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30),
      serviceType: '水暖安装',
      installerType: '水电工',
      installerContactId: contacts[2].id,
      status: '待上门',
      installationFee: 150.0,
      notes: '花洒套装安装',
    }
  });

  await prisma.serviceAppointmentItem.create({
    data: {
      appointmentId: appointment2.id,
      productId: products[8].id,
      quantity: 1,
      remark: '花洒套装',
    }
  });
  console.log(`   ✅ 2 个服务预约（今日）`);

  console.log('\n💰 10. 创建日常支出...');
  const dailyExpenses = await Promise.all([
    prisma.dailyExpense.create({ data: { category: '房租', amount: 3000.0, description: '4月份房租', date: new Date(now.getFullYear(), now.getMonth(), 1) } }),
    prisma.dailyExpense.create({ data: { category: '水电', amount: 450.0, description: '3月份水电费', date: new Date(now.getFullYear(), now.getMonth(), 5) } }),
    prisma.dailyExpense.create({ data: { category: '运输', amount: 300.0, description: '货车加油', date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } }),
    prisma.dailyExpense.create({ data: { category: '其他', amount: 150.0, description: '办公用品采购', date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } }),
  ]);
  console.log(`   ✅ ${dailyExpenses.length} 条日常支出`);

  console.log('\n💵 11. 创建业务返点...');
  await prisma.businessCommission.create({
    data: {
      type: 'INCOMING',
      category: 'SUPPLIER',
      supplierId: suppliers[0].id,
      amount: 500.0,
      recordedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      remark: '联塑管道季度返点',
    }
  });

  await prisma.businessCommission.create({
    data: {
      type: 'OUTGOING',
      category: 'INTRODUCER',
      contactId: contacts[2].id,
      saleOrderId: order1.id,
      amount: 120.0,
      recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      remark: '王强介绍张伟订单返点',
    }
  });
  console.log(`   ✅ 2 条业务返点（供应商返点 + 介绍人返点）`);

  console.log('\n🏠 12. 创建配送费用设置...');
  const zones = [
    { zoneName: '市中心区', baseFee: 0, perKgFee: 0.5, perKmFee: 0, minWeight: 0, maxWeight: 100 },
    { zoneName: '城东区', baseFee: 20, perKgFee: 0.8, perKmFee: 1.0, minWeight: 0, maxWeight: 100 },
    { zoneName: '城西区', baseFee: 25, perKgFee: 0.8, perKmFee: 1.0, minWeight: 0, maxWeight: 100 },
    { zoneName: '郊区', baseFee: 50, perKgFee: 1.2, perKmFee: 1.5, minWeight: 0, maxWeight: 100 },
  ];
  for (const zone of zones) {
    await prisma.deliveryFee.create({ data: zone });
  }
  console.log(`   ✅ ${zones.length} 个配送区域`);

  console.log('\n⚙️ 13. 创建系统设置...');
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', shopName: '折柳建材店', ownerName: '店主', phone: '13800138000', address: '江城市建材路88号' }
  });
  console.log(`   ✅ 系统设置`);

  console.log('\n========== ✅ 测试数据生成完成 ==========');
  console.log('\n📊 数据统计:');
  console.log('   - 商品分类: 5 个');
  console.log('   - 商品: 16 个（覆盖各种场景）');
  console.log('   - 品牌: 5 个');
  console.log('   - 供应商: 3 个');
  console.log('   - 联系人: 7 个');
  console.log('   - 实体: 2 个');
  console.log('   - 项目: 3 个');
  console.log('   - 销售订单: 4 个');
  console.log('   - 服务预约: 2 个（今日）');
  console.log('   - 日常支出: 4 条');
  console.log('   - 业务返点: 2 条');
  console.log('   - 配送区域: 4 个');

  console.log('\n🧪 测试场景说明:');
  console.log('   1. 首页提醒: 2个配送中订单 + 2个今日预约');
  console.log('   2. 商品场景: 标准商品、辅材、阀门、卫浴、电工、');
  console.log('                低库存(8个)、无库存(0个)、价格波动商品');
  console.log('   3. 业务返点: 供应商返点(收入) + 介绍人返点(支出)');
  console.log('   4. 日常支出: 房租、水电、运输、其他');
  console.log('\n运行: npm run db:seed 重新生成数据');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
