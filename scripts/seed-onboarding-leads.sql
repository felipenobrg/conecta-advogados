-- Seed de leads fake para testes de onboarding do advogado
-- Objetivo: popular cards de leads bloqueados com dados realistas
-- Seguro para reexecucao (idempotente por id)

BEGIN;

-- 1) Usuarios advogados de teste (para gerar contagem de interessados via LeadUnlock)
INSERT INTO "User" (
  "id", "email", "name", "phone", "whatsappVerified", "role", "plan"
)
VALUES
  ('3f80f21c-8d3d-4f60-a2e5-d5fc4472b401', 'advogado.teste1@conecta.fake', 'Advogado Teste 1', '+5511999001001', true, 'LAWYER', 'PRO'),
  ('56f55d11-6c5f-4f6f-9f4b-c6205b96f402', 'advogado.teste2@conecta.fake', 'Advogado Teste 2', '+5511999001002', true, 'LAWYER', 'PRO'),
  ('a7a5f6b3-a74c-4ad8-a42d-896f9ad9c403', 'advogado.teste3@conecta.fake', 'Advogado Teste 3', '+5511999001003', true, 'LAWYER', 'PRO')
ON CONFLICT ("email") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "phone" = EXCLUDED."phone",
  "whatsappVerified" = EXCLUDED."whatsappVerified",
  "role" = EXCLUDED."role",
  "plan" = EXCLUDED."plan";

-- 2) Leads fake (mistura de status; onboarding usa PENDING)
INSERT INTO "Lead" (
  "id", "name", "email", "phone", "whatsappVerified", "area", "state", "status"
)
VALUES
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d001', 'Luana Oliveira', 'luana.oliveira@fakelead.com', '+5511987651001', true, 'Trabalhista', 'SP', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d002', 'Adilson Silva', 'adilson.silva@fakelead.com', '+5511987651002', true, 'Criminal', 'SP', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d003', 'Mariana Costa', 'mariana.costa@fakelead.com', '+5521987651003', true, 'Direito Civil', 'RJ', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d004', 'Rafael Mendes', 'rafael.mendes@fakelead.com', '+5531987651004', true, 'Familia', 'MG', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d005', 'Fernanda Lopes', 'fernanda.lopes@fakelead.com', '+5541987651005', true, 'Tributario', 'PR', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d006', 'Caio Araujo', 'caio.araujo@fakelead.com', '+5551987651006', true, 'Empresarial', 'RS', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d007', 'Patricia Nunes', 'patricia.nunes@fakelead.com', '+5561987651007', true, 'Previdenciario', 'DF', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d008', 'Bruno Martins', 'bruno.martins@fakelead.com', '+5571987651008', true, 'Consumidor', 'BA', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d009', 'Camila Souza', 'camila.souza@fakelead.com', '+5581987651009', true, 'Trabalhista', 'PE', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d010', 'Thiago Vieira', 'thiago.vieira@fakelead.com', '+5585987651010', true, 'Direito Civil', 'CE', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d011', 'Jessica Almeida', 'jessica.almeida@fakelead.com', '+5591987651011', true, 'Familia', 'PA', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d012', 'Leandro Rocha', 'leandro.rocha@fakelead.com', '+5592987651012', true, 'Criminal', 'AM', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d013', 'Vanessa Ribeiro', 'vanessa.ribeiro@fakelead.com', '+5511987651013', true, 'Tributario', 'SP', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d014', 'Eduardo Pires', 'eduardo.pires@fakelead.com', '+5531987651014', true, 'Empresarial', 'MG', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d015', 'Aline Barbosa', 'aline.barbosa@fakelead.com', '+5521987651015', true, 'Previdenciario', 'RJ', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d016', 'Gustavo Lima', 'gustavo.lima@fakelead.com', '+5541987651016', true, 'Consumidor', 'PR', 'PENDING'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d017', 'Renata Ferreira', 'renata.ferreira@fakelead.com', '+5551987651017', true, 'Trabalhista', 'RS', 'CONTACTED'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d018', 'Diego Cardoso', 'diego.cardoso@fakelead.com', '+5561987651018', true, 'Direito Civil', 'DF', 'LOST'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d019', 'Larissa Gomes', 'larissa.gomes@fakelead.com', '+5571987651019', true, 'Familia', 'BA', 'CONVERTED'),
  ('84d5a1e2-4a0f-4c38-b4db-5dc979e8d020', 'Otavio Santos', 'otavio.santos@fakelead.com', '+5581987651020', true, 'Criminal', 'PE', 'PENDING')
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "email" = EXCLUDED."email",
  "phone" = EXCLUDED."phone",
  "whatsappVerified" = EXCLUDED."whatsappVerified",
  "area" = EXCLUDED."area",
  "state" = EXCLUDED."state",
  "status" = EXCLUDED."status";

-- 3) Simula interesse/desbloqueios nos leads (usado para barra x/3)
INSERT INTO "LeadUnlock" ("id", "leadId", "userId")
VALUES
  ('3a5f7cb0-a6ff-4f0f-b59e-1f2ae27fb001', '84d5a1e2-4a0f-4c38-b4db-5dc979e8d001', '3f80f21c-8d3d-4f60-a2e5-d5fc4472b401'),
  ('3a5f7cb0-a6ff-4f0f-b59e-1f2ae27fb002', '84d5a1e2-4a0f-4c38-b4db-5dc979e8d001', '56f55d11-6c5f-4f6f-9f4b-c6205b96f402'),
  ('3a5f7cb0-a6ff-4f0f-b59e-1f2ae27fb003', '84d5a1e2-4a0f-4c38-b4db-5dc979e8d002', '3f80f21c-8d3d-4f60-a2e5-d5fc4472b401'),
  ('3a5f7cb0-a6ff-4f0f-b59e-1f2ae27fb004', '84d5a1e2-4a0f-4c38-b4db-5dc979e8d003', '3f80f21c-8d3d-4f60-a2e5-d5fc4472b401'),
  ('3a5f7cb0-a6ff-4f0f-b59e-1f2ae27fb005', '84d5a1e2-4a0f-4c38-b4db-5dc979e8d003', '56f55d11-6c5f-4f6f-9f4b-c6205b96f402'),
  ('3a5f7cb0-a6ff-4f0f-b59e-1f2ae27fb006', '84d5a1e2-4a0f-4c38-b4db-5dc979e8d003', 'a7a5f6b3-a74c-4ad8-a42d-896f9ad9c403'),
  ('3a5f7cb0-a6ff-4f0f-b59e-1f2ae27fb007', '84d5a1e2-4a0f-4c38-b4db-5dc979e8d004', '56f55d11-6c5f-4f6f-9f4b-c6205b96f402'),
  ('3a5f7cb0-a6ff-4f0f-b59e-1f2ae27fb008', '84d5a1e2-4a0f-4c38-b4db-5dc979e8d005', 'a7a5f6b3-a74c-4ad8-a42d-896f9ad9c403')
ON CONFLICT ("leadId", "userId") DO NOTHING;

COMMIT;

-- Execucao recomendada:
-- 1) Supabase SQL Editor: cole este arquivo e execute
-- 2) psql: psql "$DATABASE_URL" -f scripts/seed-onboarding-leads.sql

-- Limpeza rapida (opcional):
-- DELETE FROM "LeadUnlock" WHERE "id" LIKE '3a5f7cb0-a6ff-4f0f-b59e-%';
-- DELETE FROM "Lead" WHERE "id" LIKE '84d5a1e2-4a0f-4c38-b4db-%';
-- DELETE FROM "User" WHERE "email" IN (
--   'advogado.teste1@conecta.fake',
--   'advogado.teste2@conecta.fake',
--   'advogado.teste3@conecta.fake'
-- );
