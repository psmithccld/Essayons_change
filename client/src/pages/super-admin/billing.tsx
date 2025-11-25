import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  Activity,
  RefreshCw,
  ExternalLink,
  FileText,
  PieChart,
  BarChart3,
  Clock,
  Wallet
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Organization {
  id: string;
  name: string;
  status: string;
  contractValue: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  stripeCustomerId: string | null;
  licenseExpiresAt: string | null;
  isReadOnly: boolean;
  tierName?: string;
  tierPrice?: number;
}

interface FinancialStats {
  totalContractValue: number;
  monthlyRecurringRevenue: number;
  activeOrganizations: number;
  outstandingPayments: number;
  organizationsWithContracts: number;
  expiringContracts: number;
}

interface StripeInvoice {
  id: string;
  customer: string;
  customerName?: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  created: string;
  invoiceUrl?: string;
}

export default function SuperAdminFinancialDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { isAuthenticated } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch organizations with contract data
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["/api/super-admin/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/organizations", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json() as Promise<Organization[]>;
    },
    enabled: isAuthenticated,
  });

  // Fetch Stripe invoices for payment tracking
  const { data: stripeInvoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ["/api/super-admin/financial/stripe-invoices"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/financial/stripe-invoices", {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return []; // API not yet implemented
        throw new Error("Failed to fetch Stripe invoices");
      }
      return response.json() as Promise<StripeInvoice[]>;
    },
    enabled: isAuthenticated,
  });

  // Calculate financial statistics from organizations data
  const stats: FinancialStats = {
    totalContractValue: organizations.reduce((sum, org) => sum + (org.contractValue || 0), 0),
    monthlyRecurringRevenue: organizations
      .filter(org => org.status === 'active' && org.tierPrice)
      .reduce((sum, org) => sum + (org.tierPrice || 0), 0),
    activeOrganizations: organizations.filter(org => org.status === 'active').length,
    outstandingPayments: stripeInvoices.filter(inv => inv.status === 'open' || inv.status === 'past_due').length,
    organizationsWithContracts: organizations.filter(org => org.contractValue).length,
    expiringContracts: organizations.filter(org => {
      if (!org.contractEndDate) return false;
      const endDate = new Date(org.contractEndDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return endDate <= thirtyDaysFromNow && endDate >= new Date();
    }).length,
  };

  // Calculate outstanding payment amount
  const outstandingAmount = stripeInvoices
    .filter(inv => inv.status === 'open' || inv.status === 'past_due')
    .reduce((sum, inv) => sum + inv.amount, 0);

  // Filter organizations for contracts tab
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "with_contract" && org.contractValue) ||
      (statusFilter === "no_contract" && !org.contractValue) ||
      (statusFilter === "expiring" && org.contractEndDate && new Date(org.contractEndDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    return matchesSearch && matchesStatus;
  });

  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { variant: "default" as const, label: "Paid", className: "bg-green-100 text-green-800" },
      open: { variant: "secondary" as const, label: "Open", className: "bg-blue-100 text-blue-800" },
      past_due: { variant: "destructive" as const, label: "Past Due", className: "" },
      void: { variant: "outline" as const, label: "Void", className: "" },
      draft: { variant: "outline" as const, label: "Draft", className: "" },
      uncollectible: { variant: "destructive" as const, label: "Uncollectible", className: "" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "outline" as const, label: status, className: "" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statCards = [
    {
      title: "Total Contract Value",
      value: formatCurrency(stats.totalContractValue),
      icon: Wallet,
      description: `${stats.organizationsWithContracts} organizations with contracts`,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20"
    },
    {
      title: "Monthly Recurring Revenue",
      value: formatCurrency(stats.monthlyRecurringRevenue),
      icon: TrendingUp,
      description: "Based on active tier subscriptions",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20"
    },
    {
      title: "Active Organizations",
      value: stats.activeOrganizations,
      icon: Building2,
      description: `${stats.expiringContracts} contracts expiring soon`,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20"
    },
    {
      title: "Outstanding Payments",
      value: stats.outstandingPayments,
      icon: AlertTriangle,
      description: outstandingAmount > 0 ? formatCurrency(outstandingAmount) + " total" : "All payments current",
      color: stats.outstandingPayments > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
      bgColor: stats.outstandingPayments > 0 ? "bg-red-100 dark:bg-red-900/20" : "bg-green-100 dark:bg-green-900/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Executive-level visibility into contracts, revenue, and payments
          </p>
        </div>
        
        <Button
          onClick={() => refetchInvoices()}
          disabled={invoicesLoading}
          variant="outline"
          data-testid="button-refresh-financial"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${invoicesLoading ? 'animate-spin' : ''}`} />
          Refresh Data
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
                {orgsLoading ? "..." : stat.value}
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
          <TabsTrigger value="overview" data-testid="tab-financial-overview">
            <PieChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="contracts" data-testid="tab-contracts">
            <FileText className="h-4 w-4 mr-2" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <DollarSign className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Breakdown
                </CardTitle>
                <CardDescription>
                  Contract and subscription revenue overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Total Contract Value</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(stats.totalContractValue)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Monthly Recurring</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(stats.monthlyRecurringRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm">Annual Run Rate</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(stats.monthlyRecurringRevenue * 12)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Contract Status
                </CardTitle>
                <CardDescription>
                  Contract renewal and expiration tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Contracts</span>
                    <Badge variant="default">{stats.organizationsWithContracts}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expiring in 30 Days</span>
                    <Badge variant={stats.expiringContracts > 0 ? "destructive" : "secondary"}>
                      {stats.expiringContracts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Without Contracts</span>
                    <Badge variant="outline">{organizations.length - stats.organizationsWithContracts}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Contract Value</span>
                    <span className="text-sm font-medium">
                      {stats.organizationsWithContracts > 0 
                        ? formatCurrency(stats.totalContractValue / stats.organizationsWithContracts) 
                        : '$0.00'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expiring Contracts Alert */}
          {stats.expiringContracts > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-5 w-5" />
                  Contracts Requiring Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {organizations
                    .filter(org => {
                      if (!org.contractEndDate) return false;
                      const endDate = new Date(org.contractEndDate);
                      const thirtyDaysFromNow = new Date();
                      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                      return endDate <= thirtyDaysFromNow && endDate >= new Date();
                    })
                    .map(org => (
                      <div key={org.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{org.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Expires: {new Date(org.contractEndDate!).toLocaleDateString()}
                          </span>
                          <Badge variant="outline">{formatCurrency(org.contractValue || 0)}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search organizations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-contracts"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-contract-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    <SelectItem value="with_contract">With Contract</SelectItem>
                    <SelectItem value="no_contract">No Contract</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contracts List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Organization Contracts ({filteredOrganizations.length})
              </CardTitle>
              <CardDescription>
                Contract values and terms for all organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading contracts...</p>
              ) : filteredOrganizations.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No organizations found</p>
              ) : (
                <div className="space-y-4">
                  {filteredOrganizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold" data-testid={`contract-org-${org.id}`}>
                            {org.name}
                          </h3>
                          <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                            {org.status}
                          </Badge>
                          {org.tierName && <Badge variant="outline">{org.tierName}</Badge>}
                          {org.isReadOnly && <Badge variant="destructive">Read-Only</Badge>}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Contract: {org.contractValue ? formatCurrency(org.contractValue) : 'Not set'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Start: {org.contractStartDate ? new Date(org.contractStartDate).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            End: {org.contractEndDate ? new Date(org.contractEndDate).toLocaleDateString() : 'N/A'}
                          </div>
                          {org.stripeCustomerId && (
                            <div className="flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              Stripe: {org.stripeCustomerId.substring(0, 15)}...
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/super-admin/organizations`}
                          data-testid={`button-edit-contract-${org.id}`}
                        >
                          Edit
                        </Button>
                        {org.stripeCustomerId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://dashboard.stripe.com/customers/${org.stripeCustomerId}`, '_blank')}
                            data-testid={`button-view-stripe-${org.id}`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Stripe
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Payment Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Invoices</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stripeInvoices.filter(inv => inv.status === 'paid').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Open Invoices</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {stripeInvoices.filter(inv => inv.status === 'open').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Past Due</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stripeInvoices.filter(inv => inv.status === 'past_due').length}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoices List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Stripe Invoices
              </CardTitle>
              <CardDescription>
                Payment status from Stripe for linked organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading invoices...</p>
              ) : stripeInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No Stripe invoices found</p>
                  <p className="text-sm text-muted-foreground">
                    Link organizations to Stripe customers and create invoices in Stripe to see payment data here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stripeInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{invoice.customerName || invoice.customer}</h3>
                          {getInvoiceStatusBadge(invoice.status)}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(invoice.amount)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {new Date(invoice.created).toLocaleDateString()}
                          </div>
                          {invoice.dueDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {new Date(invoice.dueDate).toLocaleDateString()}
                            </div>
                          )}
                          {invoice.paidAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Paid: {new Date(invoice.paidAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {invoice.invoiceUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(invoice.invoiceUrl, '_blank')}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Invoice
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://dashboard.stripe.com/invoices/${invoice.id}`, '_blank')}
                          data-testid={`button-stripe-invoice-${invoice.id}`}
                        >
                          Stripe
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
