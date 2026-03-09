# DocXTemplater Placeholder Extraction Research

## Summary

docxtemplater provides the **InspectModule** API for extracting template placeholders from DOCX buffers without rendering. This is the primary recommended approach.

## Key Findings

### 1. InspectModule - Primary Approach

**What:** Built-in module that parses DOCX templates and extracts all tags during compilation phase.

**Basic Implementation:**
```javascript
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const InspectModule = require('docxtemplater/js/inspect-module.js');

const buffer = /* your DOCX buffer */;
const zip = new PizZip(buffer);
const iModule = InspectModule();

const doc = new Docxtemplater(zip, {
  modules: [iModule],
  linebreaks: true,
  paragraphLoop: true,
});

// Compile/parse without rendering
doc.render({});

// Extract tags
const tags = iModule.getAllTags();
console.log(tags); // Array of tag names
```

**Key Methods:**
- `getAllTags()` - Returns flat array of all placeholder names
- `getStructuredTags()` - Returns tags with module information (which module handles each tag)

**Critical:** You must call `doc.render({})` even with empty data to trigger compilation and parsing. The InspectModule captures tag info during compilation phase.

### 2. Custom Delimiters Configuration

**For square brackets `[ ]`:**
```javascript
new Docxtemplater(zip, {
  delimiters: { start: '[', end: ']' },
  modules: [iModule],
});
```

**Configuration Constraints:**
- Custom delimiters cannot contain whitespace
- Custom delimiters cannot contain `=` (reserved for Set Delimiter tags)
- Example valid patterns: `[[`, `]]`, `[`, `]`, `<<`, `>>`

**Alternative:** Set delimiters inside template using "Set Delimiter tags" syntax (starts with `=`), but this is template-level not global.

### 3. Parsing Order & Tag Types

docxtemplater recognizes three tag types:
- **Simple:** `{name}` - direct variable substitution
- **Loops:** `{#items}{name}{/items}` - block iteration
- **Conditionals:** `{?condition}content{/condition}` - conditional rendering

**getAllTags()** extracts all tags regardless of type. For structured info, use `getStructuredTags()`.

### 4. Error Handling for Malformed DOCX

**Expected behavior:**
- Throws error during `new Docxtemplater()` if DOCX structure is corrupted
- Throws error during `doc.render()` if tags contain syntax errors
- Invalid placeholders may fail silently or throw depending on parser mode

**Recommended pattern:**
```javascript
try {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, { modules: [iModule] });
  doc.render({});
  return iModule.getAllTags();
} catch (error) {
  if (error.message.includes('Unexpected character')) {
    // Malformed DOCX or invalid tag syntax
    console.error('Template parse error:', error.message);
  }
  throw error;
}
```

### 5. Alternative: docx-templates Library

**Alternative package:** `docx-templates` provides `listCommands()` for extraction without full docxtemplater overhead.

```javascript
import { listCommands } from 'docx-templates';
const commands = await listCommands(buffer, ['{', '}']);
// Returns array of command objects with metadata
```

**Pros:** Lighter weight, async-friendly
**Cons:** Separate library, different API

### 6. Expression Parser for Complex Tags

docxtemplater supports angular-like expressions in tags: `{user.profile.name | uppercase}`

**To extract identifiers from complex expressions:**
```javascript
const expressionParser = require("docxtemplater/expressions.js");
const identifiers = expressionParser("user.profile.name | uppercase").getIdentifiers();
// Returns: ['user']
```

Useful for mapping complex tags to root variable names.

## Recommended Implementation Strategy

**For scanning uploaded DOCX templates to extract `[field_key]` patterns:**

1. **Use InspectModule** with custom delimiters `[` and `]`
2. **Call render({})** with empty data to trigger compilation
3. **Extract via getAllTags()** to get flat list
4. **Wrap in try-catch** for malformed DOCX handling
5. **Optional:** Use `getStructuredTags()` if you need module-level metadata

**Code template:**
```typescript
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

async function extractPlaceholders(buffer: Buffer): Promise<string[]> {
  try {
    const zip = new PizZip(buffer);
    const InspectModule = require('docxtemplater/js/inspect-module.js');
    const inspector = InspectModule();

    const doc = new Docxtemplater(zip, {
      modules: [inspector],
      delimiters: { start: '[', end: ']' },
      linebreaks: true,
      paragraphLoop: true,
    });

    doc.render({});
    return inspector.getAllTags();
  } catch (error) {
    throw new Error(`Failed to extract placeholders: ${error.message}`);
  }
}
```

## Unresolved Questions

1. **Performance at scale** - No documentation on performance characteristics for very large DOCX files (100+ pages with 1000+ placeholders). Needs benchmarking.

2. **Nested structure handling** - How does InspectModule handle deeply nested loops/conditionals? Does `getAllTags()` flatten all tags or maintain hierarchy?

3. **Custom module interaction** - If custom modules add their own tag syntax, will InspectModule detect them? Need to test with real custom modules.

4. **postCompile hook alternative** - The `postCompile` hook was mentioned as alternative but requires full render context. Unclear if viable for placeholder-only extraction.

## Sources

- [docxtemplater API Documentation](https://docxtemplater.com/docs/api/)
- [docxtemplater Configuration](https://docxtemplater.com/docs/configuration/)
- [docxtemplater FAQ](https://docxtemplater.com/faq/)
- [InspectModule Implementation (GitHub)](https://github.com/open-xml-templating/docxtemplater/blob/master/es6/inspect-module.js)
- [Issue: Get list of tags used in document (GitHub Discussion)](https://github.com/open-xml-templating/docxtemplater/issues/258)
- [docx-templates - Alternative Library](https://www.npmjs.com/package/docx-templates)
- [easy-template-x - Alternative Library](https://github.com/alonrbar/easy-template-x)
