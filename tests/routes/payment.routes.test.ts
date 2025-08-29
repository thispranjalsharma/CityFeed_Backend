/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the payment controller functions
const mockPaymentController = {
  initiateMembershipPayment: jest.fn(),
  verifyMembershipPayment: jest.fn(),
  scanQRCode: jest.fn(),
  getQRCodeData: jest.fn(),
  processUnifiedPayment: jest.fn(),
  getTransactionHistory: jest.fn(),
  getTransactionById: jest.fn(),
  getDineInHistory: jest.fn(),
  createRechargeOrder: jest.fn(),
  verifyRecharge: jest.fn(),
  initiateDirectPayment: jest.fn(),
  verifyDirectPayment: jest.fn(),
  getOutletDineInHistory: jest.fn(),
  merchantDineInPayment: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual payment routes - order matters for route matching!
app.post('/api/payments/membership/initiate', (req, res) => mockPaymentController.initiateMembershipPayment(req, res));
app.post('/api/payments/membership/verify', (req, res) => mockPaymentController.verifyMembershipPayment(req, res));
app.post('/api/payments/scan-qr', (req, res) => mockPaymentController.scanQRCode(req, res));
app.get('/api/payments/get-qr-data', (req, res) => mockPaymentController.getQRCodeData(req, res));
app.post('/api/payments/unified', (req, res) => mockPaymentController.processUnifiedPayment(req, res));
app.get('/api/payments/transactions/:id', (req, res) => mockPaymentController.getTransactionById(req, res));
app.get('/api/payments/transactions', (req, res) => mockPaymentController.getTransactionHistory(req, res));
app.get('/api/payments/dine-in/history', (req, res) => mockPaymentController.getDineInHistory(req, res));
app.post('/api/payments/recharge', (req, res) => mockPaymentController.createRechargeOrder(req, res));
app.post('/api/payments/recharge/verify', (req, res) => mockPaymentController.verifyRecharge(req, res));
app.post('/api/payments/direct/initiate', (req, res) => mockPaymentController.initiateDirectPayment(req, res));
app.post('/api/payments/direct/verify', (req, res) => mockPaymentController.verifyDirectPayment(req, res));
app.get('/api/payments/outlet/:outletId/history', (req, res) => mockPaymentController.getOutletDineInHistory(req, res));
app.post('/api/payments/merchant-dinein', (req, res) => mockPaymentController.merchantDineInPayment(req, res));

describe('Payment Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/membership/initiate', () => {
    it('should return 200 for successful membership payment initiation', async () => {
      const paymentData = {
        orderId: 'order_123',
        amount: 1500,
        membershipType: 'cityfeed_select'
      };

      mockPaymentController.initiateMembershipPayment.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: paymentData,
          message: 'Membership payment initiated successfully'
        });
      });

      const res = await request(app)
        .post('/api/payments/membership/initiate')
        .send({
          membershipType: 'cityfeed_select',
          userDetails: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(paymentData);
      expect(mockPaymentController.initiateMembershipPayment).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid membership type', async () => {
      mockPaymentController.initiateMembershipPayment.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid membership type'
        });
      });

      const res = await request(app)
        .post('/api/payments/membership/initiate')
        .send({
          membershipType: 'invalid_type'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/payments/unified', () => {
    it('should return 200 for successful unified payment', async () => {
      const paymentData = {
        paymentId: 'payment_123',
        status: 'completed',
        amount: 500
      };

      mockPaymentController.processUnifiedPayment.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: paymentData,
          message: 'Payment processed successfully'
        });
      });

      const res = await request(app)
        .post('/api/payments/unified')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          orderType: 'dine-in',
          orderId: 'session_123',
          paymentMethod: 'wallet',
          coinsToUse: 500,
          otp: '123456'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(paymentData);
      expect(mockPaymentController.processUnifiedPayment).toHaveBeenCalledTimes(1);
    });

    it('should return 402 for insufficient coins', async () => {
      mockPaymentController.processUnifiedPayment.mockImplementation((req, res) => {
        res.status(402).json({
          success: false,
          message: 'Insufficient coins'
        });
      });

      const res = await request(app)
        .post('/api/payments/unified')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          orderType: 'dine-in',
          orderId: 'session_123',
          paymentMethod: 'wallet',
          coinsToUse: 10000
        });

      expect(res.statusCode).toBe(402);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Insufficient coins');
    });
  });

  describe('GET /api/payments/transactions', () => {
    it('should return 200 with transaction history', async () => {
      const transactions = [
        {
          _id: 'transaction1',
          type: 'dine-in',
          amount: 500,
          status: 'completed',
          createdAt: '2024-01-15T10:30:00Z'
        }
      ];

      mockPaymentController.getTransactionHistory.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: transactions
        });
      });

      const res = await request(app)
        .get('/api/payments/transactions')
        .set('Authorization', 'Bearer jwt-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(mockPaymentController.getTransactionHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/payments/recharge', () => {
    it('should return 200 for successful recharge order creation', async () => {
      const rechargeOrder = {
        id: 'order_recharge_123',
        amount: 10000, // in paise
        currency: 'INR',
        status: 'created'
      };

      mockPaymentController.createRechargeOrder.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: rechargeOrder
        });
      });

      const res = await request(app)
        .post('/api/payments/recharge')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          amount: 100
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(rechargeOrder);
      expect(mockPaymentController.createRechargeOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/payments/merchant-dinein', () => {
    it('should return 200 for successful merchant dine-in payment', async () => {
      const merchantPaymentData = {
        _id: 'payment_merchant_123',
        userId: 'testuserid',
        outletId: 'testoutletid',
        amount: 500,
        coinsUsed: 300,
        cashAmount: 200,
        status: 'completed',
        dineInSessionId: 'session_123'
      };

      mockPaymentController.merchantDineInPayment.mockImplementation((req, res) => {
        res.status(200).json({
          status: 'success',
          message: 'Payment processed successfully',
          payment: merchantPaymentData
        });
      });

      const res = await request(app)
        .post('/api/payments/merchant-dinein')
        .set('Authorization', 'Bearer admin-token')
        .send({
          phone: '1234567890',
          outletId: 'testoutletid',
          billAmount: 500,
          coinsToUse: 300,
          cashAmount: 200,
          paymentMethod: 'cash',
          otp: '123456'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'Payment processed successfully');
      expect(res.body).toHaveProperty('payment');
      expect(res.body.payment).toMatchObject(merchantPaymentData);
      expect(mockPaymentController.merchantDineInPayment).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for unauthorized outlet access', async () => {
      mockPaymentController.merchantDineInPayment.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Not authorized for this outlet'
        });
      });

      const res = await request(app)
        .post('/api/payments/merchant-dinein')
        .set('Authorization', 'Bearer admin-token')
        .send({
          phone: '1234567890',
          outletId: 'unauthorized_outlet',
          billAmount: 500
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Not authorized for this outlet');
    });
  });

  describe('POST /api/payments/membership/verify', () => {
    it('should return 200 for successful membership payment verification', async () => {
      const verificationData = {
        paymentId: 'pay_123',
        status: 'completed',
        membershipType: 'cityfeed_select'
      };

      mockPaymentController.verifyMembershipPayment.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: verificationData,
          message: 'Membership payment verified successfully'
        });
      });

      const res = await request(app)
        .post('/api/payments/membership/verify')
        .send({
          razorpayPaymentId: 'pay_123',
          razorpayOrderId: 'order_123',
          razorpaySignature: 'signature_123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(verificationData);
      expect(mockPaymentController.verifyMembershipPayment).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid payment verification', async () => {
      mockPaymentController.verifyMembershipPayment.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Payment verification failed'
        });
      });

      const res = await request(app)
        .post('/api/payments/membership/verify')
        .send({
          razorpayPaymentId: 'invalid_pay',
          razorpayOrderId: 'invalid_order',
          razorpaySignature: 'invalid_signature'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Payment verification failed');
    });
  });

  describe('POST /api/payments/scan-qr', () => {
    it('should return 200 for successful QR code scan', async () => {
      const userDetails = {
        userId: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        walletBalance: 500
      };

      mockPaymentController.scanQRCode.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: userDetails
        });
      });

      const res = await request(app)
        .post('/api/payments/scan-qr')
        .set('Authorization', 'Bearer admin-token')
        .send({
          userId: 'user123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(userDetails);
      expect(mockPaymentController.scanQRCode).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing userId', async () => {
      mockPaymentController.scanQRCode.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      });

      const res = await request(app)
        .post('/api/payments/scan-qr')
        .set('Authorization', 'Bearer admin-token')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User ID is required');
    });

    it('should return 403 for unauthorized role', async () => {
      mockPaymentController.scanQRCode.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Insufficient permissions'
        });
      });

      const res = await request(app)
        .post('/api/payments/scan-qr')
        .set('Authorization', 'Bearer user-token')
        .send({
          userId: 'user123'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden - Insufficient permissions');
    });

    it('should return 404 for non-existent user', async () => {
      mockPaymentController.scanQRCode.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
      });

      const res = await request(app)
        .post('/api/payments/scan-qr')
        .set('Authorization', 'Bearer admin-token')
        .send({
          userId: 'nonexistent'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('GET /api/payments/get-qr-data', () => {
    it('should return 200 with QR code data', async () => {
      const qrData = {
        qrCodeData: 'user123_encrypted_data',
        userId: 'user123',
        expiresAt: '2024-12-31T23:59:59Z'
      };

      mockPaymentController.getQRCodeData.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: qrData
        });
      });

      const res = await request(app)
        .get('/api/payments/get-qr-data')
        .query({ userId: 'user123' })
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(qrData);
      expect(mockPaymentController.getQRCodeData).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing userId', async () => {
      mockPaymentController.getQRCodeData.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      });

      const res = await request(app)
        .get('/api/payments/get-qr-data')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User ID is required');
    });
  });

  describe('GET /api/payments/transactions/:id', () => {
    it('should return 200 with specific transaction details', async () => {
      const transactionDetail = {
        _id: 'transaction1',
        type: 'dine-in',
        amount: 500,
        status: 'completed',
        outletId: 'outlet1',
        createdAt: '2024-01-15T10:30:00Z'
      };

      mockPaymentController.getTransactionById.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: transactionDetail
        });
      });

      const res = await request(app)
        .get('/api/payments/transactions/transaction1')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(transactionDetail);
      expect(mockPaymentController.getTransactionById).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent transaction', async () => {
      mockPaymentController.getTransactionById.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      });

      const res = await request(app)
        .get('/api/payments/transactions/nonexistent')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Transaction not found');
    });

    it('should return 403 for unauthorized transaction access', async () => {
      mockPaymentController.getTransactionById.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Not authorized to view this transaction'
        });
      });

      const res = await request(app)
        .get('/api/payments/transactions/other_user_transaction')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Not authorized to view this transaction');
    });
  });

  describe('GET /api/payments/dine-in/history', () => {
    it('should return 200 with dine-in payment history', async () => {
      const dineInHistory = [
        {
          _id: 'dinein1',
          type: 'dine-in',
          amount: 300,
          status: 'completed',
          outletId: 'outlet1',
          dineInSessionId: 'session1',
          createdAt: '2024-01-15T10:30:00Z'
        }
      ];

      mockPaymentController.getDineInHistory.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: dineInHistory
        });
      });

      const res = await request(app)
        .get('/api/payments/dine-in/history')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('type', 'dine-in');
      expect(mockPaymentController.getDineInHistory).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockPaymentController.getDineInHistory.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - User not logged in'
        });
      });

      const res = await request(app).get('/api/payments/dine-in/history');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - User not logged in');
    });
  });

<<<<<<< Updated upstream
  describe('POST /api/payments/merchant-dinein', () => {
    it('should give 200 coins as reward for bill 2000 and maxDiscountPercentage 10', async () => {
      // Mock DB/service dependencies
      jest.spyOn(require('../../src/services/payment.service'), 'PaymentService').mockImplementation(() => {
        return {
          getUserByPhone: async () => ({
            _id: 'user123',
            name: 'Test User',
            phone: '9999999999',
            coins: 1000,
            membershipType: 'cityfeed_prime',
            isActive: true
          }),
          hasExistingMerchantDineInPayment: async () => false,
          deductCoins: async () => {},
          recordMerchantDineInPayment: async () => {},
          calculateDiscount: async (userId, billAmount, outletId, _eventId, maxDiscountPercentage) => {
            return {
              discountAmount: (billAmount * maxDiscountPercentage) / 100,
              finalAmount: billAmount,
              rewardPointsToAdd: Math.round((billAmount * maxDiscountPercentage) / 100),
              maxDiscountPercentage,
              membershipDiscountPercentage: maxDiscountPercentage
            };
          },
          addRewardCoinsToUser: async () => {}
        };
=======
  describe('POST /api/payments/recharge/verify', () => {
    it('should return 200 for successful recharge verification', async () => {
      const verificationData = {
        amount: 100,
        coins: 600,
        transactionId: 'txn_123'
      };

      mockPaymentController.verifyRecharge.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: verificationData,
          message: 'Wallet recharged successfully'
        });
>>>>>>> Stashed changes
      });

      const res = await request(app)
        .post('/api/payments/recharge/verify')
        .set('Authorization', 'Bearer user-token')
        .send({
          orderId: 'order_recharge_123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(verificationData);
      expect(res.body).toHaveProperty('message', 'Wallet recharged successfully');
      expect(mockPaymentController.verifyRecharge).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid order ID', async () => {
      mockPaymentController.verifyRecharge.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID or payment not found'
        });
      });

      const res = await request(app)
        .post('/api/payments/recharge/verify')
        .set('Authorization', 'Bearer user-token')
        .send({
          orderId: 'invalid_order'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid order ID or payment not found');
    });
  });

  describe('POST /api/payments/direct/initiate', () => {
    it('should return 200 for successful direct payment initiation', async () => {
      const directPaymentData = {
        order: { _id: 'event_order_123', amount: 1000 },
        payment: { _id: 'payment_123' },
        amount: 1000,
        razorpayOrder: { id: 'order_razorpay_123' }
      };

      mockPaymentController.initiateDirectPayment.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Payment initiated successfully',
          data: directPaymentData
        });
      });

      const res = await request(app)
        .post('/api/payments/direct/initiate')
        .set('Authorization', 'Bearer user-token')
        .send({
          orderType: 'event',
          orderId: 'event_order_123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(directPaymentData);
      expect(mockPaymentController.initiateDirectPayment).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid order type', async () => {
      mockPaymentController.initiateDirectPayment.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Order type must be "event"'
        });
      });

      const res = await request(app)
        .post('/api/payments/direct/initiate')
        .set('Authorization', 'Bearer user-token')
        .send({
          orderType: 'invalid',
          orderId: 'order_123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Order type must be "event"');
    });

    it('should return 404 for non-existent order', async () => {
      mockPaymentController.initiateDirectPayment.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      });

      const res = await request(app)
        .post('/api/payments/direct/initiate')
        .set('Authorization', 'Bearer user-token')
        .send({
          orderType: 'event',
          orderId: 'nonexistent'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Order not found');
    });
  });

  describe('POST /api/payments/direct/verify', () => {
    it('should return 200 for successful direct payment verification', async () => {
      const verificationData = {
        status: 'completed',
        amount: 1000
      };

      mockPaymentController.verifyDirectPayment.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          data: verificationData
        });
      });

      const res = await request(app)
        .post('/api/payments/direct/verify')
        .set('Authorization', 'Bearer user-token')
        .send({
          orderId: 'event_order_123',
          razorpayPaymentId: 'pay_123',
          razorpayOrderId: 'order_123',
          razorpaySignature: 'signature_123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(verificationData);
      expect(mockPaymentController.verifyDirectPayment).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for payment verification failure', async () => {
      mockPaymentController.verifyDirectPayment.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Payment verification failed'
        });
      });

      const res = await request(app)
        .post('/api/payments/direct/verify')
        .set('Authorization', 'Bearer user-token')
        .send({
          orderId: 'event_order_123',
          razorpayPaymentId: 'invalid_pay',
          razorpayOrderId: 'invalid_order',
          razorpaySignature: 'invalid_signature'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Payment verification failed');
    });
  });

  describe('GET /api/payments/outlet/:outletId/history', () => {
    it('should return 200 with outlet dine-in history', async () => {
      const outletHistory = [
        {
          _id: 'payment1',
          type: 'dine-in',
          amount: 500,
          status: 'completed',
          userId: 'user1',
          outletId: 'outlet1',
          createdAt: '2024-01-15T10:30:00Z'
        }
      ];

      mockPaymentController.getOutletDineInHistory.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: outletHistory
        });
      });

      const res = await request(app)
        .get('/api/payments/outlet/outlet1/history')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('outletId', 'outlet1');
      expect(mockPaymentController.getOutletDineInHistory).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockPaymentController.getOutletDineInHistory.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - User not logged in'
        });
      });

      const res = await request(app).get('/api/payments/outlet/outlet1/history');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - User not logged in');
    });
  });
});
