'use client';
import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_STEPS = [
  { id: 1,  title: 'Войти в Трекер', desc: 'Откройте tracker.yandex.ru и войдите рабочим аккаунтом', link: 'https://tracker.yandex.ru' },
  { id: 2,  title: 'Установить мобильное приложение', desc: 'Скачайте «Яндекс Трекер» на телефон', link: null },
  { id: 3,  title: 'Настроить «Мою страницу»', desc: 'Добавьте виджет «Мои задачи» на стартовую', link: 'https://tracker.yandex.ru/pages/my' },
  { id: 4,  title: 'Найти свои задачи', desc: 'Фильтр: Исполнитель = Я', link: null },
  { id: 5,  title: 'Открыть задачу', desc: 'Кликните на любую задачу, прочитайте описание', link: null },
  { id: 6,  title: 'Перевести задачу «В работу»', desc: 'Нажмите кнопку смены статуса', link: null },
  { id: 7,  title: 'Написать комментарий', desc: 'Добавьте комментарий к любой задаче', link: null },
  { id: 8,  title: 'Внести время', desc: 'Правая панель — Учёт времени — введите «1ч»', link: null },
  { id: 9,  title: 'Открыть канбан-доску', desc: 'Перейдите на доску вашей очереди', link: null },
  { id: 10, title: 'Настроить уведомления', desc: 'Включите email и push-уведомления', link: null },
];

const STORAGE_KEY = 'craft_onboarding';

function loadProgress() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveProgress(progress) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export default function OnboardingWidget({ userId, useSupabase = false }) {
  const [progress, setProgress] = useState({});
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (useSupabase) {
      fetch('/api/onboarding')
        .then(r => r.json())
        .then(data => {
          const map = {};
          (data.steps || []).forEach(s => { if (s.completed) map[s.step_id] = true; });
          setProgress(map);
        })
        .catch(() => setProgress(loadProgress()));
    } else {
      setProgress(loadProgress());
    }
  }, [useSupabase]);

  const toggleStep = useCallback((stepId) => {
    setProgress(prev => {
      const next = { ...prev, [stepId]: !prev[stepId] };
      if (useSupabase) {
        fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step_id: stepId, completed: next[stepId] }),
        }).catch(() => {});
      } else {
        saveProgress(next);
      }
      return next;
    });
  }, [useSupabase]);

  const completed = Object.values(progress).filter(Boolean).length;
  const total = ONBOARDING_STEPS.length;
  const percent = Math.round((completed / total) * 100);
  const allDone = completed === total;
  const visibleSteps = expanded ? ONBOARDING_STEPS : ONBOARDING_STEPS.slice(0, 4);

  return (
    <div className="bg-craft-surface border border-craft-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-craft-border">
        <h2 className="text-[13px] font-display font-medium tracking-tight">Онбординг</h2>
        <span className="text-2xs text-white/25">{completed} из {total}</span>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${percent}%`,
                background: allDone ? 'var(--craft-green)' : 'linear-gradient(90deg, var(--craft-accent), var(--craft-purple))',
              }}
            />
          </div>
          <span className={`text-2xs font-mono transition-colors duration-300 ${allDone ? 'text-craft-green' : 'text-white/30'}`}>
            {percent}%
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="px-3 py-2">
        {visibleSteps.map((step, i) => {
          const done = !!progress[step.id];
          return (
            <button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className="w-full flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.02] transition-all duration-200 text-left group"
            >
              <div className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300
                ${done ? 'bg-craft-green/15 border-craft-green/30 scale-100' : 'border-white/10 group-hover:border-white/20 scale-100'}`}>
                <svg
                  width="10" height="10" viewBox="0 0 10 10" fill="none"
                  className={`transition-all duration-300 ${done ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                >
                  <path d="M2 5l2.5 2.5L8 3" stroke="var(--craft-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[12px] transition-all duration-300 ${done ? 'text-white/25 line-through' : 'text-white/70'}`}>
                  {step.title}
                </div>
                <div className="text-[11px] text-white/20 mt-0.5 leading-relaxed">{step.desc}</div>
                {step.link && !done && (
                  <a href={step.link} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
                    className="text-[11px] text-craft-accent/40 hover:text-craft-accent mt-1 inline-block transition-colors duration-200">
                    Открыть →
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {total > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 text-2xs text-white/20 hover:text-white/40 border-t border-white/[0.04] transition-colors duration-200"
        >
          {expanded ? 'Свернуть' : `Показать все ${total} шагов`}
        </button>
      )}
    </div>
  );
}
