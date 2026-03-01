const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const xml2js = require('xml2js');

// Helper function to convert XML to JS object
async function parseXml(xmlString) {
  const parser = new xml2js.Parser({ explicitArray: false });
  return parser.parseStringPromise(xmlString);
}

// Helper function to extract text from runs
function extractTextFromRuns(element) {
  let text = '';

  if (!element) return text;

  if (typeof element === 'string') {
    return element;
  }

  if (Array.isArray(element)) {
    return element.map(extractTextFromRuns).join('');
  }

  if (element['w:t']) {
    text += element['w:t'];
  }

  if (element['w:r']) {
    const runs = Array.isArray(element['w:r']) ? element['w:r'] : [element['w:r']];
    runs.forEach(run => {
      if (run['w:t']) {
        text += run['w:t'];
      }
      if (run['w:tab']) {
        text += '\t';
      }
      if (run['w:br']) {
        text += '\n';
      }
    });
  }

  if (element['w:p']) {
    const paragraphs = Array.isArray(element['w:p']) ? element['w:p'] : [element['w:p']];
    text += paragraphs.map(extractTextFromParagraph).join('\n');
  }

  return text;
}

// Helper function to extract text from paragraph
function extractTextFromParagraph(para) {
  let text = '';

  if (!para) return text;

  // Extract from runs in paragraph
  if (para['w:r']) {
    const runs = Array.isArray(para['w:r']) ? para['w:r'] : [para['w:r']];
    runs.forEach(run => {
      if (run['w:t']) {
        const textContent = run['w:t'];
        if (Array.isArray(textContent)) {
          text += textContent.join('');
        } else if (typeof textContent === 'string') {
          text += textContent;
        } else if (textContent && textContent['_']) {
          text += textContent['_'];
        }
      }
      if (run['w:tab']) {
        text += '\t';
      }
      if (run['w:br']) {
        text += '\n';
      }
    });
  }

  // Extract from tables
  if (para['w:tbl']) {
    const tables = Array.isArray(para['w:tbl']) ? para['w:tbl'] : [para['w:tbl']];
    tables.forEach(table => {
      text += extractTextFromTable(table) + '\n';
    });
  }

  return text;
}

// Helper function to extract text from table
function extractTextFromTable(table) {
  let text = '';

  if (!table || !table['w:tr']) return text;

  const rows = Array.isArray(table['w:tr']) ? table['w:tr'] : [table['w:tr']];

  rows.forEach((row, rowIdx) => {
    if (!row['w:tc']) return;

    const cells = Array.isArray(row['w:tc']) ? row['w:tc'] : [row['w:tc']];
    const rowText = cells.map((cell, cellIdx) => {
      if (!cell['w:p']) return '';

      const paragraphs = Array.isArray(cell['w:p']) ? cell['w:p'] : [cell['w:p']];
      return paragraphs.map(extractTextFromParagraph).join(' ');
    }).join('\t');

    text += rowText + '\n';
  });

  return text;
}

// Main function to extract DOCX content
async function extractDocxContent(filePath) {
  try {
    console.log(`Reading file: ${filePath}`);
    const fileContent = fs.readFileSync(filePath);

    console.log('Loading ZIP content...');
    const zip = await JSZip.loadAsync(fileContent);

    console.log('Extracting document.xml...');
    const documentXml = await zip.file('word/document.xml').async('string');

    console.log('Parsing XML...');
    const parser = new (require('xml2js')).Parser();
    const result = await parser.parseStringPromise(documentXml);

    const document = result['w:document'];
    const body = document['w:body'];

    let fullText = '';
    let sections = [];
    let currentSection = null;

    // Process all elements in body
    if (body['w:p']) {
      const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];

      paragraphs.forEach((para, idx) => {
        const paraText = extractTextFromParagraph(para);

        // Check if this is a heading (likely a section)
        const pPr = para['w:pPr'];
        const isHeading = pPr && (
          pPr['w:pStyle'] && (
            pPr['w:pStyle']['w:val'].includes('Heading') ||
            pPr['w:pStyle']['w:val'].includes('heading')
          )
        );

        if (isHeading && paraText.trim()) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            title: paraText.trim(),
            content: [],
            paragraphs: []
          };
        } else if (paraText.trim()) {
          if (!currentSection) {
            currentSection = {
              title: 'Introduction',
              content: [],
              paragraphs: []
            };
          }
          currentSection.content.push(paraText.trim());
          currentSection.paragraphs.push(paraText);
        }

        fullText += paraText + '\n';
      });
    }

    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    // Also process tables at body level
    if (body['w:tbl']) {
      const tables = Array.isArray(body['w:tbl']) ? body['w:tbl'] : [body['w:tbl']];
      tables.forEach(table => {
        const tableText = extractTextFromTable(table);
        if (tableText.trim()) {
          fullText += tableText + '\n';
        }
      });
    }

    return {
      fullText,
      sections,
      structureAnalysis: analyzeStructure(sections, fullText)
    };
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Analyze document structure
function analyzeStructure(sections, fullText) {
  const analysis = {
    totalSections: sections.length,
    sections: sections.map(s => s.title),
    hasBalanceSheet: false,
    hasIncomeStatement: false,
    hasCashFlow: false,
    keywords: {
      balanceSheet: ['cân đối kế toán', 'balance sheet', 'bảng cân đối', 'tài sản', 'nợ', 'vốn chủ sở hữu'],
      incomeStatement: ['báo cáo tình hình hoạt động', 'income statement', 'khoản thu', 'chi phí', 'lợi nhuận', 'doanh thu'],
      cashFlow: ['lưu chuyển tiền tệ', 'cash flow', 'hoạt động kinh doanh', 'hoạt động đầu tư', 'hoạt động tài chính']
    }
  };

  const lowerText = fullText.toLowerCase();

  // Check for Balance Sheet
  analysis.hasBalanceSheet = analysis.keywords.balanceSheet.some(kw => lowerText.includes(kw));

  // Check for Income Statement
  analysis.hasIncomeStatement = analysis.keywords.incomeStatement.some(kw => lowerText.includes(kw));

  // Check for Cash Flow
  analysis.hasCashFlow = analysis.keywords.cashFlow.some(kw => lowerText.includes(kw));

  return analysis;
}

// Run extraction
const filePath = 'c:/Users/ADMIN/cong-cu-tao-bcdxcv/report_assets/Bộ hồ sơ vay vốn doanh nghiệp/Hồ sơ vay vốn/Phan tich tai chinh.docx';

extractDocxContent(filePath)
  .then(result => {
    console.log('\n=== DOCUMENT STRUCTURE ANALYSIS ===\n');

    console.log('1. SECTIONS FOUND:');
    console.log(`   Total sections: ${result.structureAnalysis.totalSections}`);
    result.structureAnalysis.sections.forEach((section, idx) => {
      console.log(`   ${idx + 1}. ${section}`);
    });

    console.log('\n2. FINANCIAL ANALYSIS SECTIONS:');
    console.log(`   - Balance Sheet (Bảng cân đối kế toán): ${result.structureAnalysis.hasBalanceSheet ? 'CÓ' : 'KHÔNG'}`);
    console.log(`   - Income Statement (Báo cáo tình hình hoạt động): ${result.structureAnalysis.hasIncomeStatement ? 'CÓ' : 'KHÔNG'}`);
    console.log(`   - Cash Flow (Lưu chuyển tiền tệ): ${result.structureAnalysis.hasCashFlow ? 'CÓ' : 'KHÔNG'}`);

    console.log('\n3. FULL TEXT CONTENT:');
    console.log('==========================================');
    console.log(result.fullText);
    console.log('==========================================');
  })
  .catch(error => {
    console.error('Failed to extract DOCX:', error);
    process.exit(1);
  });
