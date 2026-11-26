import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  FileText,
  FilePlus2,
  ClipboardList,
  Users,
  Activity,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { NotificationItem } from '../types';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    api
      .get('/notifications')
      .then((res) => setNotifications(res.data.notifications || []))
      .catch(() => {});
  }, [location.pathname]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['customer', 'officer', 'admin'] },
    { label: 'Policies', to: '/policies', icon: FileText, roles: ['customer', 'officer', 'admin'] },
    { label: 'Claims', to: '/claims', icon: ClipboardList, roles: ['customer', 'officer', 'admin'] },
    { label: 'Submit Claim', to: '/claims/new', icon: FilePlus2, roles: ['customer'] },
    { label: 'Users & Staff', to: '/admin/users', icon: Users, roles: ['admin'] },
    { label: 'Audit & ML Model', to: '/admin/audit', icon: Activity, roles: ['admin', 'officer'] },
  ].filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-navy-900 text-white transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-navy-800">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <div>
              <span className="font-bold text-lg tracking-tight">ClaimWise</span>
              <span className="block text-[10px] uppercase tracking-widest text-slate-400">Risk Intelligence</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to) && item.to !== '/claims');
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-navy-600 text-white' : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 inset-x-0 p-4 border-t border-navy-800">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role} Portal</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-navy-800 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-slate-700 hidden sm:block">
              Enterprise Insurance Claims & Fraud Risk Platform
            </h1>
          </div>

          <div className="relative flex items-center gap-4">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-navy-600 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500 text-center">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n._id} className={`p-3 text-xs ${n.isRead ? 'bg-white' : 'bg-navy-50/50'}`}>
                        <p className="font-semibold text-slate-800">{n.title}</p>
                        <p className="text-slate-600 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

