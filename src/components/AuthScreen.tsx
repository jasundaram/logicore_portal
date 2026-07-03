import React, { useState } from 'react';
import { Truck, Shield, User as UserIcon, LogIn, UserPlus } from 'lucide-react';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'customer' | 'agent' | 'admin'>('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const presets = [
    { email: 'admin@logistics.com', label: 'Admin Sandbox', desc: 'Manage rate cards, zones, and trigger auto-assignment.', icon: Shield, color: 'text-rose-400 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700' },
    { email: 'customer@gmail.com', label: 'Customer Sandbox (Jane)', desc: 'Place B2C orders, view cost breakdowns, live-track progress.', icon: UserIcon, color: 'text-indigo-400 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700' },
    { email: 'b2bclient@techcorp.com', label: 'Customer Sandbox (TechCorp)', desc: 'B2B Client placing large-volume shipments with prepaid/COD rules.', icon: UserIcon, color: 'text-sky-400 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700' },
    { email: 'agent1@delivery.com', label: 'Agent Sandbox (Alex)', desc: 'Active in Downtown zone. Update status and trigger rescheduling.', icon: Truck, color: 'text-emerald-400 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700' },
  ];

  const handlePresetClick = async (presetEmail: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: presetEmail, password: 'password' })
      });
      const data = await response.json();
      if (response.ok && data.user) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection to backend failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide an email address');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name) {
          setError('Name is required for registration');
          setLoading(false);
          return;
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, role })
        });
        const data = await res.json();
        if (res.ok && data.user) {
          onLogin(data.user);
        } else {
          setError(data.error || 'Registration failed');
        }
      } else {
        // Simple Login
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'password' })
        });
        const data = await res.json();
        if (res.ok && data.user) {
          onLogin(data.user);
        } else {
          setError(data.error || 'User not found. Try entering a preset email.');
        }
      }
    } catch (err) {
      setError('Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="max-w-4xl mx-auto py-8 px-4 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      {/* Intro branding */}
      <div className="md:col-span-5 flex flex-col justify-center h-full space-y-6">
        <div>
          <div className="inline-flex p-3 rounded-xl bg-blue-600 text-white mb-4 font-black text-xl italic shadow-sm">
            L
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 leading-tight">
            LogiCore Portal
          </h1>
          <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
            A simple dispatch and tracking platform featuring coverage zones, automated pricing, and local courier assignment.
          </p>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-4">
            Sandbox Access Profiles
          </h3>
          <div className="space-y-3">
            {presets.map((preset) => {
              const IconComp = preset.icon;
              return (
                <button
                  key={preset.email}
                  id={`btn-preset-${preset.email.replace('@', '-').replace('.', '-')}`}
                  onClick={() => handlePresetClick(preset.email)}
                  disabled={loading}
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-left flex items-start gap-3 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                >
                  <IconComp className="h-5 w-5 mt-0.5 shrink-0 text-blue-600" />
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wide text-slate-900">{preset.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{preset.email}</div>
                    <div className="text-[10px] text-slate-500 leading-normal mt-1">{preset.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Authentication Form */}
      <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isRegister ? 'Create an Account' : 'Access Your Portal'}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {isRegister 
            ? 'Sign up to configure delivery locations, track cargo, and receive real-time alerts.' 
            : 'Enter your credentials or click any of the preset access profiles on the left.'}
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@gmail.com"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm transition-all"
              id="auth-input-email"
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name / Organization</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm transition-all"
                  id="auth-input-name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Account Role</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      role === 'customer' 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('agent')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      role === 'agent' 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      role === 'admin' 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            id="auth-submit-button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-xs"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : isRegister ? (
              <>
                <UserPlus className="h-4 w-4" /> Register New Account
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" /> Enter Workspace
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            id="auth-switch-toggle"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register Customer/Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
