# ClaimWise — System Architecture & Database Design

## 1. High-Level Architecture

```
+-------------------------------------------------------------------+
|                   React + Vite + Tailwind Frontend                |
|                        (http://localhost:5173)                    |
|  - Customer Portal  - Claims Officer Workbench  - Admin Analytics |
+---------------------------------+---------------------------------+
                                  | REST / JSON + JWT + Multipart
                                  v
+-------------------------------------------------------------------+
|                Node.js + Express + TypeScript Backend             |
|                        (http://localhost:5000)                    |
|  - JWT Auth & RBAC   - Policy Validation   - Multer Uploads       |
|  - Claim Workflow    - Audit Logging       - Notifications        |
+------------------+--------------------------------+---------------+
                   | Mongoose ODM                   | HTTP / JSON
                   v                                v
+----------------------------------+  +-----------------------------+
|        MongoDB Database          |  |  Python FastAPI ML Service  |
| (Local / Atlas / Memory Fallback)|  |    (http://localhost:8001)  |
| - Users, Policies, Claims        |  | - Scikit-learn RF/LR Model  |
| - Documents, Predictions         |  | - Feature Contributions     |
| - ClaimAssignments, AuditLogs    |  | - LangChain AI Assistant    |
+----------------------------------+  +-----------------------------+
```

## 2. Claim Workflow Automation

```
Submitted -> Policy Validation -> Document Verification -> ML Risk Analysis
   -> Officer Assignment -> Officer Review -> Final Decision -> Customer Notification
```

**Design Principle:** Neither policy validation warnings nor high ML risk scores trigger automatic rejection. Uncertain or elevated-risk cases are routed to human Claims Officers with full explainability signals.

## 3. MongoDB Collections

| Collection | Key Fields & Indexes |
|---|---|
| `users` | `email` (unique index), `role` (`customer \| officer \| admin`), `passwordHash`, `isActive` |
| `policies` | `policyNumber` (unique index), `customerId` (ref User), `policyType`, `coverageAmount`, `status` |
| `claims` | `claimId` (unique index), `policyId`, `customerId`, `assignedOfficerId`, `status`, `validationResult`, `statusHistory` |
| `documents` | `claimId` (ref Claim), `originalName`, `mimeType`, `size`, `url` |
| `predictions` | `claimId` (unique ref Claim), `riskScore`, `riskLevel`, `modelName`, `contributingFactors` |
| `claimassignments` | `claimId`, `officerId`, `assignedBy`, `status` |
| `investigationnotes` | `claimId`, `authorId`, `authorName`, `note`, `noteType` |
| `notifications` | `userId`, `title`, `message`, `claimId`, `isRead` |
| `auditlogs` | `actorEmail`, `actorRole`, `action`, `entityType`, `entityId`, `details` |

