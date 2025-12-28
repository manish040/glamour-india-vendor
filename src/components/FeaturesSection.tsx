import { 
  LogIn, 
  Settings, 
  Calendar, 
  Clock, 
  TrendingUp, 
  MessageCircle, 
  BarChart3 
} from "lucide-react";

const features = [
  {
    icon: LogIn,
    title: "Vendor Login",
    description: "Secure vendor and staff login with role-based access control. Keep your business data safe.",
  },
  {
    icon: Settings,
    title: "Salon Profile Setup",
    description: "Easily manage your services, pricing, and staff members all in one centralized location.",
  },
  {
    icon: Calendar,
    title: "Appointment Management",
    description: "View upcoming bookings, approve or reject requests, and manage your daily schedule effortlessly.",
  },
  {
    icon: Clock,
    title: "Calendar & Time Slots",
    description: "Smart staff scheduling with availability management. Never double-book again.",
  },
  {
    icon: TrendingUp,
    title: "Revenue Dashboard",
    description: "Track your bookings and earnings in real-time. Understand your business performance at a glance.",
  },
  {
    icon: MessageCircle,
    title: "Customer Communication",
    description: "Send automated notifications and reminders. Keep your clients engaged and informed.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Daily, weekly, and monthly analytics to help you make data-driven decisions.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-accent text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
            Everything You Need to{" "}
            <span className="text-primary">Run Your Salon</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful tools designed specifically for salon owners and their teams. 
            Streamline operations and focus on what you do best.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-elevated transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors duration-300">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Arrow */}
              <div className="mt-4 flex items-center text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Learn more
                <svg
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
