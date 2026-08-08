import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    register(
        @Body('email') email: string,
        @Body('name') name: string,
        @Body('password') password: string,
    ) {
        return this.authService.register(email, name, password);
    }

    @Post('login')
    login(@Body('email') email: string, @Body('password') password: string) {
        return this.authService.login(email, password);
    }

    @Get('me')
    async me(@Headers('authorization') authorization?: string) {
        if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing bearer token');
        }
        const payload = await this.authService.verify(authorization.slice(7));
        return payload;
    }
}
