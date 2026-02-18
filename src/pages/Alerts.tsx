
import React from 'react';
import { Bell, CheckCircle, Package, CreditCard, Truck, Key, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { store, LOGO_URL } from '../store';
import { Alert } from '../types';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    const data = await store.getAlerts();
    setAlerts(data);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkSeen = async (id: string) => {
    await store.markAlertSeen(id);
    fetchAlerts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'low stock': return <Package size={24} className="text-amber-500" />;
      case 'credit overdue': return <CreditCard size={24} className="text-rose-500" />;
      case 'unpaid distributor': return <Truck size={24} className="text-indigo-500" />;
      case 'password reset': return <Key size={24} className="text-sky-500" />;
      default: return <Bell size={24} className="text-slate-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'low stock': return 'bg-amber-50';
      case 'credit overdue': return 'bg-rose-50';
      case 'unpaid distributor': return 'bg-indigo-50';
      case 'password reset': return 'bg-sky-50';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img src={LOGO_URL} alt="Kinthithe" className="h-20 w-20 object-contain rounded-[24px] shadow-xl border-4 border-white bg-white" />
            <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white text-xs font-black px-2 py-1 rounded-full border-2 border-white shadow-lg">
              {alerts.filter(a => !a.seen).length}
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Notifications</h2>
            <p className="text-slate-500 font-bold text-lg">Critical alerts requiring attention.</p>
          </div>
        </div>
        <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">System Operational</span>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">All Clear</h3>
            <p className="text-slate-400 font-medium">No pending alerts found. You're all caught up!</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.alert_id}
              className={`p-6 rounded-[32px] border transition-all duration-300 group relative overflow-hidden
                ${alert.seen
                  ? 'bg-white border-slate-100 opacity-60 hover:opacity-100'
                  : 'bg-white border-indigo-100 shadow-xl shadow-indigo-100/50 scale-[1.01]'
                }
              `}
            >
              <div className="flex gap-6 items-start relative z-10">
                <div className={`p-4 rounded-2xl ${getBgColor(alert.type)} shrink-0`}>
                  {getIcon(alert.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-lg ${getBgColor(alert.type)} text-slate-500`}>
                      {alert.type}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{new Date(alert.date).toLocaleString()}</span>
                  </div>

                  <p className={`text-lg font-bold mb-4 leading-relaxed ${alert.seen ? 'text-slate-500' : 'text-slate-900'}`}>
                    {alert.message}
                  </p>

                  <div className="flex justify-end">
                    {!alert.seen ? (
                      <button
                        onClick={() => handleMarkSeen(alert.alert_id)}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                      >
                        <CheckCircle2 size={16} /> Mark Resolved
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest px-4 py-2 bg-emerald-50 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity">
                        <CheckCircle size={14} /> Resolved
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};