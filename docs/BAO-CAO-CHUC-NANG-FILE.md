# Báo cáo chức năng theo file – Báo Cáo Document Generator

Tài liệu mô tả **cấu trúc hạ tầng** và **chức năng từng file** chính trong ứng dụng (trang, layout, API, service, core, lib, component).

---

## 1. Trang (Pages) – `src/app/**/page.tsx`

| File | Route | Chức năng |
| :--- | :--- | :--- |
| **`src/app/page.tsx`** | `/` | **Landing page**: Màn hình chào "Simple. Powerful. Yours", nền gradient + animation (landing-gradient-shift, landing-node-float, landing-line-breathe). Nút **Get Started** điều hướng tới `/report/mapping`. |
| **`src/app/report/page.tsx`** | `/report` | **Report home**: Chỉ thực hiện `redirect("/report/mapping")` — vào thẳng Trình chỉnh field, không có bước trung gian. |
| **`src/app/report/mapping/page.tsx`** | `/report/mapping` | **Trang Mapping (core)**: Quản lý Field Catalog (nhóm/trường, repeater), map dữ liệu (manual + formula), chọn khách hàng & template, Import/Export catalog, AI mapping suggestion, OCR data entry, Auto-process batch, Validate, Undo xóa, Drag & Drop sắp xếp. Tích hợp ModalRegistry (Zustand), useFieldTemplates, useMappingApi, useGroupManagement, useFieldCatalogImport. |
| **`src/app/report/template/page.tsx`** | `/report/template` | **Quản lý mẫu DOCX**: Danh sách template (tải từ API), chọn template active, mở file DOCX, mở **DocxTemplateEditorModal** (soạn Word trên web), copy placeholder từ Field Catalog vào editor, lưu DOCX, mở file local. |
| **`src/app/report/customers/page.tsx`** | `/report/customers` | **Danh sách khách hàng**: CRUD qua API, Import/Export CSV, Export modal (chọn khách hàng + template để xuất dữ liệu). |
| **`src/app/report/customers/new/page.tsx`** | `/report/customers/new` | **Tạo khách hàng mới**: Form nhập customer_code, customer_name, address, main_business, charter_capital, legal_representative_*, organization_type; POST `/api/customers`. |
| **`src/app/report/customers/[id]/page.tsx`** | `/report/customers/[id]` | **Sửa khách hàng**: Load 1 customer theo `id`, form chỉnh sửa giống new, PATCH `/api/customers/[id]`. |
| **`src/app/report/runs/page.tsx`** | `/report/runs` | **Pipeline & Logs**: Danh sách run log (run_id, mapping_version_id, template_profile_id, output_paths, duration_ms). Nút **Build/Validate** (POST `/api/report/validate`), **Export Preview** (POST `/api/report/export` + mở DocxPreviewModal), tải file DOCX kết quả. |

---

## 2. Layout – `src/app/**/layout.tsx`

| File | Phạm vi | Chức năng |
| :--- | :--- | :--- |
| **`src/app/layout.tsx`** | Toàn app | Root layout: font Inter/Geist Mono, **ThemeProvider** (dark/light/system), **LanguageProvider**, `globals.css`. Script inline tránh flash theme (đọc `app_theme` từ localStorage). |
| **`src/app/report/layout.tsx`** | `/report/*` | Sidebar thu gọn/mở rộng (Framer Motion), nav: Mapping, Template, Customers, Runs. **ThemeToggle**, **LanguageProvider**, nút AI (dispatch `mapping:open-ai-suggestion` khi đang ở mapping). **GlobalModalProvider** bọc children. |

---

## 3. API Routes – `src/app/api/**/route.ts`

### 3.1 Customers

| Path | Method | Chức năng |
| :--- | :--- | :--- |
| `/api/customers` | GET | Danh sách khách hàng (customer.service). |
| `/api/customers` | POST | Tạo khách hàng mới. |
| `/api/customers/[id]` | GET | Chi tiết 1 khách hàng. |
| `/api/customers/[id]` | PATCH | Cập nhật khách hàng. |
| `/api/customers/[id]` | DELETE | Xóa khách hàng. |
| `/api/customers/to-draft` | POST | Chuyển dữ liệu khách hàng sang draft (report.service). |
| `/api/customers/from-draft` | POST | Khôi phục từ draft. |

### 3.2 Report – State, Template, File

| Path | Method | Chức năng |
| :--- | :--- | :--- |
| `/api/report/state` | GET/POST | Đọc/ghi framework state (report.service, fs-store). |
| `/api/report/template` | GET | Danh sách template profile. |
| `/api/report/template` | POST | Tạo/cập nhật template profile. |
| `/api/report/template/inventory` | GET | Inventory placeholder của template. |
| `/api/report/template/save-docx` | POST | Lưu buffer DOCX từ editor lên disk. |
| `/api/report/template/merge-docx` | POST | Gộp nhiều file DOCX. |
| `/api/report/template/open-backup-folder` | POST | Mở thư mục backup (platform-specific). |
| `/api/report/file` | GET | Đọc file từ path (download=1 tải về, 0 trả buffer). |

### 3.3 Report – Mapping, Catalog, Field Templates

| Path | Method | Chức năng |
| :--- | :--- | :--- |
| `/api/report/mapping` | GET/POST | Load/save mapping (theo customer/template/instance), report.service. |
| `/api/report/mapping/suggest` | POST | Gợi ý mapping Word ↔ Excel bằng AI (ai-mapping.service). |
| `/api/report/mapping/ocr-process` | POST | OCR ảnh/PDF → gợi ý field (ocr.service + extract-fields-from-ocr). |
| `/api/report/catalog` | GET | Catalog theo context (customer/template). |
| `/api/report/field-templates` | GET | Danh sách field template (master + instance). |
| `/api/report/master-templates` | GET/POST | CRUD master template. |
| `/api/report/master-templates/[id]` | GET/PUT/DELETE | Chi tiết/sửa/xóa master template. |
| `/api/report/mapping-instances` | GET/POST | Danh sách/tạo mapping instance. |
| `/api/report/mapping-instances/[id]` | GET/PATCH/DELETE | Chi tiết/sửa/xóa mapping instance. |

### 3.4 Report – Build, Validate, Export, Values, Backups

| Path | Method | Chức năng |
| :--- | :--- | :--- |
| `/api/report/build` | POST | Build pipeline (run_pipeline, validate). |
| `/api/report/validate` | POST | Validate dữ liệu + optional run_build. |
| `/api/report/export` | POST | Xuất DOCX (docx-engine). |
| `/api/report/export-data` | POST | Export dữ liệu mapping (stream, theo customer/template). |
| `/api/report/import-data` | POST | Import dữ liệu vào mapping. |
| `/api/report/values` | GET/POST | Đọc/ghi values (manual + computed). |
| `/api/report/backups/list` | GET | Danh sách file backup (state + docx). |
| `/api/report/backups/restore` | GET | Restore từ file backup (query `file=...`). |

### 3.5 Report – Auto-Tagging, Auto-Process, Financial Analysis

| Path | Method | Chức năng |
| :--- | :--- | :--- |
| `/api/report/auto-tagging/analyze` | POST | Phân tích DOCX → gợi ý tag (auto-tagging.service). |
| `/api/report/auto-tagging/apply` | POST | Áp dụng tag vào DOCX. |
| `/api/report/auto-tagging/reverse` | POST | Reverse engineering: Word hoàn chỉnh → gợi ý template có tag (reverse-template-matcher). |
| `/api/report/auto-process/upload` | POST | Upload file cho batch. |
| `/api/report/auto-process/start` | POST | Khởi tạo job auto-process. |
| `/api/report/auto-process/run` | POST | Chạy bước xử lý batch. |
| `/api/report/auto-process/jobs/[id]` | GET | Trạng thái job. |
| `/api/report/auto-process/assets` | GET | Danh sách asset (file đã upload). |
| `/api/report/auto-process/open-output` | POST | Mở thư mục output. |
| `/api/report/financial-analysis/extract` | POST | Trích xuất dữ liệu tài chính (financial-analysis.service). |
| `/api/report/financial-analysis/analyze` | POST | Phân tích tài chính (AI). |
| `/api/report/runs` | GET | Danh sách run log (pipeline-client, report.service). |

---

## 4. Services – `src/services/*.ts`

| File | Chức năng |
| :--- | :--- |
| **`report.service.ts`** | Trung tâm nghiệp vụ báo cáo: dual-read (DB + legacy JSON), migration framework_state → Prisma; CRUD Master Template & Mapping Instance; load/save state, mapping, alias; export/validate; backup list/restore; pipeline build/run log; field-templates, catalog, values. |
| **`customer.service.ts`** | CRUD Customer (Prisma), map cột Excel ↔ field (A.general.*), parse data_json, to-draft/from-draft. |
| **`ai-mapping.service.ts`** | `suggestMapping(excelHeaders, wordPlaceholders)`: gọi AI (OpenAI/Gemini), parse JSON gợi ý + grouping; chuẩn lỗi ValidationError/SystemError. |
| **`auto-tagging.service.ts`** | Phân tích DOCX (paragraphs, runs), gợi ý tag; replace text bằng placeholder an toàn (XML offsets); reverse engineer template (reverseEngineerTemplate); saveTemplate. |
| **`auto-process.service.ts`** | Điều phối upload, start job, run batch (universal-auto-process-engine), trạng thái job, assets, mở output. |
| **`ocr.service.ts`** | OCR ảnh (tesseract.js, fallback Vision/Gemini), PDF multi-page (giới hạn 20MB); trả text. |
| **`security.service.ts`** | `scrubSensitiveData(text)`: mask PII (email, SĐT, CCCD/CMND, số tài khoản, tên). |
| **`financial-analysis.service.ts`** | Extract/analyze dữ liệu tài chính (AI), dùng cho Financial Analysis modal. |

---

## 5. Core – `src/core/**/*.ts`

### 5.1 Use Cases

| File | Chức năng |
| :--- | :--- |
| **`mapping-engine.ts`** | `normalizeGroupPath`, `parseCsvImportRows`, `parseXlsxImportRows`, `processImportRows`, `buildGroupedFieldTree` (cây nhóm/trường cho UI). |
| **`formula-processor.ts`** | `computeEffectiveValues`: merge manual + formula, tính giá trị hiệu lực theo field. |
| **`report-validation.ts`** | `validateReportPayload`: kiểm tra dữ liệu/placeholder trước khi xuất. |
| **`grouping-engine.ts`** | `groupDataByField(rows, groupKey, repeatKey)`: gom dòng theo nhóm, mảng con theo repeatKey (1-N). |
| **`apply-ai-suggestion.ts`** | `applyAiSuggestion`: áp gợi ý AI (mapping + grouping) vào catalog/state. |
| **`reverse-template-matcher.ts`** | `buildSemanticCandidates`, `selectTopSuggestions`: chuẩn hóa, scoring (lexical/semantic/format/proximity), gợi ý tag từ Word hoàn chỉnh. |
| **`extract-fields-from-ocr.ts`** | Pipeline: OCR → scrub PII → semantic map → suggestions (phục vụ OCR data entry). |
| **`universal-auto-process-engine.ts`** | `normalizeDynamicRows`, `rankRootKeyCandidates`, `resolveRootKey`, `mapRowsWithSuggestion`, `pickBestCustomerNameKey` cho batch auto-process. |

### 5.2 Errors

| File | Chức năng |
| :--- | :--- |
| **`app-error.ts`** | Định nghĩa `AppError`, `ValidationError`, `NotFoundError`, `ConflictError`, `SystemError`, `OcrProcessError`, `AiMappingTimeoutError`; `toHttpError(error, fallbackMessage)` để chuẩn hóa trả về HTTP. |

---

## 6. Lib – `src/lib/**/*.ts`

| File | Chức năng |
| :--- | :--- |
| **`config-schema.ts`** | Schema Zod: mappingMasterSchema, aliasMapSchema, fieldCatalogItemSchema, mappingVersionSchema, templateProfileSchema, runLogSchema, fieldTemplateSchema; type FieldCatalogItem, FrameworkState, MasterTemplateSummary, MappingInstanceSummary. |
| **`constants.ts`** | Đường dẫn mặc định: REPORT_CONFIG_DIR, REPORT_VERSIONS_DIR, REPORT_STATE_FILE, DEFAULT_MAPPING_FILE, DEFAULT_ALIAS_FILE, REPORT_MERGED_FLAT_FILE, v.v. |
| **`fs-store.ts`** | Đọc/ghi state, mapping, alias, template inventory; loadState, saveState, getActiveMappingVersion, getActiveTemplateProfile, createMappingDraft, publishMappingVersion, setActiveTemplate, updateTemplateInventory; backup (prune old). |
| **`docx-engine.ts`** | Render DOCX: đọc template, fill flat + aliasMap, hỗ trợ table loop `{#group}...{/group}`; class TemplateNotFoundError, DataPlaceholderMismatchError, CorruptedTemplateError; resolveAlias, toTodayLiteral. |
| **`template-parser.ts`** | Parse DOCX placeholder inventory; suggestAliasForPlaceholder. |
| **`field-calc.ts`** | `evaluateFieldFormula`: tính công thức theo field (number, percent, date). |
| **`field-formulas.ts`** | loadFieldFormulas, saveFieldFormulas (theo mapping path). |
| **`field-labels.ts`** | normalizeFieldCatalogGroupsVi, normalizeFieldCatalogLabelsVi, translateFieldLabelVi, translateGroupVi. |
| **`manual-values.ts`** | loadManualValues, saveManualValues, mergeFlatWithManualValues. |
| **`pipeline-client.ts`** | logRun, runBuildAndValidate (gọi script Python). |
| **`file-lock.service.ts`** | Khóa file khi ghi (tránh ghi đồng thời). |
| **`use-modal-store.ts`** | Store Zustand: openModal(view, data), closeModal, isOpen, view, data (cho GlobalModalProvider + ModalRegistry). |
| **`alias-utils.ts`** | Tiện ích xử lý alias map. |
| **`prisma.ts`** | Khởi tạo PrismaClient singleton. |
| **`db.ts`** | Kết nối DB (nếu dùng riêng). |
| **`docx-merge.ts`** | Gộp DOCX (dùng trong merge-docx API). |
| **`xlsx-table-injector.ts`** | Chèn dữ liệu bảng vào Excel/DOCX. |
| **`bctc-extractor.ts`** | Trích xuất BCTC (báo cáo tài chính). |
| **`i18n/translations.ts`** | Bản dịch vi/en cho toàn app (nav, report, template, customers, runs, mapping, AI modal, v.v.). |

---

## 7. Components

### 7.1 Shared – `src/components/*.tsx`

| File | Chức năng |
| :--- | :--- |
| **`theme-provider.tsx`** | ThemeProvider (light/dark/system), hook useTheme, key localStorage `app_theme`. |
| **`language-provider.tsx`** | Context ngôn ngữ (vi/en), useLanguage (t, locale, setLocale). |
| **`language-toggle.tsx`** | Nút chuyển ngôn ngữ. |
| **`ui/ThemeToggle.tsx`** | Nút Moon/Sun đổi theme, Framer Motion. |
| **`ui/BaseModal.tsx`** | Modal base: overlay, animation (y: 20 → 0), đóng bằng overlay/ESC. |
| **`docx-template-editor-modal.tsx`** | Modal chứa @eigenpal/docx-js-editor: mở DOCX từ buffer, copy placeholder theo nhóm từ fieldCatalog, Save, auto-backup theo interval, mở thư mục backup. |
| **`docx-preview-modal.tsx`** | Modal xem trước DOCX (buffer), tải file. |

### 7.2 Report Mapping – `src/app/report/mapping/components/*.tsx`

| File | Chức năng |
| :--- | :--- |
| **`MappingSidebar.tsx`** | Sidebar: chọn Customer, Field Template (apply/attach/edit), Import/Export catalog, Merge DOCX (state + upload), bật Technical keys, nút tạo mẫu, gộp nhóm; hiển thị danh sách nhóm + tree. |
| **`MappingHeader.tsx`** | Header thanh công cụ mapping (title, actions). |
| **`MappingVisualToolbar.tsx`** | Thanh công cụ: Lưu dữ liệu, AI Mapping (mở modal), OCR drop-zone, Validate, Import/Export, badge pending OCR review. |
| **`MappingVisualSection.tsx`** | Vùng nội dung chính: search, filter unmapped/technical, danh sách FieldRow (drag & drop). |
| **`MappingCanvas.tsx`** | Khu vực canvas/board hiển thị field (có thể dùng cùng FieldCatalogBoard). |
| **`FieldCatalogBoard.tsx`** | Board/card hiển thị catalog theo nhóm (grid/cards). |
| **`FieldRow.tsx`** | Một dòng field: label, type, value input (text/number/percent/date/table), công thức, đổi nhóm, xóa, drag handle; hỗ trợ OCR suggestion (Accept/Decline), confidence score, sample data. |
| **`ValidationResultPanel.tsx`** | Hiển thị kết quả validate (lỗi/cảnh báo). |
| **`SystemLogCard.tsx`** | Timeline log (AI/System/Error), nhấn mạnh log mới nhất. |
| **`EditingTemplateBanner.tsx`** | Banner khi đang chỉnh template: Import backup (ImportBackupModal), xóa template mẫu, thông tin template. |
| **`MappingTabSwitch.tsx`** | Chuyển tab (nếu có nhiều chế độ xem). |
| **`MappingModals.tsx`** | Tập trung các modal cục bộ (edit group, merge groups, change field group, add field, formula, field template picker, import group prompt, v.v.). |
| **`GlobalModalProvider.tsx`** | Provider bọc cây report; render ModalRegistry. |
| **`ModalRegistry.tsx`** | Đăng ký modal global: AiMappingModal, DeleteGroupConfirmModal, CreateMasterTemplateModal (đọc từ useModalStore). |
| **`AdvancedJsonPanel.tsx`** | Panel JSON nâng cao (đã tối giản flow, có thể ẩn). |

### 7.3 Report Mapping – Modals (`Modals/*.tsx`)

| File | Chức năng |
| :--- | :--- |
| **`AiMappingModal.tsx`** | Nhập header Excel, danh sách placeholder Word, "Phân tích bằng Gemini", bảng đối chiếu, Chấp nhận gợi ý, Tự động gom nhóm; Smart Batch (auto-process), progress/log, tải file. |
| **`CreateMasterTemplateModal.tsx`** | Tạo master template (name, description), gọi API, callback payload. |
| **`DeleteGroupConfirmModal.tsx`** | Xác nhận xóa nhóm (thay window.confirm). |
| **`DeleteConfirmModal.tsx`** | Xác nhận xóa (nhập lại tên) cho xóa template/instance. |
| **`EditGroupModal.tsx`** | Sửa tên nhóm. |
| **`MergeGroupsModal.tsx`** | Gộp nhóm: chọn nguồn, đích, thứ tự (keep/alpha). |
| **`ChangeFieldGroupModal.tsx`** | Đổi nhóm của field. |
| **`AddFieldModal.tsx`** | Thêm field mới (label, group, type). |
| **`FormulaModal.tsx`** | Nhập công thức cho field (number/percent/date). |
| **`FunctionListModal.tsx`** | Danh sách hàm có thể dùng trong công thức. |
| **`FieldTemplateModals.tsx`** | Các modal liên quan field template (attach, edit name, v.v.). |
| **`ImportTemplateGroupModal.tsx`** | Import nhóm từ template khác. |
| **`ImportGroupPromptModal.tsx`** | Prompt khi import gặp group/subgroup mới (chọn tạo mới hay map). |
| **`ImportBackupModal.tsx`** | Chọn file backup + template trong snapshot để restore vào template hiện tại. |
| **`FinancialAnalysisModal.tsx`** | Modal phân tích tài chính (AI extract/analyze). |
| **`OcrReviewModal.tsx`** | Bảng tất cả gợi ý OCR (field \| giá trị \| confidence \| Accept/Decline); Accept All / Decline All. |

---

## 8. Hooks – `src/app/report/mapping/hooks/*.ts`

| File | Chức năng |
| :--- | :--- |
| **`useFieldTemplates.ts`** | Load danh sách field template (customer + generic), chọn template, apply template (instance snapshot). |
| **`useMappingApi.ts`** | Load/save mapping qua API (state, versions, catalog, values, validation). |
| **`useGroupManagement.ts`** | Thêm/xóa/sửa nhóm, gộp nhóm, đổi nhóm field, undo xóa (tối đa 5 bước). |
| **`useFieldCatalogImport.ts`** | Import Excel/CSV vào catalog (parse, append/overwrite, map group). |
| **`useAutoTagging.ts`** | Gọi analyze/apply auto-tagging, trạng thái loading/error. |

---

## 9. Khác – `src/app/report/mapping/*.ts`

| File | Chức năng |
| :--- | :--- |
| **`helpers.ts`** | removeVietnameseTones, slugifyBusinessText, toInternalType, toBusinessType, normalizeFieldCatalogForSchema, buildInternalFieldKey, normalizeInputByType, formatNumberVnDisplay, formatPercentVnDisplay, toDateInputValue, typeLabelKey, TypeLabelMap. |
| **`types.ts`** | Type/interface: FieldTemplateItem, MappingApiResponse, ValidationResponse, AutoProcessJob, OcrSuggestionMap, OcrProcessResponse, v.v. |

---

## 10. Cấu trúc thư mục tóm tắt

```
src/
├── app/
│   ├── page.tsx                    # Landing
│   ├── layout.tsx                 # Root (Theme, Language)
│   ├── report/
│   │   ├── page.tsx               # Redirect → /report/mapping
│   │   ├── layout.tsx             # Sidebar nav, GlobalModalProvider
│   │   ├── mapping/
│   │   │   ├── page.tsx           # Trang Mapping (core)
│   │   │   ├── components/       # Sidebar, Toolbar, FieldRow, Modals...
│   │   │   ├── hooks/             # useFieldTemplates, useMappingApi, ...
│   │   │   ├── helpers.ts
│   │   │   └── types.ts
│   │   ├── template/page.tsx      # Quản lý template DOCX + Editor
│   │   ├── customers/
│   │   │   ├── page.tsx           # List customers
│   │   │   ├── new/page.tsx       # Tạo KH
│   │   │   └── [id]/page.tsx     # Sửa KH
│   │   └── runs/page.tsx          # Pipeline & logs, Export preview
│   └── api/                       # REST routes (customers, report/*)
├── components/                    # Theme, Language, BaseModal, Docx Editor/Preview
├── core/
│   ├── errors/app-error.ts
│   └── use-cases/                 # mapping-engine, formula, validation, grouping, AI, OCR, auto-process
├── services/                      # report, customer, ai-mapping, auto-tagging, auto-process, ocr, security, financial-analysis
└── lib/                           # config-schema, fs-store, docx-engine, pipeline-client, i18n, ...
```

---

*Báo cáo được tạo theo codebase tại thời điểm đọc; khi thêm/xóa file hoặc đổi chức năng, nên cập nhật lại tài liệu này.*
