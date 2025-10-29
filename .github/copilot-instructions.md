# David's Salon Mobile App - AI Agent Instructions

## Project Overview
React Native/Expo mobile app for salon appointment management with dual client/stylist interfaces. Built with TypeScript, Firebase backend, and Redux + Context for state management.

## Key Architecture Patterns

### Authentication Flow
- Firebase Auth handles user authentication (`src/services/firebaseAuthService.ts`)
- User data persisted in AsyncStorage and synced with Firestore
- Role-based access (client/stylist) with role selection for multi-role users
- See `LOGIN_SETUP.md` for test credentials and setup details

### State Management
- **Redux**: Global auth state, user data, appointments (`src/store/`)
- **Context**: 
  - `BookingContext`: Manages multi-step booking flow state
  - `UserContext`: Handles user session and profile data
  - Pattern: Wrap specific feature flows in context, use Redux for app-wide state

### Navigation Structure
- `RootNavigator`: Entry point, handles auth flow
- Separate navigation stacks for clients/stylists
- Web-specific navigators for responsive design
- Protected routes based on user roles

### Core Services Pattern
All services follow repository pattern with clear interfaces:
```typescript
interface ServiceInterface {
  // Methods return Promises with typed data
  getData(): Promise<DataType>;
  // Error handling via custom exceptions
  updateData(data: DataType): Promise<void>;
}
```

### Booking Flow Architecture
1. Branch Selection
2. DateTime Selection
3. Service/Stylist Selection
4. Booking Summary/Confirmation

## Development Workflow

### Setup Requirements
1. Node.js v18+
2. Firebase project credentials in `.env`
3. `npm install` for dependencies
4. Firebase emulator for local development

### Essential Commands
```bash
npm start              # Start Expo dev server
npm test              # Run test suite
npm run web           # Start web version
npm run android       # Start Android version
npm run ios           # Start iOS version
```

### Common Development Tasks

#### Adding New Screens
1. Create screen in `src/screens/{client|stylist}/`
2. Add to appropriate navigator
3. Update types in `src/types/`

#### Modifying Booking Flow
1. Update `BookingContext` state/actions
2. Modify affected booking screens
3. Update `mobileAppointmentService.ts` if needed

#### Email Service Changes
- Email services are modular - see `EMAIL_SETUP_INSTRUCTIONS.md`
- Multiple implementations available in `src/services/`
- Backend email service preferred over client-side

## Best Practices

### TypeScript Usage
- Define interfaces for all data structures
- Use strict null checks
- Prefer type inference where obvious

### State Management Choice
- Use Redux for:
  - Authentication state
  - Global user data
  - Cross-screen data
- Use Context for:
  - Feature-specific flows
  - Wizard/multi-step processes
  - Screen-level state

### Code Organization
- Components: `src/components/`
- Screens: `src/screens/{client|stylist}/`
- Services: `src/services/`
- Types: `src/types/`
- Constants: `src/constants/`

## Common Pitfalls
1. Missing Firebase config in `.env`
2. Incorrect role setup in Firestore
3. AsyncStorage sync issues after auth changes
4. Email service configuration errors

## Testing Guidance
- Use test accounts from `LOGIN_SETUP.md`
- Test both client and stylist flows
- Verify email notifications
- Check role-based access control