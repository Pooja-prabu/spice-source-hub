import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import VendorDashboard from './VendorDashboard';
import SupplierDashboard from './SupplierDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';

const Dashboard = () => {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse-warm text-primary text-lg">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Setup Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please contact support to set up your profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (profile.role === 'vendor') {
    return <VendorDashboard />;
  } else if (profile.role === 'supplier') {
    return <SupplierDashboard />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unknown Role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your account role is not recognized. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;