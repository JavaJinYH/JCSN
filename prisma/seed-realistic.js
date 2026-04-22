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
  await db.collectionRecord.deleteMany();
  await db.saleOrder.deleteMany();
  await db.entity.deleteMany();
  await db.contact.deleteMany();
  await db.supplier.deleteMany();
  await db.productSpec.deleteMany();
  await db.product.deleteMany();
  await db.brand.deleteMany();
  await db.category.deleteMany();
  await db.contactCategory.deleteMany();

  console.log('创建商品分类...');
  const categories = await Promise.all([
    db.category.create({ data: { name: '管材管件', description: '各类水管、管件', sortOrder: 1 } }),
    db.category.create({ data: { name: '电线电缆', description: '电线、网线等', sortOrder: 2 } }),
    db.category.create({ data: { name: '开关插座', description: '墙壁开关、插座', sortOrder: 3 } }),
    db.category.create({ data: { name: '灯具照明', description: '各类灯具、灯泡', sortOrder: 4 } }),
    db.category.create({ data: { name: '卫浴五金', description: '水龙头、花洒等', sortOrder: 5 } }),
    db.category.create({ data: { name: '防水材料', description: '防水涂料、卷材', sortOrder: 6 } }),
  ]);

  console.log('创建品牌...');
  const brands = await Promise.all([
    db.brand.create({ data: { name: '伟星' } }),
    db.brand.create({ data: { name: '日丰' } }),
    db.brand.create({ data: { name: '金德' } }),
    db.brand.create({ data: { name: '熊猫' } }),
    db.brand.create({ data: { name: '起帆' } }),
    db.brand.create({ data: { name: '公牛' } }),
    db.brand.create({ data: { name: '西门子' } }),
    db.brand.create({ data: { name: '雷士' } }),
    db.brand.create({ data: { name: '九牧' } }),
    db.brand.create({ data: { name: '箭牌' } }),
    db.brand.create({ data: { name: '立邦' } }),
  ]);

  console.log('创建商品...');
  const products = [];

  const productData = [
    { name: 'PPR热水管 25mm', code: 'PPR-25-H', unit: '米', stock: 500, minStock: 100, purchasePrice: 8.5, salePrice: 12, catIdx: 0, brandIdx: 0 },
    { name: 'PPR冷水管 25mm', code: 'PPR-25-C', unit: '米', stock: 600, minStock: 100, purchasePrice: 6.5, salePrice: 9, catIdx: 0, brandIdx: 0 },
    { name: 'PPR内丝弯头 25mm', code: 'PPR-25-Y', unit: '个', stock: 200, minStock: 50, purchasePrice: 5, salePrice: 7, catIdx: 0, brandIdx: 1 },
    { name: 'PPR直接头 25mm', code: 'PPR-25-Z', unit: '个', stock: 300, minStock: 80, purchasePrice: 3, salePrice: 4.5, catIdx: 0, brandIdx: 1 },
    { name: 'PVC排水管 50mm', code: 'PVC-50-P', unit: '米', stock: 400, minStock: 80, purchasePrice: 12, salePrice: 18, catIdx: 0, brandIdx: 2 },
    { name: 'PVC弯头 50mm', code: 'PVC-50-W', unit: '个', stock: 150, minStock: 40, purchasePrice: 4, salePrice: 6, catIdx: 0, brandIdx: 2 },
    { name: 'BV2.5平方电线', code: 'BV-2.5', unit: '米', stock: 2000, minStock: 500, purchasePrice: 2.2, salePrice: 3.5, catIdx: 1, brandIdx: 3 },
    { name: 'BV4平方电线', code: 'BV-4', unit: '米', stock: 1500, minStock: 400, purchasePrice: 3.5, salePrice: 5.5, catIdx: 1, brandIdx: 3 },
    { name: 'BV6平方电线', code: 'BV-6', unit: '米', stock: 800, minStock: 200, purchasePrice: 5.2, salePrice: 8, catIdx: 1, brandIdx: 4 },
    { name: '网线 超五类', code: 'NET-CAT5', unit: '米', stock: 1000, minStock: 200, purchasePrice: 1.8, salePrice: 3, catIdx: 1, brandIdx: 4 },
    { name: '公牛五孔插座', code: 'GNS-5K', unit: '个', stock: 300, minStock: 80, purchasePrice: 15, salePrice: 25, catIdx: 2, brandIdx: 5 },
    { name: '西门子三孔插座', code: 'SIE-3K', unit: '个', stock: 150, minStock: 40, purchasePrice: 28, salePrice: 45, catIdx: 2, brandIdx: 6 },
    { name: '公牛单开开关', code: 'GNK-1D', unit: '个', stock: 200, minStock: 50, purchasePrice: 12, salePrice: 20, catIdx: 2, brandIdx: 5 },
    { name: 'LED吸顶灯 36W', code: 'LED-36W', unit: '个', stock: 80, minStock: 20, purchasePrice: 65, salePrice: 120, catIdx: 3, brandIdx: 7 },
    { name: '筒灯 5W', code: 'TD-5W', unit: '个', stock: 200, minStock: 50, purchasePrice: 18, salePrice: 32, catIdx: 3, brandIdx: 7 },
    { name: '球泡灯 9W', code: 'QP-9W', unit: '个', stock: 300, minStock: 80, purchasePrice: 12, salePrice: 22, catIdx: 3, brandIdx: 7 },
    { name: '九牧单冷水龙头', code: 'JM-LT-LS', unit: '个', stock: 60, minStock: 15, purchasePrice: 55, salePrice: 95, catIdx: 4, brandIdx: 8 },
    { name: '箭牌冷热水龙头', code: 'JL-LT-RS', unit: '个', stock: 40, minStock: 10, purchasePrice: 120, salePrice: 220, catIdx: 4, brandIdx: 9 },
    { name: '九牧花洒套装', code: 'JM-HS', unit: '套', stock: 25, minStock: 8, purchasePrice: 180, salePrice: 320, catIdx: 4, brandIdx: 8 },
    { name: '聚合物防水涂料', code: 'FS-TL-10', unit: '桶', stock: 40, minStock: 10, purchasePrice: 85, salePrice: 150, catIdx: 5, brandIdx: 10 },
    { name: 'PPR热水管 32mm（工程专用）', code: 'PPR-32-H', unit: '米', stock: 30, minStock: 100, purchasePrice: 12, salePrice: 18, catIdx: 0, brandIdx: 0 },
  ];

  for (const p of productData) {
    const product = await db.product.create({
      data: {
        name: p.name,
        code: p.code,
        categoryId: categories[p.catIdx].id,
        brand: brands[p.brandIdx].name,
        unit: p.unit,
        stock: p.stock,
        minStock: p.minStock,
        lastPurchasePrice: p.purchasePrice,
        referencePrice: p.salePrice,
      }
    });
    products.push(product);
  }

  console.log(`创建了 ${products.length} 个商品`);

  console.log('创建供应商...');
  const suppliers = await Promise.all([
    db.supplier.create({
      data: {
        code: 'S001',
        name: '东方管业批发中心',
        phone: '13800138001',
        address: '建材市场A区15-18号',
        remark: '主营：PPR管、PVC管',
      }
    }),
    db.supplier.create({
      data: {
        code: 'S002',
        name: '光明电线电缆厂',
        phone: '13800138002',
        address: '工业区电线路88号',
        remark: '主营：BV电线、网线',
      }
    }),
    db.supplier.create({
      data: {
        code: 'S003',
        name: '公牛五金批发部',
        phone: '13800138003',
        address: '五金机电城2号楼',
        remark: '开关插座、灯具代理',
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

  console.log('创建挂靠主体...');
  const cashEntity = await db.entity.create({
    data: {
      name: '现金账户',
      entityType: 'cash',
    }
  });
  const companyEntity = await db.entity.create({
    data: {
      name: '龙发装饰工程有限公司',
      entityType: 'company',
      creditLimit: 50000,
      creditUsed: 0,
      creditScore: 85,
      creditLevel: 'excellent',
      riskLevel: 'low',
    }
  });
  const contractorEntity = await db.entity.create({
    data: {
      name: '张三水电工团队',
      entityType: 'contractor',
      creditLimit: 20000,
      creditUsed: 0,
      creditScore: 72,
      creditLevel: 'good',
      riskLevel: 'low',
    }
  });
  const personalEntity = await db.entity.create({
    data: {
      name: '个人业主',
      entityType: 'personal',
    }
  });
  const entities = [cashEntity, companyEntity, contractorEntity, personalEntity];

  console.log(`创建了 ${entities.length} 个挂靠主体`);

  console.log('创建联系人...');
  const companyCat = await db.contactCategory.create({ data: { name: '装饰公司' } });
  const contacts = await Promise.all([
    db.contact.create({
      data: { code: 'C001', name: '王经理', primaryPhone: '13900139001', address: '龙发装饰公司', contactType: 'company', contactCategoryId: companyCat.id }
    }),
    db.contact.create({
      data: { code: 'C002', name: '赵工长', primaryPhone: '13900139002', address: '各大工地', contactType: 'company' }
    }),
    db.contact.create({
      data: { code: 'C003', name: '张三', primaryPhone: '13900139003', address: '水电新村15栋', contactType: 'plumber' }
    }),
    db.contact.create({
      data: { code: 'C004', name: '李四', primaryPhone: '13900139004', address: '建材市场附近', contactType: 'plumber' }
    }),
    db.contact.create({
      data: { code: 'C005', name: '陈先生', primaryPhone: '13900139005', address: '幸福小区1-101', contactType: 'personal' }
    }),
    db.contact.create({
      data: { code: 'C006', name: '陈太太', primaryPhone: '13900139006', address: '幸福小区1-101', contactType: 'personal' }
    }),
    db.contact.create({
      data: { code: 'C007', name: '刘先生', primaryPhone: '13900139007', address: '阳光花园2-205', contactType: 'personal' }
    }),
    db.contact.create({
      data: { code: 'C000', name: '散客', primaryPhone: '00000000000', contactType: 'customer', remark: '系统内置散客账户' }
    }),
  ]);

  console.log(`创建了 ${contacts.length} 个联系人`);

  console.log('创建项目...');
  const projects = await Promise.all([
    db.bizProject.create({
      data: {
        name: '幸福小区1-101装修',
        entityId: companyEntity.id,
        address: '幸福小区1栋101室',
        status: 'in_progress',
        estimatedAmount: 85000,
        startDate: new Date('2026-03-15'),
      }
    }),
    db.bizProject.create({
      data: {
        name: '阳光花园2-205装修',
        entityId: companyEntity.id,
        address: '阳光花园2栋205室',
        status: 'in_progress',
        estimatedAmount: 120000,
        startDate: new Date('2026-04-01'),
      }
    }),
  ]);

  console.log(`创建了 ${projects.length} 个项目`);

  console.log('=== 创建进货订单（核心业务数据）===');
  const purchaseOrders = [];
  for (let i = 0; i < 10; i++) {
    const supplier = suppliers[i % suppliers.length];
    const purchaseDate = randomDate(20);
    const selectedProducts = randomInt(3, 6);
    const usedProductIds = new Set();
    let totalAmount = 0;

    const items = [];
    for (let j = 0; j < selectedProducts; j++) {
      let product;
      do {
        product = randomElement(products);
      } while (usedProductIds.has(product.id));
      usedProductIds.add(product.id);

      const quantity = randomInt(50, 200);
      const unitPrice = product.lastPurchasePrice;
      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      items.push({ productId: product.id, quantity, unitPrice, totalAmount: subtotal });
    }

    const paidAmount = Math.random() > 0.3 ? totalAmount : totalAmount * randomFloat(0.3, 0.8);

    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        supplierName: supplier.name,
        purchaseDate,
        status: 'completed',
        deliveredDate: new Date(purchaseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
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
        }
      });

      if (!firstPurchaseId) firstPurchaseId = purchase.id;

      await db.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });
    }

    purchaseOrders.push({ order: purchaseOrder, totalAmount, paidAmount });

    if (paidAmount < totalAmount && firstPurchaseId) {
      await db.supplierPayment.create({
        data: {
          supplierId: supplier.id,
          purchaseId: firstPurchaseId,
          amount: paidAmount,
          paymentDate: purchaseDate,
          paymentMethod: randomElement(['现金', '转账', '微信', '支付宝']),
          remark: '部分付款',
        }
      });
    }
  }

  console.log(`创建了 ${purchaseOrders.length} 条进货订单`);

  console.log('=== 创建销售订单（核心业务数据）===');
  const saleOrders = [];
  for (let i = 0; i < 20; i++) {
    const saleDate = randomDate(15);
    const buyer = randomElement(contacts.filter(c => c.contactType !== 'customer'));
    let paymentEntity;

    if (buyer.contactType === 'company') {
      paymentEntity = companyEntity;
    } else if (buyer.contactType === 'plumber') {
      paymentEntity = contractorEntity;
    } else {
      paymentEntity = Math.random() > 0.5 ? cashEntity : personalEntity;
    }

    const selectedProducts = randomInt(3, 8);
    const usedProductIds = new Set();
    let totalAmount = 0;

    const orderItems = [];
    for (let j = 0; j < selectedProducts; j++) {
      let product;
      do {
        product = randomElement(products);
      } while (usedProductIds.has(product.id));
      usedProductIds.add(product.id);

      const quantity = randomInt(5, 30);
      const unitPrice = product.referencePrice * randomFloat(0.8, 0.95);
      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      orderItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        costPriceSnapshot: product.lastPurchasePrice,
        sellingPriceSnapshot: unitPrice,
        subtotal,
      });
    }

    const discount = totalAmount > 3000 ? totalAmount * 0.05 : 0;
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
        projectId: Math.random() > 0.5 ? randomElement(projects).id : null,
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

      await db.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });
    }

    if (paidAmount > 0) {
      await db.orderPayment.create({
        data: {
          orderId: saleOrder.id,
          amount: paidAmount,
          method: randomElement(['cash', 'wechat', 'alipay', 'transfer']),
          payerName: buyer.name,
          paidAt: saleDate,
        }
      });
    }

    saleOrders.push({ order: saleOrder, finalAmount, paidAmount });

    const remainingAmount = finalAmount - paidAmount;
    if (remainingAmount > 0) {
      await db.receivable.create({
        data: {
          orderId: saleOrder.id,
          originalAmount: finalAmount,
          paidAmount,
          remainingAmount,
          status: paidAmount > 0 ? 'partial' : 'pending',
          agreedPaymentDate: new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          isOverdue: remainingAmount > 0 && (new Date() > new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
          overdueDays: remainingAmount > 0 ? Math.max(0, Math.floor((new Date() - new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000))) : 0,
        }
      });
    }

    if (needDelivery) {
      await db.deliveryRecord.create({
        data: {
          saleOrderId: saleOrder.id,
          recipientName: buyer.name,
          recipientPhone: buyer.primaryPhone,
          deliveryAddress: buyer.address,
          totalFee: saleOrder.deliveryFee,
          deliveryStatus: i < 3 ? randomElement(['pending', 'shipped', 'in_transit']) : 'delivered',
          zoneName: '默认区域',
        }
      });
    }
  }

  console.log(`创建了 ${saleOrders.length} 条销售订单`);

  console.log('创建服务预约...');
  const serviceTypes = ['水管维修', '电路检修', '灯具安装', '开关插座安装', '防水补漏'];
  const serviceStatuses = ['待上门', '已上门', '已完成', '已取消'];
  const installerTypes = ['无', '店主', '水电工', '第三方'];

  for (let i = 0; i < 8; i++) {
    const appointmentDate = randomDate(7);
    const contact = randomElement(contacts.filter(c => c.contactType !== 'customer'));
    const status = i < 2 ? randomElement(serviceStatuses.slice(0, 2)) : randomElement(serviceStatuses);

    await db.serviceAppointment.create({
      data: {
        contactId: contact.id,
        projectId: Math.random() > 0.5 ? randomElement(projects).id : null,
        installerType: randomElement(installerTypes),
        appointmentDate,
        serviceType: randomElement(serviceTypes),
        status,
        notes: status === '已完成' ? '服务完成，客户满意' : null,
        installationFee: status === '已完成' ? randomFloat(50, 500) : 0,
      }
    });
  }

  console.log('创建日常支出...');
  const expenseCategories = ['运费', '搬运费', '油费', '餐饮', '通讯费', '其他'];
  for (let i = 0; i < 10; i++) {
    await db.dailyExpense.create({
      data: {
        date: randomDate(15),
        amount: randomFloat(10, 300),
        category: randomElement(expenseCategories),
        description: '日常经营支出',
      }
    });
  }

  console.log('\n=== 模拟数据统计 ===');
  console.log(`商品总数: ${products.length}`);
  console.log(`供应商数: ${suppliers.length}`);
  console.log(`挂靠主体数: ${entities.length}`);
  console.log(`联系人数: ${contacts.length}`);
  console.log(`项目数: ${projects.length}`);
  console.log(`进货订单数: ${purchaseOrders.length}`);
  console.log(`销售订单数: ${saleOrders.length}`);

  const totalPurchaseAmount = purchaseOrders.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPurchasePaid = purchaseOrders.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalSaleAmount = saleOrders.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalSalePaid = saleOrders.reduce((sum, s) => sum + s.paidAmount, 0);

  console.log(`\n进货统计:`);
  console.log(`  - 总进货金额: ¥${totalPurchaseAmount.toFixed(2)}`);
  console.log(`  - 已付款: ¥${totalPurchasePaid.toFixed(2)}`);
  console.log(`  - 应付账款: ¥${(totalPurchaseAmount - totalPurchasePaid).toFixed(2)}`);

  console.log(`\n销售统计:`);
  console.log(`  - 总销售金额: ¥${totalSaleAmount.toFixed(2)}`);
  console.log(`  - 已收款: ¥${totalSalePaid.toFixed(2)}`);
  console.log(`  - 应收账款: ¥${(totalSaleAmount - totalSalePaid).toFixed(2)}`);
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
