# KHDN Disbursement Module Scout Report

## Module Overview
The KHDN disbursement system handles loan payment distributions ("giải ngân") with multi-beneficiary allocations and invoice tracking. Core logic spans services, API routes, and Prisma models.

## Key File Paths & Exports

### Prisma Schema Models
- **c:\Users\Quan\cong-cu-tao-bcdxcv\prisma\schema.prisma**
  - `Disbursement` (line 249): amount, disbursementDate, loanId, status, invoice tracking fields
  - `DisbursementBeneficiary` (line 281): beneficiary allocation per disbursement, invoiceStatus tracking
  - `Invoice` (line 303): invoiceNumber, supplierName, amount, status (pending/paid/overdue)

### Core Services
- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\services\disbursement.service.ts**
  - `BeneficiaryLineInput`: TS type for beneficiary allocation with invoices
  - `CreateDisbursementInput`: main DTO with expanded fields (currentOutstanding, debtAmount, loanTerm, etc.)
  - `disbursementService`: { listByLoan, getSummaryByLoan, list, getById, create, update, delete }

- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\services\disbursement-beneficiary-helpers.ts**
  - `validateBeneficiaryAmounts()`: ensures sum matches debtAmount (±0.01 tolerance)
  - `createBeneficiaryLines()`: transaction-safe creation with allocation validation

- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\services\invoice.service.ts**
  - `CreateInvoiceInput`, `UpdateInvoiceInput` types
  - `invoiceService` methods for invoice CRUD

- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\services\khcn-disbursement-template-config.ts**
  - `KHCN_DISBURSEMENT_TEMPLATES`: registry mapping template keys to DOCX paths (bcdxgn, unc, bang_ke_mua_hang, etc.)
  - `KhcnDisbursementTemplateKey` type

### API Routes
- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\app\api\loans\[id]\disbursements\route.ts**
  - GET: paginated list with filters (status, date range, search)
  - POST: create disbursement with beneficiaries & invoices (Zod validation)

- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\app\api\report\templates\khcn\disbursement\route.ts**
  - POST: generates KHCN disbursement DOCX reports from templates

- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\app\api\disbursements\[id]\invoices\route.ts**
  - Invoice CRUD for individual disbursements

### KHDN Mapping Module
- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\app\report\khdn\** (directory structure)
  - mapping/: field catalog, validation, templating
  - customers/: KHDN customer management pages
  - ai-suggest/: AI-powered field suggestions

- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\app\report\khdn\mapping\types.ts**
  - `MappingApiResponse`, `ValidationResponse`, `ValuesResponse` types
  - `MappingInstanceItem`, `FieldTemplateItem`, `ReverseTagSuggestion`

### Template Registries
- **c:\Users\Quan\cong-cu-tao-bcdxcv\src\lib\loan-plan\khcn-template-registry.ts**
  - giai_ngan category: UNC, Ủy nhiệm chi, Bảng kê mua hàng documents
  - Methods: tung_lan, han_muc, trung_dai, tieu_dung

## Key Types Summary
```typescript
BeneficiaryLineInput = { beneficiaryId?, beneficiaryName, address?, amount, invoiceStatus?, invoices? }
CreateDisbursementInput = { loanId, amount, disbursementDate, beneficiaries?, ...expandedFields }
Disbursement = { id, loanId, amount, disbursementDate, status, invoices[], beneficiaryLines[] }
```

## Invoice Tracking Integration
- Statuses: pending, has_invoice, bang_ke (line item)
- DisbursementBeneficiary tracks invoiceStatus & invoiceAmount separately
- Support for qty/unitPrice for bảng kê (bill of materials)

Unresolved: KHDN-specific business rules for giải ngân flow beyond KHCN.
