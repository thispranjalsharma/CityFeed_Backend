# Registration Transactions Fix

## Problem Description

When users registered through the API `POST /api/auth/register/user`, they would pay a membership fee and receive joining reward points, but these transactions were not appearing in the user's transaction history when accessed via `GET /api/payments/transactions`.

### Issues Identified:

1. **Registration payments not recorded**: Pre-registration payments were stored in `PreRegistrationPayment` collection but not transferred to the main `Payment` collection
2. **Joining rewards not tracked**: Initial reward points given during registration were not recorded in `RewardHistory`
3. **Transaction history incomplete**: The `/api/payments/transactions` endpoint only showed payment transactions, not reward transactions

## Solution Implemented

### 1. Enhanced User Registration Process

**File**: `src/services/auth.service.ts`

- **Added imports**: `Payment` and `RewardHistory` models
- **Modified `registerUser` method**: 
  - Retrieves pre-registration payment details
  - Creates a `membership_upgrade` payment record in the main `Payment` collection
  - Creates a reward history record for joining reward points
  - Links the payment to the user's account

```typescript
// Create payment record for registration
if (preRegistrationPayment) {
  const membershipPrices: Record<string, number> = {
    cityfeed_select: 499,
    cityfeed_edge: 999,
    cityfeed_prime: 1499,
  };
  
  const registrationPayment = new Payment({
    userId: user._id.toString(),
    amount: membershipPrices[userData.membershipType as keyof typeof membershipPrices] || 0,
    type: 'membership_upgrade',
    status: 'completed',
    paymentMethod: 'razorpay',
    razorpayOrderId: preRegistrationPayment.razorpayOrderId,
    createdAt: new Date()
  });
  await registrationPayment.save();
}

// Create reward history record for joining reward points
if (initialCoins > 0) {
  const rewardHistory = new RewardHistory({
    userId: user._id.toString(),
    transactionType: 'earned',
    amount: initialCoins,
    sourceType: 'membership',
    description: `Joining reward points for ${userData.membershipType} membership`,
    balanceBefore: 0,
    balanceAfter: initialCoins,
    createdAt: new Date()
  });
  await rewardHistory.save();
}
```

### 2. Enhanced Transaction History API

**File**: `src/controllers/payment.controller.ts`

- **Modified `getTransactionHistory` method**:
  - Now retrieves both payment transactions and reward history transactions
  - Combines and sorts all transactions by date
  - Enriches transactions with additional details
  - Handles both payment and reward transaction types

```typescript
// Get payment transactions
const transactions = await this.paymentService.getTransactionHistory(userId);

// Get reward history transactions
const rewardTransactions = await this.rewardHistoryRepository.find({ userId });

// Combine and sort all transactions by date
const allTransactions = [
  ...transactions.map((txn: any) => ({
    ...txn.toObject(),
    transactionType: 'payment',
    originalType: txn.type
  })),
  ...rewardTransactions.map((reward: any) => ({
    _id: reward._id,
    userId: reward.userId,
    type: 'reward',
    amount: reward.amount,
    transactionType: reward.transactionType,
    sourceType: reward.sourceType,
    description: reward.description,
    balanceBefore: reward.balanceBefore,
    balanceAfter: reward.balanceAfter,
    createdAt: reward.createdAt,
    updatedAt: reward.updatedAt,
    originalType: 'reward'
  }))
].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
```

### 3. Enhanced User Service

**File**: `src/services/user.service.ts`

- **Updated `getUserTransactions` method**:
  - Now returns both payment and reward transactions
  - Combines and sorts transactions chronologically
  - Provides consistent transaction format

### 4. Updated User Controller

**File**: `src/controllers/user.controller.ts`

- The `getUserTransactions` endpoint now automatically benefits from the enhanced service
- Returns complete transaction history including registration payments and joining rewards

## Transaction Types Now Supported

### Payment Transactions:
- `dine-in`: Dine-in session payments
- `event`: Event ticket purchases
- `recharge`: Wallet recharge payments
- `membership_upgrade`: **NEW** - Registration/membership payments
- `refund`: Refund transactions

### Reward Transactions:
- `earned`: Reward points earned (dine-in, events, referrals, membership)
- `used`: Reward points used for payments
- `adjustment`: Manual adjustments
- `refund`: Refunded reward points

## API Response Format

The `/api/payments/transactions` endpoint now returns:

```json
[
  {
    "_id": "transaction_id",
    "userId": "user_id",
    "type": "membership_upgrade", // or "reward"
    "transactionType": "payment", // or "reward"
    "originalType": "membership_upgrade", // original payment type
    "amount": 999,
    "status": "completed",
    "paymentMethod": "razorpay",
    "razorpayOrderId": "order_xxx",
    "description": "Joining reward points for cityfeed_edge membership",
    "balanceBefore": 0,
    "balanceAfter": 100,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Testing

To verify the fix works:

1. **Register a new user** with membership payment
2. **Check transaction history** via `/api/payments/transactions`
3. **Verify both payment and reward records** are present
4. **Confirm chronological ordering** of transactions

## Benefits

1. **Complete transaction history**: Users can now see all their financial activities
2. **Transparency**: Registration payments and joining rewards are clearly visible
3. **Audit trail**: All transactions are properly recorded and traceable
4. **Consistent API**: Both payment and reward transactions follow the same format
5. **Backward compatibility**: Existing functionality remains unchanged

## Migration Notes

- **No database migration required**: Existing data remains intact
- **New transactions**: Only new registrations will have the enhanced records
- **Historical data**: Existing users won't have registration payment records (this is expected)
- **Reward history**: Existing reward transactions will now appear in transaction history

## Swagger Documentation Updates

### New Schemas Added:

1. **PreRegistrationPayment Schema**:
   - Complete schema with all fields including new audit fields
   - Status enum: `pending`, `success`, `failed`, `consumed`
   - Audit fields: `consumedAt`, `userId`, `paymentId`

2. **RewardHistory Schema**:
   - Complete reward transaction schema
   - Transaction types: `earned`, `used`, `adjustment`, `refund`
   - Source types: `dine-in`, `event`, `referral`, `membership`, `adjustment`, `refund`

### Updated Payment Schema:
- Added `membership_upgrade` to payment type enum
- Enhanced payment method enum
- Added status enum values

### Enhanced Transaction API Documentation:
- Updated `/api/payments/transactions` endpoint
- Added new transaction types: `membership_upgrade`, `event`, `reward`
- Added new fields: `transactionType`, `originalType`
- Complete documentation for reward transactions

### New Admin Endpoint Documentation:
- `/api/admin/pre-registration-payments` endpoint
- Query parameters for filtering
- Complete response schema

## Enhanced Pre-Registration Payment Handling

### Changes Made:

1. **Pre-registration records are now preserved** instead of being deleted
2. **New status**: Added `consumed` status to track used payments
3. **Audit fields**: Added `consumedAt`, `userId`, and `paymentId` fields
4. **Admin endpoint**: New `/api/admin/pre-registration-payments` endpoint for audit purposes

### Pre-Registration Payment Statuses:

- **`pending`**: Payment initiated but not completed
- **`success`**: Payment completed successfully, ready for registration
- **`failed`**: Payment failed
- **`consumed`**: Payment used for user registration (NEW)

### Admin Audit Endpoint:

**GET** `/api/admin/pre-registration-payments`

Query Parameters:
- `status`: Filter by payment status (pending, success, failed, consumed)
- `email`: Filter by email address

Response includes:
- All payment details
- User information (if consumed)
- Linked payment record (if consumed)
- Timestamps for audit trail

### Benefits:

1. **Complete audit trail**: All pre-registration payments are preserved
2. **Data integrity**: No data loss during registration process
3. **Admin visibility**: Admins can track all payment attempts
4. **Troubleshooting**: Easy to identify failed registrations
5. **Compliance**: Better record keeping for financial compliance
