-- Add image_url column to services table for chair/space photos
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url text;

-- Add available_time_slots column for specific time slot availability
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS available_time_slots jsonb DEFAULT '{"monday": ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], "tuesday": ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], "wednesday": ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], "thursday": ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], "friday": ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], "saturday": ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], "sunday": null}'::jsonb;

-- Create storage bucket for service/chair images
INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true) ON CONFLICT DO NOTHING;

-- Allow public read access to service images
CREATE POLICY "Service images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'service-images');

-- Allow authenticated users to upload service images
CREATE POLICY "Authenticated users can upload service images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'service-images' AND auth.role() = 'authenticated');

-- Allow users to update their own service images
CREATE POLICY "Users can update their service images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'service-images' AND auth.role() = 'authenticated');

-- Allow users to delete their service images
CREATE POLICY "Users can delete their service images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'service-images' AND auth.role() = 'authenticated');