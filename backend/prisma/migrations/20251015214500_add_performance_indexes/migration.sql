-- Add helpful indexes to speed up common queries
-- Units
CREATE INDEX IF NOT EXISTS "idx_Unit_propertyId" ON "Unit"("propertyId");
CREATE INDEX IF NOT EXISTS "idx_Unit_status" ON "Unit"("status");
CREATE INDEX IF NOT EXISTS "idx_Unit_type" ON "Unit"("type");
CREATE INDEX IF NOT EXISTS "idx_Unit_number_propertyId" ON "Unit"("number", "propertyId");

-- Tenants
CREATE INDEX IF NOT EXISTS "idx_Tenant_name" ON "Tenant"("name");

-- Bookings
CREATE INDEX IF NOT EXISTS "idx_Booking_tenantId" ON "Booking"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_Booking_unitId" ON "Booking"("unitId");
CREATE INDEX IF NOT EXISTS "idx_Booking_status" ON "Booking"("status");
CREATE INDEX IF NOT EXISTS "idx_Booking_startDate" ON "Booking"("startDate");
CREATE INDEX IF NOT EXISTS "idx_Booking_unitId_startDate" ON "Booking"("unitId", "startDate");

-- Invoices
CREATE INDEX IF NOT EXISTS "idx_Invoice_tenantId" ON "Invoice"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_Invoice_contractId" ON "Invoice"("contractId");
CREATE INDEX IF NOT EXISTS "idx_Invoice_bookingId" ON "Invoice"("bookingId");
CREATE INDEX IF NOT EXISTS "idx_Invoice_status" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "idx_Invoice_dueDate" ON "Invoice"("dueDate");

-- Payments
CREATE INDEX IF NOT EXISTS "idx_Payment_invoiceId" ON "Payment"("invoiceId");

-- Maintenance
CREATE INDEX IF NOT EXISTS "idx_MaintenanceTicket_unitId" ON "MaintenanceTicket"("unitId");
CREATE INDEX IF NOT EXISTS "idx_MaintenanceTicket_status" ON "MaintenanceTicket"("status");
CREATE INDEX IF NOT EXISTS "idx_MaintenanceAction_ticketId" ON "MaintenanceAction"("ticketId");

-- Contracts
CREATE INDEX IF NOT EXISTS "idx_Contract_tenantId" ON "Contract"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_Contract_unitId" ON "Contract"("unitId");
CREATE INDEX IF NOT EXISTS "idx_Contract_status" ON "Contract"("status");
CREATE INDEX IF NOT EXISTS "idx_Contract_startDate" ON "Contract"("startDate");
CREATE INDEX IF NOT EXISTS "idx_Contract_endDate" ON "Contract"("endDate");

-- Activity Logs
CREATE INDEX IF NOT EXISTS "idx_ActivityLog_contractId" ON "ActivityLog"("contractId");
CREATE INDEX IF NOT EXISTS "idx_ActivityLog_userId" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "idx_ActivityLog_createdAt" ON "ActivityLog"("createdAt");

-- Misc
CREATE INDEX IF NOT EXISTS "idx_User_createdAt" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_Property_type" ON "Property"("type");
CREATE INDEX IF NOT EXISTS "idx_Shop_ownerId" ON "Shop"("ownerId");
CREATE INDEX IF NOT EXISTS "idx_PasswordReset_userId" ON "PasswordReset"("userId");
