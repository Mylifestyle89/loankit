# Phase 1: API - Folder Files Endpoint

## Context
- Plan: [plan.md](./plan.md)
- Related: `src/services/report/template.service.ts`, `src/app/api/report/template/`

## Overview
- **Priority**: P1
- **Status**: pending
- **Description**: New API endpoint to list DOCX files from `report_assets/` with folder structure

## Key Insights
- `report_assets/` has a mix of templates and operational folders (backups, exports, etc.)
- Only `.docx` files are relevant (skip .xlsx, .xlsm, .json, .md, .pdf)
- Some folders should be excluded entirely (they contain generated/backup files)
- Folder structure is shallow (max 2-3 levels deep)

## Architecture

### Endpoint
```
GET /api/report/template/folder-files
Response: {
  ok: true,
  tree: FolderNode[]
}

type FileEntry = {
  name: string;       // "2268.02A.PN BC de xuat cho vay ngan han.docx"
  path: string;       // "2268.02A.PN BC de xuat cho vay ngan han.docx" (relative to report_assets/)
  size: number;       // bytes
  modified: string;   // ISO date
}

type FolderNode = {
  name: string;       // folder name or "." for root
  path: string;       // relative path from report_assets/
  files: FileEntry[];
  subfolders: FolderNode[];
}
```

### Exclusion Rules
Exclude folders: `backups`, `config`, `exports`, `generated`, `pdf`, `uploads`, `.locks`, `Tasks`
Exclude files: `report_preview_*`, `~$*`, `*.bak`, non-docx files

## Related Code Files

### Create
- `src/app/api/report/template/folder-files/route.ts` — API route handler
- `src/services/report/template-folder.service.ts` — folder scanning logic (keep service layer separate)

### Modify
- None

## Implementation Steps

1. **Create `template-folder.service.ts`** in `src/services/report/`:
   ```typescript
   // Recursive folder scanner
   // - Base dir: path.join(process.cwd(), "report_assets")
   // - Excluded folder names (Set): backups, config, exports, generated, pdf, uploads, .locks, Tasks
   // - File filter: .docx only, exclude report_preview_*, ~$*, *.bak
   // - Return FolderNode[] (root files + subfolders)
   // - Use fs.readdir with withFileTypes: true
   // - Get file stats (size, mtime) with fs.stat
   // - Sort: folders alphabetically, files alphabetically
   ```

2. **Create API route** `src/app/api/report/template/folder-files/route.ts`:
   ```typescript
   export const runtime = "nodejs";
   // GET handler: call service, return { ok: true, tree }
   // Error handling with toHttpError
   ```

3. **Test manually**: `curl http://localhost:3000/api/report/template/folder-files | jq`

## Todo List
- [ ] Create `src/services/report/template-folder.service.ts`
- [ ] Create `src/app/api/report/template/folder-files/route.ts`
- [ ] Manual API test

## Success Criteria
- API returns complete tree of DOCX files in report_assets
- Excluded folders are not scanned
- Response is fast (<200ms for typical folder structure)
- File paths are relative to `report_assets/` (compatible with existing save-docx API)

## Risk Assessment
- **Low**: Folder might contain hundreds of files → mitigated by exclusion rules + shallow depth
- **Low**: Permission issues on Windows → use try/catch per entry, skip on error

## Security Considerations
- Path traversal: service only scans within `report_assets/` (no user-supplied path)
- No write operations
- No authentication needed (matches existing template API pattern)
