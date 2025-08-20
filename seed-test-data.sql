-- Seed test_catalog table with basic test entries
INSERT INTO test_catalog (code, name, area, active) VALUES
  ('NEMA-001', 'Análisis Nematológico', 'nematologia', true),
  ('FITO-001', 'Análisis Fitopatológico', 'fitopatologia', true),
  ('VIRO-001', 'Análisis Virológico', 'virologia', true),
  ('ENTO-001', 'Análisis Entomológico', 'fitopatologia', true),
  ('PREC-001', 'Detección Precoz de Enfermedades', 'deteccion_precoz', true)
ON CONFLICT (code) DO NOTHING;

-- Seed methods table with basic method entries
INSERT INTO methods (code, name, matrix) VALUES
  ('COBB-BAE', 'Tamizado de Cobb y Embudo de Baermann', 'suelo'),
  ('CENTRI', 'Centrífuga', 'suelo'),
  ('INCUB-COBB', 'Incubación y Tamizado de Cobb', 'suelo'),
  ('PETRI', 'Placa Petri', 'hoja'),
  ('INCUB', 'Incubación', 'hoja'),
  ('HUMID-CAM', 'Cámara Húmeda', 'hoja'),
  ('COL-COUNT', 'Recuento de Colonias', 'raiz'),
  ('TAX-TRAD', 'Taxonomía Tradicional', 'suelo'),
  ('PCR', 'PCR', 'hoja'),
  ('RT-PCR', 'RT-PCR', 'hoja'),
  ('ELISA', 'ELISA', 'hoja')
ON CONFLICT (code) DO NOTHING;

-- Link some tests to default methods
UPDATE test_catalog SET default_method_id = (SELECT id FROM methods WHERE code = 'COBB-BAE' LIMIT 1) WHERE code = 'NEMA-001';
UPDATE test_catalog SET default_method_id = (SELECT id FROM methods WHERE code = 'HUMID-CAM' LIMIT 1) WHERE code = 'FITO-001';
UPDATE test_catalog SET default_method_id = (SELECT id FROM methods WHERE code = 'RT-PCR' LIMIT 1) WHERE code = 'VIRO-001';