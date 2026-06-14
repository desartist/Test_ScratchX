import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production-12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production-67890';

class JWTService {
  /**
   * Create access token (short-lived)
   */
  createAccessToken(account) {
    const payload = {
      accountId: account._id.toString(),
      email: account.email,
      phone: account.phone,
      role: account.role,
      status: account.status,
      type: 'access',
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'scratchx-auth',
      audience: 'scratchx-api',
    });
  }

  /**
   * Create refresh token (long-lived)
   */
  createRefreshToken(account) {
    const payload = {
      accountId: account._id.toString(),
      type: 'refresh',
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'scratchx-auth',
      audience: 'scratchx-api',
    });
  }

  /**
   * Create both tokens at once
   */
  createTokenPair(account) {
    return {
      accessToken: this.createAccessToken(account),
      refreshToken: this.createRefreshToken(account),
      expiresIn: ACCESS_TOKEN_EXPIRY,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'scratchx-auth',
        audience: 'scratchx-api',
      });
    } catch (err) {
      throw new Error(`Access token verification failed: ${err.message}`);
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'scratchx-auth',
        audience: 'scratchx-api',
      });
    } catch (err) {
      throw new Error(`Refresh token verification failed: ${err.message}`);
    }
  }

  /**
   * Verify token (auto-detect type)
   */
  verifyToken(token) {
    try {
      // Try access token first
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'scratchx-auth',
        audience: 'scratchx-api',
      });
    } catch {
      try {
        // Try refresh token
        return jwt.verify(token, JWT_REFRESH_SECRET, {
          issuer: 'scratchx-auth',
          audience: 'scratchx-api',
        });
      } catch (err) {
        throw new Error(`Token verification failed: ${err.message}`);
      }
    }
  }

  /**
   * Decode token without verification
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  /**
   * Get remaining time until expiry (in seconds)
   */
  getTokenExpiryIn(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return 0;
      }
      return Math.max(0, Math.floor((decoded.exp * 1000 - Date.now()) / 1000));
    } catch {
      return 0;
    }
  }

  /**
   * Create reset token for password reset (short-lived, 10 minutes)
   */
  createResetToken(accountId) {
    const payload = {
      accountId: accountId.toString(),
      type: 'password_reset',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, process.env.JWT_RESET_SECRET || process.env.JWT_SECRET, {
      expiresIn: '10m',
      issuer: 'scratchx-auth',
      audience: 'scratchx-api',
    });
  }
}

export default new JWTService();
