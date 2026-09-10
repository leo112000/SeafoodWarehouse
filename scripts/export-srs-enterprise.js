const fs = require('fs');
const path = require('path');

// Đọc file SRS Enterprise Markdown
const mdPath = path.join(__dirname, '..', 'docs', 'SRS_Seafood_Warehouse_Enterprise.md');
let mdContent = fs.readFileSync(mdPath, 'utf8');

function convertMarkdownToWordHtml(md) {
  // Loại bỏ hoàn toàn các ký tự LaTeX
  let cleaned = md
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\le/g, '<=')
    .replace(/\\ge/g, '>=')
    .replace(/\\rightarrow/g, '->')
    .replace(/\$([^$]+)\$/g, '$1');

  let html = cleaned
    .replace(/^#### (.*$)/gim, '<h4 style="color:#0369a1; font-family:Arial, sans-serif; font-size:11pt; margin-top:14px; margin-bottom:6px;">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 style="color:#0284c7; font-family:Arial, sans-serif; font-size:13pt; margin-top:20px; margin-bottom:8px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color:#0f172a; font-family:Arial, sans-serif; font-size:15pt; border-bottom:2px solid #0284c7; padding-bottom:5px; margin-top:28px; margin-bottom:12px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color:#0284c7; font-family:Arial, sans-serif; font-size:22pt; text-align:center; margin-bottom:6px;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background:#f1f5f9; padding:2px 5px; border-radius:4px; font-family:Consolas, monospace; font-size:10pt; color:#0369a1;">$1</code>')
    .replace(/```mermaid[\s\S]*?```/gim, '<div style="background:#f8fafc; border:1px solid #cbd5e1; border-left:4px solid #0284c7; padding:12px; margin:14px 0; font-family:Arial, sans-serif; font-size:10pt; color:#334155;"><strong>[Sơ Đồ Kiến Trúc / ERD]:</strong> Chi tiết mô hình thực thể và luồng tương tác chuẩn đã được thiết kế đồng bộ trong mã nguồn Backend ASP.NET Core & Database SQL Server.</div>')
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

  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" 
        xmlns:w="urn:schemas-microsoft-com:office:word" 
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8">
    <title>Software Requirements Specification (SRS) - Seafood WMS</title>
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
      table { border-collapse: collapse; width: 100%; margin: 14px 0; }
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
      <h1 style="margin:0;">HỆ THỐNG QUẢN LÝ KHO HẢI SẢN (SEAFOOD WMS)</h1>
      <h3 style="color:#0284c7; margin-top:6px;">SOFTWARE REQUIREMENTS SPECIFICATION (SRS) - ENTERPRISE EDITION</h3>
      <p style="text-align:center; font-style:italic; color:#64748b; margin-top:4px;">
        Senior Business Analyst & Solution Architect &bull; Phiên bản 3.0.0 &bull; 23/08/2026
      </p>
    </div>
    ${html}
  </body>
  </html>
  `;
}

const docContent = convertMarkdownToWordHtml(mdContent);
const targetPath = path.join(__dirname, '..', 'docs', 'SRS_Seafood_Warehouse_Enterprise.doc');

fs.writeFileSync(targetPath, docContent, 'utf8');
console.log('✅ Đã xuất bản thành công tài liệu SRS Enterprise sang file Word DOC tại:', targetPath);
