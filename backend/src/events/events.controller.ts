import { Controller, Get } from '@nestjs/common';
import { EventBus } from './event-bus';

@Controller('events')
export class EventsController {
    constructor(private readonly eventBus: EventBus) {}

    @Get()
    recent() {
        return {
            total: this.eventBus.count(),
            events: this.eventBus.recent(50),
        };
    }
}
