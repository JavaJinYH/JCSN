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
  console.log('开始生成新架构测试数据...');

  console.log('1. 创建商品分类...');
  const categories = await Promise.all([
    prisma.category.create({ data: { name: '水管管材', description: '各类水管、管件', sortOrder: 1 } }),
    prisma.category.create({ data: { name: '阀门水表', description: '阀门、水表、龙头', sortOrder: 2 } }),
    prisma.category.create({ data: { name: '厨房卫浴', description: '厨房、卫浴配件', sortOrder: 3 } }),
    prisma.category.create({ data: { name: '电工电料', description: '电线、开关、插座', sortOrder: 4 } }),
    prisma.category.create({ data: { name: '工具辅材', description: '工具、胶带、螺丝', sortOrder: 5 } }),
  ]);
  console.log(`   创建了 ${categories.length} 个分类`);

  console.log('2. 创建商品...');
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'PPR热水管 25mm', categoryId: categories[0].id, specification: '25mm*4.2mm*4m', unit: '根', costPrice: 18.5, salePrice: 25.0, stock: randomInt(100, 500), minStock: 20 } }),
    prisma.product.create({ data: { name: 'PPR冷水管 20mm', categoryId: categories[0].id, specification: '20mm*2.8mm*4m', unit: '根', costPrice: 12.0, salePrice: 16.0, stock: randomInt(150, 600), minStock: 30 } }),
    prisma.product.create({ data: { name: 'PVC排水管 50mm', categoryId: categories[0].id, specification: '50mm*2.0mm*4m', unit: '根', costPrice: 15.0, salePrice: 20.0, stock: randomInt(80, 300), minStock: 20 } }),
    prisma.product.create({ data: { name: 'PE给水管 32mm', categoryId: categories[0].id, specification: '32mm*3.0mm*4m', unit: '根', costPrice: 28.0, salePrice: 38.0, stock: randomInt(50, 200), minStock: 15 } }),
    prisma.product.create({ data: { name: '铜制球阀 20mm', categoryId: categories[1].id, specification: '铜制dn20', unit: '个', costPrice: 35.0, salePrice: 48.0, stock: randomInt(30, 100), minStock: 10 } }),
    prisma.product.create({ data: { name: '不锈钢角阀', categoryId: categories[1].id, specification: 'dn15', unit: '个', costPrice: 22.0, salePrice: 32.0, stock: randomInt(50, 150), minStock: 15 } }),
    prisma.product.create({ data: { name: '品牌水表 20mm', categoryId: categories[1].id, specification: 'LXS-20', unit: '个', costPrice: 85.0, salePrice: 120.0, stock: randomInt(10, 50), minStock: 5 } }),
    prisma.product.create({ data: { name: '厨房龙头 单冷', categoryId: categories[2].id, specification: '不锈钢', unit: '个', costPrice: 65.0, salePrice: 98.0, stock: randomInt(20, 80), minStock: 10 } }),
    prisma.product.create({ data: { name: '浴室花洒套装', categoryId: categories[2].id, specification: '三档切换', unit: '套', costPrice: 120.0, salePrice: 188.0, stock: randomInt(15, 60), minStock: 5 } }),
    prisma.product.create({ data: { name: '马桶进水阀', categoryId: categories[2].id, specification: '通用型', unit: '个', costPrice: 18.0, salePrice: 28.0, stock: randomInt(40, 120), minStock: 20 } }),
    prisma.product.create({ data: { name: '2.5平方电线', categoryId: categories[3].id, specification: '100米/卷', unit: '卷', costPrice: 145.0, salePrice: 195.0, stock: randomInt(30, 100), minStock: 10 } }),
    prisma.product.create({ data: { name: '4平方电线', categoryId: categories[3].id, specification: '100米/卷', unit: '卷', costPrice: 220.0, salePrice: 298.0, stock: randomInt(20, 80), minStock: 8 } }),
    prisma.product.create({ data: { name: '墙壁开关 单开', categoryId: categories[3].id, specification: '86型', unit: '个', costPrice: 8.0, salePrice: 15.0, stock: randomInt(100, 300), minStock: 30 } }),
    prisma.product.create({ data: { name: 'PVC电工套管 20mm', categoryId: categories[3].id, specification: '直径20mm*3m', unit: '根', costPrice: 6.0, salePrice: 9.0, stock: randomInt(200, 500), minStock: 50 } }),
    prisma.product.create({ data: { name: '生料带', categoryId: categories[4].id, specification: '20mm*50m', unit: '卷', costPrice: 2.5, salePrice: 5.0, stock: randomInt(100, 400), minStock: 50 } }),
    prisma.product.create({ data: { name: '玻璃胶', categoryId: categories[4].id, specification: '300ml', unit: '支', costPrice: 12.0, salePrice: 22.0, stock: randomInt(50, 150), minStock: 20 } }),
    prisma.product.create({ data: { name: '不锈钢螺丝 M6*50', categoryId: categories[4].id, specification: '50颗/盒', unit: '盒', costPrice: 8.0, salePrice: 15.0, stock: randomInt(30, 100), minStock: 20 } }),
    prisma.product.create({ data: { name: '水暖工具包', categoryId: categories[4].id, specification: '15件套', unit: '套', costPrice: 85.0, salePrice: 138.0, stock: randomInt(5, 30), minStock: 5 } }),
  ]);
  console.log(`   创建了 ${products.length} 个商品`);

  console.log('3. 创建供应商...');
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { code: 'G001', name: '江城建材批发市场A区', phone: '13900001001', address: '江城市建材批发市场A区1-15号' } }),
    prisma.supplier.create({ data: { code: 'G002', name: '华东建材有限公司', phone: '13900001002', address: '江城市工业区建材路88号' } }),
    prisma.supplier.create({ data: { code: 'G003', name: '顺发水管批发部', phone: '13900001003', address: '江城市水管批发中心' } }),
    prisma.supplier.create({ data: { code: 'G004', name: '五星管业直销店', phone: '13900001004', address: '江城市管业直销中心' } }),
  ]);
  console.log(`   创建了 ${suppliers.length} 个供应商`);

  console.log('4. 创建联系人 (Contacts)...');
  const now = new Date();
  const contacts = await Promise.all([
    prisma.contact.create({ data: { code: 'C001', name: '张伟', primaryPhone: '13812345601', address: '阳光小区3栋201', contactType: 'customer', remark: 'VIP客户' } }),
    prisma.contact.create({ data: { code: 'C002', name: '李娜', primaryPhone: '13812345602', address: '幸福花园5栋1201', contactType: 'customer' } }),
    prisma.contact.create({ data: { code: 'C003', name: '王强', primaryPhone: '13812345603', address: '江城市水电大街12号', contactType: 'plumber', remark: '资深水电工' } }),
    prisma.contact.create({ data: { code: 'C004', name: '赵师傅', primaryPhone: '13812345604', address: '江城市解放路45号', contactType: 'plumber' } }),
    prisma.contact.create({ data: { code: 'C005', name: '刘洋', primaryPhone: '13812345607', address: '御景湾别墅区12号', contactType: 'customer', remark: '别墅业主' } }),
    prisma.contact.create({ data: { code: 'C006', name: '陈明', primaryPhone: '13812345608', address: '江城市东环路23号', contactType: 'plumber' } }),
    prisma.contact.create({ data: { code: 'C007', name: '周杰', primaryPhone: '13812345610', address: '金辉小区8栋502', contactType: 'customer' } }),
    prisma.contact.create({ data: { code: 'C008', name: '李经理', primaryPhone: '13812345615', address: '江城装饰有限公司', contactType: 'company' } }),
    prisma.contact.create({ data: { code: 'C009', name: '王总监', primaryPhone: '13812345616', address: '美好家装修公司', contactType: 'company' } }),
    prisma.contact.create({ data: { code: 'C010', name: '张老板', primaryPhone: '13812345620', address: '建材批发中心', contactType: 'company' } }),
  ]);
  console.log(`   创建了 ${contacts.length} 个联系人`);

  console.log('5. 创建公司/组织 (Entities)...');
  const entities = await Promise.all([
    prisma.entity.create({ data: { name: '江城装饰有限公司', entityType: 'company', contactId: contacts[7].id, address: '江城市中心大道188号', creditLimit: 50000 } }),
    prisma.entity.create({ data: { name: '美好家装修公司', entityType: 'company', contactId: contacts[8].id, address: '江城市新区商业中心A座', creditLimit: 30000 } }),
    prisma.entity.create({ data: { name: '建材批发中心', entityType: 'company', contactId: contacts[9].id, address: '江城市建材批发市场A1-15', creditLimit: 100000 } }),
    prisma.entity.create({ data: { name: '王二狗施工队', entityType: 'team', contactId: contacts[3].id, address: '江城市解放路45号', creditLimit: 10000 } }),
    prisma.entity.create({ data: { name: '张一个人', entityType: 'personal', contactId: contacts[0].id, address: '阳光小区3栋201', creditLimit: 5000 } }),
  ]);
  console.log(`   创建了 ${entities.length} 个Entity`);

  console.log('6. 创建项目 (BizProjects)...');
  const projects = await Promise.all([
    prisma.bizProject.create({ data: { name: '阳光小区张伟新居装修', entityId: entities[4].id, address: '阳光小区3栋201', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 2, 15), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 30), remark: '整体水电改造' } }),
    prisma.bizProject.create({ data: { name: '幸福花园李娜卫生间翻新', entityId: entities[4].id, address: '幸福花园5栋1201', status: '已完成', startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1), endDate: new Date(now.getFullYear(), now.getMonth() - 2, 15), remark: '卫生间水管全部更换' } }),
    prisma.bizProject.create({ data: { name: '御景湾刘洋别墅装修', entityId: entities[4].id, address: '御景湾别墅区12号', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 1, 10), endDate: new Date(now.getFullYear(), now.getMonth() + 3, 1), remark: '豪华别墅整体水电工程' } }),
    prisma.bizProject.create({ data: { name: '江城装饰-龙湖天街项目', entityId: entities[0].id, address: '龙湖天街商业中心', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1), endDate: new Date(now.getFullYear(), now.getMonth() + 2, 30), remark: '商业综合体水电安装' } }),
    prisma.bizProject.create({ data: { name: '美好家-翡翠湾项目', entityId: entities[1].id, address: '翡翠湾住宅小区', status: '已暂停', startDate: new Date(now.getFullYear(), now.getMonth() - 4, 1), endDate: new Date(now.getFullYear(), now.getMonth() - 1, 31), remark: '住宅楼水电改造，暂停施工' } }),
    prisma.bizProject.create({ data: { name: '王二狗施工队-某小区工地', entityId: entities[3].id, address: '江城市某小区', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 1, 5), endDate: new Date(now.getFullYear(), now.getMonth() + 2, 15), remark: '水电改造工程' } }),
  ]);
  console.log(`   创建了 ${projects.length} 个项目`);

  console.log('7. 创建项目联系人角色...');
  await Promise.all([
    prisma.contactProjectRole.create({ data: { contactId: contacts[0].id, projectId: projects[0].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[1].id, projectId: projects[1].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[4].id, projectId: projects[2].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[7].id, projectId: projects[3].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[8].id, projectId: projects[4].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[3].id, projectId: projects[5].id, role: 'projectOwner', remark: '项目负责人' } }),
  ]);
  console.log('   创建了项目联系人角色');

  console.log('8. 创建公司联系人角色...');
  await Promise.all([
    prisma.contactEntityRole.create({ data: { contactId: contacts[7].id, entityId: entities[0].id, role: 'boss', isDefault: true } }),
    prisma.contactEntityRole.create({ data: { contactId: contacts[8].id, entityId: entities[1].id, role: 'boss', isDefault: true } }),
    prisma.contactEntityRole.create({ data: { contactId: contacts[9].id, entityId: entities[2].id, role: 'boss', isDefault: true } }),
    prisma.contactEntityRole.create({ data: { contactId: contacts[3].id, entityId: entities[3].id, role: 'boss', isDefault: true } }),
  ]);
  console.log('   创建了公司联系人角色');

  console.log('9. 创建进货记录...');
  const purchases = [];
  for (let i = 0; i < 20; i++) {
    const product = randomChoice(products);
    const supplier = randomChoice(suppliers);
    const quantity = randomInt(10, 100);
    const purchase = await prisma.purchase.create({
      data: {
        productId: product.id,
        supplierId: supplier.id,
        supplierName: supplier.name,
        quantity: quantity,
        unitPrice: product.costPrice,
        totalAmount: parseFloat((quantity * product.costPrice).toFixed(2)),
        purchaseDate: randomDate(new Date(now.getFullYear(), now.getMonth() - 6, 1), now),
        remark: `批次${i + 1}`,
      }
    });
    purchases.push(purchase);
  }
  console.log(`   创建了 ${purchases.length} 条进货记录`);

  console.log('10. 创建销售订单 (SaleOrders)...');
  const saleOrders = [];
  for (let i = 0; i < 25; i++) {
    const buyer = randomChoice(contacts.filter(c => c.contactType === 'customer' || c.contactType === 'company'));
    const payer = Math.random() > 0.3 ? randomChoice(contacts) : null;
    const introducer = Math.random() > 0.6 ? randomChoice(contacts.filter(c => c.contactType === 'plumber')) : null;
    const project = Math.random() > 0.4 ? randomChoice(projects) : null;
    const paymentEntity = randomChoice(entities);
    const saleDate = randomDate(new Date(now.getFullYear(), now.getMonth() - 5, 1), now);

    const selectedProducts = [];
    let totalAmount = 0;
    const itemCount = randomInt(2, 6);
    for (let j = 0; j < itemCount; j++) {
      const product = randomChoice(products);
      const quantity = randomInt(1, 20);
      const unitPrice = product.salePrice;
      const subtotal = parseFloat((quantity * unitPrice).toFixed(2));
      selectedProducts.push({ product, quantity, unitPrice, subtotal, costPrice: product.costPrice });
      totalAmount += subtotal;
    }

    const discount = totalAmount > 1000 ? randomFloat(0, totalAmount * 0.1) : 0;
    const finalAmount = parseFloat((totalAmount - discount).toFixed(2));
    const paidAmount = Math.random() > 0.3 ? finalAmount : randomFloat(finalAmount * 0.3, finalAmount * 0.9);
    const status = paidAmount >= finalAmount ? 'completed' : (paidAmount > 0 ? 'partial' : 'pending');

    const saleOrder = await prisma.saleOrder.create({
      data: {
        buyerId: buyer.id,
        payerId: payer?.id || null,
        introducerId: introducer?.id || null,
        projectId: project?.id || null,
        paymentEntityId: paymentEntity.id,
        totalAmount: totalAmount,
        discount: discount,
        paidAmount: parseFloat(paidAmount.toFixed(2)),
        status: status,
        saleDate: saleDate,
        remark: project ? `项目:${project.name}` : '',
      }
    });
    saleOrders.push(saleOrder);

    for (const item of selectedProducts) {
      await prisma.orderItem.create({
        data: {
          orderId: saleOrder.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPriceSnapshot: item.costPrice,
          sellingPriceSnapshot: item.unitPrice,
          subtotal: item.subtotal,
        }
      });
    }

    if (paidAmount > 0) {
      await prisma.orderPayment.create({
        data: {
          orderId: saleOrder.id,
          amount: parseFloat(paidAmount.toFixed(2)),
          method: randomChoice(['现金', '转账', '微信', '支付宝']),
          payerName: payer?.name || buyer.name,
          paidAt: new Date(saleDate.getTime() + randomInt(0, 7) * 24 * 60 * 60 * 1000),
        }
      });
    }
  }
  console.log(`   创建了 ${saleOrders.length} 个销售订单`);

  console.log('11. 创建应收账款 (AccountReceivables)...');
  const pendingSales = saleOrders.filter(s => s.status !== 'completed');
  for (const sale of pendingSales) {
    const buyer = contacts.find(c => c.id === sale.buyerId);
    const saleData = await prisma.saleOrder.findUnique({ where: { id: sale.id }, include: { project: true } });
    const originalAmount = sale.totalAmount - sale.discount;
    const remainingAmount = parseFloat((originalAmount - sale.paidAmount).toFixed(2));
    const agreedPaymentDate = new Date(sale.saleDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.accountReceivable.create({
      data: {
        contactId: buyer.id,
        saleId: sale.id,
        projectId: saleData.projectId || null,
        entityId: saleData.project?.entityId || null,
        originalAmount: originalAmount,
        paidAmount: sale.paidAmount,
        remainingAmount: remainingAmount,
        agreedPaymentDate: agreedPaymentDate,
        isOverdue: now > agreedPaymentDate,
        overdueDays: now > agreedPaymentDate ? Math.floor((now - agreedPaymentDate) / (24 * 60 * 60 * 1000)) : 0,
        status: remainingAmount > 0 ? (sale.paidAmount > 0 ? 'partial' : 'pending') : 'settled',
      }
    });
  }
  console.log(`   创建了 ${pendingSales.length} 条应收账款记录`);

  console.log('12. 创建返点记录 (Rebates)...');
  const plumbers = contacts.filter(c => c.contactType === 'plumber');
  for (let i = 0; i < 8; i++) {
    const sale = randomChoice(saleOrders);
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
  console.log('   创建了 8 条返点记录');

  console.log('13. 创建配送费用设置...');
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

  console.log('14. 创建系统设置...');
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', shopName: '折柳建材店', ownerName: '折柳', phone: '13800138000', address: '江城市建材路88号' }
  });
  console.log('   系统设置已创建');

  console.log('\n✅ 新架构测试数据生成完成！');
  console.log('   - 商品分类: 5 个');
  console.log('   - 商品: 18 个');
  console.log('   - 供应商: 4 个');
  console.log('   - 联系人: 10 个');
  console.log('   - Entity(公司/组织): 5 个');
  console.log('   - BizProject(项目): 6 个');
  console.log('   - 进货记录: 20 条');
  console.log('   - 销售订单: 25 个');
  console.log('   - 配送区域: 5 个');
  console.log('\n数据关联说明:');
  console.log('   - 联系人(Contact)包含: 散客、水电工、公司联系人');
  console.log('   - Entity(公司/组织)可关联联系人作为负责人');
  console.log('   - BizProject(项目)归属于Entity');
  console.log('   - 销售订单关联: 购货人、付款人、介绍人(水电工)、项目、结账主体');
  console.log('   - 供应商独立模块，可关联联系人作为负责人');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });