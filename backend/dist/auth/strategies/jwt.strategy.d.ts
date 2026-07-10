import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { JwtUser } from '../../common/decorators/current-user.decorator';
export interface JwtPayload {
    sub: number;
    email: string;
    name: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    constructor(configService: ConfigService);
    validate(payload: JwtPayload): JwtUser;
}
export {};
