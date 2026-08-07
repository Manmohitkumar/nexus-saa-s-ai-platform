import { Injectable } from '@nestjs/common';
import { getArchitectureWorkflows, getDocumentationEngineState } from '../phoenix/phoenix.mock';

@Injectable()
export class DocsService {
    getDocumentationState() {
        return getDocumentationEngineState();
    }

    getArchitectureWorkflows() {
        return getArchitectureWorkflows();
    }
}
