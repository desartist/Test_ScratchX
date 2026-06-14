'use client';

import React, { Suspense } from 'react';
import OTPVerifyContent from '../../../../components/auth/OTPVerifyContent';
import { AuthLayout } from '../../../../components/layouts/AuthLayout';

function OTPVerifyFallback() {
  return (
    <AuthLayout>
      <div>
        <h1>Verify OTP</h1>
        <p>Loading...</p>
      </div>
    </AuthLayout>
  );
}

export default function OTPVerifyPage() {
  return (
    <Suspense fallback={<OTPVerifyFallback />}>
      <OTPVerifyContent />
    </Suspense>
  );
}
