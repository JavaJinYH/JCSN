import { db } from '@/lib/db';
import { ReceivableService } from './ReceivableService';

export const BadDebtService = {
  async getAll(includeRelated = true) {
    const include = includeRelated ? {
      contact: true,
      saleOrder: {
        include: { buyer: true, paymentEntity: true }
      },
    } : undefined;

    return db.badDebtWriteOff.findMany({
      include,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getByType(writeOffType: string, includeRelated = true) {
    const include = includeRelated ? {
      contact: true,
      saleOrder: {
        include: { buyer: true, paymentEntity: true }
      },
    } : undefined;

    return db.badDebtWriteOff.findMany({
      where: { writeOffType },
      include,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getPending(includeRelated = true) {
    const include = includeRelated ? {
      contact: true,
      saleOrder: {
        include: { buyer: true, paymentEntity: true }
      },
    } : undefined;

    return db.badDebtWriteOff.findMany({
      where: { status: 'pending' },
      include,
      orderBy: { createdAt: 'desc' },
    });
  },

  async createNegotiatedSettlement(data: {
    saleOrderId: string;
    contactId: string;
    writtenOffAmount: number;
    reason: string;
    operatorNote?: string;
    createdBy?: string;
  }) {
    const order = await db.saleOrder.findUnique({
      where: { id: data.saleOrderId },
      include: { returns: true, badDebtWriteOffs: true, payments: true },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    let originalAmount = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);
    for (const ret of order.returns || []) {
      originalAmount -= ret.totalAmount;
    }
    for (const writeOff of order.badDebtWriteOffs || []) {
      originalAmount -= writeOff.writtenOffAmount;
    }

    const finalAmount = Math.max(0, originalAmount - data.writtenOffAmount);

    const writeOff = await db.badDebtWriteOff.create({
      data: {
        contactId: data.contactId,
        saleOrderId: data.saleOrderId,
        originalAmount,
        writtenOffAmount: data.writtenOffAmount,
        finalAmount,
        writeOffType: 'negotiated',
        reason: data.reason,
        operatorNote: data.operatorNote,
        createdBy: data.createdBy,
        status: 'approved',
        approvedBy: data.createdBy,
        approvedAt: new Date(),
      },
      include: { contact: true, saleOrder: true },
    });

    const newPaidAmount = order.paidAmount;
    const newRemainingAmount = Math.max(0, finalAmount - newPaidAmount);

    await db.saleOrder.update({
      where: { id: data.saleOrderId },
      data: {
        paidAmount: newPaidAmount,
        writeOffAmount: (order.writeOffAmount || 0) + data.writtenOffAmount,
        status: newRemainingAmount <= 0 ? 'completed' : 'partial',
      },
    });

    let receivable = await db.receivable.findFirst({
      where: { orderId: data.saleOrderId }
    });

    if (receivable) {
      await ReceivableService.adjustAmount(
        receivable.id,
        -data.writtenOffAmount,
        data.createdBy || '系统',
        `协商减免 ${data.reason}`
      );

      if (newRemainingAmount <= 0) {
        await ReceivableService.updateStatus(
          receivable.id,
          'negotiated',
          data.createdBy || '系统',
          '协商结清'
        );
      }
    } else {
      await ReceivableService.createFromOrder(data.saleOrderId);
    }

    return writeOff;
  },

  async createBadDebtWriteOff(data: {
    saleOrderId: string;
    contactId: string;
    writtenOffAmount: number;
    reason: string;
    operatorNote?: string;
    createdBy?: string;
  }) {
    const order = await db.saleOrder.findUnique({
      where: { id: data.saleOrderId },
      include: { returns: true, badDebtWriteOffs: true, payments: true },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    let originalAmount = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);
    for (const ret of order.returns || []) {
      originalAmount -= ret.totalAmount;
    }
    for (const writeOff of order.badDebtWriteOffs || []) {
      originalAmount -= writeOff.writtenOffAmount;
    }

    const finalAmount = Math.max(0, originalAmount - data.writtenOffAmount);

    const writeOff = await db.badDebtWriteOff.create({
      data: {
        contactId: data.contactId,
        saleOrderId: data.saleOrderId,
        originalAmount,
        writtenOffAmount: data.writtenOffAmount,
        finalAmount,
        writeOffType: 'bad_debt',
        reason: data.reason,
        operatorNote: data.operatorNote,
        createdBy: data.createdBy,
        status: 'pending',
      },
      include: { contact: true, saleOrder: true },
    });

    return writeOff;
  },

  async approveBadDebt(writeOffId: string, approvedBy: string) {
    const writeOff = await db.badDebtWriteOff.findUnique({
      where: { id: writeOffId },
      include: { saleOrder: { include: { returns: true, badDebtWriteOffs: true, payments: true } } },
    });

    if (!writeOff) {
      throw new Error('坏账记录不存在');
    }

    if (writeOff.status !== 'pending') {
      throw new Error('该记录不是待审批状态');
    }

    const updated = await db.badDebtWriteOff.update({
      where: { id: writeOffId },
      data: {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      },
      include: { contact: true, saleOrder: true },
    });

    if (writeOff.saleOrderId) {
      const order = writeOff.saleOrder!;
      const newRemainingAmount = Math.max(0, writeOff.finalAmount - order.paidAmount);

      await db.saleOrder.update({
        where: { id: writeOff.saleOrderId },
        data: {
          writeOffAmount: (order.writeOffAmount || 0) + writeOff.writtenOffAmount,
          status: newRemainingAmount <= 0 ? 'completed' : 'partial',
        },
      });

      let receivable = await db.receivable.findFirst({
        where: { orderId: writeOff.saleOrderId }
      });

      if (receivable) {
        await ReceivableService.adjustAmount(
          receivable.id,
          -writeOff.writtenOffAmount,
          approvedBy,
          `坏账核销: ${writeOff.reason}`
        );

        if (newRemainingAmount <= 0) {
          await ReceivableService.updateStatus(
            receivable.id,
            'bad_debt',
            approvedBy,
            '坏账核销'
          );
        }
      } else {
        await ReceivableService.createFromOrder(writeOff.saleOrderId);
      }
    }

    return updated;
  },

  async rejectBadDebt(writeOffId: string, rejectedBy: string, rejectReason: string) {
    const writeOff = await db.badDebtWriteOff.findUnique({
      where: { id: writeOffId },
    });

    if (!writeOff) {
      throw new Error('坏账记录不存在');
    }

    if (writeOff.status !== 'pending') {
      throw new Error('该记录不是待审批状态');
    }

    return db.badDebtWriteOff.update({
      where: { id: writeOffId },
      data: {
        status: 'rejected',
        operatorNote: writeOff.operatorNote ? 
          `${writeOff.operatorNote} | 拒绝理由: ${rejectReason}` : 
          `拒绝理由: ${rejectReason}`,
      },
      include: { contact: true, saleOrder: true },
    });
  },

  async getStats() {
    const allWriteOffs = await db.badDebtWriteOff.findMany({
      where: { status: { not: 'rejected' } }
    });

    let totalNegotiated = 0;
    let totalBadDebt = 0;
    let totalAmountNegotiated = 0;
    let totalAmountBadDebt = 0;
    let pendingCount = 0;

    for (const writeOff of allWriteOffs) {
      if (writeOff.writeOffType === 'negotiated') {
        totalNegotiated++;
        totalAmountNegotiated += writeOff.writtenOffAmount;
      } else if (writeOff.writeOffType === 'bad_debt') {
        totalBadDebt++;
        totalAmountBadDebt += writeOff.writtenOffAmount;
      }
      if (writeOff.status === 'pending') {
        pendingCount++;
      }
    }

    return {
      totalNegotiated,
      totalBadDebt,
      totalAmountNegotiated,
      totalAmountBadDebt,
      totalAmount: totalAmountNegotiated + totalAmountBadDebt,
      pendingCount,
    };
  },

  async getWriteOffById(id: string) {
    return db.badDebtWriteOff.findUnique({
      where: { id },
      include: {
        contact: true,
        saleOrder: {
          include: { buyer: true, paymentEntity: true }
        },
      },
    });
  },
};
