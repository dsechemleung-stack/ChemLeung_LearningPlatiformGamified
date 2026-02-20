const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const algoliasearch = require('algoliasearch');

admin.initializeApp();

function encodeKey(value) {
  const s = value == null ? '' : String(value);
  return encodeURIComponent(s);
}

function safeString(value) {
  return value == null ? '' : String(value);
}

function decodeKey(value) {
  const s = value == null ? '' : String(value);
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function normalizeBucket(value) {
  const v = value == null ? '' : String(value);
  if (v === 'not_in_srs' || v === 'new' || v === 'progressing' || v === 'near' || v === 'archived') return v;
  return 'not_in_srs';
}

function getTopicFromMistake(m) {
  if (!m || typeof m !== 'object') return '';
  return safeString(m.Topic || m.topic || '');
}

function getBucketFromMistake(m) {
  if (!m || typeof m !== 'object') return 'not_in_srs';
  return normalizeBucket(m.srsBucket || 'not_in_srs');
}

function getIsActiveFromMistake(m) {
  if (!m || typeof m !== 'object') return false;
  return m.srsIsActive === true;
}

async function applyMistakeTopicStatsDelta(db, userId, delta, topic, bucket, isActive) {
  const uid = safeString(userId);
  const d = Number(delta);
  if (!uid || !Number.isFinite(d) || d === 0) return;

  const topicEnc = encodeKey(topic || '');
  if (!topicEnc) return;

  const b = normalizeBucket(bucket);
  const active = isActive === true;

  const statsRef = db.collection('users').doc(uid).collection('mistake_stats').doc('topicBuckets');

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    const prev = snap.exists ? (snap.data() || {}) : {};
    const prevTopics = prev.topics && typeof prev.topics === 'object' ? prev.topics : {};
    const prevEntry = prevTopics[topicEnc] && typeof prevTopics[topicEnc] === 'object' ? prevTopics[topicEnc] : {};

    const nextTopics = { ...prevTopics };
    const nextEntry = { ...prevEntry };

    const prevTotal = Number(nextEntry.total || 0);
    const nextTotal = Math.max(0, prevTotal + d);
    nextEntry.total = nextTotal;

    const bucketKey = `b_${b}`;
    const prevBucket = Number(nextEntry[bucketKey] || 0);
    const nextBucket = Math.max(0, prevBucket + d);
    if (nextBucket === 0) delete nextEntry[bucketKey];
    else nextEntry[bucketKey] = nextBucket;

    if (active) {
      const prevActive = Number(nextEntry.active || 0);
      const nextActive = Math.max(0, prevActive + d);
      nextEntry.active = nextActive;
    }

    // Prune empty
    if (nextEntry.total === 0) {
      delete nextTopics[topicEnc];
    } else {
      nextEntry.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      nextTopics[topicEnc] = nextEntry;
    }

    tx.set(statsRef, {
      topics: nextTopics,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function applySrsAttemptDelta(db, userId, attemptedAtIso, deltaCorrect, statusBefore) {
  const uid = safeString(userId);
  const iso = safeString(attemptedAtIso);
  if (!uid || !iso) return;

  const dateKey = iso.slice(0, 10);
  if (!dateKey) return;

  const summaryRef = db.collection('users').doc(uid).collection('srs_daily_summaries').doc(dateKey);
  const dCorrect = Number.isFinite(deltaCorrect) ? deltaCorrect : 0;

  const normalizeStatus = (s) => {
    const v = safeString(s);
    if (v === 'new') return 'new';
    if (v === 'learning') return 'learning';
    if (v === 'review') return 'review';
    if (v === 'graduated') return 'graduated';
    return '';
  };

  const bucket = normalizeStatus(statusBefore);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(summaryRef);
    const prev = snap.exists ? (snap.data() || {}) : {};
    const next = { ...prev };

    next.date = dateKey;
    next.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (dCorrect !== 0) {
      const old = Number(prev.clearedCorrect || 0);
      next.clearedCorrect = Math.max(0, old + dCorrect);
    }

    if (bucket) {
      const field = bucket === 'new' ? 'statusNew'
        : bucket === 'learning' ? 'statusLearning'
        : bucket === 'review' ? 'statusReview'
        : 'statusGraduated';
      const old = Number(prev[field] || 0);
      next[field] = Math.max(0, old + 1);
    }

    tx.set(summaryRef, next, { merge: true });
  });
}

async function applyMistakeDocDelta(db, userId, before, after) {
  const beforeExists = before && typeof before === 'object' && Object.keys(before).length > 0;
  const afterExists = after && typeof after === 'object' && Object.keys(after).length > 0;

  if (!beforeExists && !afterExists) return;

  // Create
  if (!beforeExists && afterExists) {
    await applyMistakeTopicStatsDelta(
      db,
      userId,
      1,
      getTopicFromMistake(after),
      getBucketFromMistake(after),
      getIsActiveFromMistake(after)
    );
    return;
  }

  // Delete
  if (beforeExists && !afterExists) {
    await applyMistakeTopicStatsDelta(
      db,
      userId,
      -1,
      getTopicFromMistake(before),
      getBucketFromMistake(before),
      getIsActiveFromMistake(before)
    );
    return;
  }

  const beforeTopic = getTopicFromMistake(before);
  const afterTopic = getTopicFromMistake(after);
  const beforeBucket = getBucketFromMistake(before);
  const afterBucket = getBucketFromMistake(after);
  const beforeActive = getIsActiveFromMistake(before);
  const afterActive = getIsActiveFromMistake(after);

  const changed =
    beforeTopic !== afterTopic ||
    beforeBucket !== afterBucket ||
    beforeActive !== afterActive;

  if (!changed) return;

  // Remove old
  await applyMistakeTopicStatsDelta(db, userId, -1, beforeTopic, beforeBucket, beforeActive);
  // Add new
  await applyMistakeTopicStatsDelta(db, userId, 1, afterTopic, afterBucket, afterActive);
}

// Maintain mistake topic stats for global sidebar facets
exports.updateMistakeTopicStatsOnCreate = onDocumentCreated(
  {
    document: 'users/{userId}/mistakes/{mistakeId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const after = snap.data() || {};
    const userId = event.params?.userId;
    if (!userId) return;
    const db = admin.firestore();
    await applyMistakeDocDelta(db, userId, null, after);
  }
);

exports.normalizeMistakes = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to normalize mistakes');
    }

    const db = admin.firestore();
    const mistakesRef = db.collection('users').doc(uid).collection('mistakes');

    const pageSize = 800;
    let last = null;
    let processed = 0;
    let updated = 0;

    const nowIso = new Date().toISOString();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = mistakesRef.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
      if (last) q = q.startAfter(last);

      const snap = await q.get();
      if (snap.empty) break;

      // Only write docs that truly need a patch.
      const toPatch = [];
      for (const docSnap of snap.docs) {
        const d = docSnap.data() || {};

        const topic = d.Topic ?? d.topic ?? null;
        const subtopic = d.Subtopic ?? d.subtopic ?? null;
        const lastWrongAt = d.lastWrongAt ?? d.lastAttempted ?? d.updatedAt ?? d.createdAt ?? nowIso;

        const needsTopic = d.Topic == null && d.topic != null;
        const needsSubtopic = d.Subtopic == null && d.subtopic != null;
        const needsLastWrongAt = d.lastWrongAt == null;

        if (needsTopic || needsSubtopic || needsLastWrongAt) {
          toPatch.push({
            ref: docSnap.ref,
            patch: {
              Topic: topic,
              Subtopic: subtopic,
              lastWrongAt,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          });
        }
      }

      if (toPatch.length > 0) {
        for (let i = 0; i < toPatch.length; i += 450) {
          const batch = db.batch();
          const slice = toPatch.slice(i, i + 450);
          slice.forEach((x) => {
            batch.set(x.ref, x.patch, { merge: true });
          });
          await batch.commit();
          updated += slice.length;
        }
      }

      processed += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    // Make it easy to see when it was last run.
    const statsRef = db.collection('users').doc(uid).collection('mistake_stats').doc('topicBuckets');
    await statsRef.set({
      lastNormalizedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastNormalizedProcessed: processed,
      lastNormalizedUpdated: updated,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true, userId: uid, processed, updated };
  }
);

exports.updateMistakeTopicStatsOnUpdate = onDocumentUpdated(
  {
    document: 'users/{userId}/mistakes/{mistakeId}',
    region: 'asia-east1',
  },
  async (event) => {
    const before = event.data?.before?.data?.() || null;
    const after = event.data?.after?.data?.() || null;
    const userId = event.params?.userId;
    if (!userId) return;
    const db = admin.firestore();
    await applyMistakeDocDelta(db, userId, before, after);
  }
);

exports.updateMistakeTopicStatsOnDelete = onDocumentDeleted(
  {
    document: 'users/{userId}/mistakes/{mistakeId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const before = snap.data() || {};
    const userId = event.params?.userId;
    if (!userId) return;
    const db = admin.firestore();
    await applyMistakeDocDelta(db, userId, before, null);
  }
);

exports.rebuildMistakeTopicStats = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to rebuild mistake topic stats');
    }

    const db = admin.firestore();
    const mistakesRef = db.collection('users').doc(uid).collection('mistakes');
    const statsRef = db.collection('users').doc(uid).collection('mistake_stats').doc('topicBuckets');

    const topics = {};

    const pageSize = 800;
    let last = null;
    let processed = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = mistakesRef.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;

      snap.docs.forEach((docSnap) => {
        const m = docSnap.data() || {};
        const topic = getTopicFromMistake(m);
        if (!topic) return;
        const topicEnc = encodeKey(topic);
        const bucket = getBucketFromMistake(m);
        const isActive = getIsActiveFromMistake(m);

        const entry = topics[topicEnc] && typeof topics[topicEnc] === 'object' ? topics[topicEnc] : {};
        entry.total = Number(entry.total || 0) + 1;
        const bucketKey = `b_${bucket}`;
        entry[bucketKey] = Number(entry[bucketKey] || 0) + 1;
        if (isActive) entry.active = Number(entry.active || 0) + 1;
        topics[topicEnc] = entry;
      });

      processed += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    await statsRef.set({
      topics,
      processed,
      rebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true, userId: uid, processed, topics: Object.keys(topics).length };
  }
);

exports.pickMistakesForReview = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to pick mistakes');
    }

    const data = request.data && typeof request.data === 'object' ? request.data : {};
    const limitN = Math.min(Math.max(parseInt(data.limit || 40, 10) || 40, 1), 400);
    const filters = data.filters && typeof data.filters === 'object' ? data.filters : {};

    const datePeriod = safeString(filters.datePeriod || 'all');
    const selectedTopics = Array.isArray(filters.selectedTopics) ? filters.selectedTopics.filter(Boolean).map(String) : [];
    const selectedSubtopics = Array.isArray(filters.selectedSubtopics) ? filters.selectedSubtopics.filter(Boolean).map(String) : [];
    const selectedMasteryLevels = Array.isArray(filters.selectedMasteryLevels) ? filters.selectedMasteryLevels.filter(Boolean).map(String) : [];
    const srsPresence = safeString(filters.srsPresence || 'all');

    const db = admin.firestore();
    const mistakesRef = db.collection('users').doc(uid).collection('mistakes');

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const matchesSrs = (row) => {
      if (srsPresence === 'in_srs') return row && row.srsIsActive === true;
      if (srsPresence === 'not_in_srs') return normalizeBucket((row && row.srsBucket) || 'not_in_srs') === 'not_in_srs';
      return true;
    };

    const topics = selectedTopics;
    const subs = selectedSubtopics;
    const lvls = selectedMasteryLevels;

    const baseParts = [];
    if (datePeriod === 'week') baseParts.push(['lastWrongAt', '>=', weekAgo.toISOString()]);
    if (datePeriod === 'month') baseParts.push(['lastWrongAt', '>=', monthAgo.toISOString()]);

    if (topics.length === 1) baseParts.push(['Topic', '==', topics[0]]);
    else if (topics.length >= 2 && topics.length <= 10) baseParts.push(['Topic', 'in', topics]);

    if (subs.length === 1 && topics.length <= 1) baseParts.push(['Subtopic', '==', subs[0]]);

    if (srsPresence !== 'not_in_srs' && lvls.length === 1) baseParts.push(['srsBucket', '==', normalizeBucket(lvls[0])]);

    if (srsPresence === 'in_srs') baseParts.push(['srsIsActive', '==', true]);
    if (srsPresence === 'not_in_srs') baseParts.push(['srsBucket', '==', 'not_in_srs']);

    const collected = [];
    let fetched = 0;
    const maxFetch = 1200;
    const pageSize = 250;
    let last = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (collected.length >= limitN) break;
      if (fetched >= maxFetch) break;

      let q = mistakesRef.orderBy('lastWrongAt', 'desc');
      baseParts.forEach(([f, op, v]) => { q = q.where(f, op, v); });
      if (last) q = q.startAfter(last);
      q = q.limit(Math.min(pageSize, maxFetch - fetched));

      let snap;
      try {
        snap = await q.get();
      } catch (err) {
        const code = err && (err.code || err.status || err.statusCode);
        const details = err && (err.details || err.message || String(err));
        // Firestore missing index => FAILED_PRECONDITION (gRPC code 9)
        if (code === 9 || code === 'FAILED_PRECONDITION') {
          throw new HttpsError('failed-precondition', details);
        }
        throw new HttpsError('internal', details);
      }
      if (snap.empty) break;
      fetched += snap.size;
      last = snap.docs[snap.docs.length - 1];

      for (const docSnap of snap.docs) {
        const row = docSnap.data() || {};

        if (topics.length > 10) {
          const tp = safeString(row.Topic || row.topic || '');
          if (!tp || !topics.includes(tp)) continue;
        }

        if (subs.length > 1) {
          const sb = safeString(row.Subtopic || row.subtopic || '');
          if (!sb || !subs.includes(sb)) continue;
        }

        if (srsPresence !== 'not_in_srs' && lvls.length > 1) {
          const b = normalizeBucket(row.srsBucket || 'not_in_srs');
          if (!lvls.includes(b)) continue;
        }

        if (!matchesSrs(row)) continue;

        collected.push(docSnap.id);
        if (collected.length >= limitN) break;
      }

      if (snap.size < pageSize) break;
    }

    return {
      ok: true,
      userId: uid,
      ids: collected.slice(0, limitN),
      requested: limitN,
      fetched,
    };
  }
);

async function applySrsSummaryDelta(db, userId, dateStr, delta, topic, subtopic) {
  const uid = safeString(userId);
  const dateKey = safeString(dateStr);
  if (!uid || !dateKey || !Number.isFinite(delta) || delta === 0) return;

  const topicKey = encodeKey(topic || '');
  const subtopicKey = encodeKey(subtopic || '');
  const hasTopic = Boolean(topicKey);
  const hasSubtopic = Boolean(topicKey) && Boolean(subtopicKey);
  const compoundSubKey = hasSubtopic ? `${topicKey}::${subtopicKey}` : '';

  const summaryRef = db.collection('users').doc(uid).collection('srs_daily_summaries').doc(dateKey);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(summaryRef);
    const prev = snap.exists ? (snap.data() || {}) : {};

    const next = { ...prev };
    next.date = dateKey;
    next.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const prevTotal = Number(prev.dueTotal || 0);
    next.dueTotal = Math.max(0, prevTotal + delta);

    const prevTopics = prev.topicCounts && typeof prev.topicCounts === 'object' ? prev.topicCounts : {};
    const prevSubs = prev.subtopicCounts && typeof prev.subtopicCounts === 'object' ? prev.subtopicCounts : {};

    const nextTopics = { ...prevTopics };
    const nextSubs = { ...prevSubs };

    if (hasTopic) {
      const old = Number(nextTopics[topicKey] || 0);
      const v = Math.max(0, old + delta);
      if (v === 0) delete nextTopics[topicKey];
      else nextTopics[topicKey] = v;
    }

    if (hasSubtopic) {
      const old = Number(nextSubs[compoundSubKey] || 0);
      const v = Math.max(0, old + delta);
      if (v === 0) delete nextSubs[compoundSubKey];
      else nextSubs[compoundSubKey] = v;
    }

    next.topicCounts = nextTopics;
    next.subtopicCounts = nextSubs;

    tx.set(summaryRef, next, { merge: true });
  });
}

function isActiveCard(card) {
  if (!card || typeof card !== 'object') return false;
  if (card.isActive === false) return false;
  if (!card.userId) return false;
  if (!card.nextReviewDate) return false;
  return true;
}

// Define secrets (use new Firebase Functions params API)
const algoliaAppId = defineSecret('ALGOLIA_APP_ID');
const algoliaAdminKey = defineSecret('ALGOLIA_ADMIN_KEY');
const ALGOLIA_INDEX_NAME = 'forum_posts';

// Initialize Algolia client lazily at runtime
function getAlgoliaClient() {
  const appId = algoliaAppId.value();
  const adminKey = algoliaAdminKey.value();
  if (!appId || !adminKey) return null;
  return algoliasearch(appId, adminKey);
}

exports.aggregateCommentQuestionStatsOnCommentCreate = onDocumentCreated(
  {
    document: 'comments/{commentId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const comment = snap.data() || {};
    const questionId = comment.questionId != null ? String(comment.questionId) : '';
    if (!questionId) return;

    const createdAt = typeof comment.createdAt === 'string'
      ? comment.createdAt
      : new Date().toISOString();

    const db = admin.firestore();
    const statsRef = db.collection('comment_question_stats').doc(questionId);

    await db.runTransaction(async (tx) => {
      const statsSnap = await tx.get(statsRef);
      const prev = statsSnap.exists ? (statsSnap.data() || {}) : {};

      const prevLast = typeof prev.lastActivity === 'string' ? prev.lastActivity : '';
      const nextLastActivity = prevLast && prevLast > createdAt ? prevLast : createdAt;

      tx.set(statsRef, {
        questionId,
        commentCount: admin.firestore.FieldValue.increment(1),
        lastActivity: nextLastActivity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  }
);

exports.rebuildSrsDailySummaries = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to rebuild summaries');
    }

    const db = admin.firestore();

    // Page through all active cards for this user
    const cardsRef = db.collection('spaced_repetition_cards');
    const pageSize = 500;
    let last = null;
    let totalCards = 0;

    // dateStr => { dueTotal, topicCounts, subtopicCounts }
    const aggregated = new Map();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = cardsRef
        .where('userId', '==', uid)
        .where('isActive', '==', true)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(pageSize);

      if (last) {
        q = q.startAfter(last);
      }

      const snap = await q.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        const card = docSnap.data() || {};
        if (!card.nextReviewDate) continue;

        const dateKey = safeString(card.nextReviewDate);
        const topicEnc = encodeKey(card.topic || '');
        const subEnc = encodeKey(card.subtopic || '');
        const compound = (topicEnc && subEnc) ? `${topicEnc}::${subEnc}` : '';

        if (!aggregated.has(dateKey)) {
          aggregated.set(dateKey, {
            date: dateKey,
            dueTotal: 0,
            topicCounts: {},
            subtopicCounts: {},
          });
        }

        const entry = aggregated.get(dateKey);
        entry.dueTotal += 1;

        if (topicEnc) {
          entry.topicCounts[topicEnc] = (entry.topicCounts[topicEnc] || 0) + 1;
        }
        if (compound) {
          entry.subtopicCounts[compound] = (entry.subtopicCounts[compound] || 0) + 1;
        }
      }

      totalCards += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    // Write summaries for encountered dates (overwrite those docs).
    const summariesRef = db.collection('users').doc(uid).collection('srs_daily_summaries');
    const dateKeys = Array.from(aggregated.keys()).sort((a, b) => String(a).localeCompare(String(b)));

    let written = 0;
    for (let i = 0; i < dateKeys.length; i += 400) {
      const batch = db.batch();
      const slice = dateKeys.slice(i, i + 400);

      for (const dateKey of slice) {
        const data = aggregated.get(dateKey);
        const ref = summariesRef.doc(dateKey);
        batch.set(ref, {
          date: data.date,
          dueTotal: data.dueTotal,
          topicCounts: data.topicCounts,
          subtopicCounts: data.subtopicCounts,
          rebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await batch.commit();
      written += slice.length;
    }

    return {
      ok: true,
      userId: uid,
      cardsProcessed: totalCards,
      datesWritten: written,
    };
  }
);

// Maintain SRS daily summaries (cheap calendar counts)
exports.updateSrsDailySummaryOnCardCreate = onDocumentCreated(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const card = snap.data() || {};
    if (!isActiveCard(card)) return;

    const db = admin.firestore();
    await applySrsSummaryDelta(db, card.userId, card.nextReviewDate, 1, card.topic, card.subtopic);
  }
);

exports.updateSrsDailySummaryOnCardUpdate = onDocumentUpdated(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const before = event.data?.before?.data?.() || {};
    const after = event.data?.after?.data?.() || {};

    const beforeActive = isActiveCard(before);
    const afterActive = isActiveCard(after);

    const db = admin.firestore();

    // Removed from active set
    if (beforeActive && !afterActive) {
      await applySrsSummaryDelta(db, before.userId, before.nextReviewDate, -1, before.topic, before.subtopic);
      return;
    }

    // Added to active set
    if (!beforeActive && afterActive) {
      await applySrsSummaryDelta(db, after.userId, after.nextReviewDate, 1, after.topic, after.subtopic);
      return;
    }

    if (!beforeActive && !afterActive) return;

    const uid = after.userId || before.userId;
    const beforeDate = safeString(before.nextReviewDate);
    const afterDate = safeString(after.nextReviewDate);
    const beforeTopic = safeString(before.topic);
    const afterTopic = safeString(after.topic);
    const beforeSub = safeString(before.subtopic);
    const afterSub = safeString(after.subtopic);

    const dateChanged = beforeDate !== afterDate;
    const topicChanged = beforeTopic !== afterTopic;
    const subChanged = beforeSub !== afterSub;

    if (!dateChanged && !topicChanged && !subChanged) return;

    // Remove old
    await applySrsSummaryDelta(db, uid, beforeDate, -1, beforeTopic, beforeSub);
    // Add new
    await applySrsSummaryDelta(db, uid, afterDate, 1, afterTopic, afterSub);
  }
);

exports.updateSrsDailySummaryOnCardDelete = onDocumentDeleted(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const card = snap.data() || {};
    if (!isActiveCard(card)) return;

    const db = admin.firestore();
    await applySrsSummaryDelta(db, card.userId, card.nextReviewDate, -1, card.topic, card.subtopic);
  }
);

// Maintain daily cleared/milestone stats from SRS review attempts
exports.updateSrsDailySummaryOnAttemptCreate = onDocumentCreated(
  {
    document: 'review_attempts/{attemptId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const attempt = snap.data() || {};

    const uid = safeString(attempt.userId);
    if (!uid) return;

    const attemptedAt = safeString(attempt.attemptedAt);
    if (!attemptedAt) return;

    const wasCorrect = attempt.wasCorrect === true;
    const statusBefore = attempt?.stateBefore?.status;

    const db = admin.firestore();
    await applySrsAttemptDelta(db, uid, attemptedAt, wasCorrect ? 1 : 0, statusBefore);
  }
);

 function toHongKongDate(dateObj) {
   // Convert an instant-in-time to a Date whose UTC fields represent Asia/Hong_Kong local time.
   // This avoids discrepancies between browser local time (HK) and Cloud Functions runtime (UTC).
   const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
   return new Date(d.getTime() + 8 * 60 * 60 * 1000);
 }

function getWeeklyKeyForDate(dateObj) {
  // Use UTC getters so output is independent of the runtime's local timezone.
  const date = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const yyyy = date.getUTCFullYear();
  return `leaderboard_weekly_${yyyy}-W${String(weekNo).padStart(2, '0')}`;
}

function weeklyTokensForRank(rank) {
  const r = Number(rank || 0);
  if (!Number.isFinite(r) || r <= 0) return 0;
  // Keep consistent with frontend logic: max(0, 11 - rank)
  return Math.max(0, 11 - r);
}

exports.aggregateWeeklyLeaderboardOnAttemptCreate = onDocumentCreated(
  {
    document: 'attempts/{attemptId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const attemptData = snap.data() || {};
    const userId = attemptData.userId;
    if (!userId) return;

    const attemptTs = attemptData.timestamp ? new Date(attemptData.timestamp) : new Date();
    const weekId = getWeeklyKeyForDate(toHongKongDate(attemptTs));

    const db = admin.firestore();
    const entryRef = db.collection('weekly_leaderboards').doc(weekId).collection('entries').doc(userId);
    const userRef = db.collection('users').doc(userId);

    await db.runTransaction(async (tx) => {
      const [entrySnap, userSnap] = await Promise.all([
        tx.get(entryRef),
        tx.get(userRef),
      ]);

      const userData = userSnap.exists ? userSnap.data() : {};
      const prev = entrySnap.exists ? entrySnap.data() : {};

      const prevAttemptCount = Number(prev.attemptCount || 0);
      const prevTotalScore = Number(prev.totalScore || 0);
      const prevTotalQuestions = Number(prev.totalQuestions || 0);
      const prevTotalCorrect = Number(prev.totalCorrect || 0);

      const nextAttemptCount = prevAttemptCount + 1;
      const nextTotalScore = prevTotalScore + Number(attemptData.percentage || 0);
      const nextTotalQuestions = prevTotalQuestions + Number(attemptData.totalQuestions || 0);
      const nextTotalCorrect = prevTotalCorrect + Number(attemptData.correctAnswers || 0);
      const nextAverageScore = nextAttemptCount > 0 ? Math.round(nextTotalScore / nextAttemptCount) : 0;

      tx.set(entryRef, {
        userId,
        weekId,
        displayName: userData?.displayName || 'Unknown',
        level: userData?.level || null,
        equippedProfilePic: (userData?.equipped || {}).profilePic || 'flask_blue',
        equippedTheme: (userData?.equipped || {}).theme || 'default',
        streak: Number(userData?.streak || 0),
        attemptCount: nextAttemptCount,
        totalScore: nextTotalScore,
        averageScore: nextAverageScore,
        totalQuestions: nextTotalQuestions,
        totalCorrect: nextTotalCorrect,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  }
);

exports.weeklyLeaderboardPayout = onSchedule(
  {
    schedule: '0 0 * * 1',
    timeZone: 'Asia/Hong_Kong',
    region: 'asia-east1',
  },
  async () => {
    const db = admin.firestore();

    // Run payout for LAST week (so the leaderboard is complete)
    const now = toHongKongDate(new Date());
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const weekId = getWeeklyKeyForDate(toHongKongDate(lastWeekDate));

    const entriesRef = db.collection('weekly_leaderboards').doc(weekId).collection('entries');
    const topSnap = await entriesRef.orderBy('averageScore', 'desc').limit(10).get();

    if (topSnap.empty) return;

    // Batch-like loop (transactions per user to keep idempotency + correct balances)
    const payoutPromises = topSnap.docs.map(async (docSnap, idx) => {
      const entry = docSnap.data() || {};
      const userId = entry.userId || docSnap.id;
      const rank = idx + 1;
      const tokens = weeklyTokensForRank(rank);
      if (!userId || tokens <= 0) return;

      const payoutRef = db
        .collection('weekly_leaderboards')
        .doc(weekId)
        .collection('payouts')
        .doc(userId);

      const userRef = db.collection('users').doc(userId);

      await db.runTransaction(async (tx) => {
        const [payoutSnap, userSnap] = await Promise.all([
          tx.get(payoutRef),
          tx.get(userRef),
        ]);

        if (payoutSnap.exists) {
          return; // already paid
        }

        if (!userSnap.exists) {
          // still record payout marker to avoid repeated attempts
          tx.set(payoutRef, {
            userId,
            weekId,
            rank,
            tokens,
            skipped: true,
            reason: 'User doc missing',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return;
        }

        const userData = userSnap.data() || {};
        const currentTokens = Number(userData.tokens || 0);
        const newTokens = currentTokens + tokens;

        tx.update(userRef, {
          tokens: newTokens,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const historyRef = userRef.collection('tokenHistory').doc();
        tx.set(historyRef, {
          amount: tokens,
          reason: `Leaderboard Reward: weekly #${rank}`,
          type: 'gain',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          balanceAfter: newTokens,
          metadata: {
            category: 'leaderboard',
            period: 'weekly',
            rank,
            weekId,
          },
        });

        const notifRef = db.collection('notifications').doc();
        tx.set(notifRef, {
          recipientId: userId,
          senderId: 'system',
          type: 'leaderboard_reward',
          senderDisplayName: 'System',
          previewText: `Weekly leaderboard #${rank}: +${tokens} tokens`,
          read: false,
          createdAt: new Date().toISOString(),
          weekId,
          rank,
          tokens,
        });

        tx.set(payoutRef, {
          userId,
          weekId,
          rank,
          tokens,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    });

    await Promise.all(payoutPromises);
  }
);

// === Algolia search sync for forum_posts ===

// Helper: prepare Algolia record from Firestore doc
function toAlgoliaRecord(postId, data) {
  return {
    objectID: postId,
    title: data.title || '',
    content: data.content || '',
    category: data.category || '',
    userDisplayName: data.userDisplayName || '',
    userId: data.userId || '',
    createdAt: data.createdAt || '',
    // You can add more fields if you want them searchable/filterable
  };
}

// Create: when a new forum post is created
exports.syncForumPostToAlgoliaOnCreate = onDocumentCreated(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};
    const postId = event.params.postId;
    const record = toAlgoliaRecord(postId, data);
    await algoliaIndex.saveObject(record);
  }
);

// Update: when a forum post is updated
exports.syncForumPostToAlgoliaOnUpdate = onDocumentUpdated(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const snap = event.data;
    if (!snap) return;
    const data = snap.after.data() || {};
    const postId = event.params.postId;
    const record = toAlgoliaRecord(postId, data);
    await algoliaIndex.saveObject(record);
  }
);

// Delete: when a forum post is deleted
exports.syncForumPostToAlgoliaOnDelete = onDocumentDeleted(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const postId = event.params.postId;
    await algoliaIndex.deleteObject(postId);
  }
);
