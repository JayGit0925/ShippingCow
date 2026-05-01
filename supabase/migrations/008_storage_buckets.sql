-- Phase 1: Storage buckets for raw uploads + silo files.
-- RLS scoped by org_id encoded in path prefix: <org_id>/<filename>

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('raw-uploads', 'raw-uploads', FALSE, 52428800,  -- 50MB
   ARRAY['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-excel','application/pdf','image/png','image/jpeg','image/webp']),
  ('silo-files', 'silo-files', FALSE, 52428800,
   ARRAY['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

-- RLS: read/write only for org members where path starts with org_id
CREATE POLICY "raw_uploads_org_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'raw-uploads' AND
    public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "raw_uploads_org_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'raw-uploads' AND
    public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "raw_uploads_org_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'raw-uploads' AND
    public.is_org_role((string_to_array(name, '/'))[1]::uuid, ARRAY['owner','admin'])
  );

CREATE POLICY "silo_files_org_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'silo-files' AND
    public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "silo_files_org_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'silo-files' AND
    public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "silo_files_org_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'silo-files' AND
    public.is_org_role((string_to_array(name, '/'))[1]::uuid, ARRAY['owner','admin'])
  );
