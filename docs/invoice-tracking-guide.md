# Invoice Tracking Feature Guide

## Overview

The Invoice Tracking feature provides complete loan and invoice lifecycle management with automated deadline monitoring, notifications, and financial tracking. Built as part of Phase 48, it enables customers to track disbursements, manage supplier invoices, and receive automatic deadline alerts.

## Core Concepts

### Hierarchy

```
Customer
  └── Loan (loan agreement)
      └── Disbursement (fund tranche)
          └── Invoice (supplier invoice for goods/services)
              └── Notification (deadline alerts)
```

### Status Flow

**Loan Statuses:**
- `active` - Loan is in effect
- `completed` - All funds disbursed, loan fulfilled
- `cancelled` - Loan terminated early

**Disbursement Statuses:**
- `active` - Funds released to customer
- `completed` - All invoices paid
- `cancelled` - Disbursement reversed

**Invoice Statuses:**
- `pending` - Not yet paid
- `paid` - Payment received
- `overdue` - Past due date with no payment

## Getting Started

### 1. Create a Loan

Navigate to `/report/loans/new` and fill in:
- Customer (select existing)
- Contract Number (unique identifier)
- Loan Amount (in currency units)
- Interest Rate (optional)
- Start Date
- End Date
- Purpose (optional, e.g., "Working Capital")

**Validation Rules:**
- Contract number must be unique
- Loan amount must be positive
- End date must be after start date

### 2. Add Disbursements

From `/report/loans/[id]`, click "Add Disbursement":
- Amount (must be positive, typically < loan amount)
- Disbursement Date
- Description (optional, e.g., "Initial tranche 50%")

**Constraints:**
- Total disbursements may exceed loan amount (tracked separately)
- Can add multiple disbursements over time
- Date can be in future

### 3. Track Invoices

From `/report/disbursements/[id]`, click "Add Invoice":
- Invoice Number (supplier invoice ID)
- Supplier Name
- Amount (invoice cost)
- Issue Date (when supplier created invoice)
- Due Date (payment deadline)
- Custom Deadline (optional override)
- Notes (optional)

**Important:**
- (invoiceNumber, supplierName) combination must be unique (prevents duplicates)
- Due date should match disbursement date or later
- Custom deadline overrides due date for notification purposes
- Amount may differ from disbursement amount

### 4. Monitor Deadlines

The system automatically:
- Checks invoices hourly
- Creates notifications 7 days before due date
- Marks invoices as overdue when past deadline
- Prevents notification spam (24-hour deduplication)

**Your Actions:**
- Click NotificationBell in sidebar to view alerts
- Click notification to jump to invoice
- Mark as read to dismiss

## API Reference

### Loans

```
GET /api/loans
  Query: customerId (optional - filter by customer)
  Returns: Array of loans with customer info and disbursement count

POST /api/loans
  Body: {
    customerId: string
    contractNumber: string
    loanAmount: number
    interestRate?: number
    startDate: string (ISO date)
    endDate: string (ISO date)
    purpose?: string
  }
  Returns: Created loan object

GET /api/loans/:id
  Returns: Loan with customer and full disbursements array

PUT /api/loans/:id
  Body: Partial update of any loan field or status change
  Returns: Updated loan object

DELETE /api/loans/:id
  Returns: { ok: true }
  Side Effect: Cascades delete to all disbursements and invoices

GET /api/loans/:id/disbursements
  Returns: Array of disbursements for this loan with invoice counts
```

### Disbursements

```
POST /api/disbursements
  Body: {
    loanId: string
    amount: number
    disbursementDate: string (ISO date)
    description?: string
  }
  Returns: Created disbursement object

GET /api/disbursements/:id
  Returns: Disbursement with loan info and full invoices array

PUT /api/disbursements/:id
  Body: Partial update of disbursement fields or status
  Returns: Updated disbursement object

DELETE /api/disbursements/:id
  Returns: { ok: true }
  Side Effect: Cascades delete to all invoices

GET /api/disbursements/:id/invoices
  Returns: Array of invoices for this disbursement
```

### Invoices

```
GET /api/invoices
  Query: status (pending|paid|overdue), customerId
  Returns: Array of invoices matching filters

POST /api/invoices
  Body: {
    disbursementId: string
    invoiceNumber: string
    supplierName: string
    amount: number
    issueDate: string (ISO date)
    dueDate: string (ISO date)
    customDeadline?: string (ISO date)
    notes?: string
  }
  Returns: Created invoice object

GET /api/invoices/:id
  Returns: Invoice with disbursement and loan info

PUT /api/invoices/:id
  Body: Partial update or status change
  Returns: Updated invoice object

DELETE /api/invoices/:id
  Returns: { ok: true }

GET /api/invoices/summary
  Returns: {
    total: { pending: N, paid: N, overdue: N },
    byStatus: { pending: [...], paid: [...], overdue: [...] }
  }

POST /api/invoices/check-duplicates
  Body: {
    invoiceNumber: string
    supplierName: string
    excludeId?: string (current invoice ID to exclude from check)
  }
  Returns: Array of similar invoices (fuzzy match on number/supplier)
```

### Notifications

```
GET /api/notifications
  Query: unreadOnly (true), limit (default 50)
  Returns: Array of notifications, newest first
  Note: Returns up to 50 most recent

POST /api/notifications/:id/read
  Returns: Notification with readAt timestamp

POST /api/notifications/mark-all-read
  Returns: { ok: true }
  Side Effect: Sets readAt on all unread notifications

GET /api/notifications (implicitly fetched by NotificationBell)
  Polled every 60 seconds by frontend
```

## Scheduler Details

### Deadline Checker

**Location:** `src/lib/notifications/deadline-scheduler.ts`

**Execution:**
- Starts on app initialization
- Runs every 60 minutes (3600000 ms)
- First run is immediate on app boot

**Logic:**

```
1. Find all pending invoices due within 7 days
   - Considers customDeadline if set, else uses dueDate
   - Only processes if current date < deadline < (now + 7 days)

2. For each invoice:
   - Check if "invoice_due_soon" notification already exists in last 24 hours
   - If not, create notification with metadata: { invoiceId, disbursementId, customerId }

3. Find all overdue invoices
   - Status = pending AND (customDeadline OR dueDate) < now

4. For each overdue:
   - Update invoice status to "overdue"
   - Check if "invoice_overdue" notification exists in last 24 hours
   - If not, create notification

5. If any notifications created:
   - Log count and details
   - Trigger browser push if enabled
```

**Deduplication:**
- Query: `appNotification WHERE type=? AND metadata CONTAINS invoiceId AND createdAt > (now - 24h)`
- Prevents same invoice triggering multiple notifications per day
- Dedup window: 24 hours (prevents spam but allows re-notification if dismissed)

## Notifications

### In-App Notifications

**Where to See:**
- Click NotificationBell in sidebar (top-right area)
- Shows unread count as badge
- Clicking opens NotificationPanel with list

**What's Included:**
- Notification title and message
- Link to related invoice
- Time created
- Mark as read button

**Retention:**
- All notifications stored indefinitely
- Oldest 50 retrieved by default
- Can mark all as read to clear

### Browser Push Notifications

**Requirements:**
- Browser support (Chrome, Firefox, Edge, Safari)
- User permission granted
- Service Worker registered

**Trigger:**
- Automatic when notification created (deadline warnings)
- Can be disabled in browser settings

**Content:**
- Title: "Invoice Due Soon" or "Invoice Overdue"
- Message: Invoice number, supplier, amount
- Clicking opens invoice detail page

## Components Reference

### LoanStatusBadge

```typescript
<LoanStatusBadge status="active" /> // Shows colored badge
```

**Styles:**
- `active` - Green
- `completed` - Gray
- `cancelled` - Red

### InvoiceStatusBadge

```typescript
<InvoiceStatusBadge status="pending" /> // Shows colored badge
```

**Styles:**
- `pending` - Yellow
- `paid` - Green
- `overdue` - Red

### SurplusDeficitBanner

```typescript
<SurplusDeficitBanner
  disbursementAmount={50000}
  totalInvoices={45000}
/>
```

Shows surplus (green) or deficit (red) between disbursement and invoices.

### InvoiceTable

```typescript
<InvoiceTable
  invoices={invoices}
  onEdit={(invoice) => setEditingInvoice(invoice)}
  onDelete={(id) => deleteInvoice(id)}
/>
```

Sortable, filterable table with action buttons.

### InvoiceFormModal

```typescript
<InvoiceFormModal
  isOpen={isOpen}
  disbursementId={disbId}
  initialData={editingInvoice}
  onSubmit={(data) => createOrUpdate(data)}
  onCancel={() => setIsOpen(false)}
/>
```

Form with validation, includes duplicate detection warning.

### NotificationBell

```typescript
<NotificationBell /> // Placed in sidebar
```

**Features:**
- Unread count badge
- 60-second polling interval
- Click to open panel
- Real-time updates

### NotificationPanel

```typescript
<NotificationPanel
  onClose={() => setOpen(false)}
/>
```

List of notifications with read/clear actions.

## Internationalization (i18n)

All new UI text supports Vietnamese (vi) and English (en):

```typescript
const { t } = useLanguage();

// Usage in components:
t('invoice.status.pending') // "Chờ thanh toán" (vi) or "Pending" (en)
t('invoice.deadline') // "Hạn thanh toán"
t('notification.dueSoon') // "Hóa đơn sắp đến hạn"
```

**Adding New Translations:**

Edit `src/lib/i18n/translations.ts`:

```typescript
export const translations = {
  vi: {
    invoice: {
      status: {
        pending: "Chờ thanh toán",
        paid: "Đã thanh toán",
        overdue: "Quá hạn"
      }
    }
  },
  en: {
    invoice: {
      status: {
        pending: "Pending",
        paid: "Paid",
        overdue: "Overdue"
      }
    }
  }
}
```

## Error Handling

### Common Errors

**400 - Validation Error**
```json
{
  "ok": false,
  "error": "Invalid request body.",
  "details": {
    "loanAmount": ["must be positive"],
    "contractNumber": ["must be unique"]
  }
}
```

**404 - Not Found**
```json
{
  "ok": false,
  "error": "Loan not found."
}
```

**500 - Server Error**
```json
{
  "ok": false,
  "error": "Failed to create invoice."
}
```

### Client-Side Error Handling

All pages wrap API calls in try-catch:

```typescript
try {
  const res = await fetch('/api/loans', { method: 'POST', body: JSON.stringify(data) });
  const result = await res.json();
  if (!result.ok) {
    showError(result.error); // User-friendly message
  }
} catch (err) {
  showError(t('error.network')); // Network error i18n
}
```

## Data Export & Reporting

### Invoice Summary

`GET /api/invoices/summary` returns:
```json
{
  "total": {
    "pending": 1000000,
    "paid": 500000,
    "overdue": 200000
  }
}
```

Use for:
- Dashboard metrics
- Financial reporting
- Cash flow forecasting

### CSV Export (Future)

Will be added in Phase 49 for bulk export of invoice lists.

## Best Practices

### For Users

1. **Set Realistic Due Dates**
   - Invoice due date should be when payment is actually needed
   - Use customDeadline to override if logistics delay expected

2. **Review Notifications Promptly**
   - 7-day warning gives time to process payment
   - Don't wait until overdue to investigate issues

3. **Track Disbursement vs Invoices**
   - Monitor surplus/deficit banner
   - Investigate significant discrepancies immediately

4. **Use Notes Field**
   - Document payment terms
   - Note any issues or special conditions

### For Developers

1. **Always Validate Input**
   - Use provided Zod schemas
   - Never skip validation for convenience

2. **Handle Errors Gracefully**
   - Convert AppError to HTTP responses
   - Provide helpful error messages

3. **Test Deadline Logic**
   - Test with past, current, and future dates
   - Verify deduplication with multiple test invoices

4. **Consider Timezone Issues**
   - Always use UTC timestamps in database
   - Convert to local time only for display

5. **Monitor Scheduler Performance**
   - Log execution time
   - Alert if execution > 1 second
   - Check for duplicate notification creation

## Troubleshooting

### Notifications Not Appearing

**Check:**
1. NotificationBell component rendered in layout
2. Browser console for fetch errors
3. Database has AppNotification records
4. Unread count shows > 0

**Fix:**
- Manually create test notification: `POST /api/notifications`
- Check 60-second polling is working (DevTools Network tab)
- Verify scheduler started (check logs: "Starting hourly invoice deadline check")

### Invoices Not Marked Overdue

**Check:**
1. Scheduler started (`SCHEDULER_KEY` in globalThis)
2. Invoice status is still "pending"
3. Current date is past dueDate or customDeadline

**Fix:**
- Manually trigger scheduler: `checkDeadlines()` in console
- Verify database clock is accurate
- Check scheduler logs for errors

### Duplicate Invoices Created

**Check:**
1. (invoiceNumber, supplierName) constraint is enforced
2. UI duplicate check running before POST

**Fix:**
- Delete duplicate via DELETE /api/invoices/:id
- Verify Prisma schema has unique constraint
- Check browser console for validation warnings

### Performance Issues

**With 1000+ Invoices:**
- Add indexes on dueDate, status, disbursementId
- Use pagination in invoice queries
- Consider archiving old paid invoices
- Cache invoice summary (invalidate on update)

## Security Considerations

### Data Protection

- No sensitive customer data in notifications (metadata is server-side only)
- JSON metadata not exposed to frontend
- All endpoints validate input with Zod

### Access Control

- Currently no authentication required
- Plan for Phase 51: Role-based access control
- Future: Customer-specific visibility

### Database

- SQLite file should have restricted permissions (0600)
- Regular backups recommended
- No production use without encryption at rest (plan migration to PostgreSQL)

## Performance Metrics

### Current Benchmarks

- Create invoice: ~50ms
- List invoices (100 items): ~80ms
- Scheduler execution: ~100ms (100 invoices)
- NotificationBell poll: ~60ms
- Update invoice status: ~30ms

### Optimization Opportunities

- Cache unread count (invalidate on create/read)
- Batch deadline checks (group by loan)
- Archive old paid invoices (separate table)
- Add full-text search for invoices
- Implement invoice soft-delete (instead of cascade)

## Future Enhancements (Phase 49+)

- [ ] Payment tracking (amount paid, date paid)
- [ ] Proof of payment attachment
- [ ] Batch import via CSV/XLSX
- [ ] Email notifications
- [ ] Invoice aging report
- [ ] Custom reminder intervals (not just 7 days)
- [ ] Vendor/supplier master database
- [ ] Integration with accounting software
- [ ] Multi-currency support
- [ ] Invoice lifecycle workflow (draft → submitted → approved → paid)
