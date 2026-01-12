import type {
  Template,
  SuratKirimData,
  SuratKirimMaterial,
} from "../../src/Shared/Types/PrintTemplate";

/**
 * Surat Kirim Template
 * Optimized for A5 paper (landscape orientation)
 * Layout based on template-surat-jalan.html
 * Browser Print Settings: Paper Size = A5 Landscape, Margin = None
 */

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function generateMaterialsHTML(materials: SuratKirimMaterial[]): string {
  // Generate rows - ensure at least 3 rows minimum as per template-surat-jalan.html
  const rowCount = Math.max(materials.length, 3);
  const rows: string[] = [];

  for (let i = 0; i < rowCount; i++) {
    const material = materials[i];
    if (material) {
      rows.push(`
        <tr>
          <td>${material.no}</td>
          <td>${material.jenisMaterial}</td>
          <td>${material.jumlah}</td>
          <td>${material.keterangan || ""}</td>
        </tr>
      `);
    } else {
      // Empty row for manual fill
      rows.push(`
        <tr>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `);
    }
  }

  return rows.join("");
}

function generateSuratKirimHTML(data: SuratKirimData): string {
  const companyName = data.companyName || "CV. KIRAMANA";
  const driverName = data.driverName || "";
  const supervisorName = data.supervisorName || "";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Surat Jalan - ${companyName}</title>
  <style>
    @page {
      size: A5 landscape;
      margin: 0;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    
    .container {
      width: 100%;
      max-width: 210mm; /* Lebar A5 landscape dalam mm */
      margin: 0 auto;
      padding: 1cm;
    }
    
    .header {
      text-align: left;
      margin-bottom: 10px;
    }
    
    .header h1 {
      margin: 0;
      font-size: 18pt;
      font-weight: bold;
      text-decoration: underline;
    }
    
    .header h2 {
      margin: 0;
      font-size: 16pt;
      font-weight: bold;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    
    .info-box {
      width: 48%;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    
    th,
    td {
      border: 1px solid black;
      padding: 8px;
      text-align: center;
    }
    
    th {
      font-weight: bold;
    }
    
    .date-row {
      text-align: right;
      margin-bottom: 30px;
    }
    
    .signature-row {
      display: flex;
      justify-content: space-around;
      margin-top: 50px;
    }
    
    .signature-box {
      text-align: center;
      width: 45%;
    }
    
    .signature-line {
      border-bottom: 1px solid black;
      margin: 20px 0;
      padding: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${companyName}</h1>
      <h2>SURAT KIRIM</h2>
    </div>

    <div class="info-row">
      <div class="info-box">
        <strong>TRUCK:</strong> ${data.truckName}
      </div>
      <div class="info-box">
        <strong>TUJUAN:</strong> ${data.destination}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>NO</th>
          <th>JENIS MATERIAL</th>
          <th>JUMLAH</th>
          <th>KETERANGAN</th>
        </tr>
      </thead>
      <tbody>
        ${generateMaterialsHTML(data.materials)}
      </tbody>
    </table>

    <div class="date-row">
      <strong>TANGGAL :</strong> ${formatDate(data.date)}
    </div>

    <div class="signature-row">
      <div class="signature-box">
        <div class="signature-line">${driverName || "&nbsp;"}</div>
        <strong>SOPIR</strong>
      </div>
      <div class="signature-box">
        <div class="signature-line">${supervisorName || "&nbsp;"}</div>
        <strong>PENGAWAS</strong>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const suratKirimTemplate: Template<SuratKirimData> = {
  id: "surat-kirim",
  name: "Surat Kirim",
  description:
    "Template surat pengiriman barang untuk printer A5 landscape (Browser: Margin = None)",
  paperSize: "A5 landscape",
  generate: generateSuratKirimHTML,
};
