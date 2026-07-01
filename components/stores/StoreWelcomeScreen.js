'use client';

import React from 'react';
import { Store } from 'lucide-react';

export default function StoreWelcomeScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      padding: '40px 20px',
      textAlign: 'center',
      background: '#f9f9f9',
      borderRadius: '12px',
    }}>
      <div style={{
        marginBottom: '20px',
        color: '#ef9e1b',
      }}>
        <Store size={48} />
      </div>
      <h2 style={{
        margin: '0 0 12px 0',
        fontSize: '24px',
        fontWeight: 700,
        color: '#010f44',
      }}>
        Create Your Store
      </h2>
      <p style={{
        margin: 0,
        color: '#637080',
        fontSize: '14px',
        maxWidth: '400px',
        lineHeight: '1.5',
      }}>
        Add your store details to get started with managing campaigns and scratch cards.
      </p>
    </div>
  );
}
