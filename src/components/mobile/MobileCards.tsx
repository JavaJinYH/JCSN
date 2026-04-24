import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface SaleCardProps {
  sale: {
    id: string;
    invoiceNo?: string;
    buyer?: { name: string };
    saleDate: string;
    totalAmount: number;
    paidAmount?: number;
    photoCount?: number;
  };
  onClick?: () => void;
}

export function SaleCard({ sale, onClick }: SaleCardProps) {
  const remaining = (sale.totalAmount || 0) - (sale.paidAmount || 0);

  return (
    <Card 
      className={`cursor-pointer hover:border-orange-300 transition-colors ${sale.photoCount ? 'border-l-4 border-l-orange-400' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                {sale.buyer?.name || '散客'}
              </div>
              <div className="text-xs text-slate-500">
                {sale.invoiceNo || sale.id.substring(0, 8)}
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="font-bold text-orange-600">
                {formatCurrency(sale.totalAmount || 0)}
              </div>
              <div className="text-xs text-slate-500">
                {formatDate(sale.saleDate)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {sale.paidAmount > 0 && (
              <Badge className="bg-green-100 text-green-700 text-xs">
                已付 {formatCurrency(sale.paidAmount)}
              </Badge>
            )}
            {remaining > 0 && (
              <Badge className="bg-amber-100 text-amber-700 text-xs">
                待收 {formatCurrency(remaining)}
              </Badge>
            )}
            {sale.photoCount && sale.photoCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                📷 {sale.photoCount}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PurchaseCardProps {
  purchase: {
    id: string;
    internalSeq?: number;
    invoiceNo?: string;
    supplier?: { name: string };
    purchaseDate: string;
    totalAmount: number;
    paidAmount?: number;
  };
  onClick?: () => void;
}

export function PurchaseCard({ purchase, onClick }: PurchaseCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:border-blue-300 transition-colors"
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                {purchase.supplier?.name || '供应商'}
              </div>
              <div className="text-xs text-slate-500">
                {purchase.internalSeq ? `#${purchase.internalSeq}` : purchase.invoiceNo || purchase.id.substring(0, 8)}
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="font-bold text-blue-600">
                {formatCurrency(purchase.totalAmount || 0)}
              </div>
              <div className="text-xs text-slate-500">
                {formatDate(purchase.purchaseDate)}
              </div>
            </div>
          </div>
          {purchase.paidAmount !== undefined && purchase.paidAmount > 0 && (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 text-xs">
                已付 {formatCurrency(purchase.paidAmount)}
              </Badge>
              {purchase.totalAmount - purchase.paidAmount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  待付 {formatCurrency(purchase.totalAmount - purchase.paidAmount)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: { name: string };
    brand?: { name: string };
    spec?: string;
  };
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const quantity = product.quantity || 0;
  const isLowStock = quantity < 10;
  const isOutOfStock = quantity <= 0;

  return (
    <Card 
      className={`cursor-pointer hover:border-slate-400 transition-colors ${
        isOutOfStock ? 'border-red-200' : isLowStock ? 'border-amber-200' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{product.name}</div>
              <div className="text-xs text-slate-500 truncate">
                {product.category?.name || '未分类'}
                {product.brand?.name && ` · ${product.brand.name}`}
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2 font-bold text-orange-600">
              {formatCurrency(product.price || 0)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className={`font-semibold px-2 py-0.5 rounded text-sm ${
              isOutOfStock ? 'bg-red-100 text-red-700' :
              isLowStock ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {quantity}
            </div>
            {product.spec && (
              <span className="text-xs text-slate-500 truncate ml-2">{product.spec}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
