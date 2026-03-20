import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { TrackerClient } from '@/lib/tracker.mjs';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const key = params?.key;
  if (!key) return NextResponse.json({ error: 'Issue key required' }, { status: 400 });

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const attachments = await tracker.getAttachments(key);
    const normalized = (attachments || []).map(a => ({
      id: a.id,
      name: a.name,
      size: a.size,
      mimetype: a.mimetype,
      createdAt: a.createdAt,
      createdBy: a.createdBy?.display,
    }));
    return NextResponse.json({ attachments: normalized });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const key = params?.key;
  if (!key) return NextResponse.json({ error: 'Issue key required' }, { status: 400 });

  const tracker = new TrackerClient(session.tracker_token, process.env.TRACKER_ORG_ID);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await tracker.uploadAttachment(key, file.name, buffer, file.type);
    return NextResponse.json({ attachment: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
