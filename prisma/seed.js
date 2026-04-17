const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomPhone() {
  return `138${randomInt(10000000, 99999999)}`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('开始生成测试数据...');

  console.log('1. 创建商品分类...');
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: '水管管材', description: '各类水管、管件', sortOrder: 1 }
    }),
    prisma.category.create({
      data: { name: '阀门水表', description: '阀门、水表、龙头', sortOrder: 2 }
    }),
    prisma.category.create({
      data: { name: '厨房卫浴', description: '厨房、卫浴配件', sortOrder: 3 }
    }),
    prisma.category.create({
      data: { name: '电工电料', description: '电线、开关、插座', sortOrder: 4 }
    }),
    prisma.category.create({
      data: { name: '工具辅材', description: '工具、胶带、螺丝', sortOrder: 5 }
    }),
  ]);
  console.log(`   创建了 ${categories.length} 个分类`);

  console.log('2. 创建商品...');
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'PPR热水管 25mm',
        categoryId: categories[0].id,
        specification: '25mm*4.2mm*4m',
        unit: '根',
        costPrice: 18.5,
        salePrice: 25.0,
        stock: randomInt(100, 500),
        minStock: 20,
      }
    }),
    prisma.product.create({
      data: {
        name: 'PPR冷水管 20mm',
        categoryId: categories[0].id,
        specification: '20mm*2.8mm*4m',
        unit: '根',
        costPrice: 12.0,
        salePrice: 16.0,
        stock: randomInt(150, 600),
        minStock: 30,
      }
    }),
    prisma.product.create({
      data: {
        name: 'PVC排水管 50mm',
        categoryId: categories[0].id,
        specification: '50mm*2.0mm*4m',
        unit: '根',
        costPrice: 15.0,
        salePrice: 20.0,
        stock: randomInt(80, 300),
        minStock: 20,
      }
    }),
    prisma.product.create({
      data: {
        name: 'PE给水管 32mm',
        categoryId: categories[0].id,
        specification: '32mm*3.0mm*4m',
        unit: '根',
        costPrice: 28.0,
        salePrice: 38.0,
        stock: randomInt(50, 200),
        minStock: 15,
      }
    }),
    prisma.product.create({
      data: {
        name: '铜制球阀 20mm',
        categoryId: categories[1].id,
        specification: '铜制dn20',
        unit: '个',
        costPrice: 35.0,
        salePrice: 48.0,
        stock: randomInt(30, 100),
        minStock: 10,
      }
    }),
    prisma.product.create({
      data: {
        name: '不锈钢角阀',
        categoryId: categories[1].id,
        specification: 'dn15',
        unit: '个',
        costPrice: 22.0,
        salePrice: 32.0,
        stock: randomInt(50, 150),
        minStock: 15,
      }
    }),
    prisma.product.create({
      data: {
        name: '品牌水表 20mm',
        categoryId: categories[1].id,
        specification: 'LXS-20',
        unit: '个',
        costPrice: 85.0,
        salePrice: 120.0,
        stock: randomInt(10, 50),
        minStock: 5,
      }
    }),
    prisma.product.create({
      data: {
        name: '厨房龙头 单冷',
        categoryId: categories[2].id,
        specification: '不锈钢',
        unit: '个',
        costPrice: 65.0,
        salePrice: 98.0,
        stock: randomInt(20, 80),
        minStock: 10,
      }
    }),
    prisma.product.create({
      data: {
        name: '浴室花洒套装',
        categoryId: categories[2].id,
        specification: '三档切换',
        unit: '套',
        costPrice: 120.0,
        salePrice: 188.0,
        stock: randomInt(15, 60),
        minStock: 5,
      }
    }),
    prisma.product.create({
      data: {
        name: '马桶进水阀',
        categoryId: categories[2].id,
        specification: '通用型',
        unit: '个',
        costPrice: 18.0,
        salePrice: 28.0,
        stock: randomInt(40, 120),
        minStock: 20,
      }
    }),
    prisma.product.create({
      data: {
        name: '2.5平方电线',
        categoryId: categories[3].id,
        specification: '100米/卷',
        unit: '卷',
        costPrice: 145.0,
        salePrice: 195.0,
        stock: randomInt(30, 100),
        minStock: 10,
      }
    }),
    prisma.product.create({
      data: {
        name: '4平方电线',
        categoryId: categories[3].id,
        specification: '100米/卷',
        unit: '卷',
        costPrice: 220.0,
        salePrice: 298.0,
        stock: randomInt(20, 80),
        minStock: 8,
      }
    }),
    prisma.product.create({
      data: {
        name: '墙壁开关 单开',
        categoryId: categories[3].id,
        specification: '86型',
        unit: '个',
        costPrice: 8.0,
        salePrice: 15.0,
        stock: randomInt(100, 300),
        minStock: 30,
      }
    }),
    prisma.product.create({
      data: {
        name: 'PVC电工套管 20mm',
        categoryId: categories[3].id,
        specification: '直径20mm*3m',
        unit: '根',
        costPrice: 6.0,
        salePrice: 9.0,
        stock: randomInt(200, 500),
        minStock: 50,
      }
    }),
    prisma.product.create({
      data: {
        name: '生料带',
        categoryId: categories[4].id,
        specification: '20mm*50m',
        unit: '卷',
        costPrice: 2.5,
        salePrice: 5.0,
        stock: randomInt(100, 400),
        minStock: 50,
      }
    }),
    prisma.product.create({
      data: {
        name: '玻璃胶',
        categoryId: categories[4].id,
        specification: '300ml',
        unit: '支',
        costPrice: 12.0,
        salePrice: 22.0,
        stock: randomInt(50, 150),
        minStock: 20,
      }
    }),
    prisma.product.create({
      data: {
        name: '不锈钢螺丝 M6*50',
        categoryId: categories[4].id,
        specification: '50颗/盒',
        unit: '盒',
        costPrice: 8.0,
        salePrice: 15.0,
        stock: randomInt(30, 100),
        minStock: 20,
      }
    }),
    prisma.product.create({
      data: {
        name: '水暖工具包',
        categoryId: categories[4].id,
        specification: '15件套',
        unit: '套',
        costPrice: 85.0,
        salePrice: 138.0,
        stock: randomInt(5, 30),
        minStock: 5,
      }
    }),
  ]);
  console.log(`   创建了 ${products.length} 个商品`);

  console.log('3. 创建客户分类...');
  const customerCategories = await Promise.all([
    prisma.customerCategory.create({
      data: { name: '普通客户', description: '散客/业主', discount: 0 }
    }),
    prisma.customerCategory.create({
      data: { name: '水电工', description: '水电安装工人', discount: 5 }
    }),
    prisma.customerCategory.create({
      data: { name: '装修公司', description: '装修公司客户', discount: 10 }
    }),
    prisma.customerCategory.create({
      data: { name: '批发商', description: '批发客户', discount: 15 }
    }),
  ]);
  console.log(`   创建了 ${customerCategories.length} 个客户分类`);

  console.log('4. 创建客户...');
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: '张伟',
        phone: '13812345601',
        customerType: '业主',
        address: '阳光小区3栋201',
        customerCategoryId: customerCategories[0].id,
        autoTag: 'vip',
        valueScore: 85,
      }
    }),
    prisma.customer.create({
      data: {
        name: '李娜',
        phone: '13812345602',
        customerType: '业主',
        address: '幸福花园5栋1201',
        customerCategoryId: customerCategories[0].id,
        autoTag: 'normal',
        valueScore: 72,
      }
    }),
    prisma.customer.create({
      data: {
        name: '王强',
        phone: '13812345603',
        customerType: '水电工',
        address: '江城市水电大街12号',
        customerCategoryId: customerCategories[1].id,
        autoTag: 'prominent',
        valueScore: 95,
      }
    }),
    prisma.customer.create({
      data: {
        name: '赵师傅',
        phone: '13812345604',
        customerType: '水电工',
        address: '江城市解放路45号',
        customerCategoryId: customerCategories[1].id,
        autoTag: 'normal',
        valueScore: 80,
      }
    }),
    prisma.customer.create({
      data: {
        name: '江城装饰有限公司',
        phone: '13812345605',
        customerType: '装修公司',
        address: '江城市中心大道188号',
        customerCategoryId: customerCategories[2].id,
        autoTag: 'vip',
        valueScore: 98,
        remark: '长期合作客户，月结',
      }
    }),
    prisma.customer.create({
      data: {
        name: '美好家装修公司',
        phone: '13812345606',
        customerType: '装修公司',
        address: '江城市新区商业中心A座',
        customerCategoryId: customerCategories[2].id,
        autoTag: 'prominent',
        valueScore: 90,
      }
    }),
    prisma.customer.create({
      data: {
        name: '刘洋',
        phone: '13812345607',
        customerType: '业主',
        address: '御景湾别墅区12号',
        customerCategoryId: customerCategories[0].id,
        autoTag: 'vip',
        valueScore: 92,
      }
    }),
    prisma.customer.create({
      data: {
        name: '陈明',
        phone: '13812345608',
        customerType: '水电工',
        address: '江城市东环路23号',
        customerCategoryId: customerCategories[1].id,
        autoTag: 'normal',
        valueScore: 75,
      }
    }),
    prisma.customer.create({
      data: {
        name: '建材批发中心',
        phone: '13812345609',
        customerType: '批发商',
        address: '江城市建材批发市场A1-15',
        customerCategoryId: customerCategories[3].id,
        autoTag: 'vip',
        valueScore: 88,
      }
    }),
    prisma.customer.create({
      data: {
        name: '周杰',
        phone: '13812345610',
        customerType: '业主',
        address: '金辉小区8栋502',
        customerCategoryId: customerCategories[0].id,
        autoTag: 'normal',
        valueScore: 65,
      }
    }),
  ]);
  console.log(`   创建了 ${customers.length} 个客户`);

  console.log('5. 创建项目...');
  const now = new Date();
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: '阳光小区张伟新居装修',
        customerId: customers[0].id,
        address: '阳光小区3栋201',
        status: '进行中',
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 30),
        remark: '整体水电改造',
      }
    }),
    prisma.project.create({
      data: {
        name: '幸福花园李娜卫生间翻新',
        customerId: customers[1].id,
        address: '幸福花园5栋1201',
        status: '已完成',
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        remark: '卫生间水管全部更换',
      }
    }),
    prisma.project.create({
      data: {
        name: '御景湾刘洋别墅装修',
        customerId: customers[6].id,
        address: '御景湾别墅区12号',
        status: '进行中',
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 10),
        endDate: new Date(now.getFullYear(), now.getMonth() + 3, 1),
        remark: '豪华别墅整体水电工程',
      }
    }),
    prisma.project.create({
      data: {
        name: '江城装饰-龙湖天街项目',
        customerId: customers[4].id,
        address: '龙湖天街商业中心',
        status: '进行中',
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 2, 30),
        remark: '商业综合体水电安装',
      }
    }),
    prisma.project.create({
      data: {
        name: '美好家-翡翠湾项目',
        customerId: customers[5].id,
        address: '翡翠湾住宅小区',
        status: '已暂停',
        startDate: new Date(now.getFullYear(), now.getMonth() - 4, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() - 1, 31),
        remark: '住宅楼水电改造，暂停施工',
      }
    }),
  ]);
  console.log(`   创建了 ${projects.length} 个项目`);

  console.log('6. 创建进货记录...');
  const suppliers = ['江城建材批发市场A区', '华东建材有限公司', '顺发水管批发部', '五星管业直销店'];
  const purchases = [];
  for (let i = 0; i < 20; i++) {
    const product = randomChoice(products);
    const quantity = randomInt(10, 100);
    const purchase = await prisma.purchase.create({
      data: {
        productId: product.id,
        quantity: quantity,
        unitPrice: product.costPrice,
        totalAmount: parseFloat((quantity * product.costPrice).toFixed(2)),
        supplier: randomChoice(suppliers),
        purchaseDate: randomDate(new Date(now.getFullYear(), now.getMonth() - 6, 1), now),
        remark: `批次${i + 1}`,
      }
    });
    purchases.push(purchase);
  }
  console.log(`   创建了 ${purchases.length} 条进货记录`);

  console.log('7. 创建销售记录和明细...');
  const sales = [];
  for (let i = 0; i < 25; i++) {
    const customer = randomChoice(customers);
    const project = Math.random() > 0.5 ? randomChoice(projects) : null;
    const saleDate = randomDate(new Date(now.getFullYear(), now.getMonth() - 5, 1), now);

    const selectedProducts = [];
    let totalAmount = 0;
    const itemCount = randomInt(2, 6);
    for (let j = 0; j < itemCount; j++) {
      const product = randomChoice(products);
      const quantity = randomInt(1, 20);
      const unitPrice = product.salePrice;
      const subtotal = parseFloat((quantity * unitPrice).toFixed(2));
      selectedProducts.push({ product, quantity, unitPrice, subtotal });
      totalAmount += subtotal;
    }

    const discount = totalAmount > 1000 ? randomFloat(0, totalAmount * 0.1) : 0;
    const finalAmount = parseFloat((totalAmount - discount).toFixed(2));
    const paidAmount = Math.random() > 0.3 ? finalAmount : randomFloat(finalAmount * 0.3, finalAmount * 0.9);
    const status = paidAmount >= finalAmount ? 'completed' : (paidAmount > 0 ? 'partial' : 'pending');

    const sale = await prisma.sale.create({
      data: {
        invoiceNo: `XS${now.getFullYear()}${(i + 1).toString().padStart(4, '0')}`,
        customerId: customer.id,
        projectId: project?.id || null,
        totalAmount: finalAmount,
        discount: discount,
        paidAmount: parseFloat(paidAmount.toFixed(2)),
        saleDate: saleDate,
        status: status,
        remark: project ? `项目:${project.name}` : '',
      }
    });
    sales.push(sale);

    for (const item of selectedProducts) {
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPriceSnapshot: item.product.costPrice,
          sellingPriceSnapshot: item.unitPrice,
          subtotal: item.subtotal,
        }
      });
    }

    if (paidAmount > 0) {
      await prisma.payment.create({
        data: {
          saleId: sale.id,
          amount: parseFloat(paidAmount.toFixed(2)),
          method: randomChoice(['现金', '转账', '微信', '支付宝']),
          paidAt: new Date(saleDate.getTime() + randomInt(0, 7) * 24 * 60 * 60 * 1000),
          remark: '部分付款',
        }
      });
    }
  }
  console.log(`   创建了 ${sales.length} 条销售记录`);

  console.log('8. 创建应收账款记录...');
  const pendingSales = sales.filter(s => s.status !== 'completed');
  for (const sale of pendingSales) {
    const remainingAmount = parseFloat((sale.totalAmount - sale.paidAmount).toFixed(2));
    const daysAgo = randomInt(10, 120);
    const agreedPaymentDate = new Date(sale.saleDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.accountReceivable.create({
      data: {
        customerId: sale.customerId,
        projectId: sale.projectId || null,
        originalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        remainingAmount: remainingAmount,
        agreedPaymentDate: agreedPaymentDate,
        isOverdue: now > agreedPaymentDate,
        overdueDays: now > agreedPaymentDate ? Math.floor((now - agreedPaymentDate) / (24 * 60 * 60 * 1000)) : 0,
        status: remainingAmount > 0 ? (sale.paidAmount > 0 ? 'partial' : 'pending') : 'settled',
        remark: `关联销售单:${sale.invoiceNo || sale.id.substring(0, 8)}`,
      }
    });
  }
  console.log(`   创建了 ${pendingSales.length} 条应收账款记录`);

  console.log('9. 创建回扣记录...');
  const plumbers = customers.filter(c => c.customerType === '水电工');
  for (let i = 0; i < 8; i++) {
    const sale = randomChoice(sales);
    const plumber = randomChoice(plumbers);
    const rebateAmount = parseFloat((sale.totalAmount * randomFloat(0.02, 0.05)).toFixed(2));

    await prisma.rebate.create({
      data: {
        saleId: sale.id,
        plumberId: plumber.id,
        supplierName: '折柳建材店',
        rebateAmount: rebateAmount,
        rebateType: randomChoice(['cash', 'transfer', 'deduct']),
        rebateRate: parseFloat((rebateAmount / sale.totalAmount * 100).toFixed(2)),
        recordedAt: randomDate(new Date(now.getFullYear(), now.getMonth() - 3, 1), now),
        remark: '水电工介绍回扣',
      }
    });
  }
  console.log('   创建了 8 条回扣记录');

  console.log('10. 创建催账记录...');
  const customersWithReceivable = [...new Set(pendingSales.map(s => s.customerId))];
  for (const customerId of customersWithReceivable) {
    const recordCount = randomInt(1, 3);
    for (let i = 0; i < recordCount; i++) {
      await prisma.collectionRecord.create({
        data: {
          customerId: customerId,
          collectionDate: randomDate(new Date(now.getFullYear(), now.getMonth() - 2, 1), now),
          collectionTime: `${randomInt(9, 18)}:${randomInt(0, 59).toString().padStart(2, '0')}`,
          collectionMethod: randomChoice(['电话', '上门', '微信']),
          collectionResult: randomChoice(['答应付款', '需延期', '无应答', '已约定日期']),
          collectionAmount: Math.random() > 0.5 ? randomFloat(500, 5000) : null,
          followUpDate: new Date(now.getTime() + randomInt(3, 14) * 24 * 60 * 60 * 1000),
          followUpTime: `${randomInt(9, 18)}:00`,
          communication: '沟通顺利，客户表示理解',
          nextPlan: '等待客户回电确认付款时间',
          remark: '常规催收',
        }
      });
    }
  }
  console.log(`   创建了催账记录`);

  console.log('11. 创建配送费用设置...');
  const zones = [
    { zoneName: '市中心区', baseFee: 0, perKgFee: 0.5, perKmFee: 1.0, minWeight: 0, maxWeight: 100 },
    { zoneName: '城东区', baseFee: 20, perKgFee: 0.8, perKmFee: 1.5, minWeight: 0, maxWeight: 100 },
    { zoneName: '城西区', baseFee: 25, perKgFee: 0.8, perKmFee: 1.5, minWeight: 0, maxWeight: 100 },
    { zoneName: '城南开发区', baseFee: 40, perKgFee: 1.0, perKmFee: 2.0, minWeight: 0, maxWeight: 100 },
    { zoneName: '郊区', baseFee: 60, perKgFee: 1.2, perKmFee: 2.5, minWeight: 0, maxWeight: 100 },
  ];
  for (const zone of zones) {
    await prisma.deliveryFee.create({ data: zone });
  }
  console.log(`   创建了 ${zones.length} 个配送区域`);

  console.log('12. 创建配送记录...');
  for (let i = 0; i < 10; i++) {
    const sale = randomChoice(sales);
    const zone = randomChoice(zones);
    const weight = randomFloat(5, 50);
    const distance = randomFloat(1, 30);

    await prisma.deliveryRecord.create({
      data: {
        saleId: sale.id,
        projectId: sale.projectId || null,
        zoneName: zone.zoneName,
        recipientName: sale.customer?.name || '客户',
        recipientPhone: sale.customer?.phone || '13800000000',
        deliveryAddress: sale.customer?.address || '地址待定',
        distance: distance,
        weight: weight,
        baseFee: zone.baseFee,
        distanceFee: parseFloat((distance * zone.perKmFee).toFixed(2)),
        weightFee: parseFloat((weight * zone.perKgFee).toFixed(2)),
        totalFee: parseFloat((zone.baseFee + distance * zone.perKmFee + weight * zone.perKgFee).toFixed(2)),
        deliveryStatus: randomChoice(['pending', 'delivering', 'completed']),
        deliveryDate: randomDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), now),
        driverName: randomChoice(['张师傅', '李师傅', '王师傅']),
        driverPhone: '13900000001',
      }
    });
  }
  console.log('   创建了 10 条配送记录');

  console.log('13. 创建系统设置...');
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      shopName: '折柳建材店',
      ownerName: '折柳',
      phone: '13800138000',
      address: '江城市建材路88号',
    }
  });
  console.log('   系统设置已创建');

  console.log('\n✅ 测试数据生成完成！');
  console.log('   - 商品分类: 5 个');
  console.log('   - 商品: 18 个');
  console.log('   - 客户分类: 4 个');
  console.log('   - 客户: 10 个');
  console.log('   - 项目: 5 个');
  console.log('   - 进货记录: 20 条');
  console.log('   - 销售记录: 25 条');
  console.log('   - 配送区域: 5 个');
  console.log('   - 配送记录: 10 条');
  console.log('\n数据关联说明:');
  console.log('   - 销售记录关联客户、项目、商品明细、付款信息');
  console.log('   - 应收账款关联客户、项目、销售单');
  console.log('   - 回扣记录关联销售单和水电工');
  console.log('   - 配送记录关联销售单和项目');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });