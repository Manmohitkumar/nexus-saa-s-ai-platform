import { Injectable } from '@nestjs/common';
import { getExecutiveBrief, getBrainGraphView, getDecisionTimelineData } from '../phoenix/phoenix.mock';

@Injectable()
export class DashboardService {
    getExecutiveBrief() {
        return getExecutiveBrief();
    }

    getBrainGraphView() {
        return getBrainGraphView();
    }

    getDecisionTimeline() {
        return getDecisionTimelineData();
    }
}
