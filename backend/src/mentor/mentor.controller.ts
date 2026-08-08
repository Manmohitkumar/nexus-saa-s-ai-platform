import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { MentorService } from './mentor.service';
import { AuthService } from '../auth/auth.service';

@Controller('mentor')
export class MentorController {
    constructor(
        private readonly mentorService: MentorService,
        private readonly authService: AuthService,
    ) {}

    @Get('capabilities')
    getCapabilities() {
        return this.mentorService.getCapabilities();
    }

    @Get('prompts')
    getPrompts() {
        return this.mentorService.getMentorPrompts();
    }

    @Get('learning-paths')
    getLearningPaths() {
        return this.mentorService.getMentorLearningPaths();
    }

    @Post('ask')
    async ask(
        @Body('query') query: string,
        @Body('conversationId') conversationId: string | undefined,
        @Headers('authorization') authorization?: string,
    ) {
        return this.mentorService.ask({ query, conversationId, userId: await this.userId(authorization) });
    }

    @Get('conversations')
    async conversations(@Headers('authorization') authorization?: string) {
        return this.mentorService.getConversations(await this.userId(authorization));
    }

    @Get('conversations/:id')
    async conversation(@Param('id') id: string, @Headers('authorization') authorization?: string) {
        return this.mentorService.getConversation(id, await this.userId(authorization));
    }

    private async userId(authorization?: string): Promise<string | null> {
        if (!authorization?.startsWith('Bearer ')) return null;
        try {
            const payload = await this.authService.verify(authorization.slice(7));
            return payload.sub;
        } catch {
            return null;
        }
    }
}
