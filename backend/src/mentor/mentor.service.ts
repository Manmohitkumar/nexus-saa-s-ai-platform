import { Injectable } from '@nestjs/common';
import { getMentorLearningPaths, getMentorPrompts } from '../phoenix/phoenix.mock';

@Injectable()
export class MentorService {
    getMentorPrompts() {
        return getMentorPrompts();
    }

    getMentorLearningPaths() {
        return getMentorLearningPaths();
    }
}
