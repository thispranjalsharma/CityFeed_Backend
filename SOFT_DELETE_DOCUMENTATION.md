# Soft Delete Implementation Documentation

## Overview

This document describes the soft delete functionality implemented across the CityFeed Club API. Soft delete ensures that data is never permanently lost and can be recovered when needed.

## What is Soft Delete?

Soft delete is a data management strategy where records are marked as "deleted" rather than being physically removed from the database. This approach:

- **Preserves Data**: No data is permanently lost
- **Maintains Referential Integrity**: Related data remains intact
- **Enables Recovery**: Deleted items can be restored
- **Provides Audit Trail**: Tracks when items were deleted

## Implementation Details

### Database Schema Changes

All models now include soft delete fields:

```typescript
{
  isDeleted: boolean,    // Soft delete flag (default: false)
  deletedAt: Date        // Timestamp when deleted (null if not deleted)
}
```

### Models Updated

- ✅ **Outlet Model** - Business outlets
- ✅ **Offer Model** - Promotional offers
- ✅ **User Model** - User accounts
- ✅ **OutletAdmin Model** - Outlet administrators
- ✅ **OutletRoleAssignment Model** - Employee role assignments

### Database Indexes

Performance-optimized indexes have been added:

```typescript
// Index for soft delete queries
schema.index({ isDeleted: 1 });
schema.index({ deletedAt: 1 });
```

## API Endpoints

### Outlet Management

#### Soft Delete Outlet
```
DELETE /api/outlets/{outletId}
```
- **Description**: Soft deletes an outlet and all its associated offers and outlet admin
- **Authorization**: Super admin who created the outlet
- **Behavior**: 
  - Sets `isDeleted: true` and `deletedAt: current_timestamp` for outlet
  - Soft deletes all associated offers
  - Soft deletes the assigned outlet admin (if any)

#### Restore Outlet
```
PATCH /api/outlets/{outletId}/restore
```
- **Description**: Restores a soft deleted outlet
- **Authorization**: Super admin who created the outlet
- **Behavior**: 
  - Sets `isDeleted: false` and clears `deletedAt` for outlet
  - Restores the assigned outlet admin (if any)

#### Get Deleted Outlets
```
GET /api/outlets/deleted
```
- **Description**: Retrieves all soft deleted outlets for the authenticated super admin
- **Authorization**: Super admin
- **Response**: List of outlets with `isDeleted: true`

### Offer Management

#### Soft Delete Offer
```
DELETE /api/offers/{id}
```
- **Description**: Soft deletes an offer
- **Authorization**: Users with appropriate permissions
- **Behavior**: Sets `isDeleted: true` and `deletedAt: current_timestamp`

#### Restore Offer
```
PATCH /api/offers/{id}/restore
```
- **Description**: Restores a soft deleted offer
- **Authorization**: Users with appropriate permissions
- **Behavior**: Sets `isDeleted: false` and clears `deletedAt`

#### Get Deleted Offers
```
GET /api/offers/deleted?outletId={outletId}
```
- **Description**: Retrieves all soft deleted offers (optionally filtered by outlet)
- **Authorization**: Users with appropriate permissions
- **Response**: List of offers with `isDeleted: true`

### Outlet Admin Management

#### Soft Delete Outlet Admin
```
DELETE /api/outlet-admin/{adminId}
```
- **Description**: Soft deletes an outlet admin
- **Authorization**: Super admin
- **Behavior**: Sets `isDeleted: true` and `deletedAt: current_timestamp`

#### Restore Outlet Admin
```
PATCH /api/outlet-admin/{adminId}/restore
```
- **Description**: Restores a soft deleted outlet admin
- **Authorization**: Super admin
- **Behavior**: Sets `isDeleted: false` and clears `deletedAt`

#### Get Deleted Outlet Admins
```
GET /api/outlet-admin/deleted
```
- **Description**: Retrieves all soft deleted outlet admins
- **Authorization**: Super admin
- **Response**: List of outlet admins with `isDeleted: true`

## Query Behavior

### Automatic Filtering

All query methods automatically exclude soft deleted records:

```typescript
// This query automatically excludes deleted records
const outlets = await Outlet.find({ isActive: true });

// Equivalent to:
const outlets = await Outlet.find({
  isActive: true,
  $or: [
    { isDeleted: { $ne: true } },
    { isDeleted: { $exists: false } }
  ]
});
```

### Including Deleted Records

To query including deleted records (admin purposes):

```typescript
// Use findIncludingDeleted method
const allOutlets = await outletService.findIncludingDeleted({});

// Or query directly with model
const allOutlets = await Outlet.find({});
```

### Querying Only Deleted Records

```typescript
// Use findDeleted method
const deletedOutlets = await outletService.findDeleted({});

// Or query directly
const deletedOutlets = await Outlet.find({ isDeleted: true });
```

## Service Layer Methods

### Base Repository Methods

```typescript
// Soft delete (default)
await repository.delete(id);

// Explicit soft delete
await repository.softDelete(id);

// Hard delete (use with caution)
await repository.hardDelete(id);

// Restore deleted record
await repository.restore(id);

// Find including deleted records
await repository.findIncludingDeleted(filter);

// Find only deleted records
await repository.findDeleted(filter);
```

### Outlet Service Methods

```typescript
// Soft delete outlet and all its offers and admin
await outletService.deleteOutlet(outletId);

// Restore outlet and its admin
await outletService.restoreOutlet(outletId);

// Get deleted outlets
await outletService.getDeletedOutlets(superAdminId);
```

### Offer Service Methods

```typescript
// Soft delete offer
await offerService.deleteOffer(offerId, outletId);

// Restore offer
await offerService.restoreOffer(offerId, outletId);

// Get deleted offers
await offerService.getDeletedOffers(outletId);
```

### Outlet Admin Service Methods

```typescript
// Soft delete outlet admin
await outletAdminService.softDeleteOutletAdmin(adminId);

// Restore outlet admin
await outletAdminService.restoreOutletAdmin(adminId);

// Get deleted outlet admins
await outletAdminService.getDeletedOutletAdmins();
```

## Cascade Behavior

### Outlet Deletion

When an outlet is soft deleted:

1. ✅ Outlet is marked as `isDeleted: true`
2. ✅ All associated offers are soft deleted
3. ✅ Associated outlet admin is soft deleted (if assigned)
4. ✅ Outlet can be restored later
5. ✅ Offers can be restored individually or with outlet
6. ✅ Outlet admin is restored when outlet is restored

### Offer Deletion

When an offer is soft deleted:

1. ✅ Offer is marked as `isDeleted: true`
2. ✅ Outlet remains unaffected
3. ✅ Offer can be restored independently

### Outlet Admin Deletion

When an outlet admin is soft deleted:

1. ✅ Outlet admin is marked as `isDeleted: true`
2. ✅ Outlet admin can be restored independently
3. ✅ Associated outlet remains unaffected

## Security Considerations

### Authorization

- **Outlet Operations**: Only super admins can delete/restore outlets they created
- **Offer Operations**: Users need appropriate permissions based on responsibility system
- **Outlet Admin Operations**: Only super admins can delete/restore outlet admins
- **View Deleted**: Admin-level access required for viewing deleted records

### Data Protection

- **Soft Delete by Default**: All delete operations use soft delete
- **Hard Delete Available**: For permanent deletion when absolutely necessary
- **Audit Trail**: All delete/restore operations are timestamped

## Performance Considerations

### Database Indexes

```typescript
// Optimized for soft delete queries
schema.index({ isDeleted: 1 });
schema.index({ deletedAt: 1 });

// Compound indexes for common queries
schema.index({ outletId: 1, isDeleted: 1 });
schema.index({ createdBy: 1, isDeleted: 1 });
schema.index({ assignedAdmin: 1, isDeleted: 1 });
```

## Cron Job Integration

### Automatic Cleanup

The system includes a cron job that permanently deletes soft-deleted records older than 13 months:

```typescript
// Runs monthly on the 10th day at 2:00 AM UTC
cron.schedule('0 2 10 * *', async () => {
  await cronJobService.cleanupOldSoftDeletedRecords();
});
```

### Affected Record Types

The cleanup job targets:
- ✅ Offers
- ✅ Outlets  
- ✅ Users
- ✅ Employees (OutletRoleAssignment)
- ✅ Outlet Admins

### Manual Cleanup

Super admins can manually trigger cleanup:

```
POST /api/admin/cleanup/trigger
```

### Cleanup Statistics

View cleanup statistics:

```
GET /api/admin/cleanup/stats
```

## Best Practices

### 1. Data Recovery
- Always use soft delete for user-facing operations
- Implement restore functionality for all soft-deleted entities
- Provide clear feedback about deletion and restoration

### 2. Performance
- Use database indexes for soft delete queries
- Implement pagination for large datasets
- Consider archiving old soft-deleted records

### 3. Monitoring
- Monitor soft-deleted record counts
- Set up alerts for unusual deletion patterns
- Regular cleanup of old soft-deleted records

### 4. Testing
- Test soft delete and restore operations
- Verify cascade behavior
- Test cron job cleanup functionality

## Migration Guide

### Adding Soft Delete to Existing Models

1. **Update Schema**:
```typescript
const schema = new Schema({
  // ... existing fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
});
```

2. **Add Indexes**:
```typescript
schema.index({ isDeleted: 1 });
schema.index({ deletedAt: 1 });
```

3. **Update Queries**:
```typescript
// Before
const records = await Model.find({});

// After
const records = await Model.find({
  $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
});
```

4. **Update Service Methods**:
```typescript
async delete(id: string) {
  return this.model.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date()
  });
}
```

## Troubleshooting

### Common Issues

1. **Deleted Records Still Appearing**
   - Check if queries include soft delete filter
   - Verify database indexes are created
   - Ensure service methods use proper filtering

2. **Performance Issues**
   - Add database indexes for soft delete fields
   - Implement pagination for large datasets
   - Consider archiving old records

3. **Cascade Issues**
   - Verify cascade logic in service methods
   - Check foreign key relationships
   - Test restore operations thoroughly

### Debugging

```typescript
// Check soft delete statistics
const stats = await cronJobService.getSoftDeleteStatistics();

// Manually trigger cleanup
await cronJobService.cleanupOldSoftDeletedRecords();

// Query including deleted records
const allRecords = await Model.find({});
``` 