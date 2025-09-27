import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Settings, 
  Users, 
  LogOut,
  Crown,
  UserCheck,
  TrendingUp,
  Package,
  HelpCircle
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { useToast } from "@/hooks/use-toast";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/super-admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Organizations",
    href: "/super-admin/organizations",
    icon: Building2,
  },
  {
    name: "Customer Tiers",
    href: "/super-admin/customer-tiers",
    icon: Package,
  },
  {
    name: "Billing",
    href: "/super-admin/billing",
    icon: CreditCard,
  },
  {
    name: "User Management",
    href: "/super-admin/users",
    icon: Users,
  },
  {
    name: "Analytics",
    href: "/super-admin/analytics",
    icon: TrendingUp,
  },
  {
    name: "System Settings",
    href: "/super-admin/settings",
    icon: Settings,
  },
  {
    name: "Customer Support",
    href: "/super-admin/customer-support",
    icon: HelpCircle,
  },
];

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useSuperAdmin();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been logged out of Super Admin",
      });
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "Failed to logout properly",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Crown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Super Admin
              </h1>
              <Badge variant="secondary" className="text-xs">
                Platform Level
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-2 px-4">
            {navigation.map((item) => {
              const isActive = item.exact 
                ? location === item.href 
                : location.startsWith(item.href);
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isActive 
                        ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/30" 
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
              <UserCheck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.name || user?.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
            data-testid="button-super-admin-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Super Administrator Console
            </span>
            <Badge variant="destructive" className="text-xs">
              RESTRICTED ACCESS
            </Badge>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}