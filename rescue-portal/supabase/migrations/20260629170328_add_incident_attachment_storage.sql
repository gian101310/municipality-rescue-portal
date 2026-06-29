INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-attachments',
  'incident-attachments',
  FALSE,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
