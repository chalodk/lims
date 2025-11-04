-- Migración: Tabla de relación usuarios-consumidor con clientes
-- Permite que usuarios con rol consumidor estén vinculados a múltiples clientes

-- Crear tabla de relación muchos-a-muchos entre usuarios y clientes
CREATE TABLE IF NOT EXISTS user_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id),
    CONSTRAINT user_clients_user_client_unique UNIQUE (user_id, client_id)
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_user_clients_user_id ON user_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_client_id ON user_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_created_at ON user_clients(created_at);

-- Comentarios para documentación
COMMENT ON TABLE user_clients IS 'Relación muchos-a-muchos entre usuarios consumidor y clientes. Permite que usuarios consumidor vean informes de múltiples clientes.';
COMMENT ON COLUMN user_clients.user_id IS 'ID del usuario consumidor';
COMMENT ON COLUMN user_clients.client_id IS 'ID del cliente al que está vinculado';
COMMENT ON COLUMN user_clients.created_by IS 'ID del administrador que creó el vínculo';

