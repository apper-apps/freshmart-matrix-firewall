import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "react-hot-toast";
import { productService } from "@/services/api/productService";
import ApperIcon from "@/components/ApperIcon";
import ReviewForm from "@/components/molecules/ReviewForm";
import ReviewList from "@/components/molecules/ReviewList";
import Loading from "@/components/ui/Loading";
import Error from "@/components/ui/Error";
import Cart from "@/components/pages/Cart";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import { addToCart } from "@/store/cartSlice";
import formatCurrency from "@/utils/currency";

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart, isLoading: cartLoading } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProduct();
  }, [productId]);
const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Enhanced error handling with retry logic
      const data = await productService.getById(parseInt(productId));
      
      if (!data) {
        throw new Error('Product not found');
      }
      
      setProduct(data);
    } catch (err) {
      console.error('Error loading product:', err);
      
      // Classify error type for better user experience
      let errorType = 'general';
      if (err.message.includes('not found')) {
        errorType = 'not-found';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorType = 'network';
      } else if (err.message.includes('timeout')) {
        errorType = 'timeout';
      }
      
      setError({ message: err.message, type: errorType });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    
    toast.success(`${quantity} x ${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };
const getPriceChange = () => {
    if (product?.previousPrice && product.previousPrice !== product.price) {
      const change = ((product.price - product.previousPrice) / product.previousPrice) * 100;
      return change;
    }
    return null;
  };

  const getActiveDeal = () => {
    if (!product?.dealType || !product?.dealValue) return null;
    
    if (product.dealType === 'BOGO') {
      return {
        type: 'BOGO',
        title: 'Buy 1 Get 1 FREE',
        description: 'Add 2 items to get one absolutely free!',
        icon: 'Gift',
        color: 'success',
        minQuantity: 2
      };
    } else if (product.dealType === 'Bundle') {
      const [buyQty, payQty] = product.dealValue.split('for').map(x => parseInt(x.trim()));
      return {
        type: 'Bundle',
        title: `${product.dealValue} Deal`,
        description: `Buy ${buyQty} items, pay for only ${payQty}!`,
        icon: 'Package',
        color: 'primary',
        minQuantity: buyQty,
        saveCount: buyQty - payQty
      };
    }
    
    return null;
  };

  const calculateDealSavings = (qty) => {
    const deal = getActiveDeal();
    if (!deal || qty < deal.minQuantity) return 0;
    
    if (deal.type === 'BOGO' && qty >= 2) {
      const freeItems = Math.floor(qty / 2);
      return freeItems * product.price;
    } else if (deal.type === 'Bundle' && qty >= deal.minQuantity) {
      const bundleSets = Math.floor(qty / deal.minQuantity);
      const freeItems = bundleSets * deal.saveCount;
      return freeItems * product.price;
    }
    
    return 0;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="default" />
      </div>
    );
  }

if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error 
          message={error.message || error}
          onRetry={loadProduct} 
          type={error.type || 'general'} 
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error 
          message="Product not found or could not be loaded" 
          onRetry={() => navigate('/category/All')} 
          type="not-found" 
        />
      </div>
    );
  }
const priceChange = getPriceChange();
  const activeDeal = getActiveDeal();

  // Calculate dynamic image dimensions with aspect ratio enforcement for 1:1 framing
  const calculateImageDimensions = () => {
    // Get viewport width for responsive sizing
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
// Base size calculation with responsive scaling
    let baseSize = 600;
    
    // Responsive adjustments for mobile-first design
    if (viewportWidth < 640) {
      // Mobile: 400-500px with padding consideration
      baseSize = Math.max(400, Math.min(viewportWidth - 32, 500)); 
    } else if (viewportWidth < 1024) {
      // Tablet: 500-700px for comfortable viewing
      baseSize = Math.max(500, Math.min(viewportWidth * 0.4, 700)); 
    } else {
      // Desktop: 600-1200px for detailed product viewing
      baseSize = Math.max(600, Math.min(viewportWidth * 0.3, 1200)); 
    }
    
    // Enforce platform constraints (400x400px to 1200x1200px) for consistent framing
    const constrainedSize = Math.max(400, Math.min(baseSize, 1200));
    
    // Ensure perfect 1:1 aspect ratio for consistent product display
    return {
      width: constrainedSize,
      height: constrainedSize,
      aspectRatio: '1 / 1'
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ApperIcon name="ArrowLeft" size={20} />
          <span>Back</span>
        </button>
      </nav>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image with Enhanced 1:1 Frame Display */}
        <div className="space-y-4">
          <div className="relative">
            <div
              className="mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative shadow-lg"
              style={{
                width: `${calculateImageDimensions().width}px`,
                height: `${calculateImageDimensions().height}px`,
                aspectRatio: calculateImageDimensions().aspectRatio
              }}
            >
{/* Enhanced Progressive Image Loading with Comprehensive Error Handling */}
              <EnhancedImageLoader 
                product={product}
                dimensions={calculateImageDimensions()}
                className="w-full h-full object-cover transition-all duration-500 hover:scale-105 image-loaded"
                style={{ 
                  backgroundColor: '#f3f4f6',
                  aspectRatio: '1 / 1'
                }}
/>
              <>
                {/* Frame Compatibility Indicator */}
                {/* Product image without watermark label */}
              </>
            </div>
          </div>
{product.stock <= 10 && product.stock > 0 && (
              <Badge 
                variant="warning" 
                className="absolute top-4 left-4"
              >
                Low Stock
              </Badge>
            )}
            
            {product.stock === 0 && (
              <Badge 
                variant="danger" 
                className="absolute top-4 left-4"
              >
                Out of Stock
              </Badge>
            )}
            
{priceChange && (
              <Badge 
                variant={priceChange > 0 ? 'danger' : 'sale'} 
                className="absolute top-4 right-4 text-sm font-bold shadow-lg"
              >
                {priceChange > 0 ? 'PRICE UP' : 'SALE'} {Math.abs(priceChange).toFixed(1)}% OFF
              </Badge>
            )}
            
{/* Auto-Generated Offer Badge */}
            {product.discountValue && product.discountValue > 0 && (
              <Badge 
                variant="promotional" 
                className="absolute top-4 left-4 text-sm font-bold"
              >
                {product.discountType === 'Percentage' 
                  ? `${product.discountValue}% OFF` 
                  : `${formatCurrency(product.discountValue)} OFF`
                }
              </Badge>
            )}
             {/* Special Deal Badge */}
            {/* Special Deal Badge */}
            {activeDeal && (
              <Badge 
                variant={activeDeal.color} 
                className="absolute bottom-4 left-4 text-sm font-bold animate-pulse shadow-lg"
              >
                <ApperIcon name={activeDeal.icon} size={14} className="mr-1" />
                {activeDeal.title}
              </Badge>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <Badge variant="primary" className="mb-3">
              {product.category}
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>
          </div>
{/* Pricing Hierarchy Display */}
          <div className="space-y-4">
            <PricingHierarchyDisplay 
              product={product} 
              quantity={quantity}
              onPriceUpdate={(effectivePrice) => {
                console.log('Effective price updated:', effectivePrice);
              }}
            />
            
            {/* Legacy Price Change Information */}
            {product.previousPrice && product.previousPrice !== product.price && (
              <div className="space-y-2">
<div className="flex items-center space-x-3">
                  <Badge variant="strikethrough" className="text-base px-3 py-1">
                    {formatCurrency(product.previousPrice)}
                  </Badge>
                  <Badge
                    variant={priceChange > 0 ? 'danger' : 'sale'} 
                    className="text-sm font-bold animate-pulse"
                  >
                    {priceChange > 0 ? 'PRICE UP!' : `SAVE ${Math.abs(priceChange).toFixed(1)}%`}
                  </Badge>
                </div>
<div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${priceChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {priceChange > 0 ? 'Price increased' : 'You save'} {formatCurrency(Math.abs(product.price - product.previousPrice))}
                  </span>
                </div>
              </div>
            )}

            {/* Enhanced Discount Section with Offer Dropdown */}
            <DiscountSection 
              product={product} 
              quantity={quantity} 
              onDiscountChange={(discount) => {
                // Handle discount selection logic
                console.log('Selected discount:', discount);
              }}
            />
            {/* Special Deal Information */}
            {activeDeal && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <ApperIcon name={activeDeal.icon} size={20} className="text-green-600" />
                  <h4 className="font-semibold text-green-800">{activeDeal.title}</h4>
                </div>
                <p className="text-sm text-green-700">{activeDeal.description}</p>
                
{quantity >= activeDeal.minQuantity && (
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">Your Deal Savings:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(calculateDealSavings(quantity))}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {activeDeal.type === 'BOGO' 
                        ? `You get ${Math.floor(quantity / 2)} free item${Math.floor(quantity / 2) > 1 ? 's' : ''}!`
                        : `You save on ${Math.floor(quantity / activeDeal.minQuantity) * activeDeal.saveCount} item${Math.floor(quantity / activeDeal.minQuantity) * activeDeal.saveCount > 1 ? 's' : ''}!`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Benefits & Quality */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <ApperIcon name="Star" size={20} className="text-green-600" />
              <span>Why Choose This Product</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Product Benefits */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="Leaf" size={16} className="text-green-600" />
                  <Badge variant="success">Farm Fresh</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Sourced directly from local farms, ensuring maximum freshness and nutritional value
                </p>
              </div>
              
              {/* Usage Suggestions */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="ChefHat" size={16} className="text-blue-600" />
                  <Badge variant="primary">Perfect for Biryani</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Ideal texture and aroma for traditional dishes, curries, and festive cooking
                </p>
              </div>
              
              {/* Quality Badge */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="Award" size={16} className="text-purple-600" />
                  <Badge variant="warning">Premium Quality</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Carefully selected and quality tested to meet the highest standards
                </p>
              </div>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center space-x-2">
            <ApperIcon name="Package" size={20} className="text-gray-500" />
            <span className="text-gray-700">
              {product.stock > 0 ? `${product.stock} items in stock` : 'Out of stock'}
            </span>
          </div>
          {/* Quantity Selector */}
          {product.stock > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ApperIcon name="Minus" size={16} />
                </button>
                
                <span className="text-xl font-semibold min-w-[3rem] text-center">
                  {quantity}
                </span>
                
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ApperIcon name="Plus" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {product.stock > 0 ? (
              <>
<Button
                variant="primary"
                size="large"
                icon="ShoppingCart"
                onClick={handleAddToCart}
                  loading={cartLoading}
                  className="w-full"
                >
                  Add to Cart - {formatCurrency(calculateEffectivePrice(product, quantity) - calculateDealSavings(quantity))}
                  {calculateDealSavings(quantity) > 0 && (
                    <span className="text-xs block text-green-600 font-normal">
                      Save {formatCurrency(calculateDealSavings(quantity))} with {activeDeal?.title}!
                    </span>
                  )}
                </Button>
                
                <Button
                  variant="secondary"
                  size="large"
                  icon="Zap"
                  onClick={handleBuyNow}
                  loading={cartLoading}
                  className="w-full"
                >
                  Buy Now
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="large"
                disabled
                className="w-full"
              >
                Out of Stock
              </Button>
            )}
</div>

          {/* Customer Reviews Section */}
          <div className="pt-8 border-t border-gray-200">
            <div className="mb-8">
              <ReviewList productId={parseInt(productId)} limit={3} />
            </div>
            
            <div className="mb-8">
              <ReviewForm 
                productId={parseInt(productId)} 
                customerId={1} // TODO: Get from auth context
                onReviewSubmitted={() => window.location.reload()} 
              />
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <ApperIcon name="Truck" size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Fast Delivery</p>
                <p className="text-sm text-gray-600">Same day delivery</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ApperIcon name="Shield" size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Quality Assured</p>
                <p className="text-sm text-gray-600">Fresh guarantee</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <ApperIcon name="CreditCard" size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Secure Payment</p>
                <p className="text-sm text-gray-600">Multiple options</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <ApperIcon name="RotateCcw" size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Easy Returns</p>
                <p className="text-sm text-gray-600">Hassle-free policy</p>
              </div>
            </div>
          </div>
</div>
      </div>
    </div>
  );
};

// Calculate effective price based on pricing hierarchy
const calculateEffectivePrice = (product, quantity = 1) => {
  if (!product) return 0;
  
  // Step 1: Start with base price
  let effectivePrice = product.basePrice || product.price;
  
  // Step 2: Apply variation override if exists (higher precedence than base)
  if (product.variationPrice && product.variationPrice > 0) {
    effectivePrice = product.variationPrice;
  }
  
  // Step 3: Apply seasonal discount (highest precedence)
  if (product.seasonalDiscount && product.seasonalDiscountActive) {
    if (product.seasonalDiscountType === 'Percentage') {
      effectivePrice = effectivePrice * (1 - product.seasonalDiscount / 100);
    } else {
      effectivePrice = Math.max(0, effectivePrice - product.seasonalDiscount);
    }
  }
  
  return effectivePrice * quantity;
};

// Pricing Hierarchy Display Component
const PricingHierarchyDisplay = ({ product, quantity, onPriceUpdate }) => {
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [seasonalDiscountApplied, setSeasonalDiscountApplied] = useState(false);

  // Calculate pricing at each tier
  const basePrice = product.basePrice || product.price;
  const variationPrice = selectedVariation?.price || product.variationPrice || null;
  const seasonalDiscount = product.seasonalDiscount || 0;
  const seasonalDiscountType = product.seasonalDiscountType || 'Fixed Amount';

  // Calculate effective price step by step
  let currentPrice = basePrice;
  if (variationPrice && variationPrice > 0) {
    currentPrice = variationPrice;
  }
  
  let finalPrice = currentPrice;
  if (seasonalDiscount > 0 && (product.seasonalDiscountActive || seasonalDiscountApplied)) {
    if (seasonalDiscountType === 'Percentage') {
      finalPrice = currentPrice * (1 - seasonalDiscount / 100);
    } else {
      finalPrice = Math.max(0, currentPrice - seasonalDiscount);
    }
  }

  // Available variations (simulated)
  const variations = [
    { id: 1, name: '1 kg Pack', price: basePrice, popular: true },
    { id: 2, name: '5 kg Pack', price: basePrice * 4.8, savings: basePrice * 0.2 },
    { id: 3, name: '10 kg Pack', price: basePrice * 9.5, savings: basePrice * 0.5, bulk: true }
  ];

  useEffect(() => {
    onPriceUpdate && onPriceUpdate(finalPrice);
  }, [finalPrice, onPriceUpdate]);

  return (
    <div className="space-y-4">
{/* Main Price Display */}
      <div className="flex items-center space-x-4">
        <span className="text-4xl font-bold gradient-text">
          {formatCurrency(finalPrice)}
        </span>
        <span className="text-lg text-gray-500">
          /{product.unit}
        </span>
        {finalPrice !== basePrice && (
          <Badge variant="sale" className="animate-pulse">
            {((basePrice - finalPrice) / basePrice * 100).toFixed(0)}% OFF
          </Badge>
        )}
      </div>

      {/* Pricing Hierarchy Breakdown */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
          <ApperIcon name="TrendingUp" size={18} className="text-blue-600" />
          <span>Pricing Breakdown</span>
        </h4>
        
        <div className="space-y-3">
          {/* Base Price */}
<div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-700">Base Price</span>
            </div>
            <span className="font-medium text-gray-900">{formatCurrency(basePrice)}</span>
          </div>
          {/* Variation Override */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${variationPrice ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-700">Variation Override</span>
              {variationPrice && (
                <Badge variant="primary" className="text-xs">Active</Badge>
              )}
</div>
            <span className="font-medium text-gray-900">
              {variationPrice ? formatCurrency(variationPrice) : 'None'}
            </span>
          </div>
          {/* Seasonal Discount */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${seasonalDiscount > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-700">Seasonal Discount</span>
              {seasonalDiscount > 0 && (
                <Badge variant="success" className="text-xs">Active</Badge>
              )}
</div>
            <span className="font-medium text-gray-900">
              {seasonalDiscount > 0 
                ? `${seasonalDiscountType === 'Percentage' ? `${seasonalDiscount}%` : `${formatCurrency(seasonalDiscount)}`} OFF`
                : 'None'
              }
            </span>
          </div>
          {/* Final Price */}
<div className="pt-2 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Final Price</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(finalPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Variation Selector */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center space-x-2">
          <ApperIcon name="Package" size={16} />
          <span>Choose Size</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {variations.map((variation) => (
            <button
              key={variation.id}
              onClick={() => setSelectedVariation(variation)}
              className={`p-3 rounded-lg border transition-all ${
                selectedVariation?.id === variation.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{variation.name}</span>
                  {variation.popular && (
                    <Badge variant="primary" className="text-xs">Popular</Badge>
                  )}
                  {variation.bulk && (
                    <Badge variant="warning" className="text-xs">Bulk</Badge>
)}
                </div>
                <div className="text-sm text-gray-600">{formatCurrency(variation.price)}</div>
                {variation.savings && (
                  <div className="text-xs text-green-600 font-medium">
                    Save {formatCurrency(variation.savings)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Seasonal Discount Toggle */}
      {seasonalDiscount > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ApperIcon name="Calendar" size={20} className="text-green-600" />
              <div>
                <h4 className="font-medium text-green-800">Seasonal Offer Available</h4>
                <p className="text-sm text-green-600">
{seasonalDiscountType === 'Percentage'
                    ? `${seasonalDiscount}% discount` 
                    : `${formatCurrency(seasonalDiscount)} off`
                  } on this product
                </p>
              </div>
            </div>
            <button
              onClick={() => setSeasonalDiscountApplied(!seasonalDiscountApplied)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                seasonalDiscountApplied
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-green-600 border border-green-600'
              }`}
            >
              {seasonalDiscountApplied ? 'Applied' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Discount Section Component with Offer Dropdown
const DiscountSection = ({ product, quantity, onDiscountChange }) => {
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [availableOffers, setAvailableOffers] = useState([]);
  const [showOfferDropdown, setShowOfferDropdown] = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);

  // Smart offer recommendations based on product and context
  const generateSmartOffers = () => {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isRamadan = now.getMonth() === 2 || now.getMonth() === 3; // Approximate
    const isEid = now.getMonth() === 4 && now.getDate() <= 15; // Approximate
    
    const baseOffers = [
      {
        id: 'percentage_10',
        type: 'percentage',
        value: 10,
        title: '10% OFF',
        description: 'Save 10% on this item',
        icon: 'Percent',
        color: 'sale',
        conditions: { minQuantity: 1 }
      },
      {
        id: 'percentage_15',
        type: 'percentage',
        value: 15,
        title: '15% OFF',
        description: 'Great savings on quality products',
        icon: 'Tag',
        color: 'promotional',
        conditions: { minQuantity: 2 }
      },
      {
        id: 'percentage_20',
        type: 'percentage',
        value: 20,
        title: '20% OFF',
        description: 'Maximum savings opportunity',
        icon: 'Gift',
        color: 'featured',
        conditions: { minQuantity: 3 }
      },
      {
        id: 'fixed_50',
        type: 'fixed',
        value: 50,
        title: 'Rs. 50 OFF',
        description: 'Instant discount of Rs. 50',
        icon: 'DollarSign',
        color: 'success',
        conditions: { minAmount: 500 }
      },
      {
        id: 'fixed_100',
        type: 'fixed',
        value: 100,
        title: 'Rs. 100 OFF',
        description: 'Big savings on your purchase',
        icon: 'Award',
        color: 'warning',
        conditions: { minAmount: 1000 }
      }
    ];

    // Category-specific offers
    const categoryOffers = {
      'Groceries': [
        {
          id: 'bulk_grocery',
          type: 'percentage',
          value: 12,
          title: 'Bulk Grocery Deal',
          description: '12% off on bulk grocery items',
          icon: 'ShoppingCart',
          color: 'info',
          conditions: { minQuantity: 5 }
        }
      ],
      'Fruits': [
        {
          id: 'fresh_fruit',
          type: 'percentage',
          value: 8,
          title: 'Fresh Fruit Special',
          description: 'Farm fresh discount',
          icon: 'Apple',
          color: 'success',
          conditions: { minQuantity: 2 }
        }
      ],
      'Vegetables': [
        {
          id: 'veggie_pack',
          type: 'percentage',
          value: 15,
          title: 'Veggie Pack Deal',
          description: 'Healthy choices, great prices',
          icon: 'Leaf',
          color: 'success',
          conditions: { minQuantity: 3 }
        }
      ]
    };

    // Seasonal offers
    const seasonalOffers = [];
    
    if (isRamadan) {
      seasonalOffers.push({
        id: 'ramadan_special',
        type: 'percentage',
        value: 25,
        title: 'Ramadan Special',
        description: 'Blessed month special discount',
        icon: 'Star',
        color: 'featured',
        seasonal: true,
        conditions: { minQuantity: 1 }
      });
    }

    if (isEid) {
      seasonalOffers.push({
        id: 'eid_celebration',
        type: 'percentage',
        value: 30,
        title: 'Eid Celebration',
        description: 'Celebrate with amazing savings',
        icon: 'Gift',
        color: 'promotional',
        seasonal: true,
        conditions: { minQuantity: 1 }
      });
    }

    if (isWeekend) {
      seasonalOffers.push({
        id: 'weekend_special',
        type: 'percentage',
        value: 18,
        title: 'Weekend Special',
        description: 'Weekend savings for families',
        icon: 'Calendar',
        color: 'warning',
        conditions: { minQuantity: 2 }
      });
    }

    // Combine all offers
    const allOffers = [
      ...baseOffers,
      ...(categoryOffers[product.category] || []),
      ...seasonalOffers
    ];

    // Filter offers based on current quantity and cart value
    const cartValue = product.price * quantity;
    return allOffers.filter(offer => {
      const { minQuantity = 1, minAmount = 0 } = offer.conditions;
      return quantity >= minQuantity && cartValue >= minAmount;
    });
  };

  // Calculate discount amount
  const calculateDiscount = (offer) => {
    if (!offer) return 0;
    
    const totalPrice = product.price * quantity;
    
    if (offer.type === 'percentage') {
      return (totalPrice * offer.value) / 100;
    } else if (offer.type === 'fixed') {
      return Math.min(offer.value, totalPrice);
    }
    
    return 0;
  };

  // Calculate final price after discount
  const calculateFinalPrice = (offer) => {
    const discount = calculateDiscount(offer);
    return (product.price * quantity) - discount;
  };

  // Initialize offers on component mount
  useEffect(() => {
    const offers = generateSmartOffers();
    setAvailableOffers(offers);
    
    // Auto-select best seasonal offer if available
    const seasonalOffer = offers.find(offer => offer.seasonal);
    if (seasonalOffer && !selectedOffer) {
      setSelectedOffer(seasonalOffer);
      onDiscountChange && onDiscountChange(seasonalOffer);
    }
  }, [product, quantity]);

  const handleOfferSelect = (offer) => {
    setSelectedOffer(offer);
    setShowOfferDropdown(false);
    onDiscountChange && onDiscountChange(offer);
    
    // Add to applied discounts if not already applied
    if (!appliedDiscounts.find(d => d.id === offer.id)) {
      setAppliedDiscounts(prev => [...prev, offer]);
    }
  };

  const removeOffer = (offerId) => {
    setAppliedDiscounts(prev => prev.filter(d => d.id !== offerId));
    if (selectedOffer?.id === offerId) {
      setSelectedOffer(null);
      onDiscountChange && onDiscountChange(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Offer Selection Dropdown */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ApperIcon name="Tag" size={20} className="text-orange-600" />
            <h4 className="font-medium text-gray-900">Available Offers</h4>
            {availableOffers.length > 0 && (
              <Badge variant="promotional" className="text-xs">
                {availableOffers.length} offers
              </Badge>
            )}
          </div>
          <button
            onClick={() => setShowOfferDropdown(!showOfferDropdown)}
            className="flex items-center space-x-1 text-sm text-orange-600 hover:text-orange-800 transition-colors"
          >
            <span>Browse Offers</span>
            <ApperIcon 
              name={showOfferDropdown ? "ChevronUp" : "ChevronDown"} 
              size={16} 
            />
          </button>
        </div>

        {/* Offer Dropdown */}
        {showOfferDropdown && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableOffers.map((offer) => (
              <div
                key={offer.id}
                onClick={() => handleOfferSelect(offer)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedOffer?.id === offer.id
? 'border-orange-500 bg-orange-100'
                    : 'border-gray-200 bg-white hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-orange-100">
                      <ApperIcon name={offer.icon} size={16} className="text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{offer.title}</span>
                        {offer.seasonal && (
                          <Badge variant="featured" className="text-xs">Limited Time</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{offer.description}</p>
                      <p className="text-xs text-gray-500">
                        Min quantity: {offer.conditions.minQuantity || 1}
                        {offer.conditions.minAmount && ` • Min amount: Rs. ${offer.conditions.minAmount}`}
                      </p>
                    </div>
</div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      Save {formatCurrency(calculateDiscount(offer))}
                    </div>
                    <div className="text-sm text-gray-500">
                      Final: {formatCurrency(calculateFinalPrice(offer))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {availableOffers.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <ApperIcon name="Tag" size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No offers available for current selection</p>
                <p className="text-sm">Try adding more items to unlock deals</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Offer Display */}
        {selectedOffer && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant={selectedOffer.color} className="text-sm font-bold">
                  {selectedOffer.title}
                </Badge>
                {selectedOffer.seasonal && (
                  <Badge variant="warning" className="text-xs animate-pulse">
                    Limited Time
                  </Badge>
                )}
              </div>
              <button
                onClick={() => removeOffer(selectedOffer.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <ApperIcon name="X" size={16} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
<div>
                <span className="text-xs text-gray-500">Original:</span>
                <span className="ml-2 line-through text-gray-500">
                  {formatCurrency(product.price * quantity)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500">Discount:</span>
                <span className="ml-2 font-medium text-red-600">
                  -{formatCurrency(calculateDiscount(selectedOffer))}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500">Final:</span>
                <span className="ml-2 font-bold text-green-600">
                  {formatCurrency(calculateFinalPrice(selectedOffer))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offer Stack Display */}
      {appliedDiscounts.length > 1 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 mb-3">
            <ApperIcon name="Layers" size={16} className="text-purple-600" />
            <span className="font-medium text-gray-900">Offer Stack</span>
            <Badge variant="featured" className="text-xs">Multiple Discounts</Badge>
          </div>
          <div className="space-y-2">
            {appliedDiscounts.map((discount, index) => (
              <div key={discount.id} className="flex items-center justify-between text-sm">
<span className="text-gray-700">{discount.title}</span>
                <span className="text-green-600 font-medium">
                  -{formatCurrency(calculateDiscount(discount))}
                </span>
                <button
                  onClick={() => removeOffer(discount.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <ApperIcon name="X" size={12} />
                </button>
              </div>
            ))}
            <div className="pt-2 border-t border-purple-200">
              <div className="flex items-center justify-between font-bold">
                <span className="text-gray-700">Total Savings:</span>
                <span className="text-green-600">
                  -{formatCurrency(appliedDiscounts.reduce((total, discount) => 
                    total + calculateDiscount(discount), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowOfferDropdown(!showOfferDropdown)}
          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 transition-colors"
        >
          <ApperIcon name="Search" size={12} className="inline mr-1" />
          Browse All Offers
        </button>
        
        {availableOffers.some(offer => offer.seasonal) && (
          <button
            onClick={() => {
              const seasonalOffer = availableOffers.find(offer => offer.seasonal);
              if (seasonalOffer) handleOfferSelect(seasonalOffer);
            }}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors animate-pulse"
          >
            <ApperIcon name="Star" size={12} className="inline mr-1" />
            Apply Seasonal Deal
          </button>
        )}
        
        {selectedOffer && (
          <button
            onClick={() => {
              setSelectedOffer(null);
              setAppliedDiscounts([]);
              onDiscountChange && onDiscountChange(null);
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            <ApperIcon name="RotateCcw" size={12} className="inline mr-1" />
            Clear Offers
          </button>
        )}
      </div>
</div>
  );
};

// Enhanced Image Loader Component with Comprehensive Error Handling
const EnhancedImageLoader = ({ product, dimensions, className, style }) => {
  const [imageState, setImageState] = useState({
    src: null,
    loading: true,
    error: false,
    retryCount: 0
  });

  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000]; // Exponential backoff

  const validateImageUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && parsedUrl.hostname.includes('unsplash');
    } catch {
      return false;
    }
  };

  const constructImageUrl = (baseUrl, width, height, quality = 80) => {
    try {
      if (!baseUrl || !validateImageUrl(baseUrl)) {
        throw new Error('Invalid base URL');
      }

      // Clean and validate URL construction
      const url = new URL(baseUrl);
      url.searchParams.set('w', width.toString());
      url.searchParams.set('h', height.toString());
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('auto', 'format');
      url.searchParams.set('q', quality.toString());
      url.searchParams.set('fm', 'webp');
      
      return url.toString();
    } catch (error) {
      console.error('Error constructing image URL:', error);
      return null;
    }
  };

  const generateFallbackUrl = (productName, width, height) => {
    const encodedName = encodeURIComponent(productName.substring(0, 20));
    return `https://via.placeholder.com/${width}x${height}/f3f4f6/64748b?text=${encodedName}`;
  };

  const handleImageError = useCallback(async (error, retryCount = 0) => {
    console.warn(`Image loading failed (attempt ${retryCount + 1}):`, error);

    if (retryCount < maxRetries) {
      // Implement exponential backoff retry
      const delay = retryDelays[retryCount] || 4000;
      
      setTimeout(() => {
        const retryUrl = constructImageUrl(
          product.imageUrl, 
          dimensions.width, 
          dimensions.height,
          60 // Lower quality for retry
        );

        if (retryUrl) {
          setImageState(prev => ({
            ...prev,
            src: retryUrl,
            retryCount: retryCount + 1,
            error: false
          }));
        } else {
          // Use fallback if URL construction fails
          setImageState(prev => ({
            ...prev,
            src: generateFallbackUrl(product.name, dimensions.width, dimensions.height),
            loading: false,
            error: true,
            retryCount: maxRetries
          }));
        }
      }, delay);
    } else {
      // Max retries reached, use fallback
      setImageState(prev => ({
        ...prev,
        src: generateFallbackUrl(product.name, dimensions.width, dimensions.height),
        loading: false,
        error: true
      }));
    }
  }, [product.imageUrl, product.name, dimensions, maxRetries]);

  const handleImageLoad = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      loading: false,
      error: false
    }));
  }, []);

  const handleImageErrorEvent = useCallback((e) => {
    e.preventDefault();
    handleImageError(new Error('Image load failed'), imageState.retryCount);
  }, [handleImageError, imageState.retryCount]);

  // Initialize image loading
  useEffect(() => {
    if (!product.imageUrl) {
      setImageState({
        src: generateFallbackUrl(product.name, dimensions.width, dimensions.height),
        loading: false,
        error: true,
        retryCount: maxRetries
      });
      return;
    }

    const primaryUrl = constructImageUrl(product.imageUrl, dimensions.width, dimensions.height);
    
    if (primaryUrl) {
      setImageState(prev => ({
        ...prev,
        src: primaryUrl,
        loading: true,
        error: false,
        retryCount: 0
      }));
    } else {
      // If URL construction fails, use fallback immediately
      setImageState({
        src: generateFallbackUrl(product.name, dimensions.width, dimensions.height),
        loading: false,
        error: true,
        retryCount: maxRetries
      });
    }
  }, [product.imageUrl, product.name, dimensions]);

  if (!imageState.src) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center`} style={style}>
        <ApperIcon name="Image" size={48} className="text-gray-400" />
      </div>
    );
  }

  return (
    <picture className="block w-full h-full">
      {!imageState.error && (
        <source
          srcSet={`${imageState.src} 1x, ${constructImageUrl(product.imageUrl, dimensions.width * 2, dimensions.height * 2) || imageState.src} 2x`}
          type="image/webp"
          onError={(e) => {
            console.warn('WebP source failed, falling back to regular image');
          }}
        />
      )}
      <img
        src={imageState.src}
        alt={product.name}
        className={className}
        style={style}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageErrorEvent}
      />
      {imageState.loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <ApperIcon name="Loader" size={24} className="text-gray-400 animate-spin" />
        </div>
      )}
      {imageState.error && imageState.retryCount > 0 && imageState.retryCount < maxRetries && (
        <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
          Retrying... ({imageState.retryCount}/{maxRetries})
        </div>
      )}
    </picture>
);
};

export default ProductDetail;