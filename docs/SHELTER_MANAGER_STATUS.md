# Shelter Manager Module - Real API Integration Status

## Status: Shelter Manager Module Wired to Real Backend APIs

The Shelter Manager module (`/dashboard`, `/shelters`, `/pets`, `/fosters`, `/medical-records`, `/adoptions`, `/inventory`, `/reports`, `/notifications`, `/users`) now uses only the real deployed backend at `https://pawguard-backend-mqri.onrender.com/api/v1`. No mock data, no hardcoded sample values, no fabricated responses. Every metric shown is derived from a live API call or the live response payload.

## What Was Implemented

### 1. Shelter Service (rewritten) - `src/services/shelterService.ts`
- `GET /shelter/facilities` - paginated facility list
- `GET /shelter/facilities/{facility_id}` - facility detail
- `POST /shelter/facilities` - register facility (`ShelterFacilityCreate`: `name`, `address`, `phone`, `latitude`, `longitude`, `total_capacity`, `facility_type`)
- `PUT /shelter/facilities/{facility_id}` - update facility (`ShelterFacilityUpdate`)
- `PUT /shelter/facilities/{facility_id}/status` - status transition (`active` / `inactive` / `maintenance`)
- `DELETE /shelter/facilities/{facility_id}` - delete facility
- `GET/POST /shelter/facilities/{facility_id}/sections` - section management (`SectionType`: `quarantine`, `isolation`, `surgical`, `puppy`, `general`, `adoption`)
- `GET/POST /shelter/sections/{section_id}/kennels` - kennel management (`KennelCreate`: `identifier`, `capacity`)
- `POST /shelter/kennels/{kennel_id}/assign/{dog_id}` - cage allocation (no request body)
- `PUT /shelter/kennels/{kennel_id}/sanitation` - sanitation update (no request body; `KennelSanitationState`: `clean`, `needs_cleaning`, `disinfecting`, `out_of_service`)

Fixed the previous implementation which invented a `location`/`capacity`/`manager` create payload, used `POST /shelter/facilities` incorrectly, fabricated kennel IDs, and had no delete/status/edit support.

### 2. Shelter Facilities Page - `src/pages/shelters/Shelters.tsx`
- Facility directory from `GET /shelter/facilities` with real columns (id, name, address, phone, total capacity, status)
- Server-side search (`search` param) + server-side pagination (`page` / `page_size` / `meta.total`) wired into the shared `DataTable` (`serverMode`); "Rescue Facilities" stat uses the authoritative `meta.total`
- Stats derived from the live facility list fetched at `page_size: 200` (total count, sum of `total_capacity`, count of `status === "active"`) - the previously invented `shelters.length * 4` staff count was removed; the cage-allocation modal and stats use the full facility list, not just the current page
- Register modal (`POST /shelter/facilities`) - all fields start empty; only the API-documented default `facility_type: "shelter"` is pre-selected
- Edit modal (`PUT /shelter/facilities/{id}`), delete confirmation (`DELETE /shelter/facilities/{id}`)
- Cage allocation cascade: facility -> sections -> kennels + dogs loaded live from `GET /dogs`, then `POST /shelter/kennels/{kennel_id}/assign/{dog_id}`
- Loading / error / empty states present; action buttons gated by `Can` (`create/edit/manage/delete_shelters`)

### 3. Dog Profiles - `src/services/petService.ts` + `src/pages/pets/Pets.tsx`
- `GET /dogs`, `POST /dogs`, `PUT /dogs/{dog_id}`, `DELETE /dogs/{dog_id}`
- Server-side search (`search` param) + server-side pagination (`page` / `page_size` / `meta.total`) wired into the shared `DataTable` (`serverMode`); "Total Registered Dogs" stat uses the authoritative `meta.total`
- Create payload uses the real `DogProfileCreate` fields (`name`, `breed`, `gender`, `estimated_age`, `age_months`, `weight`, `is_adoptable`, ...) - no invented `age`/`location`/required `breed`
- Real `DogStatus` enum: `rescued`, `clinic`, `shelter`, `fostered`, `adopted`; real `gender` enum: `male`, `female`, `unknown`
- `markDogAdoptable(dogId)` -> `PUT /dogs/{dog_id}` `{ "is_adoptable": true }`
- Edit (status + adoptable toggle) and delete gated by `edit_animals` / `delete_animals`; register gated by `create_animals`
- Stats derived from `is_adoptable` and in-shelter statuses over the full list (`page_size: 500`); the status/mark-adoptable pickers use the full list, not just the current table page; loading / error / empty states present

### 4. Shelter Manager Dashboard - `src/pages/dashboard/roles/ShelterManagerDashboard.tsx`
- All four headline stats are derived from real record endpoints: Facilities = `GET /shelter/facilities` list length (matches the Shelters page); Kennels = live kennel hierarchy count (`GET /shelter/facilities` -> sections -> kennels); Shelter Animals = `GET /dogs` total; Occupancy = dogs in care (`rescued|clinic|shelter`) / sum of `total_capacity` x 100, shown as `N/A` when capacity is 0
- The previous `occupancy_rate` from the free-form `GET /dashboards/shelter` payload (source of the "900%" bug) is no longer trusted; the dashboard stops reading `total_facilities`/`occupancy_rate` from that dict
- Kennel registry uses real `KennelResponse` fields (`identifier`, `section`, `capacity`); sanitation state is left blank (honest) when the list API does not return it
- The invented `shelters.length * 4` staff stat was removed; quick actions navigate to real modules (`/shelters`, `/pets?action=register`, `/inventory`, `/users`)

### 5. Foster Management - `src/services/fosterService.ts` + `src/pages/fosters/FosterManagement.tsx`
- `GET /fosters` - foster profiles (`FosterProfileResponse`: `user`, `status`, `max_capacity`, `active_count`, `is_available`)
- `POST /fosters/apply` - new foster application
- `POST /fosters/{profile_id}/placements` - place a dog (`FosterPlacementCreate`: `foster_id`, `dog_id`, ...)
- `POST /fosters/placements/{placement_id}/return` - return a dog (`FosterReturnRequest`)
- `PUT /fosters/{profile_id}` / `DELETE /fosters/{profile_id}` - profile update/removal
- Removed the invented `POST /fosters` create and `GET /fosters/{id}` "placement list" methods that do not exist in the spec
- Stats = Foster Profiles / Available Homes (`is_available`) / Dogs in Foster Care (sum of `active_count`) - the hardcoded `14` was removed
- "Place Dog in Foster Care" button gated by `create_foster_placements` (shelter_manager does not hold this permission; foster placement is a `foster_coordinator` action)

### 6. Shared Component - `src/components/common/DataTable.tsx`
- `renderRowActions` prop (declared but never rendered) is now rendered as an "Actions" column, with corrected colSpan accounting

### 7. Navigation & RBAC (verified, adjusted)
- `shelter_manager` sidebar now includes: Dashboard, Shelter Facilities, Dog Profiles, Shelter Staff, Medical Records, Adoptions, Inventory, Reports & Analytics, Notifications
- Route guards: `/adoptions` (`view_adoptions`) and `/medical-records` (`view_medical`) now include `shelter_manager`; `/notifications` expanded to all roles with `view_notifications`; `/roles-permissions` remains `super_admin`-only (guarded by `view_roles`/`manage_roles`)
- `shelter_manager` permissions: `view/create/edit animals`, `view/create/edit/manage shelters`, `view medical`, `view adoptions`, `view/create/edit inventory`, `view/export reports`, `view users`, `view notifications`
- Verified read-only boundaries: Users page (module `users`, Edit/Delete hidden; the "Manage Role Access" quick action that hard-redirects to `/roles-permissions` is now gated by `manage_permissions`, so only `super_admin` sees it), Medical Records (create actions gated by `create_medical`), Adoptions (status/approve gated), Inventory (create gated by `create_inventory`), Reports (Finance/Donation export cards gated by `view_finance` so `shelter_manager` only sees the rescue report; report-type access is backend-enforced via `POST /reports/generate`)

## Shelter Manager Audit Fixes (current pass)

| Issue | Fix |
|-------|-----|
| Occupancy showed ~900% | Derived from real records: in-care dogs (`rescued\|clinic\|shelter`) / total facility capacity x 100; `N/A` when capacity is 0. No longer reads `occupancy_rate` from the free-form `/dashboards/shelter` dict |
| Facility count mismatch (Dashboard 7 vs Shelters 6) | Both now use the `GET /shelter/facilities` list (dashboard counts `data.length`; Shelters stat uses `meta.total`) |
| Shelter Staff exposed global role management | "Manage Role Access" card gated by `manage_permissions` (super_admin only); the hard redirect to `/roles-permissions` can no longer be triggered by `shelter_manager` |
| Reports exposed Finance/Donation exports to `shelter_manager` | Finance Report + Donation Report export cards wrapped in `<Can permission="view_finance">`; only the rescue report remains for `shelter_manager` |
| Adoptions "Home Verifications" = literal "Track In Modal" | Stat now counts applications with a real `home_inspection_scheduled_at`; "Pending Applications" no longer counts rejected as pending |
| Medical "Certificates Issued" fell back to total records | Counted live via `GET /medical/clearances/dogs/{dog_id}` per dog (`status === "approved"`); new `medicalService.getDogClearances` method |
| Search/pagination were client-side only | `DataTable` gained a `serverMode` (controlled search + page + totalCount); Shelters and Pets now query the backend `search`/`page`/`page_size` params and display `meta.total` |

## Missing / Unsupported Backend APIs

When a feature cannot be backed by a real endpoint, the UI omits it rather than faking it. The gaps below are backend-side limitations confirmed against the OpenAPI spec.

| Module | Feature | Required API | Current API Status | Why Blocked |
|--------|---------|--------------|--------------------|-------------|
| Shelter | List placements for a foster profile | `GET /fosters/{profile_id}/placements` | Not in spec; only `POST /fosters/{profile_id}/placements` exists | Placements can be created/returned but not listed or queried by ID; the foster profile's `active_count` is the only occupancy signal available |
| Shelter | Kennel-level dog occupancy in list responses | `dog_id` / `occupied` field on `KennelResponse` | `KennelResponse` = `id`, `section_id`, `identifier`, `capacity`, `created_at`, `updated_at` only | Occupancy must be cross-referenced from `GET /dogs`; the kennel registry shows only the fields the API provides |
| Shelter | Current kennel sanitation state in list responses | `sanitation_state` on `KennelResponse` | `KennelSanitationState` enum exists but surfaces only via the `PUT /shelter/kennels/{kennel_id}/sanitation` response | The kennel table can only show sanitation state when the dashboard payload includes it; otherwise the cell is left blank (honest) rather than faked |
| Shelters | Facility status on create | `status` on `ShelterFacilityCreate` | Create payload has no `status` field; status is set via `PUT .../status` and defaults server-side | UI exposes the documented status-transition endpoint instead |
| Adoptions | Edit/delete adoption applications | `PUT/DELETE /adoptions/{app_id}` | Only `GET /adoptions`, `PATCH .../status`, `.../agreement`, `.../fee`, `.../follow-ups` exist | Shelter manager is view-only; application status transitions remain backend-driven |
| Fosters | Return / progress / supplies actions in the shelter UI | `GET /fosters/placements/{placement_id}/progress`, `/supplies` | Endpoints exist in spec but require a `placement_id` that cannot be listed | No placement listing endpoint, so row-level foster actions are not rendered for shelter_manager |
| Medical | Vet-only create/edit of records | `POST/PUT /medical/*` | Endpoints exist but require vet permissions | Shelter manager is `view_medical` only; no write buttons are shown |

## Available Backend APIs Not Yet Surfaced in the Shelter Manager UI
- `GET /shelter/care-logs`, `GET /shelter/dogs/{dog_id}/care-logs` - daily care logs
- `GET/POST /shelter/kennels/{kennel_id}/cleaning-logs` - kennel cleaning history
- `GET/POST /shelter/transfers`, `POST /shelter/transfers/{id}/confirm-receiver`, `.../confirm-sender` - dog transfers between facilities
- `GET /dogs/{dog_id}/timeline`, `GET /dogs/{dog_id}/weights`, `POST /dogs/{dog_id}/weight` - dog lifecycle and weight history
- `GET /adoptions/{app_id}/scores` - adoption scorecards
- `GET /inventory/requisitions`, `POST /inventory/requisitions` - supply requisitions (inventory management)
- `POST /fosters/placements/{placement_id}/progress`, `.../supplies` - foster care logging (needs a placement listing endpoint first)

These are candidates for a future shelter operations workspace, not faked in the current UI.

## Verification
- `npm run build` (`tsc -b && vite build`): success (only the pre-existing chunk-size warning); re-run green after the audit fixes
- No sample/fake data introduced; the only defaults used are API-documented ones (`facility_type: "shelter"`, section type `general`, sanitize-to-`clean` semantics via the no-body sanitation endpoint)
- All row/action affordances are permission-gated so shelter_manager sees exactly what its role permits; the inventory "Reorder" button only pre-fills a quantity of 50 into the real purchase-order form (editable before the requisition is submitted)
