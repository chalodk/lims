ALTER TABLE samples ADD COLUMN IF NOT EXISTS organo_analizado text NULL;
COMMENT ON COLUMN samples.organo_analizado IS 'Órgano/tejido vegetal analizado (hoja, fruto, raíz, etc.)';
