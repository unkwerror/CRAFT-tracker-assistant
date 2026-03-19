// ═══ /api/onboarding — прогресс онбординга ═══

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session.mjs';
import { supabase, ONBOARDING_STEPS } from '@/lib/config.mjs';

// GET — получить прогресс
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: progress } = await supabase
    .from('onboarding')
    .select('step_id, completed, completed_at')
    .eq('user_id', session.uid)
    .order('step_id');

  // Объединить шаги с прогрессом
  const steps = ONBOARDING_STEPS.map(step => {
    const p = (progress || []).find(pr => pr.step_id === step.id);
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
}

// PATCH — отметить шаг выполненным/невыполненным
export async function PATCH(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { step_id, completed } = await request.json();

  if (!step_id || step_id < 1 || step_id > ONBOARDING_STEPS.length) {
    return NextResponse.json({ error: 'Invalid step_id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('onboarding')
    .upsert({
      user_id: session.uid,
      step_id,
      completed: !!completed,
      completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,step_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, step: data });
}
