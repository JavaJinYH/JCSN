export interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  products?: Product[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  specification: string | null;
  model: string | null;
  unit: string;
  purchaseUnit: string | null;
  unitRatio: number;
  lastPurchasePrice: number | null;
  referencePrice: number | null;
  isPriceVolatile: boolean;
  stock: number;
  minStock: number;
  imagePath: string | null;
  imageUrl: string | null;
  purchases?: Purchase[];
  saleItems?: SaleItem[];
  createdAt: Date;
  updatedAt: Date;
  productSpecs?: ProductSpec[];
  returnItems?: SaleReturnItem[];
  costPrice?: number;
  salePrice?: number;
}

export interface Brand {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  specs?: ProductSpec[];
}

export interface ProductSpec {
  id: string;
  productId: string;
  brandId: string;
  name: string;
  unit: string;
  salePrice: number;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
  brand?: Brand;
}

export interface CustomerPrice {
  id: string;
  customerId: string;
  productId: string;
  lastPrice: number;
  transactionCount: number;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactId: string | null;
  phone: string | null;
  address: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  supplierId: string | null;
  supplier?: Supplier | null;
  supplierName: string | null;
  purchaseDate: Date;
  remark: string | null;
  batchNo: string | null;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  phones: string | null;
  customerType: string;
  customerCategoryId: string | null;
  customerCategory?: CustomerCategory | null;
  valueScore: number | null;
  autoTag: string | null;
  manualTag: string | null;
  address: string | null;
  remark: string | null;
  creditLimit: number;
  creditUsed: number;
  creditLevel: string;
  lastCreditReviewDate: Date | null;
  riskLevel: string;
  blacklist: boolean;
  blacklistReason: string | null;
  sales?: Sale[];
  rebates?: Rebate[];
  projects?: Project[];
  accountReceivables?: AccountReceivable[];
  collectionRecords?: CollectionRecord[];
  phoneRecords?: CustomerPhone[];
  creditRecords?: CreditRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditRecord {
  id: string;
  customerId: string;
  customer?: Customer;
  recordType: string;
  creditLimit: number;
  creditUsed: number;
  creditLevel: string;
  riskLevel: string;
  reason: string | null;
  operator: string | null;
  createdAt: Date;
}

export interface CustomerCategory {
  id: string;
  name: string;
  description: string | null;
  discount: number;
  customers?: Customer[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  customerId: string;
  customer?: Customer;
  address: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  remark: string | null;
  sales?: Sale[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  invoiceNo: string | null;
  writtenInvoiceNo: string | null;
  customerId: string | null;
  customer?: Customer | null;
  projectId: string | null;
  project?: Project | null;
  buyerCustomerId: string | null;
  payerCustomerId: string | null;
  introducerCustomerId: string | null;
  pickerCustomerId: string | null;
  pickerName: string | null;
  pickerPhone: string | null;
  pickerType: string | null;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  writeOffAmount: number;
  saleDate: Date;
  remark: string | null;
  status: string;
  items?: SaleItem[];
  payments?: Payment[];
  rebates?: Rebate[];
  photos?: SalePhoto[];
  createdAt: Date;
}

export interface Payment {
  id: string;
  saleId: string;
  sale?: Sale;
  amount: number;
  method: string;
  payerName: string | null;
  thirdPartyName: string | null;
  paidAt: Date;
  remark: string | null;
  createdAt: Date;
}

export interface SaleItem {
  id: string;
  saleId: string;
  sale?: Sale;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  costPriceSnapshot: number;
  sellingPriceSnapshot: number;
  subtotal: number;
  purchaseUnitPrice: number | null;
  createdAt: Date;
}

export interface SystemSetting {
  id: string;
  shopName: string;
  ownerName: string | null;
  phone: string | null;
  address: string | null;
  updatedAt: Date;
}

export interface Rebate {
  id: string;
  saleId: string;
  sale?: SaleOrder;
  plumberId: string | null;
  plumber?: Contact | null;
  supplierName: string;
  rebateAmount: number;
  rebateType: string;
  rebateRate: number;
  recordedAt: Date;
  remark: string | null;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryFee {
  id: string;
  zoneName: string;
  baseFee: number;
  perKgFee: number;
  perKmFee: number;
  minWeight: number;
  maxWeight: number;
  remark: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRecord {
  id: string;
  saleId: string | null;
  sale?: Sale | null;
  projectId: string | null;
  zoneName: string;
  recipientName: string;
  recipientPhone: string | null;
  deliveryAddress: string;
  distance: number;
  weight: number;
  baseFee: number;
  distanceFee: number;
  weightFee: number;
  totalFee: number;
  deliveryStatus: string;
  deliveryDate: Date | null;
  driverName: string | null;
  driverPhone: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountReceivable {
  id: string;
  contactId: string;
  contact?: Contact;
  saleId: string | null;
  sale?: SaleOrder | null;
  projectId: string | null;
  entityId: string | null;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  agreedPaymentDate: Date | null;
  isOverdue: boolean;
  overdueDays: number;
  status: string;
  settlementDate: Date | null;
  remark: string | null;
  collectionRecords?: CollectionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SettlementAdjustment {
  id: string;
  saleId: string;
  sale?: Sale;
  customerId: string;
  customer?: Customer;
  adjustType: string;
  adjustMethod: string;
  adjustValue: number;
  adjustAmount: number;
  reason: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  status: string;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentPlan {
  id: string;
  customerId: string;
  customer?: Customer;
  projectId: string | null;
  planAmount: number;
  actualAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: string;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  operatorId: string | null;
  ipAddress: string | null;
  timestamp: Date;
}

export interface SalePhoto {
  id: string;
  saleId: string;
  sale?: Sale;
  photoPath: string;
  photoType: string;
  photoRemark: string | null;
  createdAt: Date;
}

export interface PurchasePhoto {
  id: string;
  purchaseId: string;
  purchase?: Purchase;
  photoPath: string;
  photoType: string;
  photoRemark: string | null;
  createdAt: Date;
}

export interface CollectionRecord {
  id: string;
  customerId: string;
  customer?: Customer;
  receivableId: string | null;
  collectionDate: Date;
  collectionTime: string | null;
  collectionMethod: string;
  collectionResult: string;
  collectionAmount: number | null;
  followUpDate: Date | null;
  followUpTime: string | null;
  communication: string | null;
  nextPlan: string | null;
  remark: string | null;
  createdAt: Date;
}

export interface CustomerPhone {
  id: string;
  customerId: string;
  customer?: Customer;
  phone: string;
  phoneType: string;
  isPrimary: boolean;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleSlip {
  id: string;
  customerId: string | null;
  customer?: { id: string; name: string } | null;
  projectId: string | null;
  buyerCustomerId: string | null;
  payerCustomerId: string | null;
  introducerCustomerId: string | null;
  pickerCustomerId: string | null;
  pickerName: string | null;
  pickerPhone: string | null;
  pickerType: string | null;
  writtenInvoiceNo: string | null;
  totalAmount: number;
  discount: number;
  discountRate: number;
  paidAmount: number;
  saleDate: Date;
  remark: string | null;
  status: string;
  items: SaleSlipItem[];
  payments: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleSlipItem {
  id: string;
  slipId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: Date;
}

export interface CustomerFavoriteProduct {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  unitPrice: number | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryCheck {
  id: string;
  checkDate: Date;
  operator: string | null;
  totalItems: number;
  totalProfit: number;
  totalLoss: number;
  status: string;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryCheckItem {
  id: string;
  checkId: string;
  productId: string;
  systemStock: number;
  actualStock: number;
  profitLoss: number;
  costPrice: number;
  amount: number;
  createdAt: Date;
}

export interface Contact {
  id: string;
  code: string;
  name: string;
  primaryPhone: string;
  address: string | null;
  remark: string | null;
  contactType: string;
  valueScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  phones?: ContactPhone[];
  entityRoles?: ContactEntityRole[];
  projectRoles?: ContactProjectRole[];
  personalEntity?: Entity | null;
}

export interface ContactPhone {
  id: string;
  contactId: string;
  phone: string;
  isPrimary: boolean;
  createdAt: Date;
}

export interface Entity {
  id: string;
  name: string;
  entityType: string;
  contactId: string | null;
  defaultPayer: string | null;
  creditLimit: number;
  creditUsed: number;
  address: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact?: Contact | null;
  roles?: ContactEntityRole[];
  projects?: BizProject[];
  orders?: SaleOrder[];
}

export interface BizProject {
  id: string;
  name: string;
  entityId: string;
  address: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  estimatedAmount: number | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  entity?: Entity;
  roles?: ContactProjectRole[];
  orders?: SaleOrder[];
}

export interface ContactEntityRole {
  id: string;
  contactId: string;
  entityId: string;
  role: string;
  isDefault: boolean;
  remark: string | null;
  createdAt: Date;
  contact?: Contact;
  entity?: Entity;
}

export interface ContactProjectRole {
  id: string;
  contactId: string;
  projectId: string;
  role: string;
  remark: string | null;
  createdAt: Date;
  contact?: Contact;
  project?: BizProject;
}

export interface SaleOrder {
  id: string;
  invoiceNo: string | null;
  writtenInvoiceNo: string | null;
  saleDate: Date;
  buyerId: string;
  payerId: string | null;
  introducerId: string | null;
  pickerId: string | null;
  pickerName: string | null;
  pickerPhone: string | null;
  projectId: string | null;
  paymentEntityId: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  writeOffAmount: number;
  status: string;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  buyer?: Contact;
  payer?: Contact | null;
  introducer?: Contact | null;
  picker?: Contact | null;
  project?: BizProject | null;
  paymentEntity?: Entity;
  items?: OrderItem[];
  payments?: OrderPayment[];
  receivables?: Receivable[];
  returns?: SaleReturn[];
  badDebtWriteOffs?: BadDebtWriteOff[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  costPriceSnapshot: number;
  sellingPriceSnapshot: number;
  subtotal: number;
  createdAt: Date;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  payerName: string | null;
  paidAt: Date;
  remark: string | null;
  createdAt: Date;
}

export interface Receivable {
  id: string;
  orderId: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  agreedPaymentDate: Date | null;
  isOverdue: boolean;
  overdueDays: number;
  status: string;
  settlementDate: Date | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleOrderPhoto {
  id: string;
  saleOrderId: string;
  photoPath: string;
  photoType: string;
  photoRemark: string | null;
  createdAt: Date;
}

export interface SaleReturn {
  id: string;
  saleOrderId: string;
  saleOrder?: SaleOrder;
  returnDate: Date;
  totalAmount: number;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: SaleReturnItem[];
}

export interface SaleReturnItem {
  id: string;
  saleReturnId: string;
  saleReturn?: SaleReturn;
  productId: string;
  product?: Product;
  returnQuantity: number;
  unitPrice: number;
  amount: number;
  createdAt: Date;
}

export interface BadDebtWriteOff {
  id: string;
  contactId: string;
  contact?: Contact;
  saleOrderId: string | null;
  saleOrder?: SaleOrder | null;
  originalAmount: number;
  writtenOffAmount: number;
  finalAmount: number;
  reason: string | null;
  operatorNote: string | null;
  createdAt: Date;
  createdBy: string | null;
}
