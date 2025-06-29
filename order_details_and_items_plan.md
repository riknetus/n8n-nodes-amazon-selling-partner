# Amazon Selling Partner Node  
## Implementation Plan – `getOrder` & `getOrderItems` Operations

### 1. Goals
1. Add two new, fully-featured operations to the **Orders** resource  
   • `getOrder` – GET `/orders/v0/orders/{orderId}`  
   • `getOrderItems` – GET `/orders/v0/orders/{orderId}/orderItems`  
2. Preserve all production-grade qualities already present in the project:  
   • advanced rate limiting, exponential back-off, error categorisation, metrics, audit logging, security validation, optional SigV4, tests, Docker-based execution.

---

### 2. High-Level Deliverables
| # | Deliverable | Description |
|---|-------------|-------------|
| D1 | Core code | New TypeScript logic inside `Orders.operations.ts` |
| D2 | UI schema | New options in `Orders.description.ts` |
| D3 | Tests | Unit, integration, E2E + load tests |
| D4 | Docs | README updates + new usage examples |
| D5 | CI adjustments | Lint, build, coverage gates remain 100 % |
| D6 | Observability | Metrics & audit log events for both endpoints |

---

### 3. Detailed Task Breakdown

#### Phase A – Design
A-1 Study SP-API swagger & rate limits for the two endpoints  
A-2 Document required/optional parameters & pagination pattern (NextToken for items)  
A-3 Define TypeScript interfaces for responses (Order, OrderItem, etc.)  
A-4 Update architecture diagram (optional)

#### Phase B – Schema & UI
B-1 `Orders.description.ts`  
 • Add **Operation** options: *Get Order Details*, *Get Order Items*  
 • Fields  
  – `Order ID` (string, required, regex 3-7-7)  
  – For items: `Return All` (boolean) + hidden `NextToken` handling  
B-2 i18n strings (if applicable)

#### Phase C – Core Implementation
C-1 `executeOrdersOperation` enhancements  
 • Branch `operation === 'getOrder'`  
  – Validate `orderId` against security validator  
  – Call `SpApiRequest.makeRequest` (GET, `/orders/v0/orders/${orderId}`)  
  – Wrap single payload into n8n item  
 • Branch `operation === 'getOrderItems'`  
  – Support pagination (`NextToken`) & `returnAll` flag  
  – Respect endpoint-specific rate limits (0.5 RPS, burst 30) via `RateLimiter`  
  – Map `OrderItems` array to n8n items with `pairedItem` metadata  
C-2 Shared helpers  
 • Add utility `appendQueryParams(url, params)` if not already present  
 • Add `OrderItem` TypeScript interface  
C-3 SecurityValidator additions  
 • Regex whitelist for `orderId`  
 • Parameter set size limits

#### Phase D – Observability & Error Handling
D-1 MetricsCollector  
 • `orders.getOrder` and `orders.getOrderItems` metric keys  
D-2 AuditLogger  
 • Record authentication, API access, failures  
D-3 ErrorHandler patterns  
 • Map 404 vs 429 vs 500 for new endpoints  
 • Retry with back-off on 429 (respecting `x-amzn-RetryAfter`)

#### Phase E – Testing
E-1 Unit Tests (Jest)  
 • Happy path for each operation  
 • Pagination logic for items  
 • Error scenarios: invalid ID, 404, throttling  
E-2 Integration Tests (`__tests__/integration/`)  
 • Mock SP-API sandbox responses  
E-3 E2E Workflow Tests  
 • Chain: `getOrders` → `SplitInBatches` → `getOrder` + `getOrderItems`  
E-4 Load Tests  
 • Update `LoadTestRunner` scenario weights (10 % each)  
 • Ensure overall RPS stays within policy
E-5 Coverage Goal: ≥ 95 % for new code (maintain project ≥ 90 %)

#### Phase F – Documentation
F-1 README: new operations, sample workflow JSON  
F-2 CREDENTIALS_GUIDE: confirm no new scopes needed  
F-3 CHANGELOG entry

#### Phase G – CI / CD
G-1 Update Jest snapshot paths  
G-2 Ensure Docker test compose includes new env vars if any  
G-3 Tag semantic version **v1.1.0**

---

### 4. Acceptance Criteria
1. All unit, integration, load and E2E tests pass in Docker.
2. No regression in existing functionality (`getOrders` remains 100 % tested).
3. Lint, type-check, and security scans are clean.
4. Metrics and audit logs display entries for new operations.
5. README examples work against SP-API sandbox credentials.
6. Coverage ≥ 95 % on new modules; total coverage ≥ 90 %.
7. Rate limiter honours 0.5 RPS / 30 burst for items endpoint.

---

### 5. Timeline & Effort (Ideal)
| Phase | Owner | Est. hrs |
|-------|-------|----------|
| Design | 🌐 | 4 |
| Schema/UI | 🌐 | 2 |
| Core Impl | 🌐 | 6 |
| Observability | 🌐 | 2 |
| Tests | 🌐 | 6 |
| Docs | 🌐 | 2 |
| CI/CD | 🌐 | 1 |
| **Total** |  | **23 hrs** |

---

### 6. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Higher RPS needed than 0.5 | API throttling | Configurable override + exponential back-off |
| Restricted data (buyer info) | Access denied | Document RDT requirement; implement if needed |
| Large orders (1000 + items) | Pagination loops | Hard limit + safe guard timeout |

---

### 7. Post-Deployment Checklist
- [ ] Deployed to internal staging n8n instance  
- [ ] Monitored metrics for 48 h – no error spikes  
- [ ] Gathered user feedback – UI clarity, ease of use  
- [ ] Tagged release & published npm package  

---

**Ready for execution.**  
Use this file as the authoritative task list for bringing *Get Order Details* and *Get Order Items* to production-quality readiness.