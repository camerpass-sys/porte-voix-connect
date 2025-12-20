-- Set replica identity to full for complete row data in realtime updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;