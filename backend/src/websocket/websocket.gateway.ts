import { Injectable, Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventBus, PhoenixEvent } from '../events/event-bus';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class PhoenixGateway implements OnGatewayInit, OnGatewayConnection {
    private readonly logger = new Logger(PhoenixGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(private readonly eventBus: EventBus) {}

    afterInit() {
        this.eventBus.subscribe((event: PhoenixEvent) => {
            this.server.emit('phoenix.event', event);
        });
        this.logger.log('Phoenix gateway initialized — broadcasting on phoenix.event');
    }

    handleConnection(client: Socket) {
        client.emit('phoenix.welcome', {
            at: new Date().toISOString(),
            recentEvents: this.eventBus.recent(10),
        });
    }
}
