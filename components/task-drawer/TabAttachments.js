'use client';
import { formatBytes, fmtDate } from './utils';

export default function TabAttachments({ attachments, loading, uploading, onUpload }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-2xs text-white/25">Файлы задачи</div>
        <label className={`text-2xs px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors cursor-pointer ${
          uploading
            ? 'text-white/30 bg-white/[0.03] pointer-events-none'
            : 'text-craft-accent bg-craft-accent/10 hover:bg-craft-accent/20'
        }`}>
          {uploading ? 'Загрузка...' : 'Загрузить файл'}
          <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-2xs text-white/25">Загрузка вложений...</div>
        ) : !attachments || attachments.length === 0 ? (
          <div className="text-2xs text-white/20">Вложений пока нет</div>
        ) : (
          attachments.map((a, i) => (
            <div key={a.id || `${a.url || 'f'}-${i}`} className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2.5">
              <div className="flex items-center justify-between gap-2">
                <a
                  href={a.downloadUrl || a.url || a.content || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xs text-craft-accent hover:underline truncate flex items-center gap-1.5 min-w-0"
                >
                  {a.downloadUrl && (
                    <svg className="w-3.5 h-3.5 shrink-0 opacity-80" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                      <path d="M8 2v8M8 10l3-3M8 10L5 7M3 12h10" />
                    </svg>
                  )}
                  <span className="truncate">{a.name || a.filename || `Файл ${i + 1}`}</span>
                </a>
                <span className="text-2xs text-white/20 shrink-0">{formatBytes(a.size || a.bytes || 0)}</span>
              </div>
              <div className="text-2xs text-white/25 mt-1">
                {a.createdBy || a.author || 'Автор'} • {fmtDate(a.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
