const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomPhone() {
  const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139', 
                    '150', '151', '152', '153', '155', '156', '157', '158', '159',
                    '180', '181', '182', '183', '185', '186', '187', '188', '189'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
}

function randomDate(start = new Date(2025, 0, 1), end = new Date()) {
  const timestamp = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(timestamp);
}

async function main() {
  console.log('🚀 开始生成高质量模拟数据...\n');

  // ==========================================
  // 1. 创建基础：商品分类
  // ==========================================
  console.log('📦 创建商品分类...');
  const [catWires, catPipes, catSanitary, catFittings, catTools] = await Promise.all([
    prisma.category.create({
      data: { name: '电线电缆', sortOrder: 1, description: '各种规格电线电缆' }
    }),
    prisma.category.create({
      data: { name: '水管管材', sortOrder: 2, description: 'PPR/PVC/PE水管' }
    }),
    prisma.category.create({
      data: { name: '卫浴洁具', sortOrder: 3, description: '马桶、水龙头、淋浴等' }
    }),
    prisma.category.create({
      data: { name: '五金配件', sortOrder: 4, description: '弯头、接头、阀门、螺丝' }
    }),
    prisma.category.create({
      data: { name: '工具配件', sortOrder: 5, description: '各类安装工具' }
    }),
  ]);

  // ==========================================
  // 2. 创建品牌
  // ==========================================
  console.log('📦 创建品牌...');
  const brands = await Promise.all([
    prisma.brand.create({ data: { name: '公牛' } }),
    prisma.brand.create({ data: { name: '德力西' } }),
    prisma.brand.create({ data: { name: '日丰管' } }),
    prisma.brand.create({ data: { name: '伟星管' } }),
    prisma.brand.create({ data: { name: '九牧卫浴' } }),
    prisma.brand.create({ data: { name: '恒洁卫浴' } }),
    prisma.brand.create({ data: { name: '正泰电器' } }),
  ]);

  // ==========================================
  // 3. 创建商品（重点！）
  // ==========================================
  console.log('📦 创建商品...');
  
  const products = [];
  
  // ----- 电线电缆（按米卖，价格波动）----
  const wires = [
    { name: 'BV-2.5mm² 单芯硬线', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 3.5, brand: '德力西', isVolatile: true },
    { name: 'BV-4mm² 单芯硬线', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 5.2, brand: '德力西', isVolatile: true },
    { name: 'BV-6mm² 单芯硬线', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 8.0, brand: '德力西', isVolatile: true },
    { name: 'BVR-2.5mm² 软线', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 4.2, brand: '公牛', isVolatile: true },
    { name: '护套线 2*1.5mm²', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 6.0, brand: '正泰', isVolatile: true },
    { name: '护套线 2*2.5mm²', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 9.5, brand: '正泰', isVolatile: true },
    { name: '3芯电缆线 2.5mm²', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 12.0, brand: '德力西', isVolatile: true },
  ];
  
  // ----- 水管管材（按根进货，按米卖）----
  const pipes = [
    { name: 'PPR冷水管 20mm S5', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 8.5, brand: '日丰管', isVolatile: true },
    { name: 'PPR冷水管 25mm S5', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 12.0, brand: '日丰管', isVolatile: true },
    { name: 'PPR热水管 20mm S3.2', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 10.0, brand: '伟星管', isVolatile: true },
    { name: 'PPR热水管 25mm S3.2', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 14.5, brand: '伟星管', isVolatile: true },
    { name: 'PVC排水管 50mm', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 18.0, brand: '日丰管', isVolatile: false },
    { name: 'PVC排水管 75mm', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 28.0, brand: '日丰管', isVolatile: false },
    { name: 'PVC排水管 110mm', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 45.0, brand: '日丰管', isVolatile: false },
  ];
  
  // ----- 卫浴洁具（简单，不涉及单位换算）----
  const sanitaries = [
    { name: '坐便器 9101S', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 899, brand: '九牧卫浴', isVolatile: false },
    { name: '坐便器 9102S', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 1299, brand: '恒洁卫浴', isVolatile: false },
    { name: '面盆水龙头 33080', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 199, brand: '九牧卫浴', isVolatile: false },
    { name: '厨房水龙头 33251', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 299, brand: '九牧卫浴', isVolatile: false },
    { name: '淋浴花洒套装 36341', unit: '套', purchaseUnit: '套', unitRatio: 1, referencePrice: 499, brand: '恒洁卫浴', isVolatile: false },
    { name: '角阀 74055', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 49, brand: '九牧卫浴', isVolatile: false },
  ];
  
  // ----- 五金配件 ----
  const fittings = [
    { name: 'PPR直接头 20mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 2.5, brand: '日丰管', isVolatile: false },
    { name: 'PPR90度弯头 20mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 3.0, brand: '日丰管', isVolatile: false },
    { name: 'PPR三通 20mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 4.0, brand: '日丰管', isVolatile: false },
    { name: 'PPR直接头 25mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 3.5, brand: '伟星管', isVolatile: false },
    { name: 'PPR内丝接头 20mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 6.0, brand: '伟星管', isVolatile: false },
    { name: 'PPR截止阀 20mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 45, brand: '日丰管', isVolatile: false },
    { name: 'PPR截止阀 25mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 65, brand: '日丰管', isVolatile: false },
    { name: '生料带 大卷', unit: '卷', purchaseUnit: '卷', unitRatio: 1, referencePrice: 5, brand: '其他', isVolatile: false },
    { name: '生料带 小卷', unit: '卷', purchaseUnit: '卷', unitRatio: 1, referencePrice: 2.5, brand: '其他', isVolatile: false },
  ];
  
  // ----- 工具 ----
  const tools = [
    { name: 'PPR热熔机 20-32mm', unit: '台', purchaseUnit: '台', unitRatio: 1, referencePrice: 120, brand: '其他', isVolatile: false },
    { name: 'PPR热熔机 20-63mm', unit: '台', purchaseUnit: '台', unitRatio: 1, referencePrice: 190, brand: '其他', isVolatile: false },
    { name: '管钳 14寸', unit: '把', purchaseUnit: '把', unitRatio: 1, referencePrice: 55, brand: '其他', isVolatile: false },
    { name: '活动扳手 10寸', unit: '把', purchaseUnit: '把', unitRatio: 1, referencePrice: 35, brand: '其他', isVolatile: false },
    { name: '测电笔', unit: '支', purchaseUnit: '支', unitRatio: 1, referencePrice: 8, brand: '其他', isVolatile: false },
    { name: '电工胶布 黑色', unit: '卷', purchaseUnit: '卷', unitRatio: 1, referencePrice: 2, brand: '其他', isVolatile: false },
  ];
  
  // 批量创建所有商品
  const productsToCreate = [...wires, ...pipes, ...sanitaries, ...fittings, ...tools];
  
  for (const [idx, p] of productsToCreate.entries()) {
    let categoryId;
    if (wires.includes(p)) categoryId = catWires.id;
    else if (pipes.includes(p)) categoryId = catPipes.id;
    else if (sanitaries.includes(p)) categoryId = catSanitary.id;
    else if (fittings.includes(p)) categoryId = catFittings.id;
    else categoryId = catTools.id;
    
    const product = await prisma.product.create({
      data: {
        code: `P${idx.toString().padStart(3, '0')}`,
        name: p.name,
        categoryId,
        unit: p.unit,
        purchaseUnit: p.purchaseUnit,
        unitRatio: p.unitRatio,
        referencePrice: p.referencePrice,
        isPriceVolatile: p.isVolatile,
      }
    });
    products.push(product);
  }
  
  console.log(`✅ 已创建 ${products.length} 个商品\n`);

  // ==========================================
  // 4. 创建联系人分类
  // ==========================================
  console.log('📋 创建联系人分类...');
  const contCatNormal = await prisma.contactCategory.create({
    data: { name: '普通客户', discount: 0 }
  });
  const contCatVip = await prisma.contactCategory.create({
    data: { name: 'VIP客户', discount: 5 }
  });
  const contCatElectrician = await prisma.contactCategory.create({
    data: { name: '水电工', discount: 10 }
  });

  // ==========================================
  // 5. 创建联系人
  // ==========================================
  console.log('📋 创建联系人...');
  
  const contacts = [];
  
  const contactNames = [
    { name: '张三', type: 'customer' },
    { name: '李四', type: 'customer' },
    { name: '王五', type: 'customer' },
    { name: '陈师傅', type: 'customer' }, // 水电工
    { name: '刘师傅', type: 'customer' }, // 水电工
    { name: '赵老板', type: 'customer' }, // 装修公司
    { name: '孙总', type: 'customer' }, // 装修公司
    { name: '周姐', type: 'customer' },
    { name: '吴女士', type: 'customer' },
    { name: '郑先生', type: 'customer' },
  ];
  
  for (const [idx, c] of contactNames.entries()) {
    const contact = await prisma.contact.create({
      data: {
        code: `C${idx.toString().padStart(4, '0')}`,
        name: c.name,
        primaryPhone: randomPhone(),
        contactType: c.type,
        contactCategoryId: (idx === 3 || idx === 4) ? contCatElectrician.id : 
                           (idx >= 5 && idx <= 6) ? contCatVip.id : contCatNormal.id,
      }
    });
    await prisma.contactPhone.create({
      data: { contactId: contact.id, phone: contact.primaryPhone, isPrimary: true }
    });
    contacts.push(contact);
  }
  
  console.log(`✅ 已创建 ${contacts.length} 个联系人\n`);

  // ==========================================
  // 6. 创建实体（主体）
  // ==========================================
  console.log('🏢 创建实体/主体...');
  
  const entities = [];
  
  const entityData = [
    { name: '碧桂园二期项目部', entityType: 'company', contactIndex: 5 },
    { name: '恒大华府装修公司', entityType: 'company', contactIndex: 6 },
    { name: '陈师傅水电施工队', entityType: 'contractor', contactIndex: 3 },
    { name: '刘师傅装修工作室', entityType: 'contractor', contactIndex: 4 },
    { name: '幸福小区业主委员会', entityType: 'personal', contactIndex: 0 },
    { name: '街道办事处', entityType: 'government', contactIndex: 1 },
  ];
  
  for (const [idx, e] of entityData.entries()) {
    const entity = await prisma.entity.create({
      data: {
        name: e.name,
        entityType: e.entityType,
        contactId: contacts[e.contactIndex].id,
        creditLimit: e.entityType === 'company' ? 50000 : 
                    e.entityType === 'contractor' ? 30000 : 
                    e.entityType === 'government' ? 100000 : 5000,
        address: '本地地址'
      }
    });
    entities.push(entity);
    
    // 同时关联角色
    await prisma.contactEntityRole.create({
      data: {
        contactId: contacts[e.contactIndex].id,
        entityId: entity.id,
        role: 'owner',
        isDefault: true
      }
    });
  }
  
  console.log(`✅ 已创建 ${entities.length} 个实体\n`);

  // ==========================================
  // 7. 创建项目
  // ==========================================
  console.log('🏗️ 创建项目...');
  
  const projects = [];
  
  const projectData = [
    { name: '碧桂园6号楼装修', entityIndex: 0, status: '进行中' },
    { name: '恒大华府样板间', entityIndex: 1, status: '进行中' },
    { name: '幸福小区业主自装', entityIndex: 4, status: '进行中' },
    { name: '街道办事处维修工程', entityIndex: 5, status: '已完成' },
  ];
  
  for (const p of projectData) {
    const project = await prisma.bizProject.create({
      data: {
        name: p.name,
        entityId: entities[p.entityIndex].id,
        status: p.status,
        startDate: randomDate(new Date(2026, 0, 1)),
      }
    });
    projects.push(project);
  }
  
  console.log(`✅ 已创建 ${projects.length} 个项目\n`);

  // ==========================================
  // 8. 创建供应商
  // ==========================================
  console.log('🏭 创建供应商...');
  
  const suppliers = [];
  
  const supplierData = [
    { name: '广州德力西总经销', phone: randomPhone(), contactIndex: 2 },
    { name: '佛山日丰管业代理', phone: randomPhone(), contactIndex: 0 },
    { name: '厦门九牧卫浴批发', phone: randomPhone(), contactIndex: 1 },
    { name: '本地五金批发市场', phone: randomPhone(), contactIndex: 2 },
  ];
  
  for (const s of supplierData) {
    const supplier = await prisma.supplier.create({
      data: {
        code: `S${Date.now().toString().slice(-4)}${Math.floor(Math.random()*100)}`,
        name: s.name,
        phone: s.phone,
        contactId: contacts[s.contactIndex].id,
      }
    });
    suppliers.push(supplier);
  }
  
  console.log(`✅ 已创建 ${suppliers.length} 个供应商\n`);

  // ==========================================
  // 9. 创建进货记录（生成库存）
  // ==========================================
  console.log('📥 创建进货记录...');

  const purchases = [];
  let purchaseSeq = 1;

  // ----- 电线进货（德力西进货单）----
  const wirePurchaseDate = randomDate(new Date(2026, 2, 1));
  const wireOrder = await prisma.purchaseOrder.create({
    data: {
      internalSeq: purchaseSeq++,
      supplierId: suppliers[0].id,
      supplierName: suppliers[0].name,
      purchaseDate: wirePurchaseDate,
      remark: '电线进货',
      status: 'completed',
      deliveryStatus: 'not_needed',
    }
  });

  const wireItems = [
    { product: products[0], qty: 500, price: 3.0 },
    { product: products[1], qty: 300, price: 4.8 },
    { product: products[2], qty: 200, price: 7.5 },
  ];
  for (const item of wireItems) {
    const p = await prisma.purchase.create({
      data: {
        orderId: wireOrder.id,
        productId: item.product.id,
        quantity: item.qty,
        unitPrice: item.price,
        totalAmount: item.qty * item.price,
        supplierId: suppliers[0].id,
        supplierName: suppliers[0].name,
        purchaseDate: wirePurchaseDate,
        status: 'completed',
        deliveryStatus: 'not_needed',
      }
    });
    purchases.push(p);
    await prisma.product.update({
      where: { id: item.product.id },
      data: { stock: { increment: item.qty }, lastPurchasePrice: item.price }
    });
  }

  // ----- 水管进货（日丰管进货单）----
  const pipePurchaseDate = randomDate(new Date(2026, 2, 1));
  const pipeOrder = await prisma.purchaseOrder.create({
    data: {
      internalSeq: purchaseSeq++,
      supplierId: suppliers[1].id,
      supplierName: suppliers[1].name,
      purchaseDate: pipePurchaseDate,
      remark: '水管进货',
      status: 'completed',
      deliveryStatus: 'not_needed',
    }
  });

  const pipeItems = [
    { product: products[7], qty: 200, price: 8.0 },
    { product: products[8], qty: 150, price: 11.0 },
  ];
  for (const item of pipeItems) {
    const p = await prisma.purchase.create({
      data: {
        orderId: pipeOrder.id,
        productId: item.product.id,
        quantity: item.qty,
        unitPrice: item.price,
        totalAmount: item.qty * item.price,
        supplierId: suppliers[1].id,
        supplierName: suppliers[1].name,
        purchaseDate: pipePurchaseDate,
        status: 'completed',
        deliveryStatus: 'not_needed',
      }
    });
    purchases.push(p);
    await prisma.product.update({
      where: { id: item.product.id },
      data: { stock: { increment: item.qty }, lastPurchasePrice: item.price }
    });
  }

  // ----- 卫浴进货（九牧卫浴进货单）----
  const sanitaryPurchaseDate = randomDate(new Date(2026, 2, 1));
  const sanitaryOrder = await prisma.purchaseOrder.create({
    data: {
      internalSeq: purchaseSeq++,
      supplierId: suppliers[2].id,
      supplierName: suppliers[2].name,
      purchaseDate: sanitaryPurchaseDate,
      remark: '卫浴进货',
      status: 'completed',
      deliveryStatus: 'not_needed',
    }
  });

  const sanitaryItems = [
    { product: products[14], qty: 10, price: 780 },
    { product: products[17], qty: 30, price: 165 },
  ];
  for (const item of sanitaryItems) {
    const p = await prisma.purchase.create({
      data: {
        orderId: sanitaryOrder.id,
        productId: item.product.id,
        quantity: item.qty,
        unitPrice: item.price,
        totalAmount: item.qty * item.price,
        supplierId: suppliers[2].id,
        supplierName: suppliers[2].name,
        purchaseDate: sanitaryPurchaseDate,
        status: 'completed',
        deliveryStatus: 'not_needed',
      }
    });
    purchases.push(p);
    await prisma.product.update({
      where: { id: item.product.id },
      data: { stock: { increment: item.qty }, lastPurchasePrice: item.price }
    });
  }

  // ----- 五金配件进货（本地五金进货单）----
  const fittingsPurchaseDate = randomDate(new Date(2026, 2, 1));
  const fittingsOrder = await prisma.purchaseOrder.create({
    data: {
      internalSeq: purchaseSeq++,
      supplierId: suppliers[3].id,
      supplierName: suppliers[3].name,
      purchaseDate: fittingsPurchaseDate,
      remark: '五金配件进货',
      status: 'completed',
      deliveryStatus: 'not_needed',
    }
  });

  for (let i = 22; i <= 25; i++) {
    const qty = 100 + Math.floor(Math.random() * 100);
    const price = products[i].referencePrice * 0.8;
    const p = await prisma.purchase.create({
      data: {
        orderId: fittingsOrder.id,
        productId: products[i].id,
        quantity: qty,
        unitPrice: price,
        totalAmount: qty * price,
        supplierId: suppliers[3].id,
        supplierName: suppliers[3].name,
        purchaseDate: fittingsPurchaseDate,
        status: 'completed',
        deliveryStatus: 'not_needed',
      }
    });
    purchases.push(p);
    await prisma.product.update({
      where: { id: products[i].id },
      data: { stock: { increment: qty }, lastPurchasePrice: price }
    });
  }

  console.log(`✅ 已创建 ${purchases.length} 个进货记录\n`);

  // ==========================================
  // 10. 创建销售记录（多种场景）
  // ==========================================
  console.log('💰 创建销售记录...');
  
  const saleOrders = [];
  let seq = 1;
  
  // ----- 场景1：散客，现金支付，配送 ----
  const sale1Items = [
    { product: products[0], qty: 50, price: 3.5 }, // 50米电线
    { product: products[7], qty: 20, price: 8.5 }, // 20米水管
    { product: products[22], qty: 10, price: 2.5 }, // 直接头
    { product: products[23], qty: 8, price: 3.0 }, // 弯头
  ];
  const sale1Total = sale1Items.reduce((sum, item) => sum + item.qty * item.price, 0);
  
  const sale1 = await prisma.saleOrder.create({
    data: {
      internalSeq: seq++,
      saleDate: randomDate(new Date(2026, 2, 1)),
      buyerId: contacts[0].id, // 张三
      paymentEntityId: entities[4].id, // 个人实体
      totalAmount: sale1Total,
      paidAmount: sale1Total,
      status: 'completed',
      needDelivery: true,
      deliveryAddress: '幸福小区1号楼101',
      deliveryFee: 20,
    }
  });
  saleOrders.push(sale1);
  
  for (const item of sale1Items) {
    await prisma.orderItem.create({
      data: {
        orderId: sale1.id,
        productId: item.product.id,
        quantity: item.qty,
        unitPrice: item.price,
        costPriceSnapshot: item.product.lastPurchasePrice || item.product.referencePrice,
        sellingPriceSnapshot: item.product.referencePrice,
        subtotal: item.qty * item.price,
      }
    });
    // 减库存
    await prisma.product.update({
      where: { id: item.product.id },
      data: { stock: { decrement: item.qty } }
    });
  }
  
  // 付款记录
  await prisma.orderPayment.create({
    data: {
      orderId: sale1.id,
      amount: sale1Total,
      method: '现金',
      payerName: contacts[0].name,
    }
  });
  
  // ----- 场景2：装修公司，挂账，项目关联，介绍人 ----
  const sale2Items = [
    { product: products[0], qty: 150, price: 3.5 }, // 150米BV2.5
    { product: products[1], qty: 80, price: 5.2 }, // 80米BV4
    { product: products[7], qty: 100, price: 8.5 }, // 100米PPR20
    { product: products[8], qty: 60, price: 12.0 }, // 60米PPR25
    { product: products[14], qty: 3, price: 899 }, // 3个马桶
    { product: products[17], qty: 5, price: 199 }, // 5个龙头
  ];
  const sale2Total = sale2Items.reduce((sum, item) => sum + item.qty * item.price, 0);
  
  const sale2 = await prisma.saleOrder.create({
    data: {
      internalSeq: seq++,
      invoiceNo: `XS${seq.toString().padStart(5, '0')}`,
      saleDate: randomDate(new Date(2026, 2, 1)),
      buyerId: contacts[5].id, // 赵老板
      paymentEntityId: entities[0].id, // 碧桂园
      introducerId: contacts[3].id, // 陈师傅介绍
      projectId: projects[0].id, // 关联项目
      totalAmount: sale2Total,
      paidAmount: 0, // 全挂账
      status: 'completed',
      remark: '碧桂园项目材料款'
    }
  });
  saleOrders.push(sale2);
  
  for (const item of sale2Items) {
    await prisma.orderItem.create({
      data: {
        orderId: sale2.id,
        productId: item.product.id,
        quantity: item.qty,
        unitPrice: item.price,
        costPriceSnapshot: item.product.lastPurchasePrice || item.product.referencePrice,
        sellingPriceSnapshot: item.product.referencePrice,
        subtotal: item.qty * item.price,
      }
    });
    await prisma.product.update({
      where: { id: item.product.id },
      data: { stock: { decrement: item.qty } }
    });
  }
  
  // 应收记录
  await prisma.receivable.create({
    data: {
      orderId: sale2.id,
      originalAmount: sale2Total,
      paidAmount: 0,
      remainingAmount: sale2Total,
      status: 'pending',
    }
  });
  
  // ----- 场景3：包工头，部分挂账，水电工拿货 ----
  const sale3Items = [
    { product: products[0], qty: 30, price: 3.15 }, // 9.5折给水电工
    { product: products[7], qty: 30, price: 7.65 },
    { product: products[22], qty: 20, price: 2.25 },
    { product: products[28], qty: 20, price: 4.5 },
  ];
  const sale3Total = sale3Items.reduce((sum, item) => sum + item.qty * item.price, 0);
  
  const sale3 = await prisma.saleOrder.create({
    data: {
      internalSeq: seq++,
      saleDate: randomDate(new Date(2026, 2, 1)),
      buyerId: contacts[3].id, // 陈师傅
      paymentEntityId: entities[2].id, // 陈师傅施工队
      totalAmount: sale3Total,
      paidAmount: sale3Total / 2, // 付一半
      status: 'completed',
      remark: '水电工拿货，9.5折优惠'
    }
  });
  saleOrders.push(sale3);
  
  for (const item of sale3Items) {
    await prisma.orderItem.create({
      data: {
        orderId: sale3.id,
        productId: item.product.id,
        quantity: item.qty,
        unitPrice: item.price,
        costPriceSnapshot: item.product.lastPurchasePrice || item.product.referencePrice,
        sellingPriceSnapshot: item.product.referencePrice,
        subtotal: item.qty * item.price,
      }
    });
    await prisma.product.update({
      where: { id: item.product.id },
      data: { stock: { decrement: item.qty } }
    });
  }
  
  await prisma.orderPayment.create({
    data: {
      orderId: sale3.id,
      amount: sale3Total / 2,
      method: '微信',
      payerName: contacts[3].name,
    }
  });
  
  await prisma.receivable.create({
    data: {
      orderId: sale3.id,
      originalAmount: sale3Total,
      paidAmount: sale3Total / 2,
      remainingAmount: sale3Total / 2,
      status: 'pending',
    }
  });
  
  // ----- 场景4：政府项目，全额挂账 ----
  const sale4Items = [
    { product: products[0], qty: 200, price: 3.5 },
    { product: products[1], qty: 100, price: 5.2 },
    { product: products[17], qty: 10, price: 199 },
  ];
  const sale4Total = sale4Items.reduce((sum, item) => sum + item.qty * item.price, 0);
  
  const sale4 = await prisma.saleOrder.create({
    data: {
      internalSeq: seq++,
      invoiceNo: `XS${seq.toString().padStart(5, '0')}`,
      saleDate: randomDate(new Date(2026, 0, 15)),
      buyerId: contacts[1].id,
      paymentEntityId: entities[5].id,
      projectId: projects[3].id,
      totalAmount: sale4Total,
      paidAmount: 0,
      status: 'completed',
      remark: '街道办事处维修工程'
    }
  });
  saleOrders.push(sale4);
  
  for (const item of sale4Items) {
    await prisma.orderItem.create({
      data: {
        orderId: sale4.id,
        productId: item.product.id,
        quantity: item.qty,
        unitPrice: item.price,
        costPriceSnapshot: item.product.lastPurchasePrice || item.product.referencePrice,
        sellingPriceSnapshot: item.product.referencePrice,
        subtotal: item.qty * item.price,
      }
    });
    await prisma.product.update({
      where: { id: item.product.id },
      data: { stock: { decrement: item.qty } }
    });
  }
  
  await prisma.receivable.create({
    data: {
      orderId: sale4.id,
      originalAmount: sale4Total,
      paidAmount: 0,
      remainingAmount: sale4Total,
      status: 'pending',
    }
  });

  // ==========================================
  // 11. 创建催账记录
  // ==========================================
  console.log('📞 创建催账记录...');
  
  // 催碧桂园一笔
  await prisma.collectionRecord.create({
    data: {
      entityId: entities[0].id,
      collectionDate: randomDate(new Date(2026, 3, 1)),
      collectionMethod: 'phone',
      collectionResult: 'promised',
      attitude: '积极友好',
      communication: '赵总承诺月底付款',
      nextPlan: '月底跟进',
      remark: '碧桂园二期材料款'
    }
  });
  
  // 催恒大华府一笔
  await prisma.collectionRecord.create({
    data: {
      entityId: entities[1].id,
      collectionDate: randomDate(new Date(2026, 3, 1)),
      collectionMethod: 'visit',
      collectionResult: 'negotiating',
      attitude: '态度恶劣',
      communication: '说没钱，拖延中',
      nextPlan: '下周再上门',
      remark: '样板间项目款项'
    }
  });

  console.log('\n✅ 所有数据生成完成！');
  console.log('📊 数据概览:');
  console.log('  - 商品:', products.length);
  console.log('  - 联系人:', contacts.length);
  console.log('  - 实体:', entities.length);
  console.log('  - 项目:', projects.length);
  console.log('  - 供应商:', suppliers.length);
  console.log('  - 进货:', purchases.length);
  console.log('  - 销售:', saleOrders.length);
  console.log('  - 催账: 2');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
