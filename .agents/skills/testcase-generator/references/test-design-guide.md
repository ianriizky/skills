# Test Case Design Guide

Coverage heuristics, edge case patterns, and writing tips for generating thorough
test cases from a PRD. Read this during Step 3 (Generate Test Cases) when you need
inspiration or want to ensure you haven't missed important scenarios.

## Table of Contents

1. [Coverage Heuristics](#coverage-heuristics)
2. [Edge Case Patterns](#edge-case-patterns)
3. [Negative Case Patterns](#negative-case-patterns)
4. [Test Data Patterns](#test-data-patterns)
5. [Priority Assignment Guide](#priority-assignment-guide)
6. [Language Conventions](#language-conventions)

---

## Coverage Heuristics

For each feature or requirement in the PRD, run through these questions. Every
"yes" should produce at least one test case.

### Functional Coverage

- [ ] Can the user **create** this entity/record? → Positive: create with valid data
- [ ] Can the user **read/view** this entity? → Positive: view with existing data
- [ ] Can the user **update** this entity? → Positive: update with valid changes
- [ ] Can the user **delete** this entity? → Positive: delete + verify removal
- [ ] What happens with **empty state** (no records)? → Edge: empty state display
- [ ] What happens at **maximum capacity** (pagination limits)? → Edge: boundary
- [ ] What **validations** exist? → Negative: violate each validation rule
- [ ] Are there **required fields**? → Negative: submit with empty required field
- [ ] Are there **format constraints** (email, phone, date)? → Negative: invalid format
- [ ] Are there **range constraints** (min/max, length)? → Edge: boundary values

### Role & Access Coverage

- [ ] Which **roles** can access this feature? → Positive: each authorized role
- [ ] Which roles are **denied**? → Negative: unauthorized role attempt
- [ ] Are there **admin-only** actions? → Negative: non-admin attempts admin action
- [ ] Is there **2FA/multi-factor** protection? → Edge: action without full session

### State & Lifecycle Coverage

- [ ] Are there **status transitions**? → Positive: each valid transition
- [ ] Are there **blocked transitions**? → Negative: attempt invalid transition
- [ ] Can a state be **reversed** (e.g., unverify)? → Edge: toggle back and forth
- [ ] Are there **concurrent state changes**? → Edge: race condition scenario
- [ ] What happens to **related data** on state change? → Edge: cascading effects

### Integration Coverage

- [ ] Does this feature call an **external API/webhook**? → Positive: valid payload
- [ ] What if the external system is **unavailable**? → Negative: timeout/error
- [ ] Are there **duplicate detection** mechanisms? → Positive: duplicate skipped
- [ ] Are there **retry/idempotency** mechanisms? → Edge: retry same request
- [ ] Are **notifications** sent on events? → Positive: verify notification created

### Data & Security Coverage

- [ ] Is sensitive data **masked/encrypted**? → Edge: verify masking at rest vs response
- [ ] Can users access **other users' data**? → Negative: cross-user access attempt
- [ ] Are **audit logs** created for actions? → Positive: verify audit entry
- [ ] Are **computed fields** protected from direct mutation? → Negative: attempt mutation
- [ ] Are there **FK constraints** preventing deletion? → Edge: delete with references

---

## Edge Case Patterns

Common edge case patterns to look for in any feature:

### Boundary Values

- Empty input: `""`, `[]`, `null`, `0`
- Minimum valid value: `min_value`
- Maximum valid value: `max_value`
- Just below minimum: `min_value - 1`
- Just above maximum: `max_value + 1`
- Single item (boundary between empty and populated)
- Exact pagination boundary (e.g., 20 items, page size 20 → 1 page vs 2 pages)

### State Edge Cases

- First record ever created (no prior data)
- Re-entry after exit (e.g., user leaves and rejoins — new wallet vs old wallet)
- Circular state changes (A → B → A → B)
- State change with pending operations
- State change with referencing child records

### Data Consistency

- Update a record while another process reads it
- Delete a parent with children (FK constraint)
- Recalculate derived values after source data changes
- Verify immutability of locked/verified records
- Verify computed fields are not overwritten by direct input

### Concurrency & Idempotency

- Submit the same request twice with same idempotency key
- Submit two requests simultaneously
- Retry after partial failure (some side effects committed)
- Process event out of order

### Unicode & Special Characters

- Names with accents: `José`, `Müller`, `Søren`
- Names with apostrophes: `O'Brien`
- Very long strings (max field length)
- Strings with special characters: `<script>`, `"; DROP TABLE`, emoji

---

## Negative Case Patterns

Common negative test patterns:

### Input Validation

- Missing required field → validation error message
- Empty string for required field → validation error
- Invalid format (email without @, phone with letters) → format error
- Value out of range (negative amount, future date in past-only field) → range error
- Too many characters → length error

### Authorization

- Unauthenticated request → 401
- Wrong role accessing endpoint → 403
- User accessing another user's resource → 403 or 404 (no data leak)
- Non-admin accessing admin endpoint → 403
- 2FA-scoped session accessing full-session endpoint → rejected

### Business Logic

- Create duplicate unique record → rejected
- Update locked/verified record → rejected
- Delete record with dependencies → blocked by FK
- Transition to invalid state → rejected
- Submit when precondition not met → rejected with prerequisite failure

### Integration Failures

- Malformed webhook signature → rejected
- Missing required header → rejected
- External API returns error → graceful handling
- Network timeout → retry or error state

---

## Test Data Patterns

### How to Write Good Test Data

Test data should be **specific, realistic, and sufficient to execute the test**.
Write it as comma-separated key-value pairs:

```
amount: $500.00, available_balance: $1,000.00, fee: $5.00, net_payout: $495.00
```

### Patterns by Test Type

**Positive test data** — valid, realistic values that satisfy all preconditions:

```
email: john.doe@example.com, password: SecurePass123!, role: Admin
```

**Negative test data** — values that violate a specific rule:

```
email: (empty), password: SecurePass123!
email: not-an-email, password: SecurePass123!
email: john.doe@example.com, password: (empty)
```

**Edge case test data** — boundary or unusual valid values:

```
amount: $0.01 (minimum), amount: $99999.99 (maximum)
string: "a" * 255 (max length), string: "" (empty)
```

### Domain-Specific Patterns

- **Financial**: Use realistic dollar amounts, include fees, taxes, rounding
- **Dates**: Use ISO format (`2026-08-14`), test past/future/timezone
- **IDs**: Use realistic formats (`ag_001`, `evt_abc123`, `usr_550e8400`)
- **Roles**: Use actual role names from the PRD (`Agent`, `Agency Admin`, `Super Admin`)
- **Statuses**: Use actual status values from the PRD (`pending`, `approved`, `funded`)

---

## Priority Assignment Guide

### High Priority

- Core business functionality (the main thing the product does)
- Financial transactions (money movement, balance calculations)
- Security & access control (auth, authz, data protection)
- Data integrity (cascading deletes, computed fields, constraints)
- Integration correctness (webhooks, external APIs, idempotency)

### Medium Priority

- Secondary features (notifications, history views, settings)
- Display & formatting (masking, sorting, pagination)
- Non-critical state transitions
- User experience edge cases (empty states, loading states)

### Low Priority

- Cosmetic details (label text, icon display)
- Very unlikely edge cases
- Performance under extreme load (if not explicitly required)

---

## Language Conventions

### English (default)

- **Test Scenario**: `Verify {Module} - {action or condition}`
  - Example: `Verify Wallet and Bank Account - Sign in as agent, open Wallet Hub`
- **Test Steps**: Imperative voice, numbered with each step on its own line
  - Example:
    ```
    1. Sign in as agent.
    2. Open Wallet Hub.
    3. Click Draw Down.
    ```
- **Expected Result**: Declarative, state what the system does
  - Example: `Wallet card shows agent name, available balance, and status`

### Indonesian

- **Test Scenario**: `Verifikasi {Module} - {aksi atau kondisi}`
  - Example: `Verifikasi Wallet dan Rekening Bank - Masuk sebagai agent, buka Wallet Hub`
- **Test Steps**: Imperative voice, numbered with each step on its own line
  - Example:
    ```
    1. Masuk sebagai agent.
    2. Buka Wallet Hub.
    3. Klik Draw Down.
    ```
- **Expected Result**: Declarative
  - Example: `Kartu wallet menampilkan nama agent, saldo tersedia, dan status`

### Bilingual

If the user requests both languages, generate two CSV files (one EN, one ID) or
use English for the CSV and provide an Indonesian summary in the chat. Let the
user decide which approach they prefer.
