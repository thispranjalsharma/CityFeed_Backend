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
- **Description**: Soft deletes an outlet and all its associated offers
- **Authorization**: Super admin who created the outlet
- **Behavior**: Sets `isDeleted: true` and `deletedAt: current_timestamp`

#### Restore Outlet
```
PATCH /api/outlets/{outletId}/restore
```
- **Description**: Restores a soft deleted outlet
- **Authorization**: Super admin who created the outlet
- **Behavior**: Sets `isDeleted: false` and clears `deletedAt`

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
// Soft delete outlet and all its offers
await outletService.deleteOutlet(outletId);

// Restore outlet
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

## Cascade Behavior

### Outlet Deletion

When an outlet is soft deleted:

1. ✅ Outlet is marked as `isDeleted: true`
2. ✅ All associated offers are soft deleted
3. ✅ Outlet can be restored later
4. ✅ Offers can be restored individually or with outlet

### Offer Deletion

When an offer is soft deleted:

1. ✅ Offer is marked as `isDeleted: true`
2. ✅ Outlet remains unaffected
3. ✅ Offer can be restored independently

## Security Considerations

### Authorization

- **Outlet Operations**: Only super admins can delete/restore outlets they created
- **Offer Operations**: Users need appropriate permissions based on responsibility system
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
```

### Query Optimization

- **Automatic Filtering**: All queries exclude deleted records by default
- **Efficient Filtering**: Uses `$or` conditions to handle both new and existing records
- **Index Usage**: Queries are optimized to use soft delete indexes

## Migration Strategy

### Backward Compatibility

- ✅ Existing code continues to work without changes
- ✅ All queries automatically exclude deleted records
- ✅ No breaking changes to existing APIs

### Data Migration

For existing databases:

```typescript
// Add soft delete fields to existing records
await Outlet.updateMany(
  { isDeleted: { $exists: false } },
  { $set: { isDeleted: false } }
);
```

## Best Practices

### When to Use Soft Delete

✅ **Use Soft Delete For:**
- User-requested deletions
- Business logic deletions
- Data that might need recovery
- Audit trail requirements

### When to Use Hard Delete

⚠️ **Use Hard Delete For:**
- Sensitive data that must be permanently removed
- Legal compliance requirements
- Storage optimization (after backup)
- Test data cleanup

### Monitoring

```typescript
// Monitor deleted records
const deletedCount = await Outlet.countDocuments({ isDeleted: true });

// Monitor deletion patterns
const recentDeletions = await Outlet.find({
  isDeleted: true,
  deletedAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
});
```

## Error Handling

### Common Scenarios

```typescript
// Attempting to delete already deleted record
if (outlet.isDeleted) {
  throw new Error('Outlet is already deleted');
}

// Attempting to restore non-deleted record
if (!outlet.isDeleted) {
  throw new Error('Outlet is not deleted');
}

// Authorization check
if (outlet.createdBy.toString() !== userId.toString()) {
  throw new Error('Not authorized to delete this outlet');
}
```

## Testing

### Test Scenarios

```typescript
// Test soft delete
const outlet = await createOutlet(data);
await deleteOutlet(outlet.id);
const deletedOutlet = await getOutletById(outlet.id);
expect(deletedOutlet).toBeNull(); // Should not be found

// Test restore
await restoreOutlet(outlet.id);
const restoredOutlet = await getOutletById(outlet.id);
expect(restoredOutlet).toBeDefined(); // Should be found

// Test cascade delete
const offers = await getOffersByOutlet(outlet.id);
expect(offers).toHaveLength(0); // All offers should be deleted
```

## Troubleshooting

### Common Issues

1. **Records Still Appearing After Delete**
   - Check if the query is using the repository methods
   - Verify the record has `isDeleted: true`

2. **Performance Issues**
   - Ensure indexes are created
   - Check query patterns

3. **Authorization Errors**
   - Verify user permissions
   - Check ownership of records

### Debug Queries

```typescript
// Check soft delete status
const outlet = await Outlet.findById(id);
console.log('isDeleted:', outlet.isDeleted);
console.log('deletedAt:', outlet.deletedAt);

// Check all records including deleted
const allOutlets = await Outlet.find({});
const deletedOutlets = allOutlets.filter(o => o.isDeleted);
console.log('Deleted count:', deletedOutlets.length);
```

## Future Enhancements

### Potential Improvements

1. **Bulk Operations**: Bulk delete/restore operations
2. **Retention Policies**: Automatic hard delete after certain period
3. **Recycle Bin UI**: User interface for managing deleted items
4. **Export Deleted Data**: Backup functionality for deleted records

### Monitoring and Analytics

```typescript
// Track deletion patterns
const deletionStats = await Outlet.aggregate([
  { $match: { isDeleted: true } },
  { $group: { 
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$deletedAt" } },
    count: { $sum: 1 }
  }}
]);
```

---

This documentation provides a comprehensive guide to the soft delete implementation. For questions or issues, please refer to the codebase or contact the development team. 