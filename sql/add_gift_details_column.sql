-- Adicionar coluna gift_details (JSONB) na tabela invitations_details
-- para armazenar dados bancários e de carteiras móveis dos noivos

ALTER TABLE invitations_details 
ADD COLUMN IF NOT EXISTS gift_details JSONB DEFAULT NULL;

-- Comentário descritivo
COMMENT ON COLUMN invitations_details.gift_details IS 'JSON com dados bancários e carteiras móveis para presentes dos convidados';
