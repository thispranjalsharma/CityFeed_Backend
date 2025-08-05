import { QRCodeUtil, QRCodeData } from '../src/utils/qrcode.util';

describe('QR Code Utility Tests', () => {
  describe('QRCodeUtil', () => {
    it('should generate QR code for user data', async () => {
      const userData: QRCodeData = {
        userId: '507f1f77bcf86cd799439011',
        phone: '+919876543210',
        name: 'John Doe',
        timestamp: Date.now()
      };

      const qrCodeDataURL = await QRCodeUtil.generateUserQRCode(userData);
      
      expect(qrCodeDataURL).toBeDefined();
      expect(qrCodeDataURL).toMatch(/^data:image\/png;base64,/);
    });

    it('should decode QR code data correctly', () => {
      const originalData: QRCodeData = {
        userId: '507f1f77bcf86cd799439011',
        phone: '+919876543210',
        name: 'John Doe',
        timestamp: Date.now()
      };

      const qrCodeData = JSON.stringify({
        ...originalData,
        version: '1.0'
      });

      const decodedData = QRCodeUtil.decodeQRCode(qrCodeData);
      
      expect(decodedData.userId).toBe(originalData.userId);
      expect(decodedData.phone).toBe(originalData.phone);
      expect(decodedData.name).toBe(originalData.name);
    });

    it('should throw error for invalid QR code data', () => {
      const invalidData = 'invalid json data';
      
      expect(() => {
        QRCodeUtil.decodeQRCode(invalidData);
      }).toThrow('Invalid QR code data');
    });

    it('should throw error for QR code with missing required fields', () => {
      const incompleteData = JSON.stringify({
        userId: '507f1f77bcf86cd799439011',
        timestamp: Date.now()
        // Missing phone and name
      });
      
      expect(() => {
        QRCodeUtil.decodeQRCode(incompleteData);
      }).toThrow('Invalid QR code format');
    });

    it('should throw error for expired QR code', () => {
      const expiredData = JSON.stringify({
        userId: '507f1f77bcf86cd799439011',
        phone: '+919876543210',
        name: 'John Doe',
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      });
      
      expect(() => {
        QRCodeUtil.decodeQRCode(expiredData);
      }).toThrow('QR code has expired');
    });

    it('should generate user profile QR code', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const phone = '+919876543210';
      const name = 'John Doe';

      const qrCodeDataURL = await QRCodeUtil.generateUserProfileQRCode(userId, phone, name);
      
      expect(qrCodeDataURL).toBeDefined();
      expect(qrCodeDataURL).toMatch(/^data:image\/png;base64,/);
    });
  });
}); 