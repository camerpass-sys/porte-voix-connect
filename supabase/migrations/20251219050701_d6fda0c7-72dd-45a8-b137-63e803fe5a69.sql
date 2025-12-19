-- Create a function to create a conversation between two users
CREATE OR REPLACE FUNCTION public.create_conversation_with_participant(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conversation_id UUID;
  existing_conversation_id UUID;
  current_user_id UUID;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if conversation already exists between these two users
  SELECT cp1.conversation_id INTO existing_conversation_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id AND cp2.user_id = other_user_id;
  
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;
  
  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conversation_id;
  
  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conversation_id, current_user_id),
    (new_conversation_id, other_user_id);
  
  RETURN new_conversation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_conversation_with_participant(UUID) TO authenticated;