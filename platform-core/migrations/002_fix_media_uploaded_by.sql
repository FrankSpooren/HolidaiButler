-- Fix: media.uploaded_by is INT but admin_users.id is UUID VARCHAR(36)
-- This causes "Data truncated for column 'uploaded_by'" on media upload
ALTER TABLE media MODIFY COLUMN uploaded_by VARCHAR(36);
