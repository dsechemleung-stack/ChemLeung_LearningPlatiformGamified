import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ChemistryLoading from '../components/ChemistryLoading';
import { useQuizData } from '../hooks/useQuizData';
import { forumService, canEditComment, editTimeRemaining } from '../services/forumService';
import {
  MessageSquare, ArrowLeft, Search, TrendingUp, Clock, MessageCircle,
  PlusCircle, X, Send, Edit2, Trash2, ThumbsUp, Bell, BellDot,
  Lock, Tag, Pin, ChevronLeft, AlertCircle
} from 'lucide-react';
import QuestionForum from '../components/QuestionForum';
import ChemCityUserProfileIcon from '../components/ChemCityUserProfileIcon';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK36yaUN-NMCkQNT-DAHgc6FMZPjUc0Yv3nYEK4TA9W2qE9V1TqVD10Tq98-wXQoAvKOZlwGWRSDkU/pub?gid=1182550140&single=true&output=csv';

const CATEGORIES = ['general', 'question', 'announcement'];

function categoryLabel(t, cat) {
  if (cat === 'general') return t('forum.categoryGeneral');
  if (cat === 'question') return t('forum.categoryQuestion');
  if (cat === 'announcement') return t('forum.categoryAnnouncement');
  return String(cat || '').toUpperCase();
}

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({ userId, onClose }) {
  const { t, tf } = useLanguage();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(10);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = forumService.subscribeToNotifications(userId, (data) => {
      setNotifs(data);
      setLoading(false);
    }, limitCount);
    return () => unsub && unsub();
  }, [userId, limitCount]);

  const handleMarkAllRead = async () => {
    await forumService.markAllNotificationsRead(userId);
  };

  const handleMarkRead = async (id) => {
    await forumService.markNotificationRead(id);
  };

  const handleDelete = async (id) => {
    await forumService.deleteNotification(id);
  };

  const handleDeleteAll = async () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAll = async () => {
    await forumService.deleteAllNotifications(userId, 200);
    setShowDeleteAllConfirm(false);
  };

  const typeLabel = (n) => {
    switch (n.type) {
      case 'like': return t('forum.likedYourComment');
      case 'reply': return t('forum.repliedToPost');
      case 'post_like': return t('forum.likedYourPost');
      case 'reply_like': return t('forum.likedYourReply');
      case 'comment_reply': return t('forum.repliedToComment');
      case 'comment_reply_like': return t('forum.likedYourReply');
      default: return t('forum.interactedWithContent');
    }
  };

  const formatAgo = (iso) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('forum.justNow');
    if (mins < 60) return tf('forum.timeAgoMinutesShort', { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return tf('forum.timeAgoHoursShort', { count: hrs });
    return tf('forum.timeAgoDaysShort', { count: Math.floor(hrs / 24) });
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 overflow-hidden max-h-[480px] flex flex-col">
      <div className="p-4 border-b flex items-center justify-between bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Bell size={18} />
          {t('forum.notifications')}
          {unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unread}</span>}
        </h3>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-lab-blue hover:underline font-semibold">
              {t('forum.markAllRead')}
            </button>
          )}
          {notifs.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="p-1 hover:bg-rose-50 rounded text-rose-600"
              aria-label={t('forum.deleteAll')}
              title={t('forum.deleteAll')}
            >
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded"><X size={16} /></button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lab-blue" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">{t('forum.noNotificationsYet')}</div>
        ) : (
          <>
            {notifs.map(n => (
              <div key={n.id} onClick={() => handleMarkRead(n.id)}
                className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-all ${!n.read ? 'bg-blue-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-lab-blue' : 'bg-transparent'}`} />
                  <ChemCityUserProfileIcon userId={n.senderId} displayName={n.senderDisplayName || t('common.someone')} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 font-medium leading-snug">
                      <span className="font-bold">{n.senderDisplayName || t('common.someone')}</span> {typeLabel(n)}
                    </p>
                    {n.previewText && (
                      <p className="text-xs text-slate-500 mt-1 truncate">"{n.previewText}"</p>
                    )}
                    {n.postTitle && (
                      <p className="text-xs text-lab-blue mt-0.5 truncate">→ {n.postTitle}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{formatAgo(n.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-rose-600"
                    title={t('forum.delete') || 'Delete'}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            {notifs.length >= limitCount && (
              <div className="p-3 flex justify-center">
                <button
                  onClick={() => setLimitCount((n) => n + 10)}
                  className="px-4 py-2 rounded-lg font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                >
                  {t('forum.viewMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowDeleteAllConfirm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-slate-50 flex items-center gap-3">
              <AlertCircle className="text-rose-600" size={18} />
              <h4 className="font-black text-slate-800">{t('forum.deleteAllNotificationsTitle')}</h4>
            </div>
            <div className="p-4 text-sm text-slate-700">
              {t('forum.deleteAllNotificationsBody')}
            </div>
            <div className="p-4 border-t bg-white flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 rounded-lg font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteAll}
                className="px-4 py-2 rounded-lg font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── General Forum Post Detail ─────────────────────────────────────────────────
function PostDetail({ postId, currentUser, onBack }) {
  const { t, tf } = useLanguage();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null); // 'post' | reply id
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [, forceUpdate] = useState(0);

  useEffect(() => { loadAll(); }, [postId]);
  useEffect(() => {
    const i = setInterval(() => forceUpdate(n => n + 1), 10000);
    return () => clearInterval(i);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([forumService.getPost(postId), forumService.getReplies(postId)]);
      setPost(p); setReplies(r);
    } catch { /* post may have been deleted */ }
    setLoading(false);
  }

  async function handleReply() {
    if (!newReply.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      await forumService.addReply(postId, currentUser.uid, currentUser.displayName || t('common.anonymous'), newReply.trim());
      setNewReply(''); await loadAll();
    } catch (e) { alert(e.message); }
    setSubmitting(false);
  }

  async function handleEditPost() {
    try {
      await forumService.updatePost(postId, currentUser.uid, editText, editTitle || undefined);
      setEditingId(null); await loadAll();
    } catch (e) {
      if (e.message === 'EDIT_EXPIRED') alert(t('forum.editExpired'));
      else alert(e.message);
    }
  }

  async function handleDeletePost() {
    if (!window.confirm(t('forum.deletePost'))) return;
    await forumService.deletePost(postId);
    onBack();
  }

  async function handleEditReply(replyId) {
    try {
      await forumService.updateReply(replyId, editText);
      setEditingId(null); await loadAll();
    } catch (e) {
      if (e.message === 'EDIT_EXPIRED') alert(t('forum.editExpired'));
      else alert(e.message);
    }
  }

  async function handleDeleteReply(replyId) {
    if (!window.confirm(t('forum.deleteReply'))) return;
    await forumService.deleteReply(replyId); await loadAll();
  }

  async function handleLikePost() {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const senderName = currentUser.displayName || t('common.anonymous');
    const prev = post;
    if (!prev) return;

    const prevLikedBy = Array.isArray(prev.likedBy) ? prev.likedBy : [];
    const hasLiked = prevLikedBy.includes(uid);
    const nextLikedBy = hasLiked ? prevLikedBy.filter(id => id !== uid) : [...prevLikedBy, uid];
    const nextLikes = Math.max(0, Number(prev.likes || 0) + (hasLiked ? -1 : 1));

    setPost({
      ...prev,
      likedBy: nextLikedBy,
      likes: nextLikes
    });

    try {
      await forumService.togglePostLike(postId, uid, senderName);
    } catch (e) {
      setPost(prev);
      return;
    }
  }

  async function handleLikeReply(replyId) {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const senderName = currentUser.displayName || t('common.anonymous');

    let prevReply = null;
    setReplies((prevReplies) => {
      const next = prevReplies.map((r) => {
        if (r.id !== replyId) return r;
        prevReply = r;
        const prevLikedBy = Array.isArray(r.likedBy) ? r.likedBy : [];
        const hasLiked = prevLikedBy.includes(uid);
        const nextLikedBy = hasLiked ? prevLikedBy.filter(id => id !== uid) : [...prevLikedBy, uid];
        const nextLikes = Math.max(0, Number(r.likes || 0) + (hasLiked ? -1 : 1));
        return { ...r, likedBy: nextLikedBy, likes: nextLikes };
      });
      return next;
    });

    try {
      await forumService.toggleReplyLike(replyId, uid, senderName);
    } catch (e) {
      if (prevReply) {
        setReplies((prevReplies) => prevReplies.map(r => (r.id === replyId ? prevReply : r)));
      }
      return;
    }
  }

  const formatDate = (iso) => {
    const d = new Date(iso), now = new Date();
    const mins = Math.floor((now - d) / 60000);
    if (mins < 1) return t('forum.justNow');
    if (mins < 60) return tf('forum.timeAgoMinutes', { count: mins });
    if (mins < 1440) return tf('forum.timeAgoHours', { count: Math.floor(mins / 60) });
    return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Hong_Kong', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const categoryColor = { general: 'bg-blue-100 text-blue-700', question: 'bg-amber-100 text-amber-700', announcement: 'bg-purple-100 text-purple-700' };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lab-blue" /></div>;
  if (!post) return <div className="text-center py-12 text-slate-400">{t('forum.postNotFound')}</div>;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-lab-blue transition-colors">
        <ChevronLeft size={18} /> {t('forum.backToForum')}
      </button>

      {/* Post */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${categoryColor[post.category] || categoryColor.general}`}>
                  {categoryLabel(t, post.category)}
                </span>
                {post.edited && <span className="text-xs text-slate-400 italic">({t('forum.edited')})</span>}
              </div>
              {editingId === 'post' ? (
                <div className="space-y-2">
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-lab-blue font-bold text-lg" />
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows="4"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-lab-blue resize-none" />
                  <div className="flex gap-2">
                    <button onClick={handleEditPost} className="px-4 py-2 bg-lab-blue text-white rounded-lg font-bold text-sm">{t('forum.save')}</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm">{t('forum.cancel')}</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-slate-800 mb-3">{post.title}</h2>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </>
              )}
            </div>
            {currentUser && post.userId === currentUser.uid && editingId !== 'post' && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {canEditComment(post.createdAt) ? (
                  <button onClick={() => { setEditingId('post'); setEditText(post.content); setEditTitle(post.title); }}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-all"><Edit2 size={16} className="text-lab-blue" /></button>
                ) : (
                  <button disabled className="p-2 opacity-30 cursor-not-allowed rounded-lg"><Lock size={16} className="text-slate-400" /></button>
                )}
                <button onClick={handleDeletePost} className="p-2 hover:bg-red-100 rounded-lg transition-all"><Trash2 size={16} className="text-red-500" /></button>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <ChemCityUserProfileIcon userId={post.userId} displayName={post.userDisplayName} size={28} />
              <span className="font-semibold">{post.userDisplayName}</span>
              <span>·</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
            <button onClick={handleLikePost} disabled={!currentUser}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${post.likedBy?.includes(currentUser?.uid) ? 'bg-blue-100 text-lab-blue' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <ThumbsUp size={14} fill={post.likedBy?.includes(currentUser?.uid) ? 'currentColor' : 'none'} />
              {post.likes || 0}
            </button>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-700">{replies.length} {t('forum.replies')}</h3>
        {replies.map(reply => {
          const isOwner = currentUser && reply.userId === currentUser.uid;
          return (
            <div key={reply.id} className="bg-white rounded-xl border-2 border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <ChemCityUserProfileIcon userId={reply.userId} displayName={reply.userDisplayName} size={28} />
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{reply.userDisplayName}</span>
                    <span className="text-xs text-slate-400 ml-2">{formatDate(reply.createdAt)}</span>
                    {reply.edited && <span className="text-xs text-slate-400 italic ml-1">({t('forum.edited')})</span>}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1">
                    {canEditComment(reply.createdAt) ? (
                      <button onClick={() => { setEditingId(reply.id); setEditText(reply.text); }}
                        className="p-1.5 hover:bg-blue-100 rounded-lg"><Edit2 size={14} className="text-lab-blue" /></button>
                    ) : (
                      <button disabled className="p-1.5 opacity-30 cursor-not-allowed rounded-lg"><Lock size={14} className="text-slate-400" /></button>
                    )}
                    <button onClick={() => handleDeleteReply(reply.id)} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                )}
              </div>
              {editingId === reply.id ? (
                <div className="space-y-2">
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows="3"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-lab-blue resize-none text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => handleEditReply(reply.id)} className="px-3 py-1.5 bg-lab-blue text-white rounded-lg font-bold text-xs">{t('forum.save')}</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs">{t('forum.cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap flex-1">{reply.text}</p>
                  <button onClick={() => handleLikeReply(reply.id)} disabled={!currentUser}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${reply.likedBy?.includes(currentUser?.uid) ? 'bg-blue-100 text-lab-blue' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <ThumbsUp size={12} fill={reply.likedBy?.includes(currentUser?.uid) ? 'currentColor' : 'none'} />
                    {reply.likes || 0}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply Input */}
      {currentUser ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
          <div className="flex gap-3">
            <ChemCityUserProfileIcon userId={currentUser.uid} displayName={currentUser.displayName} size={32} />
            <div className="flex-1">
              <textarea value={newReply} onChange={e => setNewReply(e.target.value)} rows="3"
                placeholder={t('forum.writeReply')}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-lab-blue resize-none text-sm" />
              <div className="flex justify-end mt-2">
                <button onClick={handleReply} disabled={!newReply.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-lab-blue text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all">
                  {submitting ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Send size={14} />}
                  {t('forum.reply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-sm font-semibold text-amber-800">
          {t('forum.pleaseLoginReply')}
        </div>
      )}
    </div>
  );
}

// ── New Post Modal ────────────────────────────────────────────────────────────
function NewPostModal({ currentUser, onClose, onCreated }) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await forumService.createPost(currentUser.uid, currentUser.displayName || t('common.anonymous'), { title, content, category });
      onCreated();
    } catch (e) { alert(e.message); }
    setSubmitting(false);
  };

  const catColors = { general: 'border-blue-400 bg-blue-50 text-blue-700', question: 'border-amber-400 bg-amber-50 text-amber-700', announcement: 'border-purple-400 bg-purple-50 text-purple-700' };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800">{t('forum.createNewPost')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">{t('forum.category')}</label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${category === cat ? catColors[cat] : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {categoryLabel(t, cat)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">{t('forum.title2')}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
              placeholder={t('forum.enterClearTitle')}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg outline-none focus:border-lab-blue font-semibold" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">{t('forum.content')}</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows="6"
              placeholder={t('forum.shareThoughts')}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg outline-none focus:border-lab-blue resize-none" />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-all">
            {t('forum.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={!title.trim() || !content.trim() || submitting}
            className="flex items-center gap-2 px-6 py-2 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all">
            {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={16} />}
            {t('forum.post')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ForumPage ────────────────────────────────────────────────────────────
export default function ForumPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, tf } = useLanguage();
  const { questions, loading: questionsLoading } = useQuizData(SHEET_URL);

  const [activeTab, setActiveTab] = useState('mcq'); // 'mcq' | 'general'

  // MCQ tab state
  const [discussedQuestions, setDiscussedQuestions] = useState([]);
  const [mcqLoading, setMcqLoading] = useState(true);
  const [mcqLimit, setMcqLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // General tab state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postLimit, setPostLimit] = useState(10);
  const [activePost, setActivePost] = useState(null); // postId
  const [showNewPost, setShowNewPost] = useState(false);
  const [postSearch, setPostSearch] = useState('');
  const [postCategory, setPostCategory] = useState('all');

  // Algolia search state (only used when user types a search query)
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [searchNbPages, setSearchNbPages] = useState(0);
  const [searchNbHits, setSearchNbHits] = useState(0);
  const [searchError, setSearchError] = useState(null);
  const [submittedSearch, setSubmittedSearch] = useState('');

  useEffect(() => {
    if (activeTab !== 'mcq') return;
    loadDiscussedQuestions(mcqLimit);
  }, [activeTab, mcqLimit]);
  useEffect(() => {
    if (activeTab !== 'general') return;
    loadPosts(postLimit);
  }, [activeTab, postLimit]);

  async function loadDiscussedQuestions(limitCount = mcqLimit) {
    setMcqLoading(true);
    try {
      const discussed = await forumService.getQuestionsWithComments(limitCount);
      setDiscussedQuestions(discussed);
    } catch { /* ignore */ }
    setMcqLoading(false);
  }

  function viewMoreMcq() {
    setMcqLimit((n) => n + 10);
  }

  async function loadPosts(limitCount = postLimit) {
    setPostsLoading(true);
    try {
      const data = await forumService.getPosts({ limit: limitCount });
      setPosts(data);
    } catch { /* ignore */ }
    setPostsLoading(false);
  }

  function viewMorePosts() {
    setPostLimit((n) => n + 10);
  }

  // === Algolia search functions ===
  const resetSearch = () => {
    setSearchResults([]);
    setSearchPage(0);
    setSearchNbPages(0);
    setSearchNbHits(0);
    setSearchError(null);
  };

  const runSearch = useCallback(async (query, page = 0) => {
    if (!query || !query.trim()) {
      resetSearch();
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await forumService.searchPosts({ query: query.trim(), page, hitsPerPage: 10, hydrate: false });
      setSearchResults((prev) => (page === 0 ? result.hits : [...prev, ...result.hits]));
      setSearchPage(result.page);
      setSearchNbPages(result.nbPages);
      setSearchNbHits(result.nbHits);
    } catch (e) {
      setSearchError(e.message);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const viewMoreSearch = () => {
    if (searchPage + 1 < searchNbPages) {
      runSearch(submittedSearch, searchPage + 1);
    }
  };

  const submitSearch = () => {
    const q = (postSearch || '').trim();
    setSubmittedSearch(q);
    resetSearch();
    if (q) runSearch(q, 0);
  };

  const clearSearch = () => {
    setPostSearch('');
    setSubmittedSearch('');
    resetSearch();
  };

  const getQuestionDetails = (questionId) => questions.find(q => q.ID === questionId);

  const filteredMcqQuestions = discussedQuestions
    .filter(dq => {
      const qd = getQuestionDetails(dq.questionId);
      if (!qd) return false;
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return qd.Question?.toLowerCase().includes(s) || qd.Topic?.toLowerCase().includes(s) || qd.DSEcode?.toLowerCase().includes(s);
    })
    .sort((a, b) => sortBy === 'recent' ? new Date(b.lastActivity) - new Date(a.lastActivity) : b.commentCount - a.commentCount);

  const filteredPosts = (() => {
    // If user is typing a search query, use Algolia results (already filtered/sorted)
    if (submittedSearch.trim()) {
      return searchResults;
    }
    // Otherwise, use client-side filter for category only
    return posts.filter(p => postCategory === 'all' || p.category === postCategory);
  })();

  const formatDate = (iso) => {
    const d = new Date(iso), now = new Date(), diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('forum.justNow');
    if (mins < 60) return tf('forum.timeAgoMinutes', { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return tf('forum.timeAgoHours', { count: hrs });
    const days = Math.floor(hrs / 24);
    if (days < 7) return tf('forum.timeAgoDays', { count: days });
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const catColors = { general: 'bg-blue-100 text-blue-700', question: 'bg-amber-100 text-amber-700', announcement: 'bg-purple-100 text-purple-700' };

  if (activePost) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PostDetail postId={activePost} currentUser={currentUser}
          onBack={() => { setActivePost(null); loadPosts(postLimit); }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex justify-center">
          <div className="paper-island paper-island-md paper-rose">
            <div className="paper-island-content">
              <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900 bellmt-title ink-rose">
                <MessageSquare size={32} className="text-rose-700" />
                {t('forum.title')}
              </h1>
              <p className="text-slate-700 mt-1 font-semibold">{t('forum.connectDiscuss')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b">
          <button onClick={() => setActiveTab('mcq')}
            className={`flex-1 px-6 py-4 font-bold text-base transition-all flex items-center justify-center gap-2 ${activeTab === 'mcq' ? 'bg-lab-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            <MessageCircle size={18} />
            {t('forum.mcqDiscussion')}
          </button>
          <button onClick={() => setActiveTab('general')}
            className={`flex-1 px-6 py-4 font-bold text-base transition-all flex items-center justify-center gap-2 ${activeTab === 'general' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            <MessageSquare size={18} />
            {t('forum.generalForum')}
          </button>
        </div>

        {/* ── MCQ Tab ── */}
        {activeTab === 'mcq' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder={t('forum.searchQuestions')}
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lab-blue outline-none transition-all" />
              </div>
              <div className="flex gap-2">
                {[['recent', <Clock size={16} />, t('forum.recent')], ['popular', <TrendingUp size={16} />, t('forum.popular')]].map(([val, icon, label]) => (
                  <button key={val} onClick={() => setSortBy(val)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all ${sortBy === val ? 'bg-lab-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {icon}{label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-600"><span className="font-bold text-lab-blue">{filteredMcqQuestions.length}</span> {t('forum.questionsWithDiscussions')}</p>

            {mcqLoading || questionsLoading ? (
              <div className="flex justify-center py-12"><ChemistryLoading /></div>
            ) : filteredMcqQuestions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">{searchTerm ? t('forum.noResultsFound') : t('forum.noMcqDiscussions')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMcqQuestions.map(dq => {
                  const qd = getQuestionDetails(dq.questionId);
                  if (!qd) return null;

                  const embeddedImgSrc = (() => {
                    const html = String(qd.Question || '');
                    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                    return m ? m[1] : null;
                  })();

                  const startsWithImage = (() => {
                    const html = String(qd.Question || '').trim();
                    return /^<img\b/i.test(html) || /^<span[^>]*>\s*<img\b/i.test(html);
                  })();

                  const previewImgSrc = startsWithImage ? (qd.Pictureurl || embeddedImgSrc) : null;

                  const firstSentence = (() => {
                    const rawHtml = String(qd.Question || '');
                    const text = rawHtml
                      .replace(/<br\s*\/?>/gi, '\n')
                      .replace(/<[^>]*>/g, ' ')
                      .replace(/&nbsp;/g, ' ')
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/\s+/g, ' ')
                      .trim();
                    if (!text) return '';
                    const m = text.match(/(.+?[\.\?\!])\s/);
                    return (m ? m[1] : text).slice(0, 160);
                  })();
                  return (
                    <div key={dq.questionId} onClick={() => setSelectedQuestion(qd)}
                      className="p-4 rounded-xl border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 text-lab-blue px-2 py-1 rounded text-xs font-bold">{qd.Topic}</span>
                            {qd.DSEcode && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{qd.DSEcode}</span>}
                          </div>
                          {previewImgSrc ? (
                            <div className="mb-3">
                              <img
                                src={previewImgSrc}
                                alt="Question preview"
                                className="w-full max-w-[420px] h-auto max-h-[120px] object-contain rounded-lg border border-slate-200 bg-white"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                          ) : (
                            <div className="text-slate-700 font-medium mb-2 line-clamp-2">
                              {firstSentence || '...'}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1"><MessageCircle size={14} /><span className="font-semibold">{dq.commentCount}</span><span>{t('forum.comments')}</span></div>
                            <div className="flex items-center gap-1"><Clock size={14} /><span>{formatDate(dq.lastActivity)}</span></div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-lg font-black text-purple-600">{dq.commentCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {discussedQuestions.length >= mcqLimit && (
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={viewMoreMcq}
                      className="px-6 py-2 rounded-lg font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      {t('forum.viewMore')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── General Forum Tab ── */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={postSearch}
                  onChange={e => setPostSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSearch();
                    if (e.key === 'Escape') clearSearch();
                  }}
                  placeholder={t('forum.searchPosts')}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-purple-400 outline-none" />
                {postSearch.trim() && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                    aria-label="Clear search"
                    title="Clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {/* Category filter */}
              <div className="flex gap-2">
                {['all', ...CATEGORIES].map(cat => (
                  <button key={cat} onClick={() => setPostCategory(cat)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${postCategory === cat ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {cat === 'all' ? t('forum.all') : categoryLabel(t, cat)}
                  </button>
                ))}
              </div>
              {currentUser && (
                <button onClick={() => setShowNewPost(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all shadow-md whitespace-nowrap">
                  <PlusCircle size={18} />
                  {t('forum.newPost')}
                </button>
              )}
            </div>

            {postsLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" /></div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 mb-3">{t('forum.noPosts')}</p>
                {currentUser && (
                  <button onClick={() => setShowNewPost(true)} className="px-5 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all">
                    {t('forum.createPost')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map(post => (
                  <div key={post.id} onClick={() => setActivePost(post.id)}
                    className="p-4 rounded-xl border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${catColors[post.category] || catColors.general}`}>
                            {categoryLabel(t, post.category)}
                          </span>
                          {post.edited && <span className="text-xs text-slate-400 italic">({t('forum.edited')})</span>}
                        </div>
                        <h3 className="font-bold text-slate-800 text-base mb-1 line-clamp-1">{post.title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="font-semibold">{post.userDisplayName}</span>
                          <span>{formatDate(post.createdAt)}</span>
                          <span className="flex items-center gap-1"><MessageCircle size={12} />{post.replyCount || 0}</span>
                          <span className="flex items-center gap-1"><ThumbsUp size={12} />{post.likes || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Search UI: loading, error, result count, View more */}
                {submittedSearch.trim() && (
                  <div className="pt-2 space-y-2">
                    {searchLoading && <div className="text-center text-sm text-slate-500">Searching...</div>}
                    {searchError && <div className="text-center text-sm text-red-600">{searchError}</div>}
                    {!searchLoading && !searchError && searchNbHits > 0 && (
                      <div className="text-center text-xs text-slate-400">{searchNbHits} results</div>
                    )}
                    {!searchLoading && !searchError && searchPage + 1 < searchNbPages && (
                      <div className="flex justify-center">
                        <button
                          onClick={viewMoreSearch}
                          className="px-6 py-2 rounded-lg font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                        >
                          {t('forum.viewMore')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Non-search View more */}
                {!submittedSearch.trim() && posts.length >= postLimit && (
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={viewMorePosts}
                      className="px-6 py-2 rounded-lg font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      {t('forum.viewMore')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MCQ Forum Modal */}
      {selectedQuestion && (
        <QuestionForum question={selectedQuestion}
          onClose={() => { setSelectedQuestion(null); loadDiscussedQuestions(mcqLimit); }} />
      )}

      {/* New Post Modal */}
      {showNewPost && currentUser && (
        <NewPostModal currentUser={currentUser}
          onClose={() => setShowNewPost(false)}
          onCreated={() => { setShowNewPost(false); loadPosts(postLimit); }} />
      )}
    </div>
  );
}