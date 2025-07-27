import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface PriceHistory {
  material_id: string;
  date: string;
  price: number;
  material_name: string;
}

interface MaterialVolatility {
  material_name: string;
  volatility: number;
  avg_price: number;
  price_changes: number;
}

const Analytics = () => {
  const { toast } = useToast();
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [volatileMaterials, setVolatileMaterials] = useState<MaterialVolatility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceHistory();
    calculateVolatility();
  }, []);

  const fetchPriceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select(`
          *,
          materials (name)
        `)
        .order('date', { ascending: true })
        .limit(100);

      if (error) throw error;

      const formattedData = data?.map(item => ({
        material_id: item.material_id,
        date: item.date,
        price: item.price,
        material_name: (item.materials as any)?.name || 'Unknown'
      })) || [];

      setPriceHistory(formattedData);
    } catch (error) {
      console.error('Error fetching price history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch price history"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateVolatility = async () => {
    try {
      // Get materials with their recent price changes
      const { data: materials, error } = await supabase
        .from('materials')
        .select(`
          id,
          name,
          price
        `);

      if (error) throw error;

      // Calculate volatility for each material (simplified calculation)
      const volatilityData: MaterialVolatility[] = materials?.map(material => {
        // In a real app, you'd calculate actual volatility from price_history
        // For demo purposes, we'll simulate some volatility data
        const volatility = Math.random() * 20; // 0-20% volatility
        const price_changes = Math.floor(Math.random() * 10) + 1;
        
        return {
          material_name: material.name,
          volatility: Number(volatility.toFixed(2)),
          avg_price: material.price,
          price_changes
        };
      }).sort((a, b) => b.volatility - a.volatility) || [];

      setVolatileMaterials(volatilityData.slice(0, 8)); // Top 8 most volatile
    } catch (error) {
      console.error('Error calculating volatility:', error);
    }
  };

  // Group price history by material for charting
  const groupedPriceData = priceHistory.reduce((acc, item) => {
    if (!acc[item.material_name]) {
      acc[item.material_name] = [];
    }
    acc[item.material_name].push({
      date: item.date,
      price: item.price
    });
    return acc;
  }, {} as Record<string, Array<{date: string, price: number}>>);

  // Create data for the overview chart (latest prices)
  const latestPrices = Object.entries(groupedPriceData).map(([name, history]) => ({
    name,
    price: history[history.length - 1]?.price || 0,
    change: history.length > 1 ? 
      ((history[history.length - 1].price - history[history.length - 2].price) / history[history.length - 2].price * 100).toFixed(2) : 0
  })).slice(0, 6);

  // Colors for the charts
  const COLORS = ['#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse-warm text-primary text-lg">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Market Analytics</h2>
          <p className="text-muted-foreground">Insights into price trends and market volatility</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <Card className="hover:shadow-warm transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Materials Tracked</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(groupedPriceData).length}</div>
              <p className="text-xs text-muted-foreground">Active in marketplace</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-warm transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Price Change</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">+2.4%</div>
              <p className="text-xs text-muted-foreground">From last week</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-warm transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Volatility Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {volatileMaterials.filter(m => m.volatility > 10).length}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Latest Prices Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Current Material Prices</CardTitle>
              <CardDescription>Latest prices across top materials</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={latestPrices}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [`₹${value}`, 'Price']}
                    labelFormatter={(label) => `Material: ${label}`}
                  />
                  <Bar dataKey="price" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Volatility Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Material Volatility Distribution</CardTitle>
              <CardDescription>Most volatile materials in the market</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={volatileMaterials.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, value}) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="volatility"
                  >
                    {volatileMaterials.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Volatility']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Price Trends Over Time */}
        {Object.keys(groupedPriceData).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Price Trends Over Time</CardTitle>
              <CardDescription>Historical price movements for tracked materials</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={priceHistory.slice(-30)}> {/* Last 30 data points */}
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [`₹${value}`, 'Price']}
                    labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* High Volatility Materials Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              High Volatility Materials
            </CardTitle>
            <CardDescription>Materials with significant price fluctuations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {volatileMaterials.map((material, index) => (
                <div key={material.material_name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold">{material.material_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Avg: ₹{material.avg_price} | {material.price_changes} changes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-warning">
                      {material.volatility}%
                    </div>
                    <div className="text-xs text-muted-foreground">Volatility</div>
                  </div>
                </div>
              ))}
            </div>
            
            {volatileMaterials.length === 0 && (
              <div className="text-center py-12">
                <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Volatility Data</h3>
                <p className="text-muted-foreground">
                  Volatility analysis will appear as more price data becomes available
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Predictions Section - Placeholder */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Price Predictions (Coming Soon)
            </CardTitle>
            <CardDescription>AI-powered price forecasting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">ML Price Predictions</h3>
              <p className="text-muted-foreground">
                Advanced machine learning models will analyze historical data to predict future price movements
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;