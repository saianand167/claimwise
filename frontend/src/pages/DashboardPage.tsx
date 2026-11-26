import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { FileCheck2, Clock, AlertTriangle, XCircle, DollarSign, Shield, Users, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Claim } from '../types';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';

const RISK_COLORS: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
};

export function DashboardPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const claimsRes = await api.get('/claims');
        setClaims(claimsRes.data.claims || []);
        if (user?.role === 'admin' || user?.role === 'officer') {
          const analyticsRes = await api.get('/admin/analytics');
          setAnalytics(analyticsRes.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.role]);

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading dashboard metrics...</div>;
  }

  const approvedCount = claims.filter((c) => c.status === 'Approved').length;
  const rejectedCount = claims.filter((c) => c.status === 'Rejected').length;
  const pendingCount = claims.filter((c) => !['Approved', 'Rejected'].includes(c.status)).length;
  const highRiskCount = claims.filter((c) => c.prediction?.riskLevel === 'High').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">
            Welcome back, {user?.name}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5 capitalize">
            {user?.role} Operations Overview
          </p>
        </div>
        {user?.role === 'customer' && (
          <Link
            to="/claims/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold rounded-lg"
          >
            Submit New Claim
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      {user?.role === 'admin' && analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Customers" value={analytics.summary.totalCustomers} icon={Users} accent="navy" />
          <StatCard title="Active Policies" value={analytics.summary.totalPolicies} icon={Shield} accent="emerald" />
          <StatCard title="Total Claims" value={analytics.summary.totalClaims} sub={`${analytics.summary.pendingClaims} pending`} icon={Clock} accent="amber" />
          <StatCard
            title="Total Claim Volume"
            value={`$${analytics.summary.totalClaimAmount.toLocaleString()}`}
            sub={`${analytics.summary.approvedClaims} approved / ${analytics.summary.rejectedClaims} rejected`}
            icon={DollarSign}
            accent="navy"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={user?.role === 'officer' ? 'Assigned Claims' : 'Total Claims'} value={claims.length} icon={Shield} accent="navy" />
          <StatCard title="Pending Reviews" value={pendingCount} icon={Clock} accent="amber" />
          {user?.role === 'officer' ? (
            <StatCard title="High-Risk Signals" value={highRiskCount} icon={AlertTriangle} accent="red" />
          ) : (
            <StatCard title="Approved Claims" value={approvedCount} icon={FileCheck2} accent="emerald" />
          )}
          <StatCard title="Rejected Claims" value={rejectedCount} icon={XCircle} accent="red" />
        </div>
      )}

      {/* Admin Analytics Charts */}
      {user?.role === 'admin' && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-navy-900 mb-4">Monthly Claim Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="claims" fill="#1e3a6d" radius={[6, 6, 0, 0]} name="Claims Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-navy-900 mb-4">ML Risk Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} label>
                    {analytics.riskDistribution.map((entry: any) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-navy-900 mb-4">Claims by Category ($)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#0f766e" radius={[6, 6, 0, 0]} name="Total Amount ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent Claims Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-900">
            {user?.role === 'officer' ? 'Assigned Investigation Queue' : 'Recent Claims Activity'}
          </h3>
          <Link to="/claims" className="text-xs font-medium text-navy-600 hover:underline">
            View all claims
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Claim ID</th>
                <th className="px-5 py-3">Policy</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Risk Signal</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims.slice(0, 6).map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3.5 font-semibold text-navy-800">{c.claimId}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.policyNumber}</td>
                  <td className="px-5 py-3.5 text-slate-700">{c.claimType}</td>
                  <td className="px-5 py-3.5 font-medium">${c.claimAmount.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <RiskBadge level={c.prediction?.riskLevel} score={c.prediction?.riskScore} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link to={`/claims/${c._id}`} className="text-xs font-semibold text-navy-600 hover:underline">
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500 text-sm">
                    No claims found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, accent }: { title: string; value: string | number; sub?: string; icon: any; accent: string }) {
  const colors: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-navy-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${colors[accent] || colors.navy}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

