import { Switch, Route } from "wouter";
import { SuperAdminProvider, useSuperAdmin } from "@/contexts/SuperAdminContext";
import { SuperAdminLoginPage } from "@/pages/auth/super-admin-login";
import SuperAdminLayout from "@/pages/super-admin/layout";
import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import SuperAdminOrganizations from "@/pages/super-admin/organizations";
import SuperAdminCustomerTiers from "@/pages/super-admin/customer-tiers";
import SuperAdminBilling from "@/pages/super-admin/billing";
import SuperAdminUsers from "@/pages/super-admin/users";
import { Loader2 } from "lucide-react";

function SuperAdminLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
        <p className="text-gray-600 dark:text-gray-400">Loading Super Admin...</p>
      </div>
    </div>
  );
}

function SuperAdminRouter() {
  const { isAuthenticated, isLoading, login } = useSuperAdmin();

  if (isLoading) {
    return <SuperAdminLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <SuperAdminLoginPage onAuthSuccess={login} />;
  }

  return (
    <SuperAdminLayout>
      <Switch>
        <Route path="/super-admin" component={SuperAdminDashboard} />
        <Route path="/super-admin/organizations" component={SuperAdminOrganizations} />
        <Route path="/super-admin/customer-tiers" component={SuperAdminCustomerTiers} />
        <Route path="/super-admin/billing" component={SuperAdminBilling} />
        <Route path="/super-admin/users" component={SuperAdminUsers} />
        <Route path="/super-admin/analytics">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Analytics Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Advanced analytics and reporting features coming soon.
            </p>
          </div>
        </Route>
        <Route path="/super-admin/settings">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              System Settings
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              System configuration and platform settings coming soon.
            </p>
          </div>
        </Route>
        <Route>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The requested Super Admin page could not be found.
            </p>
          </div>
        </Route>
      </Switch>
    </SuperAdminLayout>
  );
}

export default function SuperAdminApp() {
  return (
    <SuperAdminProvider>
      <SuperAdminRouter />
    </SuperAdminProvider>
  );
}