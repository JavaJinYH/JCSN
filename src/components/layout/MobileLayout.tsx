import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { ToastContainer } from '../Toast';

// 动态导入 App 插件
const getAppPlugin = () => {
  try {
    // 检查是否在 Capacitor 环境中
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      // 使用 require 动态导入，避免编译错误
      const { App } = require('@capacitor/app');
      return App;
    }
  } catch (e) {
    console.log('App plugin not available:', e);
  }
  return null;
};

export function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const listenerRef = useRef<any>(null);
  
  useEffect(() => {
    // 获取 App 插件
    const App = getAppPlugin();
    if (!App) {
      return;
    }
    
    console.log('Setting up back button handler');
    
    // 监听硬件返回按钮事件
    const handleBackButton = async () => {
      console.log('Back button pressed, path:', location.pathname);
      
      // 获取当前路由路径
      const path = location.pathname;
      
      // 检查是否在详情页面
      const isDetailPage = 
        path.includes('/mobile/sale/') || 
        path.includes('/mobile/purchase/') || 
        path.includes('/mobile/settlements/') || 
        path.includes('/mobile/document/');
      
      if (isDetailPage) {
        console.log('Navigating back from detail page');
        navigate(-1);
        return;
      }
      
      // 检查是否在非首页的主要页面
      const isMainPage = 
        path === '/mobile/dashboard' || 
        path === '/mobile/sales' || 
        path === '/mobile/purchases' || 
        path === '/mobile/settlements' || 
        path === '/mobile/inventory' || 
        path === '/mobile/collections' ||
        path === '/mobile/pending-documents';
      
      if (isMainPage) {
        // 如果在主要页面且不是首页，返回首页
        if (path !== '/mobile/dashboard') {
          console.log('Navigating to dashboard from:', path);
          navigate('/mobile/dashboard');
          return;
        }
      }
      
      // 如果在首页或其他页面，先尝试用 history.back()
      if (window.history.length > 1) {
        console.log('Using history.back()');
        window.history.back();
      } else {
        console.log('No more history, would exit app');
        // 如果需要退出应用，可以调用 App.exitApp()
        // App.exitApp();
      }
    };
    
    // 添加监听器 - 关键：addListener返回Promise！
    const setupListener = async () => {
      try {
        if (App.addListener) {
          const listener = await App.addListener('backButton', handleBackButton);
          listenerRef.current = listener;
          console.log('Back button listener added');
        }
      } catch (e) {
        console.log('Error adding back button listener:', e);
      }
    };
    
    setupListener();
    
    // 清理监听器
    return () => {
      if (listenerRef.current && listenerRef.current.remove) {
        listenerRef.current.remove();
        console.log('Back button listener removed');
      }
    };
  }, [navigate, location.pathname]); // 只依赖 pathname，避免无限循环
  
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <ToastContainer />
      <main>
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}
