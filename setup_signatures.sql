ALTER TABLE sst_colaboradores ADD COLUMN IF NOT EXISTS firma_electronica BOOLEAN DEFAULT false;
ALTER TABLE sst_colaboradores ADD COLUMN IF NOT EXISTS habeas_data BOOLEAN DEFAULT false;
ALTER TABLE sst_colaboradores ADD COLUMN IF NOT EXISTS fecha_firma TIMESTAMP WITH TIME ZONE;
