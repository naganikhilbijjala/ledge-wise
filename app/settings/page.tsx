import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/app-layout";
import { Settings, Database, User, Bell } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your LedgeWise preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Business Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Configure your business details
            </p>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Business Name</span>
                <span className="font-medium">Turmeric Trading Co.</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Financial Year</span>
                <span className="font-medium">April - March</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Currency</span>
                <span className="font-medium">INR (₹)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Database className="h-5 w-5 text-amber-600" />
              </div>
              <CardTitle className="text-lg">Data Management</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Backup and restore your data
            </p>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-900">Export Data</span>
                <p className="text-xs text-gray-500 mt-1">
                  Download all transactions as CSV
                </p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-900">Backup Database</span>
                <p className="text-xs text-gray-500 mt-1">
                  Create a full backup of your data
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-lg">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Configure alerts and reminders
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Loan Due Reminders</span>
                <span className="text-green-600 text-sm font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Low Stock Alerts</span>
                <span className="text-green-600 text-sm font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Daily Summary</span>
                <span className="text-gray-400 text-sm font-medium">Disabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-lg">App Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              General application preferences
            </p>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Default Ledger</span>
                <span className="font-medium">Parallel</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Date Format</span>
                <span className="font-medium">DD/MM/YYYY</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Version</span>
                <span className="font-medium text-gray-400">v0.2.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AppLayout>
  );
}
