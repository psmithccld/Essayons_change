import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Filter, 
  Archive, 
  Download, 
  BarChart3, 
  Calendar, 
  Tag, 
  Users, 
  Mail, 
  Megaphone,
  FileText, 
  Eye,
  Edit,
  Share2,
  Trash2,
  ArrowUpDown,
  TrendingUp,
  Clock,
  Star,
  CheckSquare,
  MoreHorizontal,
  RefreshCw,
  SortAsc,
  SortDesc,
  X,
  Plus,
  AlertTriangle
} from "lucide-react";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Communication, type Stakeholder } from "@shared/schema";
import { format } from "date-fns";

interface RepositoryProps {
  onCreateNew?: (type: string) => void;
  onViewCommunication?: (communication: Communication) => void;
}

interface SearchFilters {
  query: string;
  types: string[];
  statuses: string[];
  tags: string[];
  dateFrom: string;
  dateTo: string;
  createdBy: string[];
  sortBy: 'createdAt' | 'updatedAt' | 'title' | 'engagementScore' | 'effectivenessRating';
  sortOrder: 'asc' | 'desc';
}

interface CommunicationMetrics {
  totalCommunications: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgEngagementScore: number;
  avgEffectivenessRating: number;
  mostUsedTags: Array<{ tag: string; count: number }>;
}

export default function CommunicationRepository({ onCreateNew, onViewCommunication }: RepositoryProps) {
  const { currentProject } = useCurrentProject();
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'archives' | 'insights'>('overview');
  const [selectedCommunications, setSelectedCommunications] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    types: [],
    statuses: [],
    tags: [],
    dateFrom: '',
    dateTo: '',
    createdBy: [],
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch project communications
  const { data: projectCommunications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'communications'],
    enabled: !!currentProject?.id
  });

  // Fetch stakeholders for filtering
  const { data: stakeholders = [] } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'stakeholders'],
    enabled: !!currentProject?.id
  });

  // Fetch users for filtering
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!currentProject?.id
  });

  // Advanced search query
  const { data: searchResults, isLoading: searchLoading, refetch: performSearch } = useQuery({
    queryKey: ['/api/communications/search', searchFilters, currentPage, pageSize, currentProject?.id],
    queryFn: () => apiRequest('/api/communications/search', {
      method: 'POST',
      body: {
        ...searchFilters,
        projectIds: currentProject?.id ? [currentProject.id] : undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      }
    }),
    enabled: false // Only run when explicitly triggered
  });

  // Fetch communication metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<CommunicationMetrics>({
    queryKey: ['/api/communications/metrics', currentProject?.id],
    queryFn: () => apiRequest('GET', `/api/communications/metrics?projectId=${currentProject?.id}`),
    enabled: !!currentProject?.id
  });

  // Archive communications mutation
  const archiveMutation = useMutation({
    mutationFn: (ids: string[]) => apiRequest('/api/communications/archive', {
      method: 'POST',
      body: { ids }
    }),
    onSuccess: (result: { archived: number; errors: string[] }) => {
      toast({
        title: `Archived ${result.archived} communications`,
        description: result.errors.length > 0 
          ? `${result.errors.length} communications failed to archive`
          : 'All selected communications archived successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      setSelectedCommunications([]);
    },
    onError: () => {
      toast({ title: 'Failed to archive communications', variant: 'destructive' });
    }
  });

  // Version history state
  const [selectedCommForVersions, setSelectedCommForVersions] = useState<string | null>(null);
  const { data: versionHistory, isLoading: versionsLoading } = useQuery({
    queryKey: ['/api/communications', selectedCommForVersions, 'versions'],
    queryFn: () => apiRequest('GET', `/api/communications/${selectedCommForVersions}/versions`),
    enabled: !!selectedCommForVersions
  });

  // Handle search execution
  const handleSearch = () => {
    setCurrentPage(1);
    performSearch();
  };

  // Handle filter changes
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle bulk actions
  const handleBulkArchive = () => {
    if (selectedCommunications.length === 0) {
      toast({ title: 'No communications selected', variant: 'destructive' });
      return;
    }
    archiveMutation.mutate(selectedCommunications);
  };

  // Handle bulk export
  const handleBulkExport = () => {
    if (selectedCommunications.length === 0) {
      toast({ title: 'No communications selected', variant: 'destructive' });
      return;
    }
    
    const selectedCommsData = displayCommunications.filter((c: Communication) => 
      selectedCommunications.includes(c.id)
    );
    
    const exportData = selectedCommsData.map(comm => ({
      id: comm.id,
      title: comm.title,
      type: getCommunicationTypeLabel(comm.type),
      status: comm.status,
      content: comm.content,
      created_at: format(new Date(comm.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      target_audience: comm.targetAudience?.join(', ') || '',
      tags: comm.tags?.join(', ') || '',
      engagement_score: comm.engagementScore || '',
      effectiveness_rating: comm.effectivenessRating || ''
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(key => `"${row[key] || ''}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `communications_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${selectedCommunications.length} communications to CSV`
    });
  };

  // Get communication icon
  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'flyer': return Megaphone;
      case 'group_email': return Mail;
      case 'point_to_point_email': return Users;
      case 'meeting': return Calendar;
      default: return FileText;
    }
  };

  // Get communication type label
  const getCommunicationTypeLabel = (type: string) => {
    switch (type) {
      case 'flyer': return 'Flyer';
      case 'group_email': return 'Group Email';
      case 'point_to_point_email': return 'P2P Email';
      case 'meeting_prompt': return 'Meeting Prompt';
      case 'meeting': return 'Meeting';
      default: return 'Communication';
    }
  };

  // Filter available tags from all communications
  const availableTags = [...new Set(
    projectCommunications
      .flatMap((comm: Communication) => comm.tags || [])
      .filter(Boolean)
  )];

  // Filter available statuses
  const availableStatuses = [...new Set(
    projectCommunications.map((comm: Communication) => comm.status)
  )];

  // Current communications to display
  const displayCommunications = activeTab === 'search' && searchResults 
    ? searchResults.communications 
    : projectCommunications;

  const totalCount = activeTab === 'search' && searchResults 
    ? searchResults.total 
    : projectCommunications.length;

  return (
    <div className="space-y-6" data-testid="communication-repository">
      {/* Repository Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Communications Repository</h2>
          <p className="text-muted-foreground">
            Unified archive and search across all communication types
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          {selectedCommunications.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkArchive}
                disabled={archiveMutation.isPending}
                data-testid="button-bulk-archive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive ({selectedCommunications.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                data-testid="button-bulk-export"
              >
                <Download className="w-4 h-4 mr-2" />
                Export ({selectedCommunications.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCommunications([])}
                data-testid="button-clear-selection"
              >
                <X className="w-4 h-4" />
              </Button>
              <Separator orientation="vertical" className="h-8" />
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
              queryClient.invalidateQueries({ queryKey: ['/api/communications/metrics'] });
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button
            onClick={() => onCreateNew?.('flyer')}
            data-testid="button-create-communication"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Communication
          </Button>
        </div>
      </div>

      {/* Repository Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="search" data-testid="tab-search">
            <Search className="w-4 h-4 mr-2" />
            Search & Filter
          </TabsTrigger>
          <TabsTrigger value="archives" data-testid="tab-archives">
            <Archive className="w-4 h-4 mr-2" />
            Archives
          </TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">
            <TrendingUp className="w-4 h-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {metricsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[120px]" />
              ))}
            </div>
          ) : (
            <>
              {/* Metrics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="card-total-communications">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Communications</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalCommunications || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Across all projects
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-engagement-score">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics?.avgEngagementScore ? metrics.avgEngagementScore.toFixed(1) : '0.0'}
                    </div>
                    <Progress 
                      value={metrics?.avgEngagementScore ? (metrics.avgEngagementScore / 5) * 100 : 0} 
                      className="mt-2" 
                    />
                  </CardContent>
                </Card>

                <Card data-testid="card-effectiveness-rating">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Effectiveness</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics?.avgEffectivenessRating ? metrics.avgEffectivenessRating.toFixed(1) : '0.0'}
                    </div>
                    <Progress 
                      value={metrics?.avgEffectivenessRating ? (metrics.avgEffectivenessRating / 5) * 100 : 0} 
                      className="mt-2" 
                    />
                  </CardContent>
                </Card>

                <Card data-testid="card-active-communications">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics?.byStatus?.sent || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Successfully sent
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Communication Types Distribution */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card data-testid="card-types-distribution">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Communication Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(metrics?.byType || {}).map(([type, count]) => {
                        const Icon = getCommunicationIcon(type);
                        const percentage = metrics?.totalCommunications ? (count / metrics.totalCommunications) * 100 : 0;
                        
                        return (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{getCommunicationTypeLabel(type)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Progress value={percentage} className="w-16 h-2" />
                              <span className="text-sm font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-popular-tags">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Tag className="w-4 h-4 mr-2" />
                      Popular Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {metrics?.mostUsedTags?.slice(0, 10).map(({ tag, count }) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag} ({count})
                        </Badge>
                      ))}
                      {(!metrics?.mostUsedTags || metrics.mostUsedTags.length === 0) && (
                        <p className="text-sm text-muted-foreground">No tags used yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Search & Filter Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card data-testid="card-search-filters">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Advanced Search & Filtering
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  data-testid="button-toggle-advanced-filters"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Search */}
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search by title, content, or keywords..."
                    value={searchFilters.query}
                    onChange={(e) => updateFilter('query', e.target.value)}
                    data-testid="input-search-query"
                  />
                </div>
                <Button onClick={handleSearch} disabled={searchLoading} data-testid="button-search">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 border-t pt-4">
                  {/* Communication Types */}
                  <div className="space-y-2">
                    <Label>Communication Types</Label>
                    <div className="space-y-2">
                      {['flyer', 'group_email', 'point_to_point_email', 'meeting'].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={searchFilters.types.includes(type)}
                            onCheckedChange={(checked) => {
                              const newTypes = checked
                                ? [...searchFilters.types, type]
                                : searchFilters.types.filter(t => t !== type);
                              updateFilter('types', newTypes);
                            }}
                            data-testid={`checkbox-type-${type}`}
                          />
                          <label htmlFor={`type-${type}`} className="text-sm">
                            {getCommunicationTypeLabel(type)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={searchFilters.statuses[0] || ''}
                      onValueChange={(value) => updateFilter('statuses', value ? [value] : [])}
                    >
                      <SelectTrigger data-testid="select-status-filter">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All statuses</SelectItem>
                        {availableStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        placeholder="From date"
                        value={searchFilters.dateFrom}
                        onChange={(e) => updateFilter('dateFrom', e.target.value)}
                        data-testid="input-date-from"
                      />
                      <Input
                        type="date"
                        placeholder="To date"
                        value={searchFilters.dateTo}
                        onChange={(e) => updateFilter('dateTo', e.target.value)}
                        data-testid="input-date-to"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  {availableTags.length > 0 && (
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {availableTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={searchFilters.tags.includes(tag) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const newTags = searchFilters.tags.includes(tag)
                                ? searchFilters.tags.filter(t => t !== tag)
                                : [...searchFilters.tags, tag];
                              updateFilter('tags', newTags);
                            }}
                            data-testid={`badge-tag-${tag}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sort Options */}
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <div className="flex space-x-2">
                      <Select
                        value={searchFilters.sortBy}
                        onValueChange={(value: any) => updateFilter('sortBy', value)}
                      >
                        <SelectTrigger data-testid="select-sort-by">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt">Created Date</SelectItem>
                          <SelectItem value="updatedAt">Updated Date</SelectItem>
                          <SelectItem value="title">Title</SelectItem>
                          <SelectItem value="engagementScore">Engagement Score</SelectItem>
                          <SelectItem value="effectivenessRating">Effectiveness Rating</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFilter('sortOrder', searchFilters.sortOrder === 'asc' ? 'desc' : 'asc')}
                        data-testid="button-toggle-sort-order"
                      >
                        {searchFilters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchFilters({
                          query: '',
                          types: [],
                          statuses: [],
                          tags: [],
                          dateFrom: '',
                          dateTo: '',
                          createdBy: [],
                          sortBy: 'createdAt',
                          sortOrder: 'desc'
                        });
                      }}
                      data-testid="button-clear-filters"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Results */}
          <Card data-testid="card-search-results">
            <CardHeader>
              <CardTitle>
                Search Results
                {totalCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalCount} results
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchLoading || communicationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : displayCommunications.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No communications found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or create a new communication
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayCommunications.map((communication: Communication) => {
                    const Icon = getCommunicationIcon(communication.type);
                    const isSelected = selectedCommunications.includes(communication.id);
                    
                    return (
                      <Card 
                        key={communication.id} 
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          isSelected ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => onViewCommunication?.(communication)}
                        data-testid={`card-communication-${communication.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCommunications(prev => [...prev, communication.id]);
                                } else {
                                  setSelectedCommunications(prev => prev.filter(id => id !== communication.id));
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`checkbox-communication-${communication.id}`}
                            />
                            
                            <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium truncate">{communication.title}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                    {communication.content}
                                  </p>
                                </div>
                                
                                <div className="flex items-center space-x-2 ml-4">
                                  <Badge variant={communication.status === 'sent' ? 'default' : 'outline'}>
                                    {communication.status}
                                  </Badge>
                                  {communication.isGptGenerated && (
                                    <Badge variant="outline" className="text-xs">
                                      AI Generated
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  <span className="flex items-center">
                                    <Icon className="w-3 h-3 mr-1" />
                                    {getCommunicationTypeLabel(communication.type)}
                                  </span>
                                  <span className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {format(new Date(communication.createdAt), 'MMM d, yyyy')}
                                  </span>
                                  {communication.targetAudience && communication.targetAudience.length > 0 && (
                                    <span className="flex items-center">
                                      <Users className="w-3 h-3 mr-1" />
                                      {communication.targetAudience.length} recipients
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1">
                                    {communication.tags && communication.tags.map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                  
                                  {/* Action buttons */}
                                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedCommForVersions(communication.id)}
                                      data-testid={`button-versions-${communication.id}`}
                                    >
                                      <Clock className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const exportData = [{
                                          id: communication.id,
                                          title: communication.title,
                                          type: getCommunicationTypeLabel(communication.type),
                                          status: communication.status,
                                          content: communication.content,
                                          created_at: format(new Date(communication.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                                          target_audience: communication.targetAudience?.join(', ') || '',
                                          tags: communication.tags?.join(', ') || '',
                                          engagement_score: communication.engagementScore || '',
                                          effectiveness_rating: communication.effectivenessRating || ''
                                        }];

                                        const headers = Object.keys(exportData[0]);
                                        const csvContent = [
                                          headers.join(','),
                                          ...exportData.map(row => headers.map(key => `"${row[key] || ''}"`).join(','))
                                        ].join('\n');

                                        const blob = new Blob([csvContent], { type: 'text/csv' });
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `${communication.title}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                        
                                        toast({
                                          title: 'Export Complete',
                                          description: `Exported "${communication.title}" to CSV`
                                        });
                                      }}
                                      data-testid={`button-export-single-${communication.id}`}
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        toast({
                                          title: "Share Communication",
                                          description: "Communication sharing features coming soon"
                                        });
                                      }}
                                      data-testid={`button-share-${communication.id}`}
                                    >
                                      <Share2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version History Dialog */}
          <Dialog open={!!selectedCommForVersions} onOpenChange={() => setSelectedCommForVersions(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-version-history">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Version History
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {versionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : versionHistory && versionHistory.length > 0 ? (
                  <div className="space-y-3">
                    {versionHistory.map((version: Communication, index: number) => (
                      <Card key={version.id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {index === 0 && (
                                <Badge variant="default" className="text-xs">
                                  Current
                                </Badge>
                              )}
                              {index > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  v{version.version || (versionHistory.length - index)}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium truncate">{version.title}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                    {version.content}
                                  </p>
                                </div>
                                
                                <div className="flex items-center space-x-2 ml-4">
                                  <Badge variant={version.status === 'sent' ? 'default' : 'outline'}>
                                    {version.status}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  <span className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {format(new Date(version.createdAt), 'MMM d, yyyy • h:mm a')}
                                  </span>
                                  {version.updatedAt && version.updatedAt !== version.createdAt && (
                                    <span className="flex items-center">
                                      <Edit className="w-3 h-3 mr-1" />
                                      Modified {format(new Date(version.updatedAt), 'MMM d, yyyy • h:mm a')}
                                    </span>
                                  )}
                                </div>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => onViewCommunication?.(version)}
                                  data-testid={`button-view-version-${version.id}`}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No version history</h3>
                    <p className="text-muted-foreground">
                      This communication has no previous versions
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Archives Tab - Detailed Communication Archives */}
        <TabsContent value="archives" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Quick Archive Stats */}
            <Card data-testid="card-archive-flyers">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Flyers Archive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.byType?.['flyer'] || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total flyers created
                </p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {Object.values(metrics?.byStatus || {}).reduce((sum, count) => sum + count, 0)} sent
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => {
                    updateFilter('types', ['flyer']);
                    setActiveTab('search');
                    handleSearch();
                  }} data-testid="button-view-flyers">
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-archive-group-emails">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Group Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.byType?.['group_email'] || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Group communications
                </p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Multi-recipient
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => {
                    updateFilter('types', ['group_email']);
                    setActiveTab('search');
                    handleSearch();
                  }} data-testid="button-view-group-emails">
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-archive-p2p-emails">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  P2P Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.byType?.['point_to_point_email'] || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Personal communications
                </p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="secondary" className="text-xs">
                    1-on-1
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => {
                    updateFilter('types', ['point_to_point_email']);
                    setActiveTab('search');
                    handleSearch();
                  }} data-testid="button-view-p2p-emails">
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-archive-meetings">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Meeting Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics?.byType?.['meeting'] || 0) + (metrics?.byType?.['meeting_prompt'] || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Meetings & prompts
                </p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Interactive
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => {
                    updateFilter('types', ['meeting', 'meeting_prompt']);
                    setActiveTab('search');
                    handleSearch();
                  }} data-testid="button-view-meetings">
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Archive Views */}
          <Tabs defaultValue="flyers" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="flyers" data-testid="archive-tab-flyers">
                <Megaphone className="w-4 h-4 mr-2" />
                Flyers
              </TabsTrigger>
              <TabsTrigger value="group-emails" data-testid="archive-tab-group-emails">
                <Mail className="w-4 h-4 mr-2" />
                Group Emails
              </TabsTrigger>
              <TabsTrigger value="p2p-emails" data-testid="archive-tab-p2p-emails">
                <Users className="w-4 h-4 mr-2" />
                P2P Emails
              </TabsTrigger>
              <TabsTrigger value="meetings" data-testid="archive-tab-meetings">
                <Calendar className="w-4 h-4 mr-2" />
                Meeting Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="flyers" className="space-y-4">
              <Card data-testid="card-flyers-archive-detail">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Megaphone className="w-4 h-4 mr-2" />
                      Flyers Archive
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" data-testid="button-export-flyers">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Distribution Rate</div>
                        <div className="text-2xl font-bold">
                          {metrics?.byStatus?.sent && metrics?.totalCommunications 
                            ? Math.round((metrics.byStatus.sent / metrics.totalCommunications) * 100)
                            : 0}%
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Avg. Engagement</div>
                        <div className="text-2xl font-bold">
                          {metrics?.avgEngagementScore?.toFixed(1) || '0.0'}
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Most Active Tag</div>
                        <div className="text-lg font-bold">
                          {metrics?.mostUsedTags?.[0]?.tag || 'None'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Recent Flyers</h4>
                      <div className="space-y-2">
                        {projectCommunications
                          ?.filter((c: Communication) => c.type === 'flyer')
                          ?.slice(0, 3)
                          ?.map((communication: Communication) => (
                            <div key={communication.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{communication.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(communication.createdAt), 'MMM d, yyyy')}
                                </div>
                              </div>
                              <Badge variant={communication.status === 'sent' ? 'default' : 'outline'}>
                                {communication.status}
                              </Badge>
                            </div>
                          )) || (
                          <div className="text-center text-muted-foreground py-4">
                            No flyers created yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="group-emails" className="space-y-4">
              <Card data-testid="card-group-emails-archive-detail">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Group Email Archive
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" data-testid="button-export-group-emails">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Recipients</div>
                        <div className="text-2xl font-bold">
                          {projectCommunications
                            ?.filter((c: Communication) => c.type === 'group_email')
                            ?.reduce((total, c) => total + (c.targetAudience?.length || 0), 0) || 0}
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Thread Tracking</div>
                        <div className="text-lg font-bold">Active</div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Avg. Response Rate</div>
                        <div className="text-2xl font-bold">
                          {metrics?.avgEffectivenessRating?.toFixed(1) || '0.0'}
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Recent Group Emails</h4>
                      <div className="space-y-2">
                        {projectCommunications
                          ?.filter((c: Communication) => c.type === 'group_email')
                          ?.slice(0, 3)
                          ?.map((communication: Communication) => (
                            <div key={communication.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{communication.title}</div>
                                <div className="text-xs text-muted-foreground flex items-center space-x-2">
                                  <span>{format(new Date(communication.createdAt), 'MMM d, yyyy')}</span>
                                  <span>•</span>
                                  <span>{communication.targetAudience?.length || 0} recipients</span>
                                </div>
                              </div>
                              <Badge variant={communication.status === 'sent' ? 'default' : 'outline'}>
                                {communication.status}
                              </Badge>
                            </div>
                          )) || (
                          <div className="text-center text-muted-foreground py-4">
                            No group emails sent yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="p2p-emails" className="space-y-4">
              <Card data-testid="card-p2p-emails-archive-detail">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      P2P Email Archive
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" data-testid="button-export-p2p-emails">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Personal Conversations</div>
                        <div className="text-2xl font-bold">
                          {metrics?.byType?.['point_to_point_email'] || 0}
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Stakeholder Coverage</div>
                        <div className="text-2xl font-bold">
                          {stakeholders?.length || 0}
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Privacy Level</div>
                        <div className="text-lg font-bold">Secure</div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Recent Personal Communications</h4>
                      <div className="space-y-2">
                        {projectCommunications
                          ?.filter((c: Communication) => c.type === 'point_to_point_email')
                          ?.slice(0, 3)
                          ?.map((communication: Communication) => (
                            <div key={communication.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{communication.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(communication.createdAt), 'MMM d, yyyy')} • Personal
                                </div>
                              </div>
                              <Badge variant={communication.status === 'sent' ? 'default' : 'outline'}>
                                {communication.status}
                              </Badge>
                            </div>
                          )) || (
                          <div className="text-center text-muted-foreground py-4">
                            No personal emails sent yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4">
              <Card data-testid="card-meetings-archive-detail">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Meeting Logs Archive
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" data-testid="button-export-meetings">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Meetings</div>
                        <div className="text-2xl font-bold">
                          {(metrics?.byType?.['meeting'] || 0) + (metrics?.byType?.['meeting_prompt'] || 0)}
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Follow-up Actions</div>
                        <div className="text-2xl font-bold">
                          {projectCommunications
                            ?.filter((c: Communication) => ['meeting', 'meeting_prompt'].includes(c.type))
                            ?.length || 0}
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Participant Tracking</div>
                        <div className="text-lg font-bold">Active</div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Recent Meetings & Prompts</h4>
                      <div className="space-y-2">
                        {projectCommunications
                          ?.filter((c: Communication) => ['meeting', 'meeting_prompt'].includes(c.type))
                          ?.slice(0, 3)
                          ?.map((communication: Communication) => (
                            <div key={communication.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{communication.title}</div>
                                <div className="text-xs text-muted-foreground flex items-center space-x-2">
                                  <span>{format(new Date(communication.createdAt), 'MMM d, yyyy')}</span>
                                  <span>•</span>
                                  <span>{getCommunicationTypeLabel(communication.type)}</span>
                                </div>
                              </div>
                              <Badge variant={communication.status === 'sent' ? 'default' : 'outline'}>
                                {communication.status}
                              </Badge>
                            </div>
                          )) || (
                          <div className="text-center text-muted-foreground py-4">
                            No meetings scheduled yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Insights Tab - Cross-Communication Analytics */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Stakeholder Engagement Tracking */}
            <Card data-testid="card-stakeholder-engagement">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Stakeholder Engagement Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {stakeholders?.slice(0, 5).map((stakeholder: Stakeholder) => {
                    // Calculate communications involving this stakeholder
                    const stakeholderCommunications = projectCommunications?.filter((c: Communication) => 
                      c.targetAudience?.includes(stakeholder.name) || 
                      c.targetAudience?.includes(stakeholder.role)
                    ) || [];
                    
                    const engagementLevel = stakeholderCommunications.length > 3 ? 'high' : 
                                           stakeholderCommunications.length > 1 ? 'medium' : 'low';
                    
                    return (
                      <div key={stakeholder.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{stakeholder.name}</div>
                          <div className="text-xs text-muted-foreground">{stakeholder.role}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              engagementLevel === 'high' ? 'default' : 
                              engagementLevel === 'medium' ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {stakeholderCommunications.length} comms
                          </Badge>
                          <Progress 
                            value={Math.min((stakeholderCommunications.length / 5) * 100, 100)} 
                            className="w-16 h-2"
                          />
                        </div>
                      </div>
                    );
                  }) || (
                    <div className="text-center text-muted-foreground py-4">
                      No stakeholders to track
                    </div>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    // Could implement detailed stakeholder engagement analysis
                    toast({
                      title: "Stakeholder Analysis",
                      description: "Detailed engagement analysis coming soon"
                    });
                  }}
                  data-testid="button-detailed-engagement-analysis"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Detailed Analysis
                </Button>
              </CardContent>
            </Card>

            {/* Communication Frequency & Effectiveness */}
            <Card data-testid="card-communication-frequency">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Communication Effectiveness Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Effectiveness</span>
                      <Badge variant="default">
                        {metrics?.avgEffectivenessRating?.toFixed(1) || '0.0'}/5.0
                      </Badge>
                    </div>
                    <Progress 
                      value={metrics?.avgEffectivenessRating ? (metrics.avgEffectivenessRating / 5) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Engagement Score</span>
                      <Badge variant="secondary">
                        {metrics?.avgEngagementScore?.toFixed(1) || '0.0'}/5.0
                      </Badge>
                    </div>
                    <Progress 
                      value={metrics?.avgEngagementScore ? (metrics.avgEngagementScore / 5) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Communication Frequency (Last 30 days)</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted p-2 rounded text-center">
                        <div className="text-lg font-bold">
                          {projectCommunications?.filter((c: Communication) => {
                            const createdAt = new Date(c.createdAt);
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            return createdAt >= thirtyDaysAgo;
                          }).length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="bg-muted p-2 rounded text-center">
                        <div className="text-lg font-bold">
                          {projectCommunications?.filter((c: Communication) => {
                            const createdAt = new Date(c.createdAt);
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                            return createdAt >= sevenDaysAgo;
                          }).length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">This Week</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Most Effective Communication Type</div>
                    <div className="flex items-center space-x-2">
                      {Object.entries(metrics?.byType || {})
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 1)
                        .map(([type, count]) => {
                          const Icon = getCommunicationIcon(type);
                          return (
                            <div key={type} className="flex items-center space-x-2 bg-muted px-3 py-1 rounded">
                              <Icon className="w-4 h-4" />
                              <span className="text-sm">{getCommunicationTypeLabel(type)}</span>
                              <Badge variant="outline" className="text-xs">{count}</Badge>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "Advanced Analytics",
                      description: "Detailed effectiveness analytics coming soon"
                    });
                  }}
                  data-testid="button-advanced-analytics"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Advanced Analytics
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Project Timeline Correlation */}
          <Card data-testid="card-timeline-correlation">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Project Timeline Correlation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-lg font-bold">
                      {projectCommunications?.filter((c: Communication) => c.status === 'sent').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Communications Sent</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-lg font-bold">
                      {projectCommunications?.filter((c: Communication) => c.status === 'draft').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Drafts Pending</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-lg font-bold">
                      {currentProject?.status === 'active' ? 'Active' : currentProject?.status || 'Unknown'}
                    </div>
                    <div className="text-sm text-muted-foreground">Project Status</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Communication Timeline</h4>
                  <div className="space-y-2">
                    {projectCommunications
                      ?.sort((a: Communication, b: Communication) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      ?.slice(0, 5)
                      ?.map((communication: Communication) => {
                        const Icon = getCommunicationIcon(communication.type);
                        return (
                          <div key={communication.id} className="flex items-center space-x-3 p-2 bg-muted/50 rounded">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{communication.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(communication.createdAt), 'MMM d, yyyy • h:mm a')}
                              </div>
                            </div>
                            <Badge variant={communication.status === 'sent' ? 'default' : 'outline'}>
                              {communication.status}
                            </Badge>
                          </div>
                        );
                      }) || (
                      <div className="text-center text-muted-foreground py-4">
                        No communications in timeline
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RAID Log Integration */}
          <Card data-testid="card-raid-integration">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                RAID Log Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Track communications related to project risks, assumptions, issues, and dependencies.
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border rounded-lg p-3">
                    <div className="font-medium text-sm mb-2">Communications with RAID References</div>
                    <div className="text-2xl font-bold">
                      {projectCommunications?.filter((c: Communication) => 
                        c.raidLogReferences && c.raidLogReferences.length > 0
                      ).length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Out of {projectCommunications?.length || 0} total communications
                    </div>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="font-medium text-sm mb-2">Most Referenced RAID Type</div>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm">Risks & Issues</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Primary focus area
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "RAID Integration",
                      description: "Detailed RAID log correlation analysis coming soon"
                    });
                  }}
                  data-testid="button-raid-correlation"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View RAID Correlations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}