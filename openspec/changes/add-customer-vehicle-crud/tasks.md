# Implementation Tasks

## 1. Database Schema & Migrations

- [x] 1.1 Create CUSTOMERS table schema with fields: id, name, category (PERSONAL|COMPANY), is_active, created_at
- [x] 1.2 Create VEHICLES table schema with fields: id, plate_number (UNIQUE), customer_id (FK), is_active, created_at
- [x] 1.3 Add database migration script to create tables
- [x] 1.4 Add indexes on frequently queried fields (customer_id, is_active)
- [x] 1.5 Test database creation and constraints

## 2. TypeScript Type Definitions

- [x] 2.1 Create Customer interface in src/Shared/Types/Customer.ts
- [x] 2.2 Create Vehicle interface in src/Shared/Types/Vehicle.ts
- [x] 2.3 Create enums for CustomerCategory (PERSONAL, COMPANY)
- [x] 2.4 Add validation schemas using Zod for Customer and Vehicle

## 3. Electron IPC Handlers - Customer

- [x] 3.1 Implement customer.create IPC handler
- [x] 3.2 Implement customer.getAll IPC handler with pagination
- [x] 3.3 Implement customer.getById IPC handler
- [x] 3.4 Implement customer.update IPC handler
- [x] 3.5 Implement customer.delete IPC handler (soft delete)
- [x] 3.6 Implement customer.search IPC handler for name/category filtering
- [x] 3.7 Add error handling and validation in all handlers

## 4. Electron IPC Handlers - Vehicle

- [x] 4.1 Implement vehicle.create IPC handler
- [x] 4.2 Implement vehicle.getAll IPC handler with pagination
- [x] 4.3 Implement vehicle.getById IPC handler
- [x] 4.4 Implement vehicle.update IPC handler
- [x] 4.5 Implement vehicle.delete IPC handler (soft delete)
- [x] 4.6 Implement vehicle.getByCustomerId IPC handler
- [x] 4.7 Implement vehicle.search IPC handler for plate number filtering
- [x] 4.8 Add validation for unique plate_number constraint
- [x] 4.9 Add error handling in all handlers

## 5. Customer Management UI

- [x] 5.1 Create src/Features/Customer directory structure
- [x] 5.2 Create CustomerListPage.tsx with data table
- [x] 5.3 Create CustomerForm.tsx for create/edit
- [x] 5.4 Create CustomerDetailPage.tsx for view details (Not needed - form handles view/edit)
- [x] 5.5 Add search/filter functionality
- [x] 5.6 Add pagination support
- [x] 5.7 Add delete confirmation dialog
- [x] 5.8 Add form validation with Zod
- [x] 5.9 Add toast notifications for success/error
- [x] 5.10 Add customer category selector (PERSONAL/COMPANY)

## 6. Vehicle Management UI

- [x] 6.1 Create src/Features/Vehicle directory structure
- [x] 6.2 Create VehicleListPage.tsx with data table
- [x] 6.3 Create VehicleForm.tsx for create/edit
- [x] 6.4 Create VehicleDetailPage.tsx for view details (Not needed - form handles view/edit)
- [x] 6.5 Add customer dropdown selector in VehicleForm
- [x] 6.6 Add search/filter functionality (plate number, customer)
- [x] 6.7 Add pagination support
- [x] 6.8 Add delete confirmation dialog
- [x] 6.9 Add form validation with Zod
- [x] 6.10 Add toast notifications for success/error
- [x] 6.11 Add plate number uniqueness validation

## 7. Navigation & Routing

- [x] 7.1 Add Customer routes to navigation configuration
- [x] 7.2 Add Vehicle routes to navigation configuration
- [x] 7.3 Update sidebar to include Customer and Vehicle menu items
- [x] 7.4 Add permission guards if needed

## 8. Data Table Components

- [x] 8.1 Create reusable CustomerTable component
- [x] 8.2 Create reusable VehicleTable component
- [x] 8.3 Add action buttons (edit, delete, view)
- [x] 8.4 Add status badges for is_active
- [x] 8.5 Add customer category badges
- [x] 8.6 Add plate number formatting

## 9. Testing & Validation

- [ ] 9.1 Test Customer CRUD operations end-to-end
- [ ] 9.2 Test Vehicle CRUD operations end-to-end
- [ ] 9.3 Test Customer-Vehicle relationship
- [ ] 9.4 Test unique plate_number constraint
- [ ] 9.5 Test soft delete functionality
- [ ] 9.6 Test search and filter functionality
- [ ] 9.7 Test form validation
- [ ] 9.8 Test offline functionality (all CRUD without internet)
- [ ] 9.9 Test error handling and edge cases

## 10. Documentation

- [ ] 10.1 Update user guide with Customer management instructions
- [ ] 10.2 Update user guide with Vehicle management instructions
- [ ] 10.3 Add code comments for complex logic
- [ ] 10.4 Document IPC handler signatures
