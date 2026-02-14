import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { forumService, canEditComment, editTimeRemaining, EDIT_WINDOW_MS } from '../services/forumService';
import { MessageSquare, Send, Edit2, Trash2, ThumbsUp, X, AlertCircle, Clock, Lock } from 'lucide-react';
import Avatar from './Avatar';

function EditTimer({ createdAt, onExpire }) {
  const { t, tf } = useLanguage();
  const [remaining, setRemaining] = useState(() => editTimeRemaining(createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const r = editTimeRemaining(createdAt);
      setRemaining(r);
      if (!r) { clearInterval(interval); onExpire && onExpire(); }
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, onExpire]);

  if (!remaining) return (
    <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
      <Lock size={11} /> {t('forum.editLocked')}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
      <Clock size={11} /> {tf('forum.editIn', { remaining })}
    </span>
  );
}

export default function QuestionForum({ question, onClose }) {
  const { currentUser } = useAuth();
  const { isEnglish, t, tf } = useLanguage();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [openRepliesFor, setOpenRepliesFor] = useState(null);
  const [repliesByComment, setRepliesByComment] = useState({});
  const [replyDraftByComment, setReplyDraftByComment] = useState({});
  const [replySubmittingFor, setReplySubmittingFor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [, forceUpdate] = useState(0); // for timer re-render

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await forumService.getQuestionComments(question.ID);
      setComments(fetched);
    } catch { /* ignore */ }
    setLoading(false);
  }, [question.ID]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // Refresh edit-timers every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmitComment() {
    if (!newComment.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      await forumService.addComment(question.ID, currentUser.uid, currentUser.displayName || t('common.anonymous'), newComment.trim());
      setNewComment('');
      await loadComments();
    } catch (error) {
      alert(tf('forum.failedAddCommentWithReason', { reason: error.message }));
    }
    setSubmitting(false);
  }

  async function handleEditComment(commentId) {
    if (!editText.trim()) return;
    try {
      await forumService.updateComment(commentId, editText.trim());
      setEditingId(null);
      setEditText('');
      await loadComments();
    } catch (error) {
      if (error.message === 'EDIT_EXPIRED') {
        alert(t('forum.editExpiredLong'));
        setEditingId(null);
      } else {
        alert(t('forum.failedUpdateComment'));
      }
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm(t('forum.confirmDeleteComment'))) return;
    try {
      await forumService.deleteComment(commentId);
      await loadComments();
    } catch { alert(t('forum.failedDeleteComment')); }
  }

  async function handleToggleLike(commentId) {
    if (!currentUser) { alert(t('forum.pleaseLoginToLikeComments')); return; }
    const uid = currentUser.uid;
    const senderName = currentUser.displayName || t('common.anonymous');

    let prevComment = null;
    setComments((prev) => {
      const next = prev.map((c) => {
        if (c.id !== commentId) return c;
        prevComment = c;
        const prevLikedBy = Array.isArray(c.likedBy) ? c.likedBy : [];
        const hasLiked = prevLikedBy.includes(uid);
        const nextLikedBy = hasLiked ? prevLikedBy.filter(id => id !== uid) : [...prevLikedBy, uid];
        const nextLikes = Math.max(0, Number(c.likes || 0) + (hasLiked ? -1 : 1));
        return { ...c, likedBy: nextLikedBy, likes: nextLikes };
      });
      return next;
    });

    try {
      await forumService.toggleLike(commentId, uid, senderName);
    } catch {
      if (prevComment) {
        setComments((prev) => prev.map((c) => (c.id === commentId ? prevComment : c)));
      }
    }
  }

  async function handleToggleReplies(commentId) {
    if (openRepliesFor === commentId) {
      setOpenRepliesFor(null);
      return;
    }

    setOpenRepliesFor(commentId);
    if (!repliesByComment[commentId]) {
      try {
        const replies = await forumService.getCommentReplies(commentId);
        setRepliesByComment(prev => ({ ...prev, [commentId]: replies }));
      } catch { /* ignore */ }
    }
  }

  async function handleSubmitReply(commentId) {
    if (!currentUser) return;
    const text = (replyDraftByComment[commentId] || '').trim();
    if (!text) return;
    setReplySubmittingFor(commentId);
    try {
      await forumService.addCommentReply(commentId, currentUser.uid, currentUser.displayName || t('common.anonymous'), text);
      setReplyDraftByComment(prev => ({ ...prev, [commentId]: '' }));
      const replies = await forumService.getCommentReplies(commentId);
      setRepliesByComment(prev => ({ ...prev, [commentId]: replies }));
    } catch (error) {
      alert(tf('forum.failedReplyWithReason', { reason: error.message }));
    }
    setReplySubmittingFor(null);
  }

  async function handleToggleReplyLike(replyId) {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const senderName = currentUser.displayName || t('common.anonymous');
    const parentId = openRepliesFor;
    if (!parentId) {
      try { await forumService.toggleCommentReplyLike(replyId, uid, senderName); } catch { /* ignore */ }
      return;
    }

    let prevReply = null;
    setRepliesByComment((prev) => {
      const list = Array.isArray(prev[parentId]) ? prev[parentId] : [];
      const nextList = list.map((r) => {
        if (r.id !== replyId) return r;
        prevReply = r;
        const prevLikedBy = Array.isArray(r.likedBy) ? r.likedBy : [];
        const hasLiked = prevLikedBy.includes(uid);
        const nextLikedBy = hasLiked ? prevLikedBy.filter(id => id !== uid) : [...prevLikedBy, uid];
        const nextLikes = Math.max(0, Number(r.likes || 0) + (hasLiked ? -1 : 1));
        return { ...r, likedBy: nextLikedBy, likes: nextLikes };
      });
      return { ...prev, [parentId]: nextList };
    });

    try {
      await forumService.toggleCommentReplyLike(replyId, uid, senderName);
    } catch {
      if (prevReply) {
        setRepliesByComment((prev) => {
          const list = Array.isArray(prev[parentId]) ? prev[parentId] : [];
          return { ...prev, [parentId]: list.map((r) => (r.id === replyId ? prevReply : r)) };
        });
      }
    }
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return t('forum.justNow');
    if (diffMins < 60) return tf('forum.timeAgoMinutes', { count: diffMins });
    if (diffHours < 24) return tf('forum.timeAgoHours', { count: diffHours });
    if (diffDays < 7) return tf('forum.timeAgoDays', { count: diffDays });
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 p-6 rounded-t-2xl z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
                <MessageSquare className="text-lab-blue" size={24} />
                {t('forum.discussion')}
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-blue-100 text-lab-blue px-2 py-1 rounded font-bold">{question.Topic}</span>
                {question.DSEcode && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{question.DSEcode}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"><X size={24} /></button>
          </div>
        </div>

        {/* Question */}
        <div className="p-6 bg-slate-50 border-b-2 border-slate-200">
          <div className="prose prose-slate max-w-none text-base text-slate-800 font-medium whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: question.Question }} />
          {question.Pictureurl && (
            <div className="mt-4 flex justify-center">
              <img src={question.Pictureurl} alt="Question Diagram" className="max-w-full h-auto max-h-[200px] object-contain rounded-lg border-2 border-slate-200" />
            </div>
          )}
        </div>

        {/* Comment Input */}
        {currentUser ? (
          <div className="p-6 border-b-2 border-slate-200 bg-white">
            <div className="flex gap-3">
              <Avatar userId={currentUser.uid} displayName={currentUser.displayName} size="md" />
              <div className="flex-1">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder={t('forum.shareYourThoughts')}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lab-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none" rows="3" />
                <div className="flex justify-end mt-2">
                  <button onClick={handleSubmitComment} disabled={!newComment.trim() || submitting}
                    className="flex items-center gap-2 px-6 py-2 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all">
                    {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={16} />}
                    {t('forum.post')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 border-b-2 border-slate-200 bg-amber-50">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertCircle size={20} />
              <p className="font-semibold">{t('forum.pleaseLoginJoinDiscussion')}</p>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-blue" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">{t('forum.noCommentsYet')}</p>
              <p className="text-slate-500 text-sm">{t('forum.beFirstToShareThoughts')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 mb-4">{tf('forum.commentsCount', { count: comments.length })}</h3>
              {comments.map(comment => {
                const isOwner = currentUser && comment.userId === currentUser.uid;
                const editable = isOwner && canEditComment(comment.createdAt);
                return (
                  <div key={comment.id} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar userId={comment.userId} displayName={comment.userDisplayName} size="sm" />
                        <div>
                          <div className="font-bold text-slate-800">{comment.userDisplayName || t('common.anonymous')}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            {formatDate(comment.createdAt)}
                            {comment.edited && <span className="text-slate-400 italic">({t('forum.edited')})</span>}
                          </div>
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-2">
                          {/* Edit timer badge */}
                          {editingId !== comment.id && (
                            <EditTimer createdAt={comment.createdAt} onExpire={() => forceUpdate(n => n + 1)} />
                          )}
                          {editable && (
                            <button onClick={() => { setEditingId(comment.id); setEditText(comment.text); }}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-all" title={t('common.edit')}>
                              <Edit2 size={16} className="text-lab-blue" />
                            </button>
                          )}
                          {!editable && editingId !== comment.id && (
                            <button disabled title={t('forum.editWindowExpired')}
                              className="p-2 opacity-30 cursor-not-allowed rounded-lg">
                              <Lock size={16} className="text-slate-400" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteComment(comment.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-all" title={t('common.delete')}>
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === comment.id ? (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2 text-xs text-amber-600 font-semibold">
                          <Clock size={12} />
                          {t('forum.editWindowLabel')}
                          <EditTimer createdAt={comment.createdAt} onExpire={() => { setEditingId(null); forceUpdate(n => n + 1); }} />
                        </div>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-lab-blue outline-none resize-none" rows="3" />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleEditComment(comment.id)}
                            className="px-4 py-2 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-700 transition-all text-sm">
                            {t('common.save')}
                          </button>
                          <button onClick={() => { setEditingId(null); setEditText(''); }}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-all text-sm">
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap">{comment.text}</p>
                        <div className="mt-3 pt-3 border-t border-slate-300">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleLike(comment.id)} disabled={!currentUser}
                              className={`flex items-center gap-2 px-3 py-1 rounded-lg font-semibold text-sm transition-all ${comment.likedBy?.includes(currentUser?.uid) ? 'bg-blue-100 text-lab-blue' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} ${!currentUser ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <ThumbsUp size={14} fill={comment.likedBy?.includes(currentUser?.uid) ? 'currentColor' : 'none'} />
                              {comment.likes || 0}
                            </button>
                            <button onClick={() => handleToggleReplies(comment.id)}
                              className="px-3 py-1 rounded-lg font-semibold text-sm bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all">
                              {openRepliesFor === comment.id ? t('forum.hideReplies') : t('forum.reply')}
                            </button>
                          </div>

                          {openRepliesFor === comment.id && (
                            <div className="mt-4 space-y-3">
                              <div className="space-y-2">
                                {(repliesByComment[comment.id] || []).map(r => (
                                  <div key={r.id} className="bg-white rounded-lg border-2 border-slate-200 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        <Avatar userId={r.userId} displayName={r.userDisplayName} size="xs" />
                                        <div>
                                          <div className="font-bold text-slate-800 text-sm">{r.userDisplayName || t('common.anonymous')}</div>
                                          <div className="text-xs text-slate-500">{r.CreatedAt ? formatDate(r.CreatedAt) : ''}</div>
                                        </div>
                                      </div>
                                      <button onClick={() => handleToggleReplyLike(r.id)} disabled={!currentUser}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${r.likedBy?.includes(currentUser?.uid) ? 'bg-blue-100 text-lab-blue' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} ${!currentUser ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <ThumbsUp size={12} fill={r.likedBy?.includes(currentUser?.uid) ? 'currentColor' : 'none'} />
                                        {r.likes || 0}
                                      </button>
                                    </div>
                                    <p className="text-slate-700 text-sm mt-2 whitespace-pre-wrap">{r.text}</p>
                                  </div>
                                ))}
                              </div>

                              {currentUser ? (
                                <div className="bg-white rounded-lg border-2 border-slate-200 p-3">
                                  <div className="flex gap-2">
                                    <Avatar userId={currentUser.uid} displayName={currentUser.displayName} size="xs" />
                                    <div className="flex-1">
                                      <textarea
                                        value={replyDraftByComment[comment.id] || ''}
                                        onChange={(e) => setReplyDraftByComment(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                        rows="2"
                                        placeholder={t('forum.writeReply')}
                                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-lab-blue outline-none resize-none text-sm"
                                      />
                                      <div className="flex justify-end mt-2">
                                        <button onClick={() => handleSubmitReply(comment.id)}
                                          disabled={replySubmittingFor === comment.id || !(replyDraftByComment[comment.id] || '').trim()}
                                          className="flex items-center gap-2 px-4 py-1.5 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all text-sm">
                                          {replySubmittingFor === comment.id ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Send size={14} />}
                                          {t('forum.reply')}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm font-semibold text-amber-800 bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                                  {t('forum.pleaseLoginReply')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}