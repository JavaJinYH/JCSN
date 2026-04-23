import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
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
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sales/new" element={<ErrorBoundary><SaleNew /></ErrorBoundary>} />
          <Route path="sales/drafts" element={<ErrorBoundary><SaleDrafts /></ErrorBoundary>} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ErrorBoundary><ProductNew /></ErrorBoundary>} />
          <Route path="products/:id/edit" element={<ErrorBoundary><ProductEdit /></ErrorBoundary>} />
          <Route path="entities" element={<Entities />} />
          <Route path="contacts" element={<ErrorBoundary><Contacts /></ErrorBoundary>} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="projects" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="business-commissions" element={<BusinessCommissions />} />
          <Route path="daily-expenses" element={<DailyExpenses />} />
          <Route path="service-appointments" element={<ServiceAppointments />} />
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="collections" element={<Collections />} />
          <Route path="statements" element={<Statements />} />
          <Route path="bad-debts" element={<BadDebts />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="legacy-bills" element={<LegacyBills />} />
          <Route path="inventory/check" element={<InventoryCheckPage />} />
          <Route path="photos" element={<PhotoManagement />} />
          {/* 移动端页面 */}
          <Route path="mobile/pending-documents" element={<MobilePendingDocuments />} />
          <Route path="mobile/document/:id" element={<MobileDocumentDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
