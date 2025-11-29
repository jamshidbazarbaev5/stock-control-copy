# Printer Service Usage Guide

## Overview
The printer service provides a clean API interface for communicating with the thermal printer server running on `localhost:3001`.

## Files Created
1. **`src/core/api/printer.ts`** - Main printer API service
2. **`src/core/api/hooks/usePrinter.ts`** - React Query hooks for printer operations
3. **Updated `src/services/shiftClosureReceiptService.ts`** - Now uses the new API service

## Usage Examples

### 1. Using the API directly

```typescript
import { printerApi } from '@/core/api/printer';

// Check printer health
const healthCheck = async () => {
  try {
    const response = await printerApi.checkHealth();
    console.log('Printer status:', response.data);
  } catch (error) {
    console.error('Printer not available:', error);
  }
};

// Print shift closure
const printShift = async (shiftData) => {
  try {
    const response = await printerApi.printShiftClosure(shiftData);
    console.log('Print success:', response.data);
  } catch (error) {
    console.error('Print failed:', error);
  }
};
```

### 2. Using React Query Hooks (Recommended)

```typescript
import { usePrinterHealth, usePrintShiftClosure } from '@/core/api/hooks/usePrinter';

function ShiftClosureComponent() {
  // Check printer status
  const { data: printerStatus, isLoading } = usePrinterHealth();
  
  // Print mutation
  const printMutation = usePrintShiftClosure();

  const handlePrint = async (shiftData) => {
    try {
      const result = await printMutation.mutateAsync(shiftData);
      console.log('Printed successfully:', result);
    } catch (error) {
      console.error('Print failed:', error);
    }
  };

  return (
    <div>
      <p>Printer Ready: {printerStatus?.printer_ready ? 'Yes' : 'No'}</p>
      <button 
        onClick={() => handlePrint(shiftData)}
        disabled={printMutation.isPending}
      >
        {printMutation.isPending ? 'Printing...' : 'Print Receipt'}
      </button>
    </div>
  );
}
```

### 3. Using the existing shiftClosureReceiptService

The existing service now uses the new API internally:

```typescript
import { shiftClosureReceiptService } from '@/services/shiftClosureReceiptService';

// Check printer
await shiftClosureReceiptService.checkPrinterStatus();

// Print test
await shiftClosureReceiptService.printTestReceipt();

// Print shift closure
await shiftClosureReceiptService.printShiftClosureReceipt(shiftData);

// Print with fallback handling
const result = await shiftClosureReceiptService.printWithFallback(shiftData);
```

## Benefits

1. **Centralized API calls** - All printer communication in one place
2. **Type safety** - Full TypeScript support with proper types
3. **Error handling** - Consistent error handling across the app
4. **React Query integration** - Easy state management with hooks
5. **Reusability** - Can be used anywhere in the application
6. **Maintainability** - Easy to update or modify printer logic

## Mock Data vs Real API

Currently using mock data in `server.js`. To switch to real API:

1. Update the printer service endpoint in your backend
2. The frontend code remains the same - just change the data source
3. No changes needed in components using the service

## Future Enhancements

- Add sale receipt printing support
- Add receipt template management
- Add printer configuration endpoints
- Add print queue management
