import { connectDB } from '@/lib/connectDB';
import otpService from '@/lib/otpService';
import Account from '@/models/accountModel';

export async function POST(request) {
  try {
    await connectDB();

    const { phone } = await request.json();

    // Validate phone
    if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      return Response.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Determine purpose (signup vs login)
    const account = await Account.findOne({ phone });
    const purpose = account ? 'Login' : 'Signup';

    // Generate and send OTP
    const result = await otpService.generateOTP(
      phone,
      purpose,
      request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent')
    );

    return Response.json(
      {
        success: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('OTP Send Error:', err);

    // Handle rate limiting
    if (err.message.includes('Rate limit')) {
      return Response.json(
        { success: false, error: err.message },
        { status: 429 }
      );
    }

    // Handle OTP provider errors
    if (err.message.includes('Failed to send')) {
      return Response.json(
        { success: false, error: 'Failed to send OTP. Please try again.' },
        { status: 503 }
      );
    }

    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
