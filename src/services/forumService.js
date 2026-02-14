import { 
  collection, addDoc, updateDoc, deleteDoc, doc, query,
  where, orderBy, getDocs, getDoc, increment, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Constants ─────────────────────────────────────────────────────────────────
export const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const canEditComment = (createdAt) => {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs <= EDIT_WINDOW_MS;
};

export const editTimeRemaining = (createdAt) => {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const remaining = EDIT_WINDOW_MS - ageMs;
  if (remaining <= 0) return null;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const forumService = {
  // ── MCQ Comments ──────────────────────────────────────────────────────────
  async addComment(questionId, userId, userDisplayName, commentText) {
    try {
      if (!questionId || !userId || !commentText) throw new Error('Missing required fields');
      const commentData = {
        questionId: String(questionId),
        userId: String(userId),
        userDisplayName: userDisplayName || 'Anonymous',
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        edited: false,
        likes: 0,
        likedBy: []
      };
      const ref = await addDoc(collection(db, 'comments'), commentData);
      return ref.id;
    } catch (error) {
      if (error.code === 'permission-denied') throw new Error('Permission denied. Please check Firebase rules.');
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  },

  // ── Comment Replies ──────────────────────────────────────────────────────
  async addCommentReply(parentCommentId, userId, userDisplayName, text) {
    if (!parentCommentId || !userId || !text?.trim()) throw new Error('Missing required fields');

    const data = {
      parentCommentId: String(parentCommentId),
      userId: String(userId),
      userDisplayName: userDisplayName || 'Anonymous',
      text: text.trim(),
      CreatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edited: false,
      likes: 0,
      likedBy: []
    };

    const ref = await addDoc(collection(db, 'comment_replies'), data);

    // Notify parent comment author
    const parentSnap = await getDoc(doc(db, 'comments', String(parentCommentId)));
    if (parentSnap.exists()) {
      const parent = parentSnap.data();
      if (parent.userId && parent.userId !== userId) {
        await forumService.createNotification({
          recipientId: parent.userId,
          senderId: userId,
          senderDisplayName: userDisplayName || 'Anonymous',
          type: 'comment_reply',
          commentId: String(parentCommentId),
          questionId: parent.questionId || null,
          previewText: text.substring(0, 80)
        });
      }
    }

    return ref.id;
  },

  async getCommentReplies(parentCommentId) {
    try {
      const q = query(
        collection(db, 'comment_replies'),
        where('parentCommentId', '==', String(parentCommentId)),
        orderBy('CreatedAt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      if (error.code === 'failed-precondition') {
        const snapshot = await getDocs(collection(db, 'comment_replies'));
        return snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.parentCommentId === String(parentCommentId))
          .sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));
      }
      throw error;
    }
  },

  async toggleCommentReplyLike(replyId, userId, senderDisplayName = '') {
    const ref = doc(db, 'comment_replies', replyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Reply not found');
    const data = snap.data();
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(userId);

    if (hasLiked) {
      await updateDoc(ref, { likes: increment(-1), likedBy: likedBy.filter(id => id !== userId) });
    } else {
      await updateDoc(ref, { likes: increment(1), likedBy: [...likedBy, userId] });
      if (data.userId && data.userId !== userId) {
        await forumService.createNotification({
          recipientId: data.userId,
          senderId: userId,
          senderDisplayName,
          type: 'comment_reply_like',
          replyId,
          commentId: data.parentCommentId || null,
          previewText: data.text?.substring(0, 80) || ''
        });
      }
    }
  },

  async getQuestionComments(questionId) {
    try {
      const q = query(
        collection(db, 'comments'),
        where('questionId', '==', String(questionId)),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      if (error.code === 'failed-precondition') return [];
      throw error;
    }
  },

  // Edit only allowed within 15 minutes
  async updateComment(commentId, newText) {
    try {
      const ref = doc(db, 'comments', commentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Comment not found');
      if (!canEditComment(snap.data().createdAt)) {
        throw new Error('EDIT_EXPIRED');
      }
      await updateDoc(ref, {
        text: newText.trim(),
        updatedAt: new Date().toISOString(),
        edited: true
      });
    } catch (error) {
      if (error.message === 'EDIT_EXPIRED') throw error;
      if (error.code === 'permission-denied') throw new Error('You can only edit your own comments.');
      throw error;
    }
  },

  async deleteComment(commentId) {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      if (error.code === 'permission-denied') throw new Error('You can only delete your own comments.');
      throw error;
    }
  },

  async toggleLike(commentId, userId, senderDisplayName = '') {
    try {
      const ref = doc(db, 'comments', commentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Comment not found');
      const data = snap.data();
      const likedBy = data.likedBy || [];
      const hasLiked = likedBy.includes(userId);
      
      if (hasLiked) {
        await updateDoc(ref, { likes: increment(-1), likedBy: likedBy.filter(id => id !== userId) });
      } else {
        await updateDoc(ref, { likes: increment(1), likedBy: [...likedBy, userId] });
        // Create notification for comment author
        if (data.userId && data.userId !== userId) {
          await forumService.createNotification({
            recipientId: data.userId,
            senderId: userId,
            senderDisplayName,
            type: 'like',
            commentId,
            questionId: data.questionId,
            postId: data.postId || null,
            previewText: data.text?.substring(0, 80) || '',
          });
        }
      }
    } catch (error) {
      throw error;
    }
  },

  async getQuestionsWithComments() {
    try {
      const snapshot = await getDocs(collection(db, 'comments'));
      const map = new Map();
      snapshot.forEach(d => {
        const data = d.data();
        if (!data.questionId) return;
        if (!map.has(data.questionId)) {
          map.set(data.questionId, { questionId: data.questionId, commentCount: 1, lastActivity: data.createdAt });
        } else {
          const ex = map.get(data.questionId);
          ex.commentCount++;
          if (data.createdAt > ex.lastActivity) ex.lastActivity = data.createdAt;
        }
      });
      return Array.from(map.values()).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    } catch (error) {
      throw error;
    }
  },

  // ── General Forum Posts ───────────────────────────────────────────────────
  async createPost(userId, userDisplayName, { title, content, category = 'general' }) {
    if (!userId || !title?.trim() || !content?.trim()) throw new Error('Missing required fields');
    const data = {
      userId, userDisplayName: userDisplayName || 'Anonymous',
      title: title.trim(), content: content.trim(),
      category, // 'general' | 'question' | 'announcement'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edited: false, replyCount: 0, likes: 0, likedBy: [], pinned: false
    };
    const ref = await addDoc(collection(db, 'forum_posts'), data);
    return ref.id;
  },

  async getPosts({ category = null, limit: lim = 30 } = {}) {
    try {
      let q;
      if (category) {
        q = query(collection(db, 'forum_posts'), where('category', '==', category), orderBy('createdAt', 'desc'));
      } else {
        q = query(collection(db, 'forum_posts'), orderBy('createdAt', 'desc'));
      }
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return posts.slice(0, lim);
    } catch (error) {
      if (error.code === 'failed-precondition') {
        const snapshot = await getDocs(collection(db, 'forum_posts'));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, lim);
      }
      throw error;
    }
  },

  async getPost(postId) {
    const snap = await getDoc(doc(db, 'forum_posts', postId));
    if (!snap.exists()) throw new Error('Post not found');
    return { id: snap.id, ...snap.data() };
  },

  async updatePost(postId, userId, newContent, newTitle = null) {
    const ref = doc(db, 'forum_posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Post not found');
    if (!canEditComment(snap.data().createdAt)) throw new Error('EDIT_EXPIRED');
    const updates = { content: newContent.trim(), updatedAt: new Date().toISOString(), edited: true };
    if (newTitle) updates.title = newTitle.trim();
    await updateDoc(ref, updates);
  },

  async deletePost(postId) {
    await deleteDoc(doc(db, 'forum_posts', postId));
  },

  async togglePostLike(postId, userId, senderDisplayName = '') {
    const ref = doc(db, 'forum_posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Post not found');
    const data = snap.data();
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(userId);
    if (hasLiked) {
      await updateDoc(ref, { likes: increment(-1), likedBy: likedBy.filter(id => id !== userId) });
    } else {
      await updateDoc(ref, { likes: increment(1), likedBy: [...likedBy, userId] });
      if (data.userId && data.userId !== userId) {
        await forumService.createNotification({
          recipientId: data.userId, senderId: userId,
          senderDisplayName,
          type: 'post_like', postId,
          previewText: data.title?.substring(0, 80) || '',
        });
      }
    }
  },

  // ── Post Replies ──────────────────────────────────────────────────────────
  async addReply(postId, userId, userDisplayName, text) {
    if (!postId || !userId || !text?.trim()) throw new Error('Missing required fields');
    const data = {
      postId, userId, userDisplayName: userDisplayName || 'Anonymous',
      text: text.trim(), createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), edited: false, likes: 0, likedBy: []
    };
    const ref = await addDoc(collection(db, 'forum_replies'), data);
    // Increment reply count on post
    await updateDoc(doc(db, 'forum_posts', postId), { replyCount: increment(1) });
    // Notify post author
    const postSnap = await getDoc(doc(db, 'forum_posts', postId));
    if (postSnap.exists() && postSnap.data().userId !== userId) {
      await forumService.createNotification({
        recipientId: postSnap.data().userId, senderId: userId,
        senderDisplayName: userDisplayName || 'Anonymous',
        type: 'reply', postId,
        previewText: text.substring(0, 80),
        postTitle: postSnap.data().title?.substring(0, 60) || '',
      });
    }
    return ref.id;
  },

  async getReplies(postId) {
    try {
      const q = query(
        collection(db, 'forum_replies'),
        where('postId', '==', postId),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      if (error.code === 'failed-precondition') {
        const snapshot = await getDocs(collection(db, 'forum_replies'));
        return snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.postId === postId)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
      throw error;
    }
  },

  async updateReply(replyId, newText) {
    const ref = doc(db, 'forum_replies', replyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Reply not found');
    if (!canEditComment(snap.data().createdAt)) throw new Error('EDIT_EXPIRED');
    await updateDoc(ref, { text: newText.trim(), updatedAt: new Date().toISOString(), edited: true });
  },

  async deleteReply(replyId) {
    const snap = await getDoc(doc(db, 'forum_replies', replyId));
    if (snap.exists()) {
      const postId = snap.data().postId;
      await deleteDoc(doc(db, 'forum_replies', replyId));
      await updateDoc(doc(db, 'forum_posts', postId), { replyCount: increment(-1) });
    }
  },

  async toggleReplyLike(replyId, userId, senderDisplayName = '') {
    const ref = doc(db, 'forum_replies', replyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Reply not found');
    const data = snap.data();
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(userId);
    if (hasLiked) {
      await updateDoc(ref, { likes: increment(-1), likedBy: likedBy.filter(id => id !== userId) });
    } else {
      await updateDoc(ref, { likes: increment(1), likedBy: [...likedBy, userId] });
      if (data.userId && data.userId !== userId) {
        await forumService.createNotification({
          recipientId: data.userId, senderId: userId,
          senderDisplayName,
          type: 'reply_like', replyId, postId: data.postId,
          previewText: data.text?.substring(0, 80) || '',
        });
      }
    }
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  async createNotification({ recipientId, senderId, senderDisplayName, type, commentId, postId, replyId, questionId, previewText, postTitle }) {
    if (!recipientId || recipientId === senderId) return;
    await addDoc(collection(db, 'notifications'), {
      recipientId, senderId, type,
      senderDisplayName: senderDisplayName || '',
      commentId: commentId || null,
      postId: postId || null,
      replyId: replyId || null,
      questionId: questionId || null,
      previewText: previewText || '',
      postTitle: postTitle || '',
      read: false,
      createdAt: new Date().toISOString()
    });
  },

  async getNotifications(userId, limitCount = 20) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, limitCount);
    } catch (error) {
      if (error.code === 'failed-precondition') {
        const snapshot = await getDocs(collection(db, 'notifications'));
        return snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(n => n.recipientId === userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, limitCount);
      }
      return [];
    }
  },

  async markNotificationRead(notifId) {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  },

  async markAllNotificationsRead(userId) {
    const notifs = await forumService.getNotifications(userId, 50);
    const unread = notifs.filter(n => !n.read);
    await Promise.all(unread.map(n => forumService.markNotificationRead(n.id)));
  },

  subscribeToNotifications(userId, callback) {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(notifs);
    }, () => { /* ignore snapshot errors */ });
  }
};