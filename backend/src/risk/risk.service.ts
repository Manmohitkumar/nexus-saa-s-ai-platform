import { Injectable } from '@nestjs/common';
import { getRiskHeatmapData } from '../phoenix/phoenix.mock';

@Injectable()
export class RiskService {
    getHeatmap() {
        return getRiskHeatmapData();
    }
}
