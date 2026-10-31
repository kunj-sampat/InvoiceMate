// js/barcode.js — Code-128 Barcode Generator for InvoiceMate
// Pure client-side SVG generation with zero external dependencies.

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104: Start B, 106: Stop)
];

/**
 * Generate standard Code 128 (Subset B) SVG string
 */
function generateBarcodeSVG(text, options = {}) {
  const barWidth = options.barWidth || 2;
  const barHeight = options.height || 48;
  const showText = options.showText !== false;
  const cleanText = String(text || 'PRD-001').toUpperCase().replace(/[^ -~]/g, '');

  let checksum = 104; // Start Code B
  const codes = [104];

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 32;
    codes.push(code);
    checksum += code * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop code

  let patternStr = "";
  for (const c of codes) {
    if (c >= 0 && c < CODE128_PATTERNS.length) {
      patternStr += CODE128_PATTERNS[c];
    }
  }

  let totalModules = 0;
  for (let i = 0; i < patternStr.length; i++) {
    totalModules += parseInt(patternStr[i], 10);
  }

  const quietZone = barWidth * 8;
  const totalSvgWidth = totalModules * barWidth + (quietZone * 2);
  const totalSvgHeight = barHeight + (showText ? 18 : 4);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSvgWidth} ${totalSvgHeight}" width="100%" height="${totalSvgHeight}" style="background:#fff; display:block; margin:0 auto; overflow:visible;">`;
  
  let currentX = quietZone;
  let isBar = true;

  for (let i = 0; i < patternStr.length; i++) {
    const width = parseInt(patternStr[i], 10) * barWidth;
    if (isBar) {
      svg += `<rect x="${currentX}" y="2" width="${width}" height="${barHeight}" fill="#0f172a" />`;
    }
    currentX += width;
    isBar = !isBar;
  }

  if (showText) {
    svg += `<text x="${totalSvgWidth / 2}" y="${barHeight + 15}" font-family="'JetBrains Mono', Consolas, monospace" font-size="12" font-weight="700" letter-spacing="1.5px" text-anchor="middle" fill="#0f172a">${escapeHtml(cleanText)}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Render Barcode Label with user's exact requested layout:
 * - Top Left: Company Name
 * - Center: Barcode (with SKU number beneath it)
 * - Bottom Left: Product Name
 * - Bottom Right: Price
 */
function renderShelfLabelHTML(prod) {
  if (!prod) return '';
  const bizName = localStorage.getItem('businessName') || localStorage.getItem('companyName') || 'InvoiceMate';
  const sku = prod.sku || ('PRD-' + String(prod.id || 1).padStart(3, '0'));
  const price = Number(prod.price || 0).toFixed(2);
  const barcodeSvg = generateBarcodeSVG(sku, { barWidth: 1.8, height: 48, showText: true });

  return `
    <div class="print-label-item barcode-tag" style="width: 290px; border: 1.5px solid #0f172a; border-radius: 8px; padding: 12px 14px; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <!-- Top Left: Company Name -->
      <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        ${escapeHtml(bizName)}
      </div>

      <!-- Center: Barcode -->
      <div style="margin: 6px 0 10px 0; text-align: center;">
        ${barcodeSvg}
      </div>

      <!-- Bottom: Left Product Name, Right Price -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 4px;">
        <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${escapeHtml(prod.name)}">
          ${escapeHtml(prod.name)}
        </div>
        <div style="font-size: 16px; font-weight: 900; color: #205646; white-space: nowrap; text-align: right;">
          ₹${price}
        </div>
      </div>
    </div>
  `;
}

/**
 * Open single item Barcode Modal
 */
let activeBarcodeProduct = null;

function openBarcodeModal(product) {
  if (!product) return;
  activeBarcodeProduct = product;
  const modal = document.getElementById('barcode-modal');
  if (!modal) {
    console.error('Barcode modal element not found!');
    return;
  }

  const titleEl = document.getElementById('barcode-modal-prod-title');
  if (titleEl) titleEl.textContent = `${product.name} (SKU: ${product.sku || 'N/A'})`;

  const skuEl = document.getElementById('barcode-modal-sku');
  if (skuEl) skuEl.textContent = product.sku || ('PRD-' + String(product.id || 1).padStart(3, '0'));

  const qtyInput = document.getElementById('barcode-print-qty');
  if (qtyInput) {
    qtyInput.value = '1';
  }

  updateBarcodePreview();
  modal.classList.add('active');
  modal.style.display = 'flex';
}

function closeBarcodeModal() {
  const modal = document.getElementById('barcode-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function updateBarcodePreview() {
  if (!activeBarcodeProduct) return;
  const container = document.getElementById('barcode-preview-box');
  if (!container) return;
  container.innerHTML = renderShelfLabelHTML(activeBarcodeProduct);
}

function printCurrentLabels() {
  if (!activeBarcodeProduct) return;
  const qtyInput = document.getElementById('barcode-print-qty');
  const qty = parseInt(qtyInput ? qtyInput.value : '1', 10);
  const count = isNaN(qty) || qty < 1 ? 1 : qty;
  const labels = Array(count).fill(activeBarcodeProduct);
  executePrintLabels(labels);
}

function executePrintLabels(productsList) {
  if (!productsList || productsList.length === 0) return;
  let printArea = document.getElementById('printable-labels-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'printable-labels-area';
    document.body.appendChild(printArea);
  }

  printArea.innerHTML = productsList.map(p => renderShelfLabelHTML(p)).join('');

  if (!document.getElementById('barcode-print-style')) {
    const style = document.createElement('style');
    style.id = 'barcode-print-style';
    style.innerHTML = `
      #printable-labels-area {
        display: none;
      }
      @media print {
        body > *:not(#printable-labels-area) {
          display: none !important;
        }
        #printable-labels-area {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 12px !important;
          padding: 10px !important;
          margin: 0 !important;
          background: #fff !important;
          visibility: visible !important;
        }
        #printable-labels-area .print-label-item {
          box-shadow: none !important;
          border: 1.5px solid #000 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.print();
}

window.generateBarcodeSVG = generateBarcodeSVG;
window.renderShelfLabelHTML = renderShelfLabelHTML;
window.openBarcodeModal = openBarcodeModal;
window.closeBarcodeModal = closeBarcodeModal;
window.printCurrentLabels = printCurrentLabels;
window.executePrintLabels = executePrintLabels;
