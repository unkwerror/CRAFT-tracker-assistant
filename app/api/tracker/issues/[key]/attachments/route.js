import { requireAuth, jsonOk, jsonError } from '@/lib/api-helpers.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const key = params?.key;
  if (!key) return jsonError('Issue key required', 400);

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const attachments = await tracker.getAttachments(key);
    const normalized = (attachments || []).map(a => ({
      id: a.id,
      name: a.name,
      size: a.size,
      mimetype: a.mimetype,
      createdAt: a.createdAt,
      createdBy: a.createdBy?.display,
      downloadUrl: a.content || null,
    }));
    return jsonOk({ attachments: normalized });
  } catch (err) {
    console.error('Attachments GET error:', err.message);
    return jsonError(err.message, 502);
  }
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { session } = auth;

  const key = params?.key;
  if (!key) return jsonError('Issue key required', 400);

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);
  if (!tracker.enabled) return jsonError('Tracker not configured', 503);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return jsonError('File required', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await tracker.uploadAttachment(key, file.name, buffer, file.type);
    return jsonOk({ attachment: result }, 201);
  } catch (err) {
    console.error('Attachments POST error:', err.message);
    return jsonError(err.message, 502);
  }
}
