import { cookies } from 'next/headers';
import { connectDB } from '@/lib/connectDB';
import Session from '@/models/sessionModel';
import Account from '@/models/accountModel';
import { getLoginToken } from '@/lib/auth';

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const authTokenCookie = cookieStore.get('authToken');

    const sessionCount = await Session.countDocuments({});
    const accountCount = await Account.countDocuments({});

    // Try to get login token
    const account = await getLoginToken();

    return Response.json({
      success: true,
      debug: {
        nodeEnv: process.env.NODE_ENV,
        cookieSecretExists: !!process.env.COOKIE_SECRET,
        cookieSecretLength: process.env.COOKIE_SECRET?.length || 0,
        allCookies: allCookies.map(c => ({
          name: c.name,
          value: c.value ? c.value.substring(0, 20) + '...' : null,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite,
        })),
        authTokenExists: !!authTokenCookie?.value,
        authTokenValue: authTokenCookie?.value ? authTokenCookie.value.substring(0, 20) + '...' : null,
        sessionCount,
        accountCount,
        authResult: account ? {
          authenticated: true,
          accountId: account._id,
          email: account.email,
          role: account.role,
          status: account.status,
        } : {
          authenticated: false,
          reason: 'getLoginToken returned null',
        },
      },
    }, { status: 200 });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
