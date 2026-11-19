-- 029: Catálogo base de suelo (docs/Matriz analitos V2.xlsx).
-- seed_soil_catalog(company_id) carga o actualiza el catálogo de una company. Solo CSX.
-- Idempotente por (company_id, analysis_key): al repetir, actualiza título, unidad, columnas,
-- discriminador, activo, nota y orden, y deja las matrices iguales a esta lista.
-- Excepciones respecto de la columna E de la matriz:
--   Cl soluble en mg/L queda en G para agua y líquido. Cl total en mg/Kg queda en H para sólidos.
--   Ca, K y Na extractables: N es mg/Kg y O es cmol+/Kg. Una línea por unidad, sin pareja intercambiable.
--   Conductividad directa de agua y líquido en µS/cm. El 1:5 de suelo también es µS/cm.
--   Huevos viables en S e inviables en T, en huevos/mL.
--   CaCO3 equivalente se lee desde la fila 26, columna J (el perfil de la hoja, no este catálogo).
--   Fe soluble y Fe total conservan títulos distintos (la matriz dice Fe en ambos).
--   Na en cmol+/Kg (la matriz escribe cmol+Kg).
--   pH, conductividad y clorofila guardan discriminador y valor por separado
--   (la matriz anota "D, C", "E, C" y "C, N").
--   Retención de humedad es una columna por resultado. Rabanitos distingue Directo y Dil.
--   Sustancias húmicas: base húmeda y base seca en el informe de producto.
--   Los balances de C y N (títulos C- y N-) entran solo en la caracterización elemental.
--   Tamaño de partícula usa la apertura en B y el % en F.
-- Las claves retiradas en esta versión (intercambiable duplicado, cloro en H para líquidos,
-- conductividad directa partida por unidad, huevos en una sola columna) quedan inactive.
-- Requiere 028.

CREATE OR REPLACE FUNCTION public.seed_soil_catalog(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seeded_count integer;
BEGIN
  IF NOT is_csx() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  WITH catalog (
    analysis_key, report_title, unit, result_kind, method_label, excel_sheet,
    excel_value_column, excel_discriminator_column, excel_discriminator_value,
    excel_unit_column, excel_subsample_column, active, pending_note, sort_order, matrix_keys
  ) AS (
    VALUES
    ('actinomyces_spp_ufc_g_multi_matriz', 'Actinomyces spp', 'UFC/g', 'numeric', NULL, 'Actinomycetota', 'D', NULL, NULL, NULL, 'B', true, NULL, 10, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('acido_indolacetico_mg_kg_suelo_compost_liquido_fertilizante', 'Ácido indolacético', 'mg/Kg', 'numeric', NULL, 'AIA', 'I', NULL, NULL, NULL, 'B', true, NULL, 20, ARRAY['suelo', 'compost', 'liquido', 'fertilizante']::text[]),
    ('al_extractable_mg_kg_multi_matriz', 'Al extractable', 'mg/Kg', 'numeric', NULL, 'Al extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 30, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('al_total_mg_kg_multi_matriz', 'Al Total', 'mg/Kg', 'numeric', NULL, 'Al Total', 'N', NULL, NULL, NULL, 'B', true, NULL, 40, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('almidon_mg_kg_raices', 'Almidón', 'mg/Kg', 'numeric', NULL, 'Almidón', 'I', NULL, NULL, NULL, 'B', true, NULL, 50, ARRAY['raices']::text[]),
    ('microorganismos_amiloliticos_ufc_g_multi_matriz', 'Microorganismos amilolíticos', 'UFC/g', 'numeric', NULL, 'Amiloliticos', 'D', NULL, NULL, NULL, 'B', true, NULL, 60, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('amonio_monooxigenasa_ug_no2_g_h_metodo_2026_suelo_compost_liquido', 'Amonio monooxigenasa', 'ug NO2/(g*h)', 'numeric', 'Método 2026', 'AMO Método 2026', 'U', NULL, NULL, NULL, 'B', true, NULL, 70, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('amonio_monooxigenasa_ug_no2_g_h_metodo_anterior_suelo_compost_liquido', 'Amonio monooxigenasa', 'ug NO2/(g*h)', 'numeric', 'Método anterior', 'Amonio Monooxigenasa (AMO)', 'L', NULL, NULL, NULL, 'B', true, NULL, 80, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('arginina_mg_kg_raices', 'Arginina', 'mg/Kg', 'numeric', NULL, 'Arginina', 'I', NULL, NULL, NULL, 'B', true, NULL, 90, ARRAY['raices']::text[]),
    ('arilsulfatasa_ug_p_nitrofenol_g_h_multi_matriz', 'Arilsulfatasa', 'ug p-nitrofenol/(g*h)', 'numeric', NULL, 'Arilsulfatasa', 'Q', NULL, NULL, NULL, 'B', true, NULL, 100, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('b_extractable_mg_kg_suelo_compost', 'B extractable', 'mg/Kg', 'numeric', NULL, 'B extractable', 'J', NULL, NULL, NULL, 'B', true, NULL, 110, ARRAY['suelo', 'compost']::text[]),
    ('b_soluble_mg_kg_agua_fruto_liquido', 'B soluble', 'mg/Kg', 'numeric', NULL, 'B soluble', 'J', NULL, NULL, NULL, 'B', true, NULL, 120, ARRAY['agua', 'fruto', 'liquido']::text[]),
    ('b_total_mg_kg_foliar_fruto_compost', 'B total', 'mg/Kg', 'numeric', NULL, 'B total', 'J', NULL, NULL, NULL, 'B', true, NULL, 130, ARRAY['foliar', 'fruto', 'compost']::text[]),
    ('bacillus_spp_ufc_g_suelo_liquido_compost', 'Bacillus spp.', 'UFC/g', 'numeric', NULL, 'Bacillus', 'D', NULL, NULL, NULL, 'B', true, NULL, 140, ARRAY['suelo', 'liquido', 'compost']::text[]),
    ('glucosidasa_up_g_p_nitrofenol_g_h_multi_matriz', 'β-glucosidasa', 'UP (μg p-nitrofenol/(g*h))', 'numeric', NULL, 'Betaglucosidasa', 'R', NULL, NULL, NULL, 'B', true, NULL, 150, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('c_soluble_mg_kg_multi_matriz', 'C soluble', 'mg/Kg', 'numeric', NULL, 'C soluble', 'I', NULL, NULL, NULL, 'B', true, NULL, 160, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('c_total_multi_matriz', 'C total', '%', 'numeric', NULL, 'C total', 'D', NULL, NULL, NULL, 'B', true, NULL, 170, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('ca_extractable_mg_kg_suelo', 'Ca extractable', 'mg/Kg', 'numeric', NULL, 'Ca extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 185, ARRAY['suelo']::text[]),
    ('ca_extractable_cmol_kg_suelo', 'Ca extractable', 'cmol+/Kg', 'numeric', NULL, 'Ca extractable', 'O', NULL, NULL, NULL, 'B', true, NULL, 190, ARRAY['suelo']::text[]),
    ('ca_ligado_mg_kg_fruto', 'Ca ligado', 'mg/Kg', 'numeric', NULL, 'Ca ligado', 'E', NULL, NULL, NULL, 'B', true, NULL, 200, ARRAY['fruto']::text[]),
    ('ca_ligado_foliar_raquis_suelo_compost', 'Ca ligado', '%', 'numeric', NULL, 'Ca ligado', 'E', NULL, NULL, NULL, 'B', true, NULL, 210, ARRAY['foliar', 'raquis', 'suelo', 'compost']::text[]),
    ('ca_soluble_mg_kg', 'Ca soluble', 'mg/Kg', 'numeric', NULL, 'Ca soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 225, ARRAY['fruto', 'foliar', 'raquis', 'suelo', 'compost']::text[]),
    ('ca_total_mg_kg_fruto', 'Ca total', 'mg/Kg', 'numeric', NULL, 'Ca total', 'N', NULL, NULL, NULL, 'B', true, NULL, 240, ARRAY['fruto']::text[]),
    ('ca_total_foliar_raquis_suelo_compost', 'Ca total', '%', 'numeric', NULL, 'Ca total', 'O', NULL, NULL, NULL, 'B', true, NULL, 250, ARRAY['foliar', 'raquis', 'suelo', 'compost']::text[]),
    ('caco3_equivalente_suelo', 'CaCO3 equivalente', '%', 'numeric', NULL, 'CaCO3 Eq', 'J', NULL, NULL, NULL, NULL, true, NULL, 260, ARRAY['suelo']::text[]),
    ('capacidad_de_campo_ml_g_suelo', 'Capacidad de campo', 'mL/g', 'numeric', NULL, 'Capacidad de campo', 'I', NULL, NULL, NULL, 'B', true, NULL, 270, ARRAY['suelo']::text[]),
    ('capacidad_neutralizante_mg_caco3_l_suelo', 'Capacidad Neutralizante', 'mg CaCO3/L', 'numeric', NULL, 'Capacidad Neutralizante', 'H', NULL, NULL, NULL, 'B', true, NULL, 280, ARRAY['suelo']::text[]),
    ('cd_soluble_mg_l_agua_liquido', 'Cd soluble', 'mg/L', 'numeric', NULL, 'Cd soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 290, ARRAY['agua', 'liquido']::text[]),
    ('cd_soluble_mg_kg_suelo_fertilizante_compost', 'Cd soluble', 'mg/Kg', 'numeric', NULL, 'Cd soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 300, ARRAY['suelo', 'fertilizante', 'compost']::text[]),
    ('cd_total_mg_kg_foliar_compost_fertilizante_fruto', 'Cd Total', 'mg/Kg', 'numeric', NULL, 'Cd Total', 'N', NULL, NULL, NULL, 'B', true, NULL, 310, ARRAY['foliar', 'compost', 'fertilizante', 'fruto']::text[]),
    ('celuloliticos_ufc_g_multi_matriz', 'Celuloliticos', 'UFC/g', 'numeric', NULL, 'Celuloliticos', 'D', NULL, NULL, NULL, 'B', true, NULL, 320, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('cic_cmol_na_kg_suelo', 'CIC', 'cmol+Na/Kg', 'numeric', NULL, 'CIC', 'M', NULL, NULL, NULL, 'B', true, NULL, 330, ARRAY['suelo']::text[]),
    ('cl_total_mg_kg_multi_matriz', 'Cl total', 'mg/Kg', 'numeric', NULL, 'Cloro', 'H', NULL, NULL, NULL, 'B', true, NULL, 340, ARRAY['suelo', 'compost', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('cl_soluble_mg_l_agua_liquido', 'Cl soluble', 'mg/L', 'numeric', NULL, 'Cloro', 'G', NULL, NULL, NULL, 'B', true, NULL, 350, ARRAY['agua', 'liquido']::text[]),
    ('clorofila_a_icf_foliar', 'Clorofila A', 'ICF', 'numeric', NULL, 'Clorofila', 'N', 'C', 'A', NULL, 'B', true, NULL, 370, ARRAY['foliar']::text[]),
    ('clorofila_b_icf_foliar', 'Clorofila B', 'ICF', 'numeric', NULL, 'Clorofila', 'N', 'C', 'B', NULL, 'B', true, NULL, 380, ARRAY['foliar']::text[]),
    ('coliformes_totales_nmp_4_g_multi_matriz', 'Coliformes totales', 'NMP/4 g', 'numeric', NULL, 'Coliformes', 'D', NULL, NULL, NULL, 'B', true, NULL, 390, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('coliformes_fecales_nmp_4_g_multi_matriz', 'Coliformes fecales', 'NMP/4 g', 'numeric', NULL, 'Coliformes', 'E', NULL, NULL, NULL, 'B', true, NULL, 400, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('e_coli_nmp_4_g_multi_matriz', 'E. Coli', 'NMP/4 g', 'numeric', NULL, 'Coliformes', 'F', NULL, NULL, NULL, 'B', true, NULL, 410, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('conductividad_electrica_directa_us_cm_agua_liquido', 'Conductividad eléctrica (directa)', 'μS/cm', 'numeric', NULL, 'Conductividad eléctrica', 'C', 'E', 'directo', 'D', 'B', true, NULL, 420, ARRAY['agua', 'liquido']::text[]),
    ('conductividad_electrica_1_2_5_ds_m_suelo', 'Conductividad eléctrica (1:2,5)', 'dS/m', 'numeric', NULL, 'Conductividad eléctrica', 'C', 'E', '1:2,5', 'D', 'B', true, NULL, 430, ARRAY['suelo']::text[]),
    ('conductividad_electrica_1_5_us_cm_suelo', 'Conductividad eléctrica (1:5)', 'μS/cm', 'numeric', NULL, 'Conductividad eléctrica', 'C', 'E', '1:5', 'D', 'B', true, NULL, 435, ARRAY['suelo']::text[]),
    ('conductividad_electrica_1_5_ms_cm_compost', 'Conductividad eléctrica (1:5)', 'mS/cm', 'numeric', NULL, 'Conductividad eléctrica', 'C', 'E', '1:5', 'D', 'B', true, NULL, 450, ARRAY['compost']::text[]),
    ('conductividad_electrica_hasta_saturacion_ds_m_suelo', 'Conductividad eléctrica (Hasta saturación)', 'dS/m', 'numeric', NULL, 'Conductividad eléctrica', 'C', 'E', 'Hasta saturación', 'D', 'B', true, NULL, 455, ARRAY['suelo']::text[]),
    ('contenido_de_cenizas_multi_matriz', 'Contenido de Cenizas', '%', 'numeric', NULL, 'Contenido de Cenizas', 'G', NULL, NULL, NULL, 'B', true, NULL, 460, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('cr_total_mg_kg_multi_matriz', 'Cr Total', 'mg/Kg', 'numeric', NULL, 'Cr Total', 'N', NULL, NULL, NULL, 'B', true, NULL, 470, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('cu_dtpa_mg_kg_suelo_compost', 'Cu-DTPA', 'mg/Kg', 'numeric', NULL, 'Cu extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 480, ARRAY['suelo', 'compost']::text[]),
    ('cu_soluble_mg_l_agua_liquido', 'Cu soluble', 'mg/L', 'numeric', NULL, 'Cu soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 490, ARRAY['agua', 'liquido']::text[]),
    ('cu_soluble_mg_kg_foliar_compost_fertilizante_fruto', 'Cu soluble', 'mg/Kg', 'numeric', NULL, 'Cu soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 500, ARRAY['foliar', 'compost', 'fertilizante', 'fruto']::text[]),
    ('cu_total_mg_kg_compost_foliar_fruto', 'Cu total', 'mg/Kg', 'numeric', NULL, 'Cu total', 'N', NULL, NULL, NULL, 'B', true, NULL, 510, ARRAY['compost', 'foliar', 'fruto']::text[]),
    ('densidad_aparente_g_ml_suelo_compost_fertilizante', 'Densidad aparente', 'g/mL', 'numeric', NULL, 'Densidad aparente', 'G', NULL, NULL, NULL, 'B', true, NULL, 520, ARRAY['suelo', 'compost', 'fertilizante']::text[]),
    ('densidad_real_g_ml_suelo', 'Densidad real', 'g/mL', 'numeric', NULL, 'Densidad real', 'G', NULL, NULL, NULL, 'B', true, NULL, 530, ARRAY['suelo']::text[]),
    ('densidad_g_ml_agua_liquido', 'Densidad', 'g/mL', 'numeric', NULL, 'Liquido-Densidad', 'H', NULL, NULL, NULL, 'B', true, NULL, 540, ARRAY['agua', 'liquido']::text[]),
    ('deshidrogenasa_udh_g_de_tfp_g_dia_multi_matriz', 'Deshidrogenasa', 'UDH (μg de TFP/(g*día))', 'numeric', NULL, 'Deshidrogenasa', 'P', NULL, NULL, NULL, 'B', true, NULL, 550, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('dureza_mg_caco3_l_agua', 'Dureza', 'mg CaCO3/L', 'numeric', NULL, 'Dureza', 'E', NULL, NULL, NULL, 'B', true, NULL, 560, ARRAY['agua']::text[]),
    ('espacio_poroso_suelo', 'Espacio poroso', NULL, 'numeric', NULL, 'Espacio poroso', 'E', NULL, NULL, NULL, 'B', true, NULL, 570, ARRAY['suelo']::text[]),
    ('esporas_esporas_ml_hongos', 'Esporas', 'esporas/mL', 'numeric', NULL, 'Esporas', 'C', NULL, NULL, NULL, 'B', true, NULL, 580, ARRAY['hongos']::text[]),
    ('fe_dtpa_mg_kg_suelo', 'Fe-DTPA', 'mg/Kg', 'numeric', NULL, 'Fe extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 590, ARRAY['suelo']::text[]),
    ('fe_soluble_mg_kg_suelo_agua_compost', 'Fe soluble', 'mg/Kg', 'numeric', NULL, 'Fe soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 600, ARRAY['suelo', 'agua', 'compost']::text[]),
    ('fe_total_mg_kg_suelo_agua_compost_tejido_vegetal', 'Fe total', 'mg/Kg', 'numeric', NULL, 'Fe total', 'N', NULL, NULL, NULL, 'B', true, NULL, 610, ARRAY['suelo', 'agua', 'compost', 'tejido_vegetal']::text[]),
    ('fijadores_de_nitrogeno_de_tipo_azotobacter_spp_ufc_g_multi_matriz', 'Fijadores de Nitrogeno de tipo Azotobacter spp', 'UFC/g', 'numeric', NULL, 'Fijadores de Nitrogeno', 'D', NULL, NULL, NULL, 'B', true, NULL, 620, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('fluoresceina_diacetato_fda_g_de_fluoresceina_g_h_multi_matriz', 'Fluoresceina diacetato', 'FDA (μg de fluoresceína/(g*h))', 'numeric', NULL, 'Fluoresceina', 'Q', NULL, NULL, NULL, 'B', true, NULL, 630, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('fosfatasa_acida_ug_p_nitrofenol_g_h_multi_matriz', 'Fosfatasa ácida', 'ug p-nitrofenol/(g*h)', 'numeric', NULL, 'Fosfatasa ác.', 'P', NULL, NULL, NULL, 'B', true, NULL, 640, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('fosfatasa_alcalina_ug_p_nitrofenol_g_h_multi_matriz', 'Fosfatasa alcalina', 'ug p-nitrofenol/(g*h)', 'numeric', NULL, 'Fosfatasa al.', 'P', NULL, NULL, NULL, 'B', true, NULL, 650, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('microorganismos_fosfatosolubilizadores_ufc_g_multi_matriz', 'Microorganismos fosfatosolubilizadores', 'UFC/g', 'numeric', NULL, 'Fosfato Solubilizadores', 'D', NULL, NULL, NULL, 'B', true, NULL, 660, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('malezas_compost_digestato', 'Malezas', '%', 'numeric', NULL, 'germinación de maleza', 'B', NULL, NULL, NULL, NULL, true, NULL, 670, ARRAY['compost', 'digestato']::text[]),
    ('hongos_filamentosos_ufc_g_multi_matriz', 'Hongos filamentosos', 'UFC/g', 'numeric', NULL, 'Hongos Filamentosos', 'D', NULL, NULL, NULL, 'B', true, NULL, 680, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('huevos_viables_ml_compost_digestato', 'Huevos viables', 'huevos/mL', 'numeric', NULL, 'Huevos de helmintos', 'S', NULL, NULL, NULL, 'C', true, NULL, 691, ARRAY['compost', 'digestato']::text[]),
    ('huevos_inviables_ml_compost_digestato', 'Huevos inviables', 'huevos/mL', 'numeric', NULL, 'Huevos de helmintos', 'T', NULL, NULL, NULL, 'C', true, NULL, 692, ARRAY['compost', 'digestato']::text[]),
    ('humedad_multi_matriz', 'Humedad', '%', 'numeric', NULL, 'Humedad', 'H', NULL, NULL, NULL, 'B', true, NULL, 700, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('k_extractable_mg_kg_suelo_compost', 'K extractable', 'mg/Kg', 'numeric', NULL, 'K extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 710, ARRAY['suelo', 'compost']::text[]),
    ('k_extractable_cmol_kg_suelo_compost', 'K extractable', 'cmol+/Kg', 'numeric', NULL, 'K extractable', 'O', NULL, NULL, NULL, 'B', true, NULL, 720, ARRAY['suelo', 'compost']::text[]),
    ('k_soluble_mg_kg_multi_matriz', 'K soluble', 'mg/Kg', 'numeric', NULL, 'K soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 750, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('k_soluble_mg_l_agua_liquido', 'K soluble', 'mg/L', 'numeric', NULL, 'K soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 760, ARRAY['agua', 'liquido']::text[]),
    ('k_total_compost_digestato_fruto_foliar_fertilizante', 'K total', '%', 'numeric', NULL, 'K total', 'M', NULL, NULL, NULL, 'B', true, NULL, 770, ARRAY['compost', 'digestato', 'fruto', 'foliar', 'fertilizante']::text[]),
    ('levaduras_ufc_g_multi_matriz', 'Levaduras', 'UFC/g', 'numeric', NULL, 'Levaduras Totales', 'D', NULL, NULL, NULL, 'B', true, NULL, 780, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('pom_suelo', 'POM', '%', 'numeric', NULL, 'MAOM y POM', 'O', NULL, NULL, NULL, 'B', true, NULL, 790, ARRAY['suelo']::text[]),
    ('maom_suelo', 'MAOM', '%', 'numeric', NULL, 'MAOM y POM', 'N', NULL, NULL, NULL, 'B', true, NULL, 800, ARRAY['suelo']::text[]),
    ('plasticos_flexibles_4_mm_compost', 'Plasticos flexibles > 4 mm', '%', 'numeric', NULL, 'materia inerte', 'I', NULL, NULL, NULL, 'B', true, NULL, 810, ARRAY['compost']::text[]),
    ('piedras_y_terrones_4_mm_compost', 'Piedras y terrones > 4 mm', '%', 'numeric', NULL, 'materia inerte', 'J', NULL, NULL, NULL, 'B', true, NULL, 820, ARRAY['compost']::text[]),
    ('vidrio_metales_caucho_y_plasticos_rigidos_4_mm_compost', 'Vidrio, metales, caucho y plásticos rígidos > 4 mm', '%', 'numeric', NULL, 'materia inerte', 'K', NULL, NULL, NULL, 'B', true, NULL, 830, ARRAY['compost']::text[]),
    ('materia_organica_multi_matriz', 'Materia orgánica', '%', 'numeric', NULL, 'Materia orgánica', 'D', NULL, NULL, NULL, 'B', true, NULL, 840, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('mesofilos_ufc_g_multi_matriz', 'Mesófilos', 'UFC/g', 'numeric', NULL, 'Mesófilos', 'D', NULL, NULL, NULL, 'B', true, NULL, 850, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('mg_extractable_cmol_kg_suelo_compost', 'Mg extractable', 'cmol+/Kg', 'numeric', NULL, 'Mg extractable', 'O', NULL, NULL, NULL, 'B', true, NULL, 860, ARRAY['suelo', 'compost']::text[]),
    ('mg_extractable_mg_kg_suelo_compost', 'Mg extractable', 'mg/Kg', 'numeric', NULL, 'Mg extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 870, ARRAY['suelo', 'compost']::text[]),
    ('mg_soluble_mg_l_agua_liquido', 'Mg soluble', 'mg/L', 'numeric', NULL, 'Mg soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 880, ARRAY['agua', 'liquido']::text[]),
    ('mg_soluble_mg_kg_multi_matriz', 'Mg soluble', 'mg/Kg', 'numeric', NULL, 'Mg soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 890, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('mg_total_fertilizante_compost_fruto_foliar_digestato', 'Mg total', '%', 'numeric', NULL, 'Mg total', 'O', NULL, NULL, NULL, 'B', true, NULL, 900, ARRAY['fertilizante', 'compost', 'fruto', 'foliar', 'digestato']::text[]),
    ('mn_dtpa_mg_kg_suelo', 'Mn-DTPA', 'mg/Kg', 'numeric', NULL, 'Mn extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 910, ARRAY['suelo']::text[]),
    ('mn_soluble_mg_l_liquido_agua', 'Mn soluble', 'mg/L', 'numeric', NULL, 'Mn soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 920, ARRAY['liquido', 'agua']::text[]),
    ('mn_soluble_mg_kg_multi_matriz', 'Mn soluble', 'mg/Kg', 'numeric', NULL, 'Mn soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 930, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('mn_total_mg_kg_multi_matriz', 'Mn total', 'mg/Kg', 'numeric', NULL, 'Mn total', 'N', NULL, NULL, NULL, 'B', true, NULL, 940, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('mo_total_mg_l_agua_liquido', 'Mo total', 'mg/L', 'numeric', NULL, 'Mo Total', 'N', NULL, NULL, NULL, 'B', true, NULL, 950, ARRAY['agua', 'liquido']::text[]),
    ('mo_total_mg_kg_multi_matriz', 'Mo total', 'mg/Kg', 'numeric', NULL, 'Mo Total', 'N', NULL, NULL, NULL, 'B', true, NULL, 960, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('n_total_multi_matriz', 'N total', '%', 'numeric', NULL, 'N total', 'D', NULL, NULL, NULL, 'B', true, NULL, 970, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('na_extractable_cmol_kg_suelo_compost', 'Na extractable', 'cmol+/Kg', 'numeric', NULL, 'Na extractable', 'O', NULL, NULL, NULL, 'B', true, NULL, 1000, ARRAY['suelo', 'compost']::text[]),
    ('na_extractable_mg_kg_suelo_compost', 'Na extractable', 'mg/Kg', 'numeric', NULL, 'Na extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 1010, ARRAY['suelo', 'compost']::text[]),
    ('na_soluble_mg_l_agua', 'Na soluble', 'mg/L', 'numeric', NULL, 'Na soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 1020, ARRAY['agua']::text[]),
    ('na_soluble_mg_kg_suelo_compost', 'Na soluble', 'mg/Kg', 'numeric', NULL, 'Na soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 1030, ARRAY['suelo', 'compost']::text[]),
    ('na_total_mg_l_agua', 'Na total', 'mg/L', 'numeric', NULL, 'Na total', 'N', NULL, NULL, NULL, 'B', true, NULL, 1040, ARRAY['agua']::text[]),
    ('na_total_compost_foliar_fruto', 'Na total', '%', 'numeric', NULL, 'Na total', 'O', NULL, NULL, NULL, 'B', true, NULL, 1050, ARRAY['compost', 'foliar', 'fruto']::text[]),
    ('ni_total_mg_kg_multi_matriz', 'Ni total', 'mg/Kg', 'numeric', NULL, 'Ni total', 'N', NULL, NULL, NULL, 'B', true, NULL, 1060, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('n_nh4_mg_kg_multi_matriz', 'N-NH4', 'mg/Kg', 'numeric', NULL, 'N-NH4', 'J', NULL, NULL, NULL, 'B', true, NULL, 1070, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('n_no3_mg_kg_multi_matriz', 'N-NO3', 'mg/Kg', 'numeric', NULL, 'N-NO3', 'J', NULL, NULL, NULL, 'B', true, NULL, 1080, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('olor_compost', 'Olor', NULL, 'text', NULL, 'Olor', 'B', NULL, NULL, NULL, NULL, true, NULL, 1090, ARRAY['compost']::text[]),
    ('p_extractable_mg_kg_suelo', 'P extractable', 'mg/Kg', 'numeric', NULL, 'P Olsen', 'I', NULL, NULL, NULL, 'B', true, NULL, 1100, ARRAY['suelo']::text[]),
    ('p_soluble_mg_kg_multi_matriz', 'P soluble', 'mg/Kg', 'numeric', NULL, 'P soluble', 'I', NULL, NULL, NULL, 'B', true, NULL, 1110, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('p_total_multi_matriz', 'P total', '%', 'numeric', NULL, 'P total', 'J', NULL, NULL, NULL, 'B', true, NULL, 1120, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('pb_total_mg_kg_compost_liquido_foliar', 'Pb Total', 'mg/Kg', 'numeric', NULL, 'Pb Total', 'N', NULL, NULL, NULL, 'B', true, NULL, 1130, ARRAY['compost', 'liquido', 'foliar']::text[]),
    ('ph_1_2_5_suelo', 'pH (1:2,5)', NULL, 'numeric', NULL, 'pH', 'C', 'D', '1:2,5', NULL, 'B', true, NULL, 1140, ARRAY['suelo']::text[]),
    ('ph_hasta_saturacion_suelo', 'pH (Hasta saturación)', NULL, 'numeric', NULL, 'pH', 'C', 'D', 'Hasta saturación', NULL, 'B', true, NULL, 1145, ARRAY['suelo']::text[]),
    ('ph_1_5_compost', 'pH (1:5)', NULL, 'numeric', NULL, 'pH', 'C', 'D', '1:5', NULL, 'B', true, NULL, 1150, ARRAY['compost']::text[]),
    ('ph_directo_liquido_fruto', 'pH (directo)', NULL, 'numeric', NULL, 'pH', 'C', 'D', 'directo', NULL, 'B', true, NULL, 1160, ARRAY['liquido', 'fruto']::text[]),
    ('microorganismos_proteoliticos_ufc_g_multi_matriz', 'Microorganismos proteolíticos', 'UFC/g', 'numeric', NULL, 'Proteoliticos', 'D', NULL, NULL, NULL, 'B', true, NULL, 1170, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('pseudomonas_spp_ufc_g_multi_matriz', 'Pseudomonas spp', 'UFC/g', 'numeric', NULL, 'Pseudomonas', 'D', NULL, NULL, NULL, 'B', true, NULL, 1180, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('germinacion_de_rabanitos_directo', 'Germinación de rabanitos', '%', 'numeric', 'Directo', 'Rabanitos', 'C', 'B', 'directo', NULL, NULL, true, NULL, 1191, ARRAY['compost', 'digestato']::text[]),
    ('germinacion_de_rabanitos_diluido', 'Germinación de rabanitos', '%', 'numeric', 'Diluido', 'Rabanitos', 'C', 'B', 'dil', NULL, NULL, true, NULL, 1192, ARRAY['compost', 'digestato']::text[]),
    ('ras_agua_suelo', 'RAS', NULL, 'numeric', NULL, 'RAS', 'H', NULL, NULL, NULL, 'B', true, NULL, 1200, ARRAY['agua', 'suelo']::text[]),
    ('relacion_c_n_multi_matriz', 'Relación C/N', NULL, 'numeric', NULL, 'Relación CN', 'D', NULL, NULL, NULL, 'B', true, NULL, 1210, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('respiracion_de_suelo_mg_c_co2_kg_dia_suelo_compost', 'Respiración de suelo', 'mg C-CO2/(Kg*día)', 'numeric', NULL, 'Respiración', 'H', NULL, NULL, NULL, 'B', true, NULL, 1220, ARRAY['suelo', 'compost']::text[]),
    ('retencion_humedad_0_3_bar_suelo', '0,3 bar (capacidad de campo)', 'mL/g', 'numeric', NULL, 'Retención de humedad', 'D', NULL, NULL, NULL, 'B', true, NULL, 1231, ARRAY['suelo']::text[]),
    ('retencion_humedad_15_bar_suelo', '15 bar (punto de marchitez permanente)', 'mL/g', 'numeric', NULL, 'Retención de humedad', 'E', NULL, NULL, NULL, 'B', true, NULL, 1232, ARRAY['suelo']::text[]),
    ('retencion_humedad_aprovechable_suelo', 'Humedad aprovechable', 'mL/g', 'numeric', NULL, 'Retención de humedad', 'F', NULL, NULL, NULL, 'B', true, NULL, 1233, ARRAY['suelo']::text[]),
    ('s_total_suelo_compost_foliar_fruto', 'S total', '%', 'numeric', NULL, 'S total', 'J', NULL, NULL, NULL, 'B', true, NULL, 1240, ARRAY['suelo', 'compost', 'foliar', 'fruto']::text[]),
    ('salmonella_spp_nmp_4_g_multi_matriz', 'Salmonella spp', 'NMP/4 g', 'numeric', NULL, 'Salmonella', 'D', NULL, NULL, NULL, 'B', true, NULL, 1250, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('se_total_mg_kg_multi_matriz', 'Se Total', 'mg/Kg', 'numeric', NULL, 'Se Total', 'N', NULL, NULL, NULL, 'B', true, NULL, 1260, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('silicio_total_mg_kg_multi_matriz', 'Silicio total', 'mg/Kg', 'numeric', NULL, 'Silicio total', 'I', NULL, NULL, NULL, 'B', true, NULL, 1270, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('solubilidad_g_l_fertilizantes', 'Solubilidad', 'g/L', 'numeric', NULL, 'Solubilidad', 'K', NULL, NULL, NULL, 'B', true, NULL, 1280, ARRAY['fertilizante']::text[]),
    ('extracto_humico_total_base_humeda', 'Extracto húmico total', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'Extracto húmico total', NULL, NULL, true, NULL, 1291, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('acidos_fulvicos_base_humeda', 'Ácidos fúlvicos', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'Ácidos fúlvicos', NULL, NULL, true, NULL, 1292, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('acidos_humicos_base_humeda', 'Ácidos húmicos', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'Ácidos húmicos', NULL, NULL, true, NULL, 1293, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('huminas_base_humeda', 'Huminas', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'Huminas', NULL, NULL, true, NULL, 1294, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('extracto_humico_total_base_seca', 'Extracto húmico total', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'Extracto húmico total', NULL, NULL, true, NULL, 1295, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('acidos_fulvicos_base_seca', 'Ácidos fúlvicos', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'Ácidos fúlvicos', NULL, NULL, true, NULL, 1296, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('acidos_humicos_base_seca', 'Ácidos húmicos', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'Ácidos húmicos', NULL, NULL, true, NULL, 1297, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('huminas_base_seca', 'Huminas', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'Huminas', NULL, NULL, true, NULL, 1298, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('c_extracto_humico_total_base_humeda', 'C-Extracto húmico total', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'C-Extracto húmico total', NULL, NULL, true, NULL, 1501, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('c_acidos_fulvicos_base_humeda', 'C-Ácidos fúlvicos', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'C-Ácidos fúlvicos', NULL, NULL, true, NULL, 1502, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('c_acidos_humicos_base_humeda', 'C-Ácidos húmicos', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'C-Ácidos húmicos', NULL, NULL, true, NULL, 1503, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('c_huminas_base_humeda', 'C-Huminas', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'C-Huminas', NULL, NULL, true, NULL, 1504, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('c_extracto_humico_total_base_seca', 'C-Extracto húmico total', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'C-Extracto húmico total', NULL, NULL, true, NULL, 1505, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('c_acidos_fulvicos_base_seca', 'C-Ácidos fúlvicos', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'C-Ácidos fúlvicos', NULL, NULL, true, NULL, 1506, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('c_acidos_humicos_base_seca', 'C-Ácidos húmicos', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'C-Ácidos húmicos', NULL, NULL, true, NULL, 1507, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('c_huminas_base_seca', 'C-Huminas', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'C-Huminas', NULL, NULL, true, NULL, 1508, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('n_extracto_humico_total_base_humeda', 'N-Extracto húmico total', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'N-Extracto húmico total', NULL, NULL, true, NULL, 1511, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('n_acidos_fulvicos_base_humeda', 'N-Ácidos fúlvicos', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'N-Ácidos fúlvicos', NULL, NULL, true, NULL, 1512, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('n_acidos_humicos_base_humeda', 'N-Ácidos húmicos', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'N-Ácidos húmicos', NULL, NULL, true, NULL, 1513, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('n_huminas_base_humeda', 'N-Huminas', '%', 'numeric', 'Base húmeda', 'Sustancias húmicas', 'A', 'A', 'N-Huminas', NULL, NULL, true, NULL, 1514, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('n_extracto_humico_total_base_seca', 'N-Extracto húmico total', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'N-Extracto húmico total', NULL, NULL, true, NULL, 1515, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('n_acidos_fulvicos_base_seca', 'N-Ácidos fúlvicos', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'N-Ácidos fúlvicos', NULL, NULL, true, NULL, 1516, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('n_acidos_humicos_base_seca', 'N-Ácidos húmicos', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'N-Ácidos húmicos', NULL, NULL, true, NULL, 1517, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('n_huminas_base_seca', 'N-Huminas', '%', 'numeric', 'Base seca', 'Sustancias húmicas', 'A', 'A', 'N-Huminas', NULL, NULL, true, NULL, 1518, ARRAY['suelo', 'compost', 'liquido']::text[]),
    ('4_75_mm_retenido_compost', '> 4,75 mm', '% retenido', 'numeric', NULL, 'Tamaño de partícula', 'F', 'B', '4.75', NULL, NULL, true, NULL, 1300, ARRAY['compost']::text[]),
    ('2_mm_retenido_compost', '> 2 mm', '% retenido', 'numeric', NULL, 'Tamaño de partícula', 'F', 'B', '2', NULL, NULL, true, NULL, 1310, ARRAY['compost']::text[]),
    ('0_71_mm_retenido_compost', '> 0,71 mm', '% retenido', 'numeric', NULL, 'Tamaño de partícula', 'F', 'B', '0.71', NULL, NULL, true, NULL, 1320, ARRAY['compost']::text[]),
    ('0_25_mm_retenido_compost', '> 0,25 mm', '% retenido', 'numeric', NULL, 'Tamaño de partícula', 'F', 'B', '0.25', NULL, NULL, true, NULL, 1330, ARRAY['compost']::text[]),
    ('0_18_mm_retenido_compost', '> 0,18 mm', '% retenido', 'numeric', NULL, 'Tamaño de partícula', 'F', 'B', '0.18', NULL, NULL, true, NULL, 1340, ARRAY['compost']::text[]),
    ('0_09_mm_retenido_compost', '> 0,09 mm', '% retenido', 'numeric', NULL, 'Tamaño de partícula', 'F', 'B', '0.09', NULL, NULL, true, NULL, 1350, ARRAY['compost']::text[]),
    ('arena_suelo', 'Arena', '%', 'numeric', NULL, 'Textura', 'Q', NULL, NULL, NULL, 'B', true, NULL, 1360, ARRAY['suelo']::text[]),
    ('arcilla_suelo', 'Arcilla', '%', 'numeric', NULL, 'Textura', 'O', NULL, NULL, NULL, 'B', true, NULL, 1370, ARRAY['suelo']::text[]),
    ('limo_suelo', 'Limo', '%', 'numeric', NULL, 'Textura', 'P', NULL, NULL, NULL, 'B', true, NULL, 1380, ARRAY['suelo']::text[]),
    ('clase_textural_suelo', 'Clase textural', NULL, 'text', NULL, 'Textura', 'R', NULL, NULL, NULL, 'B', true, NULL, 1390, ARRAY['suelo']::text[]),
    ('trichoderma_spp_ufc_g_multi_matriz', 'Trichoderma spp', 'UFC/g', 'numeric', NULL, 'Trichoderma', 'D', NULL, NULL, NULL, 'B', true, NULL, 1400, ARRAY['suelo', 'compost', 'agua', 'liquido', 'fertilizante', 'foliar', 'fruto', 'raices', 'raquis', 'digestato', 'hongos', 'tejido_vegetal']::text[]),
    ('ureasa_ug_n_nh4_g_h_suelo_liquido', 'Ureasa', 'ug N-NH4/(g*h)', 'numeric', NULL, 'Ureasa', 'T', NULL, NULL, NULL, 'B', true, NULL, 1410, ARRAY['suelo', 'liquido']::text[]),
    ('zn_dtpa_mg_kg_suelo', 'Zn-DTPA', 'mg/Kg', 'numeric', NULL, 'Zn extractable', 'N', NULL, NULL, NULL, 'B', true, NULL, 1420, ARRAY['suelo']::text[]),
    ('zn_soluble_mg_l_agua_liquido', 'Zn soluble', 'mg/L', 'numeric', NULL, 'Zn soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 1430, ARRAY['agua', 'liquido']::text[]),
    ('zn_soluble_mg_kg_suelo_fertilizante_compost_liquido', 'Zn soluble', 'mg/Kg', 'numeric', NULL, 'Zn soluble', 'O', NULL, NULL, NULL, 'B', true, NULL, 1440, ARRAY['suelo', 'fertilizante', 'compost', 'liquido']::text[]),
    ('zn_total_mg_kg_compost_fertilizante_foliar_fruto', 'Zn total', 'mg/Kg', 'numeric', NULL, 'Zn total', 'N', NULL, NULL, NULL, 'B', true, NULL, 1450, ARRAY['compost', 'fertilizante', 'foliar', 'fruto']::text[])
  ),
  upserted AS (
    INSERT INTO public.soil_analyses (
      company_id, analysis_key, report_title, unit, result_kind, method_label, excel_sheet,
      excel_value_column, excel_discriminator_column, excel_discriminator_value,
      excel_unit_column, excel_subsample_column, active, pending_note, sort_order
    )
    SELECT
      p_company_id, analysis_key, report_title, unit, result_kind, method_label, excel_sheet,
      excel_value_column, excel_discriminator_column, excel_discriminator_value,
      excel_unit_column, excel_subsample_column, active, pending_note, sort_order
    FROM catalog
    ON CONFLICT (company_id, analysis_key) DO UPDATE
    SET report_title = EXCLUDED.report_title,
        unit = EXCLUDED.unit,
        result_kind = EXCLUDED.result_kind,
        method_label = EXCLUDED.method_label,
        excel_sheet = EXCLUDED.excel_sheet,
        excel_value_column = EXCLUDED.excel_value_column,
        excel_discriminator_column = EXCLUDED.excel_discriminator_column,
        excel_discriminator_value = EXCLUDED.excel_discriminator_value,
        excel_unit_column = EXCLUDED.excel_unit_column,
        excel_subsample_column = EXCLUDED.excel_subsample_column,
        active = EXCLUDED.active,
        pending_note = EXCLUDED.pending_note,
        sort_order = EXCLUDED.sort_order
    RETURNING id, analysis_key
  ),
  removed_matrix_links AS (
    DELETE FROM public.soil_analysis_matrices AS link
    USING upserted, catalog, public.soil_matrices AS matrices
    WHERE link.analysis_id = upserted.id
      AND catalog.analysis_key = upserted.analysis_key
      AND matrices.id = link.matrix_id
      AND NOT (matrices.key = ANY (catalog.matrix_keys))
    RETURNING 1
  ),
  matrix_links AS (
    INSERT INTO public.soil_analysis_matrices (analysis_id, matrix_id)
    SELECT upserted.id, matrices.id
    FROM upserted
    JOIN catalog ON catalog.analysis_key = upserted.analysis_key
    CROSS JOIN LATERAL unnest(catalog.matrix_keys) AS matrix_key
    JOIN public.soil_matrices matrices ON matrices.key = matrix_key
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  -- Las dos escrituras de matrices se referencian para que no queden fuera del plan.
  SELECT (SELECT count(*) FROM upserted)
    + (SELECT count(*) FROM removed_matrix_links) * 0
    + (SELECT count(*) FROM matrix_links) * 0
  INTO seeded_count;

  UPDATE public.soil_analyses
  SET active = false
  WHERE company_id = p_company_id
    AND analysis_key = ANY (ARRAY[
      'ca_intercambiable_cmol_kg_suelo',
      'cl_soluble_mg_kg_foliar_compost_fertilizante_fruto',
      'conductividad_electrica_directa_ms_cm_liquidos',
      'conductividad_electrica_directa_s_cm_agua',
      'k_intercambiable_mg_kg_suelo_compost',
      'k_intercambiable_cmol_kg_suelo_compost',
      'na_intercambiable_cmol_kg_suelo_compost',
      'na_intercambiable_mg_kg_suelo_compost',
      'huevos_de_helminto_huevos_2_g_compost_digestato'
    ]::text[]);

  RETURN seeded_count;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_soil_catalog(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_soil_catalog(uuid) TO authenticated;
