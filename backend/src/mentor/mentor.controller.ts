import { Controller, Get } from '@nestjs/common';
import { MentorService } from './mentor.service';

@Controller('mentor')
export class MentorController {
    constructor(private readonly mentorService: MentorService) { }

    @Get('prompts')
    getPrompts() {
        return this.mentorService.getMentorPrompts();
    }

    @Get('learning-paths')
    getLearningPaths() {
        return this.mentorService.getMentorLearningPaths();
    }
}
