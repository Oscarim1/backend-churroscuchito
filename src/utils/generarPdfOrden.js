import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export const generarPdfOrden = async (order, items, categoria) => {
  const filteredItems = items.filter(i => i.category === categoria);
  const fecha = new Date(order.created_at).toLocaleString();
  const logoPath = path.join(process.cwd(), './public', 'logo.png');
  const logoBuffer = await fs.readFile(logoPath);
  const logoBase64 = logoBuffer.toString('base64');
  const logoMime = 'image/png'; // o image/jpeg si usas .jpg


  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            padding: 10px 20px;
            width: 280px;
          }
  
          .logo {
            text-align: center;
            margin-bottom: 10px;
          }
  
          .logo img {
            width: 180px;
          }
  
          h1, h2, .fecha {
            text-align: center;
            margin: 4px 0;
          }
  
          .linea {
            text-align: center;
            margin: 10px 0;
          }
  
          .item {
            margin: 8px 0;
            display: flex;
            justify-content: space-between;
            white-space: pre-wrap;
            word-break: break-word;
          }
  
          .nombre {
            width: 70%;
          }
  
          .precio {
            width: 30%;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="logo">
          <img src="data:${logoMime};base64,${logoBase64}" alt="CHURROS CUCHITO" />
        </div>
  
        <h1>PEDIDO #${order.order_number}</h1>
        <h2>${categoria.toUpperCase()}</h2>
        <div class="fecha">Fecha: ${fecha}</div>
        <div class="linea">**********************</div>
  
        ${filteredItems.map(item => `
          <div class="item">
            <div class="nombre">${item.quantity}x ${item.name}</div>
            <div class="precio">$${(item.price * item.quantity).toLocaleString()}</div>
          </div>
        `).join('')}
      </body>
    </html>
  `;
  

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html);

  const tmpDir = path.join(process.cwd(), 'tmp');
  await fs.mkdir(tmpDir, { recursive: true }); // crea 'tmp' si no existe

  const filePath = `./tmp/pedido_${order.order_number}_${categoria}.pdf`;
  await page.pdf({ path: filePath, format: 'A4' });

  await browser.close();
  return filePath;
};
