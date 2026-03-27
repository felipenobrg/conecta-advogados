-- Seed para preencher a faixa de escassez da home
-- IMPORTANTE: os dados abaixo sao ficticios (realistas), sem dados pessoais reais.
-- Tabela alvo (Prisma): "Lead"

BEGIN;

INSERT INTO "Lead" (
  "id",
  "name",
  "email",
  "phone",
  "whatsappVerified",
  "area",
  "state",
  "status"
)
VALUES
  ('c8d4e1f8-2e17-4f0f-9d5a-9aa17f2a1101', 'Felipe Silva', 'felipe.silva@email.com', '+5511997342001', true,  'Direito Civil',        'SP', 'PENDING'),
  ('09bbf4a6-66a5-4ca8-9275-bc2d8cd43102', 'Mariana Costa', 'mariana.costa@email.com', '+5521978823102', true, 'Direito Trabalhista',  'RJ', 'CONTACTED'),
  ('df0e3f7b-8f8d-4bb2-9309-3b5f1e7a3103', 'Joao Almeida', 'joao.almeida@email.com', '+5531997714303', true, 'Direito de Familia',   'MG', 'PENDING'),
  ('f0a41b51-2f11-4f27-a2b1-2f6d4aa44104', 'Camila Rocha', 'camila.rocha@email.com', '+5541987625504', true, 'Direito Tributario',   'PR', 'PENDING'),
  ('a2dbe14d-88ab-4b9b-b44b-a64dc3ee2105', 'Ricardo Souza', 'ricardo.souza@email.com', '+5551987316605', true, 'Direito Criminal',     'RS', 'CONTACTED'),
  ('ecf62e18-6d3f-4a1b-b77a-faa00e8c6106', 'Patricia Lima', 'patricia.lima@email.com', '+5585987447706', true, 'Direito Previdenciario','CE', 'PENDING'),
  ('7d35d205-3aa2-4d9d-b246-55d58af19107', 'Anderson Nunes', 'anderson.nunes@email.com', '+5561987558807', true, 'Direito Empresarial',   'DF', 'PENDING'),
  ('cd78adfe-2a62-4f84-8e0f-b3c4b1294108', 'Bruna Martins', 'bruna.martins@email.com', '+5571987669908', true, 'Direito do Consumidor', 'BA', 'CONTACTED'),
  ('4f2e14a5-8147-4091-8bc4-bf1a7d22f109', 'Thiago Pereira', 'thiago.pereira@email.com', '+5598987781009', true, 'Direito Civil',         'MA', 'PENDING'),
  ('1831fa2f-c0b6-453b-95f0-c71f05f2f110', 'Larissa Gomes', 'larissa.gomes@email.com', '+5581987892110', true, 'Direito Trabalhista',   'PE', 'PENDING'),
  ('ca03ef80-97da-4eb8-b84d-7f667c4a4111', 'Eduardo Ribeiro', 'eduardo.ribeiro@email.com', '+5592987903211', true, 'Direito Tributario',    'AM', 'CONTACTED'),
  ('1f7f4f57-2b64-4f62-a391-a8f718451112', 'Aline Ferreira', 'aline.ferreira@email.com', '+5585988014312', true, 'Direito de Familia',    'CE', 'PENDING'),
  ('c9f7cfaf-7032-40e0-a3de-41f93dbd6113', 'Gustavo Carvalho', 'gustavo.carvalho@email.com', '+5521988125413', true, 'Direito Criminal',      'RJ', 'PENDING'),
  ('9e8d2f8e-cc2e-432f-8f45-cf30d2cf6114', 'Renata Araujo', 'renata.araujo@email.com', '+5531988236514', true, 'Direito Previdenciario', 'MG', 'CONTACTED'),
  ('6ccf0e4c-9824-4436-9bc8-bc0f12de5115', 'Leandro Dias', 'leandro.dias@email.com', '+5541988347615', true, 'Direito Empresarial',    'PR', 'PENDING'),
  ('11ef8a9d-df7b-4eb6-9d52-694e99319116', 'Vanessa Barbosa', 'vanessa.barbosa@email.com', '+5511998458716', true, 'Direito do Consumidor',  'SP', 'PENDING');

COMMIT;

-- Opcional: limpeza dos registros deste seed (descomente para usar)
-- DELETE FROM "Lead"
-- WHERE "id" IN (
--   'c8d4e1f8-2e17-4f0f-9d5a-9aa17f2a1101',
--   '09bbf4a6-66a5-4ca8-9275-bc2d8cd43102',
--   'df0e3f7b-8f8d-4bb2-9309-3b5f1e7a3103',
--   'f0a41b51-2f11-4f27-a2b1-2f6d4aa44104',
--   'a2dbe14d-88ab-4b9b-b44b-a64dc3ee2105',
--   'ecf62e18-6d3f-4a1b-b77a-faa00e8c6106',
--   '7d35d205-3aa2-4d9d-b246-55d58af19107',
--   'cd78adfe-2a62-4f84-8e0f-b3c4b1294108',
--   '4f2e14a5-8147-4091-8bc4-bf1a7d22f109',
--   '1831fa2f-c0b6-453b-95f0-c71f05f2f110',
--   'ca03ef80-97da-4eb8-b84d-7f667c4a4111',
--   '1f7f4f57-2b64-4f62-a391-a8f718451112',
--   'c9f7cfaf-7032-40e0-a3de-41f93dbd6113',
--   '9e8d2f8e-cc2e-432f-8f45-cf30d2cf6114',
--   '6ccf0e4c-9824-4436-9bc8-bc0f12de5115',
--   '11ef8a9d-df7b-4eb6-9d52-694e99319116'
-- );
