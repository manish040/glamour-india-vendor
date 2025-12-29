import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Scissors, Trash2, Edit2, IndianRupee, Clock } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string | null;
  is_active: boolean;
}

const DashboardServices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: "30",
    price: "",
    category: "",
    is_active: true,
  });

  useEffect(() => {
    fetchServices();
  }, [user]);

  const fetchServices = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfileId(profileData.id);

        const { data: servicesData } = await supabase
          .from("services")
          .select("*")
          .eq("vendor_id", profileData.id)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        setServices(servicesData || []);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      duration_minutes: "30",
      price: "",
      category: "",
      is_active: true,
    });
    setEditingService(null);
  };

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || "",
        duration_minutes: String(service.duration_minutes),
        price: String(service.price),
        category: service.category || "",
        is_active: service.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!profileId) return;

    const serviceData = {
      vendor_id: profileId,
      name: formData.name,
      description: formData.description || null,
      duration_minutes: parseInt(formData.duration_minutes),
      price: parseFloat(formData.price),
      category: formData.category || null,
      is_active: formData.is_active,
    };

    try {
      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;

        toast({
          title: "Service updated",
          description: "The service has been updated successfully.",
        });
      } else {
        const { error } = await supabase.from("services").insert(serviceData);

        if (error) throw error;

        toast({
          title: "Service created",
          description: "The new service has been added successfully.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save service",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Service deleted",
        description: "The service has been removed successfully.",
      });
      fetchServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !service.is_active })
        .eq("id", service.id);

      if (error) throw error;

      toast({
        title: service.is_active ? "Service deactivated" : "Service activated",
      });
      fetchServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))];

  return (
    <DashboardLayout title="Services">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Manage your salon services and pricing
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? "Edit Service" : "Add New Service"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Haircut, Facial, Massage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the service..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g., Hair, Skin, Nails"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min) *</Label>
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
                    <Label htmlFor="price">Price (₹) *</Label>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={!formData.name || !formData.price}
                >
                  {editingService ? "Update Service" : "Add Service"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Services List */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              All Services ({services.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">
                Loading services...
              </p>
            ) : services.length === 0 ? (
              <div className="text-center py-12">
                <Scissors className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No services yet
                </p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  Add your first service to get started
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        {category}
                      </h3>
                      <div className="space-y-3">
                        {services
                          .filter((s) => s.category === category)
                          .map((service) => (
                            <ServiceCard
                              key={service.id}
                              service={service}
                              onEdit={() => handleOpenDialog(service)}
                              onDelete={() => handleDelete(service.id)}
                              onToggle={() => toggleActive(service)}
                            />
                          ))}
                      </div>
                    </div>
                  ))
                ) : null}
                {services.filter((s) => !s.category).length > 0 && (
                  <div>
                    {categories.length > 0 && (
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Uncategorized
                      </h3>
                    )}
                    <div className="space-y-3">
                      {services
                        .filter((s) => !s.category)
                        .map((service) => (
                          <ServiceCard
                            key={service.id}
                            service={service}
                            onEdit={() => handleOpenDialog(service)}
                            onDelete={() => handleDelete(service.id)}
                            onToggle={() => toggleActive(service)}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const ServiceCard = ({
  service,
  onEdit,
  onDelete,
  onToggle,
}: {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) => (
  <div
    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
      service.is_active
        ? "bg-secondary/50 border-border/30"
        : "bg-muted/30 border-border/20 opacity-60"
    }`}
  >
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        <p className="font-medium text-foreground">{service.name}</p>
        {!service.is_active && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Inactive
          </span>
        )}
      </div>
      {service.description && (
        <p className="text-sm text-muted-foreground line-clamp-1">
          {service.description}
        </p>
      )}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1 text-primary font-medium">
          <IndianRupee className="h-3 w-3" />
          {service.price.toLocaleString("en-IN")}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {service.duration_minutes} min
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Switch checked={service.is_active} onCheckedChange={onToggle} />
      <Button variant="ghost" size="icon" onClick={onEdit}>
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default DashboardServices;
