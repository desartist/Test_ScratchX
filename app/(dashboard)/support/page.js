"use client";

import React, { useState } from "react";
import {
  Mail,
  HelpCircle,
  MessageSquare,
  Phone,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
} from "lucide-react";
import styles from "./support.module.css";

const CONTACT_CARDS = [
  {
    icon: <Mail size={26} />,
    title: "Sales & Demo",
    description: "Book a personalised demo or talk to our sales team about your business needs.",
    email: "grow@thescratchx.com",
    cta: "Send Email",
    accent: "#010f44",
  },
  {
    icon: <HelpCircle size={26} />,
    title: "Customer Support & Inquiry",
    description: "Having trouble with your account, campaigns, or payments? We're here to help.",
    email: "support@thescratchx.com",
    cta: "Get Help",
    accent: "#6d5df6",
  },
];

const FAQS = [
  {
    q: "How do I create my first campaign?",
    a: "Go to Campaigns → New Campaign. Fill in the campaign name, billing ranges, reward tiers and assign stores. Your campaign goes live instantly once you save.",
  },
  {
    q: "What happens after my 30-day unlimited scratch cards / month period?",
    a: "After the 90-day unlimited period expires, you can purchase scratch packs from the Billing section. Packs come in sizes of 1 000, 5 000, 10 000 and 50 000 scratches.",
  },
  {
    q: "How do I add more stores to my account?",
    a: "Navigate to Stores → Create Store. The Core plan supports 1 store and the Smart plan supports up to 5 stores. Upgrade your plan under Billing if you need more.",
  },
  {
    q: "Can I upgrade from Core to Smart plan?",
    a: "Yes. Go to Billing → Plans, choose the Smart plan and complete the one-time payment. Your plan upgrades instantly.",
  },
  {
    q: "How does the QR scratch card work for customers?",
    a: "Each campaign generates a unique QR code. Customers scan it at your store, enter their bill amount, and reveal their reward digitally — no physical cards needed.",
  },
  {
    q: "How do I track which customers redeemed their reward?",
    a: "The Customers page shows full participation history. You can filter by campaign, store, status and date range. Click any customer to see their complete journey.",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className={styles.page}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className={styles.hero}>
        <span className={styles.heroBadge}>
          <Zap size={13} /> CONTACT SCRATCHX
        </span>
        <h1 className={styles.heroTitle}>Need Details or Support?</h1>
        <p className={styles.heroSubtitle}>
          Reach the right ScratchX team directly for demos, sales enquiries,
          customer support, and general questions.
        </p>
      </section>

      {/* ── Contact Cards ────────────────────────────────── */}
      <section className={styles.cardsGrid}>
        {CONTACT_CARDS.map((card) => (
          <div key={card.email} className={styles.contactCard}>
            <div
              className={styles.contactIcon}
              style={{ background: `${card.accent}18`, color: card.accent }}
            >
              {card.icon}
            </div>
            <h3 className={styles.contactTitle}>{card.title}</h3>
            <p className={styles.contactDesc}>{card.description}</p>
            <a
              href={`mailto:${card.email}`}
              className={styles.contactEmail}
              style={{ color: card.accent }}
            >
              {card.email}
            </a>
            <a
              href={`mailto:${card.email}`}
              className={styles.contactBtn}
              style={{ background: card.accent }}
            >
              <Mail size={15} />
              {card.cta}
            </a>
          </div>
        ))}
      </section>

      {/* ── Quick Links (Hidden) ──────────────────────────────────── */}
      {/* Quick Links section hidden */}

      {/* ── FAQs ─────────────────────────────────────────── */}
      <section className={styles.faqSection}>
        <h2 className={styles.sectionHeading}>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ""}`}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{faq.q}</span>
                {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openFaq === i && (
                <p className={styles.faqAnswer}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
