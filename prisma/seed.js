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

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function clearDatabase() {
  console.log('正在清空现有数据...');

  // 使用 try-catch 来安全删除数据，因为有些表可能不存在
  const tables = [
    'deliveryFee',
    'rebate', 
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
    'settlementAdjustment',
    'payment',
    'saleItem',
    'sale',
    'project',
    'customerCategory',
    'auditLog'
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

function calculateCustomerValueScore(orders, totalSpent, overdueDays = 0, totalOverdue = 0) {
  const targetSales = 100000;
  const annualSalesScore = Math.min(100, (totalSpent / targetSales) * 30);
  const profitMarginScore = Math.min(100, 75);
  const paymentSpeedScore = Math.max(0, Math.min(100, ((30 - Math.min(overdueDays, 30)) / 30) * 20));
  const overdueRate = totalSpent > 0 ? totalOverdue / totalSpent : 0;
  const overdueRateScore = Math.max(0, Math.min(100, (1 - overdueRate) * 15));
  const rebateRatioScore = Math.max(0, Math.min(100, 90));

  const totalScore = annualSalesScore + profitMarginScore + paymentSpeedScore + overdueRateScore + rebateRatioScore;
  const normalizedScore = Math.round(totalScore / 10);

  let autoTag = 'circle';
  if (normalizedScore >= 8.5) autoTag = 'star';
  else if (normalizedScore >= 6) autoTag = 'triangle';
  else if (normalizedScore < 4) autoTag = 'cross';

  let creditLevel = 'normal';
  if (normalizedScore >= 8.5) creditLevel = 'excellent';
  else if (normalizedScore >= 7) creditLevel = 'good';
  else if (normalizedScore <= 3) creditLevel = 'poor';
  else if (normalizedScore <= 1.5) creditLevel = 'blocked';

  let riskLevel = 'low';
  if (overdueDays > 60 || overdueRate > 0.5) riskLevel = 'critical';
  else if (overdueDays > 30 || overdueRate > 0.3) riskLevel = 'high';
  else if (overdueDays > 15 || overdueRate > 0.1) riskLevel = 'medium';

  let creditLimit = 5000;
  if (normalizedScore >= 8.5) creditLimit = 50000;
  else if (normalizedScore >= 7) creditLimit = 30000;
  else if (normalizedScore >= 5) creditLimit = 15000;

  return {
    valueScore: normalizedScore,
    autoTag,
    creditLevel,
    riskLevel,
    creditLimit,
  };
}

async function main() {
  console.log('========== 折柳建材测试数据生成 ==========');
  await clearDatabase();

  console.log('\n开始生成新测试数据...');
  const now = new Date();

  console.log('\n1. 创建商品分类...');
  const categories = await Promise.all([
    prisma.category.create({ data: { name: '水管管材', description: '各类水管、管件', sortOrder: 1 } }),
    prisma.category.create({ data: { name: '阀门水表', description: '阀门、水表、龙头', sortOrder: 2 } }),
    prisma.category.create({ data: { name: '厨房卫浴', description: '厨房、卫浴配件', sortOrder: 3 } }),
    prisma.category.create({ data: { name: '电工电料', description: '电线、开关、插座', sortOrder: 4 } }),
    prisma.category.create({ data: { name: '工具辅材', description: '工具、胶带、螺丝', sortOrder: 5 } }),
  ]);
  console.log(`   创建了 ${categories.length} 个分类`);

  console.log('\n2. 创建商品...');
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'PPR热水管 25mm', categoryId: categories[0].id, specification: '25mm*4.2mm*4m', unit: '根', stock: randomInt(100, 500), minStock: 20 } }),
    prisma.product.create({ data: { name: 'PPR冷水管 20mm', categoryId: categories[0].id, specification: '20mm*2.8mm*4m', unit: '根', stock: randomInt(150, 600), minStock: 30 } }),
    prisma.product.create({ data: { name: 'PVC排水管 50mm', categoryId: categories[0].id, specification: '50mm*2.0mm*4m', unit: '根', stock: randomInt(80, 300), minStock: 20 } }),
    prisma.product.create({ data: { name: 'PE给水管 32mm', categoryId: categories[0].id, specification: '32mm*3.0mm*4m', unit: '根', stock: randomInt(50, 200), minStock: 15 } }),
    prisma.product.create({ data: { name: '铜制球阀 20mm', categoryId: categories[1].id, specification: '铜制dn20', unit: '个', stock: randomInt(30, 100), minStock: 10 } }),
    prisma.product.create({ data: { name: '不锈钢角阀', categoryId: categories[1].id, specification: 'dn15', unit: '个', stock: randomInt(50, 150), minStock: 15 } }),
    prisma.product.create({ data: { name: '品牌水表 20mm', categoryId: categories[1].id, specification: 'LXS-20', unit: '个', stock: randomInt(10, 50), minStock: 5 } }),
    prisma.product.create({ data: { name: '厨房龙头 单冷', categoryId: categories[2].id, specification: '不锈钢', unit: '个', stock: randomInt(20, 80), minStock: 10 } }),
    prisma.product.create({ data: { name: '浴室花洒套装', categoryId: categories[2].id, specification: '三档切换', unit: '套', stock: randomInt(15, 60), minStock: 5 } }),
    prisma.product.create({ data: { name: '马桶进水阀', categoryId: categories[2].id, specification: '通用型', unit: '个', stock: randomInt(40, 120), minStock: 20 } }),
    prisma.product.create({ data: { name: '2.5平方电线', categoryId: categories[3].id, specification: '100米/卷', unit: '卷', stock: randomInt(30, 100), minStock: 10 } }),
    prisma.product.create({ data: { name: '4平方电线', categoryId: categories[3].id, specification: '100米/卷', unit: '卷', stock: randomInt(20, 80), minStock: 8 } }),
    prisma.product.create({ data: { name: '墙壁开关 单开', categoryId: categories[3].id, specification: '86型', unit: '个', stock: randomInt(100, 300), minStock: 30 } }),
    prisma.product.create({ data: { name: 'PVC电工套管 20mm', categoryId: categories[3].id, specification: '直径20mm*3m', unit: '根', stock: randomInt(200, 500), minStock: 50 } }),
    prisma.product.create({ data: { name: '生料带', categoryId: categories[4].id, specification: '20mm*50m', unit: '卷', stock: randomInt(100, 400), minStock: 50 } }),
    prisma.product.create({ data: { name: '玻璃胶', categoryId: categories[4].id, specification: '300ml', unit: '支', stock: randomInt(50, 150), minStock: 20 } }),
    prisma.product.create({ data: { name: '不锈钢螺丝 M6*50', categoryId: categories[4].id, specification: '50颗/盒', unit: '盒', stock: randomInt(30, 100), minStock: 20 } }),
    prisma.product.create({ data: { name: '水暖工具包', categoryId: categories[4].id, specification: '15件套', unit: '套', stock: randomInt(5, 30), minStock: 5 } }),
  ]);
  console.log(`   创建了 ${products.length} 个商品`);

  console.log('\n3. 创建供应商...');
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { code: 'G001', name: '江城建材批发市场A区', phone: '13900001001', address: '江城市建材批发市场A区1-15号' } }),
    prisma.supplier.create({ data: { code: 'G002', name: '华东建材有限公司', phone: '13900001002', address: '江城市工业区建材路88号' } }),
    prisma.supplier.create({ data: { code: 'G003', name: '顺发水管批发部', phone: '13900001003', address: '江城市水管批发中心' } }),
    prisma.supplier.create({ data: { code: 'G004', name: '五星管业直销店', phone: '13900001004', address: '江城市管业直销中心' } }),
  ]);
  console.log(`   创建了 ${suppliers.length} 个供应商`);

  console.log('\n4. 创建联系人...');
  const contactData = [
    { code: 'C001', name: '张伟', primaryPhone: '13812345601', address: '阳光小区3栋201', contactType: 'customer', remark: 'VIP客户，价值评分高' },
    { code: 'C002', name: '李娜', primaryPhone: '13812345602', address: '幸福花园5栋1201', contactType: 'customer', remark: '良好客户' },
    { code: 'C003', name: '王强', primaryPhone: '13812345603', address: '江城市水电大街12号', contactType: 'plumber', remark: '资深水电工' },
    { code: 'C004', name: '赵师傅', primaryPhone: '13812345604', address: '江城市解放路45号', contactType: 'plumber' },
    { code: 'C005', name: '刘洋', primaryPhone: '13812345607', address: '御景湾别墅区12号', contactType: 'customer', remark: '别墅业主' },
    { code: 'C006', name: '陈明', primaryPhone: '13812345608', address: '江城市东环路23号', contactType: 'plumber' },
    { code: 'C007', name: '周杰', primaryPhone: '13812345610', address: '金辉小区8栋502', contactType: 'customer' },
    { code: 'C008', name: '李经理', primaryPhone: '13812345615', address: '江城装饰有限公司', contactType: 'company' },
    { code: 'C009', name: '王总监', primaryPhone: '13812345616', address: '美好家装修公司', contactType: 'company' },
    { code: 'C010', name: '张老板', primaryPhone: '13812345620', address: '建材批发中心', contactType: 'company' },
    { code: 'C011', name: '黄大叔', primaryPhone: '13812345625', address: '旧城区改造项目区', contactType: 'customer', remark: '欠款多，风险高' },
    { code: 'C012', name: '吴老板', primaryPhone: '13812345630', address: '某装修公司', contactType: 'customer', remark: '协商过减免' },
    { code: 'C013', name: '散客', primaryPhone: '00000000000', address: '系统', contactType: 'customer', remark: '系统内置' },
  ];

  const contacts = [];
  for (const data of contactData) {
    const contact = await prisma.contact.create({ data });
    contacts.push(contact);
  }
  console.log(`   创建了 ${contacts.length} 个联系人`);

  console.log('\n5. 创建实体 (Entity)...');
  const entities = await Promise.all([
    prisma.entity.create({ data: { name: '江城装饰有限公司', entityType: 'company', contactId: contacts[7].id, address: '江城市中心大道188号', creditLimit: 50000 } }),
    prisma.entity.create({ data: { name: '美好家装修公司', entityType: 'company', contactId: contacts[8].id, address: '江城市新区商业中心A座', creditLimit: 30000 } }),
    prisma.entity.create({ data: { name: '建材批发中心', entityType: 'company', contactId: contacts[9].id, address: '江城市建材批发市场A1-15', creditLimit: 100000 } }),
    prisma.entity.create({ data: { name: '王二狗施工队', entityType: 'team', contactId: contacts[3].id, address: '江城市解放路45号', creditLimit: 10000 } }),
    prisma.entity.create({ data: { name: '张一个人', entityType: 'personal', contactId: contacts[0].id, address: '阳光小区3栋201', creditLimit: 5000 } }),
    prisma.entity.create({ data: { name: '现金账户', entityType: 'cash', address: '系统内置', creditLimit: 0 } }),
  ]);
  console.log(`   创建了 ${entities.length} 个实体`);

  console.log('\n6. 创建项目 (BizProject)...');
  const projects = await Promise.all([
    prisma.bizProject.create({ data: { name: '阳光小区张伟新居装修', entityId: entities[4].id, address: '阳光小区3栋201', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 2, 15), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 30), remark: '整体水电改造' } }),
    prisma.bizProject.create({ data: { name: '幸福花园李娜卫生间翻新', entityId: entities[4].id, address: '幸福花园5栋1201', status: '已完成', startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1), endDate: new Date(now.getFullYear(), now.getMonth() - 2, 15), remark: '卫生间水管全部更换' } }),
    prisma.bizProject.create({ data: { name: '御景湾刘洋别墅装修', entityId: entities[4].id, address: '御景湾别墅区12号', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 1, 10), endDate: new Date(now.getFullYear(), now.getMonth() + 3, 1), remark: '豪华别墅整体水电工程' } }),
    prisma.bizProject.create({ data: { name: '江城装饰-龙湖天街项目', entityId: entities[0].id, address: '龙湖天街商业中心', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1), endDate: new Date(now.getFullYear(), now.getMonth() + 2, 30), remark: '商业综合体水电安装' } }),
    prisma.bizProject.create({ data: { name: '美好家-翡翠湾项目', entityId: entities[1].id, address: '翡翠湾住宅小区', status: '已暂停', startDate: new Date(now.getFullYear(), now.getMonth() - 4, 1), endDate: new Date(now.getFullYear(), now.getMonth() - 1, 31), remark: '住宅楼水电改造，暂停施工' } }),
    prisma.bizProject.create({ data: { name: '王二狗施工队-某小区工地', entityId: entities[3].id, address: '江城市某小区', status: '进行中', startDate: new Date(now.getFullYear(), now.getMonth() - 1, 5), endDate: new Date(now.getFullYear(), now.getMonth() + 2, 15), remark: '水电改造工程' } }),
  ]);
  console.log(`   创建了 ${projects.length} 个项目`);

  console.log('\n7. 创建项目联系人角色...');
  await Promise.all([
    prisma.contactProjectRole.create({ data: { contactId: contacts[0].id, projectId: projects[0].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[1].id, projectId: projects[1].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[4].id, projectId: projects[2].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[7].id, projectId: projects[3].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[8].id, projectId: projects[4].id, role: 'projectOwner', remark: '项目负责人' } }),
    prisma.contactProjectRole.create({ data: { contactId: contacts[3].id, projectId: projects[5].id, role: 'projectOwner', remark: '项目负责人' } }),
  ]);
  console.log('   创建了项目联系人角色');

  console.log('\n8. 创建实体联系人角色...');
  await Promise.all([
    prisma.contactEntityRole.create({ data: { contactId: contacts[7].id, entityId: entities[0].id, role: 'boss', isDefault: true } }),
    prisma.contactEntityRole.create({ data: { contactId: contacts[8].id, entityId: entities[1].id, role: 'boss', isDefault: true } }),
    prisma.contactEntityRole.create({ data: { contactId: contacts[9].id, entityId: entities[2].id, role: 'boss', isDefault: true } }),
    prisma.contactEntityRole.create({ data: { contactId: contacts[3].id, entityId: entities[3].id, role: 'boss', isDefault: true } }),
  ]);
  console.log('   创建了实体联系人角色');

  console.log('\n9. 创建进货记录...');
  const purchases = [];
  for (let i = 0; i < 20; i++) {
    const product = randomChoice(products);
    const supplier = randomChoice(suppliers);
    const quantity = randomInt(10, 100);
    const costPrice = randomFloat(10, 200);
    const purchase = await prisma.purchase.create({
      data: {
        productId: product.id,
        supplierId: supplier.id,
        supplierName: supplier.name,
        quantity: quantity,
        unitPrice: costPrice,
        totalAmount: parseFloat((quantity * costPrice).toFixed(2)),
        purchaseDate: randomDate(new Date(now.getFullYear(), now.getMonth() - 6, 1), now),
        remark: `批次${i + 1}`,
        status: 'completed',
      }
    });
    purchases.push(purchase);
  }
  console.log(`   创建了 ${purchases.length} 条进货记录`);

  console.log('\n10. 创建销售订单 (SaleOrder)...');
  const saleOrders = [];
  const customerOrdersMap = new Map();

  for (let i = 0; i < 35; i++) {
    const buyer = randomChoice(contacts.filter(c => c.contactType === 'customer' || c.contactType === 'company'));
    const payer = Math.random() > 0.3 ? randomChoice(contacts) : null;
    const introducer = Math.random() > 0.6 ? randomChoice(contacts.filter(c => c.contactType === 'plumber')) : null;
    const project = Math.random() > 0.4 ? randomChoice(projects) : null;
    const paymentEntity = randomChoice(entities);
    const saleDate = randomDate(new Date(now.getFullYear(), now.getMonth() - 5, 1), now);

    const selectedProducts = [];
    let totalAmount = 0;
    const itemCount = randomInt(2, 8);
    for (let j = 0; j < itemCount; j++) {
      const product = randomChoice(products);
      const quantity = randomInt(1, 25);
      const costPrice = randomFloat(10, 150);
      const unitPrice = costPrice * randomFloat(1.3, 2.0);
      const subtotal = parseFloat((quantity * unitPrice).toFixed(2));
      selectedProducts.push({ product, quantity, unitPrice, costPrice, subtotal });
      totalAmount += subtotal;
    }

    const discount = totalAmount > 1000 ? randomFloat(0, totalAmount * 0.1) : 0;
    const finalAmount = parseFloat((totalAmount - discount).toFixed(2));
    
    let paidAmount;
    let status;
    
    if (buyer.code === 'C011') {
      paidAmount = randomFloat(finalAmount * 0.1, finalAmount * 0.3);
      status = 'pending';
    } else if (buyer.code === 'C012') {
      paidAmount = randomFloat(finalAmount * 0.4, finalAmount * 0.6);
      status = 'partial';
    } else if (buyer.code === 'C001' || buyer.code === 'C005') {
      paidAmount = finalAmount;
      status = 'completed';
    } else {
      paidAmount = Math.random() > 0.25 ? finalAmount : randomFloat(finalAmount * 0.3, finalAmount * 0.9);
      status = paidAmount >= finalAmount ? 'completed' : (paidAmount > 0 ? 'partial' : 'pending');
    }

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

    if (!customerOrdersMap.has(buyer.id)) {
      customerOrdersMap.set(buyer.id, []);
    }
    customerOrdersMap.get(buyer.id).push({
      order: saleOrder,
      finalAmount,
      paidAmount,
    });

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

  console.log('\n11. 创建应收账款 (Receivable)...');
  const pendingSales = saleOrders.filter(s => s.status !== 'completed');
  const receivables = [];
  
  for (const sale of pendingSales) {
    const buyer = contacts.find(c => c.id === sale.buyerId);
    const originalAmount = sale.totalAmount - sale.discount;
    const remainingAmount = parseFloat((originalAmount - sale.paidAmount).toFixed(2));
    const agreedPaymentDate = new Date(sale.saleDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    let isOverdue = now > agreedPaymentDate;
    let overdueDays = isOverdue ? Math.floor((now - agreedPaymentDate) / (24 * 60 * 60 * 1000)) : 0;
    
    if (buyer.code === 'C011') {
      const extraDays = randomInt(60, 120);
      overdueDays += extraDays;
      isOverdue = true;
    }

    let receivableStatus = 'pending';
    if (sale.paidAmount > 0 && sale.paidAmount < originalAmount) receivableStatus = 'partial';
    if (buyer.code === 'C012') receivableStatus = 'negotiated';

    const receivable = await prisma.receivable.create({
      data: {
        orderId: sale.id,
        originalAmount: originalAmount,
        paidAmount: sale.paidAmount,
        remainingAmount: remainingAmount,
        agreedPaymentDate: agreedPaymentDate,
        isOverdue: isOverdue,
        overdueDays: overdueDays,
        status: receivableStatus,
        settlementDate: receivableStatus === 'negotiated' ? new Date() : null,
      }
    });
    receivables.push(receivable);
  }
  console.log(`   创建了 ${pendingSales.length} 条应收账款`);

  console.log('\n12. 创建坏账核销 (BadDebtWriteOff)...');
  const badDebtOrders = pendingSales.slice(0, 3);
  let badDebtCount = 0;

  for (const sale of badDebtOrders) {
    const buyer = contacts.find(c => c.id === sale.buyerId);
    const originalAmount = sale.totalAmount - sale.discount;
    const writtenOffAmount = parseFloat((originalAmount - sale.paidAmount).toFixed(2));
    
    const isNegotiated = buyer.code === 'C012';

    await prisma.badDebtWriteOff.create({
      data: {
        contactId: buyer.id,
        saleOrderId: sale.id,
        originalAmount: originalAmount,
        writtenOffAmount: writtenOffAmount,
        finalAmount: sale.paidAmount,
        writeOffType: isNegotiated ? 'negotiated' : 'bad_debt',
        reason: isNegotiated ? '客户经营困难，协商减免部分货款' : '长期欠款，无法收回',
        operatorNote: isNegotiated ? '双方协商一致，减免¥' + writtenOffAmount : '确认坏账',
        approvedBy: '系统管理员',
        approvedAt: new Date(),
        status: 'approved',
        createdAt: randomDate(new Date(now.getFullYear(), now.getMonth() - 2, 1), now),
        createdBy: '系统',
      }
    });
    badDebtCount++;
  }
  console.log(`   创建了 ${badDebtCount} 条坏账核销`);

  console.log('\n13. 创建退货记录 (SaleReturn)...');
  const returnCount = randomInt(3, 6);
  const returns = [];
  const returnOrders = saleOrders.slice(0, returnCount);
  
  for (let i = 0; i < returnOrders.length; i++) {
    const sale = returnOrders[i];
    const saleItems = await prisma.orderItem.findMany({ where: { orderId: sale.id } });
    
    if (saleItems.length > 0) {
      const returnItem = randomChoice(saleItems);
      const returnQty = randomInt(1, Math.min(returnItem.quantity, 3));
      const returnAmount = parseFloat((returnQty * returnItem.unitPrice).toFixed(2));
      
      const saleReturn = await prisma.saleReturn.create({
        data: {
          saleOrderId: sale.id,
          returnDate: randomDate(new Date(sale.saleDate.getTime() + 2 * 24 * 60 * 60 * 1000), now),
          totalAmount: returnAmount,
          remark: ['质量问题退货', '客户多买退货', '规格不合适换货', '项目取消退货'][i % 4],
        }
      });
      returns.push(saleReturn);
      
      await prisma.saleReturnItem.create({
        data: {
          saleReturnId: saleReturn.id,
          productId: returnItem.productId,
          returnQuantity: returnQty,
          unitPrice: returnItem.unitPrice,
          amount: returnAmount,
        }
      });
    }
  }
  console.log(`   创建了 ${returns.length} 条退货记录`);

  console.log('\n14. 创建返点记录 (Rebate)...');
  const plumbers = contacts.filter(c => c.contactType === 'plumber');
  for (let i = 0; i < 10; i++) {
    const sale = randomChoice(saleOrders);
    const plumber = randomChoice(plumbers);
    const rebateAmount = parseFloat((sale.totalAmount * randomFloat(0.02, 0.06)).toFixed(2));

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
  console.log('   创建了 10 条返点记录');

  console.log('\n15. 创建催账记录 (CollectionRecord)...');
  const overdueReceivables = receivables.filter(r => r.isOverdue);
  for (let i = 0; i < Math.min(overdueReceivables.length, 8); i++) {
    const rec = overdueReceivables[i];
    const order = saleOrders.find(s => s.id === rec.orderId);
    const contact = contacts.find(c => c.id === order?.buyerId);
    
    if (contact) {
      await prisma.collectionRecord.create({
        data: {
          customerId: contact.id,
          receivableId: rec.id,
          collectionDate: randomDate(new Date(rec.agreedPaymentDate.getTime() + 5 * 24 * 60 * 60 * 1000), now),
          collectionTime: randomChoice(['09:00', '10:30', '14:00', '16:00']),
          collectionMethod: randomChoice(['phone', 'wechat', 'sms', 'visit']),
          collectionResult: randomChoice(['promised', 'partial', 'refused', 'unreachable']),
          collectionAmount: Math.random() > 0.5 ? randomFloat(500, 3000) : null,
          followUpDate: Math.random() > 0.5 ? randomDate(now, new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)) : null,
          followUpTime: '10:00',
          communication: ['客户说下周付款', '客户暂时困难，协商延期', '电话无人接听', '上门催收，客户态度不好'][i % 4],
          nextPlan: ['继续跟进', '准备起诉', '协商减免方案', '等待'][i % 4],
        }
      });
    }
  }
  console.log('   创建了催账记录');

  console.log('\n16. 计算并更新客户价值评分...');
  for (const contact of contacts) {
    const contactSales = customerOrdersMap.get(contact.id) || [];
    const totalSpent = contactSales.reduce((sum, s) => sum + s.finalAmount, 0);
    
    let overdueDays = 0;
    let totalOverdue = 0;
    const contactReceivables = receivables.filter(r => {
      const order = saleOrders.find(s => s.id === r.orderId);
      return order?.buyerId === contact.id;
    });
    
    contactReceivables.forEach(r => {
      if (r.isOverdue) {
        overdueDays += r.overdueDays;
        totalOverdue += r.remainingAmount;
      }
    });
    
    const score = calculateCustomerValueScore(contactSales.length, totalSpent, overdueDays, totalOverdue);
    
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        valueScore: score.valueScore,
        autoTag: score.autoTag,
        creditLevel: score.creditLevel,
        riskLevel: score.riskLevel,
        creditLimit: score.creditLimit,
        blacklist: contact.code === 'C011',
        blacklistReason: contact.code === 'C011' ? '长期拖欠货款，信用极差' : null,
      }
    });
  }
  console.log('   客户评分更新完成');

  console.log('\n17. 创建配送费用设置...');
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

  console.log('\n18. 创建系统设置...');
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', shopName: '折柳建材店', ownerName: '折柳', phone: '13800138000', address: '江城市建材路88号' }
  });
  console.log('   系统设置已创建');

  console.log('\n========== ✅ 测试数据生成完成 ==========');
  console.log('\n数据统计:');
  console.log('   - 商品分类: 5 个');
  console.log('   - 商品: 18 个');
  console.log('   - 供应商: 4 个');
  console.log('   - 联系人: 13 个 (包含优质客户、风险客户、黑名单客户)');
  console.log('   - 实体(Entity): 6 个');
  console.log('   - 项目(BizProject): 6 个');
  console.log('   - 进货记录: 20 条');
  console.log('   - 销售订单: 35 个');
  console.log('   - 应收账款: ' + pendingSales.length + ' 条 (包含逾期、协商、坏账)');
  console.log('   - 坏账核销: ' + badDebtCount + ' 条 (协商减免 + 坏账)');
  console.log('   - 退货记录: ' + returns.length + ' 条');
  console.log('   - 返点记录: 10 条');
  console.log('   - 配送区域: 5 个');
  console.log('\n特殊测试数据说明:');
  console.log('   1. 张伟(C001) - VIP优质客户，价值评分高，信用优秀');
  console.log('   2. 刘洋(C005) - 别墅业主，消费能力强');
  console.log('   3. 王强(C003) - 资深水电工，介绍客户多');
  console.log('   4. 黄大叔(C011) - 黑名单客户，欠款多，风险极高');
  console.log('   5. 吴老板(C012) - 协商减免案例');
  console.log('   6. 包含坏账核销记录、协商减免记录、退货记录');
  console.log('   7. 客户已自动计算价值评分和信用等级');
  console.log('\n可以使用 npm run db:seed 重新生成数据');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
