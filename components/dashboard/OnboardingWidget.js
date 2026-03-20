'use client';
import { useState, useEffect, useCallback } from 'react';

const STEPS = [
  { id: 1,  title: 'Войти в Трекер', desc: 'Откройте tracker.yandex.ru и войдите рабочим аккаунтом', link: 'https://tracker.yandex.ru' },
  { id: 2,  title: 'Установить приложение', desc: 'Скачайте «Яндекс Трекер» на телефон' },
  { id: 3,  title: 'Настроить «Мою страницу»', desc: 'Добавьте виджет «Мои задачи»', link: 'https://tracker.yandex.ru/pages/my' },
  { id: 4,  title: 'Найти свои задачи', desc: 'Фильтр: Исполнитель = Я' },
  { id: 5,  title: 'Открыть задачу', desc: 'Кликните на любую задачу' },
  { id: 6,  title: 'Перевести «В работу»', desc: 'Нажмите кнопку смены статуса' },
  { id: 7,  title: 'Написать комментарий', desc: 'Добавьте комментарий к задаче' },
  { id: 8,  title: 'Внести время', desc: 'Учёт времени — введите «1ч»' },
  { id: 9,  title: 'Открыть канбан', desc: 'Доска вашей очереди' },
  { id: 10, title: 'Настроить уведомления', desc: 'Email и push-уведомления' },
];

const KEY = 'craft_onboarding';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (p) => localStorage.setItem(KEY, JSON.stringify(p));

export default function OnboardingWidget({ userId, useSupabase = false }) {
  const [progress, setProgress] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [justToggled, setJustToggled] = useState(null);

  useEffect(() => {
    if (useSupabase) {
      fetch('/api/onboarding').then(r => r.json())
        .then(data => { const m = {}; (data.steps||[]).forEach(s => { if(s.completed) m[s.step_id]=true; }); setProgress(m); })
        .catch(() => setProgress(load()));
    } else { setProgress(load()); }
  }, [useSupabase]);

  const toggle = useCallback((id) => {
    setJustToggled(id);
    setTimeout(() => setJustToggled(null), 400);
    setProgress(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (useSupabase) {
        fetch('/api/onboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step_id: id, completed: next[id] }) }).catch(() => {});
      } else { save(next); }
      return next;
    });
  }, [useSupabase]);

  const done = Object.values(progress).filter(Boolean).length;
  const total = STEPS.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;
  const PREVIEW = 4;

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-craft-border2">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Онбординг</h2>
        <span className="text-2xs text-white/25">{done} / {total}</span>
      </div>

      {/* Progress */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, background: allDone ? 'var(--craft-green)' : 'linear-gradient(90deg, var(--craft-accent), var(--craft-purple))' }} />
          </div>
          <span className={`text-2xs font-mono transition-colors duration-500 ${allDone ? 'text-craft-green' : 'text-white/25'}`}>{pct}%</span>
        </div>
      </div>

      {/* Preview steps */}
      <div className="px-3 py-2">
        {STEPS.slice(0, PREVIEW).map(s => (
          <StepRow key={s.id} step={s} done={!!progress[s.id]} justToggled={justToggled === s.id} onToggle={toggle} />
        ))}
      </div>

      {/* Expandable rest */}
      {total > PREVIEW && (
        <>
          <div className={`expand-section ${expanded ? 'open' : ''}`}>
            <div>
              <div className="px-3 pb-2">
                {STEPS.slice(PREVIEW).map(s => (
                  <StepRow key={s.id} step={s} done={!!progress[s.id]} justToggled={justToggled === s.id} onToggle={toggle} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => setExpanded(v => !v)}
            className="w-full py-2.5 text-2xs text-white/20 hover:text-white/40 border-t border-white/[0.04] transition-all duration-200 hover:bg-white/[0.02]">
            {expanded ? 'Свернуть' : `Показать все ${total} шагов`}
          </button>
        </>
      )}
    </div>
  );
}

function StepRow({ step, done, justToggled, onToggle }) {
  return (
    <button onClick={() => onToggle(step.id)}
      className="w-full flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.02] transition-all duration-200 text-left group">
      <div className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300
        ${done ? 'bg-craft-green/15 border-craft-green/30' : 'border-white/10 group-hover:border-white/20'}`}>
        {done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={justToggled ? 'animate-checkmark' : ''}>
            <path d="M2 5l2.5 2.5L8 3" stroke="var(--craft-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[12px] transition-all duration-300 ${done ? 'text-white/25 line-through' : 'text-white/70'}`}>{step.title}</div>
        <div className="text-[11px] text-white/15 mt-0.5">{step.desc}</div>
        {step.link && !done && (
          <a href={step.link} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
            className="text-[11px] text-craft-accent/40 hover:text-craft-accent mt-0.5 inline-block transition-colors duration-200">Открыть →</a>
        )}
      </div>
    </button>
  );
}
