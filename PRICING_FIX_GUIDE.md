# Service Pricing Fix Guide

## Problem Identified
The appointment cards were not showing the correct prices because the system wasn't using the branch-specific pricing from the service data structure.

## Service Data Structure
Based on the provided service data:

```javascript
{
  id: "service_haircolor",
  name: "Hair Coloring",
  prices: [20, 10],           // Array of prices for different branches
  branches: ["KYiL9JprSX3LBOYzrF6e"], // Corresponding branch IDs
  price: 100,                 // Default price (fallback)
  // ... other fields
}
```

## How Branch-Specific Pricing Works

### Data Mapping
- `prices[0] = 20` corresponds to `branches[0] = "KYiL9JprSX3LBOYzrF6e"`
- For branch "KYiL9JprSX3LBOYzrF6e", the price should be 20
- The second price (10) has no corresponding branch, so it's unused

### Implementation Changes

#### 1. Enhanced Service Pricing Service
- Added comprehensive logging to track price calculation
- Improved branch lookup logic
- Added fallback to default price when branch-specific pricing isn't available

#### 2. Created useServicePricing Hook
- Fetches all services with branch-specific pricing
- Provides helper functions for price calculation
- Manages loading states

#### 3. Updated Appointment Price Calculation
- Now uses the hook to get branch-specific pricing
- Calculates total price from serviceStylistPairs using correct pricing
- Falls back to stored prices when service data isn't available

## Code Changes Made

### 1. ServicePricingService.ts
```typescript
// Enhanced with better logging and error handling
static async getBranchSpecificPrice(serviceId: string, branchId: string): Promise<number> {
  // Fetches service data and looks up branch-specific price
  // Returns correct price based on branch ID
}
```

### 2. useServicePricing.ts (New Hook)
```typescript
export const useServicePricing = (branchId: string | undefined) => {
  // Fetches all service pricing for a branch
  // Provides helper functions for price calculation
}
```

### 3. AppointmentsScreen.tsx
```typescript
// Now uses the hook for proper branch-specific pricing
const { servicePricing, calculateAppointmentTotal } = useServicePricing(user?.branchId);

const calculateBranchSpecificPrice = (appointment: Appointment): number => {
  // Uses the hook to calculate correct pricing
  if (appointment.serviceStylistPairs) {
    return calculateAppointmentTotal(appointment.serviceStylistPairs);
  }
  // Fallback to stored prices
}
```

## Expected Results

### For Hair Coloring Service
- **Branch**: "KYiL9JprSX3LBOYzrF6e"
- **Expected Price**: ₱20 (from prices[0])
- **Previous Behavior**: Would show ₱0 or default price
- **New Behavior**: Shows ₱20 (correct branch-specific price)

### For Other Services
- Services with branch-specific pricing will show correct prices
- Services without branch-specific pricing will fall back to default price
- Services with no pricing data will show "TBD"

## Testing

### Manual Testing
1. Check appointment cards for correct pricing
2. Verify that prices match the service data structure
3. Test with different branches to ensure correct pricing

### Automated Testing
Use the `ServicePricingTest` component to verify pricing calculations:
```typescript
// Test component that verifies pricing against expected values
<ServicePricingTest branchId="KYiL9JprSX3LBOYzrF6e" />
```

## Debugging

### Console Logs
The system now provides comprehensive logging:
- Service data structure
- Branch lookup process
- Price calculation steps
- Final calculated prices

### Common Issues
1. **No price showing**: Check if service has branch-specific pricing
2. **Wrong price**: Verify branch ID matches the branches array
3. **Fallback to default**: Service might not have branch-specific pricing

## Future Enhancements

1. **Real-time Price Updates**: Update prices when service data changes
2. **Price Validation**: Ensure prices are within acceptable ranges
3. **Bulk Price Updates**: Update multiple services at once
4. **Price History**: Track price changes over time

## Notes

- The system gracefully handles missing or invalid data
- Branch-specific pricing takes precedence over default pricing
- The system maintains backward compatibility with existing appointments
- All price calculations are logged for debugging purposes
