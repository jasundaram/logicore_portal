import React, { useState, useEffect } from 'react';
import { 
  Truck, LogOut, Shield, User as UserIcon, RefreshCw, 
  MapPin, HelpCircle, BookOpen, Layers, CheckCircle 
} from 'lucide-react';
import { User, Order, Zone, RateCard, SurchargeConfig, NotificationLog } from './types';
import AuthScreen from './components/AuthScreen';
import CustomerDashboard from './components/CustomerDashboard';
import AgentDashboard from './components/AgentDashboard';
import AdminDashboard from './components/AdminDashboard';
import NotificationFeed from './components/NotificationFeed';
import SmartAssistant from './components/SmartAssistant';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [surchargeConfig, setSurchargeConfig] = useState<SurchargeConfig>({ codSurchargeB2B: 50, codSurchargeB2C: 20 });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);

  // Page state
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(true);

  // Load initial session on mount
  useEffect(() => {
    const session = localStorage.getItem('logistics_user_session');
    if (session) {
      try {
        setCurrentUser(JSON.parse(session));
      } catch (err) {
        localStorage.removeItem('logistics_user_session');
      }
    }
    setLoading(false);
  }, []);

  const fetchAllData = async () => {
    try {
      // 1. Fetch zones
      const zonesRes = await fetch('/api/zones');
      if (zonesRes.ok) setZones(await zonesRes.ok ? await zonesRes.json() : []);

      // 2. Fetch rates
      const ratesRes = await fetch('/api/rates');
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setRateCards(ratesData.rateCards);
        setSurchargeConfig(ratesData.surchargeConfig);
      }

      // 3. Fetch all users
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) setAllUsers(await usersRes.json());

      // 4. Fetch notifications
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) setNotifications(await notifRes.json());

      // 5. Fetch orders (relative to logged in user role)
      if (currentUser) {
        const ordersUrl = `/api/orders?role=${currentUser.role}&userId=${currentUser.id}`;
        const ordersRes = await fetch(ordersUrl);
        if (ordersRes.ok) setOrders(await ordersRes.json());
      }
    } catch (err) {
      console.error('Error fetching dispatch system data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Setup regular polling for responsive tracking
    const interval = setInterval(fetchAllData, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('logistics_user_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('logistics_user_session');
  };

  // Sandbox Switch User Helper
  const handleSandboxSwitch = async (email: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password' })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        handleLogin(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUserLocally = (updated: User) => {
    setCurrentUser(updated);
    localStorage.setItem('logistics_user_session', JSON.stringify(updated));
    // Persist status back if we have endpoints, or let local state drive sandbox actions
  };

  if (loading) {
    return (
      <div id="loading-spinner" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-semibold mt-3">Opening Dispatch Desk...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased font-sans">
      
      {/* Top Professional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded font-black text-lg italic shadow-xs">
              L
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                LogiCore <span className="text-blue-600 font-light">Portal</span>
              </h1>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                Simple Zoning & Courier Dispatch
              </span>
            </div>
          </div>

          {/* Session Badging & Sandbox controls */}
          {currentUser ? (
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {/* Quick Sandbox Access dropdown */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-slate-700">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Switch Profile:</span>
                <select
                  value={currentUser.email}
                  onChange={(e) => handleSandboxSwitch(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer text-slate-800"
                  id="sandbox-profile-switcher"
                >
                  <option value="admin@logistics.com" className="bg-white text-slate-800">System Admin</option>
                  <option value="customer@gmail.com" className="bg-white text-slate-800">Customer (Jane B2C)</option>
                  <option value="b2bclient@techcorp.com" className="bg-white text-slate-800">Customer (TechCorp B2B)</option>
                  <option value="agent1@delivery.com" className="bg-white text-slate-800">Courier (Alex Carrier)</option>
                </select>
              </div>

              {/* User badge */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <div className="text-right">
                  <div className="font-bold text-xs text-slate-900 leading-tight truncate max-w-[120px]">{currentUser.name}</div>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    currentUser.role === 'admin' ? 'bg-red-50 text-red-700 border-red-100' :
                    currentUser.role === 'agent' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    'bg-indigo-50 text-indigo-700 border-indigo-100'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Sign Out of Portal"
                  id="btn-logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-[10px] font-extrabold text-slate-500 border border-slate-200 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">
              Simulation Sandbox
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Workspace info guide / specifications panel */}
        {showGuide && (
          <div id="welcome-tutorial-guide" className="lg:col-span-12 bg-blue-50/70 border border-blue-100 rounded-2xl p-5 text-xs text-slate-700 flex flex-col md:flex-row justify-between items-start gap-4 shadow-xs animate-fadeIn">
            <div className="space-y-2">
              <h3 className="font-bold text-sm flex items-center gap-1.5 text-blue-900">
                <BookOpen className="h-4 w-4 text-blue-600" /> Dispatch System Tester Walkthrough Guide
              </h3>
              <p className="leading-relaxed text-slate-600">
                This sandbox demonstrates dynamic zoning, real-time pricing calculation, automatic agent dispatch, and delivery reschedule lifecycles.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2.5 text-[11px] text-slate-700 font-medium leading-relaxed">
                <div className="bg-white p-3 rounded-xl border border-blue-100/50 shadow-2xs">
                  <span className="font-bold text-blue-900 block mb-1">Step 1: Book Shipment</span>
                  Switch to <strong>Customer (Jane)</strong>. Fill the order form using a valid area suburb (e.g. <em>Chinatown, Chelsea, Harlem</em>) to trigger zone detection. Select <strong>Estimate Charges</strong> and then <strong>Confirm & Book Order</strong>.
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100/50 shadow-2xs">
                  <span className="font-bold text-blue-900 block mb-1">Step 2: Assign Agent</span>
                  Switch to <strong>System Admin</strong>. Your new shipment appears. Click <strong>Dispatch Actions</strong> &rarr; <strong>Trigger Auto-Assignment Matcher</strong> to auto-assign a nearby active driver.
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100/50 shadow-2xs">
                  <span className="font-bold text-blue-900 block mb-1">Step 3: Update Delivery</span>
                  Switch to <strong>Courier (Alex)</strong>. Locate the assigned order, update status to <strong>Failed</strong> (reason required) to trigger rescheduling! Check the SMS feed on the right.
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100/50 shadow-2xs">
                  <span className="font-bold text-blue-900 block mb-1">Step 4: Reschedule Attempt</span>
                  Switch back to <strong>Customer (Jane)</strong>. Note the Failed warning banner. Click <strong>Reschedule Now</strong> and set a future date. It auto-reassigns to a new courier instantly!
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowGuide(false)}
              className="text-[10px] text-blue-600 font-bold hover:text-blue-800 hover:underline self-end md:self-start mt-1 shrink-0 cursor-pointer"
            >
              Dismiss Guide
            </button>
          </div>
        )}

        {/* Portal Routing switch */}
        <div className="lg:col-span-8 space-y-6">
          {!currentUser ? (
            <AuthScreen onLogin={handleLogin} />
          ) : (
            <>
              {currentUser.role === 'customer' && (
                <CustomerDashboard 
                  user={currentUser} 
                  orders={orders} 
                  zones={zones} 
                  onRefreshOrders={fetchAllData} 
                />
              )}
              {currentUser.role === 'agent' && (
                <AgentDashboard 
                  user={currentUser} 
                  orders={orders} 
                  zones={zones} 
                  onRefreshOrders={fetchAllData}
                  onUpdateUser={handleUpdateUserLocally}
                />
              )}
              {currentUser.role === 'admin' && (
                <AdminDashboard 
                  user={currentUser} 
                  orders={orders} 
                  zones={zones} 
                  rateCards={rateCards} 
                  surchargeConfig={surchargeConfig} 
                  users={allUsers}
                  onRefreshAll={fetchAllData} 
                />
              )}
            </>
          )}
        </div>

        {/* Live Notification feed on the side */}
        <div className="lg:col-span-4">
          <NotificationFeed 
            notifications={notifications} 
            onRefresh={fetchAllData} 
          />
        </div>

      </main>

      {/* Dynamic Floating Smart Copilot */}
      <SmartAssistant currentUser={currentUser} />

      {/* Clean footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>&copy; 2026 LogiCore Logistics Platform. All rights reserved.</p>
          <div className="flex gap-4 text-[10px] text-slate-400 font-medium">
            <span>Status: Live Simulation</span>
            <span>Mode: Local Sandbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
