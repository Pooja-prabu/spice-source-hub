import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Calendar, Target } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  supplier_id: string;
}

interface GroupOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  onSuccess?: () => void;
}

const GroupOrderModal: React.FC<GroupOrderModalProps> = ({ 
  isOpen, 
  onClose, 
  material, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    minQuantity: 100,
    discountedPrice: material?.price ? material.price * 0.9 : 0,
    expiryDays: 7,
    description: ''
  });

  const createGroupOrder = async () => {
    if (!user || !material) return;

    setLoading(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + formData.expiryDays);

      const { error } = await supabase
        .from('group_orders')
        .insert({
          material_id: material.id,
          min_quantity: formData.minQuantity,
          current_price: formData.discountedPrice,
          expires_at: expiryDate.toISOString(),
          participants: [user.id],
          total_quantity: 1
        });

      if (error) throw error;

      toast({
        title: "Group order created!",
        description: "Your group order is now live and accepting participants"
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating group order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create group order"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update discounted price when material changes
  React.useEffect(() => {
    if (material) {
      setFormData(prev => ({
        ...prev,
        discountedPrice: material.price * 0.9
      }));
    }
  }, [material]);

  if (!material) return null;

  const discountPercentage = Math.round(((material.price - formData.discountedPrice) / material.price) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Group Order
          </DialogTitle>
          <DialogDescription>
            Start a group order for {material.name} to get bulk discounts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-medium mb-2">{material.name}</h4>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Regular Price:</span>
              <Badge variant="outline">₹{material.price}/{material.unit}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minQuantity" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Minimum Quantity
            </Label>
            <Input
              id="minQuantity"
              type="number"
              value={formData.minQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, minQuantity: Number(e.target.value) }))}
              min="10"
              step="10"
            />
            <p className="text-xs text-muted-foreground">
              Minimum total quantity needed to activate the group order
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountedPrice">Discounted Price per {material.unit}</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="discountedPrice"
                type="number"
                value={formData.discountedPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, discountedPrice: Number(e.target.value) }))}
                min="0"
                step="0.01"
              />
              <Badge variant={discountPercentage > 0 ? "success" : "secondary"}>
                {discountPercentage}% off
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDays" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Expires in (days)
            </Label>
            <Input
              id="expiryDays"
              type="number"
              value={formData.expiryDays}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryDays: Number(e.target.value) }))}
              min="1"
              max="30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this group order..."
              rows={3}
            />
          </div>

          <div className="bg-secondary/50 p-3 rounded-lg text-sm">
            <div className="flex justify-between mb-1">
              <span>You'll save:</span>
              <span className="font-medium text-green-600">
                ₹{(material.price - formData.discountedPrice).toFixed(2)} per {material.unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Expires:</span>
              <span className="font-medium">
                {new Date(Date.now() + formData.expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={createGroupOrder} 
            disabled={loading}
            variant="warm"
          >
            {loading ? 'Creating...' : 'Create Group Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupOrderModal;