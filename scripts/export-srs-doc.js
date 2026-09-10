const fs = require('fs');
const path = require('path');

// Đọc nội dung Markdown từ file SRS
const mdPath = path.join(__dirname, '..', 'docs', 'SRS_Seafood_Warehouse_Specification.md');
let mdContent = fs.readFileSync(mdPath, 'utf8');

// Chuyển đổi Markdown sang HTML chuẩn Word với Style chuẩn tài liệu công nghiệp
function mdToWordHtml(md) {
  // Loại bỏ hoàn toàn các ký tự LaTeX nếu còn sót
  let cleanedMd = md
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\le/g, '<=')
    .replace(/\\ge/g, '>=')
    .replace(/\\rightarrow/g, '->')
    .replace(/\$([^$]+)\$/g, '$1');

  let html = cleanedMd
    .replace(/^### (.*$)/gim, '<h3 style="color:#0369a1; font-family:Arial, sans-serif; font-size:12pt; margin-top:18px; margin-bottom:8px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color:#0284c7; font-family:Arial, sans-serif; font-size:14pt; border-bottom:2px solid #0284c7; padding-bottom:4px; margin-top:26px; margin-bottom:12px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color:#0f172a; font-family:Arial, sans-serif; font-size:20pt; text-align:center; margin-bottom:10px;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background:#f1f5f9; padding:2px 5px; border-radius:4px; font-family:Consolas, monospace; font-size:10pt; color:#0369a1;">$1</code>')
    .replace(/```mermaid[\s\S]*?```/gim, '<div style="background:#f8fafc; border:1px solid #cbd5e1; border-left:4px solid #0284c7; padding:12px; margin:14px 0; font-family:Arial, sans-serif; font-size:10pt; color:#334155;"><strong>[Sơ Đồ Quy Trình]:</strong> Chi tiết các bước thực hiện luồng nghiệp vụ tương tác giữa Đối tác, Thủ kho, Máy quét Barcode/PDA và ABP WMS Database.</div>')
    .replace(/```[\s\S]*?```/gim, '')
    .replace(/^\s*-\s+(.*$)/gim, '<li style="margin-bottom:5px;">$1</li>')
    .replace(/(<\/li>\n<li>)/gim, '</li><li>');

  // Convert Tables
  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  let finalLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse; width:100%; border:1px solid #cbd5e1; margin:16px 0; font-size:10pt;">';
        const headers = line.split('|').filter(c => c.trim() !== '');
        tableHtml += '<tr style="background:#0284c7; color:#ffffff; font-weight:bold;">' + headers.map(h => `<th style="border:1px solid #cbd5e1; padding:8px; text-align:left; font-family:Arial, sans-serif;">${h.trim()}</th>`).join('') + '</tr>';
        // Bỏ qua dòng format |---|---|
        if (i + 1 < lines.length && lines[i + 1].includes('---')) {
          i++;
        }
      } else {
        const cells = line.split('|').filter(c => c !== '');
        tableHtml += '<tr style="border-bottom:1px solid #e2e8f0;">' + cells.map(c => `<td style="border:1px solid #cbd5e1; padding:6px; font-family:Arial, sans-serif;">${c.trim()}</td>`).join('') + '</tr>';
      }
    } else {
      if (inTable) {
        tableHtml += '</table>';
        finalLines.push(tableHtml);
        inTable = false;
      }
      finalLines.push(line);
    }
  }

  if (inTable) {
    tableHtml += '</table>';
    finalLines.push(tableHtml);
  }

  html = finalLines.join('\n');

  // Wrap inside full HTML document suitable for MS Word
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" 
        xmlns:w="urn:schemas-microsoft-com:office:word" 
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8">
    <title>Tài Liệu Đặc Tả Yêu Cầu Phần Mềm (SRS) - Seafood WMS</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #1e293b;
        margin: 2.5cm 2cm 2.5cm 2.5cm;
      }
      h1 { font-family: 'Arial', sans-serif; font-size: 20pt; color: #0369a1; text-transform: uppercase; }
      h2 { font-family: 'Arial', sans-serif; font-size: 14pt; color: #0284c7; }
      h3 { font-family: 'Arial', sans-serif; font-size: 12pt; color: #0f172a; }
      p { margin-bottom: 8px; text-align: justify; }
      table { border-collapse: collapse; width: 100%; margin: 12px 0; }
      th { background-color: #0284c7; color: white; border: 1px solid #94a3b8; padding: 7px; font-family: 'Arial', sans-serif; font-size: 10pt; }
      td { border: 1px solid #cbd5e1; padding: 6px; font-size: 10pt; font-family: 'Arial', sans-serif; }
      tr:nth-child(even) { background-color: #f8fafc; }
      li { margin-bottom: 4px; }
      .header-cover {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #0284c7;
      }
    </style>
  </head>
  <body>
    <div class="header-cover">
      <h1 style="margin:0;">HỆ THỐNG QUẢN LÝ KHO THỦY HẢI SẢN (SWMS)</h1>
      <h3 style="color:#64748b; margin-top:6px;">TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SOFTWARE REQUIREMENTS SPECIFICATION - SRS)</h3>
      <p style="text-align:center; font-style:italic; color:#94a3b8;">Phiên bản 2.0.0 &bull; Ngày phát hành: 23/08/2026</p>
    </div>
    ${html}
  </body>
  </html>
  `;
}

const docHtml = mdToWordHtml(mdContent);

// Xuất file doc chuẩn (hỗ trợ ghi đè an toàn kể cả khi đang mở xem)
const primaryPath = path.join(__dirname, '..', 'docs', 'SRS_Seafood_Warehouse_Specification.doc');
const cleanPath = path.join(__dirname, '..', 'docs', 'SRS_Seafood_Warehouse_Specification_Clean.doc');

try {
  fs.writeFileSync(primaryPath, docHtml, 'utf8');
  console.log('✅ Đã cập nhật file Word DOC chính tại:', primaryPath);
} catch (err) {
  console.warn('⚠️ File gốc đang được mở bởi ứng dụng khác. Đang lưu sang file bản sao Clean...');
}

fs.writeFileSync(cleanPath, docHtml, 'utf8');
console.log('✅ Đã xuất bản file Word DOC sạch hoàn chỉnh tại:', cleanPath);
