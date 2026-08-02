-- Renombrar cuentas demo para que no parezcan usuarios reales en el panel admin.

UPDATE admin_accounts
SET full_name = 'Usuario Prueba Admin 1'
WHERE email = 'admin@isaprespremium.cl';

UPDATE admin_accounts
SET full_name = 'Usuario Prueba'
WHERE email = 'superadmin@isaprespremium.cl';

UPDATE executive_accounts
SET full_name = 'Usuario Prueba Ejecutivo 1'
WHERE email = 'ejecutivo@isaprespremium.cl';

UPDATE executive_accounts
SET full_name = 'Usuario Prueba Ejecutivo 2'
WHERE email = 'ventas@isaprespremium.cl';

UPDATE users
SET full_name = 'Usuario Prueba Cliente 1'
WHERE email = 'juan.perez@demo.cl';

UPDATE users
SET full_name = 'Usuario Prueba Cliente 2'
WHERE email = 'ana.torres@demo.cl';

UPDATE users
SET full_name = 'Usuario Prueba Cliente 3'
WHERE email = 'carlos.munoz@demo.cl';

UPDATE quotes
SET full_name = 'Usuario Prueba Cliente 1'
WHERE email = 'juan.perez@demo.cl';

UPDATE quotes
SET full_name = 'Usuario Prueba Cliente 2'
WHERE email = 'ana.torres@demo.cl';

UPDATE quotes
SET full_name = 'Usuario Prueba Cliente 3'
WHERE email = 'carlos.munoz@demo.cl';

UPDATE quotes
SET notes = 'Cliente contactado por ejecutivo de prueba'
WHERE notes = 'Cliente contactado por ejecutivo María González';
