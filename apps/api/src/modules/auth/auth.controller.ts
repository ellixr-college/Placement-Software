import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL } from '@ellixr/auth';
import type { JwtPayload } from '@ellixr/shared';
import { Public, CurrentUser } from '../../common/decorators';
import { AuthService } from './auth.service';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(res, refreshToken);
    return { data: { accessToken, user } };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    const { accessToken, refreshToken, user } = await this.auth.refresh(raw);
    this.setRefreshCookie(res, refreshToken);
    return { data: { accessToken, user } };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    return { data: { success: true } };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return { data: await this.auth.forgotPassword(dto.email) };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return { data: await this.auth.resetPassword(dto.token, dto.password) };
  }

  @Post('change-password')
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return { data: await this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword) };
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return { data: await this.auth.me(user.sub) };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE') === 'true',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_TTL * 1000,
    });
  }
}
