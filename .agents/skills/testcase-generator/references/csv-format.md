# CSV Format Specification

The Master Template CSV format for test cases. Read this before generating the
final CSV output.

## Table of Contents

1. [Column Layout](#column-layout)
2. [Header Rows](#header-rows)
3. [Module Grouping](#module-grouping)
4. [CSV Quoting Rules](#csv-quoting-rules)
5. [Complete Example](#complete-example)

---

## Column Layout

The CSV has 21 columns in this exact order:

| #   | Column Name         | Content                                                 |
| --- | ------------------- | ------------------------------------------------------- |
| 1   | `ID`                | `{prefix}-TC-{NNN}` (zero-padded to 3 digits)           |
| 2   | `Test Scenario`     | One-line description starting with "Verify..."          |
| 3   | `Module/Feature`    | Module name (same for all rows in a module group)       |
| 4   | `Precondition`      | Required state, or "N/A" if none                        |
| 5   | `Test Steps`        | Actions to perform (numbered if multi-step)             |
| 6   | `Expected Result`   | Observable, verifiable outcome                          |
| 7   | `Test Data`         | Specific data values, comma-separated key-value pairs   |
| 8   | `Type`              | `Positive`, `Negative`, or `Edge Case`                  |
| 9   | `Priority`          | `High`, `Medium`, or `Low`                              |
| 10  | `Staging Status`    | (sub-column: Desktop) — left empty                      |
| 11  | (unnamed)           | (sub-column: Tablet) — left empty                       |
| 12  | (unnamed)           | (sub-column: Mobile) — left empty                       |
| 13  | `Tester`            | Staging tester name — left empty                        |
| 14  | `Last Updated`      | Staging last updated date — left empty                  |
| 15  | (unnamed)           | Empty separator between Staging and Production sections |
| 16  | `Production Status` | (sub-column: Desktop) — left empty                      |
| 17  | (unnamed)           | (sub-column: Tablet) — left empty                       |
| 18  | (unnamed)           | (sub-column: Mobile) — left empty                       |
| 19  | `Tester`            | Production tester name — left empty                     |
| 20  | `Last Updated`      | Production last updated date — left empty               |
| 21  | `Notes / Bug Ref`   | Notes or bug references — left empty                    |

Columns 10-21 are left empty by the generator. Testers fill them during execution.

---

## Header Rows

The first two rows of the CSV are headers:

**Row 1** — Main header (all 21 column names):

```
ID,Test Scenario,Module/Feature,Precondition,Test Steps,Expected Result,Test Data,Type,Priority,Staging Status,,,Tester,Last Updated,,Production Status,,,Tester,Last Updated,Notes / Bug Ref
```

**Row 2** — Sub-header (labels for Desktop/Tablet/Mobile under Staging and Production):

```
,,,,,,,,,Desktop,Tablet,Mobile,,,,Desktop,Tablet,Mobile,,,
```

**Row 3** — Empty separator row (all commas):

```
,,,,,,,,,,,,,,,,,,,,
```

---

## Module Grouping

Test cases are grouped by module in the `Module/Feature` column (column 3). There
are no separator rows between modules — the module name simply appears in the
`Module/Feature` field of each test case row. Test cases for the same module are
sequential, and when a new module starts, its name appears in the column.

Example transition between modules:

```
CW-TC-013,...,Commission Pipeline and Verification,...
CW-TC-014,...,Commission Pipeline and Verification,...
CW-TC-015,...,Commission Pipeline and Verification,...
CW-TC-027,...,Draw Down Withdrawal and Transactions,...
CW-TC-028,...,Draw Down Withdrawal and Transactions,...
```

---

## CSV Quoting Rules

Follow RFC 4180 quoting rules:

1. **Fields containing commas** must be wrapped in double quotes:
   - `Available balance, status, and name` → `"Available balance, status, and name"`

2. **Fields containing double quotes** must be wrapped, and internal quotes doubled:
   - `Click "Submit" button` → `"Click ""Submit"" button"`

3. **Fields containing newlines** must be wrapped in double quotes:
   - Multi-step test steps with line breaks → wrap the entire field in `""`

4. **Fields with no special characters** do not need quoting (but quoting is safe):
   - `Positive` → `Positive` (no quotes needed)
   - `"Positive"` → also valid

5. **Empty fields** are just nothing between commas:
   - `CW-TC-001,,,,` — four empty fields

### Common Quoting Scenarios

**Test Steps with multiple lines:**

```
"1. Sign in as agent.
2. Open Wallet Hub.
3. Click Draw Down.
4. Enter amount: $500.
5. Confirm."
```

**Expected Result with commas:**

```
"Available balance equals min(approvedLimit, pendingVerifiedCommissions) - outstandingAdvances, clamped to zero"
```

**Test Data with key-value pairs (commas inside):**

```
"amount: $500.00, available_balance: $1,000.00, fee: $5.00, net_payout: $495.00"
```

---

## Complete Example

Below is a complete example CSV with 2 modules and 5 test cases. This shows the
exact format including headers and quoting.

```csv
ID,Test Scenario,Module/Feature,Precondition,Test Steps,Expected Result,Test Data,Type,Priority,Staging Status,,,Tester,Last Updated,,Production Status,,,Tester,Last Updated,Notes / Bug Ref
,,,,,,,,,Desktop,Tablet,Mobile,,,,Desktop,Tablet,Mobile,,,
,,,,,,,,,,,,,,,,,,,,
CW-TC-001,"Verify Wallet and Bank Account - Sign in as agent, open Wallet Hub",Wallet and Bank Account,Active agent has one active wallet,"Sign in as agent, open Wallet Hub","Wallet card shows agent name, available balance, status, and selectable wallet entry","agent_id: ag_001, wallet_status: active",Positive,High,,,,,,,,,,,,
CW-TC-002,"Verify Wallet and Bank Account - Agent has no wallet",Wallet and Bank Account,Agent has no wallet,"Sign in as agent, open Wallet Hub or Wallet Detail","Empty or enablement state is shown; balance values are zero, not blank","agent_id: ag_002, wallet_count: 0",Negative,High,,,,,,,,,,,,
CW-TC-003,Verify Wallet and Bank Account - Open Wallet Detail,Wallet and Bank Account,"Active wallet has approved limit, pending verified commissions, outstanding advances",Open Wallet Detail,"Available balance equals min(approvedLimit, pendingVerifiedCommissions) - outstandingAdvances - reservedAmount - totalRepayments, clamped to zero","approved_limit: $5000, pending_verified: $3000, outstanding: $1500, reserved: $200, repayments: $100",Edge Case,High,,,,,,,,,,,,
CW-TC-004,Verify Commission Pipeline and Verification - Submit webhook payload,Commission Pipeline and Verification,"Valid Autonomist webhook payload with agent, office, property, offer",Submit webhook payload,"Event is accepted, queued, processed, and related records are upserted idempotently","webhook_id: evt_abc123, agent_id: ag_001, office_id: off_002, property_id: prop_003",Positive,High,,,,,,,,,,,,
CW-TC-005,Verify Commission Pipeline and Verification - Submit same event twice,Commission Pipeline and Verification,Duplicate Autonomist event id,Submit same event twice,Duplicate is skipped; no duplicate commission is created,"webhook_id: evt_abc123 (same as previous)",Positive,High,,,,,,,,,,,,
```

### Notes on the Example

- The ID prefix is `CW` → `CW-TC-001`, `CW-TC-002`, etc.
- No module separator rows — the module name appears in the Module/Feature column of each test case.
- Fields with commas (like Test Steps, Expected Result, and Test Data) are quoted.
- The Test Data field is quoted because it contains commas (key-value pairs).
- Columns 10-21 are all empty (just commas) — filled by testers during execution.
- IDs are sequential across all modules (not reset per module).
