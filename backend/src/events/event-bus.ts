import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface PhoenixEvent {
    type: string; // e.g. graph.updated, agent.completed, decision.made, auth.login
    resource: string;
    detail: string;
    payload?: Record<string, unknown>;
    at: string;
}

/**
 * Global event bus for the Organizational Digital Brain.
 * All subsystems (graph, agents, decisions, docs, auth) emit lifecycle
 * events here. The gateway subscribes and pushes them to WebSocket clients.
 */
@Injectable()
export class EventBus {
    private readonly emitter = new EventEmitter();
    private readonly history: PhoenixEvent[] = [];
    private static readonly MAX_HISTORY = 500;

    emit(type: string, resource: string, detail: string, payload?: Record<string, unknown>): void {
        const event: PhoenixEvent = { type, resource, detail, payload, at: new Date().toISOString() };
        this.history.push(event);
        if (this.history.length > EventBus.MAX_HISTORY) {
            this.history.splice(0, this.history.length - EventBus.MAX_HISTORY);
        }
        this.emitter.emit('phoenix.event', event);
    }

    subscribe(listener: (event: PhoenixEvent) => void): () => void {
        this.emitter.on('phoenix.event', listener);
        return () => this.emitter.off('phoenix.event', listener);
    }

    recent(limit = 50): PhoenixEvent[] {
        return this.history.slice(-limit).reverse();
    }

    count(): number {
        return this.history.length;
    }
}
