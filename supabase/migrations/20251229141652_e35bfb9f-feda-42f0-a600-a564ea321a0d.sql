-- Create services table for salon services management
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price DECIMAL(10,2) NOT NULL,
    category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff table for salon staff management
CREATE TABLE public.staff (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    specializations TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    working_hours JSONB DEFAULT '{"monday": {"start": "09:00", "end": "18:00"}, "tuesday": {"start": "09:00", "end": "18:00"}, "wednesday": {"start": "09:00", "end": "18:00"}, "thursday": {"start": "09:00", "end": "18:00"}, "friday": {"start": "09:00", "end": "18:00"}, "saturday": {"start": "09:00", "end": "18:00"}, "sunday": null}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for customer communication
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('reminder', 'confirmation', 'cancellation', 'custom')),
    recipient_phone TEXT,
    recipient_email TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add staff_id to bookings table
ALTER TABLE public.bookings ADD COLUMN staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services
CREATE POLICY "Vendors can view their own services"
ON public.services FOR SELECT
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can create their own services"
ON public.services FOR INSERT
WITH CHECK (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update their own services"
ON public.services FOR UPDATE
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can delete their own services"
ON public.services FOR DELETE
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for staff
CREATE POLICY "Vendors can view their own staff"
ON public.staff FOR SELECT
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can create their own staff"
ON public.staff FOR INSERT
WITH CHECK (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update their own staff"
ON public.staff FOR UPDATE
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can delete their own staff"
ON public.staff FOR DELETE
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Vendors can view their own notifications"
ON public.notifications FOR SELECT
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can create their own notifications"
ON public.notifications FOR INSERT
WITH CHECK (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update their own notifications"
ON public.notifications FOR UPDATE
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can delete their own notifications"
ON public.notifications FOR DELETE
USING (vendor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();