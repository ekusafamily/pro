import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  Truck,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { LOGO_URL } from '../store';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  alertCount: number;
}

export const Layout: React.FC<LayoutProps> = ({
  user, onLogout, children, alertCount
}) => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract active page ID from path (e.g. "/sales" -> "sales")
  // Default to "dashboard" if root
  const currentPath = location.pathname.substring(1) || 'dashboard';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'sales', label: 'New Sale', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'stockin', label: 'Stock Intake', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'distributors', label: 'Distributors', icon: Truck, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'customers', label: 'Customers & Credit', icon: CreditCard, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'users', label: 'User Management', icon: Users, roles: [UserRole.ADMIN] },
    { id: 'alerts', label: 'Alerts', icon: Bell, roles: [UserRole.ADMIN], count: alertCount },
    { id: 'reports', label: 'Reports', icon: ShieldCheck, roles: [UserRole.ADMIN] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Kinthithe Store" className="h-8 w-8 object-contain rounded-lg border border-slate-100" />
          <h1 className="font-black text-slate-900 text-lg tracking-tight">KINTHITHE</h1>
        </div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar - Wide Desktop Fixed */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 border-r border-slate-800
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="bg-white p-1 rounded-xl shadow-lg shadow-white/5 overflow-hidden w-10 h-10 border border-slate-700">
              <img src={LOGO_URL} alt="Kinthithe Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <h1 className="text-white text-lg font-black tracking-tight leading-none">
                KINTHITHE
              </h1>
              <p className="text-[9px] text-indigo-400 mt-1 uppercase tracking-[0.2em] font-bold">Workspace</p>
            </div>
          </div>

          <nav className="space-y-1">
            {filteredNav.map((item) => (
              <button
                key={item.id}
                onClick={() => { navigate(`/${item.id === 'dashboard' ? '' : item.id}`); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                  ${currentPath === item.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'}
                `}
              >
                <item.icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count && item.count > 0 ? (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{item.count}</span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="Avatar" /> : <div className="text-white font-bold">{user.username.charAt(0).toUpperCase()}</div>}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.full_name || user.username}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all uppercase tracking-widest"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Wide Desktop Optimization */}
      <main className="flex-1 overflow-auto p-6 md:p-8 bg-slate-50/50">
        <div className="max-w-[1600px] mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
};