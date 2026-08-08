import { Global, Module, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus } from './event-bus';
import { EventsController } from './events.controller';

@Global()
@Module({
    providers: [EventBus],
    controllers: [EventsController],
    exports: [EventBus],
})
export class EventsModule implements OnApplicationBootstrap {
    constructor(private readonly eventBus: EventBus) {}

    onApplicationBootstrap(): void {
        this.eventBus.emit('phoenix.boot', 'brain', 'Organizational Brain is live');
    }
}
