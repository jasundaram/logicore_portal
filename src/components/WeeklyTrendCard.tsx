import React, { useMemo } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, CheckCircle2, Percent, AlertCircle, Calendar, Sparkles, BarChart3, Clock 
} from 'lucide-react';
import { Order } from '../types';

interface WeeklyTrendCardProps {
  orders: Order[];
}

export default function WeeklyTrendCard({ orders }: WeeklyTrendCardProps) {
  // Compute metrics for the last 7 days dynamically
  const trendData = useMemo(() => {
    // Generate dates for the last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }).reverse();

    return days.map(day => {
      // Find orders matching this day (createdAt format is YYYY-MM-DD...)
      const dayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(day));
      
      const delivered = dayOrders.filter(o => o.status === 'Delivered').length;
      const failed = dayOrders.filter(o => o.status === 'Failed').length;
      const totalOutcomes = delivered + failed;

      // SLA success rate: completed successfully vs all terminal states
      const successRate = totalOutcomes > 0 
        ? Math.round((delivered / totalOutcomes) * 100) 
        : 100; // Default to 100% if no terminal states yet

      const formattedLabel = new Date(day).toLocaleDateString([], { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });

      return {
        rawDate: day,
        date: formattedLabel,
        "Order Volume": dayOrders.length,
        "SLA Success Rate (%)": successRate,
        delivered,
        failed
      };
    });
  }, [orders]);

  // Overall weekly stats for the side panel
  const stats = useMemo(() => {
    const last7DaysList = trendData.map(d => d.rawDate);
    const weeklyOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const datePart = o.createdAt.split('T')[0];
      return last7DaysList.includes(datePart);
    });

    const total = weeklyOrders.length;
    const delivered = weeklyOrders.filter(o => o.status === 'Delivered').length;
    const failed = weeklyOrders.filter(o => o.status === 'Failed').length;
    const active = weeklyOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Failed').length;

    const completedOutcomes = delivered + failed;
    const averageSuccess = completedOutcomes > 0 
      ? Math.round((delivered / completedOutcomes) * 100) 
      : 100;

    // Find peak volume day
    let peakDay = 'N/A';
    let peakVal = 0;
    trendData.forEach(d => {
      if (d["Order Volume"] > peakVal) {
        peakVal = d["Order Volume"];
        peakDay = d.date;
      }
    });

    return {
      total,
      delivered,
      failed,
      active,
      averageSuccess,
      peakDay,
      peakVal
    };
  }, [orders, trendData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all hover:shadow-sm" id="weekly-trend-card-container">
      
      {/* Title & Metadata Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4 mb-5">
        <div>
          <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100 flex items-center gap-1.5 w-fit">
            <Clock className="h-3 w-3" /> Real-Time Analytics
          </span>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mt-1.5 flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-blue-600" /> Weekly Dispatch SLA & Volume Trend
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Dual-axis telemetry tracking consignment load vs. SLA performance over the last 7 calendar days.</p>
        </div>
        
        <div className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" /> Active Tracking Period
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Recharts Composed Chart (8 cols) */}
        <div className="lg:col-span-8 bg-slate-50/30 rounded-2xl p-4 border border-slate-100/80">
          <div className="h-64 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData}
                margin={{ top: 10, right: -5, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  stroke="#94a3b8" 
                  fontFamily="Inter, sans-serif"
                  dy={8}
                />
                
                {/* Left Axis: Volume */}
                <YAxis 
                  yAxisId="left"
                  tickLine={false} 
                  axisLine={false} 
                  stroke="#3b82f6" 
                  fontFamily="Inter, sans-serif"
                  allowDecimals={false}
                />
                
                {/* Right Axis: SLA % */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickLine={false} 
                  axisLine={false} 
                  stroke="#10b981" 
                  domain={[0, 100]}
                  fontFamily="Inter, sans-serif"
                  formatter={(val) => `${val}%`}
                  dx={10}
                />

                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    fontFamily: 'Inter, sans-serif'
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
                
                {/* Reference line for 90% SLA target */}
                <ReferenceLine 
                  yAxisId="right" 
                  y={90} 
                  stroke="#f43f5e" 
                  strokeDasharray="4 4" 
                  label={{ value: 'SLA Target (90%)', fill: '#f43f5e', fontSize: 8, position: 'insideBottomRight', dy: -4 }} 
                />

                {/* Composed Chart Elements */}
                <Bar 
                  yAxisId="left" 
                  dataKey="Order Volume" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={32}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="SLA Success Rate (%)" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }} 
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side: Quick Stats & Insights (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          
          {/* Main SLA Percent Card */}
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 text-emerald-950 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Weekly SLA Integrity</span>
              <Percent className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-emerald-900">{stats.averageSuccess}%</span>
              <span className="text-[10px] text-emerald-600 font-bold">avg success</span>
            </div>
            <p className="text-[10px] leading-relaxed text-emerald-700/80">
              Based on terminal states ({stats.delivered} successful, {stats.failed} failed) registered over the last 7 days.
            </p>
          </div>

          {/* Core Telemetry Counts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Weekly Bookings</span>
              <span className="text-lg font-bold text-slate-800 font-mono">{stats.total}</span>
              <span className="text-[8px] text-slate-500 block font-semibold">{stats.active} active route</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Peak Day Volume</span>
              <span className="text-lg font-bold text-slate-800 font-mono">{stats.peakVal}</span>
              <span className="text-[8px] text-slate-500 block font-semibold truncate" title={stats.peakDay}>{stats.peakDay}</span>
            </div>
          </div>

          {/* SLA Performance status callout */}
          <div className={`p-3.5 rounded-xl border flex gap-3 items-start text-[10px] leading-relaxed ${
            stats.averageSuccess >= 90 
              ? 'bg-blue-50/40 border-blue-100 text-blue-900' 
              : 'bg-amber-50/40 border-amber-100 text-amber-900'
          }`}>
            {stats.averageSuccess >= 90 ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase text-[9px] block mb-0.5 text-blue-800">Operational Target Achieved</span>
                  Delivery SLA currently is above the 90% performance baseline. Dispatch operations are performing optimally.
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase text-[9px] block mb-0.5 text-amber-800">Baselines Below Target</span>
                  Weekly SLA average is below the 90% benchmark. Review zoning coverages or courier assignments.
                </div>
              </>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
