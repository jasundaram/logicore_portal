import React from 'react';
import { Mail, MessageSquare, Clock } from 'lucide-react';
import { NotificationLog } from '../types';

interface NotificationFeedProps {
  notifications: NotificationLog[];
  onRefresh: () => void;
}

export default function NotificationFeed({ notifications, onRefresh }: NotificationFeedProps) {
  return (
    <div id="notification-feed-container" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs h-full flex flex-col">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-500" />
          <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Live Message Logs</h2>
        </div>
        <button 
          onClick={onRefresh}
          className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold uppercase tracking-wider transition-colors cursor-pointer"
          id="btn-refresh-notifications"
        >
          Refresh Feed
        </button>
      </div>

      <div className="p-4 bg-slate-50/50 text-[11px] text-slate-600 border-b border-slate-200/60 flex items-start gap-2">
        <span className="font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-slate-300/40">Logs</span>
        <p>Captures automated notifications sent on status updates or delivery rescheduling.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[350px] lg:max-h-[600px]">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock className="h-8 w-8 mx-auto stroke-1 mb-2 text-slate-300" />
            <p className="text-xs">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id} 
              id={`notif-card-${notif.id}`}
              className="p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all text-xs shadow-2xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-[10px]">
                  {notif.type === 'Email' ? (
                    <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-100">
                      <Mail className="h-3 w-3" /> Email
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                      <MessageSquare className="h-3 w-3" /> SMS Alert
                    </span>
                  )}
                </span>
                <span className="text-slate-400 font-mono text-[9px]">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-slate-500 text-[11px] mb-2">
                <span className="font-semibold text-slate-400">Recipient:</span> {notif.recipient}
              </div>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100 italic text-[11px]">
                "{notif.message}"
              </p>
              <div className="mt-2 text-[9px] font-mono text-slate-400 flex items-center justify-between">
                <span>Ref: {notif.orderId}</span>
                <span className="bg-slate-100 border border-slate-200/60 px-1.5 py-0.25 rounded text-slate-500">Simulated</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
