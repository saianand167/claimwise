# ClaimWise — AI-Powered Insurance Claims & Fraud Risk Intelligence Platform

ClaimWise is a full-stack insurance claims management and fraud risk intelligence platform built with **React + TypeScript + Tailwind CSS**, **Node.js + Express + MongoDB**, and **Python FastAPI + Scikit-learn + LangChain**.

## Key Features

- **Role-Based Access Control (JWT + bcrypt):** Separate portals and permissions for **Customer**, **Claims Officer**, and **Administrator**.
- **Automated Policy Validation:** Deterministic checks for policy existence, customer ownership, active status on incident date, and coverage limits.
- **ML Fraud Risk Scoring (Scikit-learn):** Compares Logistic Regression and Random Forest on a documented synthetic claims dataset (`ml-service/data/insurance_claims_synthetic.csv`), selects the best model (`RandomForestClassifier`, ROC-AUC `0.8145`), and surfaces contributing risk signals as advisory evidence (never auto-rejecting claims).
- **Document Management:** Secure PDF/JPG/PNG uploads (Multer, type & size validated) with customer re-upload support when officers request additional info.
- **Workflow Automation & Audit Trail:** End-to-end status tracking (`Submitted → Processing → Under Review / Pending Documents → Approved / Rejected / Additional Information Required`), notifications, and immutable audit logs.
- **Optional LangChain AI Assistant:** Summarizes claims, explains risk flags, and generates review checklists using Groq/LangChain when configured, with a zero-key deterministic fallback.
- **Enterprise Analytics:** Recharts dashboards for monthly claim trends, risk distribution, category breakdowns, and ML model evaluation metrics.

## Project Structure

```text
claimwise/
  frontend/       # React + Vite + TypeScript + Tailwind + Recharts
  backend/        # Node.js + Express + TypeScript + Mongoose REST API
  ml-service/     # Python FastAPI + Scikit-learn + LangChain Assistant
  docs/           # ARCHITECTURE.md and API.md
  .env.example
  .gitignore
  README.md
```

## Setup & Running Locally

### 1. Start the Python ML Service (`port 8001`)
```bash
cd claimwise/ml-service
# Install dependencies if needed: pip install -r requirements.txt
python train_model.py
python main.py
```

### 2. Start the Express Backend (`port 5000`)
> Note: Connects to `MONGODB_URI` if available, or automatically starts an embedded `mongodb-memory-server` and seeds demo data.
```bash
cd claimwise/backend
npm install
npm run dev
```

### 3. Start the React Frontend (`port 5173`)
```bash
cd claimwise/frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Demo Login Accounts

| Role | Email | Password |
|---|---|---|
| **Customer** | `customer@claimwise.ai` | `Demo@123` |
| **Claims Officer** | `officer@claimwise.ai` | `Demo@123` |
| **Administrator** | `admin@claimwise.ai` | `Demo@123` |

