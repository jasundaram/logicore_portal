import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, DollarSign, Package, CheckCircle2, AlertTriangle, 
  Truck, ArrowUpRight, BarChart3, PieChartIcon, Percent, Map
} from 'lucide-react';
import { Order, Zone } from '../types';

interface AnalyticsDashboardProps {
  orders: Order[];
  zones: Zone[];
}

export default function AnalyticsDashboard({ orders, zones }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'zones' | 'status'>('overview');

  // Calculate General KPIs
  const kpis = useMemo(() => {
    const total = orders.length;
    const delivered = orders.filter(o => o.status === 'Delivered').length;
    const failed = orders.filter(o => o.status === 'Failed').length;
    const active = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Failed').length;
    const grossRevenue = orders
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => sum + o.totalCharge, 0);

    const successRate = total > 0 
      ? ((delivered / (delivered + failed || 1)) * 100) 
      : 0;

    return {
      total,
      delivered,
      failed,
      active,
      grossRevenue,
      successRate: successRate || 100
    };
  }, [orders]);

  // Aggregate Data by Zone
  const zoneData = useMemo(() => {
    return zones.map(zone => {
      // Filter orders where pickup or drop is in this zone
      const pickupOrders = orders.filter(o => o.pickupZone === zone.name);
      const dropOrders = orders.filter(o => o.dropZone === zone.name);
      const allZoneOrders = orders.filter(o => o.pickupZone === zone.name || o.dropZone === zone.name);

      const completed = allZoneOrders.filter(o => o.status === 'Delivered').length;
      const failed = allZoneOrders.filter(o => o.status === 'Failed').length;
      const active = allZoneOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Failed').length;

      const pickupRevenue = pickupOrders
        .filter(o => o.status === 'Delivered')
        .reduce((sum, o) => sum + o.totalCharge, 0);
      const dropRevenue = dropOrders
        .filter(o => o.status === 'Delivered')
        .reduce((sum, o) => sum + o.totalCharge, 0);
      const totalRevenue = allZoneOrders
        .filter(o => o.status === 'Delivered')
        .reduce((sum, o) => sum + o.totalCharge, 0);

      const successRate = (completed + failed) > 0
        ? Math.round((completed / (completed + failed)) * 100)
        : 100;

      return {
        name: zone.name,
        pickupVolume: pickupOrders.length,
        dropVolume: dropOrders.length,
        totalVolume: allZoneOrders.length,
        completed,
        failed,
        active,
        pickupRevenue,
        dropRevenue,
        totalRevenue,
        successRate
      };
    });
  }, [orders, zones]);

  // Aggregate Data by Lifecycle Status
  const statusData = useMemo(() => {
    const statuses = ['Created', 'Assigned', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'];
    const colors = ['#60a5fa', '#c084fc', '#818cf8', '#3b82f6', '#fbbf24', '#34d399', '#f87171'];
    
    return statuses.map((status, idx) => {
      const count = orders.filter(o => o.status === status).length;
      return {
        name: status,
        value: count,
        color: colors[idx]
      };
    }).filter(s => s.value > 0); // Only show non-zero statuses in pie chart
  }, [orders]);

  // Daily Order Trend (last 7 days helper)
  const trendData = useMemo(() => {
    // Generate last 7 days keys
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return days.map(day => {
      const dayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(day));
      const revenue = dayOrders
        .filter(o => o.status === 'Delivered')
        .reduce((sum, o) => sum + o.totalCharge, 0);
      
      const formattedDate = new Date(day).toLocaleDateString([], { month: 'short', day: 'numeric' });

      return {
        date: formattedDate,
        volume: dayOrders.length,
        revenue: Math.round(revenue)
      };
    });
  }, [orders]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6" id="analytics-dashboard-root">
      
      {/* Header section with tab filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Business Intelligence & Analytics Deck</h3>
          <p className="text-xs text-slate-400 mt-1">Real-time analysis of dispatch metrics, zone coverage efficiency, and cargo tariffs.</p>
        </div>
        
        {/* Sub tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
          >
            Overview Trends
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'zones' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
          >
            Zone Efficiency
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'status' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
          >
            Status Breakdown
          </button>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Gross Consignments */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Bookings</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{kpis.total}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Truck className="h-3 w-3 text-slate-400 animate-pulse" /> {kpis.active} active dispatches
            </span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2: Gross Revenue */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Delivered Revenue</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">${kpis.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> Settled / COD included
            </span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3: Delivery Success Rate */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Delivery SLA Success</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{Math.round(kpis.successRate)}%</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {kpis.delivered} Delivered / {kpis.failed} Failed
            </span>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-purple-600">
            <Percent className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4: Zones Coverages */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Territory Coverage</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{zones.length}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Map className="h-3 w-3 text-slate-400" /> All operations operational
            </span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
            <BarChart3 className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Main Charts Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* RENDER TAB 1: OVERVIEW TRENDS */}
        {activeTab === 'overview' && (
          <>
            {/* Daily Volume & Revenue Trend */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" /> Daily Order Activity Trend (Last 7 Days)
                </h4>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" />
                    <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="volume" name="Orders Volume" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Revenue Yield Trend */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Daily Settled Revenue Yield ($)
                </h4>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" />
                    <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                    <Tooltip 
                      formatter={(val) => [`$${val}`, 'Revenue']}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Settled Income ($)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* RENDER TAB 2: ZONE EFFICIENCY */}
        {activeTab === 'zones' && (
          <>
            {/* Zone Order Volumes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" /> Cargo Volume Distributed per Zone
                </h4>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} stroke="#94a3b8" />
                    <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Bar dataKey="pickupVolume" name="Pickup (Origin)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dropVolume" name="Drop (Destination)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Zone Revenue Metrics */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Settled Revenue per Operational Territory
                </h4>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} stroke="#94a3b8" />
                    <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                    <Tooltip 
                      formatter={(val) => [`$${val}`, 'Gross Revenue']}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Bar dataKey="totalRevenue" name="Delivered Revenue ($)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Zone SLA Success Rates */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs lg:col-span-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Percent className="h-4 w-4 text-purple-500" /> Delivery SLA Success Rate per Zone (%)
                </h4>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={zoneData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} stroke="#94a3b8" />
                    <Tooltip 
                      formatter={(val) => [`${val}%`, 'SLA Pass']}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="successRate" name="Completed Delivery SLA (%)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* RENDER TAB 3: STATUS BREAKDOWN */}
        {activeTab === 'status' && (
          <>
            {/* Pie Chart status breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-purple-500" /> Lifecycle Stage Distribution
                </h4>
              </div>
              <div className="h-72 w-full flex items-center justify-center text-xs">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400">No consignment records matching criteria.</div>
                )}
              </div>
            </div>

            {/* Status counts layout table list */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Active Consignments Log
                </h4>
              </div>
              
              <div className="space-y-3.5 text-xs">
                {['Created', 'Assigned', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'].map((status) => {
                  const count = orders.filter(o => o.status === status).length;
                  const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                  
                  const statusColors: Record<string, string> = {
                    'Created': 'bg-sky-50 text-sky-700 border-sky-100',
                    'Assigned': 'bg-purple-50 text-purple-700 border-purple-100',
                    'Picked Up': 'bg-indigo-50 text-indigo-700 border-indigo-100',
                    'In Transit': 'bg-blue-50 text-blue-700 border-blue-100',
                    'Out for Delivery': 'bg-amber-50 text-amber-700 border-amber-100',
                    'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    'Failed': 'bg-rose-50 text-rose-700 border-rose-100'
                  };

                  return (
                    <div key={status} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${statusColors[status]}`}>
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="font-extrabold text-slate-800">{count} units</span>
                        <span className="text-[10px] text-slate-400 font-bold">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

      </div>

    </div>
  );
}
