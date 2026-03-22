import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3,
  Users, LogOut, Settings, ChevronLeft, ChevronRight, Store,
  Menu, X, Moon, Sun, Maximize, Minimize, ScrollText, BarChart2, CreditCard, Receipt,
  Download, Truck, BedDouble, CalendarDays, ConciergeBell, ArrowLeftRight, Contact
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePWAInstall } from '@/contexts/PWAInstallContext';

const BRAND = {
  primary: '#007AAD',
  accent: '#007AAD',
  white: '#FFFFFF',
} as const;

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isFullscreen, toggleFullscreen } = useTheme();
  const { canInstall, triggerInstall } = usePWAInstall();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const navItems = [
    // Reception desk first so Rooms/Bookings are never buried
    { icon: BedDouble,       label: 'Rooms',          path: '/rooms',          roles: ['owner', 'receptionist'] },
    { icon: CalendarDays,    label: 'Bookings',       path: '/bookings',       roles: ['owner', 'receptionist'] },
    { icon: ConciergeBell,   label: 'Services',       path: '/services',       roles: ['owner', 'receptionist'] },
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/dashboard',      roles: ['super_admin', 'owner', 'storekeeper', 'receptionist', 'bar', 'fnb'] },
    { icon: ShoppingCart,    label: 'Point of Sale',  path: '/pos',            roles: ['owner', 'bar', 'fnb'] },
    { icon: Package,         label: 'Inventory',      path: '/inventory',      roles: ['owner', 'storekeeper', 'bar', 'fnb'] },
    { icon: ArrowLeftRight,  label: 'Stock issues',   path: '/issues',         roles: ['owner', 'storekeeper', 'bar', 'fnb'] },
    { icon: Contact,         label: 'Suppliers',      path: '/suppliers',      roles: ['owner', 'storekeeper'] },
    { icon: Truck,           label: 'Purchases',      path: '/purchases',      roles: ['owner', 'storekeeper'] },
    { icon: Receipt,         label: 'Transactions',   path: '/transactions',   roles: ['owner', 'bar', 'fnb'] },
    { icon: BarChart3,       label: 'Reports',        path: '/reports',        roles: ['owner', 'bar', 'fnb'] },
    { icon: Store,           label: 'Shops',          path: '/shops',          roles: ['super_admin'] },
    { icon: Users,           label: 'Users',          path: '/users',          roles: ['super_admin'] },
    { icon: CreditCard,      label: 'Subscriptions',  path: '/payments',       roles: ['super_admin'] },
    { icon: ScrollText,      label: 'System Logs',    path: '/logs',           roles: ['super_admin'] },
    { icon: BarChart2,       label: 'System Reports', path: '/system-reports', roles: ['super_admin'] },
    { icon: Users,           label: 'Staff',          path: '/staff',          roles: ['owner'] },
    { icon: Settings,        label: 'Settings',       path: '/settings',       roles: ['owner'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    owner: 'Owner',
    storekeeper: 'Storekeeper',
    receptionist: 'Reception',
    bar: 'Bar',
    fnb: 'Restaurant & BBQ',
  };
  const deskLabel = roleLabel[user.role] ?? `Unknown (${user.role})`;

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  const navLinkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative',
      isActive
        ? 'bg-[#007AAD]/10 text-white font-semibold nav-active-bar shadow-sm'
        : 'text-white/70 hover:bg-white/8 hover:text-white'
    );

  const iconMark = (size: 'sm' | 'md' = 'md') => (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center flex-shrink-0 shadow-md bg-[#007AAD] ring-2 ring-[#007AAD]/25',
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
      )}
      
    >
      <Store className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} style={{ color: BRAND.white }} />
    </div>
  );

  const avatarMark = () => (
    <div
      className="w-8 h-8 rounded-full flex items-center bg-[#007AAD] justify-center ring-2 ring-[#007AAD]/35 shadow-sm"
    
    >
      <span className="text-xs font-bold" style={{ color: BRAND.white }}>
        {user.name.charAt(0)}
      </span>
    </div>
  );

  // Mobile: hamburger bar + slide-over drawer
  if (isMobile) {
    return (
      <>
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 h-14 sidebar-gradient border-b border-white/10 flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {iconMark('sm')}
              <span className="text-sm font-bold tracking-wide" style={{ color: BRAND.white }}>
                Hotelia
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
        )}

        {/* Slide-over sidebar */}
        <aside className={cn(
          'fixed top-0 left-0 h-screen w-64 sidebar-gradient border-r border-white/10 z-50 flex flex-col transition-transform duration-300 shadow-2xl',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="flex items-center justify-between px-4 h-14 border-b border-white/10">
            <div className="flex items-center gap-2">
              {iconMark('sm')}
              <span className="text-sm font-bold tracking-wide" style={{ color: BRAND.white }}>
                Hotelia
              </span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-auto">
            {filteredNav.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={navLinkClass(isActive)}
                >
                  <item.icon
                    className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-[#007AAD]')}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-3 mb-3">
              {avatarMark()}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: BRAND.white }}>{user.name}</p>
                <p className="text-[10px] text-white/55">{deskLabel}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-red-500/15 hover:text-red-300 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
            {canInstall && (
              <button
                onClick={triggerInstall}
                className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full"
                style={{ color: BRAND.accent }}
              >
                <Download className="w-4 h-4" />
                <span>Install App</span>
              </button>
            )}
          </div>
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className={cn(
      'sidebar-gradient h-screen flex flex-col border-r border-white/10 transition-all duration-300 fixed left-0 top-0 z-40 shadow-2xl',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        {iconMark('md')}
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 className="text-sm font-bold tracking-wide" style={{ color: BRAND.white }}>
              Hotelia
            </h1>
            <p className="text-[10px] text-white/50 tracking-wider uppercase">Inventory & Sales</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-auto">
        {filteredNav.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={navLinkClass(isActive)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-[#007AAD]')}
              />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Theme & Fullscreen toggles */}
      <div className="px-2 py-2 space-y-0.5 border-t border-white/10">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors w-full"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <span className="animate-fade-in">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors w-full"
        >
          {isFullscreen ? <Minimize className="w-5 h-5 flex-shrink-0" /> : <Maximize className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <span className="animate-fade-in">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>}
        </button>
      </div>

      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3 animate-fade-in">
            {avatarMark()}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: BRAND.white }}>{user.name}</p>
              <p className="text-[10px] text-white/55">{deskLabel}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-red-500/15 hover:text-red-300 transition-colors flex-1"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-white/70 hover:bg-white/8 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        {canInstall && !collapsed && (
          <button
            onClick={triggerInstall}
            className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[#007AAD]/15 transition-colors w-full"
            style={{ color: BRAND.accent }}
          >
            <Download className="w-4 h-4" />
            <span>Install App</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
