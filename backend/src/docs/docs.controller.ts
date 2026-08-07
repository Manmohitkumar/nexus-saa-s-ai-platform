import { Controller, Get } from '@nestjs/common';
import { DocsService } from './docs.service';

@Controller('docs')
export class DocsController {
    constructor(private readonly docsService: DocsService) { }

    @Get('state')
    getDocumentationState() {
        return this.docsService.getDocumentationState();
    }

    @Get('workflows')
    getArchitectureWorkflows() {
        return this.docsService.getArchitectureWorkflows();
    }
}
