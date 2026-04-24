import { Outlet } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';
import { ToastContainer } from '../Toast';

export function MobileLayout() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <ToastContainer />
      <main className="p-4">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}
