import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useQuizData } from '../hooks/useQuizData';
import { forumService, canEditComment, editTimeRemaining } from '../services/forumService';
import {
  MessageSquare, ArrowLeft, Search, TrendingUp, Clock, MessageCircle,
  PlusCircle, X, Send, Edit2, Trash2, ThumbsUp, Bell, BellDot,
  Lock, Tag, Pin, ChevronLeft, AlertCircle
} from 'lucide-react';
import QuestionForum from '../components/QuestionForum';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK36yaUN-NMCkQNT-DAHgc6FMZPjUc0Yv3nYEK4TA9W2qE9V1TqVD10Tq98-wXQoAvKOZlwGWRSDkU/pub?gid=1182550140&single=true&output=csv';

const CATEGORIES = ['general', 'question', 'announcement'];

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({ userId, onClose }) {
  const { t } = useLanguage();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = forumService.subscribeToNotifications(userId, (data) => {
      setNotifs(data);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, [userId]);

  const handleMarkAllRead = async () => {
    await forumService.markAllNotificationsRead(userId);
  };

  const handleMarkRead = async (id) => {
    await forumService.markNotificationRead(id);
  };

  const typeLabel = (n) => {
    switch (n.type) {
      case 'like': return t('forum.likedYourComment');
      case 'reply': return t('forum.repliedToPost');
      case 'post_like': return t('forum.likedYourPost');
      case 'reply_like': return t('forum.likedYourReply');
      default: return 'interacted with your content';
    }
  };

  const formatAgo = (iso) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('forum.justNow');
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
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
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded"><X size={16} /></button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lab-blue" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">{t('forum.noNotificationsYet')}</div>
        ) : (
          notifs.map(n => (
            <div key={n.id} onClick={() => handleMarkRead(n.id)}
              className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-all ${!n.read ? 'bg-blue-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-lab-blue' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium leading-snug">
                    <span className="font-bold">Someone</span> {typeLabel(n)}
                  </p>
                  {n.previewText && (
                    <p className="text-xs text-slate-500 mt-1 truncate">"{n.previewText}"</p>
                  )}
                  {n.postTitle && (
                    <p className="text-xs text-lab-blue mt-0.5 truncate">→ {n.postTitle}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{formatAgo(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── General Forum Post Detail ─────────────────────────────────────────────────
function PostDetail({ postId, currentUser, onBack }) {
  const { t } = useLanguage();
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
      await forumService.addReply(postId, currentUser.uid, currentUser.displayName || 'Anonymous', newReply.trim());
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
    await forumService.togglePostLike(postId, currentUser.uid); await loadAll();
  }

  async function handleLikeReply(replyId) {
    if (!currentUser) return;
    await forumService.toggleReplyLike(replyId, currentUser.uid); await loadAll();
  }

  const formatDate = (iso) => {
    const d = new Date(iso), now = new Date();
    const mins = Math.floor((now - d) / 60000);
    if (mins < 1) return t('forum.justNow');
    if (mins < 60) return `${mins} min ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)} hr ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const categoryColor = { general: 'bg-blue-100 text-blue-700', question: 'bg-amber-100 text-amber-700', announcement: 'bg-purple-100 text-purple-700' };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lab-blue" /></div>;
  if (!post) return <div className="text-center py-12 text-slate-400">Post not found.</div>;

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
                  {post.category?.toUpperCase()}
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
              <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-700">
                {post.userDisplayName?.charAt(0).toUpperCase() || 'U'}
              </div>
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
                  <div className="w-7 h-7 rounded-full bg-lab-blue flex items-center justify-center text-white text-xs font-bold">
                    {reply.userDisplayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
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
            <div className="w-8 h-8 rounded-full bg-lab-blue flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">{currentUser.displayName?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
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
      await forumService.createPost(currentUser.uid, currentUser.displayName || 'Anonymous', { title, content, category });
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
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">{t('forum.title')}</label>
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
  const { t } = useLanguage();
  const { questions, loading: questionsLoading } = useQuizData(SHEET_URL);

  const [activeTab, setActiveTab] = useState('mcq'); // 'mcq' | 'general'
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // MCQ tab state
  const [discussedQuestions, setDiscussedQuestions] = useState([]);
  const [mcqLoading, setMcqLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // General tab state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activePost, setActivePost] = useState(null); // postId
  const [showNewPost, setShowNewPost] = useState(false);
  const [postSearch, setPostSearch] = useState('');
  const [postCategory, setPostCategory] = useState('all');

  // Subscribe to notifications
  useEffect(() => {
    if (!currentUser) return;
    const unsub = forumService.subscribeToNotifications(currentUser.uid, (notifs) => {
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return () => unsub && unsub();
  }, [currentUser]);

  useEffect(() => { loadDiscussedQuestions(); }, []);
  useEffect(() => { if (activeTab === 'general') loadPosts(); }, [activeTab]);

  async function loadDiscussedQuestions() {
    setMcqLoading(true);
    try {
      const discussed = await forumService.getQuestionsWithComments();
      setDiscussedQuestions(discussed);
    } catch { /* ignore */ }
    setMcqLoading(false);
  }

  async function loadPosts() {
    setPostsLoading(true);
    try {
      const data = await forumService.getPosts({ limit: 50 });
      setPosts(data);
    } catch { /* ignore */ }
    setPostsLoading(false);
  }

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

  const filteredPosts = posts
    .filter(p => {
      if (postCategory !== 'all' && p.category !== postCategory) return false;
      if (!postSearch) return true;
      return p.title?.toLowerCase().includes(postSearch.toLowerCase()) || p.content?.toLowerCase().includes(postSearch.toLowerCase());
    });

  const formatDate = (iso) => {
    const d = new Date(iso), now = new Date(), diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('forum.justNow');
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const catColors = { general: 'bg-blue-100 text-blue-700', question: 'bg-amber-100 text-amber-700', announcement: 'bg-purple-100 text-purple-700' };

  if (activePost) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PostDetail postId={activePost} currentUser={currentUser}
          onBack={() => { setActivePost(null); loadPosts(); }} />
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
        <div className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <MessageSquare size={32} />
            {t('forum.title')}
          </h1>
          <p className="text-purple-100 mt-1">{t('forum.connectDiscuss')}</p>
        </div>
        {/* Notification Bell */}
        {currentUser && (
          <div className="relative">
            <button onClick={() => setShowNotifPanel(v => !v)}
              className="relative p-3 bg-white rounded-xl border-2 border-slate-200 hover:border-purple-400 transition-all shadow-sm">
              {unreadCount > 0 ? <BellDot size={22} className="text-purple-600" /> : <Bell size={22} className="text-slate-600" />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifPanel && (
              <NotificationPanel userId={currentUser.uid} onClose={() => setShowNotifPanel(false)} />
            )}
          </div>
        )}
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
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lab-blue" /></div>
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
                  return (
                    <div key={dq.questionId} onClick={() => setSelectedQuestion(qd)}
                      className="p-4 rounded-xl border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 text-lab-blue px-2 py-1 rounded text-xs font-bold">{qd.Topic}</span>
                            {qd.DSEcode && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{qd.DSEcode}</span>}
                          </div>
                          <div className="text-slate-700 font-medium mb-2 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: qd.Question.substring(0, 150) + '...' }} />
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
                <input type="text" value={postSearch} onChange={e => setPostSearch(e.target.value)}
                  placeholder={t('forum.searchPosts')}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-purple-400 outline-none" />
              </div>
              {/* Category filter */}
              <div className="flex gap-2">
                {['all', ...CATEGORIES].map(cat => (
                  <button key={cat} onClick={() => setPostCategory(cat)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${postCategory === cat ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {cat === 'all' ? t('forum.all') : cat.charAt(0).toUpperCase() + cat.slice(1)}
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
                            {post.category?.toUpperCase()}
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* MCQ Forum Modal */}
      {selectedQuestion && (
        <QuestionForum question={selectedQuestion}
          onClose={() => { setSelectedQuestion(null); loadDiscussedQuestions(); }} />
      )}

      {/* New Post Modal */}
      {showNewPost && currentUser && (
        <NewPostModal currentUser={currentUser}
          onClose={() => setShowNewPost(false)}
          onCreated={() => { setShowNewPost(false); loadPosts(); }} />
      )}
    </div>
  );
}