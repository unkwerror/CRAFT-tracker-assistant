'use client';
import { useState, useEffect, useCallback } from 'react';
import { Drawer } from 'vaul';
import { motion, AnimatePresence } from 'framer-motion';
import { readResponse } from './task-drawer/utils';
import TabOverview from './task-drawer/TabOverview';
import TabComments from './task-drawer/TabComments';
import TabHistory from './task-drawer/TabHistory';
import TabAttachments from './task-drawer/TabAttachments';

const TABS = [
  { key: 'overview',     label: 'Обзор' },
  { key: 'comments',     label: 'Комментарии' },
  { key: 'history',      label: 'История' },
  { key: 'attachments',  label: 'Вложения' },
];

export default function TaskDrawer({ issueKey, open, onClose }) {
  const [tab, setTab] = useState('overview');

  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [editing, setEditing]     = useState(false);
  const [editFields, setEditFields] = useState({ summary: '', description: '' });
  const [saving, setSaving]       = useState(false);

  const [transitions, setTransitions]       = useState([]);
  const [loadingTransitions, setLoadingT]   = useState(false);

  const [comments, setComments]             = useState(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText]       = useState('');
  const [commentSending, setCommentSending] = useState(false);

  const [history, setHistory]               = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [attachments, setAttachments]               = useState(null);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploading, setUploading]                   = useState(false);

  const reset = useCallback(() => {
    setTab('overview');
    setDetail(null); setEditing(false); setEditFields({ summary: '', description: '' });
    setTransitions([]); setComments(null); setHistory(null); setAttachments(null);
    setCommentText('');
  }, []);

  useEffect(() => {
    if (!open || !issueKey) { reset(); return; }
    setLoading(true);
    setLoadingT(true);

    fetch(`/api/tracker/issues/${issueKey}`)
      .then(readResponse)
      .then(d => {
        const issue = d.issue || null;
        setDetail(issue);
        if (issue) setEditFields({ summary: issue.summary || '', description: issue.description || '' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`/api/tracker/issues/${issueKey}/transitions`)
      .then(readResponse)
      .then(d => setTransitions(d.transitions || []))
      .catch(() => setTransitions([]))
      .finally(() => setLoadingT(false));
  }, [open, issueKey, reset]);

  useEffect(() => {
    if (tab === 'comments' && comments === null && !commentsLoading && issueKey) {
      setCommentsLoading(true);
      fetch(`/api/tracker/issues/${issueKey}/comments`)
        .then(readResponse).then(d => setComments(d.comments || []))
        .catch(() => setComments([]))
        .finally(() => setCommentsLoading(false));
    }
  }, [tab, comments, commentsLoading, issueKey]);

  useEffect(() => {
    if (tab === 'history' && history === null && !historyLoading && issueKey) {
      setHistoryLoading(true);
      fetch(`/api/tracker/issues/${issueKey}/changelog`)
        .then(readResponse).then(d => setHistory(d.changelog || []))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [tab, history, historyLoading, issueKey]);

  useEffect(() => {
    if (tab === 'attachments' && attachments === null && !attachmentsLoading && issueKey) {
      setAttachmentsLoading(true);
      fetch(`/api/tracker/issues/${issueKey}/attachments`)
        .then(readResponse).then(d => setAttachments(d.attachments || []))
        .catch(() => setAttachments([]))
        .finally(() => setAttachmentsLoading(false));
    }
  }, [tab, attachments, attachmentsLoading, issueKey]);

  const handleSave = async () => {
    if (!issueKey) return;
    const body = {};
    const task = detail;
    if (editFields.summary !== (task?.summary || '')) body.summary = editFields.summary;
    if (editFields.description !== (task?.description || '')) body.description = editFields.description;
    if (!Object.keys(body).length) { setEditing(false); return; }
    setSaving(true);
    try {
      const d = await fetch(`/api/tracker/issues/${issueKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(readResponse);
      setDetail(d.issue);
      setEditing(false);
    } catch (e) {
      alert(`Ошибка сохранения: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !issueKey) return;
    setCommentSending(true);
    try {
      const d = await fetch(`/api/tracker/issues/${issueKey}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() }),
      }).then(readResponse);
      setCommentText('');
      setComments(prev => [d.comment, ...(Array.isArray(prev) ? prev : [])]);
    } catch (e) {
      alert(`Ошибка комментария: ${e.message}`);
    } finally {
      setCommentSending(false);
    }
  };

  const handleTransition = async (transitionId) => {
    if (!issueKey) return;
    try {
      await fetch(`/api/tracker/issues/${issueKey}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionId }),
      }).then(readResponse);
      setTransitions([]);
      setLoadingT(true);
      const d = await fetch(`/api/tracker/issues/${issueKey}`).then(readResponse);
      setDetail(d.issue);
      setHistory(null);
      fetch(`/api/tracker/issues/${issueKey}/transitions`)
        .then(readResponse).then(x => setTransitions(x.transitions || []))
        .catch(() => {}).finally(() => setLoadingT(false));
    } catch (e) {
      alert(`Ошибка перехода: ${e.message}`);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !issueKey) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await fetch(`/api/tracker/issues/${issueKey}/attachments`, { method: 'POST', body: form }).then(readResponse);
      setAttachments(null);
      setAttachmentsLoading(true);
      fetch(`/api/tracker/issues/${issueKey}/attachments`)
        .then(readResponse).then(d => setAttachments(d.attachments || []))
        .catch(() => setAttachments([]))
        .finally(() => setAttachmentsLoading(false));
    } catch (e) {
      alert(`Ошибка загрузки файла: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const displayTask = detail || (issueKey ? { key: issueKey, summary: '...' } : null);

  return (
    <Drawer.Root open={open} onOpenChange={v => !v && onClose()} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" />
        <Drawer.Content
          className="fixed right-0 top-0 bottom-0 z-[61] flex flex-col outline-none"
          style={{ width: 'min(520px, 100vw)' }}
          aria-label={issueKey ? `Задача ${issueKey}` : 'Задача'}
        >
          <div className="flex flex-col h-full glass-modal border-l border-craft-border shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-craft-border shrink-0">
              <div className="min-w-0">
                <div className="font-mono text-white/50 text-sm">{issueKey}</div>
                {loading ? (
                  <div className="mt-1 h-4 w-48 rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <div className="text-xs text-white/30 mt-0.5">
                    {displayTask?.type || 'Задача'} • {displayTask?.priority || '—'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <motion.button
                  onClick={() => setEditing(v => !v)}
                  whileTap={{ scale: 0.97 }}
                  className={`text-2xs px-2 py-1 rounded-md transition-colors ${
                    editing ? 'bg-craft-accent/20 text-craft-accent' : 'text-white/25 hover:text-white/50'
                  }`}
                >
                  {editing ? 'Отмена' : 'Редактировать'}
                </motion.button>
                <motion.button
                  onClick={onClose}
                  whileTap={{ scale: 0.9 }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                  aria-label="Закрыть"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                    <path d="M3 3l10 10M13 3L3 13" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-craft-border bg-white/[0.01] shrink-0">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-2xs px-3 py-1.5 rounded-md transition-colors relative ${
                    tab === t.key ? 'text-craft-accent' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {tab === t.key && (
                    <motion.div
                      layoutId="drawer-tab-indicator"
                      className="absolute inset-0 bg-craft-accent/15 rounded-md"
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <span className="relative">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="h-full"
                >
                  {tab === 'overview' && displayTask && (
                    <TabOverview
                      task={displayTask}
                      editing={editing}
                      editFields={editFields}
                      onEditChange={partial => setEditFields(f => ({ ...f, ...partial }))}
                      onSave={handleSave}
                      saving={saving}
                      transitions={transitions}
                      loadingTransitions={loadingTransitions}
                      onTransition={handleTransition}
                    />
                  )}
                  {tab === 'comments' && (
                    <TabComments
                      comments={comments}
                      loading={commentsLoading}
                      text={commentText}
                      onTextChange={setCommentText}
                      onSend={handleSendComment}
                      sending={commentSending}
                    />
                  )}
                  {tab === 'history' && (
                    <TabHistory history={history} loading={historyLoading} />
                  )}
                  {tab === 'attachments' && (
                    <TabAttachments
                      attachments={attachments}
                      loading={attachmentsLoading}
                      uploading={uploading}
                      onUpload={handleUpload}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            {displayTask?.key && displayTask.key !== '...' && (
              <div className="px-5 py-3 border-t border-craft-border shrink-0">
                <a
                  href={displayTask.url || `https://tracker.yandex.ru/${displayTask.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-craft-accent text-2xs hover:underline"
                >
                  Открыть в Трекере →
                </a>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
