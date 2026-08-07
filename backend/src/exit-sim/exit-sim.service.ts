import { Injectable } from '@nestjs/common';
import {
    getExitSimulationProfiles,
    getExitSimulationScenario,
    getExitSimulationRecommendations,
} from '../phoenix/phoenix.mock';

@Injectable()
export class ExitSimService {
    getProfiles() {
        return getExitSimulationProfiles();
    }

    getExitScenario() {
        return getExitSimulationScenario();
    }

    getRecommendations() {
        return getExitSimulationRecommendations();
    }
}
