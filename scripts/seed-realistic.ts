const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  date.setHours(randomInt(8, 18), randomInt(0, 59), randomInt(0, 59));
  return date;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log('开始生成模拟数据...');

  // 清空现有数据
  console.log('清空现有数据...');
  await db.collectionRecord.deleteMany();
  await db.businessCommission.deleteMany();
  await db.dailyExpense.deleteMany();
  await db.saleReturn.deleteMany();
  await db.saleOrderPhoto.deleteMany();
  await db.deliveryRecord.deleteMany();
  await db.badDebtWriteOff.deleteMany();
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
  await db.receivableAuditLog.deleteMany();
  await db.creditRecord.deleteMany();
  await db.contactPhone.deleteMany();
  await db.contactProjectRole.deleteMany();
  await db.contactEntityRole.deleteMany();
  await db.bizProject.deleteMany();
  await db.entity.deleteMany();
  await db.contact.deleteMany();
  await db.supplier.deleteMany();
  await db.productSpec.deleteMany();
  await db.product.deleteMany();
  await db.brand.deleteMany();
  await db.category.deleteMany();

  // 创建商品分类
  console.log('创建商品分类...');
  const categories = await Promise.all([
    db.category.create({ data: { name: '管材管件', description: '各类水管、管件', sortOrder: 1 } }),
    db.category.create({ data: { name: '电线电缆', description: '电线、网线等', sortOrder: 2 } }),
    db.category.create({ data: { name: '开关插座', description: '墙壁开关、插座', sortOrder: 3 } }),
    db.category.create({ data: { name: '灯具照明', description: '各类灯具、灯泡', sortOrder: 4 } }),
    db.category.create({ data: { name: '卫浴五金', description: '水龙头、花洒等', sortOrder: 5 } }),
    db.category.create({ data: { name: '防水材料', description: '防水涂料、卷材', sortOrder: 6 } }),
    db.category.create({ data: { name: '胶水涂料', description: '粘合剂、油漆', sortOrder: 7 } }),
    db.category.create({ data: { name: '工具辅材', description: '工具、螺丝等', sortOrder: 8 } }),
  ]);

  // 创建品牌
  console.log('创建品牌...');
  const brands = await Promise.all([
    db.brand.create({ data: { name: '伟星' } }),
    db.brand.create({ data: { name: '日丰' } }),
    db.brand.create({ data: { name: '金德' } }),
    db.brand.create({ data: { name: '公元' } }),
    db.brand.create({ data: { name: '熊猫' } }),
    db.brand.create({ data: { name: '起帆' } }),
    db.brand.create({ data: { name: '公牛' } }),
    db.brand.create({ data: { name: '西门子' } }),
    db.brand.create({ data: { name: '雷士' } }),
    db.brand.create({ data: { name: '欧普' } }),
    db.brand.create({ data: { name: '九牧' } }),
    db.brand.create({ data: { name: '箭牌' } }),
    db.brand.create({ data: { name: '立邦' } }),
    db.brand.create({ data: { name: '多乐士' } }),
  ]);

  // 创建商品
  console.log('创建商品...');
  const products = [];

  // 管材管件
  const pipeProducts = [
    { name: 'PPR热水管 25mm', code: 'PPR-25-H', unit: '米', stock: 500, minStock: 100, lastPurchasePrice: 8.5, referencePrice: 12 },
    { name: 'PPR冷水管 25mm', code: 'PPR-25-C', unit: '米', stock: 600, minStock: 100, lastPurchasePrice: 6.5, referencePrice: 9 },
    { name: 'PPR内丝弯头 25mm', code: 'PPR-25-Y', unit: '个', stock: 200, minStock: 50, lastPurchasePrice: 5, referencePrice: 7 },
    { name: 'PPR直接头 25mm', code: 'PPR-25-Z', unit: '个', stock: 300, minStock: 80, lastPurchasePrice: 3, referencePrice: 4.5 },
    { name: 'PVC排水管 50mm', code: 'PVC-50-P', unit: '米', stock: 400, minStock: 80, lastPurchasePrice: 12, referencePrice: 18 },
    { name: 'PVC弯头 50mm', code: 'PVC-50-W', unit: '个', stock: 150, minStock: 40, lastPurchasePrice: 4, referencePrice: 6 },
    { name: '铜球阀 25mm', code: 'CU-25-QF', unit: '个', stock: 50, minStock: 20, lastPurchasePrice: 35, referencePrice: 55 },
  ];

  for (const p of pipeProducts) {
    const product = await db.product.create({
      data: {
        name: p.name,
        code: p.code,
        categoryId: categories[0].id,
        brand: randomElement(brands.slice(0, 4)).name,
        unit: p.unit,
        stock: p.stock,
        minStock: p.minStock,
        lastPurchasePrice: p.lastPurchasePrice,
        referencePrice: p.referencePrice,
      }
    });
    products.push(product);
  }

  // 电线电缆
  const wireProducts = [
    { name: 'BV2.5平方电线', code: 'BV-2.5', unit: '米', stock: 2000, minStock: 500, lastPurchasePrice: 2.2, referencePrice: 3.5 },
    { name: 'BV4平方电线', code: 'BV-4', unit: '米', stock: 1500, minStock: 400, lastPurchasePrice: 3.5, referencePrice: 5.5 },
    { name: 'BV6平方电线', code: 'BV-6', unit: '米', stock: 800, minStock: 200, lastPurchasePrice: 5.2, referencePrice: 8 },
    { name: '网线 超五类', code: 'NET-CAT5', unit: '米', stock: 1000, minStock: 200, lastPurchasePrice: 1.8, referencePrice: 3 },
    { name: '电视线 75-5', code: 'TV-75-5', unit: '米', stock: 500, minStock: 100, lastPurchasePrice: 2.5, referencePrice: 4 },
  ];

  for (const p of wireProducts) {
    const product = await db.product.create({
      data: {
        name: p.name,
        code: p.code,
        categoryId: categories[1].id,
        brand: randomElement([brands[4], brands[5]]).name,
        unit: p.unit,
        stock: p.stock,
        minStock: p.minStock,
        lastPurchasePrice: p.lastPurchasePrice,
        referencePrice: p.referencePrice,
      }
    });
    products.push(product);
  }

  // 开关插座
  const switchProducts = [
    { name: '公牛五孔插座', code: 'GNS-5K', unit: '个', stock: 300, minStock: 80, lastPurchasePrice: 15, referencePrice: 25 },
    { name: '西门子三孔插座', code: 'SIE-3K', unit: '个', stock: 150, minStock: 40, lastPurchasePrice: 28, referencePrice: 45 },
    { name: '公牛单开开关', code: 'GNK-1D', unit: '个', stock: 200, minStock: 50, lastPurchasePrice: 12, referencePrice: 20 },
    { name: '西门子双开开关', code: 'SIE-2K', unit: '个', stock: 120, minStock: 30, lastPurchasePrice: 22, referencePrice: 35 },
    { name: 'USB五孔插座', code: 'USB-5K', unit: '个', stock: 80, minStock: 20, lastPurchasePrice: 35, referencePrice: 55 },
  ];

  for (const p of switchProducts) {
    const product = await db.product.create({
      data: {
        name: p.name,
        code: p.code,
        categoryId: categories[2].id,
        brand: randomElement([brands[6], brands[7]]).name,
        unit: p.unit,
        stock: p.stock,
        minStock: p.minStock,
        lastPurchasePrice: p.lastPurchasePrice,
        referencePrice: p.referencePrice,
      }
    });
    products.push(product);
  }

  // 灯具照明
  const lightProducts = [
    { name: 'LED吸顶灯 36W', code: 'LED-36W', unit: '个', stock: 80, minStock: 20, lastPurchasePrice: 65, referencePrice: 120 },
    { name: '筒灯 5W', code: 'TD-5W', unit: '个', stock: 200, minStock: 50, lastPurchasePrice: 18, referencePrice: 32 },
    { name: '球泡灯 9W', code: 'QP-9W', unit: '个', stock: 300, minStock: 80, lastPurchasePrice: 12, referencePrice: 22 },
    { name: 'T5灯管 1.2米', code: 'T5-1.2M', unit: '根', stock: 100, minStock: 30, lastPurchasePrice: 22, referencePrice: 38 },
  ];

  for (const p of lightProducts) {
    const product = await db.product.create({
      data: {
        name: p.name,
        code: p.code,
        categoryId: categories[3].id,
        brand: randomElement([brands[8], brands[9]]).name,
        unit: p.unit,
        stock: p.stock,
        minStock: p.minStock,
        lastPurchasePrice: p.lastPurchasePrice,
        referencePrice: p.referencePrice,
      }
    });
    products.push(product);
  }

  // 卫浴五金
  const sanitaryProducts = [
    { name: '九牧单冷水龙头', code: 'JM-LT-LS', unit: '个', stock: 60, minStock: 15, lastPurchasePrice: 55, referencePrice: 95 },
    { name: '箭牌冷热水龙头', code: 'JL-LT-RS', unit: '个', stock: 40, minStock: 10, lastPurchasePrice: 120, referencePrice: 220 },
    { name: '九牧花洒套装', code: 'JM-HS', unit: '套', stock: 25, minStock: 8, lastPurchasePrice: 180, referencePrice: 320 },
    { name: '地漏 铜质', code: 'DL-T', unit: '个', stock: 80, minStock: 20, lastPurchasePrice: 35, referencePrice: 65 },
  ];

  for (const p of sanitaryProducts) {
    const product = await db.product.create({
      data: {
        name: p.name,
        code: p.code,
        categoryId: categories[4].id,
        brand: randomElement([brands[10], brands[11]]).name,
        unit: p.unit,
        stock: p.stock,
        minStock: p.minStock,
        lastPurchasePrice: p.lastPurchasePrice,
        referencePrice: p.referencePrice,
      }
    });
    products.push(product);
  }

  // 防水材料
  const waterproofProducts = [
    { name: '聚合物防水涂料', code: 'FS-TL-10', unit: '桶', stock: 40, minStock: 10, lastPurchasePrice: 85, referencePrice: 150 },
    { name: '自粘防水卷材', code: 'FS-JC-10', unit: '卷', stock: 30, minStock: 8, lastPurchasePrice: 120, referencePrice: 200 },
  ];

  for (const p of waterproofProducts) {
    const product = await db.product.create({
      data: {
        name: p.name,
        code: p.code,
        categoryId: categories[5].id,
        brand: randomElement([brands[12], brands[13]]).name,
        unit: p.unit,
        stock: p.stock,
        minStock: p.minStock,
        lastPurchasePrice: p.lastPurchasePrice,
        referencePrice: p.referencePrice,
      }
    });
    products.push(product);
  }

  // 添加一个库存不足的商品用于预警测试
  const lowStockProduct = await db.product.create({
    data: {
      name: 'PPR热水管 32mm（工程专用）',
      code: 'PPR-32-H',
      categoryId: categories[0].id,
      brand: '伟星',
      unit: '米',
      stock: 30,
      minStock: 100,
      lastPurchasePrice: 12,
      referencePrice: 18,
    }
  });
  products.push(lowStockProduct);

  console.log(`创建了 ${products.length} 个商品`);

  // 创建供应商
  console.log('创建供应商...');
  const suppliers = await Promise.all([
    db.supplier.create({
      data: {
        code: 'S001',
        name: '东方管业批发中心',
        phone: '13800138001',
        address: '建材市场A区15-18号',
        remark: '主营：PPR管、PVC管，批发价',
      }
    }),
    db.supplier.create({
      data: {
        code: 'S002',
        name: '光明电线电缆厂',
        phone: '13800138002',
        address: '工业区电线路88号',
        remark: '主营：BV电线、网线，厂家直供',
      }
    }),
    db.supplier.create({
      data: {
        code: 'S003',
        name: '公牛五金批发部',
        phone: '13800138003',
        address: '五金机电城2号楼',
        remark: '主营：开关插座、灯具，授权经销商',
      }
    }),
    db.supplier.create({
      data: {
        code: 'S004',
        name: '九牧卫浴总代理',
        phone: '13800138004',
        address: '卫浴广场A1-05',
        remark: '九牧、箭牌卫浴代理',
      }
    }),
  ]);

  console.log(`创建了 ${suppliers.length} 个供应商`);

  // 创建挂靠主体
  console.log('创建挂靠主体...');
  const entities = await Promise.all([
    db.entity.create({
      data: {
        name: '龙发装饰工程有限公司',
        entityType: 'company',
        creditLimit: 50000,
        creditUsed: 12000,
        creditScore: 85,
        creditLevel: 'excellent',
        riskLevel: 'low',
      }
    }),
    db.entity.create({
      data: {
        name: '张三水电工团队',
        entityType: 'contractor',
        creditLimit: 20000,
        creditUsed: 5000,
        creditScore: 72,
        creditLevel: 'good',
        riskLevel: 'low',
      }
    }),
    db.entity.create({
      data: {
        name: '李四（个人业主）',
        entityType: 'personal',
        creditLimit: 0,
        creditUsed: 0,
      }
    }),
    db.entity.create({
      data: {
        name: '幸福小区物业中心',
        entityType: 'government',
        creditLimit: 30000,
        creditUsed: 8000,
        creditScore: 90,
        creditLevel: 'excellent',
        riskLevel: 'low',
      }
    }),
    db.entity.create({
      data: {
        name: '现金账户',
        entityType: 'cash',
        creditLimit: 0,
        creditUsed: 0,
      }
    }),
  ]);

  console.log(`创建了 ${entities.length} 个挂靠主体`);

  // 创建联系人
  console.log('创建联系人...');
  const contacts = await Promise.all([
    // 装修公司联系人
    db.contact.create({
      data: {
        code: 'C001',
        name: '王经理',
        primaryPhone: '13900139001',
        address: '龙发装饰公司',
        contactType: 'company',
        contactCategoryId: (await db.contactCategory.create({ data: { name: '装饰公司' } })).id,
      }
    }),
    db.contact.create({
      data: {
        code: 'C002',
        name: '赵工长',
        primaryPhone: '13900139002',
        address: '各大工地',
        contactType: 'company',
      }
    }),
    // 水电工
    db.contact.create({
      data: {
        code: 'C003',
        name: '张三',
        primaryPhone: '13900139003',
        address: '水电新村15栋',
        contactType: 'plumber',
      }
    }),
    db.contact.create({
      data: {
        code: 'C004',
        name: '李四',
        primaryPhone: '13900139004',
        address: '建材市场附近',
        contactType: 'plumber',
      }
    }),
    // 个人业主
    db.contact.create({
      data: {
        code: 'C005',
        name: '陈先生',
        primaryPhone: '13900139005',
        address: '幸福小区1-101',
        contactType: 'personal',
      }
    }),
    db.contact.create({
      data: {
        code: 'C006',
        name: '陈太太',
        primaryPhone: '13900139006',
        address: '幸福小区1-101',
        contactType: 'personal',
      }
    }),
    db.contact.create({
      data: {
        code: 'C007',
        name: '刘先生',
        primaryPhone: '13900139007',
        address: '阳光花园2-205',
        contactType: 'personal',
      }
    }),
    // 散客
    db.contact.create({
      data: {
        code: 'C000',
        name: '散客',
        primaryPhone: '00000000000',
        contactType: 'customer',
        remark: '系统内置散客账户',
      }
    }),
  ]);

  console.log(`创建了 ${contacts.length} 个联系人`);

  // 创建项目
  console.log('创建项目...');
  const projects = await Promise.all([
    db.bizProject.create({
      data: {
        name: '幸福小区1-101装修',
        address: '幸福小区1栋101室',
        status: 'in_progress',
        estimatedBudget: 85000,
        startDate: new Date('2026-03-15'),
      }
    }),
    db.bizProject.create({
      data: {
        name: '阳光花园2-205装修',
        address: '阳光花园2栋205室',
        status: 'in_progress',
        estimatedBudget: 120000,
        startDate: new Date('2026-04-01'),
      }
    }),
    db.bizProject.create({
      data: {
        name: '龙发装饰-公园一号项目',
        address: '公园一号小区',
        status: 'in_progress',
        estimatedBudget: 350000,
        startDate: new Date('2026-02-20'),
      }
    }),
  ]);

  console.log(`创建了 ${projects.length} 个项目`);

  // 创建采购单和采购记录
  console.log('创建采购记录...');
  const purchases = [];
  for (let i = 0; i < 15; i++) {
    const purchaseDate = randomDate(30);
    const supplier = randomElement(suppliers);
    const items = [];
    let totalAmount = 0;

    // 随机选2-4个商品
    const selectedProducts = randomInt(2, 4);
    const usedProductIds = new Set();
    for (let j = 0; j < selectedProducts; j++) {
      let product;
      do {
        product = randomElement(products);
      } while (usedProductIds.has(product.id) || product.stock < 10);
      usedProductIds.add(product.id);

      const quantity = randomInt(20, 100);
      const unitPrice = product.lastPurchasePrice * randomFloat(1.1, 1.3);
      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      items.push({
        productId: product.id,
        quantity,
        unitPrice,
        totalAmount: subtotal,
        supplierId: supplier.id,
        supplierName: supplier.name,
        purchaseDate,
      });
    }

    const purchase = await db.purchase.create({
      data: {
        productId: items[0].productId,
        orderId: null,
        quantity: items.reduce((sum, i) => sum + i.quantity, 0),
        unitPrice: totalAmount / items.reduce((sum, i) => sum + i.quantity, 0),
        totalAmount,
        supplierId: supplier.id,
        supplierName: supplier.name,
        purchaseDate,
        status: 'completed',
        deliveredDate: new Date(purchaseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      }
    });
    purchases.push(purchase);

    // 更新商品库存
    for (const item of items) {
      await db.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });
    }
  }

  console.log(`创建了 ${purchases.length} 条采购记录`);

  // 创建销售订单
  console.log('创建销售订单...');
  const saleOrders = [];
  const cashEntity = entities.find(e => e.entityType === 'cash');
  const companyEntity = entities.find(e => e.entityType === 'company');
  const contractorEntity = entities.find(e => e.entityType === 'contractor');
  const personalEntity = entities.find(e => e.entityType === 'personal');

  for (let i = 0; i < 25; i++) {
    const saleDate = randomDate(30);
    const buyer = randomElement(contacts.filter(c => c.contactType !== 'customer'));
    let paymentEntity;

    if (buyer.contactType === 'company') {
      paymentEntity = companyEntity;
    } else if (buyer.contactType === 'plumber') {
      paymentEntity = contractorEntity;
    } else {
      paymentEntity = Math.random() > 0.5 ? cashEntity : personalEntity;
    }

    const items = [];
    let totalAmount = 0;
    const selectedProducts = randomInt(3, 8);
    const usedProductIds = new Set();

    for (let j = 0; j < selectedProducts; j++) {
      let product;
      do {
        product = randomElement(products);
      } while (usedProductIds.has(product.id));
      usedProductIds.add(product.id);

      const quantity = randomInt(5, 50);
      const unitPrice = product.referencePrice * randomFloat(0.7, 0.95);
      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      items.push({
        productId: product.id,
        quantity,
        unitPrice,
        costPriceSnapshot: product.lastPurchasePrice,
        sellingPriceSnapshot: unitPrice,
        subtotal,
      });
    }

    const discount = totalAmount > 5000 ? totalAmount * 0.05 : 0;
    const finalAmount = totalAmount - discount;
    const paidAmount = Math.random() > 0.3 ? finalAmount : finalAmount * randomFloat(0.3, 0.8);
    const needDelivery = Math.random() > 0.5;

    const saleOrder = await db.saleOrder.create({
      data: {
        invoiceNo: `S${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`,
        saleDate,
        buyerId: buyer.id,
        introducerId: Math.random() > 0.7 ? randomElement(contacts.filter(c => c.contactType === 'plumber')).id : null,
        pickerId: Math.random() > 0.8 ? randomElement(contacts.filter(c => c.contactType === 'plumber')).id : null,
        pickerName: needDelivery ? '张师傅' : null,
        pickerPhone: needDelivery ? '13812345678' : null,
        projectId: Math.random() > 0.6 ? randomElement(projects).id : null,
        paymentEntityId: paymentEntity.id,
        totalAmount: finalAmount,
        discount,
        paidAmount,
        needDelivery,
        deliveryAddress: needDelivery ? buyer.address : null,
        deliveryFee: needDelivery ? randomInt(0, 200) : 0,
        status: paidAmount >= finalAmount ? 'completed' : (paidAmount > 0 ? 'partial' : 'unpaid'),
      }
    });

    saleOrders.push(saleOrder);

    // 创建订单明细
    for (const item of items) {
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

    // 创建支付记录
    if (paidAmount > 0) {
      const paymentMethods = ['cash', 'wechat', 'alipay', 'transfer'];
      const method = randomElement(paymentMethods);

      await db.orderPayment.create({
        data: {
          orderId: saleOrder.id,
          amount: paidAmount,
          method,
          payerName: buyer.name,
          paidAt: saleDate,
        }
      });
    }

    // 创建应收账款（如果有欠款）
    const remainingAmount = finalAmount - paidAmount;
    if (remainingAmount > 0) {
      await db.receivable.create({
        data: {
          orderId: saleOrder.id,
          originalAmount: finalAmount,
          paidAmount,
          remainingAmount,
          status: remainingAmount <= 0 ? 'settled' : (paidAmount > 0 ? 'partial' : 'pending'),
          agreedPaymentDate: new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          isOverdue: remainingAmount > 0 && (new Date() - new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000)) > 0,
          overdueDays: remainingAmount > 0 ? Math.max(0, Math.floor((new Date() - new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000))) : 0,
        }
      });
    }

    // 创建配送记录
    if (needDelivery) {
      const deliveryStatuses = ['pending', 'shipped', 'in_transit', 'delivered'];
      const status = i < 5 ? randomElement(deliveryStatuses.slice(0, 3)) : 'delivered';

      await db.deliveryRecord.create({
        data: {
          saleOrderId: saleOrder.id,
          recipientName: buyer.name,
          recipientPhone: buyer.primaryPhone,
          deliveryAddress: buyer.address,
          totalFee: saleOrder.deliveryFee,
          deliveryStatus: status,
          zoneName: '默认区域',
        }
      });
    }
  }

  console.log(`创建了 ${saleOrders.length} 个销售订单`);

  // 创建服务预约
  console.log('创建服务预约...');
  const serviceTypes = ['水管维修', '电路检修', '灯具安装', '开关插座安装', '防水补漏'];
  const serviceStatuses = ['待上门', '已上门', '已完成', '已取消'];
  const installerTypes = ['水电工', '水电工', '水电工', '灯具安装', '防水师傅'];

  for (let i = 0; i < 10; i++) {
    const appointmentDate = randomDate(7);
    const contact = randomElement(contacts.filter(c => c.contactType !== 'customer'));
    const status = i < 3 ? randomElement(serviceStatuses.slice(0, 2)) : randomElement(serviceStatuses);

    await db.serviceAppointment.create({
      data: {
        contactId: contact.id,
        projectId: Math.random() > 0.5 ? randomElement(projects).id : null,
        installerType: randomElement(installerTypes),
        appointmentDate,
        serviceType: randomElement(serviceTypes),
        status,
        remark: status === '已完成' ? '服务完成，客户满意' : null,
      }
    });
  }

  console.log('创建了服务预约');

  // 创建日常支出
  console.log('创建日常支出...');
  const expenseTypes = ['运费', '搬运费', '油费', '餐饮', '通讯费', '其他'];

  for (let i = 0; i < 15; i++) {
    await db.dailyExpense.create({
      data: {
        date: randomDate(30),
        amount: randomFloat(10, 500),
        type: randomElement(expenseTypes),
        remark: randomElement(expenseTypes) === '运费' ? '商品配送运费' : null,
      }
    });
  }

  console.log('创建了日常支出');

  // 创建一些回款记录
  console.log('创建回款记录...');
  const receivables = await db.receivable.findMany({
    where: { status: { in: ['pending', 'partial'] } },
    take: 5
  });

  for (const receivable of receivables) {
    if (Math.random() > 0.5) {
      await db.collectionRecord.create({
        data: {
          entityId: cashEntity.id,
          receivableId: receivable.id,
          collectionDate: randomDate(15),
          collectionAmount: receivable.remainingAmount * randomFloat(0.3, 0.8),
          paymentMethod: randomElement(['cash', 'wechat', 'alipay', 'transfer']),
          remark: '部分还款',
        }
      });
    }
  }

  console.log('创建完成！');

  console.log('\n=== 模拟数据统计 ===');
  console.log(`商品总数: ${products.length}`);
  console.log(`供应商数: ${suppliers.length}`);
  console.log(`挂靠主体数: ${entities.length}`);
  console.log(`联系人数: ${contacts.length}`);
  console.log(`项目数: ${projects.length}`);
  console.log(`销售订单数: ${saleOrders.length}`);
  console.log(`采购记录数: ${purchases.length}`);
}

async function main() {
  try {
    await seed();
    console.log('\n模拟数据生成成功！');
  } catch (error) {
    console.error('生成模拟数据失败:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

main();
