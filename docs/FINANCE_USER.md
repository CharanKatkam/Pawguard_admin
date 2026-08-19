# PAWGUARD ADMIN PORTAL — FINANCE USER

## 1. About the Role

The **Finance User** manages PawGuard's financial operations and donation-related financial records within the permissions provided by the backend RBAC system.

This role is responsible for maintaining financial accounts, processing financial transactions, recording expenses, handling supported refunds/reconciliation operations, reviewing donation records, and accessing finance reporting.

The Finance User is an operational finance role. It does **not** have unrestricted access to system administration, RBAC, user management, rescue, shelter, medical, adoption, foster, or volunteer administration.

### Primary Responsibilities

- View financial accounts
- Create financial records
- Update supported financial records
- Reconcile financial records
- View and manage donation records according to permissions
- Review financial activity
- Generate/export supported finance reports
- Monitor the Finance Dashboard

### Backend RBAC Permissions

The backend role mapping provides:

- `finance:read`
- `finance:create`
- `finance:reconcile`
- `donation:read`
- `donation:manage`
- `donation:update`
- `dashboard:finance`
- `donations:write`

---

# 2. Role Purpose

The Finance User maintains PawGuard's financial information from transaction creation through reconciliation and reporting.

The overall operational flow is:

```text
Financial Record / Donation Received
        ↓
Financial Account / Transaction Recorded
        ↓
Financial Activity Reviewed
        ↓
Reconciliation Performed
        ↓
Expenses / Refunds Processed Where Supported
        ↓
Financial Reports Reviewed / Exported
        ↓
Finance Dashboard Updated From Live Data
```

All financial values must come from the existing backend APIs.

The frontend must never fabricate balances, transactions, donations, expenses, refunds, or reports.

---

# 3. Complete Finance Workflow

## Step 1 — Review Finance Dashboard

Permission:

`dashboard:finance`

The Finance User starts from the Finance Dashboard.

The dashboard should provide a live operational summary of available finance data.

Where supported by the backend, this may include:

- Financial account information
- Transaction activity
- Donation activity
- Expense activity
- Reconciliation information
- Financial reports/statistics
- Other finance metrics returned by the backend

### Important Rule

If the backend returns no finance data, the dashboard should show a genuine empty state.

Example:

> No financial data available.

It must not display fake financial statistics.

---

# 4. Finance Accounts

## Permission

`finance:read` / `finance:create` / supported finance update operations

The backend API mapping includes:

```text
GET/POST/PUT/DELETE /finance/accounts/*
→ finance:create/read/update
```

The Finance User can work with financial account records according to the backend's actual authorization.

### Account Operations

Depending on the existing backend implementation:

- View financial accounts
- Create supported accounts
- Update supported account information
- Review account-related financial activity

The Admin Portal must follow the live OpenAPI contract rather than inventing additional account fields or workflows.

### Deletion Rule

Although the route mapping includes DELETE, the documented RBAC mapping does not explicitly provide a separate `finance:delete` permission.

Therefore, the frontend must not assume that the Finance User can delete accounts solely because a DELETE endpoint exists.

The backend remains the final authority.

---

# 5. Financial Transactions

## Permission

`finance:create`, `finance:read`, and supported reconciliation operations

The backend mapping includes:

```text
GET/POST/PUT/DELETE /finance/transactions/*
→ finance:create/read/update
```

The Finance User can review and create supported financial transactions.

### Transaction Workflow

```text
Transaction Identified
        ↓
Transaction Recorded
        ↓
Transaction Reviewed
        ↓
Transaction Reconciled
        ↓
Transaction Included in Financial Reporting
```

The actual transaction fields and status values must come from the backend.

### Reconciliation

Permission:

`finance:reconcile`

Reconciliation is used to verify that financial records are consistent with the relevant financial source/record.

The frontend should expose reconciliation only where the backend provides the corresponding operation.

---

# 6. Expenses

## Permission

`finance:create` and `finance:read`

The backend mapping includes:

```text
GET/POST /finance/expenses/*
→ finance:create/read
```

The Finance User can record and review supported expenses.

### Expense Workflow

```text
Expense Occurs
      ↓
Expense Recorded
      ↓
Expense Reviewed
      ↓
Expense Included in Financial Records
      ↓
Finance Dashboard / Reports Reflect Activity
```

The Admin Portal should use the backend-defined expense fields and validation rules.

---

# 7. Refunds

## Permission

`finance:create`

The backend provides:

```text
POST /finance/refunds
→ finance:create
```

The Finance User can create supported refund records.

### Refund Workflow

```text
Refund Required
      ↓
Refund Request / Details Reviewed
      ↓
Refund Created Through Backend
      ↓
Financial Records Updated
      ↓
Dashboard / Reports Reflect Result
```

The frontend must not mark a refund as completed unless the backend confirms the operation.

---

# 8. Financial Reports

## Permission

The backend mapping specifies:

```text
GET /finance/reports/pdf
→ finance:export
```

The documented Finance User role mapping does not explicitly list `finance:export`.

Therefore:

**The Admin Portal must not assume that every Finance User can export PDF reports.**

If the backend grants `finance:export` through an effective role or direct permission override, the export action may be shown.

Otherwise, the export action should remain unavailable.

### Reporting Rule

Reports must contain actual backend financial information.

Never generate fake report totals.

---

# 9. Donations

The Finance User has multiple donation-related permissions:

- `donation:read`
- `donation:manage`
- `donation:update`
- `donations:write`

The backend API mapping includes:

```text
GET /donations/*
→ donation:read

POST /donations/*
→ donation:manage
```

Therefore, donation records are an important part of the Finance User's financial workflow.

---

# 10. Donation Workflow

## Step 1 — View Donations

Permission:

`donation:read`

The Finance User can review donation records.

Information should come from the backend and may include, where supported:

- Donation information
- Donor information
- Donation amount
- Donation status
- Donation date
- Transaction/reference information

---

## Step 2 — Manage Donations

Permission:

`donation:manage`

The Finance User can perform donation management operations supported by the backend.

The exact operations must be determined from the existing API.

The frontend should not invent additional donation actions.

---

## Step 3 — Update Donation Information

Permission:

`donation:update`

Where the backend exposes supported update operations, the Finance User can update donation records.

The backend validation rules must be followed.

---

## Step 4 — Donation Write Operations

Permission:

`donations:write`

This permission should be honored by the frontend wherever the existing Admin Portal uses the donation write capability.

The effective permission should come from the RBAC system.

---

# 11. Finance Dashboard

Permission:

`dashboard:finance`

The Finance Dashboard should provide a focused financial overview.

### Recommended Live Information

Where supported by the backend:

- Total financial activity
- Donation activity
- Recent transactions
- Expenses
- Refunds
- Account information
- Reconciliation activity
- Available financial reports

### No Fake Metrics

If the backend has no records, the dashboard should show:

```text
No transactions available.
No donations available.
No expenses available.
No financial activity available.
```

The UI should not use hardcoded values merely to populate cards or graphs.

---

# 12. Donations Graph

The Finance Dashboard may display a **Donations graph** when donation data is available from the backend.

The graph must be based on real donation records.

For example:

```text
Donation Records
       ↓
Backend API
       ↓
Finance Dashboard
       ↓
Donations Graph
```

If there are no donation records, the graph should show an appropriate empty state instead of fabricated values.

This is particularly important because donation information is part of the Finance User's operational access.

---

# 13. Finance Module — What Can Be Done

| Area | Finance User Capability |
|---|---|
| Finance Accounts | Read / Create / Supported Update |
| Transactions | Read / Create / Supported Update |
| Reconciliation | Reconcile supported records |
| Expenses | Read / Create |
| Refunds | Create supported refunds |
| Donations | Read / Manage / Update where supported |
| Donation Write | Supported write operations |
| Reports | Only when `finance:export` is effective |
| Finance Dashboard | Access |

---

# 14. Permission-to-Action Mapping

| Permission | Action |
|---|---|
| `finance:read` | View finance records |
| `finance:create` | Create supported financial records |
| `finance:reconcile` | Reconcile financial records |
| `donation:read` | View donations |
| `donation:manage` | Manage supported donation operations |
| `donation:update` | Update supported donation records |
| `donations:write` | Perform supported donation write operations |
| `dashboard:finance` | Access Finance Dashboard |
| `finance:export` | Export finance PDF reports when granted |

---

# 15. Complete Finance User Journey

```text
Login
  ↓
Finance Dashboard
  ↓
Review Financial Summary
  ↓
Review Accounts
  ↓
Review Transactions
  ↓
Record / Update Financial Transactions
  ↓
Record Expenses
  ↓
Review Donations
  ↓
Manage Supported Donation Operations
  ↓
Process Supported Refunds
  ↓
Reconcile Financial Records
  ↓
Review Financial Reports
  ↓
Export Report if finance:export is granted
```

---

# 16. Role-Based Access Boundaries

The Finance User should have focused finance access.

### Can Access

- Finance Dashboard
- Financial accounts
- Financial transactions
- Expenses
- Refund operations supported by the backend
- Donations
- Reconciliation
- Supported financial reports
- Donation write operations

### Does Not Automatically Access

- System RBAC
- User management
- Role management
- Rescue management
- Shelter management
- Medical management
- Adoption management
- Foster management
- Volunteer management
- Super Admin functions

Additional access is possible only when the RBAC system explicitly grants the corresponding permission.

---

# 17. Direct User Permission Overrides

The PAWGUARD RBAC system supports direct user-level permission overrides.

If a Finance User receives an additional permission through the backend user-permission mechanism, the Admin Portal should honor the user's effective permission.

For example:

```text
Finance User
     +
Direct Permission Override: finance:export
     ↓
PDF Export becomes available
```

However, the frontend must never assume that a user has a permission merely because their role normally performs a related business activity.

The effective RBAC permission is the source of truth.

---

# 18. Backend as Source of Truth

All finance functionality must remain aligned with the existing backend APIs and OpenAPI schemas.

The backend determines:

- Valid financial records
- Valid transaction fields
- Valid donation fields
- Valid expense fields
- Valid refund fields
- Valid statuses
- Valid report operations
- Authorization
- Validation rules
- Final transaction results

The frontend must not invent:

- Financial balances
- Donation records
- Transactions
- Expense records
- Refund results
- Unsupported finance statuses
- Unsupported API endpoints
- Unsupported permissions

---

# 19. Error Handling

When a backend finance operation fails, the Admin Portal must display the real backend error.

Example:

```json
{
  "detail": "Missing required permission: finance:create"
}
```

The UI must not show a success message if the backend rejected the operation.

For validation failures, the actual validation reason should be surfaced to the user wherever possible.

---

# 20. Empty-State Behavior

When there are no financial accounts:

```text
No financial accounts available.
```

When there are no transactions:

```text
No transactions available.
```

When there are no donations:

```text
No donations available.
```

When there are no expenses:

```text
No expenses available.
```

When there are no refunds:

```text
No refunds available.
```

When there is no reconciliation activity:

```text
No reconciliation activity available.
```

When there is no report data:

```text
No financial report data available.
```

These states must reflect actual backend responses.

---

# 21. Security and Financial Integrity

Financial data is sensitive operational data.

The Admin Portal should:

- Respect backend authorization.
- Display only permitted financial actions.
- Require backend confirmation for financial mutations.
- Avoid client-side-only authorization.
- Avoid fake success states.
- Avoid fabricated financial values.
- Preserve backend transaction identifiers.
- Use backend-provided totals and statuses.
- Handle failed operations clearly.

The backend remains the final authorization and data-integrity layer.

---

# 22. Dashboard Conclusion

The **Finance User** is PawGuard's operational financial management role.

The role provides access to:

- Finance accounts
- Financial transactions
- Reconciliation
- Expenses
- Refunds
- Donations
- Donation management
- Finance dashboard
- Financial reporting when the effective `finance:export` permission is available

The Finance Dashboard should give the user a real-time operational picture of PawGuard's financial activity using live backend data.

The **Donations graph belongs naturally in the Finance User's dashboard** when the backend provides donation data, because donations are explicitly included in the Finance User's permissions.

The Finance User should remain limited to finance-related responsibilities and should not receive unrelated administrative capabilities.

All functionality must remain aligned with the **backend RBAC model, existing APIs, OpenAPI schemas, and effective user permissions**, with the backend serving as the final source of truth.
