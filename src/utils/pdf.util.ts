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
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.fontSize(20).text('CityFeed Dine-In Summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Name: ${userName}`);
    doc.text(`Outlet: ${outletName}${outletAddress ? ', ' + outletAddress : ''}`);
    doc.text(`Date: ${dineInDate.toLocaleString()}`);
    doc.moveDown();
    doc.text(`Bill Amount: ₹${billAmount.toFixed(2)}`);
    doc.text(`Coins Used: ${coinsUsed}`);
    doc.text(`Other Payment Amount: ₹${cashAmount.toFixed(2)}`);
    doc.text(`Other Payment Method: ${nonCoinPaymentMethod ? nonCoinPaymentMethod.toUpperCase() : '-'}`);
    doc.text(`Reward Earned: ${rewardEarned} coins`);
    doc.end();
  });
} 