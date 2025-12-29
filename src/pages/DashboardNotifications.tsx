import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Bell, Send, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: string;
  recipient_phone: string | null;
  recipient_email: string | null;
  message: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  service_name: string;
  booking_date: string;
  booking_time: string;
}

const DashboardNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: "reminder",
    booking_id: "",
    recipient_phone: "",
    recipient_email: "",
    message: "",
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfileId(profileData.id);

        // Fetch notifications
        const { data: notificationsData } = await supabase
          .from("notifications")
          .select("*")
          .eq("vendor_id", profileData.id)
          .order("created_at", { ascending: false })
          .limit(50);

        setNotifications((notificationsData as Notification[]) || []);

        // Fetch upcoming bookings for quick send
        const today = format(new Date(), "yyyy-MM-dd");
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("id, customer_name, customer_phone, customer_email, service_name, booking_date, booking_time")
          .eq("vendor_id", profileData.id)
          .gte("booking_date", today)
          .in("status", ["pending", "confirmed"])
          .order("booking_date", { ascending: true })
          .limit(20);

        setBookings((bookingsData as Booking[]) || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSelect = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      const defaultMessage = `Hi ${booking.customer_name}, this is a reminder for your ${booking.service_name} appointment on ${format(new Date(booking.booking_date), "MMMM d, yyyy")} at ${booking.booking_time}. See you soon!`;
      setFormData({
        ...formData,
        booking_id: bookingId,
        recipient_phone: booking.customer_phone || "",
        recipient_email: booking.customer_email || "",
        message: defaultMessage,
      });
    }
  };

  const handleSend = async () => {
    if (!profileId) return;

    const booking = bookings.find((b) => b.id === formData.booking_id);

    const notificationData = {
      vendor_id: profileId,
      booking_id: formData.booking_id || null,
      type: formData.type,
      recipient_phone: formData.recipient_phone || null,
      recipient_email: formData.recipient_email || null,
      message: formData.message,
      status: "pending",
    };

    try {
      // First insert the notification
      const { data: insertedNotification, error } = await supabase
        .from("notifications")
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;

      // Then call the edge function to send the email
      if (formData.recipient_email) {
        toast({
          title: "Sending notification...",
          description: "Please wait while we send the email.",
        });

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              notificationId: insertedNotification.id,
              recipientEmail: formData.recipient_email,
              recipientPhone: formData.recipient_phone,
              customerName: booking?.customer_name || "Customer",
              serviceName: booking?.service_name || "Service",
              bookingDate: booking ? format(new Date(booking.booking_date), "MMMM d, yyyy") : "",
              bookingTime: booking?.booking_time || "",
              type: formData.type,
              message: formData.message,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          toast({
            title: "Notification sent!",
            description: "The email has been delivered successfully.",
          });
        } else {
          toast({
            title: "Notification queued",
            description: result.error || "Email delivery pending.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Notification saved",
          description: "No email address provided - notification saved but not sent.",
        });
      }

      setIsDialogOpen(false);
      setFormData({
        type: "reminder",
        booking_id: "",
        recipient_phone: "",
        recipient_email: "",
        message: "",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "reminder":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "confirmation":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancellation":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Send reminders and notifications to your customers
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Send Notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="confirmation">Confirmation</SelectItem>
                      <SelectItem value="cancellation">Cancellation</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bookings.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="booking">Link to Booking (optional)</Label>
                    <Select
                      value={formData.booking_id}
                      onValueChange={handleBookingSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a booking" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.customer_name} - {format(new Date(b.booking_date), "MMM d")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.recipient_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, recipient_phone: e.target.value })
                      }
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.recipient_email}
                      onChange={(e) =>
                        setFormData({ ...formData, recipient_email: e.target.value })
                      }
                      placeholder="Email address"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Enter your message..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleSend}
                  className="w-full"
                  disabled={!formData.message}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Queue Notification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Reminders */}
        {bookings.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Quick send reminders to upcoming appointments
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {bookings.slice(0, 4).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30"
                  >
                    <div>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.booking_date), "MMM d")} at{" "}
                        {booking.booking_time}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleBookingSelect(booking.id);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification History */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Notification History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">
                Loading...
              </p>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No notifications sent yet
                </p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  Send your first reminder to a customer
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 border border-border/30"
                  >
                    <div className="mt-1">{getStatusIcon(notification.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getTypeColor(notification.type)}>
                          {notification.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        To: {notification.recipient_phone || notification.recipient_email || "N/A"}
                      </p>
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

export default DashboardNotifications;
