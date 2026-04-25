# Frappe Lending Analysis Report
**Date:** April 4, 2026  
**Repository:** https://github.com/frappe/lending.git  
**Focus:** Loan Lifecycle, Collateral Management, UI/UX Patterns

---

## Executive Summary

Frappe Lending is a comprehensive, production-grade loan management system (LMS) built on ERPNext/Frappe Framework. It covers complete loan lifecycle automation from application through closure, with sophisticated collateral/security management and modern web UI patterns using Vue.js + Frappe framework conventions.

**Key Takeaway for Loankit:** Frappe Lending demonstrates enterprise-grade patterns for multi-state loan workflows, dynamic collateral valuation, and document-driven processes that could significantly enhance Loankit's capabilities beyond basic CRUD operations.

---

## Area 1: Loan Lifecycle Management

### Overview
Frappe Lending structures loan workflows as a strict state machine with explicit statuses, triggering different permissions and UI behaviors at each stage. The lifecycle is initiated by Loan Application (origination), approved/rejected at application level, then converted to Loan document when sanctioned.

### Key Components

#### Loan Application (loan_application)
- **Purpose:** Initial loan request submission
- **Status Flow:** Open → Approved/Rejected
- **Key Fields:**
  - Applicant type: Customer or Employee
  - Loan amount & product
  - Is_term_loan flag (fixed-term vs revolving)
  - Is_secured_loan flag (triggers collateral requirements)
  - Proposed pledges (child table for collaterals)
  - Repayment method: "Repay Fixed Amount per Period" OR "Repay Over Number of Periods"
  - Documents tab (attachment management)

- **UI Patterns:**
  - Summary card showing applicant name, email, phone, application date, loan amount
  - Conditional field visibility based on loan type (term vs non-term)
  - Duplicate applicant detection via phone/email (prompts user to use existing customer)
  - Custom button routing: "Create Loan" (only if status=Approved), "Create Loan Security Assignment"

#### Loan (loan)
- **Purpose:** Sanctioned, active loan document
- **Status Flow:** Draft → Sanctioned → Partially Disbursed → Disbursed → Active → Loan Closure Requested → Closed (or Written Off/Settled)
- **Key Fields:**
  ```
  Applicant Section:
  - applicant_type, applicant (link to Customer/Employee)
  - applicant_name (read-only, fetched)
  - loan_application (read-only link to originating application)
  
  Core Terms:
  - loan_product, loan_amount, rate_of_interest
  - is_term_loan, is_secured_loan
  - disbursement_date, disbursed_amount
  
  Repayment Config:
  - repayment_method: "Repay Fixed Amount per Period" OR "Repay Over Number of Periods"
  - repayment_frequency: Monthly, Daily, Weekly, Bi-Weekly, Quarterly, One Time
  - repayment_periods, monthly_repayment_amount
  - repayment_start_date
  
  Moratorium:
  - moratorium_type: "" | "EMI" | "Principal"
  - moratorium_tenure (in months)
  - treatment_of_interest: "Capitalize" OR "Add to first repayment"
  
  Risk Classification:
  - days_past_due (calculated)
  - classification_code, classification_name (linked to Loan Classification)
  - loan_restructure_count, watch_period_end_date
  - is_npa (Non-Performing Asset), manual_npa flag
  
  Accounting:
  - disbursement_account, payment_account, loan_account
  - interest_income_account, penalty_income_account
  - cost_center
  
  Limits (for revolving loans):
  - maximum_limit_amount, limit_applicable_start/end
  - utilized_limit_amount, available_limit_amount
  
  Adjustments:
  - written_off_amount, refund_amount
  - debit_adjustment_amount, credit_adjustment_amount
  - excess_amount_paid
  ```

- **Status Logic** (from loan.py):
  - Draft: New, unsaved
  - Sanctioned: Submitted (docstatus=1)
  - Partially Disbursed: After partial loan disbursement
  - Disbursed: Full disbursement amount released
  - Active: Actively repaying
  - Loan Closure Requested: User initiated closure
  - Closed: Final closure
  - Written Off: Bad debt
  - Settled: Loan satisfied

- **Database Triggers:**
  - `validate()`: Multiple validations (amount, accounts, cost center, dates)
  - `set_status()`: Auto-sets status based on docstatus
  - `on_update_after_submit()`: Handles NPA marking, demand reversals, interest accrual reversals
  - `onload()`: Loads dashboard info (payment due, arrears, etc.)

#### Loan Disbursement (loan_disbursement)
- **Purpose:** Single or multiple disbursement events for a sanctioned loan
- **Key Fields:**
  - against_loan (link to parent Loan)
  - disbursement_date (actual release date)
  - disbursed_amount
  - mode_of_payment
  - disbursement_account, loan_account, bank_account
  - broken_period_interest (BPI) handling for partial periods
  - disbursement_charges (child table)
  - status: "Draft" | "Submitted" | "Cancelled"
  - reference_number, reference_date (check/transaction info)
  - clearance_date (bank reconciliation)

- **Pattern:** Frappe allows multiple disbursements against single loan. Each disbursement is separate GL entry.

#### Loan Repayment (loan_repayment)
- **Purpose:** Record payment against loan
- **Key Fields:**
  - against_loan, loan_disbursement
  - posting_date, value_date
  - repayment_type: Full vs Partial
  - payment breakdown:
    - pending_principal_amount
    - interest_payable, penalty_amount
    - payable_charges
    - amount_paid (actual amount received)
  - shortfall_amount (if underpainting)
  - prepayment_charges
  - manual_remarks
  - is_write_off_waiver flag
  - is_backdated (allows past-dated repayment)
  - excess_amount (overpayment, tracked separately)
  - bulk_repayment_log (for batch processing)

- **Co-lending Fields:**
  - loan_partner, loan_partner_share_percentage
  - total_partner_interest_share, total_partner_principal_share

### Workflow State Machine
```
Loan Application
├─ Open
│  └─ [Submit + Approve] → Approved
│     └─ [Create Loan] → 
│        Loan (Draft)
│        └─ [Submit] → Sanctioned
│           └─ [Create Disbursement] → Partially Disbursed/Disbursed
│              └─ [First Repayment] → Active
│                 └─ [Multiple Repayments] → Active (ongoing)
│                    └─ [Final Repayment OR Write-off] → Closed/Written Off
│  └─ [Submit + Reject] → Rejected
```

### Notable Features
1. **Flexible Repayment:** Choose between fixed amount per period OR fixed number of periods (system calculates the other)
2. **Moratorium Support:** Pre-EMI grace period with interest capitalization or deferred to first payment
3. **Broken Period Interest:** Handles interest for partial periods (e.g., disbursement mid-month)
4. **Cost Center Tracking:** Every transaction linked to cost center for P&L allocation
5. **Backdated Repayments:** System allows historical repayments for data migration scenarios
6. **Multi-Partner Co-Lending:** Track separate interest/principal shares for multiple funders
7. **NPA Monitoring:** Automatic days-past-due calculation, watch period enforcement
8. **Loan Restructuring:** Track restructure count, tenure adjustments post-restructuring

---

## Area 2: Collateral Management

### Overview
Frappe Lending has a sophisticated collateral system supporting multiple security types, haircut valuation, pledge/unpledge workflows, and security shortfall monitoring. Collaterals are tracked at two levels:
1. **Loan Security:** Master data for available securities
2. **Pledge/Loan Security Assignment:** Linking specific securities to specific loans

### Key Components

#### Loan Security (loan_security)
- **Purpose:** Master catalog of collaterals available for pledging
- **Key Fields:**
  - loan_security_code (unique identifier, often ISIN for financial securities)
  - loan_security_name
  - loan_security_type (link to Security Type master)
  - original_security_value (total value in inventory)
  - utilized_security_value (RO, calculated - sum of all pledges)
  - available_security_value (RO, original - utilized)
  - haircut % (inherited from security type)
  - loan_to_value_ratio (LTV)
  - disabled flag (to retire old securities)

- **Valuation Approach:**
  ```
  Security Value = Quantity × Current Market Price
  Post-Haircut Value = Security Value × (1 - Haircut%)
  LTV = Post-Haircut Value / Loan Amount
  ```

#### Loan Security Type (loan_security_type)
- **Purpose:** Master config for each security class
- **Key Fields:**
  - name (e.g., "Gold", "Corporate Bond", "Equity Share")
  - loan_security_type_name
  - haircut % (default haircut for all securities of this type)
  - loan_to_value_ratio (LTV limit)

#### Pledge (pledge) - Child Table
- **Purpose:** Individual security units pledged against a loan
- **Key Fields:**
  - loan_security (link to Security master)
  - qty (units pledged)
  - loan_security_price (current market price per unit)
  - haircut % (copied from security type)
  - amount (calculated: qty × price)
  - post_haircut_amount (calculated: amount × (1 - haircut%))

- **Calculation Pattern** (from loan_application.js):
  ```javascript
  amount = qty * loan_security_price
  post_haircut_amount = amount - (amount * haircut / 100)
  maximum_loan_amount = SUM(post_haircut_amount for all pledges)
  ```

#### Loan Security Assignment (loan_security_assignment)
- **Purpose:** Formal pledging of securities to a specific loan
- **Key Fields:**
  - loan (link to Loan)
  - loan_application (link to originating application)
  - applicant_type, applicant
  - securities (child table of Pledge rows)
  - total_security_value (sum of post-haircut amounts)
  - maximum_loan_value (RO)
  - status: "Pledge Requested" → "Pledged" → "Release Requested" → "Released" (or Repossessed/Cancelled)
  - pledge_time, release_time (timestamps)
  - reference_no, description

- **Workflow:**
  ```
  Proposed Pledge (in application)
  ↓ [Application Approved]
  Create Loan Security Assignment
  ↓ [Submit LSA]
  Status = "Pledge Requested"
  ↓ [Physical verification]
  Update Status → "Pledged"
  ↓ [Loan repaid or written off]
  Create Loan Security Release
  ↓ [Approve release]
  Status → "Released"
  ```

#### Loan Security Release (loan_security_release)
- **Purpose:** Formal return of pledged securities post-loan repayment
- **Key Fields:**
  - loan (link to parent loan)
  - securities (child table, list of securities to release)
  - status: "Requested" → "Approved"
  - unpledge_time (timestamp)

#### Proposed Pledge - Child Table (in Loan Application)
- **Purpose:** Pre-commitment of securities during application stage
- **Key Fields:**
  - loan_security
  - qty, loan_security_price
  - haircut, amount, post_haircut_amount
  - Used to calculate maximum_loan_amount before loan is created

### Valuation Features
1. **Haircut Deduction:** Default 10-30% haircut per security type (conservative valuation)
2. **Dynamic Pricing:** Security price can be updated; post-haircut amounts auto-recalculate
3. **LTV Monitoring:** Loan-to-value limits enforced at security type level
4. **Security Shortfall Tracking:** Process_Loan_Security_Shortfall doctype monitors if pledged value falls below loan outstanding
5. **Price History:** Loan Security Price doctype maintains historical pricing for mark-to-market

### Notable Features
1. **Multi-Type Support:** Supports gold, financial securities, real estate, inventory, etc.
2. **Haircut Flexibility:** Can override default haircut per pledge
3. **Dual Pledge State:** Pledge Requested vs Pledged (separates booking from physical receipt)
4. **Release Workflow:** Formal unpledging process with approval gates
5. **Partial Release:** Can release subset of pledged securities
6. **Shortfall Alerts:** Automatically tracks if collateral drops below safe LTV threshold
7. **Integration with Demand:** Shortfall generates demand demand notices to borrower

### Code Pattern (from loan_application.js)
```javascript
frappe.ui.form.on("Proposed Pledge", {
  loan_security: function(frm, cdt, cdn) {
    // Fetch current market price
    frappe.call({
      method: "lending.loan_management.doctype.loan_security_price.loan_security_price.get_loan_security_price",
      args: { loan_security: row.loan_security },
      callback: function(r) {
        frappe.model.set_value(cdt, cdn, 'loan_security_price', r.message);
        frm.events.calculate_amounts(frm, cdt, cdn);
      }
    })
  },
  
  qty: function(frm, cdt, cdn) {
    frm.events.calculate_amounts(frm, cdt, cdn);
  },
});
```

---

## Area 3: UI/UX Patterns

### Technology Stack
- **Frontend Framework:** Vue.js 3 (via Frappe UI framework)
- **Form Engine:** Frappe's declarative form system (JSON-driven)
- **Styling:** Bootstrap 5 + custom Frappe CSS
- **Interaction Pattern:** Event-driven (frappe.ui.form.on listeners)

### Form Architecture

#### Declarative JSON Schema
All forms defined in `.json` files with field metadata:
```json
{
  "fieldname": "loan_amount",
  "fieldtype": "Currency",
  "label": "Loan Amount",
  "options": "Company:company:default_currency",
  "reqd": 1,
  "in_list_view": 1,
  "in_standard_filter": 1,
  "read_only": false,
  "depends_on": "eval: doc.is_term_loan == 1",
  "fetch_from": "loan_product.max_loan_amount"
}
```

**Field Types Used Heavily:**
- `Currency`: For all monetary fields (auto-formats, fetches currency from company)
- `Link`: For foreign key references (autocomplete + quick-open)
- `Dynamic Link`: For polymorphic references (applicant_type → applicant)
- `Table`: Child rows (pledges, charges, repayment schedules)
- `Select`: Enum fields with predefined options
- `Date`/`Datetime`: Temporal fields
- `Check`: Boolean flags
- `Percent`: Interest rates, haircuts
- `Data`: Free text, fetched values (read-only)

#### Key Conventions
1. **Column Break:** Horizontal layout dividers (side-by-side fields)
2. **Section Break:** Logical grouping of related fields
3. **Tab:** Major sections (loan details, accounting, totals)
4. **fetch_from:** Automatic field population from linked documents
5. **depends_on:** Conditional field visibility (eval: `eval: doc.field === "value"`)
6. **read_only_depends_on:** Dynamic read-only state
7. **no_copy:** Fields excluded when amending documents
8. **permlevel:** Permission-based visibility (e.g., status shown only to admins)

### JavaScript Event Handlers (frappe.ui.form.on)

#### Setup Phase
```javascript
frappe.ui.form.on('Loan Application', {
  setup: function(frm) {
    // Define custom buttons
    frm.make_methods = {
      'Loan': function() { frm.trigger('create_loan') },
      'Loan Security Assignment': function() { 
        frm.trigger('create_loan_security_assignment_from_loan_application') 
      }
    };
    
    // Define which buttons are enabled
    frm.can_make_methods = {
      'Loan': function(frm) { 
        return frm.doc.status === "Approved" && frm.doc.docstatus === 1; 
      }
    };
  }
});
```

#### Refresh Phase (UI Rendering)
```javascript
refresh: function(frm) {
  // Toggle field visibility
  frm.trigger("toggle_fields");
  
  // Add custom buttons
  frm.trigger("add_toolbar_buttons");
  
  // Render summary card
  frm.trigger("render_summary_card");
  
  // Set field filters
  frm.set_query('loan_product', () => {
    return {
      filters: { company: frm.doc.company }
    };
  });
}
```

#### Summary Card Pattern (render_summary_card)
```javascript
render_summary_card: function(frm) {
  if (frm.doc.__islocal) return; // New document
  
  // Fetch currency for formatting
  frappe.db.get_value("Company", frm.doc.company, "default_currency")
    .then(r => {
      let currency = r.message.default_currency;
      let html = `
        <div class="summary-card-section loan-summary-card">
          <div class="row">
            <div class="col-sm">
              <h6 class="text-uppercase loan-summary-label">
                ${frappe.utils.icon('user', 'sm')} Applicant
              </h6>
              <div class="loan-summary-value-md">${frm.doc.applicant_name}</div>
            </div>
            <!-- More fields... -->
          </div>
        </div>
      `;
      
      // Insert before first section
      $(html).insertBefore(frm.fields_dict["applicant_contact_info_section"].wrapper);
      
      // Hide original sections (now in summary)
      frm.set_df_property("applicant_details_section", "hidden", 1);
    });
}
```

#### Field Change Listeners
```javascript
repayment_method: function(frm) {
  // Clear dependent fields
  frm.doc.repayment_amount = frm.doc.repayment_periods = "";
  frm.trigger("toggle_fields");
  frm.trigger("toggle_required");
},

toggle_fields: function(frm) {
  frm.toggle_enable(
    "repayment_amount", 
    frm.doc.repayment_method == "Repay Fixed Amount per Period"
  );
  frm.toggle_enable(
    "repayment_periods", 
    frm.doc.repayment_method == "Repay Over Number of Periods"
  );
},

toggle_required: function(frm) {
  frm.toggle_reqd(
    "repayment_amount", 
    cint(frm.doc.repayment_method == 'Repay Fixed Amount per Period')
  );
}
```

#### Async Data Fetching
```javascript
check_applicant: function(frm) {
  if (!frm.doc.applicant && frm.doc.applicant_type === "Customer") {
    frappe.call({
      method: "lending.loan_management.doctype.loan_application.loan_application.check_duplicate_customers",
      args: {
        applicant_phone_number: frm.doc.applicant_phone_number,
        applicant_email_address: frm.doc.applicant_email_address
      },
      callback: function(r) {
        const duplicates = r.message;
        if (duplicates.length > 0) {
          frappe.confirm(
            "Existing borrower found. Fetch?",
            () => {
              frm.set_value("applicant", duplicates[0]);
              // Auto-populate address & contact
            }
          );
        }
      }
    });
  }
}
```

### Common UI Components

#### Summary Cards
- Display key loan metrics at-a-glance (applicant, amount, date, contact)
- Dynamically generated HTML inserted into form wrapper
- Hidden detail sections (declutter form)

#### Custom Buttons
- **Make Buttons:** "Create Loan", "Create Loan Security Assignment" (dropdown)
- **Action Buttons:** "View Accounting Ledger", "Download Repayment Schedule"
- **Conditional:** Only shown when document meets status/permission requirements
- Placed in toolbar via `add_custom_button(label, callback, group)`

#### Child Table Handlers
```javascript
frappe.ui.form.on("Proposed Pledge", {
  loan_security: function(frm, cdt, cdn) {
    // cdt = child doctype, cdn = child name (row.name)
    let row = locals[cdt][cdn];
    frappe.model.set_value(cdt, cdn, 'field', value);
  }
});
```

#### Filters & Autocomplete
```javascript
frm.set_query('field_name', () => {
  return {
    filters: {
      company: frm.doc.company,
      is_active: 1
    },
    query: "path.to.custom.filter.method" // Optional: custom server-side filter
  };
});
```

### Report Generation

#### Report Pattern (from loan_outstanding_report.py)
```python
def execute(filters=None):
  columns = get_columns()
  data = get_data(filters)
  chart = get_chart_data(data)
  return columns, data, None, chart

def get_columns():
  return [
    {"label": "Loan", "fieldname": "loan", "fieldtype": "Link", "width": 200},
    {"label": "Applicant", "fieldname": "applicant", "fieldtype": "Data", "width": 150},
    # ... more columns
  ]

def get_data(filters):
  # Query builder approach (pypika-based)
  Loan = DocType("Loan")
  LoanDisbursement = DocType("Loan Disbursement")
  
  query = (
    frappe.qb.from_(Loan)
      .join(LoanDisbursement).on(Loan.name == LoanDisbursement.against_loan)
      .select(Loan.name, Loan.applicant, LoanDisbursement.disbursed_amount)
      .where(Loan.docstatus == 1)
  )
  return query.run(as_dict=True)
```

**Reports Available:**
- Loan Outstanding Report: Principal/interest arrears, DPD (Days Past Due)
- Loan Security Exposure: Total pledged vs available per security type
- Loan Security Status: Pledge status tracking
- ALM Audit Report: Asset-Liability Mismatch analysis
- Future Cashflow Report: Projected payment schedule
- Applicant-wise Loan Security Exposure: Concentration risk by borrower

#### Dashboard Numbers
- Active Loans count
- Total Sanctioned Amount
- Total Disbursed Amount
- Total Repayment Received
- New Loan Applications (this period)
- Closed Loans count

### Navigation & Search

#### Global Search
- Applicant Name indexed (in_global_search: 1)
- Loan amount searchable
- Applicant indexed for quick-open

#### List View Filters (in_list_view: 1)
- Shows key fields directly in list (loan amount, status, applicant)
- Enables rapid scanning without opening detail view

#### Standard Filters (in_standard_filter: 1)
- Applicant, Loan Product, Company, Posting Date filterable from sidebar
- Indexed fields used for performance

### Common UI Gotchas
1. **depends_on eval:**
   - `eval: doc.field === "value"` (string comparison)
   - `eval: doc.is_term_loan == 1` (numeric)
   - Lazy evaluation (not reactive to every keystroke)

2. **Fetch from:** Reads **current** value (not live-synced on master change)

3. **Child Table Validation:** Must validate in parent's validate() or use child's validate()

4. **Permissions:** read_only differs from no permission (field visible but grayed out)

5. **Dynamic Link:** Must set options field to applicant_type field for polymorphism

---

## Comparison to Lending Best Practices

### Strengths Relative to Industry Standards
| Aspect | Frappe Approach | Best Practice | Alignment |
|--------|-----------------|---------------|-----------|
| **Loan Lifecycle** | Explicit state machine with validation at each transition | State pattern with guards | ✓ Excellent |
| **Collateral Valuation** | Haircut + LTV limits, dual-pledge states | Mark-to-market + conservative haircuts | ✓ Strong |
| **Accounting** | GL entries per transaction, multi-currency support | Double-entry + audit trail | ✓ Strong |
| **Repayment Flexibility** | Fixed amount OR fixed period (auto-calculate other) | Both supported, plus amortization | ✓ Good |
| **NPA Monitoring** | Auto DPD calc, watch period, manual override | Basel III guidelines + override capability | ✓ Aligned |
| **Co-Lending** | Separate interest/principal share tracking | Partner accounting + settlement | ⚠ Partial (settlement not shown) |
| **Document Mgmt** | Attachment tab in application | Document workflow + e-signatures | ⚠ Basic |
| **Regulatory Reporting** | Reports available, not shown in detail | Jurisdiction-specific (RBI, SEBI) | ⚠ Configurable |

### Gaps vs. Requirements
1. **E-Signatures:** No digital signature integration shown
2. **KYC Verification:** Customer master used; no KYC doctype visible
3. **Credit Scoring:** No built-in credit rating/score calculation
4. **Loan Syndication:** Co-lending exists but not full syndication workflow
5. **Derivatives/Hedging:** No interest rate swap or hedge accounting

---

## Features Valuable for Loankit Implementation

### High Priority
1. **Flexible Repayment Methods**
   - Fixed amount per period OR fixed tenure (auto-calculate)
   - Applicability: Product flexibility for Vietnamese lending market
   - Implementation: Adopt Frappe's conditional field toggling pattern

2. **Moratorium & Broken Period Interest**
   - Grace period support (EMI moratorium or principal moratorium)
   - Interest capitalization vs. deferred first payment
   - Applicability: Common in NBFC products (Agribank use case)
   - Implementation: Add moratorium_type, moratorium_tenure fields; adjust interest accrual logic

3. **Cost Center Tracking**
   - Every transaction tied to cost center for P&L
   - Applicability: Multi-branch or product-line accounting
   - Implementation: Extend Prisma schema to include cost_center_id on transactions

4. **Dynamic Field Visibility**
   - Frappe's depends_on/eval pattern for conditional rendering
   - Applicability: Simplify UX by hiding irrelevant fields
   - Implementation: Add visibility conditions to Next.js form component library

5. **Haircut-Based Collateral Valuation**
   - Conservative haircut % per security type
   - Post-haircut amount drives maximum loan amount
   - Applicability: Secured lending for agriculture/gold loans
   - Implementation: Add haircut % to collateral type master; recalculate on price change

6. **Pledge/Unpledge Workflow**
   - Separate "Pledge Requested" vs. "Pledged" states
   - Formal release process with approval
   - Applicability: Regulatory requirement for physical collaterals
   - Implementation: Create Loan_Collateral_Assignment doctype with state machine

7. **Security Shortfall Monitoring**
   - Auto-detect when collateral value < loan outstanding
   - Trigger demand notices
   - Applicability: Risk management + regulatory reporting
   - Implementation: Add shortfall_flag to Loan; daily batch job to detect + notify

### Medium Priority
1. **Backdated Repayments**
   - Allow historical repayments for data migration/corrections
   - Applicability: Legacy system integration
   - Implementation: Date picker + audit trail on repayment

2. **Loan Restructuring Tracking**
   - Counter for restructure count, watch period enforcement
   - Applicability: NPA management, regulatory NPS classification
   - Implementation: Add restructure fields to Loan model

3. **Multi-Partner Co-Lending**
   - Track interest/principal split between funders
   - Applicability: Syndication or partnership loans
   - Implementation: Add loan_partner_share table to Loan

4. **Summary Card Pattern**
   - At-a-glance metrics (applicant, amount, status, contact)
   - Applicability: Faster form scanning for loan officers
   - Implementation: Next.js component showing key loan metrics in header

5. **Report Builder Integration**
   - Pre-built reports (outstanding, security exposure, cashflow)
   - Applicability: Analytics for lenders + regulators
   - Implementation: Leverage Prisma + Recharts for dashboard

### Lower Priority
1. **Bulk Repayment Logging:** Batch payment processing
2. **IRAC Provisioning:** Loan classification-based provisioning rules
3. **Loan Transfer:** Portfolio sales or reassignment
4. **Write-Off Management:** Bad debt tracking with realization tracking

---

## Key Architectural Patterns from Frappe Lending

### 1. Document-Oriented Design
- **Pattern:** Each business concept (Loan, Disbursement, Repayment, Security) is a separate doctype
- **Benefit:** Clear separation of concerns, audit trail per document
- **For Loankit:** Consider separate models for Loan, Disbursement, Repayment rather than monolithic Loan schema
- **Implementation:** Prisma relations (one-to-many, many-to-many)

### 2. State Machine with Validation
```python
# Instead of updating status directly:
def set_status(self):
  if self.docstatus == 0:
    self.status = "Draft"
  elif self.docstatus == 1:
    self.db_set("status", "Sanctioned")
  elif self.docstatus == 2:
    self.db_set("status", "Cancelled")
```
- **Benefit:** Status is derived from submission state, not directly editable (prevents invalid states)
- **For Loankit:** Use computed status fields; limit direct status updates to enum validation

### 3. Linked Documents via ForeignKey
```json
{
  "fieldname": "against_loan",
  "fieldtype": "Link",
  "options": "Loan",
  "reqd": 1
}
```
- **Benefit:** Orphaned records prevented, cascading operations possible (delete loan → delete disbursements)
- **For Loankit:** Use Prisma relations with onDelete cascades

### 4. Dynamic Links (Polymorphic References)
```json
{
  "fieldname": "applicant",
  "fieldtype": "Dynamic Link",
  "options": "applicant_type",  // The field holding the type
}
```
- **Benefit:** Single "applicant" field can reference Customer OR Employee (type determined by applicant_type)
- **For Loankit:** For multi-tenant scenarios or multiple applicant types, consider union types (Prisma + TypeScript)

### 5. Fetch-From (Auto-Population)
```json
{
  "fetch_from": "loan.loan_amount",
  "fieldname": "sanctioned_loan_amount",
  "read_only": 1
}
```
- **Benefit:** Denormalized caching of frequently-read values; prevents stale data
- **For Loankit:** Denormalize key fields on child documents (disbursement, repayment) for query performance

### 6. Child Tables with Validation
```python
def validate(self):
  for pledge in self.securities:  # Loop child table
    if pledge.post_haircut_amount == 0:
      frappe.throw("Haircut cannot be 100%")
```
- **Benefit:** Validates entire aggregate (parent + children) in single transaction
- **For Loankit:** Use Prisma transaction() for multi-document operations

### 7. Query Builder Pattern (PyPika)
```python
query = (
  frappe.qb.from_(Loan)
    .select(Loan.name, Loan.loan_amount)
    .where(Loan.docstatus == 1)
    .where(Loan.status == "Active")
    .orderby(Loan.posting_date)
)
results = query.run(as_dict=True)
```
- **Benefit:** Type-safe SQL generation, prevents SQL injection
- **For Loankit:** Use Prisma's query builder for complex reports instead of raw SQL

### 8. Event-Driven UI (frappe.ui.form.on)
```javascript
frappe.ui.form.on('Loan', {
  setup: function(frm) { /* Initialize */ },
  refresh: function(frm) { /* Render */ },
  field_name: function(frm) { /* Change */ },
  after_save: function(frm) { /* Post-save */ }
});
```
- **Benefit:** Loose coupling, easy to test, extensible without modifying core form
- **For Loankit:** Adopt similar hook-based UI pattern (React context + custom hooks)

### 9. Permissions via permlevel
```json
{
  "fieldname": "status",
  "fieldtype": "Select",
  "permlevel": 1  // Only admins can edit
}
```
- **Benefit:** Field-level access control
- **For Loankit:** Use role-based middleware + field-level visibility rules in Next.js

### 10. Batch Operations with Logging
```python
class BulkRepaymentLog(Document):
  def on_submit(self):
    for repayment in self.repayments:
      repayment.bulk_repayment_log = self.name
      repayment.submit()
```
- **Benefit:** Audit trail of batch operations, rollback capability
- **For Loankit:** Use database transactions for multi-loan operations

---

## Code Structure Insights

### File Organization
```
lending/
├── loan_management/
│   ├── controllers/
│   │   └── loan_controller.py          # Base class for GL entries
│   ├── doctype/
│   │   ├── loan/
│   │   │   ├── loan.json               # Schema
│   │   │   ├── loan.py                 # Business logic
│   │   │   ├── loan.js                 # Frontend (mostly empty, uses common)
│   │   │   ├── test_loan.py            # Unit tests
│   │   │   └── loan_dashboard.py       # Dashboard charts
│   │   ├── loan_application/
│   │   ├── loan_disbursement/
│   │   ├── loan_repayment/
│   │   └── ...
│   ├── report/
│   │   ├── loan_outstanding_report/
│   │   │   └── loan_outstanding_report.py
│   │   └── ...
│   ├── utils.py                        # Shared utilities
│   └── dashboard_chart/
├── loan_origination/
│   └── doctype/
│       ├── loan_application_document/  # Attachment tracking
│       ├── loan_document_type/         # Document type master
│       └── ...
└── public/
    └── js/
        ├── loan_common.js              # Shared form handlers
        └── custom_customer.js
```

### Testing Patterns
- Unit tests in `test_*.py` files
- Mock DocTypes using `frappe.new_doc()`
- Database isolation via test transactions

### Error Handling
```python
if not condition:
  frappe.throw(_("Error message"))  # User-facing error
  
if not frappe.db.has_column("Loan Repayment", "field_name"):
  return  # Graceful degradation for migrations
```

---

## Unresolved Questions

1. **E-Signature Integration:** How does Frappe Lending handle document signing for loan agreements? Are there hooks for external e-signature providers (DocuSign, AdobeSign)?

2. **Regulatory Reporting:** Which RBI/SEBI compliance reports are pre-built? Are they configurable per company/jurisdiction?

3. **Credit Scoring:** Is there a credit rating/scoring module, or is it expected to integrate with external credit bureaus?

4. **Mobile App:** Frappe has mobile framework; is there a mobile lending app (loan officer form filling, status updates)?

5. **Settlement Accounting:** For co-lending, how are partner settlements tracked? Is there a settlement doctype or is it done via Journal Entry?

6. **Batch Interest Accrual:** How are interest accruals processed for 1000s of loans in a single day? What's the performance profile?

7. **Document Generation:** Are there templates for loan agreements, promissory notes, collateral receipts? How are they versioned?

8. **Data Migration:** Beyond `is_imported` flag, what's the recommended migration strategy from legacy LMS?

9. **Webhook/Event System:** For real-time status updates to third-party systems, does Frappe Lending publish events or use webhooks?

10. **Currency & Multi-Company:** Full support shown in code; is it production-tested for INR + USD loans in same instance?

---

## Conclusion

Frappe Lending is a **production-grade, feature-rich LMS** suitable for mid-to-large financial institutions. Its strengths are:
- **Comprehensive Loan Lifecycle:** Clear state machine from application to closure
- **Sophisticated Collateral Management:** Haircut-based valuation, pledge/unpledge workflows
- **Modern Web UI:** Vue.js + Frappe conventions, reactive forms with computed fields
- **Strong Accounting:** GL entries per transaction, multi-currency, cost center tracking
- **Extensible:** Document-oriented design allows easy addition of new loan types/features

For **Loankit (Vietnamese NBFC context),** the most valuable borrowings are:
1. **Flexible Repayment** (fixed amount vs. fixed period)
2. **Moratorium Support** (common for agricultural loans)
3. **Haircut-based Collateral** (for gold + agricultural lending)
4. **State Machine Loan Lifecycle** (explicit, validated states)
5. **Dynamic Form Visibility** (simplify UX for loan officers)

The codebase is well-organized, heavily tested, and actively maintained. Adoption of Frappe Lending's patterns would accelerate Loankit's development without sacrificing flexibility for Vietnamese market-specific requirements.

---

**Report Generated:** 2026-04-04  
**Analysis Depth:** Repository code inspection + JSON schema analysis + business logic review
