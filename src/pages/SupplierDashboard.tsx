import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { Package, ShoppingBag, Star, Plus } from 'lucide-react';
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

interface Order {
  id: string;
  vendor_id: string;
  material_id: string;
  quantity: number;
  status: string;
  type: string;
  total_price: number;
  created_at: string;
  materials: Material;
}

const SupplierDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  
  // Form state for new material
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    unit: 'kg'
  });

  useEffect(() => {
    if (user) {
      fetchMaterials();
      fetchOrders();
    }
  }, [user]);

  const fetchMaterials = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('supplier_id', user.id);

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

  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          materials (*)
        `)
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMaterial = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('materials')
        .insert({
          ...newMaterial,
          supplier_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Material added!",
        description: "Your new material has been added to the catalog"
      });

      setNewMaterial({
        name: '',
        description: '',
        price: 0,
        stock: 0,
        unit: 'kg'
      });
      setIsAddingMaterial(false);
      fetchMaterials();
    } catch (error) {
      console.error('Error adding material:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add material"
      });
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order updated!",
        description: `Order status changed to ${status}`
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'success';
      case 'delivered': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

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
          <h2 className="text-3xl font-bold mb-2">Supplier Dashboard</h2>
          <p className="text-muted-foreground">Manage your materials and fulfill orders</p>
        </div>

        <Tabs defaultValue="materials" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              My Materials
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="ratings" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Ratings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Your Materials</h3>
                <Dialog open={isAddingMaterial} onOpenChange={setIsAddingMaterial}>
                  <DialogTrigger asChild>
                    <Button variant="warm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Material
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Material</DialogTitle>
                      <DialogDescription>
                        Add a new material to your catalog
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Material Name</Label>
                        <Input
                          id="name"
                          value={newMaterial.name}
                          onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                          placeholder="e.g., Basmati Rice"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newMaterial.description}
                          onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                          placeholder="Brief description of the material"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">Price per unit</Label>
                          <Input
                            id="price"
                            type="number"
                            value={newMaterial.price}
                            onChange={(e) => setNewMaterial({...newMaterial, price: Number(e.target.value)})}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unit">Unit</Label>
                          <Select 
                            value={newMaterial.unit} 
                            onValueChange={(value) => setNewMaterial({...newMaterial, unit: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">Kilogram (kg)</SelectItem>
                              <SelectItem value="g">Gram (g)</SelectItem>
                              <SelectItem value="l">Liter (l)</SelectItem>
                              <SelectItem value="ml">Milliliter (ml)</SelectItem>
                              <SelectItem value="piece">Piece</SelectItem>
                              <SelectItem value="dozen">Dozen</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stock">Stock Quantity</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={newMaterial.stock}
                          onChange={(e) => setNewMaterial({...newMaterial, stock: Number(e.target.value)})}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingMaterial(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addMaterial} variant="warm">
                        Add Material
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((material) => (
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
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Stock:</span>
                          <span className="font-medium">{material.stock} {material.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <Badge variant={material.stock > 0 ? "success" : "destructive"}>
                            {material.stock > 0 ? "In Stock" : "Out of Stock"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {materials.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Materials Yet</h3>
                  <p className="text-muted-foreground mb-4">Start by adding your first material to the catalog</p>
                  <Button variant="warm" onClick={() => setIsAddingMaterial(true)}>
                    Add Your First Material
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Incoming Orders</h3>
              
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-soft transition-all duration-200">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{order.materials.name}</CardTitle>
                          <CardDescription>
                            Order from vendor
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span>Quantity:</span>
                            <span className="font-medium">{order.quantity} {order.materials.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-medium">₹{order.total_price}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="font-medium capitalize">{order.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Date:</span>
                            <span className="font-medium">
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="success"
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            >
                              Accept Order
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                        
                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            variant="warm"
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                          >
                            Mark as Delivered
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                  <p className="text-muted-foreground">Orders from vendors will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Customer Ratings & Reviews
                </CardTitle>
                <CardDescription>
                  See what vendors think about your service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Ratings Yet</h3>
                  <p className="text-muted-foreground">
                    Complete some orders to start receiving ratings from vendors
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

export default SupplierDashboard;