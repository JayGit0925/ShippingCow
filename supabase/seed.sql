-- Phase 0 seed data for local development

-- Create a demo org (users must be created via app/auth flow)
INSERT INTO orgs (id, name, tenant_type, tier)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Seller', 'seller', 'calf');
