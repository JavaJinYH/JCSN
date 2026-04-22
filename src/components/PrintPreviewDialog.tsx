import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PrintSlip, SaleSlipData, PurchaseSlipData } from './PrintSlip';

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slipData: SaleSlipData | PurchaseSlipData | null;
  slipType: 'sale' | 'purchase';
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  slipData,
  slipType,
}: PrintPreviewDialogProps) {
  if (!slipData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>打印预览 - {slipType === 'sale' ? '销售单' : '进货单'}</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5', padding: '16px' }}>
          <PrintSlip type={slipType} data={slipData} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
