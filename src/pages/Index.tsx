import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Package, TrendingUp, Users, Star, CheckCircle } from 'lucide-react';
import spiceHero from '@/assets/spice-hero.jpg';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0">
          <img 
            src={spiceHero} 
            alt="Indian spices background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Spice Source Hub
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Connecting Indian street food vendors with quality suppliers through 
              smart sourcing, group orders, and market insights
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="hero"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-4"
              >
                Get Started Today
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/analytics')}
                className="text-lg px-8 py-4"
              >
                View Market Analytics
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need for smarter sourcing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From individual orders to group buying, we've got your supply chain covered
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-warm transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Smart Ordering</CardTitle>
                <CardDescription>
                  Browse materials, compare prices, and place orders with trusted suppliers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-warm transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-warm rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Group Orders</CardTitle>
                <CardDescription>
                  Join bulk orders with other vendors to get better prices and save money
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-warm transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-success rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Price Analytics</CardTitle>
                <CardDescription>
                  Track price trends and volatility to make informed purchasing decisions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-warm transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Supplier Management</CardTitle>
                <CardDescription>
                  For suppliers: manage inventory, fulfill orders, and grow your business
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-warm transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-warm rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Quality Ratings</CardTitle>
                <CardDescription>
                  Rate suppliers and make decisions based on community feedback
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-warm transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-success rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Reliable Supply</CardTitle>
                <CardDescription>
                  Never run out of ingredients with our network of verified suppliers
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to transform your supply chain?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of vendors and suppliers already using Spice Source Hub
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="hero"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-4"
            >
              Start Your Free Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Spice Source Hub
            </h3>
            <p className="text-muted-foreground">
              Empowering street food vendors across India
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2024 Spice Source Hub. Built with ❤️ for the street food community.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
