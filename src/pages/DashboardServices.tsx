import { useEffect, useState, useRef } from "react";
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
import { Plus, Armchair, Trash2, Edit2, IndianRupee, Clock, Image, Upload, X } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string | null;
  is_active: boolean;
  image_url: string | null;
  available_time_slots: Record<string, string[] | null> | null;
}

const DEFAULT_TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const DashboardServices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: "60",
    price: "",
    category: "",
    is_active: true,
    image_url: "",
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

        setServices((servicesData as Service[]) || []);
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
      duration_minutes: "60",
      price: "",
      category: "",
      is_active: true,
      image_url: "",
    });
    setEditingService(null);
    setImagePreview(null);
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
        image_url: service.image_url || "",
      });
      setImagePreview(service.image_url);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${profileId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("service-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("service-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);

      toast({
        title: "Image uploaded",
        description: "Your chair/space image has been uploaded",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: "" });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      image_url: formData.image_url || null,
    };

    try {
      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;

        toast({
          title: "Chair/Space updated",
          description: "The listing has been updated successfully.",
        });
      } else {
        const { error } = await supabase.from("services").insert(serviceData);

        if (error) throw error;

        toast({
          title: "Chair/Space added",
          description: "The new listing has been added successfully.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save listing",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Listing deleted",
        description: "The chair/space has been removed successfully.",
      });
      fetchServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete listing",
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
        title: service.is_active ? "Listing hidden" : "Listing visible",
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
    <DashboardLayout title="Chairs / Spaces">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Manage your salon chairs and spaces for rent
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Chair/Space
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? "Edit Listing" : "Add New Chair/Space"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Photo</Label>
                  <div className="border-2 border-dashed border-border/50 rounded-xl p-4 text-center">
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Chair/Space preview"
                          className="w-full max-w-[200px] h-32 object-cover rounded-lg mx-auto"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={removeImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer py-4"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload photo
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          JPG, PNG up to 5MB
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {!imagePreview && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? "Uploading..." : "Choose Image"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Chair/Space Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Station 1, VIP Chair, Corner Booth"
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
                    placeholder="Describe the chair/space, amenities included..."
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
                    placeholder="e.g., Hair Station, Nail Station, VIP"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Min. Booking (hrs) *</Label>
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
                      step="30"
                      min="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price/Hour (₹) *</Label>
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
                  <Label htmlFor="is_active">Available for Booking</Label>
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
                  disabled={!formData.name || !formData.price || uploading}
                >
                  {editingService ? "Update Listing" : "Add Listing"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Services/Chairs List */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Armchair className="h-5 w-5 text-primary" />
              All Chairs/Spaces ({services.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">
                Loading listings...
              </p>
            ) : services.length === 0 ? (
              <div className="text-center py-12">
                <Armchair className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No chairs/spaces yet
                </p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  Add your first chair or space to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onEdit={() => handleOpenDialog(service)}
                    onDelete={() => handleDelete(service.id)}
                    onToggle={() => toggleActive(service)}
                  />
                ))}
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
    className={`rounded-xl border overflow-hidden transition-all ${
      service.is_active
        ? "bg-secondary/50 border-border/30"
        : "bg-muted/30 border-border/20 opacity-60"
    }`}
  >
    {/* Image */}
    <div className="aspect-video bg-muted/50 relative">
      {service.image_url ? (
        <img
          src={service.image_url}
          alt={service.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Image className="h-12 w-12 text-muted-foreground/30" />
        </div>
      )}
      {!service.is_active && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
            Unavailable
          </span>
        </div>
      )}
    </div>
    
    {/* Content */}
    <div className="p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-foreground">{service.name}</h3>
        {service.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {service.category}
          </span>
        )}
        {service.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {service.description}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1 text-primary font-bold text-lg">
          <IndianRupee className="h-4 w-4" />
          {service.price.toLocaleString("en-IN")}/hr
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          Min {service.duration_minutes} min
        </span>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <Switch checked={service.is_active} onCheckedChange={onToggle} />
        <div className="flex items-center gap-1">
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
    </div>
  </div>
);

export default DashboardServices;