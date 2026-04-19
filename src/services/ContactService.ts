import { db } from '@/lib/db';

export interface CreateContactDTO {
  name: string;
  code?: string;
  contactType?: string;
  primaryPhone?: string;
  address?: string;
  remark?: string;
  autoTag?: string;
  manualTag?: string;
}

export interface CreatePhoneDTO {
  phone: string;
  isPrimary?: boolean;
  label?: string;
}

export const ContactService = {
  async createContact(data: CreateContactDTO, phones?: CreatePhoneDTO[]) {
    const contact = await db.contact.create({
      data: {
        name: data.name,
        code: data.code || `C${Date.now().toString(36).toUpperCase()}`,
        contactType: data.contactType || 'customer',
        primaryPhone: data.primaryPhone,
        address: data.address,
        remark: data.remark,
        autoTag: data.autoTag,
        manualTag: data.manualTag,
        ...(phones && phones.length > 0 && {
          phonesObj: {
            create: phones.map(p => ({
              phone: p.phone,
              isPrimary: p.isPrimary || false,
              label: p.label,
            })),
          },
        }),
      },
      include: { phonesObj: true },
    });
    return contact;
  },

  async getContacts(filters?: {
    contactType?: string;
    keyword?: string;
    tag?: string;
  }) {
    const where: any = {};

    if (filters?.contactType && filters.contactType !== 'all') {
      where.contactType = filters.contactType;
    }
    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword } },
        { primaryPhone: { contains: filters.keyword } },
        { code: { contains: filters.keyword } },
      ];
    }
    if (filters?.tag) {
      where.OR = [
        { autoTag: { contains: filters.tag } },
        { manualTag: { contains: filters.tag } },
      ];
    }

    return db.contact.findMany({
      where,
      include: { phonesObj: true },
      orderBy: { name: 'asc' },
    });
  },

  async getContactById(id: string) {
    return db.contact.findUnique({
      where: { id },
      include: { phonesObj: true },
    });
  },

  async updateContact(id: string, data: Partial<CreateContactDTO>) {
    return db.contact.update({
      where: { id },
      data: {
        name: data.name,
        contactType: data.contactType,
        primaryPhone: data.primaryPhone,
        address: data.address,
        remark: data.remark,
        autoTag: data.autoTag,
        manualTag: data.manualTag,
      },
      include: { phonesObj: true },
    });
  },

  async deleteContact(id: string) {
    return db.contact.delete({ where: { id } });
  },

  async addPhone(contactId: string, phone: string, isPrimary = false, label?: string) {
    return db.contactPhone.create({
      data: {
        contactId,
        phone,
        isPrimary,
        label,
      },
    });
  },

  async removePhone(phoneId: string) {
    return db.contactPhone.delete({ where: { id: phoneId } });
  },

  async getContactStats(contactId: string) {
    const [salesCount, totalAmount, receivables] = await Promise.all([
      db.saleOrder.count({ where: { buyerId: contactId } }),
      db.saleOrder.aggregate({
        where: { buyerId: contactId },
        _sum: { totalAmount: true },
      }),
      db.receivable.findMany({
        where: { contactId },
      }),
    ]);

    const totalReceivable = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);

    return {
      salesCount,
      totalAmount: totalAmount._sum.totalAmount || 0,
      totalReceivable,
    };
  },
};
