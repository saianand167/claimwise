# ClaimWise REST API Documentation

Base URL: `http://localhost:5000/api`

All protected endpoints require header: `Authorization: Bearer <JWT_TOKEN>`

## Authentication
- `POST /auth/register` — Register a new customer account
- `POST /auth/login` — Authenticate and receive JWT token
- `GET /auth/me` — Get current authenticated user profile

## Policies
- `GET /policies` — List policies (Customer: own; Officer/Admin: all, supports `?search=&status=&policyType=`)
- `POST /policies/validate` — Validate policy number, incident date, and claim amount
- `POST /policies` — *(Admin)* Create new policy
- `PUT /policies/:id` — *(Admin)* Update policy
- `DELETE /policies/:id` — *(Admin)* Delete policy

## Claims & Workflow
- `GET /claims` — List claims (Customer: own; Officer: assigned; Admin: all, supports `?search=&status=&riskLevel=`)
- `GET /claims/:id` — Get claim details, documents, ML prediction, and investigation notes
- `POST /claims` — *(Customer/Admin)* Submit claim (`multipart/form-data`, up to 5 PDF/JPG/PNG files)
- `POST /claims/:id/documents` — Upload additional supporting documents
- `POST /claims/:id/notes` — *(Officer/Admin)* Add investigation note
- `PATCH /claims/:id/assign` — *(Admin)* Assign claim to a Claims Officer
- `PATCH /claims/:id/decision` — *(Officer/Admin)* Approve, Reject, or Request Additional Information
- `POST /claims/:id/assistant` — *(Officer/Admin)* Query LangChain AI Claim Assistant

## Administration & Analytics
- `GET /admin/users` — *(Admin)* List users and officers
- `POST /admin/users` — *(Admin)* Create staff or customer account
- `PATCH /admin/users/:id` — *(Admin)* Enable/disable user or update role
- `GET /admin/analytics` — *(Admin/Officer)* Aggregated KPIs, monthly trends, risk distribution, and ML metrics
- `GET /admin/audit-logs` — *(Admin)* Latest 100 security & workflow audit logs

## Notifications
- `GET /notifications` — Get user notifications
- `PATCH /notifications/:id/read` — Mark notification read
- `PATCH /notifications/read-all` — Mark all notifications read

## FastAPI ML Service (`http://localhost:8001`)
- `GET /health` — Service & model health check
- `GET /metrics` — Model comparison, confusion matrix, precision/recall/F1/ROC-AUC, top features
- `POST /predict` — Predict fraud-risk probability & contributing factors
- `POST /retrain` — Retrain ML pipeline on synthetic dataset
- `POST /assistant/chat` — LangChain investigation assistant (with deterministic fallback)

