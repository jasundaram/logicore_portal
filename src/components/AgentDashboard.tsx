import React, { useState } from 'react';
import { 
  Truck, User, MapPin, Scale, Clock, CheckCircle, 
  XCircle, Navigation, Send, RefreshCw, Radio 
} from 'lucide-react';
import { Order, User as UserType, Zone } from '../types';

interface AgentDashboardProps {
  user: UserType;
  orders: Order[];
  zones: Zone[];
  onRefreshOrders: () => void;
  onUpdateUser: (updated: UserType) => void;
}

export default function AgentDashboard({ user, orders, zones, onRefreshOrders, onUpdateUser }: AgentDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [targetStatus, setTargetStatus] = useState<Order['status']>('Picked Up');
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Agent location/availability status updates
  const [activeZone, setActiveZone] = useState(user.currentZone || 'Downtown');
  const [availability, setAvailability] = useState(user.status || 'available');

  const assignedOrders = orders.filter(o => o.agentId === user.id);

  const handleUpdateAgentStatus = async (newAvailability: 'available' | 'busy', newZone: string) => {
    // Simulated updates. For simplicity, we can also post to a backend API or let the client session hold it.
    // Let's call the registration endpoint or simple simulation since they're just in-memory.
    // We will update the user locally and dispatch changes.
    const updatedUser: UserType = {
      ...user,
      status: newAvailability,
      currentZone: newZone
    };
    onUpdateUser(updatedUser);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    if (targetStatus === 'Failed' && !statusComment.trim()) {
      alert('A comment/reason is strictly required for failing a delivery attempt.');
      return;
    }

    setLoadingStatus(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          comment: statusComment || `Status set to ${targetStatus}`,
          actorName: user.name,
          actorRole: 'agent'
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setStatusComment('');
        setSelectedOrder(updated);
        onRefreshOrders();
        // Also update agent availability locally if delivered/failed
        if (targetStatus === 'Delivered' || targetStatus === 'Failed') {
          handleUpdateAgentStatus('available', activeZone);
        } else {
          handleUpdateAgentStatus('busy', activeZone);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Created': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Assigned': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Picked Up': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'In Transit': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Out for Delivery': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Failed': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div id="agent-dashboard-container" className="space-y-6">
      {/* Welcome & Signal panel */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100">
              Courier Hub
            </span>
            <h2 className="text-xl font-extrabold mt-1.5 text-slate-900">Courier Portal: {user.name}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select assigned deliveries, check package sizes, and update status.
            </p>
          </div>

          {/* Availability & Location selector */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Radio className={`h-4 w-4 ${availability === 'available' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
              <span className="font-bold text-slate-600">Duty Status:</span>
              <select
                value={availability}
                onChange={(e) => {
                  const val = e.target.value as 'available' | 'busy';
                  setAvailability(val);
                  handleUpdateAgentStatus(val, activeZone);
                }}
                className="bg-white text-slate-800 rounded-lg px-2.5 py-1 focus:outline-none border border-slate-200 text-xs font-semibold cursor-pointer"
                id="select-duty-status"
              >
                <option value="available" className="bg-white text-slate-800">Active & Available</option>
                <option value="busy" className="bg-white text-slate-800">On Delivery Duty</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-slate-400" />
              <span className="font-bold text-slate-600">Active Zone Hub:</span>
              <select
                value={activeZone}
                onChange={(e) => {
                  setActiveZone(e.target.value);
                  handleUpdateAgentStatus(availability as 'available' | 'busy', e.target.value);
                }}
                className="bg-white text-slate-800 rounded-lg px-2.5 py-1 focus:outline-none border border-slate-200 text-xs font-semibold cursor-pointer"
                id="select-active-zone"
              >
                {zones.map(z => (
                  <option key={z.id} value={z.name} className="bg-white text-slate-800">{z.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Assigned Shipments */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wide">Assigned Delivery Load</h3>
              <p className="text-[11px] text-slate-400">List of orders assigned to your vehicle.</p>
            </div>
            <button
              onClick={onRefreshOrders}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {assignedOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Truck className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-2" />
                <p className="text-xs">No orders assigned to you currently.</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] mx-auto leading-normal">Set duty to "Active & Available" and wait for admin dispatch.</p>
              </div>
            ) : (
              assignedOrders.map((order) => (
                <div
                  key={order.id}
                  id={`agent-order-${order.id}`}
                  onClick={() => {
                    setSelectedOrder(order);
                    setTargetStatus(order.status);
                  }}
                  className={`p-4 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    selectedOrder?.id === order.id
                      ? 'border-blue-500 bg-blue-50/30 shadow-xs'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-bold text-slate-900 text-[11px]">{order.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-slate-600 mb-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wide">Pickup From</span>
                      <p className="font-semibold text-slate-800 truncate">{order.pickupAddress}</p>
                      <p className="text-slate-400 font-medium text-[10px]">{order.pickupArea} ({order.pickupZone})</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wide">Deliver To</span>
                      <p className="font-semibold text-slate-800 truncate">{order.dropAddress}</p>
                      <p className="text-slate-400 font-medium text-[10px]">{order.dropArea} ({order.dropZone})</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-[10px] text-slate-500 font-mono">
                    <span>Pay: <strong className="text-slate-700">{order.paymentType}</strong></span>
                    <span>Charge: <strong className="text-slate-700">${order.totalCharge}</strong></span>
                    <span>Type: <strong className="text-slate-700">{order.orderType}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Update Form */}
        <div className="lg:col-span-6">
          {selectedOrder ? (
            <div id="agent-dispatch-panel" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Delivery Details</span>
                  <h3 className="font-mono font-bold text-sm text-slate-900">{selectedOrder.id}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Package specs summary */}
              <div className="bg-slate-50 rounded-xl p-3.5 text-xs grid grid-cols-2 gap-3.5 border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[9px] block uppercase font-bold tracking-wide">Customer</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{selectedOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] block uppercase font-bold tracking-wide">Chargeable Weight</span>
                  <span className="font-semibold text-slate-800 block mt-0.5 font-mono">{selectedOrder.chargeableWeight} kg</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[9px] block uppercase font-bold tracking-wide">Package Details</span>
                  <span className="font-medium text-slate-600 block mt-0.5">
                    {selectedOrder.length} &times; {selectedOrder.width} &times; {selectedOrder.height} cm (Volumetric: {selectedOrder.volumetricWeight} kg)
                  </span>
                </div>
              </div>

              {/* Status form */}
              <form onSubmit={handleStatusUpdate} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Update Transit Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTargetStatus(st as Order['status'])}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                          targetStatus === st
                            ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                        id={`btn-target-status-${st.replace(/ /g, '-')}`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Courier Remarks {targetStatus === 'Failed' && <span className="text-rose-500 font-bold">* (Required)</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder={targetStatus === 'Failed' 
                      ? 'e.g. Customer unavailable at premises after multiple voice calls.' 
                      : 'e.g. Package loaded securely.'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-850 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                    id="textarea-status-comment"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingStatus}
                  id="btn-dispatch-status"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {loadingStatus ? 'Submitting...' : 'Submit Update'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 shadow-xs">
              <Clock className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-2.5" />
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wide">No Delivery Selected</h4>
              <p className="text-xs mt-1 max-w-[220px] mx-auto leading-normal">Click any assigned consignment card on the left to view details and post status updates.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
