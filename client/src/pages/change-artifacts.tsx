import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/auth/FeatureGate";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Upload, FileText, Download, Eye, Trash2, Search, Filter, Tag } from "lucide-react";
import type { UploadResult } from "@uppy/core";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";

const CATEGORIES = {
  'process_documentation': 'Process Documentation',
  'training_materials': 'Training Materials',
  'templates': 'Templates',
  'assessments': 'Assessments',
  'stakeholder_resources': 'Stakeholder Resources',
  'compliance_documents': 'Compliance Documents',
  'change_plans': 'Change Plans',
  'communications': 'Communications',
  'reports': 'Reports',
  'other': 'Other'
} as const;

interface ChangeArtifact {
  id: string;
  projectId: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  contentType: string;
  objectPath: string;
  category: keyof typeof CATEGORIES;
  description?: string;
  tags: string[];
  versionNumber: number;
  isActive: boolean;
  uploadedById: string;
  uploadedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  isPublic: boolean;
}

export default function ChangeArtifacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [uploadMetadata, setUploadMetadata] = useState({
    category: "other" as keyof typeof CATEGORIES,
    description: "",
    tags: "",
    isPublic: false
  });

  // Fetch Change Artifacts for current project
  const { data: artifacts = [], isLoading } = useQuery<ChangeArtifact[]>({
    queryKey: ['/api/projects', currentProject?.id, 'change-artifacts'],
    enabled: !!currentProject?.id
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (uploadData: any) => {
      if (!currentProject?.id) {
        throw new Error('No project selected');
      }
      const response = await fetch(`/api/projects/${currentProject.id}/change-artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadData)
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'change-artifacts'] });
      // Reset upload metadata
      setUploadMetadata({
        category: "other",
        description: "",
        tags: "",
        isPublic: false
      });
    },
    onError: () => {
      toast({ 
        title: "Upload failed", 
        description: "There was an error uploading your document",
        variant: "destructive" 
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (artifactId: string) => {
      const response = await fetch(`/api/change-artifacts/${artifactId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Document deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'change-artifacts'] });
    },
    onError: () => {
      toast({ 
        title: "Delete failed", 
        description: "There was an error deleting the document",
        variant: "destructive" 
      });
    }
  });

  // Store upload metadata including storage paths using useRef for synchronous access
  const pendingUploadRef = useRef<{
    filePath: string;
    objectPath: string;
  } | null>(null);

  const handleGetUploadParameters = async () => {
    if (!currentProject?.id) {
      toast({
        title: "Project Required",
        description: "Please select a project first",
        variant: "destructive"
      });
      throw new Error('No project selected');
    }
    
    try {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to get upload URL');
      const data = await response.json();
      
      // Store the file path and object path for use after upload completes
      // Using ref for synchronous access when Uppy calls handleUploadComplete
      pendingUploadRef.current = {
        filePath: data.filePath,
        objectPath: data.objectPath
      };
      
      return {
        method: 'PUT' as const,
        url: data.uploadURL
      };
    } catch (error) {
      toast({ 
        title: "Upload preparation failed", 
        description: "Could not prepare file upload",
        variant: "destructive" 
      });
      throw error;
    }
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      
      if (!uploadedFile.name) {
        toast({ 
          title: "Upload failed", 
          description: "File name is missing",
          variant: "destructive" 
        });
        return;
      }
      
      if (!pendingUploadRef.current) {
        toast({ 
          title: "Upload failed", 
          description: "Storage path information is missing",
          variant: "destructive" 
        });
        return;
      }
      
      const uploadData = {
        filename: uploadedFile.name,
        originalFilename: uploadedFile.name,
        fileSize: uploadedFile.size,
        contentType: uploadedFile.type || 'application/octet-stream',
        filePath: pendingUploadRef.current.filePath,
        objectPath: pendingUploadRef.current.objectPath,
        category: uploadMetadata.category,
        description: uploadMetadata.description || null,
        tags: uploadMetadata.tags ? uploadMetadata.tags.split(',').map(tag => tag.trim()) : [],
        isPublic: uploadMetadata.isPublic
      };
      
      uploadMutation.mutate(uploadData);
      
      // Clear pending upload
      pendingUploadRef.current = null;
    }
  };

  const handleDownload = (artifact: ChangeArtifact) => {
    // Create download link
    const link = document.createElement('a');
    link.href = artifact.objectPath;
    link.download = artifact.originalFilename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (artifactId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(artifactId);
    }
  };

  // Filter artifacts based on search and category
  const filteredArtifacts = artifacts.filter((artifact: ChangeArtifact) => {
    const matchesSearch = searchQuery === "" || 
      artifact.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || artifact.category === selectedCategory;
    
    return matchesSearch && matchesCategory && artifact.isActive;
  });

  return (
    <FeatureGate feature="changeArtifacts" redirectTo="/">
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-change-artifacts">Change Artifacts</h1>
          <p className="text-muted-foreground">
            Manage your change management documents, templates, and resources in one central repository.
          </p>
        </div>
        
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload New Document
            </CardTitle>
            <CardDescription>
              Add training materials, templates, process documentation, and other change artifacts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={uploadMetadata.category} onValueChange={(value) => setUploadMetadata(prev => ({ ...prev, category: value as keyof typeof CATEGORIES }))}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 pt-6">
                <input 
                  type="checkbox" 
                  id="isPublic" 
                  checked={uploadMetadata.isPublic}
                  onChange={(e) => setUploadMetadata(prev => ({ ...prev, isPublic: e.target.checked }))}
                  data-testid="checkbox-public"
                />
                <Label htmlFor="isPublic">Make publicly accessible</Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the document and its purpose..."
                value={uploadMetadata.description}
                onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                data-testid="textarea-description"
              />
            </div>
            
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="training, template, process, stakeholder..."
                value={uploadMetadata.tags}
                onChange={(e) => setUploadMetadata(prev => ({ ...prev, tags: e.target.value }))}
                data-testid="input-tags"
              />
            </div>
            
            <div className="pt-4">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={50 * 1024 * 1024} // 50MB
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </ObjectUploader>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search documents, descriptions, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="select-filter-category">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading documents...</p>
            </div>
          ) : filteredArtifacts.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedCategory !== "all" 
                    ? "No documents match your current search criteria"
                    : "Upload your first document to get started"
                  }
                </p>
                {(searchQuery || selectedCategory !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredArtifacts.map((artifact: ChangeArtifact) => (
                <Card key={artifact.id} className="hover:shadow-md transition-shadow" data-testid={`card-artifact-${artifact.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-semibold" data-testid={`text-filename-${artifact.id}`}>
                            {artifact.originalFilename}
                          </h3>
                          <Badge variant="secondary" data-testid={`badge-category-${artifact.id}`}>
                            {CATEGORIES[artifact.category]}
                          </Badge>
                          {artifact.isPublic && (
                            <Badge variant="outline">Public</Badge>
                          )}
                        </div>
                        
                        {artifact.description && (
                          <p className="text-muted-foreground text-sm mb-2" data-testid={`text-description-${artifact.id}`}>
                            {artifact.description}
                          </p>
                        )}
                        
                        {artifact.tags.length > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-3 h-3 text-muted-foreground" />
                            <div className="flex flex-wrap gap-1">
                              {artifact.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-tag-${artifact.id}-${index}`}>
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Size: {(artifact.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          <span>Version: {artifact.versionNumber}</span>
                          <span>Accessed: {artifact.accessCount} times</span>
                          <span>Uploaded: {new Date(artifact.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(artifact)}
                          data-testid={`button-download-${artifact.id}`}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(artifact.objectPath, '_blank')}
                          data-testid={`button-view-${artifact.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(artifact.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${artifact.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </FeatureGate>
  );
}