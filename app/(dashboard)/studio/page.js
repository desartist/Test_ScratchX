'use client';

import React from 'react';
import Link from 'next/link';
import { MessageCircle, ArrowRight } from 'lucide-react';
import StudioHero from '@/components/studio/StudioHero';
import StudioFeatureCard from '@/components/studio/StudioFeatureCard';
import StudioRoadmap from '@/components/studio/StudioRoadmap';
import StudioEarlyAccess from '@/components/studio/StudioEarlyAccess';
import styles from './studio.module.css';

export default function StudioPage() {
  const features = [
    {
      icon: '🎨',
      title: 'Custom Scratch Designer',
      description: 'Create branded scratches with your own colors, images and themes.',
    },
    {
      icon: '🎁',
      title: 'Reward Builder',
      description: 'Configure rewards, coupon logic and winning probabilities.',
    },
    {
      icon: '📋',
      title: 'Campaign Templates',
      description: 'Launch campaigns faster using ready-made templates.',
    },
    {
      icon: '✨',
      title: 'Advanced Personalization',
      description: 'Create unique experiences for different customer segments.',
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>ScratchX Studio</h1>
        <p className={styles.pageSubtitle}>
          Professional tools for creating unforgettable customer experiences
        </p>
      </div>

      {/* Hero Section */}
      <StudioHero />

      {/* Available Now Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Available Now</h2>
        <p className={styles.sectionSubtitle}>
          Ready-to-use tools you can start using today
        </p>
        <div className={styles.featuresGrid}>
          <Link href="/studio/whatsapp-templates" className={styles.availableCard}>
            <div className={styles.availableCardTop}>
              <div className={styles.availableIcon}>
                <MessageCircle size={22} />
              </div>
              <span className={styles.availableBadge}>Available</span>
            </div>
            <h3 className={styles.availableTitle}>WhatsApp Templates</h3>
            <p className={styles.availableDescription}>
              Create reusable message templates — like offers and thank-you notes — to send customers over WhatsApp in one click.
            </p>
            <span className={styles.availableLink}>
              Manage templates <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Upcoming Features</h2>
        <p className={styles.sectionSubtitle}>
          Powerful tools to design, customize, and launch engaging campaigns
        </p>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <StudioFeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>

      {/* Roadmap Section */}
      <StudioRoadmap />

      {/* Early Access Section */}
      <StudioEarlyAccess />
    </div>
  );
}