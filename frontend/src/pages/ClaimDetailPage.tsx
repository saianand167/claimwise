import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Bot,
  Send,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import api from '../services/api';
import { Claim, ClaimDocument, InvestigationNote, Prediction } from '../types';
import { useAuth } from '../context/AuthContext';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';

export function ClaimDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [notes, setNotes] = useState<InvestigationNote[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadDetail = async () => {
    const { data } = await api.get(`/claims/${id}`);
    setClaim(data.claim);
    setDocuments(data.documents || []);
    setPrediction(data.prediction);
    setNotes(data.notes || []);
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleUploadMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const fd = new FormData();
    Array.from(e.target.files).forEach((f) => fd.append('documents', f));
    await api.post(`/claims/${id}/documents`, fd);
    loadDetail();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    await api.post(`/claims/${id}/notes`, { note: noteInput, noteType: 'Investigation' });
    setNoteInput('');
    loadDetail();
  };

  const handleDecision = async (status: 'Approved' | 'Rejected' | 'Additional Information Required') => {
    if (!decisionReason.trim()) {
      alert('Please provide a decision reason or message for the customer.');
      return;
    }
    await api.patch(`/claims/${id}/decision`, { status, reason: decisionReason });
    setDecisionReason('');
    loadDetail();
  };

  const askAssistant = async (q: string) => {
    if (!q.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await api.post(`/claims/${id}/assistant`, { question: q });
      setAiResponse(data);
    } finally {
      setAiLoading(false);
    }
  };

  if (!claim) return <div className="p-8 text-sm text-slate-500">Loading claim details...</div>;

  const isStaff = user?.role === 'officer' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-navy-900">{claim.claimId}</h2>
            <StatusBadge status={claim.status} />
            <RiskBadge level={prediction?.riskLevel} score={prediction?.riskScore} />
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Policy <span className="font-semibold">{claim.policyNumber}</span> • {claim.claimType} • Submitted by{' '}
            <span className="font-medium">{claim.customerId?.name}</span>
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs uppercase text-slate-500 font-medium">Claim Amount</p>
          <p className="text-2xl font-bold text-navy-900">${claim.claimAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident & Policy Validation */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Incident & Policy Validation</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{claim.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="text-slate-500 block">Incident Date</span>
                <span className="font-semibold text-slate-800">{new Date(claim.incidentDate).toLocaleDateString()}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="text-slate-500 block">Incident Hour</span>
                <span className="font-semibold text-slate-800">{claim.incidentHour}:00</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="text-slate-500 block">Witnesses</span>
                <span className="font-semibold text-slate-800">{claim.witnessesCount}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="text-slate-500 block">Police Report</span>
                <span className="font-semibold text-slate-800">{claim.policeReportFiled ? 'Filed' : 'No'}</span>
              </div>
            </div>

            <div className={`p-3.5 rounded-lg border text-xs ${claim.validationResult?.isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <div className="flex items-center gap-2 font-semibold">
                {claim.validationResult?.isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {claim.validationResult?.isValid ? 'Automated Policy Validation Passed' : 'Policy Validation Warnings'}
              </div>
              {claim.validationResult?.warnings?.length > 0 && (
                <ul className="list-disc pl-5 mt-1">
                  {claim.validationResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Supporting Documents */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Supporting Documents ({documents.length})</h3>
              {user?.role === 'customer' && (
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-navy-50 text-navy-700 rounded-lg cursor-pointer hover:bg-navy-100">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Document
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadMore} className="hidden" />
                </label>
              )}
            </div>
            {documents.length === 0 ? (
              <p className="text-xs text-slate-500">No documents uploaded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <div key={d._id} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-navy-600" />
                      <span className="font-medium text-slate-800">{d.originalName}</span>
                      <span className="text-xs text-slate-400">({Math.round(d.size / 1024)} KB)</span>
                    </div>
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-navy-600 hover:underline">
                      View File
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Workflow Status History</h3>
            <div className="space-y-3">
              {claim.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-navy-600 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">{h.status}</span>
                    <span className="text-slate-400 ml-2">{new Date(h.timestamp).toLocaleString()}</span>
                    {h.note && <p className="text-slate-600 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Officer Notes & Decision */}
          {isStaff && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Officer Investigation & Decision</h3>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add internal investigation note..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg">
                  Add Note
                </button>
              </form>

              <div className="space-y-2 max-h-44 overflow-y-auto">
                {notes.map((n) => (
                  <div key={n._id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{n.authorName}</span>
                      <span className="text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 mt-1">{n.note}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Final Decision / Info Request Reason</label>
                <textarea
                  rows={2}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Enter decision rationale or specify additional documents needed..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecision('Approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Approve Claim
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision('Additional Information Required')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg"
                  >
                    Request Info
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision('Rejected')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Reject Claim
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: ML Risk + AI Assistant */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-navy-700" />
              <h3 className="text-sm font-semibold text-navy-900">ML Fraud Risk Intelligence</h3>
            </div>
            {prediction ? (
              <>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase">Predicted Risk Probability</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">{Math.round(prediction.riskScore * 100)}%</p>
                  <div className="mt-2">
                    <RiskBadge level={prediction.riskLevel} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Model: {prediction.modelName}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Contributing Signals</p>
                  <div className="space-y-2">
                    {prediction.contributingFactors.map((f, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{f.label}</span>
                          <span className="uppercase text-[10px] text-slate-500">{f.impact}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{f.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                  {prediction.advisoryNotice}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">No risk prediction available.</p>
            )}
          </div>

          {isStaff && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-navy-700" />
                <h3 className="text-sm font-semibold text-navy-900">AI Claim Assistant</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Summarize claim', 'Why was this flagged?', 'Generate review checklist'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => askAssistant(q)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-navy-50 text-navy-700 rounded-md hover:bg-navy-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask about this claim..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => askAssistant(aiQuestion)}
                  disabled={aiLoading}
                  className="p-2 bg-navy-800 text-white rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {aiLoading && <p className="text-xs text-slate-500">Analyzing claim context...</p>}
              {aiResponse && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {aiResponse.answer}
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                    Mode: {aiResponse.mode}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

