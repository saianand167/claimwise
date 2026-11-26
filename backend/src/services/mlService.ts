import axios from 'axios';
import { env } from '../config/env';

export interface MlPredictionPayload {
  policy_type: string;
  claim_type: string;
  claim_amount: number;
  policy_coverage: number;
  policy_age_days: number;
  days_to_report: number;
  prior_claims_count: number;
  incident_hour: number;
  witnesses_count: number;
  police_report_filed: number;
  document_count: number;
  is_weekend_incident: number;
  description_length: number;
}

export interface MlPredictionResponse {
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  modelName: string;
  contributingFactors: Array<{
    feature: string;
    label: string;
    value: string;
    impact: string;
    reason: string;
  }>;
  advisoryNotice: string;
}

export async function predictClaimRisk(payload: MlPredictionPayload): Promise<MlPredictionResponse> {
  try {
    const { data } = await axios.post<MlPredictionResponse>(`${env.mlServiceUrl}/predict`, payload, {
      timeout: 5000,
    });
    return data;
  } catch {
    // Graceful deterministic fallback if ML microservice is temporarily unreachable
    const ratio = payload.claim_amount / Math.max(payload.policy_coverage, 1);
    let score = 0.15;
    const factors: MlPredictionResponse['contributingFactors'] = [];

    if (ratio > 0.75) {
      score += 0.35;
      factors.push({
        feature: 'claim_to_coverage_ratio',
        label: 'High Claim-to-Coverage Ratio',
        value: `${Math.round(ratio * 100)}%`,
        impact: 'high',
        reason: 'Requested claim amount is a high proportion of total coverage.',
      });
    }
    if (payload.policy_age_days < 60) {
      score += 0.25;
      factors.push({
        feature: 'policy_age_days',
        label: 'Recently Issued Policy',
        value: `${payload.policy_age_days} days`,
        impact: 'high',
        reason: 'Incident occurred shortly after policy inception.',
      });
    }
    if (payload.document_count <= 1) {
      score += 0.12;
      factors.push({
        feature: 'document_count',
        label: 'Limited Documentation',
        value: `${payload.document_count}`,
        impact: 'medium',
        reason: 'Few supporting documents provided at submission.',
      });
    }

    score = Math.min(0.95, Math.round(score * 100) / 100);
    const riskLevel = score < 0.35 ? 'Low' : score < 0.65 ? 'Medium' : 'High';

    if (factors.length === 0) {
      factors.push({
        feature: 'baseline',
        label: 'Baseline Risk Profile',
        value: `${Math.round(ratio * 100)}% coverage`,
        impact: 'low',
        reason: 'Standard risk indicators within expected thresholds.',
      });
    }

    return {
      riskScore: score,
      riskLevel,
      modelName: 'HeuristicFallback (ML service offline)',
      contributingFactors: factors,
      advisoryNotice: 'ML risk score is an investigation signal only and does not constitute proof of fraud.',
    };
  }
}

export async function getMlMetrics(): Promise<unknown> {
  const { data } = await axios.get(`${env.mlServiceUrl}/metrics`, { timeout: 5000 });
  return data;
}

export async function queryClaimAssistant(body: {
  question: string;
  claim: unknown;
  prediction?: unknown;
  notes?: unknown[];
}): Promise<unknown> {
  const { data } = await axios.post(`${env.mlServiceUrl}/assistant/chat`, body, { timeout: 18000 });
  return data;
}

