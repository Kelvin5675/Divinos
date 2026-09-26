-- Função RPC para atualizar gift_details sem ser bloqueada pelo RLS
-- EXECUTAR NO SUPABASE SQL EDITOR: https://supabase.com/dashboard/project/eahrqlfdixqjwuygdkip/sql
CREATE OR REPLACE FUNCTION public.update_gift_details(p_invitation_id uuid, p_gift_details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invitations_details
  SET gift_details = p_gift_details
  WHERE invitation_id = p_invitation_id;
  
  IF NOT FOUND THEN
    INSERT INTO invitations_details (invitation_id, gift_details)
    VALUES (p_invitation_id, p_gift_details);
  END IF;
END;
$$;
