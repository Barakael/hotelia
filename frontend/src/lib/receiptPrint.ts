import { Sale } from '@/types';
import { formatCurrency } from '@/data/mockData';

export interface ReceiptShopInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Builds the receipt body HTML (shop header, items, totals, footer). */
export function buildReceiptPrintHtml(sale: Sale, shop: ReceiptShopInfo): string {
  const shopName = escapeHtml(shop.name?.trim() || 'Shop');
  const address = shop.address?.trim();
  const phone = shop.phone?.trim();

  const itemRows = sale.items
    .map(
      item => `<div class="item">
        <span>${item.quantity}x ${escapeHtml(item.product.name)}</span>
        <span>${formatCurrency(item.product.price * item.quantity)}</span>
      </div>`
    )
    .join('');

  return `
    <h2>${shopName}</h2>
    ${address ? `<p class="meta">${escapeHtml(address)}</p>` : ''}
    ${phone ? `<p class="meta">TEL : ${escapeHtml(phone)}</p>` : ''}
    <hr/>
    <p class="meta">Receipt #${escapeHtml(String(sale.id))}</p>
    <p class="meta">${escapeHtml(new Date(sale.timestamp).toLocaleString())}</p>
    <p class="meta">Cashier: ${escapeHtml(sale.cashierName)}</p>
    <hr/>
    ${itemRows}
    <hr/>
    <div class="row total"><span>TOTAL</span><span>${formatCurrency(sale.total)}</span></div>
    <div class="row"><span>Payment</span><span>${escapeHtml(String(sale.paymentMethod))}</span></div>
    <p class="footer">Thank you for your purchase!</p>
    <p class="footer powered">Powered by Hotelia</p>
  `;
}

const RECEIPT_PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #fff !important;
    color: #000 !important;
    font-family: 'Courier New', Courier, monospace;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    width: 100%;
  }
  /* On-screen preview: narrow 58mm strip so phones look like the printer */
  body {
    padding: 12px 0 80px;
    font-size: 14px;
    line-height: 1.35;
  }
  #receipt {
    width: 58mm;
    max-width: 100%;
    margin: 0 auto;
    padding: 0 1.5mm;
    background: #fff;
    color: #000;
  }
  h2 {
    font-size: 19px;
    font-weight: 700;
    text-align: center;
    margin: 0 0 6px;
    line-height: 1.25;
    word-break: break-word;
  }
  p {
    text-align: center;
    color: #000;
    margin: 0 0 3px;
    word-break: break-word;
  }
  p.meta { font-size: 13px; }
  p.footer { font-size: 12px; margin-top: 10px; }
  p.powered { font-size: 12px; font-weight: 600; margin-top: 2px; }
  hr {
    border: none;
    border-top: 1px dashed #000;
    margin: 10px 0;
  }
  .item, .row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 6px;
    font-size: 14px;
    margin: 4px 0;
  }
  .item span:first-child,
  .row span:first-child {
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }
  .item span:last-child,
  .row span:last-child {
    flex-shrink: 0;
    text-align: right;
  }
  .total {
    font-weight: 700;
    font-size: 17px;
    border-top: 1px solid #000;
    padding-top: 8px;
    margin-top: 6px;
  }
  .actions {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    gap: 8px;
    padding: 12px;
    background: #fff;
    border-top: 1px solid #ddd;
  }
  .actions button {
    flex: 1;
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 600;
    border-radius: 8px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    color: #111;
  }
  .actions button.primary {
    background: #007AAD;
    border-color: #007AAD;
    color: #fff;
  }
  /* 58mm thermal: full width, almost no side margin */
  @page { size: 58mm auto; margin: 0; }
  @media print {
    html, body {
      width: 58mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #receipt {
      width: 58mm !important;
      max-width: 58mm !important;
      margin: 0 !important;
      padding: 2mm 1.5mm !important;
    }
    .actions { display: none !important; }
  }
`;

function buildFullReceiptDocument(sale: Sale, shop: ReceiptShopInfo): string {
  const body = buildReceiptPrintHtml(sale, shop);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Receipt #${escapeHtml(String(sale.id))}</title>
  <style>${RECEIPT_PRINT_CSS}</style>
</head>
<body>
  <div id="receipt">${body}</div>
  <div class="actions">
    <button type="button" onclick="window.close()">Close</button>
    <button type="button" class="primary" onclick="window.print()">Print</button>
  </div>
  <script>
    (function () {
      function go() {
        // Give the browser time to paint before opening the print sheet.
        setTimeout(function () {
          try { window.focus(); window.print(); } catch (e) {}
        }, 400);
      }
      if (document.readyState === 'complete') go();
      else window.addEventListener('load', go);
    })();
  </script>
</body>
</html>`;
}

/**
 * Opens a standalone receipt document and prints it.
 * Avoids blank pages on mobile caused by removing DOM before print
 * or using noopener popups.
 */
export function printReceipt(sale: Sale, shop: ReceiptShopInfo): boolean {
  const html = buildFullReceiptDocument(sale, shop);

  // Blob URL is more reliable than about:blank + document.write on iOS/Android.
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Do NOT use noopener — that often yields a blank print preview on phones.
  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    return false;
  }

  // Keep the blob alive until the tab can load it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
