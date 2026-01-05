import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Trash2, Edit2, User, Armchair } from "lucide-react";
import { format } from "date-fns";

interface Staff {
  id: string;
  name: string;
  is_active: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  service_name: string;
  service_id: string | null;
  booking_date: string;
  booking_time: string;
  duration_minutes: number | null;
  price: number | null;
  status: string;
  notes: string | null;
  staff_id: string | null;
  staff?: Staff | null;
  service?: Service | null;
}

const DashboardBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    service_name: "",
    service_id: "",
    booking_date: "",
    booking_time: "",
    duration_minutes: "60",
    price: "",
    status: "pending",
    notes: "",
    staff_id: "",
  });

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfileId(profileData.id);

        // Fetch staff
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, name, is_active")
          .eq("vendor_id", profileData.id)
          .eq("is_active", true)
          .order("name");

        setStaff((staffData as Staff[]) || []);

        // Fetch services (chairs/spaces)
        const { data: servicesData } = await supabase
          .from("services")
          .select("id, name, price, duration_minutes, is_active")
          .eq("vendor_id", profileData.id)
          .eq("is_active", true)
          .order("name");

        setServices((servicesData as Service[]) || []);

        // Fetch bookings with staff and service info
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("*, staff:staff_id(id, name, is_active), service:service_id(id, name, price, duration_minutes, is_active)")
          .eq("vendor_id", profileData.id)
          .order("booking_date", { ascending: false })
          .order("booking_time", { ascending: false });

        setBookings((bookingsData as Booking[]) || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      service_name: "",
      service_id: "",
      booking_date: "",
      booking_time: "",
      duration_minutes: "60",
      price: "",
      status: "pending",
      notes: "",
      staff_id: "",
    });
    setEditingBooking(null);
  };

  const handleOpenDialog = (booking?: Booking) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData({
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone || "",
        customer_email: booking.customer_email || "",
        service_name: booking.service_name,
        service_id: booking.service_id || "",
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        duration_minutes: String(booking.duration_minutes || 60),
        price: booking.price ? String(booking.price) : "",
        status: booking.status,
        notes: booking.notes || "",
        staff_id: booking.staff_id || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleServiceChange = (serviceId: string) => {
    if (serviceId === "none") {
      setFormData({ ...formData, service_id: "", service_name: "" });
      return;
    }
    const selectedService = services.find((s) => s.id === serviceId);
    if (selectedService) {
      setFormData({
        ...formData,
        service_id: serviceId,
        service_name: selectedService.name,
        price: String(selectedService.price),
        duration_minutes: String(selectedService.duration_minutes),
      });
    }
  };

  const handleSubmit = async () => {
    if (!profileId) return;

    const bookingData = {
      vendor_id: profileId,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone || null,
      customer_email: formData.customer_email || null,
      service_name: formData.service_name,
      service_id: formData.service_id || null,
      booking_date: formData.booking_date,
      booking_time: formData.booking_time,
      duration_minutes: parseInt(formData.duration_minutes),
      price: formData.price ? parseFloat(formData.price) : null,
      status: formData.status,
      notes: formData.notes || null,
      staff_id: formData.staff_id || null,
    };

    try {
      if (editingBooking) {
        const { error } = await supabase
          .from("bookings")
          .update(bookingData)
          .eq("id", editingBooking.id);

        if (error) throw error;

        toast({
          title: "Booking updated",
          description: "The booking has been updated successfully.",
        });
      } else {
        const { error } = await supabase.from("bookings").insert(bookingData);

        if (error) throw error;

        toast({
          title: "Booking created",
          description: "The new booking has been created successfully.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save booking",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Booking deleted",
        description: "The booking has been deleted successfully.",
      });
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Booking marked as ${newStatus}`,
      });
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  return (
    <DashboardLayout title="Bookings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Manage your appointments and bookings
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingBooking ? "Edit Booking" : "Create New Booking"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_name: e.target.value })
                    }
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customer_phone: e.target.value,
                        })
                      }
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customer_email: e.target.value,
                        })
                      }
                      placeholder="Email address"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_id">Chair / Space</Label>
                  <Select
                    value={formData.service_id || "none"}
                    onValueChange={handleServiceChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chair/space" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No chair selected</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - ₹{service.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_name">Service *</Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) =>
                      setFormData({ ...formData, service_name: e.target.value })
                    }
                    placeholder="e.g., Haircut, Facial, Massage"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking_date">Date *</Label>
                    <Input
                      id="booking_date"
                      type="date"
                      value={formData.booking_date}
                      onChange={(e) =>
                        setFormData({ ...formData, booking_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="booking_time">Time *</Label>
                    <Input
                      id="booking_time"
                      type="time"
                      value={formData.booking_time}
                      onChange={(e) =>
                        setFormData({ ...formData, booking_time: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_minutes: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff_id">Assign Staff</Label>
                  <Select
                    value={formData.staff_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, staff_id: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No staff assigned</SelectItem>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={
                    !formData.customer_name ||
                    !formData.service_name ||
                    !formData.booking_date ||
                    !formData.booking_time
                  }
                >
                  {editingBooking ? "Update Booking" : "Create Booking"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bookings List */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              All Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">
                Loading bookings...
              </p>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No bookings yet
                </p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  Create your first booking to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/30"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-foreground">
                          {booking.customer_name}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.service_name} •{" "}
                        {format(new Date(booking.booking_date), "MMM d, yyyy")}{" "}
                        at {booking.booking_time}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {booking.service && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/50">
                            <Armchair className="h-3 w-3" />
                            {booking.service.name}
                          </span>
                        )}
                        {booking.staff && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            <User className="h-3 w-3" />
                            {booking.staff.name}
                          </span>
                        )}
                        {booking.price && (
                          <p className="text-sm font-medium text-primary">
                            ₹{booking.price.toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={booking.status}
                        onValueChange={(value) =>
                          handleStatusChange(booking.id, value)
                        }
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(booking)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(booking.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardBookings;
