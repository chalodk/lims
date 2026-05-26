-- Agrega columna analysis_type a reports para soportar tipos de analisis custom
-- Cuando un usuario elige un subtipo (ej. virology_pcr), se guarda aqui
-- para que pdfmonkey/route.ts pueda resolver el template ID correcto

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS analysis_type text;
