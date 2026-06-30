import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const generateOrdersPDF = async (
  orders,
  company = null,
  filterLabel = 'All Orders'
) => {
  const today = new Date();

  const dateStr = today.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const companyName =
    company?.company_name ||
    'Flortek Industries Pvt. Ltd.';

  const companyGST =
    company?.gst_number || '';

  const companyAddress = [
    company?.address,
    company?.city,
    company?.state,
    company?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const companyMobile =
    company?.mobile || '';

  const companyEmail =
    company?.email || '';

  const logoUrl =
    company?.company_logo || '';

  const orderRows = orders
    .map(
      (order) => `
      <tr>
        <td>${order.order_number || '#' + order.id}</td>
        <td>${order.product_name || '-'}</td>
        <td>${order.customer_name || '-'}</td>
        <td>${order.customer_mobile || '-'}</td>
        <td>${order.quantity || '-'}</td>
        <td>${order.status || '-'}</td>
        <td>${order.lr_number || '-'}</td>
        <td>
          ${
            order.created_at
              ? new Date(
                  order.created_at
                ).toLocaleDateString('en-IN')
              : '-'
          }
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
body{
  font-family: Arial, sans-serif;
  padding:20px;
  color:#333;
}

.header{
  background:#1A237E;
  color:white;
  padding:20px;
  border-radius:10px;
  margin-bottom:20px;
}

.logo{
  width:70px;
  height:70px;
  object-fit:contain;
}

.company{
  margin-top:10px;
}

.reportTitle{
  font-size:22px;
  font-weight:bold;
  margin-top:10px;
}

.summary{
  margin-bottom:20px;
  padding:15px;
  background:#F5F5F5;
  border-radius:10px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th{
  background:#1A237E;
  color:white;
  padding:10px;
  text-align:left;
}

td{
  border:1px solid #ddd;
  padding:8px;
}

tr:nth-child(even){
  background:#f9f9f9;
}

.footer{
  margin-top:20px;
  text-align:center;
  color:#666;
  font-size:12px;
}
</style>
</head>

<body>

<div class="header">

  ${
    logoUrl
      ? `<img src="${logoUrl}" class="logo" />`
      : ''
  }

  <div class="company">
    <h2>${companyName}</h2>

    ${
      companyGST
        ? `<div>GST: ${companyGST}</div>`
        : ''
    }

    ${
      companyAddress
        ? `<div>${companyAddress}</div>`
        : ''
    }

    ${
      companyMobile
        ? `<div>Mobile: ${companyMobile}</div>`
        : ''
    }

    ${
      companyEmail
        ? `<div>Email: ${companyEmail}</div>`
        : ''
    }
  </div>

  <div class="reportTitle">
    Orders Report
  </div>

  <div>
    ${filterLabel}
  </div>

  <div>
    Generated: ${dateStr}
  </div>

</div>

<div class="summary">
  <strong>Total Orders:</strong>
  ${orders.length}
</div>

<table>

<thead>
<tr>
<th>Order No</th>
<th>Product</th>
<th>Customer</th>
<th>Mobile</th>
<th>Qty</th>
<th>Status</th>
<th>LR Number</th>
<th>Date</th>
</tr>
</thead>

<tbody>
${
  orderRows ||
  `
<tr>
<td colspan="8">
No Orders Found
</td>
</tr>
`
}
</tbody>

</table>

<div class="footer">
${companyName} - Flortek Report
</div>

</body>
</html>
`;

  if (Platform.OS === 'web') {
    console.log('PDF HTML String Generated');
    return html;
  }

  const { uri } =
    await Print.printToFileAsync({
      html,
      base64: false,
    });

  console.log(
    'PDF Generated:',
    uri
  );

  return uri;
};

export const sharePDF = async (fileUri, filename) => {
  if (Platform.OS === 'web') {
    try {
      const html2pdf = require('html2pdf.js');
      const container = document.createElement('div');
      container.innerHTML = fileUri;
      document.body.appendChild(container);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().from(container).set(opt).output('blob');
      document.body.removeChild(container);

      if (typeof navigator !== 'undefined' && navigator.share) {
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: `Order Details PDF: ${filename}`
          });
          return;
        }
      }
      
      // Fallback to direct A4 PDF download
      await downloadPDF(fileUri, filename);
    } catch (e) {
      console.warn('[pdfService] Web share failed, falling back to download:', e);
      await downloadPDF(fileUri, filename);
    }
    return;
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }

  // Copy file to a path with a descriptive name for professional sharing
  const shareUri = `${FileSystem.cacheDirectory}${filename}`;
  try {
    const fileInfo = await FileSystem.getInfoAsync(shareUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(shareUri, { idempotent: true });
    }
    await FileSystem.copyAsync({
      from: fileUri,
      to: shareUri
    });
  } catch (copyErr) {
    console.warn('[pdfService] Failed to copy for sharing, using original uri:', copyErr);
  }

  await Sharing.shareAsync(shareUri || fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share Order PDF: ${filename}`,
    UTI: 'com.adobe.pdf',
  });
};

export const downloadPDF = async (fileUri, filename) => {
  if (Platform.OS === 'web') {
    try {
      console.log('[PDF Download] Generating A4 PDF dynamically...');
      const html2pdf = require('html2pdf.js');
      
      const container = document.createElement('div');
      container.innerHTML = fileUri;
      document.body.appendChild(container);

      const opt = {
        margin: [10, 10, 10, 10], // 10mm margins
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().from(container).set(opt).save();
      document.body.removeChild(container);
      return fileUri;
    } catch (err) {
      console.error('[pdfService] html2pdf Web download error:', err);
      // Fallback: direct window writing popup print
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(fileUri);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
      } catch (printErr) {
        console.error('[pdfService] Web print fallback failed:', printErr);
      }
      return fileUri;
    }
  }

  try {
    const newUri = `${FileSystem.cacheDirectory}${filename}`;
    console.log(`[PDF Download] Copying to cache directory: ${newUri}`);
    
    const fileInfo = await FileSystem.getInfoAsync(newUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(newUri, { idempotent: true });
    }
    
    await FileSystem.copyAsync({
      from: fileUri,
      to: newUri
    });
    
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable) {
      console.log('[PDF Download] Opening sharing dialog...');
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Save PDF: ${filename}`,
        UTI: 'com.adobe.pdf',
      });
      return newUri;
    } else {
      throw new Error('Sharing is not available on this device.');
    }
  } catch (error) {
    console.error('[pdfService] Error in downloadPDF:', error);
    throw new Error(`Failed to save/download PDF: ${error.message}`);
  }
};

export const savePDFToCustomFolder = async (fileUri, filename) => {
  if (Platform.OS === 'web') {
    return downloadPDF(fileUri, filename);
  }
  try {
    if (Platform.OS === 'android') {
      console.log('[PDF SAF] Android SAF requestDirectoryPermissionsAsync...');
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      
      if (!permissions.granted) {
        throw new Error('Directory permission not granted by user.');
      }
      
      const mimeType = 'application/pdf';
      console.log(`[PDF SAF] Creating file: ${filename}`);
      const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        filename,
        mimeType
      );
      
      if (!newUri) {
        throw new Error('Failed to create file in the selected directory.');
      }
      
      console.log(`[PDF SAF] Reading base64 content from: ${fileUri}`);
      const pdfBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`[PDF SAF] Writing base64 content to: ${newUri}`);
      await FileSystem.writeAsStringAsync(newUri, pdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('[PDF SAF] Android SAF save successful.');
      return newUri;
    } else {
      throw new Error('Custom folder saving is only supported on Android.');
    }
  } catch (error) {
    console.error('[pdfService] Error in savePDFToCustomFolder:', error);
    throw new Error(`Failed to save PDF to folder: ${error.message}`);
  }
};

export const generateSingleOrderPDF = async (order, customerProfile, product) => {
  const orderNumber = order?.order_number || `ORD-${order?.id}`;
  const orderDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString('en-GB')
    : '-';
  
  const orderStatus = order?.status || 'N/A';

  // Customer contact number from order field
  const customerMobile = order?.customer_mobile || customerProfile?.mobile || 'N/A';

  // Prefer customerProfile fields for company, city and state.
  // Only fall back to parsing delivery_address if profile fields are missing.
  let parsedCompany = '';
  let parsedCity = '';
  let parsedState = '';
  if (order?.delivery_address) {
    const parts = order.delivery_address.split(',').map(p => p.trim());
    if (parts.length >= 5) {
      parsedCompany = parts[0];
      parsedCity    = parts[parts.length - 3];
      parsedState   = parts[parts.length - 2];
    } else if (parts.length === 4) {
      parsedCity  = parts[1];
      parsedState = parts[2];
    }
  }

  const customerCompany = (customerProfile?.company_name?.trim()) || parsedCompany || 'N/A';
  const city  = (customerProfile?.city?.trim())  || parsedCity  || 'N/A';
  const state = (customerProfile?.state?.trim()) || parsedState || 'N/A';

  const category = product?.category || 'N/A';
  const subCategory = product?.sub_category || 'N/A';
  const size = product?.size || 'N/A';
  const loadCapacity = product?.weight ? `${product.weight} ${product.unit || 'KG'}`.trim() : 'N/A';
  const color = product?.color || 'N/A';
  const quantity = order?.quantity || 0;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page {
    size: A4 portrait;
    margin: 15mm;
  }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #333333;
    line-height: 1.6;
    margin: 0;
    padding: 0;
  }
  .header-container {
    text-align: center;
    border-bottom: 2px solid #1A237E;
    padding-bottom: 15px;
    margin-bottom: 25px;
  }
  .company-header {
    font-size: 24px;
    font-weight: bold;
    color: #1A237E;
    margin: 0;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .document-type-header {
    font-size: 14px;
    font-weight: bold;
    color: #555555;
    margin: 6px 0 0 0;
    letter-spacing: 4px;
    text-transform: uppercase;
  }
  .order-meta-section {
    margin-bottom: 20px;
    border-bottom: 1px dashed #B0BEC5;
    padding-bottom: 12px;
  }
  .order-number-title {
    font-size: 18px;
    font-weight: 800;
    color: #1A237E;
    margin: 0 0 8px 0;
  }
  .order-meta-grid {
    display: flex;
    flex-wrap: wrap;
  }
  .meta-col {
    flex: 1;
    min-width: 50%;
    margin-bottom: 6px;
  }
  .meta-label {
    font-weight: bold;
    font-size: 12px;
    color: #555555;
    display: inline-block;
    width: 120px;
  }
  .meta-value {
    font-size: 12px;
    color: #111111;
    font-weight: 500;
  }
  .section-container {
    margin-bottom: 25px;
  }
  .section-header-title {
    font-size: 12px;
    font-weight: bold;
    color: #ffffff;
    background-color: #1A237E;
    padding: 6px 10px;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-radius: 4px;
  }
  .details-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }
  .details-table th {
    background-color: #F5F7FA;
    border: 1px solid #CFD8DC;
    color: #37474F;
    font-weight: bold;
    padding: 10px;
    font-size: 11px;
    text-transform: uppercase;
    text-align: left;
  }
  .details-table td {
    border: 1px solid #CFD8DC;
    padding: 10px;
    font-size: 12px;
    color: #263238;
  }
  .footer-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    border-top: 1px solid #ECEFF1;
    padding-top: 8px;
    font-size: 10px;
    color: #90A4AE;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>

<div class="header-container">
  <h1 class="company-header">Flortek Industries Pvt. Ltd.</h1>
  <div class="document-type-header">ORDER SHEET</div>
</div>

<div class="order-meta-section">
  <h2 class="order-number-title">Order Number: ${orderNumber}</h2>
  <div class="order-meta-grid">
    <div class="meta-col">
      <span class="meta-label">Date:</span>
      <span class="meta-value">${orderDate}</span>
    </div>
    <div class="meta-col">
      <span class="meta-label">Status:</span>
      <span class="meta-value" style="font-weight: bold; color: #1A237E;">${orderStatus}</span>
    </div>
  </div>
</div>

<div class="section-container">
  <div class="section-header-title">Company Details</div>
  <div class="order-meta-grid">
    <div class="meta-col" style="min-width: 100%; margin-bottom: 6px;">
      <span class="meta-label">Company Name:</span>
      <span class="meta-value">${customerCompany}</span>
    </div>
    <div class="meta-col" style="min-width: 100%; margin-bottom: 6px;">
      <span class="meta-label">Contact Mobile:</span>
      <span class="meta-value">${customerMobile}</span>
    </div>
    <div class="meta-col" style="min-width: 100%; margin-bottom: 6px;">
      <span class="meta-label">Delivery Address:</span>
      <span class="meta-value">${order?.delivery_address || 'N/A'}</span>
    </div>
    <div class="meta-col" style="display: flex; flex-direction: row; min-width: 100%; margin-top: 2px;">
      <div style="flex: 1;">
        <span class="meta-label">City:</span>
        <span class="meta-value">${city}</span>
      </div>
      <div style="flex: 1;">
        <span class="meta-label">State:</span>
        <span class="meta-value">${state}</span>
      </div>
    </div>
  </div>
</div>

<div class="section-container">
  <div class="section-header-title">Product Details</div>
  <table class="details-table">
    <thead>
      <tr>
        <th>Category</th>
        <th>Sub Category</th>
        <th>Size</th>
        <th>Load Capacity</th>
        <th>Color</th>
        <th style="text-align: right; width: 80px;">Quantity</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${category}</td>
        <td>${subCategory}</td>
        <td>${size}</td>
        <td>${loadCapacity}</td>
        <td>${color}</td>
        <td style="text-align: right; font-weight: bold; font-size: 13px;">${quantity}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="footer-container">
  Generated From Flortek Admin Panel
</div>

</body>
</html>
  `;

  if (Platform.OS === 'web') {
    console.log('[PDF Generation] Running on Web, returning HTML string...');
    return html;
  }

  console.log('[PDF Generation] Calling Print.printToFileAsync...');
  const printResult = await Print.printToFileAsync({ html });
  const uri = printResult.uri;
  console.log('[PDF Generation] PDF URI returned:', uri);

  const fileInfo = await FileSystem.getInfoAsync(uri);
  console.log('[PDF Generation] Source File Info:', fileInfo);

  if (!fileInfo.exists) {
    throw new Error(`PDF file does not exist at path: ${uri}`);
  }

  return uri;
};