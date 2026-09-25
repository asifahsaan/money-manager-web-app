import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../../users/users.service';
import { requireJwtSecret } from '../jwt-secret';

export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(configService),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }
    // Tokens live 7 days — re-check the user so deleted or deactivated
    // accounts lose access immediately instead of when the token expires.
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is disabled or no longer exists');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }
}
