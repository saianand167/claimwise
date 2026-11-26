import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export function AdminAuditPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/analytics').then((res) => setMetrics(res.data.mlMetrics));
    if (user?.role === 'admin') {
      api.get('/admin/audit-logs').then((res) => setLogs(res.data.logs || []));
    }
  }, [user?.role]);

  const cm = metrics?.selected_metrics?.confusion_matrix;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">ML Model Evaluation & Audit Trail</h2>
        <p className="text-sm text-slate-600">Model benchmark metrics, feature importance, and security audit logs.</p>
      </div>

      {metrics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy-900">Selected Model: {metrics.selected_model}</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                Dataset: {metrics.dataset_size} claims
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase">
                  <tr>
                    <th className="p-2.5">Model</th>
                    <th className="p-2.5">Precision</th>
                    <th className="p-2.5">Recall</th>
                    <th className="p-2.5">F1</th>
                    <th className="p-2.5">ROC-AUC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.model_comparison?.map((m: any) => (
                    <tr key={m.model_name} className={m.model_name === metrics.selected_model ? 'bg-navy-50/50 font-semibold' : ''}>
                      <td className="p-2.5">{m.model_name}</td>
                      <td className="p-2.5">{m.precision}</td>
                      <td className="p-2.5">{m.recall}</td>
                      <td className="p-2.5">{m.f1_score}</td>
                      <td className="p-2.5">{m.roc_auc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {cm && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Confusion Matrix (Test Set: {metrics.test_size})</p>
                <div className="grid grid-cols-2 gap-2 max-w-xs text-center text-xs">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="block text-[10px] text-slate-500">True Negative</span>
                    <span className="text-lg font-bold text-emerald-800">{cm[0][0]}</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="block text-[10px] text-slate-500">False Positive</span>
                    <span className="text-lg font-bold text-amber-800">{cm[0][1]}</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="block text-[10px] text-slate-500">False Negative</span>
                    <span className="text-lg font-bold text-amber-800">{cm[1][0]}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="block text-[10px] text-slate-500">True Positive</span>
                    <span className="text-lg font-bold text-emerald-800">{cm[1][1]}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-navy-900 mb-4">Top Contributing Model Features</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.top_features} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="feature" type="category" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="importance" fill="#1e3a6d" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-5 rounded-xl border border-slate-200 text-xs text-slate-500">
          ML service metrics will appear here once the FastAPI ML service (`localhost:8001`) is running.
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-navy-900">System Audit Logs</h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Entity</th>
                  <th className="px-4 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l._id}>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{l.actorEmail}</td>
                    <td className="px-4 py-2.5 capitalize">{l.actorRole}</td>
                    <td className="px-4 py-2.5 font-semibold text-navy-700">{l.action}</td>
                    <td className="px-4 py-2.5">{l.entityId}</td>
                    <td className="px-4 py-2.5 text-slate-600">{l.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

