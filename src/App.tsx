import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { SaleNew } from './pages/SaleNew';
import { SaleDrafts } from './pages/SaleDrafts';
import { SaleDraftEdit } from './pages/SaleDraftEdit';
import { Products } from './pages/Products';
import { ProductNew } from './pages/ProductNew';
import { ProductEdit } from './pages/ProductEdit';
import { Entities } from './pages/Entities';
import { Contacts } from './pages/Contacts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Purchases } from './pages/Purchases';
import { Projects } from './pages/Projects';
import { Rebates } from './pages/Rebates';
import { Deliveries } from './pages/Deliveries';
import { Settlements } from './pages/Settlements';
import { Collections } from './pages/Collections';
import { Statements } from './pages/Statements';
import { AuditLogs } from './pages/AuditLogs';
import { InventoryCheckPage } from './pages/InventoryCheck';
import { PhotoManagement } from './pages/PhotoManagement';
import { LegacyBills } from './pages/LegacyBills';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sales/new" element={<ErrorBoundary><SaleNew /></ErrorBoundary>} />
          <Route path="sales/drafts" element={<SaleDrafts />} />
          <Route path="sales/draft/:id" element={<ErrorBoundary><SaleDraftEdit /></ErrorBoundary>} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ErrorBoundary><ProductNew /></ErrorBoundary>} />
          <Route path="products/:id/edit" element={<ErrorBoundary><ProductEdit /></ErrorBoundary>} />
          <Route path="entities" element={<Entities />} />
          <Route path="contacts" element={<ErrorBoundary><Contacts /></ErrorBoundary>} />
          <Route path="projects" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="rebates" element={<Rebates />} />
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="collections" element={<Collections />} />
          <Route path="statements" element={<Statements />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="legacy-bills" element={<LegacyBills />} />
          <Route path="inventory/check" element={<InventoryCheckPage />} />
          <Route path="photos" element={<PhotoManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
