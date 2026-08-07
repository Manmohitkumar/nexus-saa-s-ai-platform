import { Injectable } from '@nestjs/common';
import { getIntelligenceOverview, getIntelligenceInsights, getReasoningSnapshot } from '../phoenix/phoenix.mock';

@Injectable()
export class IntelligenceService {
    getIntelligenceOverview() {
        return getIntelligenceOverview();
    }

    getIntelligenceInsights() {
        return getIntelligenceInsights();
    }

    getReasoningSnapshot(query: string) {
        return getReasoningSnapshot(query);
    }
}
