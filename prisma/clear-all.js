const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAll() {
  console.log('清空数据库...');
  try {
    await prisma.purchase.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.saleOrder.deleteMany();
    await prisma.receivable.deleteMany();
    await prisma.collectionRecord.deleteMany();
    await prisma.receivableAuditLog.deleteMany();
    await prisma.purchaseReturnItem.deleteMany();
    await prisma.purchaseReturn.deleteMany();
    await prisma.saleReturnItem.deleteMany();
    await prisma.saleReturn.deleteMany();
    await prisma.orderPayment.deleteMany();
    await prisma.supplierPayment.deleteMany();
    await prisma.saleOrderPhoto.deleteMany();
    await prisma.purchaseOrderPhoto.deleteMany();
    await prisma.inventoryCheckItem.deleteMany();
    await prisma.inventoryCheck.deleteMany();
    await prisma.contactPhone.deleteMany();
    await prisma.contactEntityRole.deleteMany();
    await prisma.contactProjectRole.deleteMany();
    await prisma.creditRecord.deleteMany();
    await prisma.paymentPlan.deleteMany();
    await prisma.entityPrice.deleteMany();
    await prisma.contactPrice.deleteMany();
    await prisma.productSpec.deleteMany();
    await prisma.businessCommission.deleteMany();
    await prisma.serviceAppointmentItem.deleteMany();
    await prisma.serviceAppointment.deleteMany();
    await prisma.deliveryRecord.deleteMany();
    await prisma.deliveryFee.deleteMany();
    await prisma.dailyExpense.deleteMany();
    await prisma.legacyBill.deleteMany();
    await prisma.badDebtWriteOff.deleteMany();
    await prisma.entity.deleteMany();
    await prisma.bizProject.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.product.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.category.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.contactCategory.deleteMany();
    await prisma.auditLog.deleteMany();
    console.log('数据库已清空');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

clearAll();
