-- Add organization_id to support_tickets table
-- Enables proper RBAC filtering for org admins

ALTER TABLE support_tickets 
ADD COLUMN organization_id UUID REFERENCES profiles(id);

-- Create index for performance
CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);

-- Add comment for documentation
COMMENT ON COLUMN support_tickets.organization_id IS 'Organization ID for RBAC filtering - links to profiles table for org-based access control';
