---
name: testcase-generator
description: >-
  Generate comprehensive QA test cases in CSV Master Template format from a PRD
  (Product Requirements Document) and related documents. Produces grouped test cases
  with Positive, Negative, and Edge Case scenarios, realistic test data, preconditions,
  and expected results. Use this skill whenever the user wants to generate test cases,
  create test scenarios, write QA test cases, produce a test case CSV, or convert
  requirements/PRD/spec into testable scenarios — even if they don't explicitly say
  "test case" but mention testing a feature, validating requirements, QA coverage,
  or preparing for test execution.
---

# Test Case Generator

Generate comprehensive QA test cases from a PRD and related documents, producing a
Master Template CSV ready for test execution tracking across staging and production.

## What This Skill Produces

A CSV file containing:

- Test cases **grouped by module/feature** (auto-detected from the PRD)
- Three test types per feature: **Positive** (happy path), **Negative** (error/invalid),
  **Edge Case** (boundary/unusual)
- **Realistic test data** derived from PRD context (not placeholders)
- Staging and Production status tracking columns (Desktop/Tablet/Mobile) left empty
  for testers to fill during execution
- An **iterative workflow**: generate draft → user reviews → revise → final CSV

---

## Workflow

### Step 1 — Gather Inputs

Collect the following from the user before generating anything:

1. **PRD & related documents** — accepted as:
   - File path(s) to read from disk (any text format: .md, .txt, .pdf-extracted, etc.)
   - Content pasted directly in the chat
   - A mix of both

   Read every provided document fully. If a file path is given, use the `read` tool
   to load it. Do not skim — thorough reading produces thorough test cases.

2. **ID prefix** — a short project code for test case identifiers.
   Example: user says "CW" → IDs become `CW-TC-001`, `CW-TC-002`, ...
   If the user doesn't provide one, ask. Never make one up.

3. **Language** — English or Indonesian (or bilingual) for all human-readable fields:
   Test Scenario, Precondition, Test Steps, Expected Result, Test Data.
   Default to English if the user doesn't specify.

4. **Output file path** — where to save the final CSV. Suggest a default like
   `{prefix}-test-cases.csv` in the current directory if the user doesn't specify.

### Step 2 — Analyze the PRD

Read all documents and extract a structured understanding:

| Extract              | What to Look For                                          | Why                                    |
| -------------------- | --------------------------------------------------------- | -------------------------------------- |
| **Modules/Features** | Section headings, feature lists, epics, user story groups | Become grouping headers in the CSV     |
| **User roles**       | Admin, agent, end user, super admin, guest                | Role-based access test cases           |
| **Business rules**   | Validations, constraints, conditional logic, formulas     | Negative + edge case source material   |
| **Data entities**    | Key objects, fields, types, formats                       | Realistic test data generation         |
| **Integrations**     | Webhooks, APIs, notifications, external systems           | Integration + idempotency test cases   |
| **State machines**   | Status transitions, lifecycles, approval flows            | Transition + blocked-transition cases  |
| **Security**         | Auth, authz, encryption, audit, data masking              | Access control + data protection cases |

Present a brief summary of detected modules to the user before generating test cases.
This gives them a chance to correct or add modules early.

### Step 3 — Generate Test Cases

For each module, generate test cases using the coverage strategy below. Refer to
`references/test-design-guide.md` for detailed patterns and heuristics.

#### Coverage Strategy

For every feature or requirement, produce at minimum:

- **Positive cases** — the happy path. Normal flow with valid inputs, standard CRUD
  operations, expected state transitions.

- **Negative cases** — invalid inputs, unauthorized access, error conditions. Missing
  required fields, out-of-range values, wrong roles, duplicate submissions.

- **Edge cases** — boundary conditions, unusual valid scenarios. Empty states, max
  limits, blocked transitions, cascading effects, concurrent operations, data
  consistency after sequential changes.

Aim for 3-8 test cases per feature depending on complexity. A simple CRUD feature
might need 4-5 cases; a financial workflow with state machines and integrations
might need 10-15.

#### Test Data

Fill the Test Data column with **specific, realistic values** from the PRD context.
Do NOT use "N/A" or placeholder text unless the test genuinely requires no data.

Good examples:

- `amount: $500.00, available_balance: $1,000.00, fee: $5.00`
- `email: agent@example.com, role: Agent, target_endpoint: /api/wallet`
- `page: 2, pageSize: 20, totalRecords: 55, expectedItems: 15`
- `status: pending → approved → payment_processing, webhook_id: evt_abc123`

When the PRD doesn't specify exact values, infer reasonable ones from the domain
context. A banking feature should use realistic dollar amounts; a pagination test
should use realistic page sizes.

#### Writing Quality Rules

- **Test Scenario**: Start with "Verify {Module} - {action}" (EN) or
  "Verifikasi {Module} - {aksi}" (ID). One line, descriptive, concise.

- **Precondition**: State the minimum setup. Be specific about data state, user
  role, prerequisites. Use "N/A" only when truly no precondition exists.

- **Test Steps**: Action-oriented, imperative voice. For multi-step flows, use
  numbered steps with each step on its own line. Example:

  ```
  1. Sign in as agent.
  2. Open Wallet Hub.
  3. Click Draw Down.
  ```

- **Expected Result**: Observable and verifiable. State exact values, status codes,
  UI states, or data changes. Avoid vague terms like "works correctly" — say what
  "correctly" means. Example: `Available balance = $495.00, ledger row created with type=advance`

- **Type**: One of `Positive`, `Negative`, `Edge Case`.

- **Priority**:
  - `High` — core functionality, security, data integrity, financial flows
  - `Medium` — important secondary features, notification flows
  - `Low` — cosmetic, nice-to-have, very low-impact edge cases

### Step 4 — Present Draft for Review

After generating all test cases, present them to the user as a readable markdown
table in the chat — **not** the CSV yet. Organize by module with clear separators.

Ask the user:

- Are there modules or features missing?
- Should any test cases be added, removed, or modified?
- Is the coverage depth right (too many? too few?)?
- Is the test data realistic and accurate?
- Is the language correct?

### Step 5 — Iterate

Apply the user's feedback and re-present the updated draft. Repeat until the user
confirms they're satisfied. Only then proceed to CSV generation.

### Step 6 — Generate Final CSV

Once approved, generate the CSV file. You have two options:

**Option A — Script (recommended for large sets):**

Use the bundled Bun script for guaranteed-correct CSV formatting:

```sh
bun {skill-root}/scripts/generate-csv.ts <input.json> <output.csv>
```

Where `input.json` is a file you create with this structure:

```json
{
  "prefix": "CW",
  "language": "en",
  "modules": [
    {
      "name": "Wallet and Bank Account",
      "tests": [
        {
          "scenario": "Verify Wallet Hub display",
          "precondition": "Active agent has one active wallet",
          "steps": "Sign in as agent, open Wallet Hub",
          "expected": "Wallet card shows agent name, balance, status",
          "testData": "agent_id: ag_001, wallet_status: active",
          "type": "Positive",
          "priority": "High"
        }
      ]
    }
  ]
}
```

The script auto-generates IDs (`{prefix}-TC-001`, `{prefix}-TC-002`, ...),
and handles all CSV quoting/escaping correctly.

**Option B — Manual:**

Write the CSV directly, following the format in `references/csv-format.md`. Be
careful with CSV quoting: any field containing commas, quotes, or newlines must
be wrapped in double quotes, and internal double quotes must be doubled.

Read `references/csv-format.md` before using this option.

---

## CSV Format Overview

The Master Template CSV has 21 columns. Here's the summary:

| #   | Column            | Filled By | Description                                    |
| --- | ----------------- | --------- | ---------------------------------------------- |
| 1   | ID                | Generator | `{prefix}-TC-{NNN}`                            |
| 2   | Test Scenario     | Generator | Short description of what to verify            |
| 3   | Module/Feature    | Generator | Functional area                                |
| 4   | Precondition      | Generator | Required state before test                     |
| 5   | Test Steps        | Generator | Actions to perform                             |
| 6   | Expected Result   | Generator | Verifiable outcome                             |
| 7   | Test Data         | Generator | Specific data values                           |
| 8   | Type              | Generator | Positive / Negative / Edge Case                |
| 9   | Priority          | Generator | High / Medium / Low                            |
| 10  | Staging Status    | Tester    | Desktop (empty)                                |
| 11  | (unnamed)         | Tester    | Tablet (empty)                                 |
| 12  | (unnamed)         | Tester    | Mobile (empty)                                 |
| 13  | Tester            | Tester    | Staging tester name (empty)                    |
| 14  | Last Updated      | Tester    | Staging last updated (empty)                   |
| 15  | (unnamed)         | —         | Empty separator between Staging and Production |
| 16  | Production Status | Tester    | Desktop (empty)                                |
| 17  | (unnamed)         | Tester    | Tablet (empty)                                 |
| 18  | (unnamed)         | Tester    | Mobile (empty)                                 |
| 19  | Tester            | Tester    | Production tester name (empty)                 |
| 20  | Last Updated      | Tester    | Production last updated (empty)                |
| 21  | Notes / Bug Ref   | Tester    | Notes or bug references (empty)                |

The CSV file contains:

1. **Row 1** — main header with all 21 column names
2. **Row 2** — sub-header labeling Desktop/Tablet/Mobile under Staging and Production
3. **Row 3** — empty separator
4. **Test case rows** — sequential, with module indicated in the Module/Feature column

See `references/csv-format.md` for the exact format with a complete example.

---

## Reference Files

| File                              | When to Read                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `references/csv-format.md`        | Before generating the final CSV (Step 6). Contains exact column layout, quoting rules, and a full worked example.                |
| `references/test-design-guide.md` | During test case generation (Step 3) when you need coverage heuristics, edge case patterns, or want to ensure thorough coverage. |

---

## Tips

- **Start with modules**: Getting the module list right early saves rework. Present
  the module breakdown to the user before writing any test cases.
- **Think like a tester**: For each feature, ask "what could go wrong?" and
  "what's the weirdest valid input?" — those are your negative and edge cases.
- **Trace to PRD**: Every test case should trace back to a specific requirement.
  If a test case doesn't map to any PRD requirement, it might be unnecessary
  (or the PRD might be missing something worth flagging).
- **Don't over-generate**: 60-80 well-chosen test cases are more useful than 200
  repetitive ones. Quality over quantity.
