import { randomUUID } from 'node:crypto';
import compression from 'compression';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { AppError } from './common/app-error';
import { responseSchemas } from './contract/responses';
import type { Deps } from './core/deps';
import { mountRoutes } from './core/http';
import { requestContext } from './core/request-context';
import { buildOpenApi } from './core/openapi';
import { LocalStorage } from './core/storage';
import { errorHandler, notFoundHandler } from './middleware/errors';
import { allRoutes } from './routes';

const SWAGGER_HTML = `<!doctype html>
<html lang="uz">
  <head>
    <meta charset="utf-8" />
    <title>Mahalladosh API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  </head>
  <body>
    <div id="ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#ui', deepLinking: true });
    </script>
  </body>
</html>`;

function parseTrustProxy(v: string): boolean | number | string {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

async function check(fn: () => Promise<unknown>, timeoutMs = 2000): Promise<'ok' | 'fail'> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
    return 'ok';
  } catch {
    return 'fail';
  } finally {
    clearTimeout(timer);
  }
}

export function createApp(deps: Deps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', parseTrustProxy(deps.env.TRUST_PROXY));

  app.use(
    pinoHttp({
      logger: deps.log,
      genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
      autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/ready' },
    }),
  );
  // Lokal saqlash URL'lari so'rov host'iga qaratiladi (Android emulyator, LAN, Next proksi)
  app.use((req, _res, next) => {
    requestContext.run({ baseUrl: `${req.protocol}://${req.host}` }, next);
  });
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  // Liveness: bog'liqliklarga qaramaydi. Readiness: har birini alohida hisobot qiladi.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/ready', async (_req, res) => {
    const [db, cache, storage] = await Promise.all([
      check(() => deps.db.query('SELECT 1')),
      check(() => deps.kv.ping()),
      check(() => deps.storage.ping()),
    ]);
    const ok = db === 'ok' && cache === 'ok' && storage === 'ok';
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'fail', checks: { db, cache, storage } });
  });

  // Faqat dev: OpenAPI hujjati va Swagger UI (production'da o'chiq)
  if (deps.env.NODE_ENV !== 'production') {
    let doc: unknown;
    app.get('/api/openapi.json', (_req, res) => {
      doc ??= buildOpenApi(allRoutes, responseSchemas);
      res.json(doc);
    });
    app.get('/api/docs', (_req, res) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; connect-src 'self'",
      );
      res.type('html').send(SWAGGER_HTML);
    });
  }

  const api = express.Router();
  mountRoutes(api, allRoutes, deps);

  // Lokal saqlash rejimida: HMAC imzoli, muddatli fayl URL'i (S3'ning presigned URL'iga o'xshash)
  if (deps.storage instanceof LocalStorage) {
    const storage = deps.storage;
    api.get('/files/:key', (req, res, next) => {
      const key = String(req.params['key']);
      const file = storage.verify(
        key,
        Number(req.query['exp']),
        String(req.query['sig'] ?? ''),
        deps.clock.now(),
      );
      if (!file) return next(new AppError('NOT_FOUND'));
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(file, { dotfiles: 'allow' }, (err) => {
        if (err && !res.headersSent) next(new AppError('NOT_FOUND'));
      });
    });
  }

  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler(deps.log));
  return app;
}
