const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const zip = new PizZip();

zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>[custom.A.B]</w:t></w:r></w:p></w:body></w:document>');
zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');

try {
    let z1 = new PizZip(zip.generate({ type: "nodebuffer" }));
    const doc1 = new Docxtemplater(z1, { paragraphLoop: true, linebreaks: true, delimiters: { start: '[', end: ']' } });
    doc1.render({ custom: { A: { B: 1 } } });
    console.log('Nested render:', doc1.getFullText());
} catch (e) { console.log('Nested render ERROR', e.message); }

try {
    let z2 = new PizZip(zip.generate({ type: "nodebuffer" }));
    const doc2 = new Docxtemplater(z2, { paragraphLoop: true, linebreaks: true, delimiters: { start: '[', end: ']' } });
    doc2.render({ 'custom.A.B': 2 });
    console.log('Flat render:', doc2.getFullText());
} catch (e) { console.log('Flat render ERROR', e.message); }
