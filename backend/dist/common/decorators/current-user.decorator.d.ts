export interface JwtUser {
    sub: number;
    email: string;
    name: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
