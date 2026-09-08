-- ============================================
-- Expense Splitter - Database Indexes
-- ============================================

-- Find all groups a user belongs to
CREATE INDEX idx_group_members_user_id
ON group_members(user_id);

-- Find expenses for a group, newest first
CREATE INDEX idx_expenses_group_created
ON expenses(group_id, created_at DESC);

-- Find expenses paid by a user
CREATE INDEX idx_expenses_paid_by
ON expenses(paid_by);

-- Find all splits belonging to an expense
CREATE INDEX idx_expense_splits_expense_id
ON expense_splits(expense_id);

-- Find all expenses involving a user
CREATE INDEX idx_expense_splits_user_id
ON expense_splits(user_id);

-- Find settlements for a group, newest first
CREATE INDEX idx_settlements_group_created
ON settlements(group_id, created_at DESC);

-- Find settlements made by a user
CREATE INDEX idx_settlements_from_user
ON settlements(from_user);

-- Find settlements received by a user
CREATE INDEX idx_settlements_to_user
ON settlements(to_user);

-- Find audit records for an entity
CREATE INDEX idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);

-- Find audit records created by a user
CREATE INDEX idx_audit_logs_user_id
ON audit_logs(user_id);