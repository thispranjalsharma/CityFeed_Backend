# CityFeed API Test Suite

Simple test cases for User and Super Admin endpoints.

## Quick Start

### Install Dependencies
```bash
npm install --save-dev jest @types/jest ts-jest
```

### Run Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:user      # User endpoint tests only
npm run test:super-admin  # Super admin endpoint tests only
```

## Test Structure

```
src/tests/
├── setup.ts              # Test environment setup
├── user.test.ts          # User endpoints
├── super-admin.test.ts   # Super admin endpoints
└── README.md            # This file
```

## Test Coverage

### User Endpoint Tests (`user.test.ts`)
- ✅ **Profile Management** - GET/PUT/DELETE `/api/users/profile`
- ✅ **Membership Upgrades** - POST `/api/users/membership/upgrade` (wallet/razorpay)
- ✅ **Payment Verification** - POST `/api/users/membership/upgrade/verify`
- ✅ **Wallet Balance** - GET `/api/users/wallet-balance`
- ✅ **Reward Points** - GET `/api/users/reward-points`
- ✅ **User Lookup by Phone** - GET `/api/users/by-phone` (admin access)

### Super Admin Tests (`super-admin.test.ts`)
- ✅ **Profile Management** - GET/PUT/DELETE `/api/super-admin/profile`
- ✅ **My Outlets** - GET `/api/super-admin/my-outlets`
- ✅ **My Outlet Admins** - GET `/api/super-admin/my-outlet-admins`
- ✅ **My Employees** - GET `/api/super-admin/my-employees`
- ✅ **My Offers** - GET `/api/super-admin/my-offers`

## Current Status

The test files are created with placeholder implementations. To make them fully functional:

1. Install Jest dependencies
2. Replace placeholder tests with actual API calls
3. Add proper assertions and error handling

## Next Steps

1. Install Jest: `npm install --save-dev jest @types/jest ts-jest`
2. Run tests: `npm test`
3. Implement actual test logic as needed 