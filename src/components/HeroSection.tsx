import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Star } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen gradient-hero overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      <div className="container mx-auto px-4 pt-32 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-primary/20">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-medium text-foreground">
                Trusted by 10,000+ salons
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight">
              Manage Your Salon{" "}
              <span className="text-primary">Effortlessly</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              The all-in-one platform for salon owners to manage appointments, 
              staff, revenue, and customer relationships — all in one beautiful dashboard.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" className="group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="hero-outline" className="group">
                <Play className="w-5 h-5" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary border-2 border-background flex items-center justify-center text-primary-foreground text-xs font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-primary fill-primary"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  4.9/5 from 2,000+ reviews
                </p>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              {/* Main Dashboard Card */}
              <div className="glass rounded-2xl p-6 shadow-elevated">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Today's Overview
                  </h3>
                  <span className="text-sm text-muted-foreground">Dec 28</span>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Appointments", value: "24", change: "+12%" },
                    { label: "Revenue", value: "$2,840", change: "+8%" },
                    { label: "New Clients", value: "8", change: "+25%" },
                    { label: "Staff Active", value: "6/8", change: "" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-4 rounded-xl bg-secondary/50"
                    >
                      <p className="text-sm text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {stat.value}
                        </span>
                        {stat.change && (
                          <span className="text-xs text-primary font-medium">
                            {stat.change}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upcoming Appointments */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Upcoming
                  </h4>
                  {[
                    { time: "10:00 AM", client: "Sarah M.", service: "Haircut & Style" },
                    { time: "11:30 AM", client: "John D.", service: "Beard Trim" },
                  ].map((apt) => (
                    <div
                      key={apt.time}
                      className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-medium text-foreground">
                          {apt.time}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {apt.client}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.service}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Card */}
              <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4 shadow-soft animate-float" style={{ animationDelay: '-2s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-lg">✓</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Booking Confirmed</p>
                    <p className="text-xs text-muted-foreground">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
