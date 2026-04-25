## Phase 1: Schema Migration

**Priority:** P1 | **Status:** pending | **Effort:** 3h

### Context
- Current schema: `prisma/schema.prisma` (Customer at line 85)
- DB: SQLite (no native enum, use string)

### Requirements

Add `customer_type` field + individual-specific fields to Customer. Create LoanPlanTemplate + LoanPlan models.

### Schema Changes

#### Customer Model (modify existing)
```prisma
model Customer {
  // ... existing fields ...
  customer_type  String  @default("corporate") // "corporate" | "individual"

  // Individual-specific (nullable, ignored for corporate)
  cccd           String?   // CCCD/CMND
  date_of_birth  DateTime?
  phone          String?

  // New relation
  loan_plans     LoanPlan[]
}
```

#### New: LoanPlanTemplate
```prisma
model LoanPlanTemplate {
  id          String @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  name        String
  category    String   // nong_nghiep | kinh_doanh | chan_nuoi | an_uong | xay_dung | han_muc
  loan_type   String   @default("tung_lan") // tung_lan | han_muc
  cost_items_template_json  String @default("[]")
  revenue_template_json     String @default("[]")
  defaults_json             String @default("{}")

  loan_plans  LoanPlan[]
  @@index([category])
  @@map("loan_plan_templates")
}
```

#### New: LoanPlan
```prisma
model LoanPlan {
  id            String @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  templateId    String?
  template      LoanPlanTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  loan_type     String  @default("tung_lan")
  name          String  @default("")
  cost_items_json     String @default("[]")
  revenue_items_json  String @default("[]")
  financials_json     String @default("{}")
  status        String  @default("draft") // draft | approved

  @@index([customerId])
  @@index([status])
  @@map("loan_plans")
}
```

### Implementation Steps
1. Add fields to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add-khcn-loan-plan`
3. Verify migration succeeds on SQLite
4. Update Prisma client types

### Success Criteria
- Migration runs without error
- Existing corporate customers unaffected (default "corporate")
- New models queryable via Prisma client

### Risks
- SQLite no ALTER COLUMN => new fields must be nullable or have defaults (all do)
