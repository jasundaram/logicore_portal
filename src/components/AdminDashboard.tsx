import React, { useState, useEffect } from 'react';
import { 
  Settings, Layers, DollarSign, Plus, Trash2, Edit3, UserCheck, 
  Search, Filter, Package, MapPin, Truck, RefreshCw, Send, Sparkles, 
  Grid, HelpCircle, CheckCircle, Info, ArrowRight, User, BarChart3
} from 'lucide-react';
import { Order, User as UserType, Zone, RateCard, SurchargeConfig } from '../types';
import AnalyticsDashboard from './AnalyticsDashboard';
import WeeklyTrendCard from './WeeklyTrendCard';

interface AdminDashboardProps {
  user: UserType;
  orders: Order[];
  zones: Zone[];
  rateCards: RateCard[];
  surchargeConfig: SurchargeConfig;
  users: UserType[];
  onRefreshAll: () => void;
}

export default function AdminDashboard({ 
  user, orders, zones, rateCards, surchargeConfig, users, onRefreshAll 
}: AdminDashboardProps) {
  
  // Tabs within Admin panel
  const [adminTab, setAdminTab] = useState<'orders' | 'zones' | 'rates' | 'proxy' | 'analytics'>('orders');

  // Filters for orders list
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterZone, setFilterZone] = useState<string>('');
  const [filterAgent, setFilterAgent] = useState<string>('');

  // Zone Manager Form state
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneAreasText, setZoneAreasText] = useState('');
  const [zoneMsg, setZoneMsg] = useState('');

  // Rate configuration state
  const [cards, setCards] = useState<RateCard[]>(rateCards);
  const [codB2B, setCodB2B] = useState(surchargeConfig.codSurchargeB2B);
  const [codB2C, setCodB2C] = useState(surchargeConfig.codSurchargeB2C);
  const [rateMsg, setRateMsg] = useState('');

  // Manual & Override actions
  const [assigneeAgentId, setAssigneeAgentId] = useState<string>('');
  const [overrideStatus, setOverrideStatus] = useState<Order['status']>('Created');
  const [actionComment, setActionComment] = useState('');
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  // Proxy Booking state
  const [proxyCustId, setProxyCustId] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupArea, setPickupArea] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [dropArea, setDropArea] = useState('');
  const [length, setLength] = useState('30');
  const [width, setWidth] = useState('20');
  const [height, setHeight] = useState('15');
  const [actualWeight, setActualWeight] = useState('2');
  const [orderType, setOrderType] = useState<'B2B' | 'B2C'>('B2C');
  const [paymentType, setPaymentType] = useState<'Prepaid' | 'COD'>('Prepaid');
  const [proxyCalc, setProxyCalc] = useState<any>(null);
  const [proxyError, setProxyError] = useState('');
  const [proxySuccess, setProxySuccess] = useState(false);

  // Sync prop state
  useEffect(() => {
    setCards(rateCards);
    setCodB2B(surchargeConfig.codSurchargeB2B);
    setCodB2C(surchargeConfig.codSurchargeB2C);
  }, [rateCards, surchargeConfig]);

  // Handle Rate Card Policy updates
  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateMsg('');
    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateCards: cards,
          surchargeConfig: {
            codSurchargeB2B: Number(codB2B),
            codSurchargeB2C: Number(codB2C)
          }
        })
      });
      if (res.ok) {
        setRateMsg('Rate cards and surcharges persisted successfully.');
        onRefreshAll();
      }
    } catch (err) {
      setRateMsg('Failed to update policies.');
    }
  };

  const handleRateCardChange = (id: string, field: keyof RateCard, value: number) => {
    setCards(prev => prev.map(rc => rc.id === id ? { ...rc, [field]: Number(value) } : rc));
  };

  // Handle Zone Form updates
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName || !zoneAreasText) {
      setZoneMsg('Zone Name and coverage areas list are required.');
      return;
    }
    const areas = zoneAreasText.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedZoneId || undefined,
          name: zoneName,
          coverageAreas: areas
        })
      });
      if (res.ok) {
        setZoneMsg(selectedZoneId ? 'Zone updated successfully' : 'Zone created successfully');
        setZoneName('');
        setZoneAreasText('');
        setSelectedZoneId(null);
        onRefreshAll();
      }
    } catch (err) {
      setZoneMsg('Zoning error');
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;
    try {
      const res = await fetch(`/api/zones/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Agent manual or automatic assignment
  const handleAssignAgent = async (orderId: string, mode: 'manual' | 'auto') => {
    if (mode === 'manual' && !assigneeAgentId) {
      alert('Select a courier carrier agent first.');
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: assigneeAgentId || undefined,
          mode
        })
      });
      if (res.ok) {
        setActionOrderId(null);
        setAssigneeAgentId('');
        onRefreshAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Assignment failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Admin status override
  const handleOverrideStatus = async (orderId: string) => {
    if (!actionComment.trim()) {
      alert('An override justification is required.');
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: overrideStatus,
          comment: `ADMIN OVERRIDE: ${actionComment}`,
          actorName: `Admin (${user.name})`,
          actorRole: 'admin'
        })
      });
      if (res.ok) {
        setActionOrderId(null);
        setActionComment('');
        onRefreshAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Proxy Order charge calculation
  const handleProxyCalculate = async () => {
    if (!pickupArea || !dropArea || !length || !width || !height || !actualWeight) {
      setProxyError('Please specify pickup/drop zones and size specs.');
      return;
    }
    setProxyError('');
    try {
      const res = await fetch('/api/orders/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupArea,
          dropArea,
          length: Number(length),
          width: Number(width),
          height: Number(height),
          actualWeight: Number(actualWeight),
          orderType,
          paymentType
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProxyCalc(data);
      } else {
        setProxyError(data.error || 'Calc error');
      }
    } catch (err) {
      setProxyError('Backend unavailable');
    }
  };

  // Proxy Order placement
  const handleProxyBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proxyCustId || !pickupAddress || !pickupArea || !dropAddress || !dropArea) {
      setProxyError('Please complete all client, pickup and delivery address fields.');
      return;
    }
    setProxyError('');
    try {
      const customer = users.find(u => u.id === proxyCustId);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: proxyCustId,
          customerName: customer?.name || 'On Behalf Client',
          customerEmail: customer?.email || '',
          pickupAddress,
          pickupArea,
          dropAddress,
          dropArea,
          length: Number(length),
          width: Number(width),
          height: Number(height),
          actualWeight: Number(actualWeight),
          orderType,
          paymentType,
          actorName: `Admin (${user.name})`,
          actorRole: 'admin'
        })
      });
      if (res.ok) {
        setProxySuccess(true);
        // Reset Form
        setProxyCustId('');
        setPickupAddress('');
        setPickupArea('');
        setDropAddress('');
        setDropArea('');
        setProxyCalc(null);
        onRefreshAll();
        setTimeout(() => {
          setProxySuccess(false);
          setAdminTab('orders');
        }, 1500);
      } else {
        const data = await res.json();
        setProxyError(data.error || 'Failed proxy placement');
      }
    } catch (err) {
      setProxyError('Proxy placement failed');
    }
  };

  // Filtration logic
  const filteredOrders = orders.filter(o => {
    const matchStatus = !filterStatus || o.status === filterStatus;
    const matchZone = !filterZone || o.pickupZone === filterZone || o.dropZone === filterZone;
    const matchAgent = !filterAgent || o.agentId === filterAgent;
    return matchStatus && matchZone && matchAgent;
  });

  const availableAgents = users.filter(u => u.role === 'agent' && u.status === 'available');
  const allAgents = users.filter(u => u.role === 'agent');
  const customersList = users.filter(u => u.role === 'customer');
  const coverageAreasList = zones.flatMap(z => z.coverageAreas);

  return (
    <div id="admin-dashboard-container" className="space-y-6">
      {/* Control Navigation Header */}
      <div className="bg-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs border border-slate-200">
        <div>
          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100">
            System Operations Admin Panel
          </span>
          <h2 className="text-xl font-extrabold mt-1.5 flex items-center gap-2 text-slate-900">
            Operations Center <span className="text-slate-400 font-normal text-xs font-mono">ID: {user.email}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch routes, configure coverage areas, manage pricing policies, and execute on-behalf bookings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'orders', label: 'Dispatcher Deck', icon: Grid },
            { id: 'zones', label: 'Zoning Coverages', icon: Layers },
            { id: 'rates', label: 'Rates & COD', icon: DollarSign },
            { id: 'proxy', label: 'Proxy Booking', icon: Sparkles },
            { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 }
          ].map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  adminTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800 hover:bg-slate-50'
                }`}
                id={`tab-admin-${tab.id}`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main interactive cards split */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* TAB 1: DISPATCHER DECK */}
        {adminTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Operational Consignment Manifest</h3>
                <p className="text-xs text-slate-400 mt-1">Monitor all physical parcel routes. Assign couriers manually or intelligently.</p>
              </div>
              <button
                onClick={onRefreshAll}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer self-end sm:self-auto"
                title="Reload Operations Data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Weekly telemetry trend card using Recharts */}
            <WeeklyTrendCard orders={orders} />

            {/* Robust Filtration deck */}
            <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Filter Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2.5 bg-white text-slate-700 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 text-xs transition-colors cursor-pointer"
                  id="filter-admin-status"
                >
                  <option value="">-- All Lifecycle Stages --</option>
                  <option value="Created">Created (Unassigned)</option>
                  <option value="Assigned">Assigned (Pending Pick)</option>
                  <option value="Picked Up">Picked Up</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered (Success)</option>
                  <option value="Failed">Failed (Exception)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Filter Zone Presence</label>
                <select
                  value={filterZone}
                  onChange={(e) => setFilterZone(e.target.value)}
                  className="w-full p-2.5 bg-white text-slate-700 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 text-xs transition-colors cursor-pointer"
                  id="filter-admin-zone"
                >
                  <option value="">-- All Territory Zones --</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Filter Dispatcher Agent</label>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="w-full p-2.5 bg-white text-slate-700 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 text-xs transition-colors cursor-pointer"
                  id="filter-admin-agent"
                >
                  <option value="">-- All Courier Partners --</option>
                  {allAgents.map(ag => (
                    <option key={ag.id} value={ag.id}>{ag.name} ({ag.currentZone || 'Unspecified'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Main Manifest Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
              <table className="min-w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Zones (Pick &rarr; Drop)</th>
                    <th className="p-4">Route Addresses</th>
                    <th className="p-4">Type / Charge</th>
                    <th className="p-4">Courier Partner</th>
                    <th className="p-4">Stage Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 bg-slate-50/20">
                        <Package className="h-8 w-8 mx-auto stroke-1 mb-3 text-slate-300" />
                        No orders match the current manifest filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/55 transition-colors" id={`admin-row-${order.id}`}>
                        <td className="p-4 font-mono font-bold text-slate-900">{order.id}</td>
                        <td className="p-4 font-bold text-slate-850">{order.customerName}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold text-[10px] text-slate-600">{order.pickupZone}</span>
                            <span className="text-slate-400">&rarr;</span>
                            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold text-[10px] text-slate-600">{order.dropZone}</span>
                          </div>
                        </td>
                        <td className="p-4 truncate max-w-[180px] text-slate-650 leading-normal" title={`From: ${order.pickupAddress} To: ${order.dropAddress}`}>
                          <span className="block text-slate-400 text-[10px] font-bold uppercase">Pick:</span> {order.pickupAddress}
                          <span className="block text-slate-400 text-[10px] font-bold uppercase mt-1">Drop:</span> {order.dropAddress}
                        </td>
                        <td className="p-4 text-slate-650">
                          <span className="font-bold text-slate-800">{order.orderType}</span> / <span className="text-slate-500">{order.paymentType}</span> <br />
                          <span className="font-extrabold text-slate-900 font-mono mt-0.5 block">${order.totalCharge}</span>
                        </td>
                        <td className="p-4">
                          {order.agentName ? (
                            <span className="flex items-center gap-1.5 text-slate-750 font-semibold">
                              <Truck className="h-3.5 w-3.5 text-slate-400" />
                              {order.agentName}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold italic text-[11px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border tracking-wider ${
                            order.status === 'Created' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            order.status === 'Assigned' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            order.status === 'Picked Up' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            order.status === 'In Transit' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            order.status === 'Out for Delivery' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setActionOrderId(order.id);
                              setOverrideStatus(order.status);
                            }}
                            className="text-[10px] uppercase tracking-wider bg-white hover:bg-slate-50 text-slate-650 border border-slate-200 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                            id={`btn-manage-${order.id}`}
                          >
                            Dispatch Actions
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Popup modal wrapper */}
            {actionOrderId && (
              <div id="dispatch-action-modal" className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-6 space-y-5 animate-fadeIn shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Dispatch Operations Control Panel &mdash; {actionOrderId}
                    </h4>
                  </div>
                  <button 
                    onClick={() => setActionOrderId(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Close Control
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Operation 1: Dynamic Courier Intelligent Assignment */}
                  <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <h5 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <Truck className="h-4 w-4 text-slate-400" /> Carrier Partner Assignment
                    </h5>
                    
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Manual Assign Courier</label>
                      <div className="flex gap-2">
                        <select
                          value={assigneeAgentId}
                          onChange={(e) => setAssigneeAgentId(e.target.value)}
                          className="flex-1 p-2 bg-white text-slate-700 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                          id="select-courier"
                        >
                          <option value="">-- Choose Available Driver --</option>
                          {availableAgents.map(ag => (
                            <option key={ag.id} value={ag.id}>
                              {ag.name} ({ag.currentZone || 'No Hub'})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssignAgent(actionOrderId, 'manual')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-[11px] px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                          id="btn-assign-manual"
                        >
                          Assign
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">Intelligent Auto-Matching Mode</span>
                      <button
                        onClick={() => handleAssignAgent(actionOrderId, 'auto')}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                        id="btn-assign-auto"
                      >
                        <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" /> Trigger Auto-Assignment Matcher
                      </button>
                      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                        Matches parcel pickup coordinates to the closest available carrier inside <strong>{orders.find(o=>o.id===actionOrderId)?.pickupZone}</strong> automatically.
                      </p>
                    </div>
                  </div>

                  {/* Operation 2: Admin Status Override */}
                  <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <h5 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <Settings className="h-4 w-4 text-slate-400" /> Admin Lifecycle Override
                    </h5>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Override Lifecycle Stage</label>
                      <select
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value as Order['status'])}
                        className="w-full p-2 bg-white text-slate-700 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                        id="select-override-status"
                      >
                        <option value="Created">Created</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Picked Up">Picked Up</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Override Justification Comment</label>
                      <input
                        type="text"
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        placeholder="e.g. Cleared manual inspection block at warehouse."
                        className="w-full p-2 bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 transition-colors"
                        id="input-override-comment"
                      />
                    </div>

                    <button
                      onClick={() => handleOverrideStatus(actionOrderId)}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold uppercase tracking-wider py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                      id="btn-override-submit"
                    >
                      Enforce Status Override
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ZONING COVERAGES */}
        {adminTab === 'zones' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Zone Manager List */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Operational Territory Zones</h3>
                <p className="text-xs text-slate-400 mt-1">View and partition coverage areas into administrative zones for localized assignment and tariffs.</p>
              </div>

              <div className="space-y-4">
                {zones.map(z => (
                  <div key={z.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex justify-between items-start text-xs">
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-850 text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" /> {z.name}
                      </h4>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {z.coverageAreas.map(area => (
                          <span key={area} className="bg-white border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedZoneId(z.id);
                          setZoneName(z.name);
                          setZoneAreasText(z.coverageAreas.join(', '));
                        }}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shadow-2xs"
                        title="Edit Zone"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteZone(z.id)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                        title="Delete Zone"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone Configuration Form */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">{selectedZoneId ? 'Modify Territory Zone' : 'Create Territory Zone'}</h3>
              
              {zoneMsg && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold">
                  {zoneMsg}
                </div>
              )}

              <form onSubmit={handleSaveZone} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Zone Label Name</label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    placeholder="e.g. East Coast Suburbs"
                    className="w-full px-3 py-2 bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 transition-colors"
                    id="input-zone-name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Coverage Areas (Comma Separated)</label>
                  <textarea
                    rows={4}
                    value={zoneAreasText}
                    onChange={(e) => setZoneAreasText(e.target.value)}
                    placeholder="e.g. Eastside, Queens, Brooklyn, Staten Island"
                    className="w-full px-3 py-2 bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 transition-colors"
                    id="textarea-zone-areas"
                  />
                  <span className="text-[10px] text-slate-400 leading-normal block mt-1.5">
                    Customers placing orders matching any of these comma-separated strings will auto-assign to this Zone.
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                    id="btn-zone-submit"
                  >
                    {selectedZoneId ? 'Apply Modifications' : 'Create Zone Policy'}
                  </button>
                  {selectedZoneId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedZoneId(null);
                        setZoneName('');
                        setZoneAreasText('');
                      }}
                      className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold uppercase tracking-wider cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: RATE POLICY GRIDS */}
        {adminTab === 'rates' && (
          <form onSubmit={handleSaveRates} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Base Rates & COD Tariff Matrices</h3>
              <p className="text-xs text-slate-400 mt-1">Configure delivery pricing lookup grids. System bills the higher weight, applies the policy card, and adds the specified COD transactional surcharge.</p>
            </div>

            {rateMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold">
                {rateMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map((card, idx) => (
                <div key={card.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                      {card.zoneType === 'intra' ? 'Intra-Zone (Same)' : 'Inter-Zone (Cross)'} &mdash; <strong className="text-slate-650 font-bold">{card.orderType}</strong>
                    </span>
                    <span className="text-[9px] font-bold bg-white px-2.5 py-0.5 rounded border border-slate-200 text-slate-500 uppercase tracking-wider">
                      Policy #{idx+1}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Base Rate ($)</label>
                      <input
                        type="number"
                        value={card.baseRate}
                        onChange={(e) => handleRateCardChange(card.id, 'baseRate', Number(e.target.value))}
                        className="w-full p-2.5 bg-white text-slate-800 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Limit (kg)</label>
                      <input
                        type="number"
                        value={card.baseWeightLimit}
                        onChange={(e) => handleRateCardChange(card.id, 'baseWeightLimit', Number(e.target.value))}
                        className="w-full p-2.5 bg-white text-slate-800 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Overage/Kg ($)</label>
                      <input
                        type="number"
                        value={card.perKgRate}
                        onChange={(e) => handleRateCardChange(card.id, 'perKgRate', Number(e.target.value))}
                        className="w-full p-2.5 bg-white text-slate-800 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-600 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* COD Surcharges per Order Type */}
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">COD Surcharge Policy per Customer Class</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">B2C COD Surcharge ($)</label>
                  <input
                    type="number"
                    value={codB2C}
                    onChange={(e) => setCodB2C(Number(e.target.value))}
                    className="w-full p-2.5 bg-white text-slate-850 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">B2B COD Surcharge ($)</label>
                  <input
                    type="number"
                    value={codB2B}
                    onChange={(e) => setCodB2B(Number(e.target.value))}
                    className="w-full p-2.5 bg-white text-slate-850 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              id="btn-save-rates"
            >
              Commit Pricing Rate Grids
            </button>
          </form>
        )}

        {/* TAB 4: PROXY BOOKING */}
        {adminTab === 'proxy' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wide">On-Behalf Proxy Client Booking</h3>
                <p className="text-xs text-slate-400 mt-1">Register a delivery manually on behalf of any registered customer in the platform database.</p>
              </div>
            </div>

            {proxySuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Proxy Order processed successfully! Charge calculated and simulated notifications fired.
              </div>
            )}

            {proxyError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {proxyError}
              </div>
            )}

            <form onSubmit={handleProxyBook} className="space-y-6">
              {/* Select Client */}
              <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200">
                <label className="block text-[10px] text-slate-450 font-bold uppercase mb-2 tracking-wider">Target Registered Customer</label>
                <select
                  required
                  value={proxyCustId}
                  onChange={(e) => setProxyCustId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                  id="select-proxy-customer"
                >
                  <option value="">-- Choose Client Profile --</option>
                  {customersList.map(cust => (
                    <option key={cust.id} value={cust.id}>{cust.name} ({cust.email})</option>
                  ))}
                </select>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-slate-50/40 p-5 border border-slate-200 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> Pickup Point
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Coverage Area Suburb</label>
                    <select
                      value={pickupArea}
                      onChange={(e) => setPickupArea(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                    >
                      <option value="">-- Choose Serviced Suburb --</option>
                      {coverageAreasList.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Street Address</label>
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Suite 101, Business Tower"
                      className="w-full px-3 py-2.5 bg-white text-slate-850 placeholder-slate-400 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50/40 p-5 border border-slate-200 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> Dropoff Destination
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Coverage Area Suburb</label>
                    <select
                      value={dropArea}
                      onChange={(e) => setDropArea(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                    >
                      <option value="">-- Choose Serviced Suburb --</option>
                      {coverageAreasList.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Street Address</label>
                    <input
                      type="text"
                      value={dropAddress}
                      onChange={(e) => setDropAddress(e.target.value)}
                      placeholder="Floor 4, Apartment 2B"
                      className="w-full px-3 py-2.5 bg-white text-slate-850 placeholder-slate-400 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Package specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4 bg-slate-50/40 p-5 border border-slate-200 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Parcel Specs</h4>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Dimensions (L x W x H cm)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        placeholder="L (cm)"
                        className="w-full p-2.5 bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-600 transition-colors"
                      />
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="W (cm)"
                        className="w-full p-2.5 bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-600 transition-colors"
                      />
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="H (cm)"
                        className="w-full p-2.5 bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-600 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Actual Weight (kg)</label>
                    <input
                      type="number"
                      value={actualWeight}
                      onChange={(e) => setActualWeight(e.target.value)}
                      className="w-full p-2.5 bg-white text-slate-805 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50/40 p-5 border border-slate-200 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Delivery Settings</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Client Profile</span>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as any)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                      >
                        <option value="B2C">B2C Profile</option>
                        <option value="B2B">B2B Profile</option>
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Bill Mode</span>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as any)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                      >
                        <option value="Prepaid">Prepaid</option>
                        <option value="COD">COD (Collect)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculations estimate & action */}
              <div className="border-t border-slate-100 pt-6 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleProxyCalculate}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
                  id="btn-proxy-estimate"
                >
                  Estimate Proxy Charges
                </button>
                <button
                  type="submit"
                  disabled={!proxyCalc}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white border border-transparent font-bold uppercase tracking-wider py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                  id="btn-proxy-submit"
                >
                  Book Proxy Order
                </button>
              </div>
            </form>

            {proxyCalc && (
              <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-4">
                <div className="flex justify-between font-bold border-b border-slate-100 pb-2">
                  <span className="text-slate-800 font-bold uppercase tracking-wide text-[11px]">Proxy Tariff Analysis</span>
                  <span className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider font-bold">Chargeable Weight: {proxyCalc.chargeableWeight} kg</span>
                </div>
                <div className="space-y-2 text-slate-650">
                  <div className="flex justify-between">
                    <span>Base Cargo Carriage Charge</span>
                    <span className="font-mono text-slate-800">${proxyCalc.baseRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overage Weight Charge</span>
                    <span className="font-mono text-slate-800">${proxyCalc.weightSurplusCharge.toFixed(2)}</span>
                  </div>
                  {proxyCalc.codSurcharge > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>COD Transaction Surcharge</span>
                      <span className="font-mono">+${proxyCalc.codSurcharge.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center font-bold">
                  <span className="text-slate-900 uppercase tracking-wider text-[11px] font-extrabold">Total Quote</span>
                  <span className="text-lg text-slate-950 font-mono">${proxyCalc.totalCharge.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ANALYTICS DASHBOARD */}
        {adminTab === 'analytics' && (
          <AnalyticsDashboard orders={orders} zones={zones} />
        )}

      </div>
    </div>
  );
}

