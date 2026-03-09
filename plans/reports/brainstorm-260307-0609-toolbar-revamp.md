# Brainstorm: Field Editor Toolbar Revamp

## Problem Statement

Toolbar hien tai (`MappingVisualToolbar`) chua tap trung:
- Search + checkboxes + "Them field moi" + sidebar toggle nam chung 1 row
- Cac chuc nang quan trong (Chon KH, Chon mau, Upload, BCTC) bi an trong sidebar
- Nut "Them field moi" khong can thiet tren toolbar
- Khong co nut truc tiep cho Upload va Phan tich tai chinh

## Quyet dinh da thong nhat

| # | Quyet dinh | Chi tiet |
|---|-----------|---------|
| 1 | **Chon KH** | Move HOAN TOAN tu tab Danh sach KH. Modal moi: chon KH da ton tai HOAC tao KH moi |
| 2 | **Chon mau du lieu** | Nut rieng tren toolbar, mo picker/modal chon/tao/sua mau |
| 3 | **Upload tai lieu** | Nut rieng tren toolbar, mo file picker OCR/docx/pdf/xlsx |
| 4 | **Phan tich tai chinh** | Nut rieng, YEU CAU chon KH truoc. Toast "Xin hay chon khach hang" neu chua chon |
| 5 | **Option** | Mo sidebar voi cac tien ich con lai |
| 6 | **Search/Filter** | Giu lai, tach thanh row rieng phia duoi toolbar |
| 7 | **Them field moi** | BO LUON khoi toolbar |
| 8 | **Hover effect** | Tooltip (chuan SaaS) |
| 9 | **Layout** | Center-aligned, 3 nhom co separator |
| 10 | **Nhom logic** | [KH + Mau] | [Upload + BCTC] | [Option] |

## Thiet ke Toolbar Moi

### Layout ASCII

```
+-----------------------------------------------------------+
| Header: Trinh chinh field                                  |
| KH: Nguyen Van A | Mau: Template X        [BookOpen][Save]|
+-----------------------------------------------------------+
|                                                           |
|      [Users][FileText] | [Upload][BarChart3] | [Settings] |
|       ^KH    ^Mau        ^Upload  ^BCTC        ^Option    |
|                                                           |
+-----------------------------------------------------------+
| [Search field...]  [x Chua mapping]  [x Technical keys]   |
+-----------------------------------------------------------+
| ... Field Catalog Board ...                                |
+-----------------------------------------------------------+
| [Undo (0/5)]    [OCR: N logs]    [42/56 fields mapped]    |
+-----------------------------------------------------------+
```

### Toolbar Button Spec

Moi nut:
- Icon-only (lucide-react), 40x40px touch target
- `rounded-lg p-2.5` voi `border border-zinc-200 dark:border-white/[0.08]`
- Hover: `bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400`
- Active state (KH da chon, Mau da chon): `bg-violet-100 dark:bg-violet-500/20 text-violet-700 ring-2 ring-violet-500/30`
- Tooltip: native `title` attribute hoac custom tooltip component
- Disabled state cho BCTC khi chua chon KH: `opacity-40 cursor-not-allowed`

### 5 Nut Chi tiet

| # | Icon | Label (tooltip) | Hanh dong | Dieu kien |
|---|------|-----------------|-----------|-----------|
| 1 | `Users` | Chon khach hang | Mo CustomerPickerModal | Luon kha dung |
| 2 | `FileText` | Chon mau du lieu | Mo TemplatePickerModal | Luon kha dung |
| 3 | `Upload` | Upload tai lieu | Mo file picker (OCR/docx/pdf/xlsx) | Luon kha dung |
| 4 | `BarChart3` | Phan tich tai chinh | Mo FinancialAnalysisModal | Yeu cau chon KH |
| 5 | `Settings` | Tuy chon khac | Mo sidebar | Luon kha dung |

### Separator

```tsx
<div className="h-6 w-px bg-zinc-200 dark:bg-white/[0.08] mx-1" />
```

## Component Changes

### Files can chinh sua

| File | Thay doi |
|------|---------|
| `MappingVisualToolbar.tsx` | **REWRITE**: 5 icon buttons center-aligned + 3 nhom |
| `MappingHeader.tsx` | Giu nguyen (da clean tu phase truoc) |
| `sidebar-context-section.tsx` | Bo customer dropdown + template picker (da move ra toolbar) |
| `sidebar-tools-section.tsx` | Bo OCR upload + Financial analysis (da move ra toolbar) |
| `page.tsx` | Cap nhat props, them CustomerPickerModal, them toast logic cho BCTC |

### Files can tao moi

| File | Muc dich |
|------|---------|
| `CustomerPickerModal.tsx` | Modal chon KH co san hoac tao KH moi |
| `TemplatePickerModal.tsx` | Modal chon/tao/sua mau du lieu (extract tu sidebar-context-section) |
| `toolbar-action-button.tsx` | Shared button component cho 5 nut (DRY) |

### Sidebar sau khi don dep

Sidebar chi con:
1. **Tien ich**: Merge groups, Noi DOCX, Backup/Khoi phuc
2. **Thao tac he thong**: Import/Export CSV/XLSX
3. **Danh sach ham** (hien dang o header, co the move vao day)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Customer CRUD move khoi tab goc | Medium | Modal moi can cover day du: list, create, select |
| Toolbar responsive tren mobile | Low | Flex wrap, nut nho hon tren mobile |
| Toast cho BCTC | Low | Dung existing toast/notification system |
| Template picker complexity | Medium | Extract thanh standalone modal, giu logic tuong tu sidebar |

## Success Criteria

- [ ] 5 nut icon-only voi tooltip, center-aligned, 3 nhom co separator
- [ ] CustomerPickerModal: chon KH co san + tao KH moi
- [ ] TemplatePickerModal: chon/tao/sua mau
- [ ] Upload trigger file picker truc tiep
- [ ] BCTC disabled + toast khi chua chon KH
- [ ] Option mo sidebar (da co san)
- [ ] Search/filter tach row rieng phia duoi
- [ ] Sidebar don sach: bo customer dropdown, template picker, OCR upload, financial analysis
- [ ] Dark mode tuong thich
- [ ] Keyboard accessible (tab order, focus ring)

## Implementation Phases

1. **Phase 1**: Tao `toolbar-action-button.tsx` shared component + rewrite `MappingVisualToolbar.tsx`
2. **Phase 2**: Tao `CustomerPickerModal.tsx` (chon + tao KH moi)
3. **Phase 3**: Extract `TemplatePickerModal.tsx` tu sidebar-context-section
4. **Phase 4**: Don dep sidebar (bo cac section da move) + wire up page.tsx
5. **Phase 5**: Polish - toast, disabled states, responsive, dark mode

## Next Steps

User quyet dinh: tao plan chi tiet de implement?
