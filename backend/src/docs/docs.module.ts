import { Module } from '@nestjs/common';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';
import { DocumentationIntelligenceService } from './documentation-intelligence.service';
import { DocumentationVersionService } from './documentation-version.service';
import { DocumentationQualityService } from './documentation-quality.service';
import { DocumentationRecommendationService } from './documentation-recommendation.service';
import { DocumentationEvolutionService } from './documentation-evolution.service';
import { WorkforceModule } from '../workforce/workforce.module';
import { RiskModule } from '../risk/risk.module';

@Module({
    imports: [WorkforceModule, RiskModule],
    controllers: [DocsController],
    providers: [
        DocsService,
        DocumentationIntelligenceService,
        DocumentationVersionService,
        DocumentationQualityService,
        DocumentationRecommendationService,
        DocumentationEvolutionService,
    ],
    exports: [DocsService, DocumentationIntelligenceService],
})
export class DocsModule {}
