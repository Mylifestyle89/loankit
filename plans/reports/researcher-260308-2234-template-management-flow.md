# Template Management Flow Analysis - Report

**Date:** 2026-03-08 22:34
**Scope:** Next.js project template editor system
**Deliverable:** Complete workflow analysis + architecture assessment

---

## Executive Summary

The template management system consists of **two parallel workflows**:
1. **Configured Templates** - CRUD operations on database-managed templates with in-browser editing
2. **Folder Browser** - Read-only browsing of `report_assets/` filesystem with ad-hoc editing

**Key Finding:** The system does NOT perform true in-browser DOCX editing. Instead, it:
- **Downloads** DOCX file as ArrayBuffer into browser
- **Shows** a read-only or lightweight view (Eigenpal editor or OnlyOffice)
- **Uploads** modified ArrayBuffer back to server
- **Saves** to filesystem with automatic backups

---

## 1. ACTUAL USER WORKFLOW

### Tab 1: "Mẫu đã cấu hình" (Configured Templates)

**User Actions:**
```
1. Select template from dropdown (list from DB + file system config)
2. View template metadata (name, docx_path, placeholder_inventory_path, active status)
3. Choose action:
   A. "Mở DOCX" (Open DOCX) → Download file to local machine
   B. "Mở editor" (Open editor) → Edit in browser + save back to server
   C. "Chọn file từ máy" (Pick local file) → Edit temporary DOCX, download when done
```

**For action (B) - Editor Workflow:**
```
1. Click "Mở editor"
2. Editor type selected: OnlyOffice (if available) OR Eigenpal (browser-based)
3. File downloads from server → becomes ArrayBuffer in browser memory
4. Editor renders the DOCX in browser UI
5. User edits content + injects placeholders via toolbar
6. Click "Save" → ArrayBuffer uploaded via PUT /api/report/template/save-docx
7. Server creates backup + overwrites source file on disk
```

### Tab 2: "Duyệt folder mẫu" (Folder Browser)

**User Actions:**
```
1. Component loads → calls GET /api/report/template/folder-files
2. Server scans report_assets/ folder tree (EXCLUDED folders: backups, config, exports, generated, pdf, uploads, .locks, Tasks)
3. UI shows expandable tree with file counts
4. User clicks "Mở editor" button on any DOCX file
5. Same editor workflow as above
   - File loads from report_assets/{path}
   - Edit in browser
   - Save back to same path
```

---

## 2. DOCX FILE OPERATIONS

### What Happens to DOCX Files

**Operations Performed:**
- **Read** - Load from filesystem via signed URL
- **Display** - Render in browser editor (no true editing engine, just UI)
- **Edit** - User manually modifies content via editor toolbar
- **Save** - Upload modified ArrayBuffer back to server
- **Backup** - Before saving, server creates timestamped backup
- **No Merge/Process** - DOCX is never merged with data during template management

### Where DOCX Files Are Stored

**Configured Templates:**
```
Type: File paths stored in framework_state config
Location: report_assets/{relative_path}
Examples:
  - report_assets/templates/Disbursement.docx
  - report_assets/templates/Invoice.docx
```

**Folder Browser:**
```
Type: Direct filesystem scan
Location: report_assets/ root + all subfolders
Excluded: backups/, config/, exports/, generated/, pdf/, uploads/, .locks/, Tasks/
Backup location: report_assets/backups/{sanitized-filename}/ → contains up to 50 timestamped backups
```

### File Backup System

**Implemented in:** `src/lib/docx-engine.ts` → `saveDocxWithBackup()`

```typescript
// When PUT /api/report/template/save-docx is called:
1. Create backup directory: report_assets/backups/{sanitized-base-name}/
2. Save backup: {timestamp}.docx (e.g., 20260308-223400.docx)
3. Prune: Keep only latest 50 backups in that directory
4. If mode === "save", overwrite original file on disk
5. Return both paths: { path: relPath, backupPath: backupPath, mode }
```

---

## 3. IN-BROWSER EDITING NECESSITY ASSESSMENT

### Current Architecture

**Eigenpal Editor** (`DocxTemplateEditorModal`)
- Package: `@eigenpal/docx-js-editor`
- Capabilities:
  - Dynamic import (SSR: false) → browser-only
  - Renders DOCX in contenteditable container
  - Supports placeholder insertion via custom toolbar
  - Auto-backup feature (every 60s if `enableAutoBackup=true`)

**OnlyOffice Editor** (`OnlyOfficeEditorModal`)
- Architecture: Docker-based external service
- Requires: `docker-compose up onlyoffice`
- Capabilities:
  - Full Microsoft Word compatibility
  - Track changes, comments, styles
  - Collaboration features

### Is In-Browser Editing Necessary?

**NO - Could simplify significantly:**

#### Current Flow (Complex)
```
User → Download DOCX → Browser ArrayBuffer → Eigenpal/OnlyOffice → Edit → Upload → Save
```

#### Simplified Alternative (KISS Principle)
```
User → Download DOCX → Edit locally in Word/LibreOffice → Upload via form → Save
```

**Why Simplified Would Work:**
1. Template editing is **not frequent** - templates are stable baseline
2. Field injection via copy/paste from toolbar works **without browser editor**
3. No collaborative editing required (single template owner at a time)
4. Users likely have Word/LibreOffice installed locally
5. Removes dependency on Eigenpal + OnlyOffice Docker complexity

**Reasons to Keep Current:**
1. **User convenience** - No download/local edit/upload friction
2. **Field injection** - Visual toolbar makes placeholder insertion easier
3. **Quick iterations** - Immediate visual feedback
4. **Backup safety** - Auto-backup prevents accidental data loss

**Recommendation:** Keep for convenience, but make upload alternative available as fallback.

---

## 4. FIELD INJECTION FEATURE ANALYSIS

### What It Does

**Hook:** `useFieldInjection()` in `src/app/report/template/_components/use-field-injection.ts`

```typescript
// Manages:
1. Field Template selection (dropdown) → `/api/report/field-templates`
2. Field Catalog loading → Lists of {field_key, label_vi, group, type}
3. Group filtering → Filter fields by category
4. Placeholder generation → Copy `[field_key]` to clipboard OR insert directly
```

### Workflow

```
1. User selects Field Template (e.g., "Master Invoice Template")
2. Hook loads field_catalog array from DB
3. UI renders groups → dropdowns
4. User selects group (e.g., "Customer Info")
5. User selects field (e.g., "customer_name")
6. Click "Inject" button:
   - Eigenpal: Inserts `[customer_name]` directly into editor at cursor
   - OnlyOffice: Copies to clipboard → user manually pastes
   - Toolbar (outside editor): Copies to clipboard only
```

### Does It Require Browser Editor?

**NO - Could work independently:**

1. **Outside Editor** (`FieldInjectionToolbar`):
   - Already works without editor
   - Copies placeholder to clipboard
   - Users paste manually into their editor

2. **With Upload Form**:
   - Show field catalog before upload
   - User references placeholder names while editing locally

3. **Benefits**:
   - Users learn placeholder names before editing
   - No tight coupling to browser editor
   - Works with any external editor

**Current Design:** Field injection is **split**:
- Toolbar above editor (ready to copy/inject anytime)
- Smart insertion only works inside Eigenpal editor
- OnlyOffice falls back to clipboard

---

## 5. FILE STRUCTURE & API ROUTES

### Directory Structure

```
project_root/
├── src/app/report/template/
│   ├── page.tsx                          # Main template page (2 tabs)
│   └── _components/
│       ├── template-folder-browser.tsx   # Folder tree component
│       ├── use-field-injection.ts        # Field management hook
│       └── field-injection-toolbar.tsx   # UI for placeholder injection
│
├── src/app/api/report/template/
│   ├── route.ts                          # GET /api/report/template → getTemplates()
│   ├── folder-files/route.ts             # GET /api/report/template/folder-files
│   ├── save-docx/route.ts                # PUT /api/report/template/save-docx
│   ├── inventory/route.ts                # POST build placeholder inventory
│   ├── merge-docx/route.ts               # POST merge multiple DOCX files
│   └── open-backup-folder/route.ts
│
├── src/services/report/
│   ├── template.service.ts               # templateService facade
│   └── template-folder.service.ts        # listTemplateFolderFiles()
│
├── src/lib/
│   ├── docx-engine.ts                    # DOCX file operations
│   └── report/signed-file-url.ts         # Download URL generation
│
└── report_assets/
    ├── {configured-templates}/
    ├── backups/                          # Timestamped backups
    └── config/
        ├── inventories/                  # Placeholder catalogs (JSON)
        └── framework_state.json          # Master config
```

### API Endpoints

| Route | Method | Purpose | Returns |
|-------|--------|---------|---------|
| `/api/report/template` | GET | List configured templates | `{templates, active_template_id}` |
| `/api/report/template` | PATCH | Set active template | `{templates, active_template_id}` |
| `/api/report/template/folder-files` | GET | Scan report_assets tree | `{tree: FolderNode[]}` |
| `/api/report/template/save-docx?path=...` | PUT | Save edited DOCX | `{path, backup_path, mode}` |
| `/api/report/template/inventory` | POST | Extract placeholders | `{inventory, suggestions}` |
| `/api/report/template/merge-docx` | POST | Merge DOCX files | Binary DOCX response |
| `/api/report/file/token` | GET | Signed download token | `{token}` |
| `/api/report/file` | GET | Download file with token | Binary file |

### Key File Operations

**Saving DOCX** → `src/lib/docx-engine.ts`
```typescript
saveDocxWithBackup(input: { relPath: string; buffer: Buffer; mode: "backup" | "save" })
  // 1. Validate path (must start with report_assets/, no ..)
  // 2. Create backup dir if missing
  // 3. Write backup: report_assets/backups/{safe-filename}/{timestamp}.docx
  // 4. If mode==="save", overwrite source file
  // 5. Prune old backups (keep 50 latest)
  // 6. Return { path, backupPath, mode }
```

**Scanning Folder** → `src/services/report/template-folder.service.ts`
```typescript
listTemplateFolderFiles(): Promise<FolderNode[]>
  // 1. Read report_assets/ recursively
  // 2. Exclude: backups, config, exports, generated, pdf, uploads, .locks, Tasks
  // 3. Include only: .docx files
  // 4. Exclude: report_preview_*, ~$*, *.bak
  // 5. Return tree structure with file metadata (size, mtime)
```

---

## 6. UPLOAD DOCX ENDPOINT STATUS

### NO Upload Endpoint Exists

**Findings:**
- No `POST /api/report/template/upload` endpoint
- No file upload handler for user-supplied DOCX
- Users can only:
  1. Edit existing templates in browser
  2. Edit local DOCX, then upload via `save-docx` (but requires server-side path validation)

### Why Missing?

1. **Security**: Uploading to arbitrary paths requires strong validation
2. **Workflow**: Current assumption is templates pre-exist on disk
3. **Alternative**: Users edit locally → download updated template → admin moves to correct folder

### To Add Upload Capability

Would need:
```typescript
// POST /api/report/template/upload
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const relPath = form.get("path") as string; // e.g., "templates/MyTemplate.docx"

  // Validate:
  // 1. File is DOCX
  // 2. Path is safe (no .. escapes, starts with report_assets/)
  // 3. Create directories if needed
  // 4. Write file
  // 5. Update framework_state if needed
}
```

---

## 7. CONFIGURATION & STATE MANAGEMENT

### Framework State

**File:** `report_assets/config/framework_state.json`
**Loaded by:** `src/lib/report/fs-store.ts`

**Contains:**
```json
{
  "template_profiles": [
    {
      "id": "uuid",
      "template_name": "Disbursement",
      "docx_path": "report_assets/templates/Disbursement.docx",
      "placeholder_inventory_path": "report_assets/config/inventories/uuid.json",
      "active": true
    }
  ],
  "active_template_id": "uuid",
  "field_templates": [...],
  "field_catalog": [...],
  "mapping_versions": [...]
}
```

### Field Templates

**Loaded via:** `GET /api/report/field-templates`
**Structure:**
```typescript
{
  id: string;
  name: string;
  field_catalog: {
    field_key: string;    // e.g., "customer_name"
    label_vi: string;     // e.g., "Tên khách hàng"
    group: string;        // e.g., "Customer Info"
    type: string;         // e.g., "string", "number"
  }[];
}
```

---

## 8. EDITOR TYPE SELECTION

**Logic in:** `src/app/report/template/page.tsx`

```typescript
// At startup, check OnlyOffice availability
useEffect(() => {
  fetch("/api/onlyoffice/health")
    .then(r => r.json())
    .then(d => {
      setOnlyofficeAvailable(d.available);
      if (!d.available) setEditorType("eigenpal"); // Fallback
    })
}, []);

// User can toggle via SegmentedControl if OnlyOffice available
{onlyofficeAvailable && (
  <SegmentedControl
    value={editorType}
    onChange={v => setEditorType(v)}
    options={[
      { value: "onlyoffice", label: "OnlyOffice" },
      { value: "eigenpal", label: "Eigenpal" }
    ]}
  />
)}
```

**Fallback Chain:**
1. Try OnlyOffice (if Docker is running)
2. Fall back to Eigenpal (always available, no external dependency)

---

## CRITICAL CODE PATHS

### Load + Edit + Save Flow

```
1. User clicks "Mở editor"
   └─→ openProfileEditor() or openEigenpalEditor()

2. Get signed download URL
   └─→ getSignedFileUrl(profileDocxPath, true)
       └─→ GET /api/report/file/token?path=...
       └─→ Returns { token }
       └─→ Builds URL: /api/report/file?path=...&token=...

3. Fetch DOCX as ArrayBuffer
   └─→ const res = await fetch(signedUrl)
       └─→ setEditorBuffer(await res.arrayBuffer())
       └─→ setShowEditor(true)

4. Editor mounts (Eigenpal or OnlyOffice)
   └─→ documentBuffer rendered as DOCX content

5. User edits + clicks "Save"
   └─→ Modal calls onSaveDocx(buffer: ArrayBuffer)

6. Upload to server
   └─→ PUT /api/report/template/save-docx?path={encodeURIComponent(activeEditorPath)}
       Headers: { "Content-Type": "application/octet-stream" }
       Body: buffer (raw bytes)

7. Server processes
   └─→ reportService.saveTemplateDocx({relPath, buffer, mode: "save"})
       └─→ docxEngine.saveDocxWithBackup(...)
           1. Validate path safety
           2. Create backup: report_assets/backups/{name}/{timestamp}.docx
           3. Write file: report_assets/{relPath}
           4. Prune old backups
           5. Return { path, backupPath, mode: "save" }

8. Response to browser
   └─→ { ok: true, path, backup_path, mode }
       └─→ setMessage("Đã lưu thành công")
       └─→ If editorSource === "managed", reload templates list
```

---

## UNRESOLVED QUESTIONS

1. **OnlyOffice Integration**: Does OnlyOffice editor actually save back to `/api/report/template/save-docx`? The modal shows it calls `onSaved()` callback but doesn't show explicit PUT logic in the snippet provided. **Need to verify:** `src/components/onlyoffice-editor-modal.tsx` (lines 100+).

2. **Placeholder Inventory**: How are placeholders extracted from DOCX? Is this docxtemplater-specific? **Use case**: When user clicks "Build Inventory" endpoint, it calls `parseDocxPlaceholderInventory()`. What parsing logic does it use?

3. **Field Injection in OnlyOffice**: The modal accepts `fieldCatalog` prop but the snippet doesn't show if placeholders can be inserted into OnlyOffice editor. Does it show a sidebar? **Need verification** of full `onlyoffice-editor-modal.tsx`.

4. **Database vs Filesystem**: The system appears to mix:
   - Configured templates (from `framework_state.json`)
   - DB-based field templates (Prisma `fieldTemplateMaster`)
   - Folder-scanned templates (filesystem only)

   **Unclear**: How does the migration from file-based to DB-based work? See `_migration-internals` helper functions.

5. **Auto-Backup Timing**: The `DocxTemplateEditorModal` supports `enableAutoBackup` and `autoBackupIntervalMs`, but the backup logic calls `saveEditorDocx()` which does a full PUT. **Question**: Does this create a backup every 60s, even without user clicking Save?

6. **Ownership of `report_preview_*` Files**: The folder scanner excludes files starting with `report_preview_`. Where are these generated? Are they temporary outputs from the DOCX-to-PDF conversion pipeline?

---

## SUMMARY TABLE

| Aspect | Details |
|--------|---------|
| **Edit Locations** | 1) Configured templates (DB-backed), 2) Folder scan (filesystem) |
| **Editors Available** | OnlyOffice (Docker), Eigenpal (browser) |
| **File Ops** | Download → Edit in browser → Upload → Save with auto-backup |
| **No DOCX Merge** | During template management; only happens during report generation |
| **Field Injection** | Clipboard copy + optional direct insert into Eigenpal editor |
| **Upload Support** | NO endpoint for uploading new templates; must edit existing files |
| **Backup System** | Per-file timestamped backups in `report_assets/backups/{name}/` |
| **Complexity** | Moderate - relies on external editor packages (Eigenpal, OnlyOffice) |
| **YAGNI Assessment** | Browser editor simplifies UX but adds complexity; uploadable import would be safer |

