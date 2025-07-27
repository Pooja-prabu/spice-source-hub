import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Users, TrendingUp, Star, Plus, Package } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Cart from '@/components/Cart';
import GroupOrderModal from '@/components/GroupOrderModal';

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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isGroupOrderModalOpen, setIsGroupOrderModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [orderSummary, setOrderSummary] = useState<string>('');
  const [showOrderSummary, setShowOrderSummary] = useState(false);

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

  const addToCart = async (materialId: string, quantity: number = 1) => {
    if (!user) return;

    try {
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart_items' as any)
        .select('*')
        .eq('vendor_id', user.id)
        .eq('material_id', materialId)
        .maybeSingle();

      if (existingItem && (existingItem as any).quantity) {
        // Update quantity if item exists
        const { error } = await supabase
          .from('cart_items' as any)
          .update({ quantity: (existingItem as any).quantity + quantity })
          .eq('id', (existingItem as any).id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from('cart_items' as any)
          .insert({
            vendor_id: user.id,
            material_id: materialId,
            quantity
          });

        if (error) throw error;
      }

      const material = materials.find(m => m.id === materialId);
      toast({
        title: "Added to cart!",
        description: `${quantity} ${material?.unit} of ${material?.name} added to cart`
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add to cart"
      });
    }
  };

  const placeIndividualOrder = async (materialId: string, quantity: number) => {
    if (!user || !profile) return;

    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) return;

      // Show order summary first
      const summary = `Order Summary:
Material: ${material.name}
Quantity: ${quantity} ${material.unit}
Price per unit: ₹${material.price}
Total: ₹${material.price * quantity}
Supplier: ${material.supplier_id}`;

      setOrderSummary(summary);
      setShowOrderSummary(true);

      // After user confirms, place the order
      const confirmOrder = async () => {
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

        // Log the order summary
        await supabase
          .from('order_summary_logs' as any)
          .insert({
            vendor_id: user.id,
            order_id: '', // We could get this from the insert response
            summary
          });

        toast({
          title: "Order placed!",
          description: `Successfully ordered ${quantity} ${material.unit} of ${material.name}`
        });
        setShowOrderSummary(false);
      };

      return confirmOrder;
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to place order"
      });
    }
  };

  const confirmIndividualOrder = async () => {
    const confirmOrder = await placeIndividualOrder(selectedMaterial?.id || '', 1);
    if (confirmOrder) {
      await confirmOrder();
    }
  };

  const joinGroupOrder = async (groupOrderId: string, quantity: number = 1) => {
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

      // Add to group_order_participants table
      const { error: participantError } = await supabase
        .from('group_order_participants' as any)
        .insert({
          group_order_id: groupOrderId,
          vendor_id: user.id,
          quantity
        });

      if (participantError) throw participantError;

      // Update group order totals
      const { error: updateError } = await supabase
        .from('group_orders')
        .update({
          participants: [...groupOrder.participants, user.id],
          total_quantity: groupOrder.total_quantity + quantity
        })
        .eq('id', groupOrderId);

      if (updateError) throw updateError;

      toast({
        title: "Joined group order!",
        description: `You have joined with ${quantity} ${groupOrder.materials.unit}`
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

  const openGroupOrderModal = (material: Material) => {
    setSelectedMaterial(material);
    setIsGroupOrderModalOpen(true);
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name}!</h2>
            <p className="text-muted-foreground">Manage your orders and discover new suppliers</p>
          </div>
          <Button 
            onClick={() => setIsCartOpen(true)}
            variant="warm"
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            View Cart
          </Button>
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
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => addToCart(material.id, 1)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add to Cart
                          </Button>
                          <Button 
                            onClick={() => {
                              setSelectedMaterial(material);
                              placeIndividualOrder(material.id, 1);
                            }}
                            variant="warm"
                            className="flex-1"
                          >
                            Quick Order
                          </Button>
                        </div>
                        <Button 
                          onClick={() => openGroupOrderModal(material)}
                          variant="success"
                          className="w-full"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Start Group Order
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

        {/* Cart Modal */}
        <Cart 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)}
          onRefresh={() => {
            fetchMaterials();
            fetchGroupOrders();
          }}
        />

        {/* Group Order Modal */}
        <GroupOrderModal
          isOpen={isGroupOrderModalOpen}
          onClose={() => setIsGroupOrderModalOpen(false)}
          material={selectedMaterial}
          onSuccess={() => {
            fetchGroupOrders();
            setIsGroupOrderModalOpen(false);
          }}
        />

        {/* Order Summary Dialog */}
        <Dialog open={showOrderSummary} onOpenChange={setShowOrderSummary}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Order Summary</DialogTitle>
              <DialogDescription>
                Please review your order before confirming
              </DialogDescription>
            </DialogHeader>
            <div className="whitespace-pre-wrap text-sm bg-secondary/50 p-4 rounded">
              {orderSummary}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOrderSummary(false)}>
                Cancel
              </Button>
              <Button onClick={confirmIndividualOrder} variant="warm">
                Confirm Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VendorDashboard;