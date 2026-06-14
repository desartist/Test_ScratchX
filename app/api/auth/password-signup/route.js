import { connectDB } from '@/lib/connectDB';
import Account from '@/models/accountModel';
import passwordService from '@/lib/passwordService';
import jwtService from '@/lib/jwtService';
import { setAuthSession } from '@/lib/setAuthSession';

export async function POST(req) {
  try {
    await connectDB();

    const { email, password, confirmPassword, firstName, lastName, phone, role } =
      await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (confirmPassword != null && password !== confirmPassword) {
      return Response.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    const validation = passwordService.validatePasswordPolicy(password);
    if (!validation.isValid) {
      return Response.json(
        {
          success: false,
          error: `Password policy violation: ${validation.errors.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingAccount = await Account.findOne({ email: normalizedEmail });
    if (existingAccount) {
      return Response.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    if (phone) {
      const existingPhone = await Account.findOne({ phone });
      if (existingPhone) {
        return Response.json(
          { success: false, error: 'Phone number already registered' },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await passwordService.hashPassword(password);

    const newAccount = await Account.create({
      email: normalizedEmail,
      firstName,
      lastName,
      phone,
      password: hashedPassword,
      role: role || 'Merchant',
      source: 'Password_Signup',
      status: 'active',
      lastLoginAt: new Date(),
    });

    await setAuthSession(newAccount);

    const { accessToken, refreshToken, expiresIn } = jwtService.createTokenPair(newAccount);

    return Response.json(
      {
        success: true,
        message: 'Account created successfully',
        accessToken,
        refreshToken,
        expiresIn,
        account: {
          id: newAccount._id.toString(),
          email: newAccount.email,
          firstName: newAccount.firstName,
          lastName: newAccount.lastName,
          phone: newAccount.phone,
          role: newAccount.role,
          status: newAccount.status,
          lastLoginAt: newAccount.lastLoginAt,
          createdAt: newAccount.createdAt,
        },
        redirectTo: '/dashboard',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Password signup error:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      return Response.json(
        { success: false, error: `${field} already registered` },
        { status: 409 }
      );
    }

    return Response.json(
      {
        success: false,
        error: error.message || 'Signup failed. Please try again.',
      },
      { status: 500 }
    );
  }
}
