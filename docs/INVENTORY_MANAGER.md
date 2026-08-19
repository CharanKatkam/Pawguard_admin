# PAWGUARD ADMIN PORTAL — INVENTORY MANAGER

## 1. About the Role

The **Inventory Manager** is responsible for managing PawGuard's inventory lifecycle. This role maintains stock records, tracks inventory movements, manages suppliers, and ensures that inventory information is accurate and available to the teams that depend on it.

The Inventory Manager has operational control over inventory but does not have unrestricted access to system administration, RBAC, finance, medical, rescue, shelter, adoption, or volunteer administration.

### Primary Responsibilities

- Create inventory items
- View inventory items
- Update inventory items
- Delete inventory items
- Track inventory movements
- Manage suppliers
- Monitor stock availability
- Maintain accurate inventory records
- Support operational teams through reliable stock information

### RBAC Permissions

According to the backend role mapping, the Inventory Manager has:

- `inventory:create`
- `inventory:read`
- `inventory:update`
- `inventory:delete`
- `dashboard:inventory`

---

# 2. Role Purpose

The Inventory Manager ensures that PawGuard has accurate information about supplies and resources.

The role covers the complete inventory management cycle:

```text
Inventory Item Created
        ↓
Stock Recorded
        ↓
Inventory Updated
        ↓
Inventory Movement Recorded
        ↓
Stock Monitored
        ↓
Supplier Information Managed
        ↓
Inventory Records Maintained
```

The role should use live backend inventory data and should never rely on fabricated or mock stock values.

---

# 3. Complete Inventory Workflow

## Step 1 — Create Inventory Item

Permission:

`inventory:create`

The Inventory Manager can create inventory records for supplies and resources used by PawGuard.

Typical inventory information may include:

- Item name
- Item category
- Quantity
- Unit
- Stock information
- Supplier information
- Other fields supported by the backend

The exact fields must come from the existing backend API/schema.

---

## Step 2 — View Inventory

Permission:

`inventory:read`

The Inventory Manager can view inventory records.

The inventory view should allow the user to understand:

- What items exist
- Current stock
- Item information
- Supplier information where available
- Inventory status
- Relevant inventory history

The Admin Portal should display backend-provided values rather than creating local/mock inventory data.

---

## Step 3 — Update Inventory

Permission:

`inventory:update`

The Inventory Manager can update inventory records when information changes.

Examples include:

- Updating item information
- Updating stock-related information
- Updating inventory metadata
- Correcting an inventory record

The backend remains responsible for validating the update.

---

## Step 4 — Delete Inventory

Permission:

`inventory:delete`

The Inventory Manager can delete inventory records where the backend permits deletion.

Before deletion, the UI should provide an appropriate confirmation step so that accidental deletion is avoided.

If the backend rejects deletion because of business rules or dependencies, the UI must display the backend error instead of showing a false success message.

---

# 4. Inventory Movement Workflow

Inventory movements represent changes affecting stock.

The backend permission mapping identifies:

`POST /inventory/movements → inventory:update`

Therefore, creating an inventory movement requires inventory update permission.

## Typical Movement Lifecycle

```text
Inventory Item Exists
        ↓
Stock Movement Occurs
        ↓
Movement Recorded
        ↓
Inventory State Updated
        ↓
Current Stock Reflected
```

The movement record should come from the backend and should be treated as the source of truth.

The frontend must not calculate or fabricate stock movements independently when the backend already provides the authoritative inventory state.

---

# 5. Supplier Management

Supplier management is part of the Inventory Manager's operational responsibilities.

The backend permission mapping provides:

```text
POST/GET/PUT/DELETE /inventory/suppliers/*
→ inventory:create/read/update
```

## Supplier Actions

### View Suppliers

`inventory:read`

The manager can view supplier records.

### Create Supplier

`inventory:create`

The manager can create supplier records where supported.

### Update Supplier

`inventory:update`

The manager can update supplier information.

### Delete Supplier

The backend endpoint mapping includes supplier DELETE operations, but the documented permission mapping specifically associates the supplier route with:

- `inventory:create`
- `inventory:read`
- `inventory:update`

Therefore, the frontend should follow the actual backend authorization response rather than assuming an additional permission that is not documented.

---

# 6. Inventory Dashboard

Permission:

`dashboard:inventory`

The Inventory Manager has access to the Inventory Dashboard.

The dashboard should provide an operational summary based on real backend data.

### Useful Dashboard Information

Where supported by the existing backend:

- Total inventory items
- Current stock
- Inventory movements
- Supplier information
- Stock-related activity
- Other inventory statistics returned by the backend

### Important Rule

Dashboard statistics must come from live backend data.

Do not create:

- Fake stock counts
- Mock inventory items
- Hardcoded supplier counts
- Fake movement statistics

If the backend returns no data, display a proper empty state.

Example:

> No inventory items available.

---

# 7. Inventory Module

The Inventory module is the primary workspace of this role.

## Inventory Items

### Create

Permission:

`inventory:create`

Create new inventory records using the backend API.

### Read

Permission:

`inventory:read`

View inventory records and available information.

### Update

Permission:

`inventory:update`

Modify inventory records.

### Delete

Permission:

`inventory:delete`

Remove inventory records where permitted by the backend.

---

# 8. Inventory Movement Module

The Inventory Manager can record inventory movements using:

`inventory:update`

The interface should support the backend's actual movement model.

The Admin Portal should not invent additional movement types or fields.

If the backend provides movement history, it should be displayed as the authoritative history.

---

# 9. Supplier Module

The Inventory Manager can work with supplier information according to the backend API.

### Supplier Workflow

```text
Create Supplier
      ↓
View Supplier
      ↓
Update Supplier
      ↓
Use Supplier Information for Inventory Operations
      ↓
Delete Supplier Where Backend Allows
```

Supplier information should remain synchronized with backend records.

---

# 10. Role-Based Access Summary

| Module / Capability | Access |
|---|---|
| Inventory Items | Create / Read / Update / Delete |
| Inventory Movements | Update / Create movement |
| Suppliers | Create / Read / Update, with deletion subject to backend authorization |
| Inventory Dashboard | Access |
| Rescue | No direct role permission |
| Shelter | No direct role permission |
| Medical | No direct role permission |
| Adoption | No direct role permission |
| Foster | No direct role permission |
| Volunteer | No direct role permission |
| Finance | No direct role permission |
| System RBAC | No |
| User Administration | No |
| Super Admin Functions | No |

---

# 11. Permission-to-Action Mapping

| Permission | Action |
|---|---|
| `inventory:create` | Create inventory items and supported supplier records |
| `inventory:read` | View inventory and supplier records |
| `inventory:update` | Update inventory, suppliers, and create supported inventory movements |
| `inventory:delete` | Delete inventory items where authorized |
| `dashboard:inventory` | Access Inventory Dashboard |

---

# 12. Complete User Journey

```text
Login
  ↓
Inventory Manager Dashboard
  ↓
Review Inventory Summary
  ↓
Open Inventory
  ↓
View Current Stock
  ↓
Create / Update Inventory Item
  ↓
Record Inventory Movement
  ↓
Review Supplier Information
  ↓
Create / Update Supplier
  ↓
Monitor Inventory Records
```

---

# 13. Inventory Management Rules

## Rule 1 — Backend Is the Source of Truth

The backend determines:

- Valid inventory records
- Valid fields
- Valid stock values
- Valid movement operations
- Valid supplier operations
- Authorization
- Validation rules

The frontend must follow those definitions.

## Rule 2 — No Mock Data

The Inventory Manager dashboard and module must use actual backend data.

Do not generate placeholder inventory records simply to make the dashboard appear populated.

## Rule 3 — Permission Enforcement

The UI should respect the user's effective RBAC permissions.

The backend remains the final authorization layer.

## Rule 4 — Direct Permission Overrides

If the RBAC system grants a user an additional inventory permission through a direct user-level override, the Admin Portal should honor the effective permission returned by the RBAC system.

## Rule 5 — Errors Must Be Honest

If an inventory operation fails, display the backend error.

Do not show:

> Inventory updated successfully

when the backend rejected the operation.

---

# 14. Empty-State Behavior

When there are no inventory records:

```text
No inventory items available.
```

When there are no movements:

```text
No inventory movements available.
```

When there are no suppliers:

```text
No suppliers available.
```

When dashboard statistics have no underlying data, show the actual empty state rather than fabricated values.

---

# 15. Inventory Dashboard Conclusion

The **Inventory Manager** is the operational owner of PawGuard inventory information.

The role provides:

- Full inventory item CRUD access
- Inventory movement operations supported by the backend
- Supplier management according to backend authorization
- Inventory dashboard access
- Accurate stock and inventory record management

The Inventory Manager should have a focused workspace dedicated to maintaining reliable operational inventory data.

The role should not receive unrelated administrative privileges.

All inventory actions must remain aligned with the **backend RBAC system and existing OpenAPI contracts**, with the backend serving as the final source of truth.
