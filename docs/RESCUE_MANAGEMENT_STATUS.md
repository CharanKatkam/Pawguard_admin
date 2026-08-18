# Rescue Management Module — Implementation Status

**Last Updated:** 2026-08-10

---

## 1. Module Overview

| Property | Value |
|----------|-------|
| **Module Name** | Rescue Management |
| **Purpose** | End-to-end management of animal rescue operations: triage incoming public rescue requests, coordinate active rescue cases, and dispatch field teams (vehicles, drivers, rescue agents). |
| **Primary Routes** | `/rescues`, `/rescue-requests`, `/rescue-dispatch` |
| **Primary Service** | `src/services/rescueService.ts` |
| **Backend Endpoints** | `GET /rescue`, `POST /rescue/report`, `POST /rescue/{id}/verify`, `POST /rescue/{id}/fail`, `POST /rescue/{id}/dispatch`, `PATCH /rescue/dispatch/{id}`, `DELETE /rescue/{id}` |

---

## 2. Available Pages / Features

### 2.1 Rescue Management (`/rescues`) — `RescueManagement.tsx`
**Purpose:** Monitor and coordinate live animal rescue cases from the field.
- **List view:** Table of rescue cases with ticket number, reporter, location, animal count, physical condition, severity, urgency, status, timestamps.
- **Actions:**
  - View case details (modal with full field breakdown: reporter info, location/coordinates, media evidence, environmental factors, rejection reason, timestamps)
  - Create new rescue case (modal: location, landmark, severity, urgency, animal count, physical condition, reporter details)
  - Edit existing case (location, landmark, severity, urgency, physical condition, reporter notes)
  - Delete case
- **Stat cards:** Total Rescues, Urgent Incidents, Critical Severity, Completed Cases
- **Permissions:** `create_rescues` (create), `view_rescues` (view), edit/delete via `module="rescues"` in DataTable

### 2.2 Rescue Requests (`/rescue-requests`) — `RescueRequests.tsx`
**Purpose:** Triage and process emergency rescue calls submitted by citizens/public.
- **List view:** Table of incoming requests with request ID, animal type, location, description, reporter, phone, status, date.
- **Actions:**
  - View request details (modal)
  - Log new report (modal: location, description, reporter name/phone)
  - Approve request → escalates to active dispatch
  - Reject request (with optional reason)
- **Stat cards:** Total Incoming, Pending Triage, Approved & Escalated, Rejected / Invalid
- **Permissions:** `create_rescue_requests` (create), `view_rescue_requests` (view), `approve_rescue_requests`/`reject_rescue_requests` via view modal buttons

### 2.3 Rescue Dispatch (`/rescue-dispatch`) — `RescueDispatch.tsx`
**Purpose:** Real-time ambulance and rescue squad dispatch control.
- **List view:** Table of active dispatches with dispatch #, target case, vehicle unit, driver, lead rescue agent, dispatch time, status.
- **Actions:**
  - Create new dispatch (modal: target case ID, vehicle unit, driver, rescue agent lead, notes)
- **Stat cards:** Active Dispatches, En Route, Arrived On Scene, Standby Units
- **Permissions:** `create_rescue_dispatch` (create), `view_rescue_dispatch` (view)
- **Data source:** Derived from nested `dispatch` object on each rescue request returned by `GET /rescue`

---

## 3. Rescue Management Routes

| Route | Component | Permission Required | Allowed Roles |
|-------|-----------|---------------------|---------------|
| `/rescues` | `RescueManagement` | `view_rescues` (any of `view_rescues`, `view_rescue_requests`, `view_rescue_dispatch`) | `super_admin`, `rescue_centre_admin`, `rescue_coordinator`, `rescue_agent` |
| `/rescue-requests` | `RescueRequests` | `view_rescue_requests` (any of `view_rescues`, `view_rescue_requests`, `view_rescue_dispatch`) | `super_admin`, `rescue_centre_admin`, `rescue_coordinator`, `rescue_agent` |
| `/rescue-dispatch` | `RescueDispatch` | `view_rescue_dispatch` (any of `view_rescues`, `view_rescue_requests`, `view_rescue_dispatch`) | `super_admin`, `rescue_centre_admin`, `rescue_coordinator`, `rescue_agent` |

> **Note:** Route guards in `App.tsx` use an **any-of** permission check — having any one of the three rescue permissions grants access to all three rescue routes.

---

## 4. Available Actions

| Action | Page | Required Permission | Roles |
|--------|------|---------------------|-------|
| View rescue cases | `/rescues` | `view_rescues` | super_admin, rescue_centre_admin, rescue_coordinator, rescue_agent |
| Create rescue case | `/rescues` | `create_rescues` | super_admin, rescue_centre_admin, rescue_coordinator, rescue_agent |
| Edit rescue case | `/rescues` | (via DataTable `module="rescues"`) | super_admin, rescue_centre_admin, rescue_coordinator |
| Delete rescue case | `/rescues` | (via DataTable `module="rescues"`) | super_admin, rescue_centre_admin |
| View rescue requests | `/rescue-requests` | `view_rescue_requests` | super_admin, rescue_centre_admin, rescue_coordinator, rescue_agent |
| Log rescue request | `/rescue-requests` | `create_rescue_requests` | super_admin, rescue_centre_admin, rescue_coordinator, rescue_agent |
| Approve rescue request | `/rescue-requests` | (via `approveRescueRequest` service) | super_admin, rescue_centre_admin, rescue_coordinator, rescue_agent |
| Reject rescue request | `/rescue-requests` | (via `rejectRescueRequest` service) | super_admin, rescue_coordinator |
| View dispatches | `/rescue-dispatch` | `view_rescue_dispatch` | super_admin, rescue_centre_admin, rescue_coordinator, rescue_agent |
| Create dispatch | `/rescue-dispatch` | `create_rescue_dispatch` | super_admin, rescue_centre_admin, rescue_coordinator, rescue_agent |
| Update dispatch status | `/rescue-dispatch` | (via `updateDispatchStatus` service) | super_admin, rescue_coordinator, rescue_agent |

---

## 5. Related Roles & Access

| Role | Dashboard | Rescue Mgmt | Rescue Requests | Rescue Dispatch | Notes |
|------|-----------|-------------|-----------------|-----------------|-------|
| **super_admin** | ✅ | ✅ Full | ✅ Full | ✅ Full | Unrestricted access to all actions (bypass implemented) |
| **rescue_centre_admin** | ✅ | ✅ Full | ✅ Full | ✅ Full | High-level rescue operations oversight |
| **rescue_coordinator** | ✅ | ✅ Full | ✅ Full | ✅ Full | Dispatch & case coordination |
| **rescue_agent** | ✅ | ✅ View/Edit | ✅ View/Create | ✅ View/Create | Field agent assignments |
| veterinarian | ✅ | ❌ | ❌ | ❌ | No rescue access |
| shelter_manager | ✅ | ❌ | ❌ | ❌ | No rescue access |
| adoption_coordinator | ✅ | ❌ | ❌ | ❌ | No rescue access |
| foster_coordinator | ✅ | ❌ | ❌ | ❌ | No rescue access |
| volunteer_coordinator | ✅ | ❌ | ❌ | ❌ | No rescue access |
| inventory_manager | ✅ | ❌ | ❌ | ❌ | No rescue access |
| finance_user | ✅ | ❌ | ❌ | ❌ | No rescue access |

---

## 6. Super Admin Access

**Status: ✅ IMPLEMENTED (2026-08-10)**

### Changes Made:
1. **`src/utils/rbac.ts`** — Added Super Admin bypass in `hasPermission()`:
   ```typescript
   if (currentRole === "super_admin") return true;
   ```

2. **`src/components/layout/ProtectedRoute/ProtectedRoute.tsx`** — Added early return for Super Admin:
   ```typescript
   if (currentRole === "super_admin") {
     return <Outlet />;
   }
   ```

### Behavior:
- Super Admin now has **unrestricted access** to all rescue management routes and actions.
- No individual permissions need to be assigned to Super Admin.
- Sidebar shows all rescue modules (Rescue Management, Rescue Requests, Rescue Dispatch).
- Direct navigation to `/rescues`, `/rescue-requests`, `/rescue-dispatch` works without `/403`.
- All create/edit/delete/approve/reject/dispatch actions work.

---

## 7. Permission / Authorization Behavior

### Route Guards (`App.tsx`)
- Uses `ProtectedRoute` with **any-of** permission check for rescue routes:
  ```tsx
  permission={["view_rescues", "view_rescue_requests", "view_rescue_dispatch"]}
  ```
- Allowed roles: `super_admin`, `rescue_centre_admin`, `rescue_coordinator`, `rescue_agent`

### Sidebar Visibility (`roleUtils.ts` → `getMenusForRole`)
- Super Admin: Shows all 3 modules (Rescue Management, Rescue Requests, Rescue Dispatch)
- Rescue Centre Admin: Shows all 3 modules
- Rescue Coordinator: Shows all 3 modules
- Rescue Agent: Shows all 3 modules

### Service-Level Permissions (`rescueService.ts`)
Action events published with `targetRoles` including `super_admin` for all rescue actions.

---

## 8. API / Service Dependencies

| Service Function | Endpoint | Method |
|------------------|----------|--------|
| `getRescueCases` | `/rescue` | GET |
| `createRescueCase` | `/rescue/report` | POST |
| `updateRescueCase` | `/rescue/{id}/verify` | POST |
| `updateRescueStatus` | `/rescue/{id}/verify` | POST |
| `deleteRescueCase` | `/rescue/{id}` | DELETE |
| `getRescueRequests` | `/rescue` | GET |
| `createRescueRequest` | `/rescue/report` | POST |
| `approveRescueRequest` | `/rescue/{id}/verify` | POST |
| `rejectRescueRequest` | `/rescue/{id}/fail` | POST |
| `getDispatches` | `/rescue` (derived) | GET |
| `createDispatch` | `/rescue/{id}/dispatch` | POST |
| `updateDispatchStatus` | `/rescue/dispatch/{id}` | PATCH |

---

## 9. Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Rescue Management page | ✅ Complete | Full CRUD, stat cards, modals |
| Rescue Requests page | ✅ Complete | Triage workflow (approve/reject) |
| Rescue Dispatch page | ✅ Complete | Dispatch creation, status tracking |
| Route protection | ✅ Complete | Any-of permission check |
| Super Admin full access | ✅ Complete | Bypass in rbac.ts + ProtectedRoute |
| Sidebar visibility | ✅ Complete | All modules shown for authorized roles |
| Service layer | ✅ Complete | All CRUD + action events |
| UI components | ✅ Complete | DataTable, StatCard, Modal, Can wrapper |

---

## 10. Known Limitations / Issues

| Issue | Impact | Workaround / Fix |
|-------|--------|------------------|
| Dispatch list derived from `/rescue` response | No dedicated `/dispatch` endpoint; dispatches only visible if parent request has `dispatch` object | Backend would need dedicated dispatch list endpoint |
| Standby Units stat is hardcoded "—" | No backend data for available units | Requires backend support for fleet availability |
| No pagination in `fetchAllDogs`/`fetchAllShelters` equivalents | Full list fetch for stats | Acceptable for current scale; pagination would need backend support |
| Rejection reason only shown in view modal | Not in main table | Low priority; available in detail view |

---

## 11. Validation / Testing Status

| Test | Result | Date |
|------|--------|------|
| Super Admin: Access `/rescues` | ✅ Pass | 2026-08-10 |
| Super Admin: Access `/rescue-requests` | ✅ Pass | 2026-08-10 |
| Super Admin: Access `/rescue-dispatch` | ✅ Pass | 2026-08-10 |
| Super Admin: Create rescue case | ✅ Pass | 2026-08-10 |
| Super Admin: Edit rescue case | ✅ Pass | 2026-08-10 |
| Super Admin: Delete rescue case | ✅ Pass | 2026-08-10 |
| Super Admin: Approve/reject request | ✅ Pass | 2026-08-10 |
| Super Admin: Create dispatch | ✅ Pass | 2026-08-10 |
| Super Admin: Direct navigation (no sidebar) | ✅ Pass | 2026-08-10 |
| Rescue Centre Admin: Access all three | ✅ Pass | 2026-08-10 |
| Rescue Coordinator: Access all three | ✅ Pass | 2026-08-10 |
| Rescue Agent: Access all three | ✅ Pass | 2026-08-10 |
| Veterinarian: No access (403) | ✅ Pass | 2026-08-10 |
| Shelter Manager: No access (403) | ✅ Pass | 2026-08-10 |
| `npm run build` | ✅ Pass | 2026-08-10 |
| `npm run lint` | ✅ Pass (pre-existing only) | 2026-08-10 |

---

## 12. Files Modified for Super Admin Fix (2026-08-10)

| File | Change |
|------|--------|
| `src/utils/rbac.ts` | Added `if (currentRole === "super_admin") return true;` in `hasPermission()` |
| `src/components/layout/ProtectedRoute/ProtectedRoute.tsx` | Added early return for Super Admin before permission/role checks |

---

*Document generated based on actual codebase inspection. No functionality was invented.*