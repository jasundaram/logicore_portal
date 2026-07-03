import React, { useState, useEffect } from 'react';
import { 
  Package, MapPin, Scale, RefreshCw, Layers, Calendar, 
  Clock, CheckCircle, Truck, CreditCard, HelpCircle, 
  ArrowRight, Sparkles, User, FileText, ChevronRight 
} from 'lucide-react';
import { Order, User as UserType, Zone, RateCard } from '../types';

interface CustomerDashboardProps {
  user: UserType;
  orders: Order[];
  zones: Zone[];
  onRefreshOrders: () => void;
}

export default function CustomerDashboard({ user, orders, zones, onRefreshOrders }: CustomerDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'history' | 'create'>('history');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // New Order Form state
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

  // Calculation state
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [calculation, setCalculation] = useState<{
    pickupZone: string;
    dropZone: string;
    volumetricWeight: number;
    chargeableWeight: number;
    baseRate: number;
    weightSurplusCharge: number;
    codSurcharge: number;
    totalCharge: number;
    isZoneDetected: boolean;
  } | null>(null);

  // Reschedule Form state
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Order submission state
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const coverageAreasList = zones.flatMap(z => z.coverageAreas);

  const calculateRates = async () => {
    if (!pickupArea || !dropArea || !length || !width || !height || !actualWeight) {
      setCalcError('Please specify pickup/drop areas, package dimension and weight to estimate charges.');
      return;
    }
    setCalcError('');
    setCalcLoading(true);
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
        setCalculation(data);
      } else {
        setCalcError(data.error || 'Calculation failed');
      }
    } catch (err) {
      setCalcError('Failed to contact rate calculation engine');
    } finally {
      setCalcLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupAddress || !pickupArea || !dropAddress || !dropArea) {
      setCalcError('All pickup and delivery details are required.');
      return;
    }
    setSubmitLoading(true);
    setCalcError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          customerName: user.name,
          customerEmail: user.email,
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
          actorName: user.name,
          actorRole: 'customer'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitSuccess(true);
        // Clear Form
        setPickupAddress('');
        setPickupArea('');
        setDropAddress('');
        setDropArea('');
        setCalculation(null);
        onRefreshOrders();
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('history');
        }, 2000);
      } else {
        setCalcError(data.error || 'Failed to place order');
      }
    } catch (err) {
      setCalcError('Failed to place order');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleOrderId || !rescheduleDate) return;
    setRescheduleLoading(true);
    try {
      const res = await fetch(`/api/orders/${rescheduleOrderId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate: rescheduleDate,
          comments: rescheduleNotes
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setRescheduleOrderId(null);
        setRescheduleDate('');
        setRescheduleNotes('');
        setSelectedOrder(updated);
        onRefreshOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Keep selected order in sync when orders updates
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
      }
    }
  }, [orders]);

  const getStatusStyle = (status: Order['status']) => {
    switch (status) {
      case 'Created': return 'bg-sky-950/40 text-sky-400 border-sky-900/50';
      case 'Assigned': return 'bg-purple-950/40 text-purple-400 border-purple-900/50';
      case 'Picked Up': return 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50';
      case 'In Transit': return 'bg-blue-950/40 text-blue-400 border-blue-900/50';
      case 'Out for Delivery': return 'bg-amber-950/40 text-amber-400 border-amber-900/50';
      case 'Delivered': return 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50';
      case 'Failed': return 'bg-rose-950/40 text-rose-400 border-rose-900/50 animate-pulse';
      default: return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  return (
    <div id="customer-dashboard-container" className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div>
          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100">
            Customer Portal
          </span>
          <h2 className="text-xl font-extrabold mt-1.5 text-slate-900">Welcome back, {user.name}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Book shipments, calculate instant rates, and track active deliveries.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800 hover:bg-slate-50'
            }`}
            id="tab-cust-history"
          >
            My Shipments
          </button>
          <button
            onClick={() => {
              setActiveTab('create');
              setCalculation(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'create' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800 hover:bg-slate-50'
            }`}
            id="tab-cust-create"
          >
            New Booking
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Form or Order List */}
        <div className="lg:col-span-7 space-y-6">
          {activeTab === 'create' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wide">Book Shipping Consignment</h3>
                  <p className="text-[11px] text-slate-400">Provide pickup and delivery details to estimate charges.</p>
                </div>
              </div>

              {submitSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Order booked successfully! Rates processed & simulated notifications dispatched.
                </div>
              )}

              {calcError && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {calcError}
                </div>
              )}

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                {/* Pickup & Delivery details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> Pickup Point
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Coverage Area Suburb</label>
                      <select
                        value={pickupArea}
                        onChange={(e) => setPickupArea(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer"
                        id="input-pickup-area"
                      >
                        <option value="">-- Choose Serviced Suburb --</option>
                        {coverageAreasList.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Street Address</label>
                      <input
                        type="text"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        placeholder="Suite 101, Business Tower"
                        className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-850 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                        id="input-pickup-address"
                      />
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> Dropoff Destination
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Coverage Area Suburb</label>
                      <select
                        value={dropArea}
                        onChange={(e) => setDropArea(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer"
                        id="input-drop-area"
                      >
                        <option value="">-- Choose Serviced Suburb --</option>
                        {coverageAreasList.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Street Address</label>
                      <input
                        type="text"
                        value={dropAddress}
                        onChange={(e) => setDropAddress(e.target.value)}
                        placeholder="Floor 4, Apartment 2B"
                        className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-850 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                        id="input-drop-address"
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensions & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="h-3.5 w-3.5 text-slate-400" /> Dimensions (L x W x H)
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">L (cm)</label>
                        <input
                          type="number"
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">W (cm)</label>
                        <input
                          type="number"
                          value={width}
                          onChange={(e) => setWidth(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">H (cm)</label>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                        <Scale className="h-3.5 w-3.5 text-slate-400" /> Actual Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={actualWeight}
                        onChange={(e) => setActualWeight(e.target.value)}
                        step="0.1"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-850 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" /> Class & Bill Mode
                    </h4>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Client Profile</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setOrderType('B2C')}
                          className={`p-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            orderType === 'B2C'
                              ? 'bg-blue-600 border-blue-600 text-white font-bold'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          B2C Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderType('B2B')}
                          className={`p-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            orderType === 'B2B'
                              ? 'bg-blue-600 border-blue-600 text-white font-bold'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          B2B Enterprise
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Payment Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentType('Prepaid')}
                          className={`p-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            paymentType === 'Prepaid'
                              ? 'bg-blue-600 border-blue-600 text-white font-bold'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          Prepaid
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentType('COD')}
                          className={`p-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            paymentType === 'COD'
                              ? 'bg-blue-600 border-blue-600 text-white font-bold'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          COD (Collect)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estimate charges & place order */}
                <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <button
                    type="button"
                    onClick={calculateRates}
                    disabled={calcLoading}
                    id="btn-calc-rates"
                    className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {calcLoading ? 'Calculating...' : 'Estimate Charges'}
                  </button>

                  <button
                    type="submit"
                    disabled={submitLoading || !calculation}
                    id="btn-confirm-booking"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {submitLoading ? 'Booking Shipment...' : 'Confirm & Book Order'}
                  </button>
                </div>
              </form>

              {/* Estimate Calculation Panel */}
              {calculation && (
                <div id="calculation-breakdown-panel" className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Charge Summary</span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded uppercase">
                      Rates Processed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-b border-slate-100 pb-3 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wide">Pickup Zone</span>
                      <span className="font-semibold text-slate-800">{calculation.pickupZone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wide">Drop Zone</span>
                      <span className="font-semibold text-slate-800">{calculation.dropZone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wide">Volumetric Weight</span>
                      <span className="font-semibold text-slate-700 font-mono">{calculation.volumetricWeight} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wide">Billable Weight</span>
                      <span className="font-semibold text-slate-900 font-mono">{calculation.chargeableWeight} kg</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pb-2 text-slate-600">
                    <div className="flex justify-between">
                      <span>Base Weight Tariff</span>
                      <span className="font-semibold text-slate-800">${calculation.baseRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weight Surplus Charge</span>
                      <span className="font-semibold text-slate-800">${calculation.weightSurplusCharge.toFixed(2)}</span>
                    </div>
                    {calculation.codSurcharge > 0 && (
                      <div className="flex justify-between text-amber-700 font-semibold">
                        <span>COD Transaction Surcharge</span>
                        <span>+${calculation.codSurcharge.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">Total Charge</span>
                    <span className="text-lg font-extrabold text-slate-950 font-mono">${calculation.totalCharge.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wide">My Shipments</h3>
                  <p className="text-[11px] text-slate-400">List of physical cargos processed by LogiCore.</p>
                </div>
                <button
                  onClick={onRefreshOrders}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Reload Shipments"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Package className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-2.5" />
                    <p className="text-xs">You have not booked any shipments yet.</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-3 text-xs font-bold text-blue-600 hover:underline uppercase tracking-wider cursor-pointer"
                    >
                      Book Your First Shipment &rarr;
                    </button>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div 
                      key={order.id}
                      id={`order-card-${order.id}`}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-4 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        selectedOrder?.id === order.id 
                          ? 'border-blue-500 bg-blue-50/20 shadow-xs' 
                          : 'border-slate-100 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          {order.id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${getStatusStyle(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-slate-600 mb-3 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wide">Pickup Point</span>
                          <p className="font-semibold text-slate-800 truncate">{order.pickupArea}</p>
                          <span className="text-[9px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.25 rounded">
                            {order.pickupZone}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wide">Dropoff Destination</span>
                          <p className="font-semibold text-slate-800 truncate">{order.dropArea}</p>
                          <span className="text-[9px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.25 rounded">
                            {order.dropZone}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-500 text-[10px] font-mono">
                          <span>Weight: <strong className="text-slate-700">{order.chargeableWeight}kg</strong></span>
                          <span>•</span>
                          <span>Type: <strong className="text-slate-700">{order.orderType}/{order.paymentType}</strong></span>
                        </div>
                        <span className="font-extrabold font-mono text-slate-900 text-sm">${order.totalCharge}</span>
                      </div>

                      {order.status === 'Failed' && (
                        <div className="mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                          <span className="font-semibold">Reschedule delivery attempt required</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRescheduleOrderId(order.id);
                              setSelectedOrder(order);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded font-extrabold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                            id={`btn-reschedule-trigger-${order.id}`}
                          >
                            Reschedule
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Timeline Details or Reschedule Panel */}
        <div className="lg:col-span-5 space-y-6">
          {rescheduleOrderId ? (
            <div id="reschedule-panel" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-fadeIn text-slate-700">
              <div className="flex items-center gap-2 text-amber-700 pb-1.5 border-b border-slate-100">
                <Calendar className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">Reschedule Shipment</h3>
              </div>

              <p className="text-[11px] text-amber-800 leading-relaxed bg-amber-50 border border-amber-200 p-3 rounded-xl">
                The courier reported a failed delivery attempt. Rescheduling will reset status, and assign a new delivery partner to retry.
              </p>

              <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">New Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
                    id="input-reschedule-date"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Special Instructions</label>
                  <textarea
                    rows={3}
                    value={rescheduleNotes}
                    onChange={(e) => setRescheduleNotes(e.target.value)}
                    placeholder="e.g. Please leave package with front desk if not available."
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={rescheduleLoading}
                    id="btn-reschedule-submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-lg text-xs uppercase tracking-widest cursor-pointer shadow-xs"
                  >
                    {rescheduleLoading ? 'Processing...' : 'Confirm Redelivery'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRescheduleOrderId(null)}
                    className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs text-slate-500 font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : selectedOrder ? (
            <div id="tracking-timeline-panel" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5 text-slate-700">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Tracking Timeline</span>
                  <h3 className="font-mono font-bold text-sm text-slate-900">{selectedOrder.id}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${getStatusStyle(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Order quick specs */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs grid grid-cols-2 gap-3 border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wide">Courier Agent</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3 text-slate-400" /> {selectedOrder.agentName || 'Awaiting Assignment'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wide">Service Class</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">{selectedOrder.orderType === 'B2B' ? 'Business Enterprise' : 'Consumer Delivery'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wide">Dimensions Spec</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block font-mono">{selectedOrder.length}x{selectedOrder.width}x{selectedOrder.height} cm</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wide">Payment Terms</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">{selectedOrder.paymentType === 'COD' ? 'Cash on Delivery' : 'Prepaid (Cleared)'}</span>
                </div>
              </div>

              {/* Vertical Audit Trail Timeline */}
              <div className="space-y-4 pt-1">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Tracking Audit Logs</h4>
                <div className="relative border-l border-slate-150 pl-4 space-y-4 ml-1">
                  {selectedOrder.trackingHistory.map((log, idx) => (
                    <div key={log.id} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[21px] mt-0.5 h-2.5 w-2.5 rounded-full border-2 ${
                        idx === 0 ? 'bg-blue-600 border-white ring-4 ring-blue-50' : 'bg-slate-200 border-white'
                      }`} />
                      
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-[11px]">{log.status}</span>
                        <span className="text-slate-400 text-[10px] font-mono">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-slate-600 leading-normal">{log.comment}</p>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                        <span>By: <strong className="text-slate-500 font-bold">{log.actor}</strong> ({log.actorRole})</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 shadow-xs">
              <Clock className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-2.5" />
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wide">No Shipment Selected</h4>
              <p className="text-xs mt-1 max-w-[220px] mx-auto leading-normal">Select any booked consignment on the left to inspect its live status and tracking history timeline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
