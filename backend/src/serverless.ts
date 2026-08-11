import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Vercel serverless entrypoint. Compiles to dist/serverless.js and is wrapped
 * by api/index.js. The app is bootstrapped lazily and cached per warm instance
 * so repeated invocations reuse the same Nest application.
 */
let cachedApp: unknown;

async function getExpressApp() {
    if (!cachedApp) {
        const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
        app.enableCors();
        await app.init();
        cachedApp = app.getHttpAdapter().getInstance();
    }
    return cachedApp;
}

export default async function handler(req: unknown, res: unknown) {
    const app = await getExpressApp();
    const express = app as {
        (request: unknown, response: unknown): void;
    };
    express(req, res);
}
