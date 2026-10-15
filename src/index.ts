import express, { Request, Response } from 'express';
import cors from 'cors';

/**
 * MVP SMS-forwarder backend.
 *
 * The Flutter app POSTs every matching SMS here. This service just validates
 * the payload, logs it, and acknowledges. Swap the `handleSms` body for your
 * real logic (persist to DB, parse a payment, enqueue a job, etc.).
 */

const PORT = Number(process.env.PORT ?? 3000);

// Shared secret so random callers can't post to your endpoint.
// Set the SAME value in the app (ApiConfig.sharedSecret).
const SHARED_SECRET = process.env.SHARED_SECRET ?? 'change-me-in-production';

interface ForwardedSms {
  sender: string;        // originating address, e.g. "JazzCash"
  body: string;          // full message text
  receivedAt: number;    // epoch millis, set on the device
  deviceId: string;      // stable per-install id from the app
}

function isForwardedSms(value: unknown): value is ForwardedSms {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sender === 'string' &&
    typeof v.body === 'string' &&
    typeof v.receivedAt === 'number' &&
    typeof v.deviceId === 'string'
  );
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.post('/sms', (req: Request, res: Response) => {
  if (req.header('x-shared-secret') !== SHARED_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!isForwardedSms(req.body)) {
    return res.status(400).json({ error: 'invalid payload' });
  }

  handleSms(req.body);
  return res.status(200).json({ received: true });
});

function handleSms(sms: ForwardedSms): void {
  // ---- your real processing goes here ----
  console.log(
    `[SMS] from=${sms.sender} device=${sms.deviceId} at=${new Date(
      sms.receivedAt,
    ).toISOString()}\n      body=${sms.body}`,
  );
}

app.listen(PORT, () => {
  console.log(`SMS forwarder backend listening on http://localhost:${PORT}`);
});
