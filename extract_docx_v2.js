const fs = require('fs');
const JSZip = require('jszip');
const xml2js = require('xml2js');

// Recursive function to extract all text from any element
function extractTextRecursive(element, level = 0) {
  let text = '';

  if (!element) return text;

  // If it's a string, return it
  if (typeof element === 'string') {
    return element;
  }

  // If it's an array, process each item
  if (Array.isArray(element)) {
    return element.map(e => extractTextRecursive(e, level)).join('');
  }

  // If it's an object
  if (typeof element === 'object') {
    // Handle text nodes
    if (element['w:t']) {
      const textContent = element['w:t'];
      if (Array.isArray(textContent)) {
        text += textContent[0];
      } else {
        text += textContent;
      }
    }

    // Handle runs
    if (element['w:r']) {
      const runs = Array.isArray(element['w:r']) ? element['w:r'] : [element['w:r']];
      runs.forEach(run => {
        text += extractTextRecursive(run, level + 1);
      });
    }

    // Handle paragraphs
    if (element['w:p']) {
      const paras = Array.isArray(element['w:p']) ? element['w:p'] : [element['w:p']];
      paras.forEach((para, idx) => {
        text += extractTextRecursive(para, level + 1);
        if (idx < paras.length - 1) text += '\n';
      });
    }

    // Handle tabs
    if (element['w:tab']) {
      text += '\t';
    }

    // Handle breaks
    if (element['w:br']) {
      text += '\n';
    }

    // Handle bookmarks
    if (element['w:bookmarkStart'] || element['w:bookmarkEnd']) {
      // Skip bookmarks
    }

    // Handle proofErr
    if (element['w:proofErr']) {
      // Skip
    }

    // Process all other properties that might contain text
    for (const key in element) {
      if (key.startsWith('w:') && !['w:t', 'w:r', 'w:p', 'w:tab', 'w:br', 'w:pPr', 'w:rPr', 'w:tbl', 'w:bookmarkStart', 'w:bookmarkEnd', 'w:proofErr'].includes(key)) {
        text += extractTextRecursive(element[key], level + 1);
      }
    }

    // Handle tables
    if (element['w:tbl']) {
      const tables = Array.isArray(element['w:tbl']) ? element['w:tbl'] : [element['w:tbl']];
      tables.forEach(table => {
        text += extractTableText(table) + '\n';
      });
    }
  }

  return text;
}

// Extract text from table
function extractTableText(table) {
  let text = '';

  if (!table || !table['w:tr']) return text;

  const rows = Array.isArray(table['w:tr']) ? table['w:tr'] : [table['w:tr']];

  rows.forEach((row, rowIdx) => {
    if (!row['w:tc']) return;

    const cells = Array.isArray(row['w:tc']) ? row['w:tc'] : [row['w:tc']];
    const rowTexts = cells.map(cell => {
      return extractTextRecursive(cell);
    });

    text += rowTexts.join('\t') + '\n';
  });

  return text;
}

// Main function
async function extractDocxContent(filePath) {
  try {
    console.log(`Reading file: ${filePath}\n`);
    const fileContent = fs.readFileSync(filePath);

    console.log('Loading ZIP content...');
    const zip = await JSZip.loadAsync(fileContent);

    console.log('Extracting document.xml...');
    const documentXml = await zip.file('word/document.xml').async('string');

    console.log('Parsing XML...\n');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(documentXml);

    const document = result['w:document'];
    const body = document['w:body'];

    let fullText = '';

    // Process body element
    fullText = extractTextRecursive(body);

    // Clean up the text
    fullText = fullText
      .replace(/\n\n+/g, '\n')  // Remove multiple consecutive newlines
      .trim();

    return fullText;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Run extraction
const filePath = 'c:/Users/ADMIN/cong-cu-tao-bcdxcv/report_assets/Bộ hồ sơ vay vốn doanh nghiệp/Hồ sơ vay vốn/Phan tich tai chinh.docx';

extractDocxContent(filePath)
  .then(fullText => {
    console.log('=== EXTRACTED DOCUMENT CONTENT ===\n');
    console.log(fullText);
    console.log('\n=== END OF CONTENT ===\n');

    // Analysis
    const lowerText = fullText.toLowerCase();

    console.log('\n=== STRUCTURE ANALYSIS ===\n');

    console.log('1. Document appears to contain:');

    if (lowerText.includes('cân đối') || lowerText.includes('balance sheet') || lowerText.includes('tài sản') || lowerText.includes('nợ phải trả')) {
      console.log('   ✓ Balance Sheet (Bảng cân đối kế toán)');
    } else {
      console.log('   ✗ Balance Sheet (Bảng cân đối kế toán)');
    }

    if (lowerText.includes('báo cáo tình hình hoạt động') || lowerText.includes('income statement') || lowerText.includes('doanh thu') || lowerText.includes('chi phí')) {
      console.log('   ✓ Income Statement (Báo cáo tình hình hoạt động kinh doanh)');
    } else {
      console.log('   ✗ Income Statement (Báo cáo tình hình hoạt động kinh doanh)');
    }

    if (lowerText.includes('lưu chuyển tiền tệ') || lowerText.includes('cash flow') || lowerText.includes('hoạt động kinh doanh') || lowerText.includes('hoạt động đầu tư')) {
      console.log('   ✓ Cash Flow Statement (Lưu chuyển tiền tệ)');
    } else {
      console.log('   ✗ Cash Flow Statement (Lưu chuyển tiền tệ)');
    }

    // Find major sections
    const lines = fullText.split('\n');
    const sections = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && trimmed.length < 150 && (
        trimmed[0] === trimmed[0].toUpperCase() ||
        !trimmed.includes('\t')
      );
    });

    console.log('\n2. Main sections/headings detected:');
    sections.slice(0, 20).forEach((section, idx) => {
      console.log(`   ${idx + 1}. ${section.trim().substring(0, 100)}`);
    });
  })
  .catch(error => {
    console.error('Failed to extract DOCX:', error);
    process.exit(1);
  });
