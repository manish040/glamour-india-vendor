-- Create bookings table for vendor appointment management
CREATE TABLE public.bookings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    service_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    price DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own bookings
CREATE POLICY "Vendors can view their own bookings"
ON public.bookings
FOR SELECT
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Vendors can create bookings for themselves
CREATE POLICY "Vendors can create their own bookings"
ON public.bookings
FOR INSERT
WITH CHECK (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Vendors can update their own bookings
CREATE POLICY "Vendors can update their own bookings"
ON public.bookings
FOR UPDATE
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Vendors can delete their own bookings
CREATE POLICY "Vendors can delete their own bookings"
ON public.bookings
FOR DELETE
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Trigger for updating updated_at
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();