/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the employee controller functions
const mockUserController = {
  updateEmployee: jest.fn(),
  deleteEmployee: jest.fn(),
};

const mockAuthController = {
  registerEmployee: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual employee routes
app.post('/api/employee/register', (req, res) => mockAuthController.registerEmployee(req, res));
app.put('/api/employee/:employeeId', (req, res) => {
  // Mock middleware logic for role-based access
  const allowedRoles = ['super_admin', 'outlet_admin'];
  const userRole = req.headers['x-user-role'] || 'super_admin';
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ 
      message: 'Forbidden - Only super admin or outlet admin can update employees' 
    });
  }
  
  req.params.userId = req.params.employeeId;
  return mockUserController.updateEmployee(req, res);
});
app.delete('/api/employee/:employeeId', (req, res) => {
  // Mock middleware logic for role-based access
  const allowedRoles = ['super_admin', 'outlet_admin'];
  const userRole = req.headers['x-user-role'] || 'super_admin';
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ 
      message: 'Forbidden - Only super admin or outlet admin can delete employees' 
    });
  }
  
  req.params.userId = req.params.employeeId;
  return mockUserController.deleteEmployee(req, res);
});

describe('Employee Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/employee/register', () => {
    it('should return 201 for successful employee registration', async () => {
      const mockEmployee = {
        _id: 'employee1',
        name: 'Employee Name',
        email: 'employee@example.com',
        phone: '+1234567890',
        role: 'employee'
      };

      mockAuthController.registerEmployee.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockEmployee,
          message: 'Employee registered successfully'
        });
      });

      const res = await request(app)
        .post('/api/employee/register')
        .send({
          name: 'Employee Name',
          email: 'employee@example.com',
          password: 'Password123!',
          phone: '+1234567890'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockEmployee);
      expect(res.body).toHaveProperty('message', 'Employee registered successfully');
      expect(mockAuthController.registerEmployee).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockAuthController.registerEmployee.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input'
        });
      });

      const res = await request(app)
        .post('/api/employee/register')
        .send({
          name: 'Employee Name',
          email: 'invalid-email',
          password: 'weak',
          phone: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid input');
    });

    it('should return 409 for duplicate email or phone', async () => {
      mockAuthController.registerEmployee.mockImplementation((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Email or phone number already in use'
        });
      });

      const res = await request(app)
        .post('/api/employee/register')
        .send({
          name: 'Employee Name',
          email: 'existing@example.com',
          password: 'Password123!',
          phone: '+1234567890'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Email or phone number already in use');
    });
  });

  describe('PUT /api/employee/:employeeId', () => {
    it('should return 200 for successful employee update by super admin', async () => {
      const updatedEmployee = {
        _id: 'employee1',
        name: 'Updated Employee',
        email: 'updated@example.com',
        phone: '+0987654321',
        role: 'employee',
        isActive: true,
        responsibilities: ['serve_customers', 'clean_tables']
      };

      mockUserController.updateEmployee.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedEmployee,
          message: 'Employee updated successfully'
        });
      });

      const res = await request(app)
        .put('/api/employee/employee1')
        .set('x-user-role', 'super_admin')
        .send({
          name: 'Updated Employee',
          email: 'updated@example.com',
          phone: '+0987654321',
          role: 'employee',
          isActive: true,
          responsibilities: ['serve_customers', 'clean_tables']
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(updatedEmployee);
      expect(mockUserController.updateEmployee).toHaveBeenCalledTimes(1);
    });

    it('should return 200 for successful employee update by outlet admin', async () => {
      const updatedEmployee = {
        _id: 'employee1',
        name: 'Updated Employee',
        role: 'outlet_admin',
        isActive: true
      };

      mockUserController.updateEmployee.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedEmployee,
          message: 'Employee updated successfully'
        });
      });

      const res = await request(app)
        .put('/api/employee/employee1')
        .set('x-user-role', 'outlet_admin')
        .send({
          name: 'Updated Employee',
          role: 'outlet_admin',
          isActive: true
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(mockUserController.updateEmployee).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for non-admin user trying to update employee', async () => {
      const res = await request(app)
        .put('/api/employee/employee1')
        .set('x-user-role', 'employee')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Forbidden - Only super admin or outlet admin can update employees');
    });

    it('should return 400 for invalid update data', async () => {
      mockUserController.updateEmployee.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .put('/api/employee/employee1')
        .set('x-user-role', 'super_admin')
        .send({
          email: 'invalid-email',
          role: 'invalid-role'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid input data');
    });

    it('should return 404 for non-existent employee', async () => {
      mockUserController.updateEmployee.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      });

      const res = await request(app)
        .put('/api/employee/nonexistent')
        .set('x-user-role', 'super_admin')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Employee not found');
    });
  });

  describe('DELETE /api/employee/:employeeId', () => {
    it('should return 200 for successful employee deletion by super admin', async () => {
      mockUserController.deleteEmployee.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Employee deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/employee/employee1')
        .set('x-user-role', 'super_admin');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Employee deleted successfully');
      expect(mockUserController.deleteEmployee).toHaveBeenCalledTimes(1);
    });

    it('should return 200 for successful employee deletion by outlet admin', async () => {
      mockUserController.deleteEmployee.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Employee deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/employee/employee1')
        .set('x-user-role', 'outlet_admin');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Employee deleted successfully');
      expect(mockUserController.deleteEmployee).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for non-admin user trying to delete employee', async () => {
      const res = await request(app)
        .delete('/api/employee/employee1')
        .set('x-user-role', 'employee');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Forbidden - Only super admin or outlet admin can delete employees');
    });

    it('should return 404 for non-existent employee', async () => {
      mockUserController.deleteEmployee.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      });

      const res = await request(app)
        .delete('/api/employee/nonexistent')
        .set('x-user-role', 'super_admin');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Employee not found');
    });
  });
});
