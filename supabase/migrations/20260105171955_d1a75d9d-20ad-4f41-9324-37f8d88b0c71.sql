-- Add service_id to bookings to link with chairs/spaces
ALTER TABLE public.bookings 
ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_bookings_service_id ON public.bookings(service_id);