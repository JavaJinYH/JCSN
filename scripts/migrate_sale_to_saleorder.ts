import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function migrateSaleToSaleOrder() {
  console.log('开始迁移 Sale -> SaleOrder...');

  const sales = await db.sale.findMany({
    include: {
      customer: true,
      items: true,
      payments: true,
    },
  });

  console.log(`找到 ${sales.length} 条 Sale 记录`);

  let defaultEntity = await db.entity.findFirst({
    where: { name: '默认主体' },
  });

  if (!defaultEntity) {
    defaultEntity = await db.entity.create({
      data: {
        name: '默认主体',
        entityType: 'company',
        creditLimit: 0,
        creditUsed: 0,
      },
    });
    console.log('创建了默认主体:', defaultEntity.id);
  }

  let migrated = 0;
  let skipped = 0;

  for (const sale of sales) {
    try {
      let buyerId: string;

      if (sale.customerId && sale.customer) {
        let contact = await db.contact.findFirst({
          where: {
            OR: [
              { primaryPhone: sale.customer.phone || '' },
              { name: sale.customer.name },
            ],
          },
        });

        if (!contact && sale.customer.name) {
          contact = await db.contact.create({
            data: {
              code: `MIGRATED_${sale.customerId.slice(0, 8)}`,
              name: sale.customer.name,
              primaryPhone: sale.customer.phone || `MIGRATED_${sale.customerId.slice(0, 8)}`,
              contactType: 'customer',
            },
          });
        }

        buyerId = contact?.id || defaultEntity.id;
      } else {
        buyerId = defaultEntity.id;
      }

      const saleOrder = await db.saleOrder.create({
        data: {
          invoiceNo: sale.invoiceNo,
          writtenInvoiceNo: sale.writtenInvoiceNo,
          saleDate: sale.saleDate,
          buyerId: buyerId,
          payerId: sale.payerCustomerId || undefined,
          introducerId: sale.introducerCustomerId || undefined,
          pickerId: sale.pickerCustomerId || undefined,
          pickerName: sale.pickerName || undefined,
          pickerPhone: sale.pickerPhone || undefined,
          projectId: sale.projectId || undefined,
          paymentEntityId: defaultEntity.id,
          totalAmount: sale.totalAmount,
          discount: sale.discount,
          paidAmount: sale.paidAmount,
          writeOffAmount: sale.writeOffAmount,
          status: sale.status,
          remark: sale.remark,
        },
      });

      for (const item of sale.items) {
        await db.orderItem.create({
          data: {
            orderId: saleOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPriceSnapshot: item.costPriceSnapshot,
            sellingPriceSnapshot: item.sellingPriceSnapshot,
            subtotal: item.subtotal,
          },
        });
      }

      for (const payment of sale.payments) {
        await db.orderPayment.create({
          data: {
            orderId: saleOrder.id,
            amount: payment.amount,
            method: payment.method,
            payerName: payment.payerName || undefined,
            paidAt: payment.paidAt,
            remark: payment.remark || undefined,
          },
        });
      }

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`已迁移 ${migrated} 条...`);
      }
    } catch (error) {
      console.error(`迁移 Sale ${sale.id} 失败:`, error);
      skipped++;
    }
  }

  console.log(`\n迁移完成: 成功 ${migrated}, 跳过 ${skipped}`);
}

async function main() {
  try {
    await migrateSaleToSaleOrder();
    console.log('迁移脚本执行完成');
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
  } finally {
    await db.$disconnect();
  }
}

main();