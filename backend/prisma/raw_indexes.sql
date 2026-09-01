-- =======================================================
-- RAW SQL FOR POSTGRESQL OPTIMIZATION
-- Run this directly in your database or wrap in a migration
-- =======================================================

-- 1. Expression Indexes for Case-Insensitive Search
CREATE INDEX IF NOT EXISTS idx_aq_customers_name_lower ON aquasphere.customers (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_wd_customers_name_lower ON wadaana.customers (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_aq_users_email_lower ON aquasphere.users (LOWER(email));

-- 2. Partial Indexes for Highly Selective Filters
CREATE INDEX IF NOT EXISTS idx_aq_active_customers ON aquasphere.customers (id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wd_active_customers ON wadaana.customers (id) WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_aq_unpaid_orders ON aquasphere.orders (id) WHERE payment_status = 'UNPAID';
CREATE INDEX IF NOT EXISTS idx_wd_unpaid_orders ON wadaana.orders (id) WHERE payment_status = 'UNPAID';

CREATE INDEX IF NOT EXISTS idx_aq_pending_batches ON aquasphere.production_batches (id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_wd_pending_batches ON wadaana.production_batches (id) WHERE status = 'PENDING';
