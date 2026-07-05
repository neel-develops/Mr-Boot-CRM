INSERT INTO staff (id, email, name, role, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid()::text, 'pankaj@mrboot.com', 'Pankaj', 'ADMIN', NOW(), NOW()),
  (gen_random_uuid()::text, 'vinita@mrboot.com', 'Vinita', 'ADMIN', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', "updatedAt" = NOW();
