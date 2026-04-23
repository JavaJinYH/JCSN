import { useRef, useState, useEffect } from 'react';
import { SettingsService } from '@/services/SettingsService';

export interface SaleSlipData {
  invoiceNo?: string;
  saleDate?: Date | string;
  buyer?: { name: string; primaryPhone?: string };
  paymentEntity?: { name: string };
  introducer?: { name: string };
  picker?: { name: string };
  project?: { name: string };
  totalAmount: number;
  discount: number;
  paidAmount: number;
  deliveryFee?: number;
  items: Array<{
    product?: { name: string; unit?: string };
    quantity: number;
    unitPrice: number;
    subtotal?: number;
    totalAmount?: number;
  }>;
  remark?: string;
}

export interface PurchaseSlipData {
  batchNo?: string;
  purchaseDate?: Date | string;
  supplier?: { name: string; phone?: string };
  totalAmount: number;
  items: Array<{
    product?: { name: string; unit?: string };
    quantity: number;
    unitPrice: number;
    subtotal?: number;
    totalAmount?: number;
  }>;
  remark?: string;
}

interface PrintSlipProps {
  type: 'sale' | 'purchase';
  data: SaleSlipData | PurchaseSlipData;
}

type PaperType = 'A4' | '80mm' | '58mm' | '190mm';

interface ShopSettings {
  shopName: string;
  phone: string;
  address: string;
}

function formatCurrency(num: number): string {
  return `¥${num.toFixed(2)}`;
}

function toChineseCurrency(num: number): string {
  if (num === 0) return '零元整';
  if (num < 0) return '负' + toChineseCurrency(-num);

  const parts = num.toFixed(2).split('.');
  const integerPart = parseInt(parts[0]);
  const decimalPart = parts[1];

  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿'];

  let result = '';
  const numStr = integerPart.toString();
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr[i]);
    const unitIndex = len - i - 1;

    if (digit !== 0) {
      result += digits[digit] + units[unitIndex];
    } else {
      if (len - i > 4 && len - i < 9) {
        if (!result.endsWith('零') && i !== len - 4) {
          result += '零';
        }
      } else if (result && !result.endsWith('零')) {
        result += '零';
      }
    }
  }

  if (result.endsWith('零')) {
    result = result.slice(0, -1);
  }

  const jiao = parseInt(decimalPart[0]);
  const fen = parseInt(decimalPart[1]);

  if (jiao === 0 && fen === 0) {
    return result + '元整';
  }

  if (jiao !== 0) {
    result += digits[jiao] + '角';
  }
  if (fen !== 0) {
    result += digits[fen] + '分';
  }

  return result;
}

export function PrintSlip({ type, data }: PrintSlipProps) {
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [paperType, setPaperType] = useState<PaperType>('A4');
  const [printCount, setPrintCount] = useState(1);
  const [showShopName, setShowShopName] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    shopName: '店铺名称',
    phone: '电话',
    address: '地址',
  });

  const itemCount = data.items.length;

  const getFontSizes = () => {
    if (paperType === '58mm') {
      return itemCount <= 5 ? { body: '10px', table: '9px' } : { body: '8px', table: '7px' };
    }
    if (paperType === '80mm') {
      return itemCount <= 8 ? { body: '12px', table: '11px' } : { body: '10px', table: '9px' };
    }
    return itemCount <= 10 ? { body: '14px', table: '13px' } : itemCount <= 20 ? { body: '12px', table: '11px' } : { body: '10px', table: '9px' };
  };

  const fontSizes = getFontSizes();

  useEffect(() => {
    loadShopSettings();
  }, []);

  const loadShopSettings = async () => {
    try {
      const settings = await SettingsService.getSettings();
      setShopSettings({
        shopName: settings.shopName || '店铺名称',
        phone: settings.phone || '电话',
        address: settings.address || '地址',
      });
    } catch (error) {
      console.error('Failed to load shop settings:', error);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const isSale = type === 'sale';
  const saleData = isSale ? data as SaleSlipData : null;
  const purchaseData = !isSale ? data as PurchaseSlipData : null;

  const getPaperSize = () => {
    switch (paperType) {
      case '80mm':
        return { width: '80mm', maxWidth: '80mm', padding: '3mm' };
      case '58mm':
        return { width: '58mm', maxWidth: '58mm', padding: '2mm' };
      case '190mm':
        return { width: '190mm', maxWidth: '190mm', padding: '5mm' };
      default:
        return { width: '190mm', maxWidth: '190mm', padding: '0' };
    }
  };

  const paperSize = getPaperSize();

  const ITEMS_PER_PAGE_190MM = 12;

  const generatePageHtml = (pageIndex: number, pageItems: typeof data.items, totalPages: number) => {
    const pageItemsHtml = pageItems.map(item => `
      <tr>
        ${paperType === 'A4' ? `
        <td>${item.product?.name || '-'}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.subtotal || (item.quantity * item.unitPrice))}</td>
        ` : paperType === '190mm' ? `
        <td>${item.product?.name || '-'}</td>
        <td>${item.product?.unit || '-'}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.subtotal || (item.quantity * item.unitPrice))}</td>
        ` : `
        <td class="${paperType === '58mm' ? 'compact' : ''}">${item.product?.name || '-'}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.subtotal || (item.quantity * item.unitPrice))}</td>
        `}
      </tr>
    `).join('');

    const pageTotal = pageItems.reduce((sum, item) => sum + (item.subtotal || (item.quantity * item.unitPrice)), 0);

    const infoSection = isSale && saleData ? `
      ${paperType === 'A4' ? `
      <div class="slip-info-row">
        <span class="slip-info-label">单据号:</span>
        <span class="slip-info-value">${saleData.invoiceNo || '-'}</span>
        <span class="slip-info-label" style="margin-left: 30px">日 期:</span>
        <span class="slip-info-value">${formatDate(saleData.saleDate)}</span>
      </div>
      ${saleData.buyer ? `
      <div class="slip-info-row">
        <span class="slip-info-label">购货人:</span>
        <span class="slip-info-value">${saleData.buyer.name}${saleData.buyer.primaryPhone ? ' ' + saleData.buyer.primaryPhone : ''}</span>
      </div>
      ` : ''}
      ` : `
      <div class="slip-info-row">
        <span>${saleData.invoiceNo || '-'}</span>
        <span>${formatDate(saleData.saleDate)}</span>
      </div>
      ${saleData.buyer ? `
      <div class="slip-info-row">
        <span>${saleData.buyer.name}</span>
      </div>
      ` : ''}
      `}
    ` : `
      ${paperType === 'A4' ? `
      <div class="slip-info-row">
        <span class="slip-info-label">单据号:</span>
        <span class="slip-info-value">${purchaseData?.batchNo || '-'}</span>
        <span class="slip-info-label" style="margin-left: 30px">日 期:</span>
        <span class="slip-info-value">${formatDate(purchaseData?.purchaseDate)}</span>
      </div>
      ${purchaseData?.supplier ? `
      <div class="slip-info-row">
        <span class="slip-info-label">供应商:</span>
        <span class="slip-info-value">${purchaseData.supplier.name}${purchaseData.supplier.phone ? ' ' + purchaseData.supplier.phone : ''}</span>
      </div>
      ` : ''}
      ` : `
      <div class="slip-info-row">
        <span>${purchaseData?.batchNo || '-'}</span>
        <span>${formatDate(purchaseData?.purchaseDate)}</span>
      </div>
      ${purchaseData?.supplier ? `
      <div class="slip-info-row">
        <span>${purchaseData.supplier.name}</span>
      </div>
      ` : ''}
      `}
    `;

    const totalSection = isSale && saleData ? `
      <div class="slip-total-row">
        <span>商品金额:</span>
        <span>${formatCurrency(saleData.totalAmount)}</span>
      </div>
      ${saleData.discount > 0 ? `
      <div class="slip-total-row">
        <span>优惠:</span>
        <span>-${formatCurrency(saleData.discount)}</span>
      </div>
      ` : ''}
      ${saleData.deliveryFee && saleData.deliveryFee > 0 ? `
      <div class="slip-total-row">
        <span>配送费:</span>
        <span>${formatCurrency(saleData.deliveryFee)}</span>
      </div>
      ` : ''}
      <div class="slip-total-row grand">
        <span>实付金额(大写):</span>
        <span>${toChineseCurrency(saleData.paidAmount)}</span>
      </div>
    ` : `
      <div class="slip-total-row grand">
        <span>合计金额(大写):</span>
        <span>${toChineseCurrency(purchaseData?.totalAmount || 0)}</span>
      </div>
    `;

    const remarkSection = data.remark ? `
      <div class="slip-remark">
        <strong>备注:</strong> ${data.remark}
      </div>
    ` : '';

    const signatureSection = paperType === 'A4' ? `
      <div class="slip-signature">
        <div class="slip-signature-box">
          <div>购货方签字:</div>
          <div class="slip-signature-line"></div>
        </div>
        <div class="slip-signature-box">
          <div>销售方签字:</div>
          <div class="slip-signature-line"></div>
        </div>
      </div>
    ` : `
      <div class="slip-signature compact">
        <div class="slip-signature-line"></div>
        <span>签字:</span>
      </div>
    `;

    const footerSection = `
      <div class="slip-footer">
        ${showShopName ? `<div>${shopSettings.shopName}</div>` : ''}
        ${showPhone || showAddress ? `<div>${showPhone ? `电话: ${shopSettings.phone}` : ''}${showPhone && showAddress ? ' | ' : ''}${showAddress ? `地址: ${shopSettings.address}` : ''}</div>` : ''}
        <div>谢谢惠顾!</div>
      </div>
    `;

    return `
      <div class="slip">
        ${paperType === '190mm' ? `
        <div style="position: relative; text-align: center; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 6px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 2px;">${shopSettings.shopName}</div>
          <div style="font-weight: bold; font-size: 16px;">销货清单</div>
          <div style="position: absolute; top: 0; right: 0; color: red;">No：${isSale ? (saleData?.invoiceNo || '-') : (purchaseData?.batchNo || '-')}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>${formatDate(isSale ? saleData?.saleDate : purchaseData?.purchaseDate)}</span>
          <span>收货单位：${isSale ? (saleData?.paymentEntity?.name || '-') : (purchaseData?.supplier?.name || '-')}</span>
        </div>
        ` : `
        <div class="slip-header">
          ${isSale ? `${shopSettings.shopName} 销售单` : `${shopSettings.shopName} 进货单`}
          ${printCount > 1 ? `<span style="font-size: ${parseInt(fontSizes.body) - 2}px; margin-left: 10px;">(第${pageIndex + 1}/${printCount}份)</span>` : ''}
        </div>
        `}

        <table class="slip-table">
          <thead>
            <tr>
              ${paperType === 'A4' ? `
              <th style="width: 50%">商品名称</th>
              <th style="width: 15%">数量</th>
              <th style="width: 17%">单价</th>
              <th style="width: 18%">小计</th>
              ` : paperType === '190mm' ? `
              <th style="width: 35%">名称及规格</th>
              <th style="width: 10%">单位</th>
              <th style="width: 15%">数量</th>
              <th style="width: 18%">单价</th>
              <th style="width: 22%">金额</th>
              ` : `
              <th>商品</th>
              <th style="width: 25%">单价</th>
              <th style="width: 15%">数量</th>
              <th style="width: 25%">小计</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${pageItemsHtml}
          </tbody>
        </table>

        <div class="slip-total">
          ${paperType === '190mm' ? `
          <div class="slip-total-row">
            <span>商品合计：</span>
            <span>${formatCurrency(isSale ? (saleData?.totalAmount || 0) : (purchaseData?.totalAmount || 0))}</span>
          </div>
          ${isSale && saleData?.deliveryFee && saleData?.deliveryFee > 0 ? `
          <div class="slip-total-row">
            <span>配送费：</span>
            <span>${formatCurrency(saleData.deliveryFee)}</span>
          </div>
          ` : ''}
          <div class="slip-total-row">
            <span>总计金额（大写）：</span>
            <span>${toChineseCurrency((isSale ? (saleData?.totalAmount || 0) : (purchaseData?.totalAmount || 0)) + (isSale ? (saleData?.deliveryFee || 0) : 0))}</span>
          </div>
          <div class="slip-total-row">
            <span>总计金额：</span>
            <span>${formatCurrency((isSale ? (saleData?.totalAmount || 0) : (purchaseData?.totalAmount || 0)) + (isSale ? (saleData?.deliveryFee || 0) : 0))}</span>
          </div>
          <div class="slip-total-row grand">
            <span>已付金额（大写）：</span>
            <span>${toChineseCurrency(isSale ? (saleData?.paidAmount || 0) : (purchaseData?.totalAmount || 0))}</span>
          </div>
          ` : `
          ${totalSection}
          `}
        </div>

        ${paperType === '190mm' ? `
        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
          <div style="text-align: right;">
            ${totalPages > 1 ? `
            <div style="margin-bottom: 5px;">客户签字：________________</div>
            <div style="font-size: 12px; color: #666;">（本页金额：${formatCurrency(pageTotal)}）</div>
            <div style="font-size: 12px; color: #666;">（第${pageIndex + 1}页，共${totalPages}页）</div>
            ` : `
            <div>客户签字：________________</div>
            `}
          </div>
        </div>
        ${showAddress || showPhone ? `
        <div class="slip-footer" style="margin-top: 6px; text-align: left;">
          ${showAddress ? `<div>地址：${shopSettings.address}</div>` : ''}
          ${showPhone ? `<div>电话：${shopSettings.phone}</div>` : ''}
        </div>
        ` : ''}
        ` : `
        ${remarkSection}
        ${signatureSection}
        ${footerSection}
        `}
      </div>
    `;
  };

  const generateSlipHtml = (copyIndex: number) => {
    if (paperType !== '190mm') {
      return generatePageHtml(0, data.items, 1);
    }

    const totalPages = Math.ceil(data.items.length / ITEMS_PER_PAGE_190MM);
    let html = '';
    for (let page = 0; page < totalPages; page++) {
      const startIdx = page * ITEMS_PER_PAGE_190MM;
      const endIdx = Math.min(startIdx + ITEMS_PER_PAGE_190MM, data.items.length);
      const pageItems = data.items.slice(startIdx, endIdx);
      html += generatePageHtml(page, pageItems, totalPages);
      if (page < totalPages - 1) {
        html += '<div style="page-break-after: always;"></div>';
      }
    }
    return html;
  };

  const handlePrint = () => {
    const printFrame = printFrameRef.current;
    if (!printFrame) return;

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const slipsHtml: string[] = [];
    for (let i = 0; i < printCount; i++) {
      slipsHtml.push(generateSlipHtml(i));
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${isSale ? '销售单' : '进货单'}</title>
        <style>
          @page {
            size: ${paperType === '80mm' ? '80mm 200mm' : paperType === '58mm' ? '58mm 200mm' : paperType === '190mm' ? '130mm 190mm' : 'A4'};
            margin: 3mm;
            ${paperType === 'A4' ? 'sides: duplex;' : ''}
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: "Microsoft YaHei", "SimSun", sans-serif;
            font-size: ${fontSizes.body};
            line-height: 1.4;
            color: #000;
          }
          .slip {
            width: 100%;
            max-width: ${paperSize.maxWidth};
            margin: 0 auto;
          }
          .copy-group {
            page-break-after: always;
          }
          .copy-group:last-child {
            page-break-after: auto;
          }
          .slip-header {
            text-align: center;
            font-weight: bold;
            padding: ${paperType === '58mm' ? '2px 0' : paperType === '80mm' ? '4px 0' : paperType === '190mm' ? '4px 0' : '10px 0'};
            border-bottom: ${paperType === 'A4' ? '2px' : '1px'} solid #333;
            margin-bottom: ${paperType === '58mm' ? '4px' : paperType === '80mm' ? '6px' : paperType === '190mm' ? '6px' : '15px'};
            font-size: ${paperType === '58mm' ? '12px' : paperType === '80mm' ? '14px' : paperType === '190mm' ? '14px' : '22px'};
          }
          .slip-info {
            margin-bottom: ${paperType === '58mm' ? '4px' : paperType === '80mm' ? '6px' : paperType === '190mm' ? '6px' : '15px'};
          }
          .slip-info-row {
            display: flex;
            margin: ${paperType === '58mm' ? '1px 0' : paperType === '80mm' ? '2px 0' : paperType === '190mm' ? '2px 0' : '5px 0'};
            font-size: ${fontSizes.table};
          }
          .slip-info-label {
            width: 80px;
            font-weight: bold;
          }
          .slip-info-value {
            flex: 1;
          }
          .slip-table {
            width: 100%;
            border-collapse: collapse;
            margin: ${paperType === '58mm' ? '4px 0' : paperType === '80mm' ? '6px 0' : paperType === '190mm' ? '6px 0' : '10px 0'};
            font-size: ${fontSizes.table};
          }
          .slip-table th,
          .slip-table td {
            border: 1px solid #333;
            padding: ${paperType === '58mm' ? '2px' : paperType === '80mm' ? '3px' : paperType === '190mm' ? '3px' : '8px'};
            text-align: left;
          }
          .slip-table th {
            background: #f0f0f0;
            font-weight: bold;
          }
          .slip-table td:nth-child(2),
          .slip-table td:nth-child(3),
          .slip-table td:nth-child(4) {
            text-align: right;
          }
          .slip-table td.compact {
            padding: 1px 2px;
          }
          .slip-total {
            margin-top: ${paperType === '58mm' ? '4px' : paperType === '80mm' ? '6px' : paperType === '190mm' ? '6px' : '15px'};
            border-top: 1px dashed #333;
            padding-top: ${paperType === '58mm' ? '4px' : paperType === '80mm' ? '6px' : paperType === '190mm' ? '5px' : '10px'};
          }
          .slip-total-row {
            display: flex;
            justify-content: space-between;
            margin: ${paperType === '58mm' ? '1px 0' : paperType === '80mm' ? '2px 0' : paperType === '190mm' ? '2px 0' : '5px 0'};
            font-size: ${fontSizes.table};
          }
          .slip-total-row.grand {
            font-size: ${paperType === '58mm' ? '10px' : paperType === '80mm' ? '12px' : paperType === '190mm' ? '13px' : '18px'};
            font-weight: bold;
            border-top: ${paperType === 'A4' ? '2px' : '1px'} solid #333;
            padding-top: ${paperType === '58mm' ? '2px' : paperType === '80mm' ? '3px' : paperType === '190mm' ? '3px' : '8px'};
            margin-top: ${paperType === '58mm' ? '2px' : paperType === '80mm' ? '3px' : paperType === '190mm' ? '3px' : '8px'};
          }
          .slip-remark {
            margin-top: ${paperType === '58mm' ? '4px' : paperType === '80mm' ? '6px' : paperType === '190mm' ? '6px' : '15px'};
            font-size: ${fontSizes.table};
          }
          .slip-signature {
            margin-top: ${paperType === '58mm' ? '8px' : paperType === '80mm' ? '15px' : paperType === '190mm' ? '15px' : '40px'};
            display: flex;
            justify-content: space-between;
          }
          .slip-signature.compact {
            margin-top: 10px;
          }
          .slip-signature-box {
            width: 45%;
            text-align: center;
            font-size: ${fontSizes.table};
          }
          .slip-signature-line {
            margin-top: ${paperType === '58mm' ? '15px' : paperType === '80mm' ? '25px' : paperType === '190mm' ? '25px' : '50px'};
            border-top: 1px solid #333;
            padding-top: 5px;
            font-size: ${fontSizes.table};
          }
          .slip-footer {
            margin-top: ${paperType === '58mm' ? '8px' : paperType === '80mm' ? '15px' : paperType === '190mm' ? '15px' : '30px'};
            text-align: center;
            font-size: ${paperType === '58mm' ? '7px' : paperType === '80mm' ? '9px' : paperType === '190mm' ? '9px' : '12px'};
            color: #666;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        ${slipsHtml.map(slip => `<div class="copy-group">${slip}</div>`).join('')}
      </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.print();
    }, 100);
  };

  return (
    <div style={{ padding: '16px', background: '#f5f5f5' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>{isSale ? '销售单' : '进货单'}预览</h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          当前有 {itemCount} 个商品
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>纸张类型</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPaperType('A4')}
              style={{
                padding: '8px 12px',
                background: paperType === 'A4' ? '#f97316' : '#e5e5e5',
                color: paperType === 'A4' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              📄 A4
            </button>
            <button
              onClick={() => setPaperType('80mm')}
              style={{
                padding: '8px 12px',
                background: paperType === '80mm' ? '#f97316' : '#e5e5e5',
                color: paperType === '80mm' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🧾 80mm
            </button>
            <button
              onClick={() => setPaperType('58mm')}
              style={{
                padding: '8px 12px',
                background: paperType === '58mm' ? '#f97316' : '#e5e5e5',
                color: paperType === '58mm' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              📋 58mm
            </button>
            <button
              onClick={() => setPaperType('190mm')}
              style={{
                padding: '8px 12px',
                background: paperType === '190mm' ? '#f97316' : '#e5e5e5',
                color: paperType === '190mm' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              📄 190mm二联纸
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>打印份数</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setPrintCount(Math.max(1, printCount - 1))}
              style={{
                width: '32px',
                height: '32px',
                background: '#e5e5e5',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              -
            </button>
            <span style={{ fontSize: '18px', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
              {printCount}
            </span>
            <button
              onClick={() => setPrintCount(Math.min(5, printCount + 1))}
              style={{
                width: '32px',
                height: '32px',
                background: '#e5e5e5',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>显示信息</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showShopName}
                onChange={(e) => setShowShopName(e.target.checked)}
              />
              店名
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showPhone}
                onChange={(e) => setShowPhone(e.target.checked)}
              />
              电话
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showAddress}
                onChange={(e) => setShowAddress(e.target.checked)}
              />
              地址
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={handlePrint}
        style={{
          padding: '10px 20px',
          background: '#f97316',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        🖨️ 打印{printCount > 1 ? `${printCount}份` : ''}
      </button>

      <div style={{ marginTop: '16px', border: '1px solid #ddd', background: 'white' }}>
        <div style={{ padding: '10px', background: '#f5f5f5', borderBottom: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
          {paperType === 'A4' ? 'A4 纸（自动双面）' : paperType === '80mm' ? '80mm 小票纸' : paperType === '190mm' ? '190mm 二联纸' : '58mm 复写纸'}
          {printCount > 1 ? ` × ${printCount}份` : ''}
        </div>
        <iframe
          ref={printFrameRef}
          style={{ width: '100%', height: '500px', border: 'none' }}
          title="打印预览"
        />
      </div>
    </div>
  );
}
