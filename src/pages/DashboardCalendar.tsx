import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";

interface Booking {
  id: string;
  customer_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number | null;
  status: string;
  staff_id: string | null;
}

interface Staff {
  id: string;
  name: string;
  is_active: boolean;
}

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

const DashboardCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string | "all">("all");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchData();
  }, [user, currentWeek]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        // Fetch bookings for the week
        const weekEndDate = format(addDays(weekStart, 6), "yyyy-MM-dd");
        const weekStartDate = format(weekStart, "yyyy-MM-dd");

        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("*")
          .eq("vendor_id", profileData.id)
          .gte("booking_date", weekStartDate)
          .lte("booking_date", weekEndDate)
          .order("booking_time", { ascending: true });

        setBookings(bookingsData || []);

        // Fetch staff
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, name, is_active")
          .eq("vendor_id", profileData.id)
          .eq("is_active", true);

        setStaff(staffData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: `Booking ${newStatus}`,
        description: `The booking has been ${newStatus}.`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getBookingsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter((b) => {
      const matchesDate = b.booking_date === dateStr;
      const matchesTime = b.booking_time.startsWith(time);
      const matchesStaff = selectedStaff === "all" || b.staff_id === selectedStaff;
      return matchesDate && matchesTime && matchesStaff;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-400";
      case "completed":
        return "bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-400";
      case "cancelled":
        return "bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-400";
      default:
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-400";
    }
  };

  return (
    <DashboardLayout title="Calendar">
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-display text-lg font-semibold">
              {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeek(new Date())}
            >
              Today
            </Button>
          </div>
          
          {staff.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by staff:</span>
              <div className="flex gap-1">
                <Button
                  variant={selectedStaff === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStaff("all")}
                >
                  All
                </Button>
                {staff.map((s) => (
                  <Button
                    key={s.id}
                    variant={selectedStaff === s.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStaff(s.id)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <Card className="glass border-border/50 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading calendar...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  {/* Header Row */}
                  <div className="grid grid-cols-8 border-b border-border/50">
                    <div className="p-3 text-sm font-medium text-muted-foreground border-r border-border/30">
                      Time
                    </div>
                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={`p-3 text-center border-r border-border/30 last:border-r-0 ${
                          isSameDay(day, new Date())
                            ? "bg-primary/10"
                            : ""
                        }`}
                      >
                        <p className="text-xs text-muted-foreground uppercase">
                          {format(day, "EEE")}
                        </p>
                        <p className={`text-lg font-semibold ${
                          isSameDay(day, new Date()) ? "text-primary" : "text-foreground"
                        }`}>
                          {format(day, "d")}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Time Slots */}
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="grid grid-cols-8 border-b border-border/30 last:border-b-0"
                    >
                      <div className="p-2 text-xs text-muted-foreground border-r border-border/30 flex items-start">
                        {time}
                      </div>
                      {weekDays.map((day) => {
                        const slotBookings = getBookingsForSlot(day, time);
                        return (
                          <div
                            key={`${day.toISOString()}-${time}`}
                            className={`p-1 min-h-[60px] border-r border-border/30 last:border-r-0 ${
                              isSameDay(day, new Date()) ? "bg-primary/5" : ""
                            }`}
                          >
                            {slotBookings.map((booking) => (
                              <div
                                key={booking.id}
                                className={`p-2 mb-1 rounded-lg border text-xs cursor-pointer transition-all hover:scale-[1.02] ${getStatusColor(
                                  booking.status
                                )}`}
                              >
                                <p className="font-medium truncate">
                                  {booking.customer_name}
                                </p>
                                <p className="truncate opacity-80">
                                  {booking.service_name}
                                </p>
                                {booking.status === "pending" && (
                                  <div className="flex gap-1 mt-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-2 text-[10px] bg-green-500/20 hover:bg-green-500/30"
                                      onClick={() => handleStatusChange(booking.id, "confirmed")}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-2 text-[10px] bg-red-500/20 hover:bg-red-500/30"
                                      onClick={() => handleStatusChange(booking.id, "cancelled")}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.filter((b) => b.booking_date === format(new Date(), "yyyy-MM-dd")).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No appointments scheduled for today
              </p>
            ) : (
              <div className="space-y-3">
                {bookings
                  .filter((b) => b.booking_date === format(new Date(), "yyyy-MM-dd"))
                  .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
                  .map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-primary">
                            {booking.booking_time}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">{booking.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.service_name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
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

export default DashboardCalendar;
