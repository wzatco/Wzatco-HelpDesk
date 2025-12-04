-- Normalize Conversation.priority values to supported set: 'high' | 'medium' | 'low'
UPDATE Conversation SET priority = 'medium' WHERE lower(ifnull(priority, '')) = 'normal';
UPDATE Conversation SET priority = 'low' WHERE priority IS NULL OR trim(priority) = '';
-- Ensure any unexpected values fall back to 'low'
UPDATE Conversation SET priority = 'low' WHERE lower(priority) NOT IN ('high','medium','low');

