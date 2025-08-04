# CityFeed API Documentation 📚

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [User Types & Roles](#user-types--roles)
5. [Complete System Flows Overview](#complete-system-flows-overview)
6. [Complete Business Flows](#complete-business-flows)
   - [Super Admin Flow](#super-admin-flow)
   - [Outlet Admin Flow](#outlet-admin-flow)
   - [Employee Flow](#employee-flow)
7. [Complete Customer Flow](#complete-customer-flow)
8. [All API Endpoints Reference](#all-api-endpoints-reference)
9. [Error Codes](#error-codes)

---

## Introduction 🎯

**CityFeed** is a comprehensive food business management system that connects customers, merchants (restaurants, cafes, food businesses), and employees. This API enables:

- **For Business Owners**: Manage outlets, employees, offers, and operations
- **For Customers**: Browse merchants, place orders, make payments, and leave reviews
- **For Employees**: Handle orders, manage inventory, and serve customers

---

## Getting Started 🚀

### Base URL
```
https://your-domain.com/api
```

### Health Check
```
GET /health
```
Check if the server is running. Returns `{ "status": "ok" }`

---

## Authentication 🔐

Most API calls require authentication using a **Bearer Token**.

### How to Get a Token:
1. Register or Login using the auth endpoints
2. Copy the `token` from the response
3. Add it to your request headers: `Authorization: Bearer your-token-here`

### Example:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://your-domain.com/api/users/profile
```

---

## User Types & Roles 👥

### 1. **Super Admin**
- Manages multiple merchant outlets
- Approves outlet registrations
- Manages outlet admins and employees
- Has access to all system data

### 2. **Outlet Admin**
- Manages a specific merchant outlet
- Creates offers and manages employees
- Views outlet analytics and performance

### 3. **Employee**
- Works at a specific merchant outlet
- Handles orders and customer service
- Has specific responsibilities assigned by admin

### 4. **User** (Customer)
- Browses merchants and offers
- Places orders and makes payments
- Leaves reviews and feedback
- Has membership levels (Select, Edge, Prime)

### 5. **Admin**
- System administrator with limited access
- Manages users and basic system functions

---

## Complete System Flows Overview 🔄

### **Business Side Flow (Super Admin → Outlet Admin → Employees)**

```
1. SUPER ADMIN FLOW 👑
   ├── Register & Get Approved
   ├── Register Merchant Outlets
   ├── Assign Outlet Admins
   ├── Manage Employees
   └── View Analytics

2. OUTLET ADMIN FLOW 🏪
   ├── Login & Manage Outlet
   ├── Create Offers
   ├── Manage Employees
   └── View Performance

3. EMPLOYEE FLOW 👷
   ├── Login & View Outlet
   ├── Manage Profile
   └── View Offers
```

### **Customer Side Flow (User Journey)**

```
1. CUSTOMER FLOW 👤
   ├── Register with Membership
   ├── Browse Merchants & Offers
   ├── Manage Profile & Wallet
   ├── Dine-In Experience
   ├── Leave Reviews & Feedback
   └── Account Management
```

### **Complete System Architecture**

```
SUPER ADMIN
    ↓ (manages)
MERCHANT OUTLETS
    ↓ (employs)
OUTLET ADMINS
    ↓ (manages)
EMPLOYEES
    ↓ (serves)
CUSTOMERS (USERS)
```

### **Key Business Processes**

#### **Merchant Onboarding Process:**
1. Super Admin registers merchant outlet
2. Outlet gets approved/rejected
3. Outlet Admin is assigned
4. Employees are hired
5. Offers are created
6. Customers can discover and use

#### **Customer Journey:**
1. Customer registers with membership
2. Browses approved merchant outlets
3. Views available offers
4. Manages wallet and payments
5. Experiences dine-in service
6. Leaves reviews and feedback

---

## Complete Business Flows 🏢

---

## Super Admin Flow 👑

### **Step 1: Super Admin Registration & Approval**

#### 1.1 Register as Super Admin
```
POST /auth/register/super-admin
```

**What it does:** Registers a new super admin (requires approval).

**Required Information:**
- Email address
- Password
- Full name
- Phone number

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/auth/register/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "password123",
    "name": "Super Admin",
    "phone": "+1234567890"
  }'
```

#### 1.2 Verify Email
```
GET /auth/verify-email/super-admin
```

**What it does:** Verifies super admin email address.

#### 1.3 Login as Super Admin
```
POST /auth/login/super-admin
```

**What it does:** Logs in super admin specifically.

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/auth/login/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "password123"
  }'
```

### **Step 2: Manage Merchant Outlets**

#### 2.1 Register New Merchant Outlet
```
POST /outlets
```

**What it does:** Registers a new merchant outlet under the super admin.

**Required Information:**
- Merchant outlet name
- Address
- Contact information
- Owner details
- Images (optional)

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/outlets \
  -H "Authorization: Bearer your-super-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Palace",
    "address": "456 Food St, City",
    "phone": "+1234567890",
    "email": "pizza@example.com",
    "ownerName": "Jane Smith",
    "ownerPhone": "+1234567890"
  }'
```

#### 2.2 View My Merchant Outlets
```
GET /super-admin/my-outlets
```

**What it does:** Shows all merchant outlets managed by the super admin.

#### 2.3 Update Outlet Status
```
PATCH /outlets/{outletId}/status
```

**What it does:** Approves or disapproves a merchant outlet.

### **Step 3: Manage Outlet Admins**

#### 3.1 Register New Outlet Admin
```
POST /outlet-admin/register
```

**What it does:** Registers a new outlet admin (Super Admin only).

**Required Information:**
- Outlet admin name
- Email address
- Password
- Phone number

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/outlet-admin/register \
  -H "Authorization: Bearer your-super-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Outlet Admin Name",
    "email": "outletadmin@example.com",
    "password": "StrongP@ssw0rd123",
    "phone": "+1234567890"
  }'
```

**Note:** Only super admins can create outlet admins. The outlet admin will receive a verification email upon registration.

**Example Request:**
```bash
curl -X PATCH https://your-domain.com/api/outlets/merchant123/status \
  -H "Authorization: Bearer your-super-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

#### 2.4 Search Merchant Outlets
```
GET /outlets/search
```

**What it does:** Searches merchant outlets by various criteria.

#### 2.5 Get Outlets by Status
```
GET /outlets/status/:status
```

**What it does:** Gets merchant outlets by approval status (pending/approved/rejected).

### **Step 4: Manage Outlet Admins**

#### 4.1 Assign Admin to Outlet
```
PATCH /outlets/assign-admin
```

**What it does:** Assigns an outlet admin to manage a specific merchant outlet.

**Example Request:**
```bash
curl -X PATCH https://your-domain.com/api/outlets/assign-admin \
  -H "Authorization: Bearer your-super-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "outletId": "merchant123",
    "adminEmail": "outletadmin@example.com"
  }'
```

#### 4.2 View My Outlet Admins
```
GET /super-admin/my-outlet-admins
```

**What it does:** Shows all outlet admins managed by the super admin.

#### 4.3 Remove Admin from Outlet
```
PATCH /outlets/{outletId}/remove-admin
```

**What it does:** Removes an admin from a merchant outlet.

### **Step 5: Manage Employees**

#### 5.1 Add Employee to Merchant Outlet
```
POST /outlets/{outletId}/roles
```

**What it does:** Hires a new employee for a merchant outlet.

**Required Information:**
- Employee email
- Password
- Phone number
- Role (employee/outlet_admin)
- Responsibilities (list of tasks)

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/outlets/merchant123/roles \
  -H "Authorization: Bearer your-super-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@merchant.com",
    "password": "password123",
    "phone": "+1234567890",
    "role": "employee",
    "responsibilities": ["Customer Service", "Order Management"]
  }'
```

#### 5.2 View My Employees
```
GET /super-admin/my-employees
```

**What it does:** Shows all employees managed by the super admin.

#### 5.3 Update Employee
```
PUT /employee/{employeeId}
```

**What it does:** Updates employee information.

**Example Request:**
```bash
curl -X PUT https://your-domain.com/api/employee/employee123 \
  -H "Authorization: Bearer your-super-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Employee Name",
    "isActive": true,
    "responsibilities": ["Customer Service", "Inventory Management"]
  }'
```

#### 5.4 Delete Employee
```
DELETE /employee/{employeeId}
```

**What it does:** Removes an employee from the merchant outlet.

### **Step 6: Super Admin Profile Management**

#### 6.1 Get My Profile
```
GET /super-admin/profile
```

**What it does:** Shows super admin profile information.

#### 6.2 Update My Profile
```
PUT /super-admin/profile
```

**What it does:** Updates super admin profile information (only name and phone can be modified).

**Example Request:**
```bash
curl -X PUT https://your-domain.com/api/super-admin/profile \
  -H "Authorization: Bearer your-super-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Super Admin Name",
    "phone": "+1234567890"
  }'
```

**Note:** Email cannot be updated. Only name and phone fields are allowed for modification.

#### 6.3 Delete My Profile
```
DELETE /super-admin/profile
```

**What it does:** Deletes super admin account.

### **Step 7: View Analytics & Reports**

#### 7.1 View My Offers
```
GET /super-admin/my-offers
```

**What it does:** Shows all offers from merchant outlets managed by super admin.

---

## Outlet Admin Flow 🏪

### **Step 1: Outlet Admin Login**

#### 1.1 Login as Outlet Admin
```
POST /auth/login-outlet-admin
```

**What it does:** Logs in outlet admin specifically.

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/auth/login-outlet-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "outletadmin@example.com",
    "password": "password123"
  }'
```

### **Step 2: Manage My Outlet**

#### 2.1 View My Outlet
```
GET /outlet-admin/my-outlet
```

**What it does:** Shows the merchant outlet managed by the outlet admin.

#### 2.2 Update My Outlet
```
PUT /outlets/{outletId}
```

**What it does:** Updates merchant outlet information.

**Example Request:**
```bash
curl -X PUT https://your-domain.com/api/outlets/merchant123 \
  -H "Authorization: Bearer your-outlet-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Pizza Palace",
    "address": "Updated Address",
    "phone": "+1234567890"
  }'
```

### **Step 3: Manage Employees**

#### 3.1 View My Employees
```
GET /api/outlet-admin/my-employees
```

**What it does:** Shows employees working at the outlet admin's merchant outlet.

**Response:**
```json
{
  "success": true,
  "data": {
    "outlet": {
      "_id": "outlet_id",
      "name": "Restaurant Name", 
      "address": "123 Main St, City"
    },
    "employees": [
      {
        "_id": "employee_id",
        "name": "John Employee",
        "email": "john@restaurant.com",
        "phone": "+1234567890",
        "role": "employee",
        "responsibilities": ["create_offer", "view_order"],
        "isActive": true,
        "isEmailVerified": true,
        "outlet": "outlet_id"
      }
    ],
    "totalEmployees": 5
  }
}
```

#### 3.2 Add Employee
```
POST /outlets/{outletId}/roles
```

**What it does:** Hires a new employee for the merchant outlet.

#### 3.3 Update Employee
```
PUT /employee/{employeeId}
```

**What it does:** Updates employee information.

#### 3.4 Delete Employee
```
DELETE /employee/{employeeId}
```

**What it does:** Removes an employee from the merchant outlet.

### **Step 4: Manage Offers**

#### 4.1 Create Offer
```
POST /offers
```

**What it does:** Creates a new discount or promotion for the merchant outlet.

**Required Information:**
- Offer title
- Description
- Discount percentage
- Valid dates
- Merchant outlet ID

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/offers \
  -H "Authorization: Bearer your-outlet-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Happy Hour Discount",
    "description": "50% off on all drinks",
    "discountPercentage": 50,
    "validFrom": "2024-01-01",
    "validTo": "2024-12-31",
    "outletId": "merchant123"
  }'
```

#### 4.2 View My Offers
```
GET /outlet-admin/my-offers
```

**What it does:** Shows all offers for the outlet admin's merchant outlet.

#### 4.3 Update Offer
```
PUT /offers/{id}
```

**What it does:** Updates an existing offer.

#### 4.4 Delete Offer
```
DELETE /offers/{id}
```

**What it does:** Removes an offer from the system.

### **Step 5: Outlet Admin Profile Management**

#### 5.1 Get My Profile
```
GET /outlet-admin/profile
```

**What it does:** Shows outlet admin profile information.

#### 5.2 Update My Profile
```
PUT /outlet-admin/profile
```

**What it does:** Updates outlet admin profile information (only name and phone can be modified).

**Example Request:**
```bash
curl -X PUT https://your-domain.com/api/outlet-admin/profile \
  -H "Authorization: Bearer your-outlet-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Outlet Admin Name",
    "phone": "+1234567890"
  }'
```

**Note:** Email cannot be updated. Only name and phone fields are allowed for modification.

#### 5.3 Delete My Profile
```
DELETE /outlet-admin/profile
```

**What it does:** Deletes outlet admin account.

---

## Employee Flow 👷

### **Step 1: Employee Login**

#### 1.1 Login as Employee
```
POST /auth/login-employee
```

**What it does:** Logs in employee specifically.

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/auth/login-employee \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@merchant.com",
    "password": "password123"
  }'
```

### **Step 2: Employee Profile Management**

#### 2.1 Get My Profile
```
GET /employee/profile
```

**What it does:** Shows employee profile information.

#### 2.2 Update My Profile
```
PUT /employee/profile
```

**What it does:** Updates employee profile information.

**Example Request:**
```bash
curl -X PUT https://your-domain.com/api/employee/profile \
  -H "Authorization: Bearer your-employee-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Employee Name",
    "phone": "+1234567890"
  }'
```

#### 2.3 Delete My Profile
```
DELETE /employee/profile
```

**What it does:** Deletes employee account.

### **Step 3: View Outlet Information**

#### 3.1 View My Outlet
```
GET /outlets/{outletId}
```

**What it does:** Shows details of the merchant outlet where employee works.

#### 3.2 View Outlet Offers
```
GET /offers/outlet/{outletId}
```

**What it does:** Shows all offers for the employee's merchant outlet.

---

## Complete Customer Flow 👤

### **Step 1: Customer Registration & Membership**

#### 1.1 Register as Customer
```
POST /auth/register/user
```

**What it does:** Creates a new customer account with membership payment.

**Required Information:**
- Email address
- Password (at least 6 characters)
- Full name
- Date of birth
- Gender (male/female/other)
- Phone number
- Membership type (cityfeed_select/edge/prime)

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/auth/register/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "name": "John Doe",
    "dob": "1990-01-01",
    "gender": "male",
    "phone": "+1234567890",
    "membershipType": "cityfeed_select"
  }'
```

#### 1.2 Verify Email
```
POST /auth/verify-email/:token
```

**What it does:** Verifies customer email address.

#### 1.3 Login as Customer
```
POST /auth/login
```

**What it does:** Logs in customer.

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### **Step 2: Browse & Discover**

#### 2.1 Browse All Merchant Outlets
```
GET /outlets
```

**What it does:** Shows all approved merchant outlets in the system.

#### 2.2 Search Merchant Outlets
```
GET /outlets/search
```

**What it does:** Searches merchant outlets by name, location, etc.

#### 2.3 Get Merchant Outlet Details
```
GET /outlets/{outletId}
```

**What it does:** Shows detailed information about a specific merchant outlet.

#### 2.4 Browse All Offers
```
GET /offers
```

**What it does:** Shows all available offers in the system.

#### 2.5 Get Offers Valid Today
```
GET /offers/valid-today
```

**What it does:** Shows offers that are currently valid.

#### 2.6 Get Merchant Outlet Offers
```
GET /offers/outlet/{outletId}
```

**What it does:** Shows all offers for a specific merchant outlet.

### **Step 3: Profile & Account Management**

#### 3.1 Get My Profile
```
GET /users/profile
```

**What it does:** Shows customer profile information.

#### 3.2 Update My Profile
```
PUT /users/profile
```

**What it does:** Updates customer profile information.

**Example Request:**
```bash
curl -X PUT https://your-domain.com/api/users/profile \
  -H "Authorization: Bearer your-customer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "dob": "1990-01-01",
    "gender": "male",
    "address": "123 Main St, City"
  }'
```

#### 3.3 Upgrade Membership
```
POST /users/membership/upgrade
```

**What it does:** Upgrades customer membership level.

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/users/membership/upgrade \
  -H "Authorization: Bearer your-customer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "targetMembershipType": "cityfeed_prime",
    "paymentMethod": "razorpay"
  }'
```

#### 3.4 Verify Membership Upgrade
```
POST /users/membership/upgrade/verify
```

**What it does:** Verifies membership upgrade payment.

### **Step 4: Payment & Wallet**

#### 4.1 Add Money to Wallet
```
POST /payments/wallet/add
```

**What it does:** Adds money to customer wallet.

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/payments/wallet/add \
  -H "Authorization: Bearer your-customer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "paymentMethod": "razorpay"
  }'
```

#### 4.2 Get Wallet Balance
```
GET /users/wallet-balance
```

**What it does:** Shows customer wallet balance.

#### 4.3 Get Payment History
```
GET /payments/history
```

**What it does:** Shows customer payment history.

#### 4.4 Get Reward Points
```
GET /users/reward-points
```

**What it does:** Shows customer reward points balance.

### **Step 5: Dine-In Experience**

#### 5.1 Create Dine-In Session
```
POST /dine-in/sessions
```

**What it does:** Creates a new dine-in session for customers.

#### 5.2 Get Dine-In Session
```
GET /dine-in/sessions/{sessionId}
```

**What it does:** Gets details of a specific dine-in session.

### **Step 6: Reviews & Feedback**

#### 6.1 Leave Review
```
POST /reviews
```

**What it does:** Allows customers to leave reviews for merchant outlets.

**Example Request:**
```bash
curl -X POST https://your-domain.com/api/reviews \
  -H "Authorization: Bearer your-customer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "outletId": "merchant123",
    "rating": 5,
    "comment": "Great food and service!"
  }'
```

#### 6.2 View Merchant Outlet Reviews
```
GET /reviews/outlet/{outletId}
```

**What it does:** Shows all reviews for a specific merchant outlet.

#### 6.3 View My Reviews
```
GET /reviews/user
```

**What it does:** Shows reviews left by the customer.

#### 6.4 Update My Review
```
PUT /reviews/{id}
```

**What it does:** Updates an existing review.

#### 6.5 Delete My Review
```
DELETE /reviews/{id}
```

**What it does:** Deletes a review.

#### 6.6 Submit Feedback
```
POST /feedback
```

**What it does:** Allows customers to submit general feedback about the system.

#### 6.7 View My Feedback
```
GET /feedback/my-feedback
```

**What it does:** Shows feedback submitted by the customer.

### **Step 7: Account Management**

#### 7.1 Find User by Phone
```
GET /users/by-phone?phone=+1234567890
```

**What it does:** Finds a user account using phone number.

#### 7.2 Delete My Profile
```
DELETE /users/profile
```

**What it does:** Permanently deletes customer account.

#### 7.3 Logout
```
POST /auth/logout
```

**What it does:** Logs out the customer and invalidates their token.

---

## All API Endpoints Reference 📋

### Authentication Endpoints
- `POST /auth/register/user` - Register customer
- `POST /auth/register/super-admin` - Register super admin
- `POST /auth/register-employee` - Register employee
- `POST /auth/login` - Login all users
- `POST /auth/login/super-admin` - Login super admin
- `POST /auth/login-outlet-admin` - Login outlet admin
- `POST /auth/login-employee` - Login employee
- `POST /auth/logout` - Logout
- `POST /auth/verify-email/:token` - Verify email
- `GET /auth/verify-email/super-admin` - Verify super admin email
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/change-password` - Change password
- `PATCH /auth/approve-super-admin/:id` - Approve super admin

### User Management
- `GET /users/profile` - Get profile
- `PUT /users/profile` - Update profile
- `DELETE /users/profile` - Delete profile
- `GET /users/by-phone` - Find user by phone
- `GET /users/wallet-balance` - Get wallet balance
- `GET /users/reward-points` - Get reward points
- `POST /users/membership/upgrade` - Upgrade membership
- `POST /users/membership/upgrade/verify` - Verify membership upgrade

### Merchant Outlet Management
- `POST /outlets` - Register outlet
- `GET /outlets` - Get all outlets
- `GET /outlets/{outletId}` - Get outlet details
- `PUT /outlets/{outletId}` - Update outlet
- `DELETE /outlets/{outletId}` - Delete outlet
- `GET /outlets/search` - Search outlets
- `GET /outlets/status/:status` - Get outlets by status
- `PATCH /outlets/{outletId}/status` - Update outlet status
- `PATCH /outlets/assign-admin` - Assign admin
- `PATCH /outlets/{outletId}/remove-admin` - Remove admin

### Employee Management
- `POST /outlets/{outletId}/roles` - Add employee
- `GET /outlet-role-assignment/{outletId}/roles` - Get outlet employees
- `PUT /employee/{employeeId}` - Update employee
- `DELETE /employee/{employeeId}` - Delete employee
- `GET /employee/profile` - Get employee profile
- `PUT /employee/profile` - Update employee profile
- `DELETE /employee/profile` - Delete employee profile

### Offer Management
- `POST /offers` - Create offer
- `GET /offers` - Get all offers
- `GET /offers/{id}` - Get offer by ID
- `GET /offers/valid-today` - Get valid offers
- `GET /offers/outlet/{outletId}` - Get outlet offers
- `PUT /offers/{id}` - Update offer
- `DELETE /offers/{id}` - Delete offer
- `GET /outlet-admin/my-offers` - Get my offers (outlet admin)
- `GET /super-admin/my-offers` - Get my offers (super admin)

### Payment & Wallet
- `POST /payments/membership/initiate` - Initiate membership payment
- `POST /payments/membership/verify` - Verify membership payment
- `POST /payments/wallet/add` - Add money to wallet
- `GET /payments/wallet/balance` - Get wallet balance
- `GET /payments/history` - Get payment history
- `POST /payments/process` - Process payment
- `POST /payments/refund` - Refund payment
- `GET /payments/transaction/{transactionId}` - Get transaction details

### Reviews & Feedback
- `POST /reviews` - Leave review
- `GET /reviews/outlet/{outletId}` - Get outlet reviews
- `GET /reviews/user` - Get my reviews
- `PUT /reviews/{id}` - Update review
- `DELETE /reviews/{id}` - Delete review
- `POST /feedback` - Submit feedback
- `GET /feedback/my-feedback` - Get my feedback

### Dine-In Sessions
- `POST /dine-in/sessions` - Create dine-in session
- `GET /dine-in/sessions/{sessionId}` - Get dine-in session
- `GET /reviews/session/{dineInSessionId}` - Get session reviews

### Admin Functions
- `GET /admin/users` - Get all users
- `POST /admin/users/{userId}/deactivate` - Deactivate user
- `GET /admin/super-admins` - Get all super admins
- `GET /admin/outlet-admins` - Get all outlet admins
- `GET /admin/outlets` - Get all outlets
- `GET /admin/employees` - Get all employees

### Super Admin Functions
- `GET /super-admin/my-outlets` - Get my outlets
- `GET /super-admin/my-outlet-admins` - Get my outlet admins
- `GET /super-admin/my-employees` - Get my employees
- `GET /super-admin/profile` - Get profile
- `PUT /super-admin/profile` - Update profile
- `DELETE /super-admin/profile` - Delete profile
- `PATCH /super-admin/disapprove/:id` - Disapprove super admin

### Outlet Admin Functions
- `GET /outlet-admin/my-outlet` - Get my outlet
- `GET /outlet-admin/my-employees` - Get my employees
- `GET /outlet-admin/profile` - Get profile
- `PUT /outlet-admin/profile` - Update profile
- `DELETE /outlet-admin/profile` - Delete profile

---

## Error Codes ❌

| Code | Meaning | What to do |
|------|---------|------------|
| 200 | Success | Everything worked! |
| 201 | Created | New item was created successfully |
| 400 | Bad Request | Check your input data |
| 401 | Unauthorized | You need to log in first |
| 403 | Forbidden | You don't have permission for this |
| 404 | Not Found | The item you're looking for doesn't exist |
| 409 | Conflict | Item already exists (like duplicate email) |
| 500 | Server Error | Something went wrong on our end |

---

## Need Help? 🤝

If you have questions or need help:
1. Check the error messages carefully
2. Make sure you're using the correct HTTP method (GET, POST, PUT, DELETE, PATCH)
3. Verify your authentication token is valid
4. Check that all required fields are provided
5. Ensure you have the correct permissions for the endpoint

---

**Happy Coding! 🎉**