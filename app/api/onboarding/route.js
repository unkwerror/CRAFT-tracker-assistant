// ═══ /api/onboarding — прогресс онбординга ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { hasPermission } from '@/lib/api-helpers.mjs';
import { isDbConnected, getOnboardingProgress, upsertOnboardingStep, query } from '@/lib/db.mjs';
import { ONBOARDING_STEPS } from '@/lib/config.mjs';

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!isDbConnected()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get('all') === 'true') {
    const isAdmin = await hasPermission(session, 'admin:panel');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    try {
      const totalSteps = ONBOARDING_STEPS.length;
      const { rows } = await query(
        `SELECT user_id, COUNT(*) FILTER (WHERE completed = TRUE) as done
         FROM onboarding GROUP BY user_id`
      );
      const progress = {};
      for (const r of rows) {
        progress[r.user_id] = Math.round((parseInt(r.done) / totalSteps) * 100);
      }
      return NextResponse.json({ progress });
    } catch (err) {
      return NextResponse.json({ progress: {} });
    }
  }

  try {
    const progress = await getOnboardingProgress(session.uid);

    const steps = ONBOARDING_STEPS.map(step => {
      const p = progress.find(pr => pr.step_id === step.id);
      return {
        ...step,
        completed: p?.completed || false,
        completed_at: p?.completed_at || null,
      };
    });

    const completed = steps.filter(s => s.completed).length;

    return NextResponse.json({
      steps,
      completed,
      total: steps.length,
      percent: Math.round((completed / steps.length) * 100),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!isDbConnected()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  const { step_id, completed } = await request.json();

  if (!step_id || step_id < 1 || step_id > ONBOARDING_STEPS.length) {
    return NextResponse.json({ error: 'Invalid step_id' }, { status: 400 });
  }

  try {
    const step = await upsertOnboardingStep(session.uid, step_id, !!completed);
    return NextResponse.json({ success: true, step });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
