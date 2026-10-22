# Point-of-Sale & Service CRM System

An event-driven Point-of-Sale (POS) and Customer Relationship Management (CRM) platform for small, localized deployments (an on-premise mini-PC serving a LAN). It is built around database-enforced invariants, idempotent writes, real-time cache synchronization, and indexed queries that stay fast at ~100,000 orders.

> **Status: paused.** The core backend (database engine, idempotency lifecycle, real-time sync, order processing, CRUD modules) is working. The admin Dashboard is still UI placeholders. See [Project Status](#project-status).

<!-- TODO: add 1-2 screenshots or a short GIF of the UI here (e.g. order list, order detail). -->

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Status](#project-status)
- [Architecture](#architecture)
- [Idempotency Engine & Concurrency Control](#idempotency-engine--concurrency-control)
- [Real-Time Cache Sync](#real-time-cache-sync-postgresql-listennotify--sse)
- [Dual-Track Order State Machine](#dual-track-order-state-machine)
- [Database Design](#database-design)
- [Data Access Strategy](#data-access-strategy)
- [Performance Profiling & Seed Data](#performance-profiling--seed-data)

---

## Features

- **Order management:** create, track, and close service orders with line items, discounts, and extra costs. Totals are computed inside the database.
- **Dual-track order lifecycle:** fulfillment status (`pending` → `delivered`) is tracked separately from payment status (`paid` / `unpaid` / `owed`), with rules enforced by database constraints.
- **Customers & loyalty points:** customer records with points earned and redeemed per order, plus debt tracking for orders owed.
- **Service catalog & spending tickets:** price definitions for services and financial records for expenses.
- **Staff accounts:** phone-number login with user roles.
- **Real-time multi-user sync:** changes made at one terminal appear on the others without a manual refresh.
- **Safe retries on unreliable LAN:** idempotent POST/PATCH requests prevent double-billing and duplicate orders.
- **Vietnamese-aware search & sorting:** accent-insensitive substring search and Vietnamese alphabetical collation.
- **Privacy-minded deletes:** soft-deleting a customer scrubs their personal data.

## Tech Stack

| Layer          | Technology                                                  |
| -------------- | ----------------------------------------------------------- |
| Frontend       | React, Redux Toolkit (RTK Query), Ant Design                |
| Backend        | Node.js, Express.js (repository pattern)                    |
| Database       | PostgreSQL 16+ (PL/pgSQL; extensions `pg_trgm`, `unaccent`) |
| Infrastructure | Docker, Docker Compose, Nginx reverse proxy                 |

---

## Getting Started

### Prerequisites

- [Docker Engine](https://docs.docker.com/get-docker/) v20.10.0+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.0.0+

### Installation

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2. **(Optional) Override the default configuration**

    The app ships with working defaults. To override them, create a `.env` file in the project root:

    ```env
    DB_USER=postgres
    DB_PASSWORD=password123
    DB_NAME=crm_db
    JWT_SECRET=my_demo_secret
    ```

    <!-- TODO: if a .env.example exists in the repo, point to it here and make sure .env is in .gitignore. -->

3. **Start the application**

    ```bash
    docker compose up --build
    ```

    On the **first boot**, PostgreSQL creates the schema and loads ~247,000 rows of mock data from `mockdata.sql`. The backend runs `setup.js`, which polls the database and retries until seeding finishes and the default admin account exists, and only then opens its API port. The first start therefore takes noticeably longer than later ones.

> [!WARNING]
> The credentials and secrets in this README are **for local demos only**. Change `DB_PASSWORD`, `JWT_SECRET`, and the default admin password, and stop publishing the PostgreSQL port, before running this anywhere real.

### Accessing the Services

| Service           | URL / Port                                     | Description           |
| ----------------- | ---------------------------------------------- | --------------------- |
| Frontend          | [http://localhost:3000](http://localhost:3000) | Web application UI    |
| Backend API       | [http://localhost:5000](http://localhost:5000) | Express / Node.js API |
| API Documentation | [http://localhost:8080](http://localhost:8080) | Swagger interface     |
| PostgreSQL        | `localhost:5432`                               | Database server       |

### Default Admin Login

| Field        | Value        |
| ------------ | ------------ |
| Phone number | `0988888888` |
| Password     | `password`   |

### Useful Commands

```bash
# Run in the background
docker compose up -d --build

# Follow logs
docker compose logs -f

# Stop the application (data is kept)
docker compose down

# Stop and DELETE all database data (re-seeds on next start)
docker compose down -v
```

---

## Project Status

This is a stable development snapshot, currently on hold.

**Working**

- Database engine, triggers, and constraints
- Idempotency lifecycle
- Real-time SSE sync
- Order processing and CRUD modules

**Known limitations**

- **Dashboard:** the main Dashboard view (`/admin/.../dashboard`) shows UI placeholders and is not yet connected to live API metrics. To try the integrated workflows, log in with the default admin account and use the topbar menu to reach the other pages.

<!-- TODO: add a short Roadmap (e.g. wire up Dashboard metrics) and a License section. -->

---

## Architecture

```
          +-----------------------+
          |   React + RTK Query   |
          |  (AntD UI Component)  |
          +-----------+-----------+
                      |
              HTTP / SSE Stream
                      |
          +-----------v-----------+
          |      Nginx Proxy      |
          +-----------+-----------+
                      |
          +-----------v-----------+
          |   Node.js / Express   |
          |  (Repository Pattern) |
          +-----------+-----------+
                      |
             pg Pool / Session
                      |
          +-----------v-----------+
          |  PostgreSQL Database  |
          | (Triggers, Constraints|
          |    LISTEN / NOTIFY)   |
          +-----------------------+
```

Business rules live as close to the data as possible: constraints, generated columns, and triggers guarantee correctness even if application code has a bug.

---

## Idempotency Engine & Concurrency Control

To prevent double-billing, duplicate orders over an unreliable LAN, and race conditions between concurrent cashiers, core transactions combine a PostgreSQL-backed idempotency layer with explicit row-level lock modes.

### Idempotency Engine & Lock Stealing

POST/PATCH requests pass through an idempotency layer that hashes the request payload and recovers automatically from stale locks.

![idempotency-key-lifecycle](design/idempotency_key_life_cycle.drawio.png)

Lock reservation is a single atomic `UPSERT`:

```sql
INSERT INTO idempotency_keys (idempotency_key, user_id, request_hash, status, locked_at)
VALUES ($1, $2, $3, 'started', CURRENT_TIMESTAMP)
ON CONFLICT (user_id, idempotency_key)
DO UPDATE SET
  locked_at = EXCLUDED.locked_at,
  fence_token = idempotency_keys.fence_token + 1
WHERE
  idempotency_keys.status = 'started'
  AND idempotency_keys.locked_at < (CURRENT_TIMESTAMP - INTERVAL '5 seconds')
RETURNING *;
```

**Key properties**

- **Atomic lock stealing:** if a backend process crashes mid-request, a lock stuck in `'started'` for more than 5 seconds can be taken over by the next retry. Each takeover increments `fence_token`, so a request that lost its lock can be told apart from the current holder.
- **Payload verification (`request_hash`):** reusing an existing key with a different request body returns `400 Bad Request` immediately.
- **Transaction binding:** key completion (`updateSuccess`) uses the same database transaction (`client`) as the business operation, so the key is marked complete atomically with the domain records.

<!-- TODO: add one or two sentences on exactly how fence_token is checked at completion time, and whether the 5s timeout is configurable. -->

### Explicit Pessimistic Locking

Inside `OrderService`, reads use targeted PostgreSQL lock modes:

- **`FOR NO KEY UPDATE` (mutation and state locks):** taken on customer rows (`lockCustomerById`) before loyalty points (`points_used` / `points_earned`) change, and on order rows (`fetchAndLockOrder`) during status updates (`updateStatus`) and soft deletes (`removeOrder`). This blocks concurrent modification of the same row while avoiding unnecessary contention with foreign-key checks on related tables.
- **`FOR SHARE` (shared guard locks):** taken on staff profiles (`users`, via `lockHandlerAndCheckExistence`) and service prices (`local_services`, via `checkServicesAndLock`) during order creation. An administrator cannot edit those rows mid-transaction, while other cashiers can still read the same reference data concurrently.

---

## Real-Time Cache Sync (PostgreSQL LISTEN/NOTIFY + SSE)

Instead of WebSockets, client state is synchronized with PostgreSQL's native pub/sub (`LISTEN`/`NOTIFY`) bridged to the browser through Server-Sent Events (SSE).

```mermaid
sequenceDiagram
    autonumber
    actor ClientA as Client A (Mutating)
    participant Express as Express Backend
    participant PG as PostgreSQL DB
    actor ClientB as Client B (Subscribed)

    ClientB->>Express: GET /api/events?clientId=B
    Express-->>ClientB: 200 OK (Keep-Alive text/event-stream)

    ClientA->>Express: POST or PATCH /api/orders (Header: X-Client-Id: A)
    Note over Express: Set session context:<br/>app.current_client_id = 'A'
    Express->>PG: INSERT or UPDATE local_orders
    Note over PG: Constraint Trigger Fires at COMMIT:<br/>Captures 'A', action, table & row_id
    PG-->>Express: NOTIFY db_changes (payload with senderId: 'A')
    Express-->>ClientA: 200 OK Response

    Note over Express: transformPayload():<br/>- INSERT -> type: "create", tag: "Order"<br/>- UPDATE -> type: "update", tag: "Order", id: row_id
    Express->>ClientB: SSE Event Broadcast (Excludes Client A)
    Note over ClientB: useSSESubscription Hook:<br/>- "create": invalidateTags(["Order"])<br/>- "update": invalidateTags([{type: "Order", id}])
```

**Implementation details**

- **Deferred constraint triggers:** notifications come from `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`, so they fire at commit time, after other cascading triggers (such as order-total recalculation) have run. The payload therefore reflects the final state of the row. Notifications are also only delivered if the transaction commits.
- **Echo suppression:** the trigger reads session metadata (`current_setting('app.current_client_id', true)`) and stamps the payload with `senderId`. Express skips the originating client, avoiding a redundant re-fetch.
- **RTK Query cache mapping:** database tables map to frontend cache tags (for example `local_orders` → `Order`), so only the affected cache entries are invalidated.

---

## Dual-Track Order State Machine

Fulfillment is tracked separately from the financial lifecycle, and the database enforces the rules on both tracks.

![order-life-cycle](design/order_life_cycle.drawio.png)

- **Fulfillment states:** `pending` → `working` → `completed` → `delivered`
- **Financial states:** `paid` vs. `unpaid` / `owed`
- **Prepaid invariant:** orders with `is_prepaid = true` skip debt checks and go straight from `completed` to `delivered`. They can never enter the `owed` state.
- **Audit enforcement:** moving to `delivered` requires non-null `closed_by`, `paid_at`, `payment_method`, and `order_end_date`, enforced by database constraints.

---

## Database Design

![Physical-ERD](design/POS_Physical_ERD.drawio.png)

![Trigger-Dependency](design/Trigger_dependency.drawio.png)

### Schema Features (`init.sql`)

#### Recursive loop guards

To stop infinite trigger cascades (line-item update → recalculate order total → trigger child updates), triggers use conditional guards:

```sql
CREATE TRIGGER trg_recalc_order_total_update
AFTER UPDATE ON local_order_service
FOR EACH ROW
WHEN (NEW.is_deleted = OLD.is_deleted) -- Suppresses cascade when soft-deleting
EXECUTE FUNCTION update_order_total_service_cost();
```

#### Generated columns and declarative invariants

Financial totals are calculated in the table definition itself:

```sql
-- Generated total cost
total_cost INT GENERATED ALWAYS AS (
    CASE
        WHEN discount_type = 'percentage' THEN ROUND((total_service_cost + extra_cost) * (100.0 - discount) / 100.0)
        ELSE (total_service_cost + extra_cost - discount)
    END
) STORED
```

#### Soft-delete PII scrubbing

Setting `is_deleted = TRUE` on a customer anonymizes their personal data through a PL/pgSQL trigger:

```sql
CREATE OR REPLACE FUNCTION soft_delete_customer()
RETURNS TRIGGER AS $$
BEGIN
  NEW.customer_name := NULL;
  NEW.customer_phone := NULL;
  NEW.customer_address := NULL;
  NEW.points := 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Indexing Strategy

All indexes are partial (`WHERE is_deleted = FALSE`), so soft-deleted rows never bloat lookup paths. The patterns below are grouped by what they optimize.

#### A. Covering partial indexes (`INCLUDE`)

Covering payloads let PostgreSQL answer hot queries with **Index-Only Scans**, without visiting table pages. This depends on the visibility map being current, so regular vacuuming matters.

Debt lookups:

```sql
CREATE INDEX idx_orders_owed ON local_orders (customer_id, owed_due_date ASC, order_id ASC)
INCLUDE (total_cost)
WHERE is_deleted = FALSE AND order_status = 'owed';
```

Line-item joins:

```sql
CREATE INDEX idx_order_service_lookup ON local_order_service (order_id)
INCLUDE (service_id, line_item_cost)
WHERE is_deleted = FALSE;
```

#### B. Active-state queue navigation

Worker dashboards only care about active orders, so this index excludes terminal states (`delivered`, `owed`). It stays small and speeds up the priority pickup queue (`NULLS LAST` ordering):

```sql
CREATE INDEX idx_orders_active_status_nav ON local_orders (
    order_status,
    planned_pickup_date ASC NULLS LAST,
    order_id ASC
)
WHERE is_deleted = FALSE AND order_status != 'delivered' AND order_status != 'owed';
```

#### C. Keyset pagination and locale-aware indexes

These support cursor pagination in $O(\log N)$ without sorting overhead or `OFFSET` drift.

Vietnamese alphabetical collation:

```sql
CREATE INDEX idx_customers_name_vi ON customers (customer_name COLLATE "vi-VN-x-icu" ASC, customer_id ASC)
WHERE is_deleted = FALSE;
```

Multi-column cursor:

```sql
CREATE INDEX idx_orders_customer_id ON local_orders (customer_id, order_start_date DESC, order_id DESC)
WHERE is_deleted = FALSE;
```

#### D. GIN trigram indexes (substring search)

Wildcard searches (`ILIKE '%term%'`) avoid full sequential scans by using a GIN trigram index over an unaccented, generated search column:

```sql
CREATE INDEX idx_customers_customer_name ON customers
USING gin (customer_name_search gin_trgm_ops)
WHERE is_deleted = FALSE;
```

Search terms shorter than 3 characters produce no usable trigrams, so PostgreSQL may fall back to a scan for those.

#### E. Byte-level and prefix-optimized B-trees

These skip locale-aware comparison for numeric strings and prefix matching.

Phone lookups with `COLLATE "C"` (plain byte comparison):

```sql
CREATE INDEX IF NOT EXISTS idx_customers_customer_phone
ON customers(customer_phone COLLATE "C" ASC, customer_id ASC)
WHERE is_deleted = FALSE;
```

Prefix matching (`LIKE '098%'`) with `text_pattern_ops`:

```sql
CREATE INDEX IF NOT EXISTS idx_users_user_phone_role
ON users(user_phone text_pattern_ops, user_role)
WHERE is_deleted = FALSE;
```

---

## Data Access Strategy

### Cursor-based (keyset) pagination

List endpoints use base64-encoded cursor tokens that carry a primary sort value and a unique tiebreaker ID (`cursorValue` + `cursorId`).

- **$O(\log N)$ page lookup:** instead of `OFFSET N LIMIT M`, which scans and discards N rows, the query jumps straight to the cursor position in the index.
- **Stable pages under concurrent writes:** new records and soft deletes don't cause skipped or duplicated rows, because each page starts from a fixed position. Results can still reorder if the sort column itself is edited between requests.

---

## Performance Profiling & Seed Data

Query performance was checked against a generated seed dataset (`mockdata.sql`) that simulates several years of activity.

### Dataset composition

| Table                    | Rows     | Notes                                                    |
| ------------------------ | -------- | -------------------------------------------------------- |
| `local_orders`           | 100,000  | Spanning 7 years of history                              |
| `local_order_service`    | 140,000+ | Line items                                               |
| `customers`              | 2,000    | Pareto distribution: 5% VIP, 15% Regular, 80% Occasional |
| `local_spending_tickets` | 5,000    | Financial records                                        |

### Execution plan checks

Indexes were checked with `EXPLAIN ANALYZE` after running `ANALYZE` to refresh statistics:

- **B-tree lookups:** phone lookups, primary-key fetches, and debt tracking moved from sequential scans to index scans on the 100k-order dataset.
- **Index-only scans:** debt lookups use an Index-Only Scan through the covering partial index `idx_orders_owed`.
- **Trigram bitmap scans:** `ILIKE '%abc%'` searches use GIN trigram bitmap scans over the unaccented text columns instead of sequential scans.

<!-- TODO: add measured results (before/after timings or a trimmed EXPLAIN ANALYZE output) so these claims can be checked. -->

---

## Acknowledgments

This project was built with assistance from Gemini 3.5 Flash-Lite.
