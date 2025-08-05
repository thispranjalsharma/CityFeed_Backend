import PDFDocument from 'pdfkit';

export async function generateDineInSummaryPDF({
  userName,
  billAmount,
  coinsUsed,
  cashAmount,
  nonCoinPaymentMethod,
  rewardEarned,
  outletName,
  outletAddress,
  dineInDate
}: {
  userName: string,
  billAmount: number,
  coinsUsed: number,
  cashAmount: number,
  nonCoinPaymentMethod: 'upi' | 'cash' | 'card' | null,
  rewardEarned: number,
  outletName: string,
  outletAddress?: string,
  dineInDate: Date
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      layout: 'portrait'
    });
    
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    // Define colors
    const primaryColor = '#2d7ff9';
    const secondaryColor = '#f8f9fa';
    const textColor = '#333333';
    const lightTextColor = '#666666';
    const borderColor = '#e0e0e0';

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number, fillColor?: string, strokeColor?: string) => {
      doc.save();
      doc.roundedRect(x, y, width, height, radius);
      if (fillColor) {
        doc.fill(fillColor);
      }
      if (strokeColor) {
        doc.stroke(strokeColor);
      }
      doc.restore();
    };

    // Helper function to add text with styling
    const addStyledText = (text: string, x: number, y: number, options: any = {}) => {
      const defaultOptions = {
        fontSize: 12,
        color: textColor,
        font: 'Helvetica'
      };
      const finalOptions = { ...defaultOptions, ...options };
      
      doc.font(finalOptions.font)
         .fontSize(finalOptions.fontSize)
         .fill(finalOptions.color)
         .text(text, x, y, finalOptions);
    };

    // Header Section
    const headerHeight = 120;
    drawRoundedRect(0, 0, 595, headerHeight, 0, primaryColor);
    
    // Logo/Title area
    addStyledText('CityFeed', 50, 30, {
      fontSize: 32,
      color: '#ffffff',
      font: 'Helvetica-Bold'
    });
    
    addStyledText('Dine-In Summary', 50, 65, {
      fontSize: 18,
      color: '#ffffff',
      font: 'Helvetica'
    });

    // Date and time
    const dateStr = dineInDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = dineInDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    addStyledText(`${dateStr} at ${timeStr}`, 50, 90, {
      fontSize: 12,
      color: '#ffffff',
      font: 'Helvetica'
    });

    // Customer Information Section
    const customerSectionY = headerHeight + 40;
    drawRoundedRect(50, customerSectionY, 495, 80, 8, secondaryColor, borderColor);
    
    addStyledText('Customer Information', 70, customerSectionY + 20, {
      fontSize: 16,
      color: primaryColor,
      font: 'Helvetica-Bold'
    });
    
    addStyledText(`Name: ${userName}`, 70, customerSectionY + 45, {
      fontSize: 12,
      color: textColor
    });
    
    addStyledText(`Outlet: ${outletName}`, 70, customerSectionY + 60, {
      fontSize: 12,
      color: textColor
    });
    
    if (outletAddress) {
      addStyledText(`Address: ${outletAddress}`, 70, customerSectionY + 75, {
        fontSize: 12,
        color: textColor
      });
    }

    // Payment Details Section
    const paymentSectionY = customerSectionY + 120;
    drawRoundedRect(50, paymentSectionY, 495, 200, 8, '#ffffff', borderColor);
    
    addStyledText('Payment Details', 70, paymentSectionY + 20, {
      fontSize: 16,
      color: primaryColor,
      font: 'Helvetica-Bold'
    });

    // Payment breakdown table
    const tableStartX = 70;
    const tableStartY = paymentSectionY + 40;
    const rowHeight = 25;
    const col1Width = 200;
    const col2Width = 150;

    // Table headers
    drawRoundedRect(tableStartX, tableStartY, col1Width, rowHeight, 4, primaryColor);
    drawRoundedRect(tableStartX + col1Width, tableStartY, col2Width, rowHeight, 4, primaryColor);
    
    addStyledText('Item', tableStartX + 10, tableStartY + 8, {
      fontSize: 12,
      color: '#ffffff',
      font: 'Helvetica-Bold'
    });
    
    addStyledText('Amount', tableStartX + col1Width + 10, tableStartY + 8, {
      fontSize: 12,
      color: '#ffffff',
      font: 'Helvetica-Bold'
    });

    // Table rows
    const rows = [
      { label: 'Bill Amount', value: `₹${billAmount.toFixed(2)}` },
      { label: 'Coins Used', value: `${coinsUsed} coins` },
      { label: 'Other Payment', value: `₹${cashAmount.toFixed(2)}` },
      { label: 'Payment Method', value: nonCoinPaymentMethod ? nonCoinPaymentMethod.toUpperCase() : 'N/A' },
      { label: 'Reward Earned', value: `${rewardEarned} coins` }
    ];

    rows.forEach((row, index) => {
      const rowY = tableStartY + (index + 1) * rowHeight;
      const isEven = index % 2 === 0;
      
      // Row background
      if (isEven) {
        drawRoundedRect(tableStartX, rowY, col1Width, rowHeight, 0, '#f8f9fa');
        drawRoundedRect(tableStartX + col1Width, rowY, col2Width, rowHeight, 0, '#f8f9fa');
      }
      
      // Borders
      doc.strokeColor(borderColor).lineWidth(0.5);
      doc.moveTo(tableStartX, rowY).lineTo(tableStartX + col1Width + col2Width, rowY).stroke();
      doc.moveTo(tableStartX + col1Width, rowY).lineTo(tableStartX + col1Width, rowY + rowHeight).stroke();
      
      addStyledText(row.label, tableStartX + 10, rowY + 8, {
        fontSize: 11,
        color: textColor
      });
      
      addStyledText(row.value, tableStartX + col1Width + 10, rowY + 8, {
        fontSize: 11,
        color: textColor,
        font: 'Helvetica-Bold'
      });
    });

    // Total section
    const totalY = tableStartY + (rows.length + 1) * rowHeight + 20;
    drawRoundedRect(tableStartX, totalY, col1Width + col2Width, 40, 8, primaryColor);
    
    addStyledText('Total Bill Amount', tableStartX + 10, totalY + 12, {
      fontSize: 14,
      color: '#ffffff',
      font: 'Helvetica-Bold'
    });
    
    addStyledText(`₹${billAmount.toFixed(2)}`, tableStartX + col1Width + 10, totalY + 12, {
      fontSize: 16,
      color: '#ffffff',
      font: 'Helvetica-Bold'
    });

    // Footer Section
    const footerY = 750;
    drawRoundedRect(50, footerY, 495, 80, 8, secondaryColor, borderColor);
    
    addStyledText('Thank you for dining with CityFeed!', 70, footerY + 20, {
      fontSize: 14,
      color: primaryColor,
      font: 'Helvetica-Bold'
    });
    
    addStyledText('We hope you enjoyed your experience. Your feedback helps us improve our services.', 70, footerY + 40, {
      fontSize: 11,
      color: lightTextColor
    });
    
    addStyledText('For support, contact us at support@cityfeed.com', 70, footerY + 55, {
      fontSize: 10,
      color: lightTextColor
    });

    // Add decorative elements
    // Top right corner decoration
    doc.save();
    doc.translate(520, 30);
    doc.rotate(45);
    doc.fillColor('#ffffff').opacity(0.1);
    doc.rect(-20, -20, 40, 40).fill();
    doc.restore();

    // Bottom left corner decoration
    doc.save();
    doc.translate(80, 720);
    doc.rotate(-30);
    doc.fillColor(primaryColor).opacity(0.1);
    doc.circle(0, 0, 15).fill();
    doc.restore();

    doc.end();
  });
} 