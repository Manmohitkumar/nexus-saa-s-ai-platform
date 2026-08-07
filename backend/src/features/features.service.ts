import { Injectable } from '@nestjs/common';
import {
    getFeatureFlagSummary,
    getFeatureFlags,
    getFeatureRisk,
    getFeatureDocsState,
    searchFeatureFlags,
} from '../phoenix/phoenix.features';

@Injectable()
export class FeaturesService {
    getSummary() {
        return getFeatureFlagSummary();
    }

    getFlags(limit?: number) {
        const flags = getFeatureFlags();
        return limit && limit > 0 ? flags.slice(0, limit) : flags;
    }

    search(query: string) {
        return searchFeatureFlags(query);
    }

    getRisk() {
        return getFeatureRisk();
    }

    getDocs() {
        return getFeatureDocsState();
    }
}
