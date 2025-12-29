import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Users,
  IndianRupee,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
} from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Booking {
  id: string;
  customer_name: string;
  service_name: string;
  booking_date: string;
  price: number | null;
  status: string;
}

type TimeRange = "today" | "week" | "month" | "quarter";

const DashboardReports = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

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

        setBookings((bookingsData as Booking[]) || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarter":
        return { start: subMonths(startOfMonth(now), 2), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const getFilteredBookings = () => {
    const { start, end } = getDateRange();
    return bookings.filter((b) => {
      const date = new Date(b.booking_date);
      return date >= start && date <= end;
    });
  };

  const getCompletedBookings = () => {
    return getFilteredBookings().filter((b) => b.status === "completed");
  };

  const getStats = () => {
    const filtered = getFilteredBookings();
    const completed = getCompletedBookings();
    const revenue = completed.reduce((sum, b) => sum + (b.price || 0), 0);
    const cancelled = filtered.filter((b) => b.status === "cancelled").length;

    return {
      totalBookings: filtered.length,
      completedBookings: completed.length,
      revenue,
      avgValue: completed.length > 0 ? revenue / completed.length : 0,
      cancelRate:
        filtered.length > 0 ? (cancelled / filtered.length) * 100 : 0,
      uniqueCustomers: new Set(filtered.map((b) => b.customer_name)).size,
    };
  };

  const getChartData = () => {
    const { start, end } = getDateRange();
    const completed = getCompletedBookings();

    if (timeRange === "today") {
      // Hourly breakdown
      const hours = Array.from({ length: 12 }, (_, i) => i + 9); // 9 AM to 8 PM
      return hours.map((hour) => {
        const hourBookings = completed.filter((b) => {
          const date = new Date(b.booking_date);
          return format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
        });
        const revenue = hourBookings.reduce((sum, b) => sum + (b.price || 0), 0);
        return {
          label: `${hour}:00`,
          revenue,
          bookings: hourBookings.length,
        };
      });
    } else if (timeRange === "week") {
      const days = eachDayOfInterval({ start, end });
      return days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayBookings = completed.filter((b) => b.booking_date === dayStr);
        const revenue = dayBookings.reduce((sum, b) => sum + (b.price || 0), 0);
        return {
          label: format(day, "EEE"),
          revenue,
          bookings: dayBookings.length,
        };
      });
    } else if (timeRange === "month") {
      const days = eachDayOfInterval({ start, end });
      return days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayBookings = completed.filter((b) => b.booking_date === dayStr);
        const revenue = dayBookings.reduce((sum, b) => sum + (b.price || 0), 0);
        return {
          label: format(day, "d"),
          revenue,
          bookings: dayBookings.length,
        };
      });
    } else {
      // Quarter - weekly
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      return weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekBookings = completed.filter((b) => {
          const date = new Date(b.booking_date);
          return date >= weekStart && date <= weekEnd;
        });
        const revenue = weekBookings.reduce((sum, b) => sum + (b.price || 0), 0);
        return {
          label: format(weekStart, "MMM d"),
          revenue,
          bookings: weekBookings.length,
        };
      });
    }
  };

  const getTopServices = () => {
    const completed = getCompletedBookings();
    const serviceMap = new Map<string, { count: number; revenue: number }>();

    completed.forEach((b) => {
      const current = serviceMap.get(b.service_name) || { count: 0, revenue: 0 };
      serviceMap.set(b.service_name, {
        count: current.count + 1,
        revenue: current.revenue + (b.price || 0),
      });
    });

    return Array.from(serviceMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const getTopCustomers = () => {
    const completed = getCompletedBookings();
    const customerMap = new Map<string, { visits: number; spent: number }>();

    completed.forEach((b) => {
      const current = customerMap.get(b.customer_name) || {
        visits: 0,
        spent: 0,
      };
      customerMap.set(b.customer_name, {
        visits: current.visits + 1,
        spent: current.spent + (b.price || 0),
      });
    });

    return Array.from(customerMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  };

  const stats = getStats();

  const exportReport = () => {
    const data = getFilteredBookings();
    const csv = [
      ["Date", "Customer", "Service", "Status", "Price"].join(","),
      ...data.map((b) =>
        [
          b.booking_date,
          `"${b.customer_name}"`,
          `"${b.service_name}"`,
          b.status,
          b.price || 0,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${timeRange}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select
              value={timeRange}
              onValueChange={(v) => setTimeRange(v as TimeRange)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {stats.totalBookings}
              </div>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {stats.completedBookings}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                ₹{stats.revenue.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                ₹{Math.round(stats.avgValue).toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground">Avg. Value</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {stats.cancelRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Cancel Rate</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {stats.uniqueCustomers}
              </div>
              <p className="text-xs text-muted-foreground">Unique Customers</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue & Bookings Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    yAxisId="revenue"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <YAxis
                    yAxisId="bookings"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Services & Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Top Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getTopServices().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No data for this period
                </p>
              ) : (
                <div className="space-y-4">
                  {getTopServices().map((service, index) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.count} bookings
                          </p>
                        </div>
                      </div>
                      <span className="font-bold">
                        ₹{service.revenue.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Top Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getTopCustomers().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No data for this period
                </p>
              ) : (
                <div className="space-y-4">
                  {getTopCustomers().map((customer, index) => (
                    <div
                      key={customer.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.visits} visits
                          </p>
                        </div>
                      </div>
                      <span className="font-bold">
                        ₹{customer.spent.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardReports;
