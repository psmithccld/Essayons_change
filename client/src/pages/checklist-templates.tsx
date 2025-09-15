import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ListChecks, X, Building, Code, Megaphone, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ChecklistTemplate } from "@shared/schema";

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.enum(["development", "marketing", "operations", "general"]),
  templateItems: z.array(z.object({
    text: z.string().min(1, "Item text is required"),
    required: z.boolean()
  })).min(1, "At least one template item is required"),
  isActive: z.boolean().default(true),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

const categories = [
  { value: "development", label: "Development", icon: Code },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "operations", label: "Operations", icon: Settings },
  { value: "general", label: "General", icon: Building },
];

function getCategoryIcon(category: string) {
  const categoryData = categories.find(c => c.value === category);
  const IconComponent = categoryData?.icon || Building;
  return <IconComponent className="w-4 h-4" />;
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'development': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'marketing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'operations': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

export default function ChecklistTemplates() {
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [newTemplateItem, setNewTemplateItem] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<ChecklistTemplate[]>({
    queryKey: ['/api/checklist-templates'],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      category: "general",
      templateItems: [],
      isActive: true,
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateFormData) => {
      const response = await apiRequest("POST", "/api/checklist-templates", templateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
      setIsNewTemplateOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Checklist template created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create checklist template",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: Partial<TemplateFormData> }) => {
      const response = await apiRequest("PUT", `/api/checklist-templates/${templateId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
      setEditingTemplate(null);
      form.reset();
      toast({
        title: "Success",
        description: "Checklist template updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update checklist template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest("DELETE", `/api/checklist-templates/${templateId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
      toast({
        title: "Success",
        description: "Checklist template deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete checklist template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ templateId: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const addTemplateItem = () => {
    if (!newTemplateItem.trim()) return;
    const currentItems = form.getValues("templateItems") || [];
    form.setValue("templateItems", [
      ...currentItems,
      { text: newTemplateItem.trim(), required: false }
    ]);
    setNewTemplateItem("");
  };

  const removeTemplateItem = (index: number) => {
    const currentItems = form.getValues("templateItems") || [];
    form.setValue("templateItems", currentItems.filter((_, i) => i !== index));
  };

  const toggleItemRequired = (index: number) => {
    const currentItems = form.getValues("templateItems") || [];
    const updatedItems = currentItems.map((item, i) =>
      i === index ? { ...item, required: !item.required } : item
    );
    form.setValue("templateItems", updatedItems);
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      category: template.category as "development" | "marketing" | "operations" | "general",
      templateItems: template.templateItems as { text: string; required: boolean }[],
      isActive: template.isActive,
    });
  };

  const handleDelete = (templateId: string) => {
    if (confirm("Are you sure you want to delete this checklist template?")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setEditingTemplate(null);
    form.reset({
      category: "general",
      templateItems: [],
      isActive: true,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Checklist Templates</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Create and manage reusable checklist templates for common task types
          </p>
        </div>
        <Dialog open={isNewTemplateOpen || !!editingTemplate} onOpenChange={(open) => {
          if (!open) {
            setIsNewTemplateOpen(false);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsNewTemplateOpen(true)} data-testid="button-create-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingTemplate ? "Edit Checklist Template" : "Create New Checklist Template"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter template name" {...field} data-testid="input-template-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter template description" 
                          {...field} 
                          data-testid="input-template-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-template-category">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              <div className="flex items-center">
                                <category.icon className="w-4 h-4 mr-2" />
                                {category.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Template</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Active templates appear in task creation flow
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-template-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div>
                  <Label>Template Items</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-2">
                      <Input
                        value={newTemplateItem}
                        onChange={(e) => setNewTemplateItem(e.target.value)}
                        placeholder="Add checklist item"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTemplateItem();
                          }
                        }}
                        data-testid="input-new-template-item"
                      />
                      <Button type="button" onClick={addTemplateItem} data-testid="button-add-template-item">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {form.watch("templateItems")?.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded" data-testid={`template-item-${index}`}>
                          <Checkbox
                            checked={item.required}
                            onCheckedChange={() => toggleItemRequired(index)}
                            data-testid={`checkbox-required-${index}`}
                          />
                          <span className="flex-1 text-sm">{item.text}</span>
                          <span className="text-xs text-gray-500">
                            {item.required ? "Required" : "Optional"}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTemplateItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {form.formState.errors.templateItems && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {form.formState.errors.templateItems.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsNewTemplateOpen(false);
                      resetForm();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    data-testid="button-save-template"
                  >
                    {editingTemplate ? "Update Template" : "Create Template"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-templates"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter} data-testid="select-category-filter">
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                <div className="flex items-center">
                  <category.icon className="w-4 h-4 mr-2" />
                  {category.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ListChecks className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || categoryFilter !== "all" ? "No templates found" : "No checklist templates yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {searchTerm || categoryFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Create your first checklist template to get started"
              }
            </p>
            {!searchTerm && categoryFilter === "all" && (
              <Button onClick={() => setIsNewTemplateOpen(true)} data-testid="button-create-first-template">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id} className="relative" data-testid={`template-card-${template.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getCategoryIcon(template.category)}
                      <span data-testid={`text-template-name-${template.id}`}>{template.name}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getCategoryColor(template.category)} data-testid={`badge-category-${template.id}`}>
                        {categories.find(c => c.value === template.category)?.label}
                      </Badge>
                      <Badge variant={template.isActive ? "default" : "secondary"} data-testid={`badge-status-${template.id}`}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      data-testid={`button-edit-${template.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      data-testid={`button-delete-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3" data-testid={`text-description-${template.id}`}>
                    {template.description}
                  </p>
                )}
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Template Items ({(template.templateItems as any[])?.length || 0})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {(template.templateItems as { text: string; required: boolean }[])?.map((item, index) => (
                      <div key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1" data-testid={`template-item-preview-${template.id}-${index}`}>
                        <span className={item.required ? "text-red-600 dark:text-red-400" : "text-gray-400"}>
                          {item.required ? "●" : "○"}
                        </span>
                        {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}