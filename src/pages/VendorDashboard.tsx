import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Users, TrendingUp, Star } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface Material {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  unit: string;
  supplier_id: string;
}

interface GroupOrder {
  id: string;
  material_id: string;
  total_quantity: number;
  current_price: number;
  min_quantity: number;
  participants: string[];
  expires_at: string;
  status: string;
  materials: Material;
}

const VendorDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [groupOrders, setGroupOrders] = useState<GroupOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
    fetchGroupOrders();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .gt('stock', 0);

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch materials"
      });
    }
  };

  const fetchGroupOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('group_orders')
        .select(`
          *,
          materials (*)
        `)
        .eq('status', 'open')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      setGroupOrders(data || []);
    } catch (error) {
      console.error('Error fetching group orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const placeIndividualOrder = async (materialId: string, quantity: number) => {
    if (!user || !profile) return;

    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) return;

      const { error } = await supabase
        .from('orders')
        .insert({
          vendor_id: user.id,
          supplier_id: material.supplier_id,
          material_id: materialId,
          quantity,
          total_price: material.price * quantity,
          type: 'individual'
        });

      if (error) throw error;

      toast({
        title: "Order placed!",
        description: `Successfully ordered ${quantity} ${material.unit} of ${material.name}`
      });
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to place order"
      });
    }
  };

  const joinGroupOrder = async (groupOrderId: string) => {
    if (!user) return;

    try {
      const groupOrder = groupOrders.find(go => go.id === groupOrderId);
      if (!groupOrder) return;

      // Check if user is already a participant
      if (groupOrder.participants.includes(user.id)) {
        toast({
          variant: "destructive",
          title: "Already joined",
          description: "You are already part of this group order"
        });
        return;
      }

      const { error } = await supabase
        .from('group_orders')
        .update({
          participants: [...groupOrder.participants, user.id],
          total_quantity: groupOrder.total_quantity + 1
        })
        .eq('id', groupOrderId);

      if (error) throw error;

      toast({
        title: "Joined group order!",
        description: "You have successfully joined the group order"
      });

      fetchGroupOrders();
    } catch (error) {
      console.error('Error joining group order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join group order"
      });
    }
  };

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse-warm text-primary text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name}!</h2>
          <p className="text-muted-foreground">Manage your orders and discover new suppliers</p>
        </div>

        <Tabs defaultValue="materials" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Browse Materials
            </TabsTrigger>
            <TabsTrigger value="group-orders" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group Orders
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Price Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <div className="space-y-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials.map((material) => (
                  <Card key={material.id} className="hover:shadow-warm transition-all duration-200">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-start">
                        <span>{material.name}</span>
                        <Badge variant="secondary">
                          ₹{material.price}/{material.unit}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{material.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>Stock:</span>
                          <span className="font-medium">{material.stock} {material.unit}</span>
                        </div>
                        <Button 
                          onClick={() => placeIndividualOrder(material.id, 1)}
                          className="w-full"
                          variant="warm"
                        >
                          Order 1 {material.unit}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="group-orders">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupOrders.map((groupOrder) => (
                  <Card key={groupOrder.id} className="hover:shadow-warm transition-all duration-200">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-start">
                        <span>{groupOrder.materials.name}</span>
                        <Badge variant="secondary">
                          ₹{groupOrder.current_price}/{groupOrder.materials.unit}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Group order - save money by buying together!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>Progress:</span>
                          <span className="font-medium">
                            {groupOrder.total_quantity}/{groupOrder.min_quantity} {groupOrder.materials.unit}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((groupOrder.total_quantity / groupOrder.min_quantity) * 100, 100)}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Participants:</span>
                          <span className="font-medium">{groupOrder.participants.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Expires:</span>
                          <span className="font-medium">
                            {new Date(groupOrder.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Button 
                          onClick={() => joinGroupOrder(groupOrder.id)}
                          className="w-full"
                          variant="success"
                          disabled={groupOrder.participants.includes(user?.id || '')}
                        >
                          {groupOrder.participants.includes(user?.id || '') ? 'Already Joined' : 'Join Group Order'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {groupOrders.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Group Orders</h3>
                  <p className="text-muted-foreground">Check back later for group buying opportunities!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Price Trends & Insights
                </CardTitle>
                <CardDescription>
                  Historical price data and market insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Price Trends Coming Soon</h3>
                  <p className="text-muted-foreground">
                    We're working on comprehensive price analytics to help you make better purchasing decisions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorDashboard;