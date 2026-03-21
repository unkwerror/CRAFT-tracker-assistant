'use client';
import { motion } from 'framer-motion';
import { fmtDate } from './utils';

export default function TabOverview({
  task,
  editing,
  editFields,
  onEditChange,
  onSave,
  saving,
  transitions,
  loadingTransitions,
  onTransition,
}) {
  return (
    <div className="space-y-4">
      {editing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editFields.summary}
            onChange={e => onEditChange({ summary: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-craft-accent/40"
          />
          <textarea
            value={editFields.description}
            onChange={e => onEditChange({ description: e.target.value })}
            rows={5}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-2xs text-white/60 focus:outline-none focus:border-craft-accent/40 resize-none"
            placeholder="Описание..."
          />
          <motion.button
            onClick={onSave}
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            className="text-2xs px-3 py-1.5 rounded-lg bg-craft-accent/20 text-craft-accent hover:bg-craft-accent/30 transition-colors disabled:opacity-40"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </motion.button>
        </div>
      ) : (
        <>
          <div className="text-[15px] font-medium leading-snug">{task.summary}</div>
          {task.description && (
            <div className="text-2xs text-white/40 whitespace-pre-wrap border-l-2 border-white/10 pl-3">
              {task.description}
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-2 text-2xs">
        {[
          { label: 'Статус',      value: task.status },
          { label: 'Исполнитель', value: task.assignee || 'Не назначен' },
          { label: 'Очередь',    value: task.queue || task.queueKey || '—' },
          { label: 'Приоритет',  value: task.priority || '—' },
          { label: 'Создан',     value: fmtDate(task.createdAt) },
          { label: 'Обновлён',   value: fmtDate(task.updatedAt) },
          ...(task.deadline ? [{ label: 'Дедлайн', value: fmtDate(task.deadline) }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/[0.03] rounded-lg p-2">
            <div className="text-white/25">{label}</div>
            <div className="text-white/70 mt-0.5 truncate">{value}</div>
          </div>
        ))}
      </div>

      {task.customFields && Object.keys(task.customFields).length > 0 && (
        <div>
          <div className="text-2xs text-white/25 mb-2">Доп. поля</div>
          <div className="space-y-1">
            {Object.entries(task.customFields).map(([k, v]) => (
              <div key={k} className="flex justify-between text-2xs gap-2">
                <span className="text-white/30 truncate">{k}</span>
                <span className="text-white/60 truncate max-w-[55%]">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-craft-border pt-3">
        <div className="text-2xs text-white/25 mb-2">Сменить статус</div>
        {loadingTransitions ? (
          <div className="flex items-center gap-2 text-2xs text-white/20">
            <div className="w-3 h-3 border border-white/10 border-t-white/30 rounded-full animate-spin" />
            Загрузка переходов...
          </div>
        ) : transitions.length === 0 ? (
          <div className="text-2xs text-white/20">Нет доступных переходов</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {transitions.map(t => (
              <motion.button
                key={t.id}
                onClick={() => onTransition(t.id, t.toDisplay || t.display)}
                whileTap={{ scale: 0.97 }}
                className="text-2xs px-2.5 py-1.5 rounded-lg bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors border border-white/[0.06]"
              >
                → {t.toDisplay || t.display}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
