# BigTech SaaS Field Editor/Schema Builder UI Patterns
## Research Report | 2026-03-07

### 1. Consistent Layout Pattern: Right Sidebar Inspector
**All products use RIGHT SIDEBAR for properties:**
- Figma: Design + Prototype tabs (properties panel right side)
- Retool: Inspector panel on right with collapsible sections
- Notion: Edit properties modal or inline editors
- Airtable: Properties panel for field configuration

**Implication:** Right sidebar = industry standard for secondary UI. Primary canvas stays focused.

---

### 2. Progressive Disclosure Architecture
**Problem:** Too many fields overwhelm users.
**Solution:** Tiered disclosure:
- **Basic layer:** Most-used properties visible immediately
- **Advanced layer:** Toggle/expand "Show advanced" or accordion sections
- **Retool specific:** Advanced toggles per section + list editor patterns

**Actionable:** Group properties into 3-5 collapsible sections (Basic, Layout, Advanced, Validation, etc).

---

### 3. Information Hierarchy: Property Grouping
**How leaders organize:**
- **Figma:** By property type (Layout → Color → Typography → Component)
- **Retool:** By frequency (Basic-Advanced) + effect-based (what they change)
- **Airtable:** By layout aspect (Data, Filters, Appearance, Actions)
- **Salesforce Schema:** Left panel tabs (Elements vs Objects)

**Actionable:** Group by effect/outcome, not by technical category.

---

### 4. Action Zone Strategy
**Primary actions (always visible):**
- Delete, Edit name, Duplicate
- Placed in consistent location (icon menu ⋮ or top-right)

**Secondary actions (contextual):**
- Advanced settings, relationships, dependent actions
- Behind "more" menu or expandable sections

**Keyboard shortcuts available** (Linear uses [ for collapse, command menu for discoverability)

---

### 5. Command Bar Pattern (Power Users)
**Linear + Salesforce precedent:**
- Command palette (Cmd+K) consolidates all actions
- Search-driven action discovery
- Keyboard-first workflow
- Reorders by frequency (learning pattern)

**Actionable:** Add search-able command bar for:
- Field create/delete
- Bulk operations
- View toggles

---

### 6. Inline Editing with Type-Specific Editors
**Notion gold standard:**
- Click cell → type-specific editor opens
- Select property → multi-select tag editor with color assignment
- No context switching (stays in database view)

**Benefit:** Reduces modal friction for quick edits.

---

### 7. Toolbar vs Sidebar Split
**Toolbar (top):**
- Layout controls (arrange, auto-layout)
- View filters/toggles
- Zoom/search

**Sidebar (right):**
- Property details
- Settings per selected item
- Advanced options

**Canvas (center):**
- Live preview/edit zone

---

### 8. Keyboard-First Workflows
**Patterns observed:**
- Linear: `[` to collapse sidebar, Cmd+K for command menu
- Figma: Property labels toggleable (opacity, position shown as labels on canvas)
- Retool: Tab navigation through property sections

**Actionable:** Design with keyboard navigation first:
- Tab through sections
- Spacebar to toggle expansions
- Arrow keys in lists
- Cmd+S/Cmd+Z for save/undo

---

### 9. Contextual Hover States
**All use hover-reveal actions:**
- Notion: ⋮ menu appears on hover over property row
- Retool: Collapse/expand arrows in headers
- Figma: Section headers collapse on click

**Implication:** Reduce visual noise with smart hover states.

---

### 10. Consistent Action Placement (Principle)
**Where actions go:**
- **Column header:** Sort, filter, hide, type change (Notion model)
- **Row/Item context:** Edit, delete, duplicate (⋮ menu)
- **Top toolbar:** Bulk actions, layout modes
- **Bottom sticky bar:** Undo/revert after destructive action

---

## Unresolved Questions
- Does your product need Salesforce-style visual schema relationship mapping or text-based editors suffice?
- What's your target: spreadsheet-like (Airtable) vs builder-like (Retool) vs database-like (Notion)?
