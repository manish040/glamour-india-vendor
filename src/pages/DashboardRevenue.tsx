import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Calendar,
  Users,
  Percent,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  eachDayOfInterval,
} from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Booking {
  id: string;
  service_name: string;
  booking_date: string;
  price: number | null;
  status: string;
}

const DashboardRevenue = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    avgBookingValue: 0,
    totalBookings: 0,
    completedBookings: 0,
    conversionRate: 0,
    previousMonthRevenue: 0,
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
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("*")
          .eq("vendor_id", profileData.id);

        const allBookings = (bookingsData as Booking[]) || [];
        setBookings(allBookings);

        // Calculate stats
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const prevMonthStart = startOfMonth(subMonths(now, 1));
        const prevMonthEnd = endOfMonth(subMonths(now, 1));

        const completedBookings = allBookings.filter(
          (b) => b.status === "completed"
        );
        const monthlyBookings = completedBookings.filter((b) => {
          const date = new Date(b.booking_date);
          return date >= monthStart && date <= monthEnd;
        });
        const weeklyBookings = completedBookings.filter((b) => {
          const date = new Date(b.booking_date);
          return date >= weekStart && date <= weekEnd;
        });
        const prevMonthBookings = completedBookings.filter((b) => {
          const date = new Date(b.booking_date);
          return date >= prevMonthStart && date <= prevMonthEnd;
        });

        const totalRevenue = completedBookings.reduce(
          (sum, b) => sum + (b.price || 0),
          0
        );
        const monthlyRevenue = monthlyBookings.reduce(
          (sum, b) => sum + (b.price || 0),
          0
        );
        const weeklyRevenue = weeklyBookings.reduce(
          (sum, b) => sum + (b.price || 0),
          0
        );
        const previousMonthRevenue = prevMonthBookings.reduce(
          (sum, b) => sum + (b.price || 0),
          0
        );

        setStats({
          totalRevenue,
          monthlyRevenue,
          weeklyRevenue,
          avgBookingValue:
            completedBookings.length > 0
              ? totalRevenue / completedBookings.length
              : 0,
          totalBookings: allBookings.length,
          completedBookings: completedBookings.length,
          conversionRate:
            allBookings.length > 0
              ? (completedBookings.length / allBookings.length) * 100
              : 0,
          previousMonthRevenue,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chart data
  const getRevenueByDay = () => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayBookings = bookings.filter(
        (b) => b.booking_date === dayStr && b.status === "completed"
      );
      const revenue = dayBookings.reduce((sum, b) => sum + (b.price || 0), 0);
      return {
        date: format(day, "MMM d"),
        revenue,
      };
    });
  };

  const getServiceBreakdown = () => {
    const serviceMap = new Map<string, number>();
    bookings
      .filter((b) => b.status === "completed")
      .forEach((b) => {
        const current = serviceMap.get(b.service_name) || 0;
        serviceMap.set(b.service_name, current + (b.price || 0));
      });

    return Array.from(serviceMap.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const getStatusBreakdown = () => {
    const statusCounts = {
      completed: bookings.filter((b) => b.status === "completed").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      pending: bookings.filter((b) => b.status === "pending").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };

    return [
      { name: "Completed", value: statusCounts.completed, color: "#10b981" },
      { name: "Confirmed", value: statusCounts.confirmed, color: "#3b82f6" },
      { name: "Pending", value: statusCounts.pending, color: "#f59e0b" },
      { name: "Cancelled", value: statusCounts.cancelled, color: "#ef4444" },
    ].filter((s) => s.value > 0);
  };

  const monthlyGrowth =
    stats.previousMonthRevenue > 0
      ? ((stats.monthlyRevenue - stats.previousMonthRevenue) /
          stats.previousMonthRevenue) *
        100
      : 0;

  return (
    <DashboardLayout title="Revenue">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₹{stats.totalRevenue.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {stats.completedBookings} completed bookings
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
              {monthlyGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₹{stats.monthlyRevenue.toLocaleString("en-IN")}
              </div>
              <p
                className={`text-xs mt-1 ${
                  monthlyGrowth >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {monthlyGrowth >= 0 ? "+" : ""}
                {monthlyGrowth.toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Week
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₹{stats.weeklyRevenue.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current week earnings
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Booking Value
              </CardTitle>
              <Percent className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₹{Math.round(stats.avgBookingValue).toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.conversionRate.toFixed(0)}% completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="font-display">Daily Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={getRevenueByDay()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`₹${value}`, "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Services */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="font-display">Top Services by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : getServiceBreakdown().length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getServiceBreakdown()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`₹${value}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Status */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Booking Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                {loading ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : getStatusBreakdown().length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No bookings yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={getStatusBreakdown()}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {getStatusBreakdown().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="space-y-4">
                {getStatusBreakdown().map((status) => (
                  <div
                    key={status.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="font-medium">{status.name}</span>
                    </div>
                    <span className="text-lg font-bold">{status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardRevenue;
