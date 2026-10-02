import {
  Injectable,
  ExecutionContext,
  HttpException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    // JwtStrategy.validate looks the user up in the database. If that lookup
    // fails (database waking up, connection pool busy) it is not an auth
    // failure — answering 401 would make the app log the user out.
    if (err && !(err instanceof HttpException)) {
      this.logger.warn(`Token check could not reach the database: ${err.message}`);
      throw new ServiceUnavailableException('Server is busy, please try again');
    }
    if (err || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
