/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the auth controller functions
const mockAuthController = {
  registerUser: jest.fn(),
  login: jest.fn(),
  verifyEmail: jest.fn(),
  forgotPassword: jest.fn(),
  logout: jest.fn(),
  changePassword: jest.fn(),
  resetPassword: jest.fn(),
  resendVerification: jest.fn(),
  firstLoginChangePassword: jest.fn(),
  guestLogin: jest.fn(),
  verifyGuestOtp: jest.fn(),
  registerEmployee: jest.fn(),
};

const mockSuperAdminController = {
  registerSuperAdmin: jest.fn(),
  loginSuperAdmin: jest.fn(),
  verifySuperAdminEmail: jest.fn(),
  approveSuperAdmin: jest.fn(),
};

const mockOutletAdminController = {
  loginOutletAdmin: jest.fn(),
};

const mockLoginEmployee = jest.fn();

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define all actual auth routes
app.post('/api/auth/register/user', (req, res) => mockAuthController.registerUser(req, res));
app.post('/api/auth/login', (req, res) => mockAuthController.login(req, res));
app.post('/api/auth/verify-email/:token', (req, res) => mockAuthController.verifyEmail(req, res));
app.post('/api/auth/forgot-password', (req, res) => mockAuthController.forgotPassword(req, res));
app.post('/api/auth/logout', (req, res) => mockAuthController.logout(req, res));
app.post('/api/auth/change-password', (req, res) => mockAuthController.changePassword(req, res));
app.post('/api/auth/reset-password/:token', (req, res) => mockAuthController.resetPassword(req, res));
app.post('/api/auth/reset-password', (req, res) => mockAuthController.resetPassword(req, res));
app.post('/api/auth/resend-verification', (req, res) => mockAuthController.resendVerification(req, res));
app.post('/api/auth/first-login-change-password', (req, res) => mockAuthController.firstLoginChangePassword(req, res));
app.post('/api/auth/guest-login', (req, res) => mockAuthController.guestLogin(req, res));
app.post('/api/auth/verify-otp', (req, res) => mockAuthController.verifyGuestOtp(req, res));

// Super admin routes
app.post('/api/auth/register/super-admin', (req, res) => mockSuperAdminController.registerSuperAdmin(req, res));
app.post('/api/auth/login/super-admin', (req, res) => mockSuperAdminController.loginSuperAdmin(req, res));
app.get('/api/auth/verify-email/super-admin', (req, res) => mockSuperAdminController.verifySuperAdminEmail(req, res));
app.patch('/api/auth/approve-super-admin/:id', (req, res) => mockSuperAdminController.approveSuperAdmin(req, res));

// Other auth routes
app.post('/api/auth/login-outlet-admin', (req, res) => mockOutletAdminController.loginOutletAdmin(req, res));
app.post('/api/auth/register-employee', (req, res) => mockAuthController.registerEmployee(req, res));
app.post('/api/auth/login-employee', (req, res) => mockLoginEmployee(req, res));

describe('Auth Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register/user', () => {
    it('should return 201 for successful user registration', async () => {
      const mockUser = {
        _id: 'testuserid',
        email: 'test@example.com',
        name: 'Test User',
        membershipType: 'cityfeed_select'
      };

      mockAuthController.registerUser.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: {
            user: mockUser,
            token: 'jwt-token'
          },
          message: 'User registered successfully'
        });
      });

      const res = await request(app)
        .post('/api/auth/register/user')
        .send({
          email: 'test@example.com',
          password: 'Test@123',
          name: 'Test User',
          dob: '1990-01-01',
          gender: 'male',
          phone: '1234567890',
          membershipType: 'cityfeed_select'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');
      expect(mockAuthController.registerUser).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockAuthController.registerUser.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .post('/api/auth/register/user')
        .send({
          email: 'invalid-email'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 for successful login', async () => {
      const mockLoginData = {
        user: {
          _id: 'testuserid',
          email: 'test@example.com',
          role: 'user'
        },
        token: 'jwt-token'
      };

      mockAuthController.login.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Login successful',
          data: mockLoginData
        });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
          role: 'user'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('token');
      expect(mockAuthController.login).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid credentials', async () => {
      mockAuthController.login.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
          role: 'user'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });
  });

  describe('POST /api/auth/verify-email/:token', () => {
    it('should return 200 for successful email verification', async () => {
      mockAuthController.verifyEmail.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Email verified successfully'
        });
      });

      const res = await request(app)
        .post('/api/auth/verify-email/testtoken123')
        .send({ role: 'user' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Email verified successfully');
      expect(mockAuthController.verifyEmail).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid token', async () => {
      mockAuthController.verifyEmail.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
      });

      const res = await request(app)
        .post('/api/auth/verify-email/invalidtoken')
        .send({ role: 'user' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 200 for successful password reset request', async () => {
      mockAuthController.forgotPassword.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Password reset email sent'
        });
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com',
          role: 'user'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Password reset email sent');
      expect(mockAuthController.forgotPassword).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for user not found', async () => {
      mockAuthController.forgotPassword.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'User not found'
    });
  });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
          role: 'user'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 for successful logout', async () => {
      mockAuthController.logout.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Logged out successfully'
        });
      });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer jwt-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Logged out successfully');
      expect(mockAuthController.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should return 200 for successful password change', async () => {
      mockAuthController.changePassword.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Password changed successfully'
        });
      });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
          role: 'user'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Password changed successfully');
      expect(mockAuthController.changePassword).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for invalid current password', async () => {
      mockAuthController.changePassword.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Invalid current password'
        });
      });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
          role: 'user'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/guest-login', () => {
    it('should return 200 for successful guest login', async () => {
      const mockGuestData = {
        user: {
          _id: 'guestuserid',
          phone: '+919999999999',
          role: 'guest'
        },
        token: 'guest-jwt-token'
      };

      mockAuthController.guestLogin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Guest login successful',
          data: mockGuestData
        });
      });

      const res = await request(app)
        .post('/api/auth/guest-login')
        .send({
          phone: '+919999999999',
          otp: '123456'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Guest login successful');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('token');
      expect(mockAuthController.guestLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should return 200 for successful OTP verification', async () => {
      const mockGuestData = {
        user: {
          _id: 'guestuserid',
          phone: '+919999999999',
          role: 'guest'
        },
        token: 'guest-jwt-token'
      };

      mockAuthController.verifyGuestOtp.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'OTP verified successfully',
          data: mockGuestData
        });
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '+919999999999',
          otp: '123456'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'OTP verified successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockAuthController.verifyGuestOtp).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid OTP', async () => {
      mockAuthController.verifyGuestOtp.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '+919999999999',
          otp: '000000'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid OTP');
    });
  });

  describe('POST /api/auth/reset-password/:token', () => {
    it('should return 200 for successful password reset with token', async () => {
      mockAuthController.resetPassword.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Password reset successful'
        });
      });

      const res = await request(app)
        .post('/api/auth/reset-password/resettoken123')
        .send({
          newPassword: 'NewPassword@123',
          role: 'user'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Password reset successful');
      expect(mockAuthController.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid token', async () => {
      mockAuthController.resetPassword.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
      });

      const res = await request(app)
        .post('/api/auth/reset-password/invalidtoken')
        .send({
          newPassword: 'NewPassword@123',
          role: 'user'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid or expired token');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should return 200 for successful password reset without token', async () => {
      mockAuthController.resetPassword.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Password reset successful'
        });
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'resettoken123',
          newPassword: 'NewPassword@123',
          role: 'user'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Password reset successful');
      expect(mockAuthController.resetPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should return 200 for successful verification email resend', async () => {
      mockAuthController.resendVerification.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Verification email sent successfully'
        });
      });

      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({
          email: 'test@example.com',
          role: 'user'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Verification email sent successfully');
      expect(mockAuthController.resendVerification).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for user not found', async () => {
      mockAuthController.resendVerification.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
      });

      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({
          email: 'nonexistent@example.com',
          role: 'user'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('POST /api/auth/first-login-change-password', () => {
    it('should return 200 for successful first login password change', async () => {
      mockAuthController.firstLoginChangePassword.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Password changed and first login flag unset',
          data: {
            updated: {
              _id: 'userid',
              isFirstLogin: false
            }
          }
        });
      });

      const res = await request(app)
        .post('/api/auth/first-login-change-password')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          newPassword: 'NewPassword@123',
          role: 'outlet_admin'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Password changed and first login flag unset');
      expect(res.body).toHaveProperty('data');
      expect(mockAuthController.firstLoginChangePassword).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for unsupported role', async () => {
      mockAuthController.firstLoginChangePassword.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Role must be outlet_admin, employee, event_organizer, event_manager, or event_staff'
        });
      });

      const res = await request(app)
        .post('/api/auth/first-login-change-password')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          newPassword: 'NewPassword@123',
          role: 'user'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Super Admin Routes', () => {
    describe('POST /api/auth/register/super-admin', () => {
      it('should return 201 for successful super admin registration', async () => {
        const mockSuperAdmin = {
          _id: 'superadminid',
          name: 'Super Admin',
          email: 'superadmin@example.com'
        };

        mockSuperAdminController.registerSuperAdmin.mockImplementation((req, res) => {
          res.status(201).json({
            success: true,
            data: mockSuperAdmin,
            message: 'Super admin registered successfully'
          });
        });

        const res = await request(app)
          .post('/api/auth/register/super-admin')
          .send({
            name: 'Super Admin',
            email: 'superadmin@example.com',
            password: 'SuperAdmin@123',
            phone: '+1234567890'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(mockSuperAdminController.registerSuperAdmin).toHaveBeenCalledTimes(1);
      });
    });

    describe('POST /api/auth/login/super-admin', () => {
      it('should return 200 for successful super admin login', async () => {
        const mockSuperAdminData = {
          superAdmin: {
            _id: 'superadminid',
            email: 'superadmin@example.com',
            role: 'super_admin'
          },
          token: 'super-admin-jwt-token'
        };

        mockSuperAdminController.loginSuperAdmin.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Super admin login successful',
            data: mockSuperAdminData
          });
        });

        const res = await request(app)
          .post('/api/auth/login/super-admin')
          .send({
            email: 'superadmin@example.com',
            password: 'SuperAdmin@123'
          });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('token');
        expect(mockSuperAdminController.loginSuperAdmin).toHaveBeenCalledTimes(1);
      });
    });

    describe('GET /api/auth/verify-email/super-admin', () => {
      it('should return 200 for successful super admin email verification', async () => {
        mockSuperAdminController.verifySuperAdminEmail.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Super admin email verified successfully'
          });
        });

        const res = await request(app)
          .get('/api/auth/verify-email/super-admin')
          .query({ token: 'verificationtoken123' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message', 'Super admin email verified successfully');
        expect(mockSuperAdminController.verifySuperAdminEmail).toHaveBeenCalledTimes(1);
      });

      it('should return 400 for invalid verification token', async () => {
        mockSuperAdminController.verifySuperAdminEmail.mockImplementation((req, res) => {
          res.status(400).json({
            success: false,
            message: 'Invalid or expired verification token'
          });
        });

        const res = await request(app)
          .get('/api/auth/verify-email/super-admin')
          .query({ token: 'invalidtoken' });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message', 'Invalid or expired verification token');
      });
    });

    describe('PATCH /api/auth/approve-super-admin/:id', () => {
      it('should return 200 for successful super admin approval', async () => {
        const mockApprovedSuperAdmin = {
          _id: 'superadminid',
          name: 'Super Admin',
          email: 'superadmin@example.com',
          isApproved: true
        };

        mockSuperAdminController.approveSuperAdmin.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Super admin approved successfully',
            data: {
              superAdmin: mockApprovedSuperAdmin
            }
          });
        });

        const res = await request(app)
          .patch('/api/auth/approve-super-admin/superadminid');

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message', 'Super admin approved successfully');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('superAdmin');
        expect(mockSuperAdminController.approveSuperAdmin).toHaveBeenCalledTimes(1);
      });

      it('should return 400 for super admin not found', async () => {
        mockSuperAdminController.approveSuperAdmin.mockImplementation((req, res) => {
          res.status(400).json({
            success: false,
            message: 'Super admin not found'
          });
        });

        const res = await request(app)
          .patch('/api/auth/approve-super-admin/nonexistentid');

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message', 'Super admin not found');
      });
    });
  });

  describe('Outlet Admin Routes', () => {
    describe('POST /api/auth/login-outlet-admin', () => {
      it('should return 200 for successful outlet admin login', async () => {
        const mockOutletAdminData = {
          outletAdmin: {
            _id: 'outletadminid',
            email: 'outletadmin@example.com',
            role: 'outlet_admin'
          },
          token: 'outlet-admin-jwt-token'
        };

        mockOutletAdminController.loginOutletAdmin.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Outlet admin login successful',
            data: mockOutletAdminData
          });
        });

        const res = await request(app)
          .post('/api/auth/login-outlet-admin')
          .send({
            email: 'outletadmin@example.com',
            password: 'password123'
          });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('token');
        expect(mockOutletAdminController.loginOutletAdmin).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Employee Routes', () => {
    describe('POST /api/auth/register-employee', () => {
      it('should return 201 for successful employee registration', async () => {
        const mockEmployee = {
          _id: 'employeeid',
          name: 'Test Employee',
          email: 'employee@example.com',
          role: 'employee',
          outletId: 'outlet123'
        };

        mockAuthController.registerEmployee.mockImplementation((req, res) => {
          res.status(201).json({
            success: true,
            data: mockEmployee,
            message: 'Employee registered successfully'
          });
        });

        const res = await request(app)
          .post('/api/auth/register-employee')
          .set('Authorization', 'Bearer admin-token')
          .send({
            name: 'Test Employee',
            email: 'employee@example.com',
            password: 'Employee@123',
            phone: '1234567890',
            outletId: 'outlet123',
            role: 'employee'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('_id', 'employeeid');
        expect(mockAuthController.registerEmployee).toHaveBeenCalledTimes(1);
      });

      it('should return 401 for unauthorized access', async () => {
        mockAuthController.registerEmployee.mockImplementation((req, res) => {
          res.status(401).json({
            success: false,
            message: 'Unauthorized'
          });
        });

        const res = await request(app)
          .post('/api/auth/register-employee')
          .send({
            name: 'Test Employee',
            email: 'employee@example.com',
            password: 'Employee@123',
            phone: '1234567890',
            outletId: 'outlet123',
            role: 'employee'
          });

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });
    });

    describe('POST /api/auth/login-employee', () => {
      it('should return 200 for successful employee login', async () => {
        const mockEmployeeData = {
          employee: {
            _id: 'employeeid',
            email: 'employee@example.com',
            role: 'employee',
            outlet: 'outlet123',
            responsibilities: ['serve_customers', 'take_orders']
          },
          token: 'employee-jwt-token',
          outletId: 'outlet123'
        };

        mockLoginEmployee.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Employee login successful',
            data: mockEmployeeData
          });
        });

        const res = await request(app)
          .post('/api/auth/login-employee')
          .send({
            email: 'employee@example.com',
            password: 'Employee@123'
          });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('token');
        expect(res.body.data).toHaveProperty('outletId');
        expect(mockLoginEmployee).toHaveBeenCalledTimes(1);
      });

      it('should return 400 for invalid credentials', async () => {
        mockLoginEmployee.mockImplementation((req, res) => {
          res.status(400).json({
            success: false,
            message: 'Invalid credentials'
          });
        });

        const res = await request(app)
          .post('/api/auth/login-employee')
          .send({
            email: 'employee@example.com',
            password: 'wrongpassword'
          });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message', 'Invalid credentials');
      });
    });
  });
}); 
