import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';

interface CartItem {
  id: string;
  material_id: string;
  quantity: number;
  created_at: string;
  materials: {
    id: string;
    name: string;
    price: number;
    unit: string;
    supplier_id: string;
    stock: number;
  };
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, onRefresh }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchCartItems();
    }
  }, [isOpen, user]);

  const fetchCartItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items' as any)
        .select(`
          *,
          materials (
            id,
            name,
            price,
            unit,
            supplier_id,
            stock
          )
        `)
        .eq('vendor_id', user.id);

      if (error) throw error;
      setCartItems((data as any) || []);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch cart items"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items' as any)
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;

      setCartItems(prev => 
        prev.map(item => 
          item.id === cartItemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update quantity"
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items' as any)
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      setCartItems(prev => prev.filter(item => item.id !== cartItemId));
      
      toast({
        title: "Item removed",
        description: "Item removed from cart"
      });
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove item"
      });
    }
  };

  const checkout = async () => {
    if (!user || cartItems.length === 0) return;

    setCheckingOut(true);
    try {
      // Group cart items by supplier
      const ordersBySupplier: { [supplierId: string]: CartItem[] } = {};
      cartItems.forEach(item => {
        const supplierId = item.materials.supplier_id;
        if (!ordersBySupplier[supplierId]) {
          ordersBySupplier[supplierId] = [];
        }
        ordersBySupplier[supplierId].push(item);
      });

      // Create orders for each supplier
      const orderPromises = Object.entries(ordersBySupplier).map(async ([supplierId, items]) => {
        const orders = items.map(item => ({
          vendor_id: user.id,
          supplier_id: supplierId,
          material_id: item.material_id,
          quantity: item.quantity,
          total_price: item.materials.price * item.quantity,
          type: 'individual'
        }));

        return supabase.from('orders').insert(orders);
      });

      // Execute all order insertions
      const results = await Promise.all(orderPromises);
      
      // Check for errors
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Some orders failed to process');
      }

      // Create order summary
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.materials.price * item.quantity), 0);
      const totalItems = cartItems.length;
      const summary = `Checkout completed: ${totalItems} items, Total: ₹${totalAmount}`;

      await supabase
        .from('order_summary_logs' as any)
        .insert({
          vendor_id: user.id,
          order_id: (results[0]?.data as any)?.[0]?.id || '',
          summary
        });

      // Clear cart
      await supabase
        .from('cart_items' as any)
        .delete()
        .eq('vendor_id', user.id);

      setCartItems([]);
      toast({
        title: "Checkout successful!",
        description: `${totalItems} orders placed successfully`
      });

      onClose();
      onRefresh?.();
    } catch (error) {
      console.error('Error during checkout:', error);
      toast({
        variant: "destructive",
        title: "Checkout failed",
        description: "Failed to process checkout. Please try again."
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.materials.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart ({cartItems.length} items)
          </DialogTitle>
          <DialogDescription>
            Review your items before checkout
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse-warm text-primary">Loading cart...</div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground">Add some materials to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.materials.name}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="secondary">
                          ₹{item.materials.price}/{item.materials.unit}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.materials.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ₹{item.materials.price * item.quantity}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Total Items: {totalItems}</div>
                    <div className="text-sm text-muted-foreground">
                      {cartItems.length} different materials
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">₹{totalAmount}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Continue Shopping
          </Button>
          {cartItems.length > 0 && (
            <Button 
              onClick={checkout} 
              disabled={checkingOut}
              variant="warm"
            >
              {checkingOut ? 'Processing...' : `Checkout (₹${totalAmount})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Cart;