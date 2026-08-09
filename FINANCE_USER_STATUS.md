# Finance User Module - Real API Integration Status

## Status: Finance User Module Wired to Real Backend APIs

The Finance User module (`/dashboard/finance`, `/finance`, `/reports`) now uses only the real deployed backend at `https://pawguard-backend-mqri.onrender.com/api/v1`. No mock data, no hardcoded sample values, no fabricated responses. Every metric shown is derived from a live API call or the live response payload.

## What Was Implemented

### 1. Donations Service (new) - `src/services/donationsService.ts`
- `GET /donations` - list donations (supports `search`, `donation_type`, `status`, `date_from`, `date_to`, pagination, sort)
- `GET /donations/history` - full donation history
- `POST /donations` - record a manual donation (`DonationCreate`)
- `PATCH /donations/{donation_id}/status` - update status (`pending` / `success` / `failed`)
- `GET /donations/{donation_id}/receipt` - resolve the receipt `download_url`
- `GET /donations/donors` - list donor profiles
- `GET /donations/campaigns` - list campaigns
- `GET /donations/sponsorships` - list sponsorships
- `GET /donations/recurring` - list recurring subscriptions

### 2. Donations & Finance Page - `src/pages/finance/Finance.tsx`
- Tabbed view: **Donations** + **Financial Ledger** (transactions)
- Donations table with search + server-side status/type filters, receipt download, and status update
- Record Donation modal (`POST /donations`) - amount, currency, donation type, notes
- Log Expense modal (`POST /finance/transactions` as `expense`)
- Stat cards computed from the real `/finance/transactions` response
- Financial report export (`report_type: "finance"`) and donation report export (`report_type: "donation"`)
- No prefilled sample amounts/vendors - all form fields start empty
- Loading / error / empty states on every data view

### 3. Finance User Dashboard - `src/pages/dashboard/roles/FinanceUserDashboard.tsx`
- Reads `GET /dashboards/finance`, `GET /finance/transactions`, `GET /finance/summary`
- Stats prefer dashboard/summary aggregate values when present; otherwise they are derived from the real transaction list
- Ledger stream rendered from real transactions
- Quick actions navigate to real module routes (`/finance?action=donation`, `/finance?action=expense`, `/reports`)

### 4. Reports - `src/pages/reports/Reports.tsx`
- Added "Export Donation Report" quick action (`report_type: "donation"`, format `pdf`)
- Finance report export unchanged (`report_type: "finance"`)

### 5. Navigation & RBAC (verified, no change required)
- `finance_user` sidebar shows only: Dashboard, Donations & Finance, Financial Reports
- Route guards: `/dashboard/finance`, `/finance` (`view_finance`), `/reports` (`view_reports`) all include `finance_user`
- `finance_user` permissions: `view/create/edit/delete/export/manage finance`, `view/export reports`, `view notifications`
- Notifications reach the finance user through the header notification bell (`GET /notifications` is user-scoped)

## Missing / Unsupported Backend APIs

When a feature cannot be backed by a real endpoint, the UI omits it rather than faking it. The gaps below are backend-side limitations confirmed against the OpenAPI spec.

| Module | Feature | Required API | Current API Status | Why Blocked |
|--------|---------|--------------|--------------------|-------------|
| Donations | Delete a donation record | `DELETE /donations/{donation_id}` | Not in spec; only `GET/POST /donations`, `PATCH /donations/{id}/status` exist | Backend does not expose donation deletion, so no delete button is rendered |
| Donations | Edit donation amount/type/notes | `PUT` or `PATCH /donations/{donation_id}` | Not in spec; only a `status` PATCH exists | Backend only supports status transitions; UI offers status update only |
| Donations | Attach an external donor name/email when recording a manual donation | `donor_name` / `donor_email` on `DonationCreate` | `DonationCreate` only has `amount`, `currency`, `donation_type`, `notes`, `dog_id`, `campaign_id` | Backend links manual donations to the authenticated user's donor profile; no free-form donor attribution field |
| Donations | Per-installment sponsorship payment receipts | Dedicated payment/installment endpoint | Only `GET /donations/sponsorships` (list) + `GET /donations/{id}/receipt` exist | No per-installment payment or payout endpoint documented |
| Finance | Edit a ledger transaction's description/amount | `PUT /finance/transactions/{tx_id}` | Not in spec; only `PATCH /finance/transactions/{tx_id}/status` exists | Backend has no full transaction update; the edit affordance only changes status |

## Available Backend APIs Not Yet Surfaced in the Finance User UI
- `POST /donations/bulk/status-update` - bulk status updates (UI uses per-row status updates)
- `POST /donations/donors/bulk/delete` - bulk donor deletion (no donor delete in the current UI)
- `GET /finance/account-balances`, `GET /finance/accounts` - chart of accounts / balances
- `GET /finance/pnl` - profit & loss
- `GET/POST /finance/budgets`, `/finance/budgets/{id}/items` - budgets
- `GET /finance/recurring` - recurring ledger entries
- `GET /finance/reconcile/summary`, `POST /finance/reconcile/donations` - reconciliation

These are candidates for a future finance workspace (accounts, budgets, P&L, reconciliation), not faked in the current UI.

## Verification
- `npx tsc --noEmit`: clean
- `npm run build` (`tsc -b && vite build`): success
- No sample/fake data introduced; the only defaults used are API-documented ones (`currency: "USD"`, `donation_type: "one_time"`)
