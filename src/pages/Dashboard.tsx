import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Booking {
  id: string;
  customer_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  price: number | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    todayBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        setProfile(profileData);

        if (profileData) {
          // Fetch bookings
          const { data: bookingsData } = await supabase
            .from("bookings")
            .select("*")
            .eq("vendor_id", profileData.id)
            .order("booking_date", { ascending: true })
            .order("booking_time", { ascending: true });

          const allBookings = bookingsData || [];
          setBookings(allBookings);

          // Calculate stats
          const today = format(new Date(), "yyyy-MM-dd");
          const todayBookings = allBookings.filter(
            (b) => b.booking_date === today
          );
          const pendingBookings = allBookings.filter(
            (b) => b.status === "pending"
          );
          const completedBookings = allBookings.filter(
            (b) => b.status === "completed"
          );
          const totalRevenue = completedBookings.reduce(
            (sum, b) => sum + (b.price || 0),
            0
          );

          setStats({
            totalBookings: allBookings.length,
            todayBookings: todayBookings.length,
            pendingBookings: pendingBookings.length,
            totalRevenue,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const upcomingBookings = bookings
    .filter((b) => b.status === "pending" || b.status === "confirmed")
    .slice(0, 5);

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name || user?.email?.split("@")[0]}!
          </h2>
          <p className="text-muted-foreground">
            Here's an overview of your salon business
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bookings
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalBookings}
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Appointments
              </CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.todayBookings}
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Bookings
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.pendingBookings}
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₹{stats.totalRevenue.toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bookings */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display">Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming bookings</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Your scheduled appointments will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/30"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {booking.customer_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.service_name}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(booking.booking_date), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.booking_time}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {booking.status}
                      </span>
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

export default Dashboard;
