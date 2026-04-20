import { db } from '@/lib/db'

export const ReceivableService = {
  async getById(id: string) {
    return db.receivable.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: true,
            paymentEntity: true,
            project: true,
            returns: true,
            badDebtWriteOffs: true,
            payments: true,
            items: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  },

  async getAll(filters?: any) {
    return db.receivable.findMany({
      where: filters,
      include: {
        order: {
          include: {
            buyer: true,
            paymentEntity: true,
            project: true,
            returns: true,
            badDebtWriteOffs: true,
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async createFromOrder(orderId: string) {
    const order = await db.saleOrder.findUnique({
      where: { id: orderId },
      include: { returns: true, badDebtWriteOffs: true },
    })

    if (!order) {
      throw new Error('订单不存在')
    }

    let originalAmount = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0)
    
    for (const ret of order.returns || []) {
      originalAmount -= ret.totalAmount
    }

    for (const writeOff of order.badDebtWriteOffs || []) {
      originalAmount -= writeOff.writtenOffAmount
    }

    const remainingAmount = Math.max(0, originalAmount - order.paidAmount)

    const receivable = await db.receivable.create({
      data: {
        orderId,
        originalAmount,
        paidAmount: order.paidAmount,
        remainingAmount,
        status: remainingAmount <= 0 ? 'settled' : (order.paidAmount > 0 ? 'partial' : 'pending'),
        agreedPaymentDate: order.saleDate,
        remark: '自动从订单创建',
      },
    })

    await this.logAudit({
      receivableId: receivable.id,
      actionType: 'CREATE',
      changeType: 'initial',
      newAmount: originalAmount,
      newStatus: remainingAmount <= 0 ? 'settled' : (order.paidAmount > 0 ? 'partial' : 'pending'),
      operator: 'SYSTEM',
      reason: '从订单创建应收账款',
    })

    return receivable
  },

  async logPayment(receivableId: string, paymentAmount: number, operator: string, remark?: string) {
    const receivable = await this.getById(receivableId)
    if (!receivable) {
      throw new Error('应收账款不存在')
    }

    const oldPaidAmount = receivable.paidAmount
    const oldRemainingAmount = receivable.remainingAmount
    const oldStatus = receivable.status

    const newPaidAmount = oldPaidAmount + paymentAmount
    const newRemainingAmount = Math.max(0, receivable.originalAmount - newPaidAmount)
    const newStatus = newRemainingAmount <= 0 ? 'settled' : (newPaidAmount > 0 ? 'partial' : 'pending')

    const updated = await db.receivable.update({
      where: { id: receivableId },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        settlementDate: newStatus === 'settled' ? new Date() : receivable.settlementDate,
      },
    })

    await this.logAudit({
      receivableId,
      actionType: 'PAYMENT',
      changeType: 'payment',
      oldAmount: oldRemainingAmount,
      newAmount: newRemainingAmount,
      oldStatus,
      newStatus,
      operator,
      reason: `收到付款: ${paymentAmount}`,
      remark,
    })

    return updated
  },

  async adjustAmount(receivableId: string, adjustAmount: number, operator: string, reason: string, remark?: string) {
    const receivable = await this.getById(receivableId)
    if (!receivable) {
      throw new Error('应收账款不存在')
    }

    const oldOriginalAmount = receivable.originalAmount
    const oldRemainingAmount = receivable.remainingAmount
    const oldStatus = receivable.status

    const newOriginalAmount = oldOriginalAmount + adjustAmount
    const newRemainingAmount = Math.max(0, newOriginalAmount - receivable.paidAmount)
    const newStatus = newRemainingAmount <= 0 ? 'settled' : (receivable.paidAmount > 0 ? 'partial' : 'pending')

    const updated = await db.receivable.update({
      where: { id: receivableId },
      data: {
        originalAmount: newOriginalAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        settlementDate: newStatus === 'settled' ? new Date() : receivable.settlementDate,
      },
    })

    await this.logAudit({
      receivableId,
      actionType: 'ADJUST',
      changeType: 'amount',
      oldAmount: oldRemainingAmount,
      newAmount: newRemainingAmount,
      oldStatus,
      newStatus,
      operator,
      reason,
      remark,
    })

    return updated
  },

  async incrementRemainingByOrderId(orderId: string, incrementAmount: number) {
    const receivable = await db.receivable.findFirst({
      where: { orderId },
    });

    if (!receivable) {
      throw new Error('应收款记录不存在');
    }

    const newRemainingAmount = receivable.remainingAmount + incrementAmount;
    const newStatus = newRemainingAmount <= 0 ? 'settled' : (receivable.paidAmount > 0 ? 'partial' : 'pending');

    return db.receivable.update({
      where: { id: receivable.id },
      data: {
        remainingAmount: newRemainingAmount,
        status: newStatus,
      },
    });
  },

  async updateStatus(receivableId: string, newStatus: string, operator: string, reason: string) {
    const receivable = await this.getById(receivableId)
    if (!receivable) {
      throw new Error('应收账款不存在')
    }

    const oldStatus = receivable.status

    const updated = await db.receivable.update({
      where: { id: receivableId },
      data: {
        status: newStatus,
        settlementDate: newStatus === 'settled' ? new Date() : receivable.settlementDate,
      },
    })

    await this.logAudit({
      receivableId,
      actionType: 'STATUS_CHANGE',
      changeType: 'status',
      oldStatus,
      newStatus,
      operator,
      reason,
    })

    return updated
  },

  async logAudit(data: {
    receivableId: string
    actionType: string
    changeType: string
    oldValue?: string
    newValue?: string
    oldAmount?: number
    newAmount?: number
    oldStatus?: string
    newStatus?: string
    operator?: string
    reason?: string
    remark?: string
  }) {
    return db.receivableAuditLog.create({
      data: {
        receivableId: data.receivableId,
        actionType: data.actionType,
        changeType: data.changeType,
        oldValue: data.oldValue,
        newValue: data.newValue,
        oldAmount: data.oldAmount,
        newAmount: data.newAmount,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        operator: data.operator,
        reason: data.reason,
        remark: data.remark,
      },
    })
  },

  async getAuditLogs(receivableId: string) {
    return db.receivableAuditLog.findMany({
      where: { receivableId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async syncFromOrder(orderId: string) {
    const order = await db.saleOrder.findUnique({
      where: { id: orderId },
      include: { returns: true, badDebtWriteOffs: true, payments: true },
    })

    if (!order) {
      throw new Error('订单不存在')
    }

    const existingReceivable = await db.receivable.findFirst({
      where: { orderId },
    })

    let originalAmount = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0)
    
    for (const ret of order.returns || []) {
      originalAmount -= ret.totalAmount
    }

    for (const writeOff of order.badDebtWriteOffs || []) {
      originalAmount -= writeOff.writtenOffAmount
    }

    const newPaidAmount = order.paidAmount
    const newRemainingAmount = Math.max(0, originalAmount - newPaidAmount)
    const newStatus = newRemainingAmount <= 0 ? 'settled' : (newPaidAmount > 0 ? 'partial' : 'pending')

    if (existingReceivable) {
      const oldOriginalAmount = existingReceivable.originalAmount
      const oldPaidAmount = existingReceivable.paidAmount
      const oldRemainingAmount = existingReceivable.remainingAmount
      const oldStatus = existingReceivable.status

      if (oldOriginalAmount !== originalAmount || oldPaidAmount !== newPaidAmount || oldStatus !== newStatus) {
        const updated = await db.receivable.update({
          where: { id: existingReceivable.id },
          data: {
            originalAmount,
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
            settlementDate: newStatus === 'settled' ? new Date() : existingReceivable.settlementDate,
          },
        })

        await this.logAudit({
          receivableId: existingReceivable.id,
          actionType: 'SYNC',
          changeType: 'sync_from_order',
          oldAmount: oldRemainingAmount,
          newAmount: newRemainingAmount,
          oldStatus,
          newStatus,
          operator: 'SYSTEM',
          reason: '订单状态变化，同步更新应收账款',
        })

        return updated
      }

      return existingReceivable
    } else {
      return this.createFromOrder(orderId)
    }
  },

  async getStatsByDateRange(startDate: Date, endDate: Date) {
    const receivables = await db.receivable.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { order: { include: { returns: true, badDebtWriteOffs: true } } },
    })

    let totalOriginalAmount = 0
    let totalPaidAmount = 0
    let totalRemainingAmount = 0
    let settledCount = 0
    let pendingCount = 0
    let partialCount = 0
    let overdueCount = 0

    for (const rec of receivables) {
      totalOriginalAmount += rec.originalAmount
      totalPaidAmount += rec.paidAmount
      totalRemainingAmount += rec.remainingAmount
      
      if (rec.status === 'settled') settledCount++
      else if (rec.status === 'pending') pendingCount++
      else if (rec.status === 'partial') partialCount++
      
      if (rec.isOverdue) overdueCount++
    }

    return {
      totalOriginalAmount,
      totalPaidAmount,
      totalRemainingAmount,
      settledCount,
      pendingCount,
      partialCount,
      overdueCount,
      totalCount: receivables.length,
    }
  },
}
