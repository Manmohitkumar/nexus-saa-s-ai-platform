import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: unknown }>();
        const auth = request.headers?.['authorization'];
        if (!auth?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing bearer token');
        }
        const payload = await this.authService.verify(auth.slice(7));
        request.user = payload;
        return true;
    }
}
