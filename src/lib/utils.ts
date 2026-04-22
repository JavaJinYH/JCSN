import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function insertRandomBetweenDigits(seq: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < seq.length; i++) {
    result += seq[i];
    if (i < seq.length - 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

function generateRandomChars(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateInvoiceNo(todaySeq: number): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const seqStr = todaySeq.toString();
  const withLetters = insertRandomBetweenDigits(seqStr);
  const suffix = generateRandomChars(2);
  return `XS${year}${month}${day}-${withLetters}${suffix}`;
}

export function generateBatchNo(todaySeq: number): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const seqStr = todaySeq.toString();
  const withLetters = insertRandomBetweenDigits(seqStr);
  const suffix = generateRandomChars(2);
  return `JH${year}${month}${day}-${withLetters}${suffix}`;
}

export function calculateProfit(
  salePrice: number,
  costPrice: number,
  quantity: number
): number {
  return (salePrice - costPrice) * quantity;
}

export function formatProductName(product: { name: string; brand?: string | null; specification?: string | null; model?: string | null } | null | undefined): string {
  if (!product) return '-';
  const parts = [product.name];
  if (product.brand) parts.push(product.brand);
  if (product.specification) parts.push(product.specification);
  if (product.model && !product.specification) parts.push(product.model);
  return parts.join(' - ');
}

export function calculateAgingDays(date: Date | string, createdAt?: Date | string): number {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const start = createdAt ? (typeof createdAt === 'string' ? new Date(createdAt) : createdAt) : d;
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

interface AgingLevel {
  level: 'normal' | 'attention' | 'warning' | 'danger' | 'bad_debt';
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getAgingLevel(days: number): AgingLevel {
  if (days <= 30) {
    return { level: 'normal', label: '正常', color: '#22c55e', bgColor: '#f0fdf4', borderColor: '#86efac' };
  }
  if (days <= 60) {
    return { level: 'attention', label: '关注', color: '#eab308', bgColor: '#fefce8', borderColor: '#fde047' };
  }
  if (days <= 90) {
    return { level: 'warning', label: '预警', color: '#f97316', bgColor: '#fff7ed', borderColor: '#fdba74' };
  }
  if (days <= 180) {
    return { level: 'danger', label: '紧急', color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fca5a5' };
  }
  return { level: 'bad_debt', label: '坏账', color: '#7f1d1d', bgColor: '#fef2f2', borderColor: '#fca5a5' };
}
