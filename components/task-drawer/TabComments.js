'use client';
import { motion } from 'framer-motion';
import { fmtDate } from './utils';

export default function TabComments({ comments, loading, text, onTextChange, onSend, sending }) {
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
        {loading ? (
          <div className="text-2xs text-white/25">Загрузка комментариев...</div>
        ) : !comments || comments.length === 0 ? (
          <div className="text-2xs text-white/20">Комментариев пока нет</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2.5">
              <div className="text-2xs text-white/70 whitespace-pre-wrap">{c.text}</div>
              <div className="text-2xs text-white/25 mt-1">
                {c.createdBy || 'Автор'} • {fmtDate(c.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 border-t border-craft-border pt-3">
        <textarea
          rows={3}
          value={text}
          onChange={e => onTextChange(e.target.value)}
          placeholder="Добавить комментарий..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-2xs text-white/70 focus:outline-none focus:border-craft-accent/40 resize-none"
        />
        <div className="flex justify-end">
          <motion.button
            onClick={onSend}
            disabled={sending || !text.trim()}
            whileTap={{ scale: 0.97 }}
            className="text-2xs px-3 py-1.5 rounded-lg bg-craft-accent/20 text-craft-accent hover:bg-craft-accent/30 transition-colors disabled:opacity-40"
          >
            {sending ? 'Отправка...' : 'Отправить'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
