import PDFDocument from 'pdfkit';

export const generateInvoicePDF = (order, tenant = 'aquasphere') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const isWadaana = tenant.toLowerCase() === 'wadaana';
      const companyName = isWadaana ? 'WADAANA INDUSTRIES B2B' : 'AQUASPHERE WATER PURIFICATION';
      const companySub = isWadaana ? 'PET Bottle Blowing & B2B Distribution' : '19L & PET Mineral Water Supply';

      // Header
      doc.fillColor('#0f172a').fontSize(20).text(companyName, { align: 'left' });
      doc.fillColor('#64748b').fontSize(10).text(companySub, { align: 'left' });
      doc.moveDown(1.5);

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(1);

      // Order Info
      doc.fillColor('#0f172a').fontSize(14).text(`INVOICE / ORDER #${order.id.substring(0, 8).toUpperCase()}`);
      doc.fillColor('#475569').fontSize(10).text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
      doc.text(`Customer: ${order.customer?.name || 'Walk-in'}`);
      doc.text(`Phone: ${order.customer?.phone || 'N/A'}`);
      doc.text(`Delivery Status: ${order.deliveryStatus}`);
      doc.text(`Payment Status: ${order.paymentStatus}`);
      doc.moveDown(1.5);

      // Table Header
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Item', 50, tableTop);
      doc.text('Qty', 300, tableTop, { width: 50, align: 'right' });
      doc.text('Unit Price (Rs)', 360, tableTop, { width: 90, align: 'right' });
      doc.text('Total (Rs)', 460, tableTop, { width: 90, align: 'right' });

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#cbd5e1').stroke();
      doc.font('Helvetica');

      let position = tableTop + 25;
      let grandTotal = 0;

      order.items?.forEach(item => {
        if (position > 700) {
          doc.addPage();
          position = 50;
        }
        const itemTotal = Number(item.price) * item.quantity;
        grandTotal += itemTotal;

        doc.text(item.item?.name || 'Item', 50, position);
        doc.text(item.quantity.toString(), 300, position, { width: 50, align: 'right' });
        doc.text(Number(item.price).toLocaleString(), 360, position, { width: 90, align: 'right' });
        doc.text(itemTotal.toLocaleString(), 460, position, { width: 90, align: 'right' });

        position += 20;
      });

      if (position > 700) {
        doc.addPage();
        position = 50;
      }

      doc.moveTo(50, position + 5).lineTo(550, position + 5).strokeColor('#cbd5e1').stroke();
      position += 15;

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Grand Total:', 360, position, { width: 90, align: 'right' });
      doc.text(`Rs. ${grandTotal.toLocaleString()}`, 460, position, { width: 90, align: 'right' });

      doc.moveDown(3);
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94a3b8').text('Thank you for your business! AQUA Sphere OS Automated Billing.', 50, doc.y, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
