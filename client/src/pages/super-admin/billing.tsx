import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  Users,
  Activity,
  RefreshCw,
  ExternalLink,
  FileText
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface BillingStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  overdueInvoices: number;
  totalInvoices: number;
  revenueGrowth: number;
  churnRate: number;
}

interface Subscription {
  id: string;
  organizationId: string;
  organizationName: string;
  tierId: string;
  tierName: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  price: number;
  currency: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: string;
  organizationId: string;
  organizationName: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export default function SuperAdminBilling() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { sessionId } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch billing statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/super-admin/billing/stats"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/billing/stats", {
        credentials: 'include' // Use cookies for authentication
      });
      if (!response.ok) throw new Error("Failed to fetch billing stats");
      return response.json() as Promise<BillingStats>;
    },
    enabled: !!sessionId,
  });

  // Fetch subscriptions
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["/api/super-admin/billing/subscriptions"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/billing/subscriptions", {
        credentials: 'include' // Use cookies for authentication
      });
      if (!response.ok) throw new Error("Failed to fetch subscriptions");
      return response.json() as Promise<Subscription[]>;
    },
    enabled: !!sessionId,
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/super-admin/billing/invoices"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/billing/invoices", {
        credentials: 'include' // Use cookies for authentication
      });
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json() as Promise<Invoice[]>;
    },
    enabled: !!sessionId,
  });

  // Sync with Stripe mutation
  const syncStripeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/super-admin/billing/sync-stripe", {
        method: "POST",
        credentials: 'include' // Use cookies for authentication
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sync with Stripe");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all billing-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/billing/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/billing/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/billing/invoices"] });
      toast({
        title: "Success",
        description: "Billing data synced with Stripe successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, immediate }: { subscriptionId: string; immediate: boolean }) => {
      const response = await fetch(`/api/super-admin/billing/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify({ immediate }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel subscription");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/billing/subscriptions"] });
      toast({
        title: "Success",
        description: "Subscription cancelled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.tierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.stripeSubscriptionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = subscriptionFilter === "all" || sub.status === subscriptionFilter;
    return matchesSearch && matchesFilter;
  });

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.stripeInvoiceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = invoiceFilter === "all" || invoice.status === invoiceFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      trialing: { variant: "secondary" as const, label: "Trial" },
      past_due: { variant: "destructive" as const, label: "Past Due" },
      canceled: { variant: "outline" as const, label: "Cancelled" },
      unpaid: { variant: "destructive" as const, label: "Unpaid" },
      incomplete: { variant: "secondary" as const, label: "Incomplete" },
      incomplete_expired: { variant: "destructive" as const, label: "Expired" },
      paid: { variant: "default" as const, label: "Paid" },
      open: { variant: "secondary" as const, label: "Open" },
      void: { variant: "outline" as const, label: "Void" },
      draft: { variant: "outline" as const, label: "Draft" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      description: "All-time revenue",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20"
    },
    {
      title: "Monthly Revenue",
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      description: `${stats?.revenueGrowth ? (stats.revenueGrowth > 0 ? '+' : '') + stats.revenueGrowth.toFixed(1) : '0'}% from last month`,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20"
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      description: `${stats?.cancelledSubscriptions || 0} cancelled`,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20"
    },
    {
      title: "Overdue Invoices",
      value: stats?.overdueInvoices || 0,
      icon: AlertTriangle,
      description: `${stats?.totalInvoices || 0} total invoices`,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Billing Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage subscriptions, invoices, and Stripe integration
          </p>
        </div>
        
        <Button
          onClick={() => syncStripeMutation.mutate()}
          disabled={syncStripeMutation.isPending}
          data-testid="button-sync-stripe"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncStripeMutation.isPending ? 'animate-spin' : ''}`} />
          {syncStripeMutation.isPending ? "Syncing..." : "Sync with Stripe"}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {statsLoading ? "..." : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-billing-overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Overview
                </CardTitle>
                <CardDescription>
                  Key billing metrics and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Revenue Growth</span>
                    <span className={`text-sm font-medium ${(stats?.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats?.revenueGrowth ? (stats.revenueGrowth > 0 ? '+' : '') + stats.revenueGrowth.toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Churn Rate</span>
                    <span className="text-sm font-medium">
                      {stats?.churnRate ? stats.churnRate.toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Revenue per User</span>
                    <span className="text-sm font-medium">
                      ${stats?.activeSubscriptions ? (stats.monthlyRevenue / stats.activeSubscriptions).toFixed(2) : '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest billing events and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded">
                          <FileText className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{invoice.organizationName}</p>
                          <p className="text-xs text-muted-foreground">
                            ${invoice.amount} • {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent billing activity
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search subscriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-subscriptions"
                  />
                </div>
                
                <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                  <SelectTrigger className="w-48" data-testid="select-subscription-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscriptions</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trialing">Trial</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="canceled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscriptions ({filteredSubscriptions.length})
              </CardTitle>
              <CardDescription>
                Manage all active and inactive subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading subscriptions...</p>
              ) : filteredSubscriptions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No subscriptions found</p>
              ) : (
                <div className="space-y-4">
                  {filteredSubscriptions.map((subscription) => (
                    <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold" data-testid={`subscription-org-${subscription.id}`}>
                            {subscription.organizationName}
                          </h3>
                          {getStatusBadge(subscription.status)}
                          <Badge variant="outline">{subscription.tierName}</Badge>
                          {subscription.cancelAtPeriodEnd && (
                            <Badge variant="destructive">Cancelling</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${subscription.price}/{subscription.currency}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {subscription.stripeCustomerId}
                          </div>
                          <div className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {subscription.stripeSubscriptionId}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`, '_blank')}
                          data-testid={`button-view-stripe-${subscription.id}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Stripe
                        </Button>
                        {subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-cancel-subscription-${subscription.id}`}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Cancel Subscription</DialogTitle>
                                <DialogDescription>
                                  Cancel subscription for {subscription.organizationName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                  Choose when to cancel this subscription:
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => cancelSubscriptionMutation.mutate({ 
                                      subscriptionId: subscription.id, 
                                      immediate: false 
                                    })}
                                    disabled={cancelSubscriptionMutation.isPending}
                                    data-testid="button-cancel-at-period-end"
                                  >
                                    Cancel at Period End
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => cancelSubscriptionMutation.mutate({ 
                                      subscriptionId: subscription.id, 
                                      immediate: true 
                                    })}
                                    disabled={cancelSubscriptionMutation.isPending}
                                    data-testid="button-cancel-immediately"
                                  >
                                    Cancel Immediately
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          {/* Invoice Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-invoices"
                  />
                </div>
                
                <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                  <SelectTrigger className="w-48" data-testid="select-invoice-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Invoices</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoices ({filteredInvoices.length})
              </CardTitle>
              <CardDescription>
                Track all billing invoices and payment status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading invoices...</p>
              ) : filteredInvoices.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No invoices found</p>
              ) : (
                <div className="space-y-4">
                  {filteredInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold" data-testid={`invoice-org-${invoice.id}`}>
                            {invoice.organizationName}
                          </h3>
                          {getStatusBadge(invoice.status)}
                          <span className="text-sm font-medium">
                            ${invoice.amount} {invoice.currency.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Period: {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                          </div>
                          {invoice.paidAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Paid: {new Date(invoice.paidAt).toLocaleDateString()}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {invoice.stripeInvoiceId}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://dashboard.stripe.com/invoices/${invoice.stripeInvoiceId}`, '_blank')}
                          data-testid={`button-view-invoice-stripe-${invoice.id}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View in Stripe
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}