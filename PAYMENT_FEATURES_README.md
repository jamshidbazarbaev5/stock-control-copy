# Payment Features Implementation

This document describes the new payment features added to the stock control system.

## Overview

The system now supports flexible payment handling for stock entries, including:
1. Using supplier balance for debt payments
2. Multiple payment methods for deposits
3. Split payments across different payment types
4. Supplier balance management

## Features Implemented

### 1. Use Supplier Balance (`use_supplier_balance`)

When creating or editing a stock entry with debt, users can now choose to use the supplier's existing balance instead of making a direct payment.

**UI Components:**
- Checkbox: "Use Supplier Balance"
- When checked, displays supplier information including:
  - Supplier name
  - Total debt
  - Remaining debt
  - Current balance
  - Total amount of current purchase

**API Payload Structure:**
The payment fields are sent inside each stock item in the `stocks` array:
```json
{
  "store": 1,
  "supplier": 10,
  "date_of_arrived": "2025-10-27T18:01",
  "stocks": [
    {
      "product": 32,
      "purchase_unit": 5,
      "currency": 2,
      "exchange_rate": 24,
      "quantity": 20,
      "price_per_unit_uz": 2440000,
      "total_price_in_uz": 488000,
      "use_supplier_balance": true,
      "deposit_payment_method": null,
      "payments": []
    }
  ]
}
```

**Note:** All three payment fields are always sent **inside each stock item**, regardless of the scenario.

### 2. Deposit Payment Method (`deposit_payment_method`)

When purchasing on debt and NOT using supplier balance, users must select a deposit payment method.

**Available Methods:**
- Наличные (Cash)
- Карта (Card)
- Click
- Перечисление (Transfer)

**UI Components:**
- Select dropdown for payment method selection
- Only visible when `is_debt=true` and `use_supplier_balance=false`

**API Payload Structure:**
```json
{
  "store": 1,
  "supplier": 10,
  "date_of_arrived": "2025-10-27T18:01",
  "stocks": [
    {
      "product": 32,
      "price_per_unit_uz": 2440000,
      "total_price_in_uz": 488000,
      "use_supplier_balance": false,
      "deposit_payment_method": "Наличные",
      "payments": []
    }
  ]
}
```

### 3. Multiple Payments System

When NOT using debt or NOT using supplier balance, users can add multiple payments with different payment types. This features a calculator-like functionality.

**Features:**
- Add multiple payment entries
- Each payment has:
  - Amount (number input)
  - Payment type (select: Наличные, Карта, Click, Перечисление)
- Real-time calculation showing:
  - Total amount (from all stock items)
  - Paid amount (sum of all payments)
  - Remaining amount (difference)
- Calculator functionality:
  - First payment defaults to total amount
  - When adding new payment, automatically fills with remaining amount
  - Dynamically updates as amounts change

**UI Components:**
- Payment list with add/remove buttons
- Each payment row shows amount and type
- Summary panel with totals
- "Add Payment" button with auto-calculation

**API Payload Structure:**
```json
{
  "store": 1,
  "supplier": 10,
  "date_of_arrived": "2025-10-27T18:01",
  "stocks": [
    {
      "product": 32,
      "price_per_unit_uz": 2440000,
      "total_price_in_uz": 488000,
      "use_supplier_balance": false,
      "deposit_payment_method": null,
      "payments": [
        {
          "amount": 50000,
          "payment_type": "Наличные"
        },
        {
          "amount": 40000,
          "payment_type": "Перечисление"
        }
      ]
    }
  ]
}
```

### 4. Supplier Balance Management

Added functionality to add balance to supplier accounts from the Suppliers page.

**UI Components:**
- "Add Balance" button on each supplier row
- Dialog with form fields:
  - Store (select, required)
  - Amount (number, required)
  - Payment Method (select: Наличные, Карта, Click, Перечисление)

**API Endpoint:**
```
POST /suppliers/add-balance/
```

**Request Body:**
```json
{
  "supplier": 5,
  "store": 1,
  "amount": 5000,
  "payment_method": "Наличные"
}
```

## Files Modified

### 1. `src/core/pages/create-stock.tsx`
- Updated `CommonFormValues` interface with new fields
- Added default values for new fields
- Updated payload construction in `handleSubmit`
- Added UI components for:
  - Use supplier balance checkbox
  - Supplier balance info display
  - Deposit payment method selector
  - Payments array with calculator

### 2. `src/core/pages/EditStockEntry.tsx`
- Updated `CommonFormValues` interface with new fields
- Added default values for new fields
- Updated payload construction in `handleSubmit`
- Added same UI components as create-stock

### 3. `src/core/pages/SuppliersPage.tsx`
- Added balance addition dialog
- Imported required dependencies
- Added `Add Balance` button with Wallet icon
- Implemented balance form with store, amount, and payment method
- Integrated with new API endpoint

### 4. `src/core/api/supplier.ts`
- Added `AddSupplierBalanceRequest` interface
- Added `useAddSupplierBalance` mutation hook
- Added API endpoint constant for balance addition
- Updated Supplier interface with balance fields

### 5. `src/core/api/stock.ts`
- Updated `StockItemEntry` interface with new payment fields (all required)
- Payment fields are now part of each individual stock item
- Added type definitions for payments array
- Made payment fields non-optional to ensure they're always sent with each stock

## Payment Logic Flow

**Important:** All payment fields are always included **inside each stock item**:
- `use_supplier_balance`: boolean (always sent in each stock)
- `deposit_payment_method`: string or null (always sent in each stock)
- `payments`: array (always sent in each stock, can be empty)

The UI presents these fields once at the common level, but the same values are duplicated into each stock item when building the API payload.

### Scenario 1: Purchase on Debt with Supplier Balance
```json
{
  "store": 1,
  "supplier": 10,
  "date_of_arrived": "2025-10-27T18:01",
  "is_debt": true,
  "stocks": [
    {
      "product": 32,
      "purchase_unit": 5,
      "currency": 2,
      "quantity": 20,
      "total_price_in_uz": 488000,
      "use_supplier_balance": true,
      "deposit_payment_method": null,
      "payments": []
    }
  ]
}
```
- Shows supplier info card
- Deducts from supplier's existing balance
- deposit_payment_method and payments are null/empty

### Scenario 2: Purchase on Debt without Supplier Balance
```json
{
  "store": 1,
  "supplier": 10,
  "date_of_arrived": "2025-10-27T18:01",
  "is_debt": true,
  "stocks": [
    {
      "product": 32,
      "total_price_in_uz": 488000,
      "use_supplier_balance": false,
      "deposit_payment_method": "Наличные",
      "payments": []
    }
  ]
}
```
- Shows deposit payment method selector
- User selects one of 4 payment methods
- Single payment method for the deposit
- payments array is empty

### Scenario 3: Regular Purchase (No Debt)
```json
{
  "store": 1,
  "supplier": 10,
  "date_of_arrived": "2025-10-27T18:01",
  "stocks": [
    {
      "product": 32,
      "total_price_in_uz": 488000,
      "use_supplier_balance": false,
      "deposit_payment_method": null,
      "payments": [
        {"amount": 40000, "payment_type": "Наличные"},
        {"amount": 448000, "payment_type": "Click"}
      ]
    }
  ]
}
```
- Shows payments array
- User can add multiple payments
- Calculator automatically manages remaining amount
- Each payment can use different payment type

### Scenario 4: Purchase on Debt with Multiple Payments
```json
{
  "store": 1,
  "supplier": 10,
  "date_of_arrived": "2025-10-27T18:01",
  "is_debt": true,
  "stocks": [
    {
      "product": 32,
      "total_price_in_uz": 488000,
      "use_supplier_balance": false,
      "deposit_payment_method": "Наличные",
      "payments": [
        {"amount": 30000, "payment_type": "Наличные"},
        {"amount": 20000, "payment_type": "Карта"}
      ]
    }
  ]
}
```
- Can also use payments array for partial payments
- Allows split payment across multiple methods
- Both deposit_payment_method and payments can be used together

## Translation Keys Used

Add these to your translation files:

```json
{
  "common": {
    "use_supplier_balance": "Use Supplier Balance",
    "supplier_info": "Supplier Information",
    "supplier_name": "Supplier",
    "supplier_balance": "Balance",
    "total_amount": "Total Amount",
    "deposit_payment_method": "Deposit Payment Method",
    "select_payment_method": "Select payment method",
    "payment_method": "Payment Method",
    "payments": "Payments",
    "add_payment": "Add Payment",
    "paid_amount": "Paid Amount",
    "remaining_amount": "Remaining Amount",
    "no_payments_added": "No payments added. Click 'Add Payment' to add a payment.",
    "add_balance": "Add Balance",
    "amount": "Amount"
  },
  "messages": {
    "success": {
      "balance_added": "Balance added successfully"
    },
    "error": {
      "balance_add_failed": "Failed to add balance",
      "fill_required_fields": "Please fill all required fields"
    }
  }
}
```

## Testing Checklist

- [ ] Create stock entry with supplier balance
- [ ] Create stock entry with debt and deposit payment method
- [ ] Create stock entry with multiple payments
- [ ] Edit stock entry and modify payments
- [ ] Add balance to supplier from suppliers page
- [ ] Verify supplier balance updates correctly
- [ ] Test calculator functionality in payments
- [ ] Verify payment amount validation
- [ ] Test all 4 payment methods (Наличные, Карта, Click, Перечисление)
- [ ] Verify conditional rendering of UI elements
- [ ] Test with different supplier balance scenarios

## Backend Requirements

The backend API should support:

1. `POST /items/stock-entries/` with new required fields **inside each stock item**:
   - Each stock in the `stocks` array must include:
     - `use_supplier_balance`: boolean (required)
     - `deposit_payment_method`: string or null (required)
     - `payments`: array (required, can be empty)
2. `PUT /items/stock-entries/{id}/` with same new fields in each stock
3. `POST /suppliers/add-balance/` endpoint
4. Supplier model with balance field
5. Payment processing logic for:
   - Supplier balance deduction per stock item
   - Multiple payments handling per stock item
   - Deposit payment method tracking per stock item
6. All three payment fields must always be present **in each stock item** in the request payload

## Notes

- **All three payment fields are always sent inside each stock item**, even if not used
- The UI shows payment fields once at the common level for user convenience
- When building the payload, the same payment values are duplicated to each stock item
- Payments array UI is only shown when NOT using supplier balance
- Calculator automatically fills remaining amount when adding new payment
- Supplier balance info is fetched from the suppliers list
- All payment amounts use 2 decimal places
- Payment types are hardcoded (Наличные, Карта, Click, Перечисление)
- Store selection is required for balance addition
- When `use_supplier_balance` is true, `deposit_payment_method` should be null and `payments` should be empty
- When `deposit_payment_method` is used, it can coexist with `payments` array
- All stocks in the same entry will have the same payment field values (duplicated from common form)

## Future Enhancements

- [ ] Add payment history view
- [ ] Implement payment receipt generation
- [ ] Add payment method restrictions by store
- [ ] Implement balance transfer between suppliers
- [ ] Add payment analytics and reports
- [ ] Support partial payment editing
- [ ] Add payment reversal functionality