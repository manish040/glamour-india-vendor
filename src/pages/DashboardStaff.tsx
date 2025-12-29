import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Users, Trash2, Edit2, Phone, Mail } from "lucide-react";

interface WorkingHours {
  [key: string]: { start: string; end: string } | null;
}

interface Staff {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  specializations: string[] | null;
  is_active: boolean;
  working_hours: unknown;
}

const defaultWorkingHours: WorkingHours = {
  monday: { start: "09:00", end: "18:00" },
  tuesday: { start: "09:00", end: "18:00" },
  wednesday: { start: "09:00", end: "18:00" },
  thursday: { start: "09:00", end: "18:00" },
  friday: { start: "09:00", end: "18:00" },
  saturday: { start: "09:00", end: "18:00" },
  sunday: null,
};

const DashboardStaff = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    specializations: "",
    is_active: true,
  });

  useEffect(() => {
    fetchStaff();
  }, [user]);

  const fetchStaff = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfileId(profileData.id);

        const { data: staffData } = await supabase
          .from("staff")
          .select("*")
          .eq("vendor_id", profileData.id)
          .order("name", { ascending: true });

        setStaff((staffData as Staff[]) || []);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "staff",
      specializations: "",
      is_active: true,
    });
    setEditingStaff(null);
  };

  const handleOpenDialog = (member?: Staff) => {
    if (member) {
      setEditingStaff(member);
      setFormData({
        name: member.name,
        email: member.email || "",
        phone: member.phone || "",
        role: member.role,
        specializations: member.specializations?.join(", ") || "",
        is_active: member.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!profileId) return;

    const specializations = formData.specializations
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const staffData = {
      vendor_id: profileId,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      role: formData.role,
      specializations: specializations.length > 0 ? specializations : null,
      is_active: formData.is_active,
      working_hours: defaultWorkingHours,
    };

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", editingStaff.id);

        if (error) throw error;

        toast({
          title: "Staff updated",
          description: "Staff member has been updated successfully.",
        });
      } else {
        const { error } = await supabase.from("staff").insert(staffData);

        if (error) throw error;

        toast({
          title: "Staff added",
          description: "New staff member has been added successfully.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save staff",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("staff").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Staff removed",
        description: "Staff member has been removed successfully.",
      });
      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove staff",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (member: Staff) => {
    try {
      const { error } = await supabase
        .from("staff")
        .update({ is_active: !member.is_active })
        .eq("id", member.id);

      if (error) throw error;

      toast({
        title: member.is_active ? "Staff deactivated" : "Staff activated",
      });
      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout title="Staff">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Manage your salon staff and their schedules
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStaff ? "Edit Staff" : "Add New Staff"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter staff name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="senior_stylist">Senior Stylist</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specializations">Specializations</Label>
                  <Input
                    id="specializations"
                    value={formData.specializations}
                    onChange={(e) =>
                      setFormData({ ...formData, specializations: e.target.value })
                    }
                    placeholder="e.g., Haircut, Color, Bridal (comma separated)"
                  />
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
                  disabled={!formData.name}
                >
                  {editingStaff ? "Update Staff" : "Add Staff"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Staff List */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Members ({staff.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">
                Loading staff...
              </p>
            ) : staff.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No staff members yet
                </p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  Add your team members to manage scheduling
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    className={`p-4 rounded-xl border transition-all ${
                      member.is_active
                        ? "bg-secondary/50 border-border/30"
                        : "bg-muted/30 border-border/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">
                            {member.name}
                          </h3>
                          {!member.is_active && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          {member.role.replace("_", " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={member.is_active}
                          onCheckedChange={() => toggleActive(member)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(member)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {member.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </div>
                      )}
                      {member.specializations && member.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {member.specializations.map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      )}
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

export default DashboardStaff;
