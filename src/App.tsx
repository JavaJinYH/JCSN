import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { MobileLayout } from './components/layout/MobileLayout';
import { DesktopOnlyRoute } from './components/DesktopOnlyRoute';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { SaleNew } from './pages/SaleNew';
import { SaleDrafts } from './pages/SaleDrafts';
import { Products } from './pages/Products';
import { ProductNew } from './pages/ProductNew';
import { ProductEdit } from './pages/ProductEdit';
import { Entities } from './pages/Entities';
import { Contacts } from './pages/Contacts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Purchases } from './pages/Purchases';
import { Projects } from './pages/Projects';
import { BusinessCommissions } from './pages/BusinessCommissions';
import { Deliveries } from './pages/Deliveries';
import { Settlements } from './pages/Settlements';
import { Collections } from './pages/Collections';
import { Statements } from './pages/Statements';
import { AuditLogs } from './pages/AuditLogs';
import { InventoryCheckPage } from './pages/InventoryCheck';
import { PhotoManagement } from './pages/PhotoManagement';
import { LegacyBills } from './pages/LegacyBills';
import { BadDebts } from './pages/BadDebts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { Suppliers } from './pages/Suppliers';
import { DailyExpenses } from './pages/DailyExpenses';
import { ServiceAppointments } from './pages/ServiceAppointments';
// 移动端页面
import { MobilePendingDocuments } from './pages/mobile/MobilePendingDocuments';
import { MobileDocumentDetail } from './pages/mobile/MobileDocumentDetail';
import { MobileCollections } from './pages/mobile/MobileCollections';
import { MobileSettlements } from './pages/mobile/MobileSettlements';
import { MobileSettlementDetail } from './pages/mobile/MobileSettlementDetail';
import { MobileDashboard } from './pages/mobile/MobileDashboard';
import { MobileInventory } from './pages/mobile/MobileInventory';
import { MobileSales } from './pages/mobile/MobileSales';
import { MobileSaleDetail } from './pages/mobile/MobileSaleDetail';
import { MobilePurchases } from './pages/mobile/MobilePurchases';
import { MobilePurchaseDetail } from './pages/mobile/MobilePurchaseDetail';

const isMobile = typeof window !== 'undefined' && !!(window as any).Capacitor;

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ToastContainer />
      <Routes>
        {/* 桌面端路由 */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={
            isMobile ? (
              <Navigate to="/mobile/pending-documents" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } />
          <Route path="dashboard" element={<DesktopOnlyRoute><Dashboard /></DesktopOnlyRoute>} />
          <Route path="inventory" element={<DesktopOnlyRoute><Inventory /></DesktopOnlyRoute>} />
          <Route path="purchases" element={<DesktopOnlyRoute><Purchases /></DesktopOnlyRoute>} />
          <Route path="sales" element={<DesktopOnlyRoute><Sales /></DesktopOnlyRoute>} />
          <Route path="sales/new" element={<ErrorBoundary><DesktopOnlyRoute><SaleNew /></DesktopOnlyRoute></ErrorBoundary>} />
          <Route path="sales/drafts" element={<ErrorBoundary><DesktopOnlyRoute><SaleDrafts /></DesktopOnlyRoute></ErrorBoundary>} />
          <Route path="products" element={<DesktopOnlyRoute><Products /></DesktopOnlyRoute>} />
          <Route path="products/new" element={<ErrorBoundary><DesktopOnlyRoute><ProductNew /></DesktopOnlyRoute></ErrorBoundary>} />
          <Route path="products/:id/edit" element={<ErrorBoundary><DesktopOnlyRoute><ProductEdit /></DesktopOnlyRoute></ErrorBoundary>} />
          <Route path="entities" element={<DesktopOnlyRoute><Entities /></DesktopOnlyRoute>} />
          <Route path="contacts" element={<ErrorBoundary><DesktopOnlyRoute><Contacts /></DesktopOnlyRoute></ErrorBoundary>} />
          <Route path="suppliers" element={<DesktopOnlyRoute><Suppliers /></DesktopOnlyRoute>} />
          <Route path="projects" element={<ErrorBoundary><DesktopOnlyRoute><Projects /></DesktopOnlyRoute></ErrorBoundary>} />
          <Route path="reports" element={<DesktopOnlyRoute><Reports /></DesktopOnlyRoute>} />
          <Route path="settings" element={<DesktopOnlyRoute><Settings /></DesktopOnlyRoute>} />
          <Route path="business-commissions" element={<DesktopOnlyRoute><BusinessCommissions /></DesktopOnlyRoute>} />
          <Route path="daily-expenses" element={<DesktopOnlyRoute><DailyExpenses /></DesktopOnlyRoute>} />
          <Route path="service-appointments" element={<DesktopOnlyRoute><ServiceAppointments /></DesktopOnlyRoute>} />
          <Route path="deliveries" element={<DesktopOnlyRoute><Deliveries /></DesktopOnlyRoute>} />
          <Route path="settlements" element={<DesktopOnlyRoute><Settlements /></DesktopOnlyRoute>} />
          <Route path="collections" element={<DesktopOnlyRoute><Collections /></DesktopOnlyRoute>} />
          <Route path="statements" element={<DesktopOnlyRoute><Statements /></DesktopOnlyRoute>} />
          <Route path="bad-debts" element={<DesktopOnlyRoute><BadDebts /></DesktopOnlyRoute>} />
          <Route path="audit-logs" element={<DesktopOnlyRoute><AuditLogs /></DesktopOnlyRoute>} />
          <Route path="legacy-bills" element={<DesktopOnlyRoute><LegacyBills /></DesktopOnlyRoute>} />
          <Route path="inventory/check" element={<DesktopOnlyRoute><InventoryCheckPage /></DesktopOnlyRoute>} />
          <Route path="photos" element={<DesktopOnlyRoute><PhotoManagement /></DesktopOnlyRoute>} />
        </Route>
        
        {/* 移动端路由 - 独立布局 */}
        <Route path="/" element={<MobileLayout />}>
          <Route index element={<Navigate to="/mobile/pending-documents" replace />} />
          <Route path="mobile/pending-documents" element={<MobilePendingDocuments />} />
          <Route path="mobile/document/:id" element={<MobileDocumentDetail />} />
          <Route path="mobile/collections" element={<MobileCollections />} />
          <Route path="mobile/settlements" element={<MobileSettlements />} />
          <Route path="mobile/settlements/:id" element={<MobileSettlementDetail />} />
          <Route path="mobile/dashboard" element={<MobileDashboard />} />
          <Route path="mobile/inventory" element={<MobileInventory />} />
          <Route path="mobile/sales" element={<MobileSales />} />
          <Route path="mobile/sale/:id" element={<MobileSaleDetail />} />
          <Route path="mobile/purchases" element={<MobilePurchases />} />
          <Route path="mobile/purchase/:id" element={<MobilePurchaseDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
