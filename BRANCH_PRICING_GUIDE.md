# Branch-Specific Pricing Implementation Guide

## Overview
This implementation adds support for branch-specific pricing in the salon mobile app. Services can now have different prices for different branches, allowing for location-based pricing strategies.

## Data Structure

### Service Document Structure
```javascript
{
  id: "service_beard",
  name: "Beard Trim",
  category: "Hair Services",
  duration: 30,
  price: 100, // Default price
  prices: [90, 100], // Array of prices for different branches
  branches: ["KYiL9JprSX3LBOYzrF6", "KYiL9JprSX3LBOYzrF6e"], // Corresponding branch IDs
  isActive: true,
  // ... other fields
}
```

### User Document Structure
```javascript
{
  id: "1qOi4iF1YJOad3eEY7aiqZhxpYf1",
  firstName: "Gwyneth",
  lastName: "Cruz",
  branchId: "KYiL9JprSX3LBOYzrF6e", // User's assigned branch
  // ... other fields
}
```

## Implementation Details

### 1. Service Interface Updates
- Added `prices?: number[]` - Array of prices for different branches
- Added `branches?: string[]` - Array of branch IDs corresponding to prices array

### 2. Service Pricing Service
Created `ServicePricingService` with methods:
- `getBranchSpecificPrice(serviceId, branchId)` - Get price for specific service and branch
- `getAllServicesWithPricing(branchId)` - Get all services with branch-specific pricing
- `calculateAppointmentTotalPrice(serviceStylistPairs, branchId)` - Calculate total for appointment

### 3. Usage Examples

#### Getting Branch-Specific Price
```typescript
import ServicePricingService from '../services/servicePricingService';

// Get price for a specific service and branch
const price = await ServicePricingService.getBranchSpecificPrice(
  'service_beard', 
  'KYiL9JprSX3LBOYzrF6e'
);
console.log('Branch-specific price:', price); // Returns 100
```

#### Using in Components
```typescript
import BranchSpecificPricing from '../components/BranchSpecificPricing';

<BranchSpecificPricing 
  serviceId="service_beard"
  branchId={user.branchId}
  fallbackPrice={100}
/>
```

### 4. How It Works

1. **Service Creation**: When creating a service, include both `prices` and `branches` arrays
2. **Price Lookup**: The system finds the branch ID in the `branches` array and returns the corresponding price from the `prices` array
3. **Fallback**: If branch-specific pricing is not available, it falls back to the default `price` field

### 5. Example Data Flow

Given this service data:
```javascript
{
  name: "Buzz Cut",
  price: 100, // Default price
  prices: [90, 100], // Branch-specific prices
  branches: ["KYiL9JprSX3LBOYzrF6", "KYiL9JprSX3LBOYzrF6e"] // Branch IDs
}
```

- For branch "KYiL9JprSX3LBOYzrF6": Returns 90 (index 0)
- For branch "KYiL9JprSX3LBOYzrF6e": Returns 100 (index 1)
- For any other branch: Returns 100 (default price)

### 6. Integration Points

#### Appointment Cards
The appointment cards now display branch-specific pricing:
```typescript
<Text style={styles.priceText}>
  ₱{calculateBranchSpecificPrice(appointment)}
</Text>
```

#### Service Selection
When users select services, the pricing will be calculated based on their assigned branch.

### 7. Benefits

1. **Flexible Pricing**: Different branches can have different pricing strategies
2. **Location-Based Pricing**: Account for local market conditions
3. **Easy Management**: Centralized pricing management with branch-specific overrides
4. **Backward Compatibility**: Existing services without branch pricing still work with default prices

### 8. Future Enhancements

1. **Real-time Price Updates**: Update prices across all branches instantly
2. **Price History**: Track price changes over time
3. **Bulk Price Updates**: Update prices for multiple services at once
4. **Price Validation**: Ensure prices are within acceptable ranges
5. **Analytics**: Track pricing performance across branches

## Testing

To test the implementation:

1. Create a service with branch-specific pricing
2. Assign users to different branches
3. Verify that appointment cards show correct pricing
4. Test fallback to default pricing for branches not in the list

## Notes

- The `prices` and `branches` arrays must have the same length
- Branch IDs in the `branches` array must match actual branch IDs in the database
- The system gracefully handles missing or invalid data by falling back to default pricing
