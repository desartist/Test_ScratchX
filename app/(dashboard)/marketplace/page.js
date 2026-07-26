'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle,
  Minus,
  Plus,
  Store,
} from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthContext';
import LoadingState from '@/components/common/LoadingState';
import styles from './marketplace.module.css';

const MIN_QUANTITY = 5;
const PLAN_ORDER = ['SMART', 'CORE'];
const PLAN_DISPLAY_NAME = { SMART: 'Smart Licenses', CORE: 'Core Licenses' };
const PLAN_ICON = { SMART: Building2, CORE: Store };

function buildFeatureRows(planType, plan) {
  const f = plan.features || {};
  const l = plan.limits || {};

  if (planType === 'CORE') {
    return [
      { label: 'Unlimited campaigns', included: !!f.unlimitedCampaigns },
      { label: 'Unlimited scratches / year', included: !!f.unlimitedScratches },
      { label: 'Customer database', included: !!f.customerDatabase },
      { label: `${f.teamMembers ?? 0} team members`, included: !!f.teamMembers },
      { label: 'Basic analytics & insights', included: !!f.basicAnalytics },
      { label: 'Export reports', included: !!f.exportReports },
      { label: 'Custom branding', included: !!f.customBranding },
      { label: 'Priority support', included: !!f.prioritySupport },
      { label: 'Multi-store management', included: !!f.multiStore },
      { label: 'WhatsApp integration', included: !!f.whatsappIntegration },
    ];
  }

  const extraStoreNote = l.additionalStorePrice
    ? ` (${l.mainStores ?? 1} + ${l.additionalStores ?? 0}, ₹${l.additionalStorePrice}/extra)`
    : '';
  return [
    { label: `Multi-store${extraStoreNote}`, included: !!f.multiStore },
    { label: `${f.teamMembersPerStore ?? 0} members per store`, included: !!f.teamMembersPerStore },
    { label: 'Advanced analytics & insights', included: !!f.advancedAnalytics },
    { label: 'Smart segmentation', included: !!f.smartSegmentation },
    { label: 'WhatsApp integration', included: !!f.whatsappIntegration },
    { label: 'Canva Pro (ScratchX Studio)', included: !!f.canvaProStudio },
    { label: 'Advanced automation', included: !!f.advancedAutomation },
    { label: 'Fraud protection', included: !!f.fraudProtection },
    { label: 'Priority support', included: !!f.prioritySupport },
    { label: 'API access', included: !!f.apiAccess },
  ];
}

export default function MarketplacePage() {
  const router = useRouter();
  const { account } = useAuthContext();
  const commissionPercentage = account?.profile?.commissionRate ?? 0;

  const [activeTab, setActiveTab] = useState('subscription');
  const [plans, setPlans] = useState({});
  const [selections, setSelections] = useState({
    SMART: { checked: true, quantity: MIN_QUANTITY },
    CORE: { checked: false, quantity: MIN_QUANTITY },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true';

  // Load Razorpay checkout script on mount (skip in test mode)
  useEffect(() => {
    if (isTestMode) {
      setRazorpayLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setRazorpayLoaded(false);
    document.body.appendChild(script);
  }, [isTestMode]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);

      const plansRes = await fetch('/api/subscription/plans', {
        credentials: 'include',
      });
      const plansJson = await plansRes.json();

      if (!plansJson.success) throw new Error(plansJson.error || 'Failed to load plans');

      const byType = {};
      for (const plan of plansJson.data) {
        byType[plan.planType] = {
          planType: plan.planType,
          retailValue: plan.price.base,
          description: plan.description,
          recommended: plan.recommended,
          features: plan.features,
          limits: plan.limits,
        };
      }

      setPlans(byType);
      setError(null);
    } catch (err) {
      console.error('[Marketplace] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getYourPrice = (retailValue) =>
    Math.round(retailValue * (1 - commissionPercentage / 100) * 100) / 100;

  const toggleChecked = (planType) => {
    setSelections((prev) => ({
      ...prev,
      [planType]: { ...prev[planType], checked: !prev[planType].checked },
    }));
  };

  const changeQuantity = (planType, delta) => {
    setSelections((prev) => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        quantity: Math.max(MIN_QUANTITY, prev[planType].quantity + delta),
      },
    }));
  };

  const calculatePricing = () => {
    let yourPriceTotal = 0;
    let retailValueTotal = 0;

    const items = PLAN_ORDER
      .filter((planType) => selections[planType].checked && plans[planType])
      .map((planType) => {
        const plan = plans[planType];
        const quantity = selections[planType].quantity;
        const yourPrice = getYourPrice(plan.retailValue);

        yourPriceTotal += yourPrice * quantity;
        retailValueTotal += plan.retailValue * quantity;

        return { planType, quantity, unitMRP: plan.retailValue };
      });

    const discountTotal = retailValueTotal - yourPriceTotal;
    const gst = Math.round(yourPriceTotal * 0.18 * 100) / 100;
    const payableAmount = yourPriceTotal + gst;

    return {
      items,
      yourPriceTotal,
      retailValueTotal,
      discountTotal,
      commissionPercentage,
      gst,
      payableAmount,
    };
  };

  const pricing = calculatePricing();

  const verifyPayment = async (orderId, paymentPayload, pricingSnapshot) => {
    const verifyRes = await fetch('/api/distributor/plans/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...paymentPayload }),
    });
    const verifyJson = await verifyRes.json();
    if (!verifyJson.success) throw new Error(verifyJson.error);

    setOrderDetails({
      orderId: verifyJson.data.orderId,
      orderNumber: verifyJson.data.orderNumber,
      ...pricingSnapshot,
    });
    setOrderConfirmed(true);
  };

  const handleDownloadInvoice = () => {
    if (!orderDetails) return;

    const rows = orderDetails.items
      .map((item) => {
        const unitPrice = Math.round(
          item.unitMRP * (1 - orderDetails.commissionPercentage / 100) * 100
        ) / 100;
        const lineTotal = unitPrice * item.quantity;
        return `
          <tr>
            <td>${PLAN_DISPLAY_NAME[item.planType]}</td>
            <td style="text-align:center;">${item.quantity}</td>
            <td style="text-align:right;">₹${unitPrice.toLocaleString()}</td>
            <td style="text-align:right;">₹${Math.round(lineTotal).toLocaleString()}</td>
          </tr>`;
      })
      .join('');

    const issuedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${orderDetails.orderNumber}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; color: #010f44; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 4px 0; }
  .muted { color: #6b7280; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
  th { text-align: left; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 11px; }
  tfoot td { border-bottom: none; padding-top: 14px; }
  tfoot .label { color: #6b7280; }
  .grand td { font-size: 16px; font-weight: 700; border-top: 2px solid #010f44; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
  <h1>ScratchX</h1>
  <p class="muted">Tax Invoice</p>
  <p class="muted">Order #${orderDetails.orderNumber} &middot; ${issuedDate}</p>
  <table>
    <thead>
      <tr><th>License</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="3" class="label">Subtotal</td><td style="text-align:right;">₹${Math.round(orderDetails.yourPriceTotal).toLocaleString()}</td></tr>
      <tr><td colspan="3" class="label">GST (18%)</td><td style="text-align:right;">₹${Math.round(orderDetails.gst).toLocaleString()}</td></tr>
      <tr class="grand"><td colspan="3">Payable Amount</td><td style="text-align:right;">₹${Math.round(orderDetails.payableAmount).toLocaleString()}</td></tr>
    </tfoot>
  </table>
  <script>window.onload = () => setTimeout(() => window.print(), 150);</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to download the invoice.');
    }
  };

  const handleCheckout = async () => {
    if (pricing.items.length === 0) {
      alert('Select at least one license type to continue.');
      return;
    }

    if (!razorpayLoaded) {
      alert('Payment system is not ready. Please try again.');
      return;
    }

    try {
      setProcessingPayment(true);

      const orderPayload = {
        items: pricing.items.map((item) => ({
          planType: item.planType,
          quantity: item.quantity,
        })),
        includeGst: true,
      };

      const res = await fetch('/api/distributor/plans/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const { orderId, gatewayOrderId, amount, currency, razorpayKeyId, mockPayment, testMode } =
        json.data;

      if (isTestMode || testMode) {
        await verifyPayment(orderId, mockPayment, pricing);
        setProcessingPayment(false);
        return;
      }

      const options = {
        key: razorpayKeyId,
        amount,
        currency,
        name: 'ScratchX',
        description: 'Distributor plan credit purchase',
        order_id: gatewayOrderId,
        theme: { color: '#6C5CE7' },
        handler: async (response) => {
          try {
            await verifyPayment(
              orderId,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              pricing
            );
          } catch (err) {
            alert(`Payment verification failed: ${err.message}`);
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => setProcessingPayment(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      return;
    } catch (err) {
      alert(`Order failed: ${err.message}`);
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <LoadingState message="Loading marketplace..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Buy in bulk</h1>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={fetchPlans} className={styles.retryButton}>
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
              {orderDetails.items.map((item) => (
                <div key={item.planType} className={styles.detailRow}>
                  <span>{PLAN_DISPLAY_NAME[item.planType]}</span>
                  <strong>
                    {item.quantity} × {item.planType === 'SMART' ? 'Smart' : 'Core'}
                  </strong>
                </div>
              ))}
              <div className={styles.detailRow + ' ' + styles.final}>
                <span>Payable Amount</span>
                <strong>₹{Math.round(orderDetails.payableAmount).toLocaleString()}</strong>
              </div>
            </div>

            <div className={styles.confirmationActions}>
              <Link href="/distributor-overview" className={styles.primaryButton}>
                Back to Dashboard
              </Link>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleDownloadInvoice}
              >
                Download Invoice
              </button>
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
          <h1>Buy in bulk</h1>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'subscription' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            Subscription Licenses
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'recharge' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('recharge')}
          >
            Recharge Plans
          </button>
        </div>

        {activeTab === 'recharge' ? (
          <div className={styles.comingSoon}>
            <p>Recharge plans aren&apos;t available yet — check back soon.</p>
          </div>
        ) : (
          <>
            <p className={styles.description}>
              Purchase Core and Smart retailer licenses in bulk. Minimum {MIN_QUANTITY} licenses per
              order. Assign licenses to retailers anytime from your distributor dashboard.
            </p>

            {/* License cards */}
            <div className={styles.licenseList}>
              {PLAN_ORDER.map((planType) => {
                const plan = plans[planType];
                const selection = selections[planType];
                if (!plan) return null;

                return (
                  <div
                    key={planType}
                    className={`${styles.licenseCard} ${selection.checked ? styles.licenseCardActive : ''}`}
                  >
                    <label className={styles.cartCheckbox}>
                      <input
                        type="checkbox"
                        checked={selection.checked}
                        onChange={() => toggleChecked(planType)}
                      />
                      <span className={styles.checkmark} />
                    </label>

                    <div className={styles.licenseInfo}>
                      <p className={styles.licenseName}>{PLAN_DISPLAY_NAME[planType]}</p>
                      <p className={styles.licensePriceRow}>
                        <span>Your Price:</span> ₹{getYourPrice(plan.retailValue).toLocaleString()} / license
                      </p>
                      <p className={styles.licensePriceRow}>
                        <span>Retail Value:</span> ₹{plan.retailValue.toLocaleString()} / license
                      </p>
                    </div>

                    <div className={styles.stepper}>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => changeQuantity(planType, -1)}
                        disabled={selection.quantity <= MIN_QUANTITY}
                        aria-label={`Decrease ${PLAN_DISPLAY_NAME[planType]} quantity`}
                      >
                        <Minus size={14} />
                      </button>
                      <span className={styles.stepperValue}>{selection.quantity}</span>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => changeQuantity(planType, 1)}
                        aria-label={`Increase ${PLAN_DISPLAY_NAME[planType]} quantity`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className={styles.summaryCard}>
              {pricing.items.map((item) => (
                <div key={item.planType} className={styles.summaryRow}>
                  <span>{PLAN_DISPLAY_NAME[item.planType]}</span>
                  <strong>
                    {item.quantity} × {item.planType === 'SMART' ? 'Smart' : 'Core'}
                  </strong>
                </div>
              ))}

              <div className={styles.summaryRow}>
                <span>Retail Value</span>
                <strong>₹{Math.round(pricing.retailValueTotal).toLocaleString()}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Your Discount ({commissionPercentage}%)</span>
                <strong className={styles.discount}>
                  -₹{Math.round(pricing.discountTotal).toLocaleString()}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Your Price</span>
                <strong>₹{Math.round(pricing.yourPriceTotal).toLocaleString()}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>GST (18%)</span>
                <strong>₹{Math.round(pricing.gst).toLocaleString()}</strong>
              </div>

              <div className={styles.summaryDivider} />

              <div className={`${styles.summaryRow} ${styles.summaryRowFinal}`}>
                <span>Payable Amount</span>
                <strong>₹{Math.round(pricing.payableAmount).toLocaleString()}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => router.push('/distributor-overview')}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.payBtn}
                onClick={handleCheckout}
                disabled={processingPayment || pricing.items.length === 0}
              >
                {processingPayment ? 'Processing...' : 'Proceed to Pay'}
              </button>
            </div>

            {/* Plan details */}
            <div className={styles.planDetails}>
              {PLAN_ORDER.filter((planType) => plans[planType]).map((planType) => {
                const plan = plans[planType];
                const Icon = PLAN_ICON[planType];
                return (
                  <div key={planType} className={styles.planDetailCard}>
                    <div className={styles.planDetailHeader}>
                      <span className={styles.planDetailIcon}>
                        <Icon size={18} />
                      </span>
                      <div>
                        <div className={styles.planDetailTitleRow}>
                          <span className={styles.planDetailTitle}>{PLAN_DISPLAY_NAME[planType]}</span>
                          {/* {plan.recommended && (
                            <span className={styles.planDetailBadge}>Most popular</span>
                          )} */}
                        </div>
                        {plan.description && (
                          <p className={styles.planDetailDescription}>{plan.description}</p>
                        )}
                      </div>
                      <span className={styles.planDetailPrice}>
                        ₹{plan.retailValue.toLocaleString()}
                        <small>/license</small>
                      </span>
                    </div>

                    {planType === 'SMART' && (
                      <p className={styles.planFeatureNote}>Everything in Core, plus —</p>
                    )}

                    {plan.features && (
                      <ul className={styles.planFeatureList}>
                        {buildFeatureRows(planType, plan).map((row) => (
                          <li key={row.label} className={styles.planFeatureItem}>
                            <span className={row.included ? styles.featureBadgeYes : styles.featureBadgeNo}>
                              {row.included ? <Check size={12} /> : <Minus size={12} />}
                            </span>
                            <span className={row.included ? '' : styles.planFeatureLabelMuted}>
                              {row.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
