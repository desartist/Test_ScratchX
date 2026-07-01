'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Trash2,
  ChevronRight,
  AlertCircle,
  DollarSign,
  Zap,
  Package,
  CheckCircle,
} from 'lucide-react';
import styles from './marketplace.module.css';

export default function MarketplacePage() {
  const [plans, setPlans] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchPlansAndBalance();
  }, []);

  const fetchPlansAndBalance = async () => {
    try {
      setLoading(true);

      // Fetch available plans
      const plansRes = await fetch('/api/plans', {
        credentials: 'include',
      });
      const plansJson = await plansRes.json();

      // Fetch current balance
      const balanceRes = await fetch('/api/distributor/transactions?endpoint=balance', {
        credentials: 'include',
      });
      const balanceJson = await balanceRes.json();

      if (!plansJson.success) throw new Error(plansJson.error || 'Failed to load plans');

      // Format plans for marketplace
      const corePlan = {
        _id: 'plan-core',
        planType: 'CORE',
        planName: 'ScratchX Core',
        description: 'Basic plan with essential features',
        features: [
          'Up to 100 campaigns',
          '5,000 scratches per campaign',
          'Basic analytics',
          'Email support',
        ],
        unitMRP: 2477,
        icon: 'Package',
      };

      const smartPlan = {
        _id: 'plan-smart',
        planType: 'SMART',
        planName: 'ScratchX Smart',
        description: 'Advanced plan with premium features',
        features: [
          'Unlimited campaigns',
          '50,000 scratches per campaign',
          'Advanced analytics',
          'Priority support',
          'Custom branding',
        ],
        unitMRP: 3539,
        icon: 'Zap',
      };

      setPlans([corePlan, smartPlan]);
      setBalance(balanceJson.data?.balance || 0);
      setError(null);
    } catch (err) {
      console.error('[Marketplace] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (plan, quantity) => {
    if (quantity <= 0) return;

    const existingItem = cart.find((item) => item.planType === plan.planType);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.planType === plan.planType
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...plan,
          quantity,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (planType, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(planType);
      return;
    }

    setCart(
      cart.map((item) =>
        item.planType === planType ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (planType) => {
    setCart(cart.filter((item) => item.planType !== planType));
  };

  const calculatePricing = () => {
    let subtotalMRP = 0;
    let totalDiscount = 0;
    const commissionPercentage = 20; // Default 20% commission

    const items = cart.map((item) => {
      const itemMRP = item.unitMRP * item.quantity;
      const discount = itemMRP * (commissionPercentage / 100);
      const costPrice = itemMRP - discount;

      subtotalMRP += itemMRP;
      totalDiscount += discount;

      return {
        ...item,
        itemMRP,
        discount,
        costPrice,
        unitCostPrice: item.unitMRP - item.unitMRP * (commissionPercentage / 100),
        commissionPercentage,
      };
    });

    const subtotal = subtotalMRP - totalDiscount;
    const gst = subtotal * 0.18;
    const grandTotal = subtotal + gst;

    return {
      items,
      subtotalMRP,
      totalDiscount,
      subtotal,
      gst,
      grandTotal,
      commissionPercentage,
    };
  };

  const pricing = calculatePricing();

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    if (pricing.grandTotal > balance) {
      alert('Insufficient balance. Please add funds to your account.');
      return;
    }

    try {
      setProcessingPayment(true);

      const orderPayload = {
        items: pricing.items.map((item) => ({
          planType: item.planType,
          planName: item.planName,
          quantity: item.quantity,
          unitMRP: item.unitMRP,
        })),
      };

      const res = await fetch('/api/distributor/orders', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      // Auto-confirm payment for demo (in production, would use Razorpay)
      const confirmRes = await fetch(`/api/distributor/orders/${json.data.orderId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm',
          paymentReference: 'PAY_DEMO_' + Date.now(),
        }),
      });

      const confirmJson = await confirmRes.json();

      if (!confirmJson.success) throw new Error(confirmJson.error);

      setOrderDetails({
        orderId: json.data.orderId,
        orderNumber: json.data.orderNumber,
        ...pricing,
      });

      setOrderConfirmed(true);
      setCart([]);
    } catch (err) {
      alert(`Order failed: ${err.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Plan Marketplace</h1>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={fetchPlansAndBalance} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (orderConfirmed) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.confirmationCard}>
            <CheckCircle size={64} className={styles.successIcon} />
            <h2>Order Confirmed!</h2>
            <p className={styles.orderNumber}>Order #{orderDetails.orderNumber}</p>

            <div className={styles.confirmationDetails}>
              <div className={styles.detailRow}>
                <span>Total Plans</span>
                <strong>{orderDetails.items.reduce((sum, item) => sum + item.quantity, 0)}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Original Price (MRP)</span>
                <strong>₹{(orderDetails.subtotalMRP || 0).toLocaleString()}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Your Discount</span>
                <strong className={styles.discount}>
                  -₹{(orderDetails.totalDiscount || 0).toLocaleString()}
                </strong>
              </div>
              <div className={styles.detailRow}>
                <span>GST (18%)</span>
                <strong>₹{(orderDetails.gst || 0).toLocaleString()}</strong>
              </div>
              <div className={styles.detailRow + ' ' + styles.final}>
                <span>Total Paid</span>
                <strong>₹{(orderDetails.grandTotal || 0).toLocaleString()}</strong>
              </div>
            </div>

            <div className={styles.confirmationActions}>
              <Link href="/distributor" className={styles.primaryButton}>
                Back to Dashboard
              </Link>
              <Link href="/distributor/retailers" className={styles.secondaryButton}>
                Assign Plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Plan Marketplace</h1>
            <p>Buy plans and assign them to your retailers</p>
          </div>
          <div className={styles.balanceCard}>
            <DollarSign size={20} />
            <div>
              <p className={styles.balanceLabel}>Available Balance</p>
              <p className={styles.balanceAmount}>₹{balance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className={styles.marketplaceLayout}>
          {/* Plans Grid */}
          <div className={styles.plansSection}>
            <div className={styles.plansGrid}>
              {plans.map((plan) => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  onAddToCart={handleAddToCart}
                  inCart={cart.some((item) => item.planType === plan.planType)}
                />
              ))}
            </div>
          </div>

          {/* Cart & Checkout */}
          <div className={styles.sidebarSection}>
            {/* Cart */}
            <div className={styles.cartCard}>
              <h3 className={styles.cartTitle}>
                <ShoppingCart size={20} />
                Shopping Cart
              </h3>

              {cart.length === 0 ? (
                <p className={styles.emptyCart}>No items in cart</p>
              ) : (
                <>
                  <div className={styles.cartItems}>
                    {cart.map((item) => (
                      <div key={item.planType} className={styles.cartItem}>
                        <div className={styles.cartItemInfo}>
                          <p className={styles.cartItemName}>{item.planName}</p>
                          <p className={styles.cartItemPrice}>
                            ₹{item.unitMRP.toLocaleString()} × {item.quantity}
                          </p>
                        </div>
                        <div className={styles.cartItemControls}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                item.planType,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className={styles.quantityInput}
                          />
                          <button
                            onClick={() => handleRemoveFromCart(item.planType)}
                            className={styles.removeBtn}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Summary */}
                  <div className={styles.pricingBreakdown}>
                    <div className={styles.pricingRow}>
                      <span>Subtotal (MRP)</span>
                      <strong>₹{pricing.subtotalMRP.toLocaleString()}</strong>
                    </div>
                    <div className={styles.pricingRow}>
                      <span>Your Discount (20%)</span>
                      <strong className={styles.discount}>
                        -₹{pricing.totalDiscount.toLocaleString()}
                      </strong>
                    </div>
                    <div className={styles.pricingRow}>
                      <span>Subtotal</span>
                      <strong>₹{pricing.subtotal.toLocaleString()}</strong>
                    </div>
                    <div className={styles.pricingRow}>
                      <span>GST (18%)</span>
                      <strong>₹{pricing.gst.toLocaleString()}</strong>
                    </div>
                    <div className={styles.pricingRow + ' ' + styles.total}>
                      <span>Total</span>
                      <strong>₹{pricing.grandTotal.toLocaleString()}</strong>
                    </div>

                    {pricing.grandTotal > balance && (
                      <div className={styles.warning}>
                        <AlertCircle size={16} />
                        <span>Insufficient balance</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={processingPayment || pricing.grandTotal > balance}
                    className={styles.checkoutBtn}
                  >
                    {processingPayment ? 'Processing...' : 'Checkout'}
                  </button>
                </>
              )}
            </div>

            {/* Info Card */}
            <div className={styles.infoCard}>
              <h4>How it works</h4>
              <ol className={styles.stepsList}>
                <li>Select plans and quantity</li>
                <li>Review pricing & discount</li>
                <li>Confirm payment</li>
                <li>Plans added to inventory</li>
                <li>Assign to retailers</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Plan Card Component
function PlanCard({ plan, onAddToCart, inCart }) {
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    onAddToCart(plan, quantity);
    setQuantity(1);
  };

  return (
    <div className={`${styles.planCard} ${inCart ? styles.inCart : ''}`}>
      <div className={styles.planIcon}>
        {plan.planType === 'CORE' ? (
          <Package size={32} />
        ) : (
          <Zap size={32} />
        )}
      </div>

      <h3 className={styles.planName}>{plan.planName}</h3>
      <p className={styles.planDescription}>{plan.description}</p>

      <div className={styles.planPrice}>
        <div className={styles.priceAmount}>₹{plan.unitMRP.toLocaleString()}</div>
        <div className={styles.priceLabel}>per plan</div>
      </div>

      <ul className={styles.featuresList}>
        {plan.features.map((feature, idx) => (
          <li key={idx}>
            <CheckCircle size={16} />
            {feature}
          </li>
        ))}
      </ul>

      <div className={styles.addToCartSection}>
        <input
          type="number"
          min="1"
          max="999"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className={styles.qtyInput}
        />
        <button onClick={handleAdd} className={styles.addBtn}>
          Add to Cart
          <ChevronRight size={16} />
        </button>
      </div>

      {inCart && (
        <div className={styles.inCartBadge}>
          <CheckCircle size={16} />
          In Cart
        </div>
      )}
    </div>
  );
}
