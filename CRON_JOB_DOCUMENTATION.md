# Cron Job Documentation - Soft Delete Cleanup

## Overview

The CityFeed Club API includes an automated cleanup system that permanently removes soft-deleted records that are older than 13 months. This helps maintain database performance, reduce storage costs, and comply with data retention policies.

## What is Soft Delete?

Soft delete is a data management strategy where records are marked as "deleted" rather than being physically removed from the database. This approach:

- **Preserves Data**: No data is permanently lost immediately
- **Maintains Referential Integrity**: Related data remains intact
- **Enables Recovery**: Deleted items can be restored within a reasonable timeframe
- **Provides Audit Trail**: Tracks when items were deleted

## Cleanup Policy

### Retention Period
- **13 months**: All soft-deleted records are retained for 13 months
- **Automatic Cleanup**: Records older than 13 months are permanently deleted
- **Monthly Execution**: Cleanup runs on the 10th day of each month at 2:00 AM UTC

### Affected Records
The cleanup job targets the following record types:

1. **Offers** (`Offer` model)
   - Soft-deleted offers (`isDeleted: true`)
   - Older than 13 months based on `updatedAt` field

2. **Outlets** (`Outlet` model)
   - Soft-deleted outlets (`isDeleted: true`)
   - Older than 13 months based on `updatedAt` field

3. **Employees** (`Staff` model)
   - Soft-deleted employees (`isDeleted: true`)
   - Older than 13 months based on `updatedAt` field
   - Note: Employee records are now soft deleted, not hard deleted

4. **Users** (`User` model)
   - Soft-deleted users (`isDeleted: true`)
   - Older than 13 months based on `updatedAt` field

5. **Outlet Admins** (`OutletAdmin` model)
   - Soft-deleted outlet admins (`isDeleted: true`)
   - Older than 13 months based on `updatedAt` field
   - Note: Outlet admins are soft deleted when their associated outlet is deleted

## Implementation Details

### Cron Schedule
```typescript
// Runs monthly on the 10th day at 2:00 AM UTC
cron.schedule('0 2 10 * *', async () => {
  // Cleanup logic
}, {
  scheduled: true,
  timezone: 'UTC'
});
```

### Cleanup Logic
```typescript
const thirteenMonthsAgo = new Date();
thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

// Delete records older than 13 months
await Model.deleteMany({
  isDeleted: true,  // For soft-deleted records
  updatedAt: { $lt: thirteenMonthsAgo }
});
```

## API Endpoints

### 1. Manual Cleanup Trigger
```
POST /api/admin/cleanup/trigger
```

**Description**: Manually triggers the cleanup job to permanently delete soft-deleted records older than 13 months.

**Authorization**: Super admin only

**Response**:
```json
{
  "success": true,
  "message": "Cleanup job triggered successfully"
}
```

### 2. Cleanup Statistics
```
GET /api/admin/cleanup/stats
```

**Description**: Returns statistics about soft-deleted records in the system.

**Authorization**: Super admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "offers": {
      "totalSoftDeleted": 150,
      "olderThan13Months": 25
    },
    "outlets": {
      "totalSoftDeleted": 30,
      "olderThan13Months": 5
    },
    "employees": {
      "totalRecords": 500,
      "olderThan13Months": 50
    },
    "users": {
      "totalSoftDeleted": 200,
      "olderThan13Months": 40
    },
    "outletAdmins": {
      "totalSoftDeleted": 25,
      "olderThan13Months": 3
    }
  },
  "message": "Soft delete statistics retrieved successfully"
}
```

## Monitoring and Logging

### Log Messages
The cleanup job logs detailed information:

```
[INFO] Starting cleanup of old soft-deleted records...
[INFO] Cleaned up 25 old soft-deleted offers
[INFO] Cleaned up 5 old soft-deleted outlets
[INFO] Cleaned up 50 old employee assignments
[INFO] Cleaned up 40 old soft-deleted users
[INFO] Cleaned up 3 old soft-deleted outlet admins
[INFO] Cleanup completed successfully
{
  "totalRecordsDeleted": 123,
  "breakdown": {
    "offers": 25,
    "outlets": 5,
    "employees": 50,
    "users": 40,
    "outletAdmins": 3
  },
  "cutoffDate": "2023-02-15T02:00:00.000Z"
}
```

### Error Handling
- All errors are logged with full stack traces
- Failed cleanup jobs don't stop the server
- Manual retry is available through the API endpoint

## Best Practices

### 1. Monitoring
- Regularly check cleanup statistics via the API
- Monitor log files for cleanup job execution
- Set up alerts for failed cleanup jobs

### 2. Testing
- Use the manual trigger endpoint to test cleanup logic
- Verify statistics before and after cleanup
- Test with different data scenarios

### 3. Backup Strategy
- Ensure regular database backups before cleanup
- Consider archiving old data before permanent deletion
- Test restore procedures regularly

### 4. Compliance
- Review retention periods based on business requirements
- Ensure compliance with data protection regulations
- Document cleanup policies and procedures

## Configuration

### Timezone
The cron job runs in UTC timezone. To change the timezone:

```typescript
cron.schedule('0 2 10 * *', async () => {
  // Cleanup logic
}, {
  scheduled: true,
  timezone: 'America/New_York'  // Change timezone here
});
```

### Retention Period
To change the retention period from 13 months:

```typescript
// In src/services/cronJob.service.ts
const retentionMonths = 13; // Change this value
const cutoffDate = new Date();
cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
```

## Troubleshooting

### Common Issues

1. **Cleanup Job Not Running**
   - Check server logs for cron job initialization
   - Verify server timezone settings
   - Ensure the server is running on the scheduled date

2. **Permission Errors**
   - Verify super admin permissions for manual triggers
   - Check database connection and permissions

3. **Performance Issues**
   - Monitor database performance during cleanup
   - Consider running cleanup during off-peak hours
   - Use database indexes for efficient queries

### Debugging
- Enable debug logging for detailed information
- Use the statistics endpoint to monitor cleanup progress
- Check database directly for record counts

## Security Considerations

### Access Control
- Only super admins can trigger manual cleanup
- Only super admins can view cleanup statistics
- All operations are logged for audit purposes

### Data Protection
- Cleanup only affects records older than the retention period
- No active records are affected by the cleanup
- Backup procedures should be in place

### Audit Trail
- All cleanup operations are logged
- Statistics are available for monitoring
- Manual triggers are tracked

## Future Enhancements

### Potential Improvements
1. **Configurable Retention Periods**: Different retention periods for different record types
2. **Scheduled Backup**: Automatic backup before cleanup
3. **Email Notifications**: Notify admins of cleanup results
4. **Dry Run Mode**: Preview what would be deleted without actually deleting
5. **Batch Processing**: Process large datasets in smaller batches
6. **Archive Option**: Archive old data instead of permanent deletion

### Monitoring Dashboard
- Real-time statistics dashboard
- Historical cleanup reports
- Performance metrics
- Alert system for failed jobs 