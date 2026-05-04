import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/** Short-lived token for normal login (1 day) */
const TTL_NORMAL = '1d';
/** Long-lived token for "Remember Me" (30 days) */
const TTL_REMEMBER_ME = '30d';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUsername(username);

    if (!user) return null;

    if (user.lockUntil && new Date() < new Date(user.lockUntil)) {
      throw new UnauthorizedException(
        'Account is temporarily locked. Try again later.',
      );
    }

    if (await bcrypt.compare(pass, user.password)) {
      if (user.loginAttempts > 0) {
        await this.usersService.resetLoginAttempts(user.id);
      }
      const {
        password,
        refreshToken,
        refreshExpires,
        loginAttempts,
        lockUntil,
        ...result
      } = user;
      return result;
    }

    await this.usersService.incrementLoginAttempts(user.id);
    return null;
  }

  async register(
    username: string,
    pass: string,
    role?: string,
    studentId?: string,
  ) {
    const existingUser = await this.usersService.findOneByUsername(username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const newUser = await this.usersService.create({
      username,
      password: pass,
      role: role as any,
      isVerified: role === 'ADMIN' || role === 'ACCOUNTANT',
    });

    if (role === 'PARENT' && studentId) {
      await this.usersService.linkParentToStudent(newUser.id, studentId);
    }

    const { password, refreshToken, refreshExpires, ...result } = newUser;
    return {
      message:
        'User registered successfully. Please wait for admin verification.',
      user: result,
    };
  }

  async login(user: any, rememberMe = false) {
    const tokens = await this.generateTokens(user, rememberMe);
    return {
      ...tokens,
      user: {
        id: user.id || user.userId,
        username: user.username,
        role: user.role,
        isVerified: user.isVerified,
        classId: user.studentProfile?.class?.id,
        className: user.studentProfile?.class?.name,
        isPrePrimary:
          user.studentProfile?.class?.isPrePrimary ||
          user.sectionsManaged?.some((s) => s.class?.isPrePrimary) ||
          false,
        sectionId: user.studentProfile?.section?.id,
      },
    };
  }

  async generateTokens(user: any, rememberMe = false) {
    const accessTokenExpiresIn = rememberMe ? TTL_REMEMBER_ME : TTL_NORMAL;
    const payload = {
      username: user.username,
      sub: user.id || user.userId,
      role: user.role,
      isVerified: user.isVerified,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiresIn,
    });

    // Generate refresh token (valid for 7 days longer than access token or fixed 30 days)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiresIn = rememberMe
      ? 60 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000; // 60 days or 7 days
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn);

    await this.usersService.updateRefreshToken(
      user.id || user.userId,
      refreshToken,
      expiresAt,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: accessTokenExpiresIn,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findUserWithRefreshToken(userId);
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    // Ensure refreshExpires is a Date object before comparison
    if (!user.refreshExpires || new Date() > new Date(user.refreshExpires)) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    return this.generateTokens(user);
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null, null);
  }

  async logoutAll(userId: string) {
    await this.usersService.invalidateAllSessions(userId);
  }
}
