import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export function useLanguage() {
  return useContext(LanguageContext);
}

// Translation dictionary
const translations = {
  en: {
    // Branding
    appName: "ChemLeung HKDSE MCQ Practice Platform",
    tagline: "HKDSE Chemistry Practice",
    
    // Navigation
    nav: {
      dashboard: "Dashboard",
      practice: "Practice",
      leaderboard: "Leaderboard",
      history: "History",
      profile: "Profile",
      logout: "Logout",
    },
    
    // Dashboard
    dashboard: {
      welcomeBack: "Welcome back",
      totalAttempts: "Total Attempts",
      overallAccuracy: "Overall Accuracy",
      questionsSolved: "Questions Solved",
      correctAnswers: "Correct Answers",
      studyStreak: "Study Streak",
      days: "days",
      startNewQuiz: "Start New Quiz",
      viewLeaderboard: "View Leaderboard",
      recentAttempts: "Recent Attempts",
      noAttempts: "No attempts yet!",
      takeFirstQuiz: "Take Your First Quiz",
      browseForm: "Browse Forum",
      mistakeNotebook: "Mistake Notebook",
      logout: "Logout",
      confirmLogout: "Confirm Logout",
      areYouSureLogout: "Are you sure you want to logout?",
      needSignInAgain: "You will need to sign in again to access your account and continue practicing.",
      cancel: "Cancel",
      errorLoadingAttempts: "Error Loading Attempts",
      retry: "Retry",
      clickRowFullAnalysis: "Click any row to see full analysis",
      refresh: "Refresh",
      noDataYet: "No data yet",
      completeQuizSeeResults: "Complete a quiz to see your results here",
      correct: "correct",
      timeSpent: "Time spent",
      loadingDashboard: "Loading dashboard...",
    },
    
    // Practice Modes
    practice: {
      selectMode: "Select Practice Mode",
      timed: "Timed Practice",
      timedDesc: "Race against the clock - {minutes} minutes",
      marathon: "Marathon Mode",
      marathonDesc: "Unlimited time - track your progress",
      custom: "Custom Session",
      customDesc: "Choose topics and question count",
      startPractice: "Start Practice",
      selectPracticeMode: "Select Practice Mode",
      chooseHowPractice: "Choose how you want to practice today",
      perQuestion: "min per question",
      perfectForExam: "Perfect for exam simulation with a countdown timer.",
      takeYourTime: "Take your time. We'll track duration but no pressure!",
      chooseSpecificTopics: "Choose specific topics, subtopics, and question count.",
      questions: "Questions:",
      configure: "Configure",
      yourAvailableTopics: "Your Available Topics",
      more: "more",
      noTopicsConfigured: "No topics configured!",
      pleaseSetTopics: "Please set which topics you've learned in your Profile settings.",
      goToProfile: "Go to Profile",
      updateTopics: "Update Topics",
    },
    
    // Quiz Interface
    quiz: {
      question: "Question",
      of: "of",
      flagQuestion: "Flag Question",
      unflagQuestion: "Unflag Question",
      periodicTable: "Periodic Table",
      overview: "Overview",
      previous: "Previous",
      next: "Next",
      submit: "Submit",
      answered: "Answered",
      flagged: "Flagged",
      skipped: "Skipped",
      timeRemaining: "Time Remaining",
      sessionTime: "Session Time",
      totalTime: "Total Time",
      initializingQuiz: "Initializing quiz...",
      type: "Type",
      toSelect: "to select",
      flag: "flag",
      tools: "Tools",
      backToTopics: "Back to Topics",
      periodicTableOfElements: "Periodic Table of Elements",
      time: "Time",
      thisQuestion: "This Question:",
      questionOverview: "Question Overview",
      tip: "Tip:",
      press: "Press",
      pleaseAnswerAll: "Please answer all questions before submitting.",
      finishSubmit: "Finish & Submit",
      confirmBackToTopics: "Are you sure you want to go back to topic selection?\n\n⚠️ ALL YOUR PROGRESS WILL BE LOST!",
      enableTimer: "Enable Timer",
      trackTimeSpent: "Track time spent on questions",
      showTimer: "Show Timer",
      countdown: "Countdown",
      timedMode: "Timed Mode",
      countdownTimer: "Countdown with time limit",
      timeUp: "Time's up! Your quiz will be submitted now.",
    },
    
    // Results
    results: {
      yourPerformance: "Your Performance",
      totalTime: "Total Time",
      averagePerQuestion: "Average per MCQ",
      strengths: "Strengths",
      needsFocus: "Needs Focus",
      detailedReview: "Detailed Review",
      yourAnswer: "Your Answer",
      correctAnswer: "Correct Answer",
      explanation: "Explanation",
      shareReport: "Share Report Card",
      addToNotebook: "Add to Mistake Notebook",
      startNewSession: "Start New Session",
      savingToProfile: "Saving to your profile...",
      savedToProfile: "Saved to your profile!",
    },
    
    // Profile
    profile: {
      profileSettings: "Profile Settings",
      yourStatistics: "Your Statistics",
      displayName: "Display Name",
      email: "Email Address",
      schoolLevel: "School Level (Form)",
      studyLevel: "Current Study Level",
      memberSince: "Member Since",
      saveChanges: "Save Changes",
      topicExceptions: "Topic Exceptions",
      unlockTopic: "Unlock Topic",
      lockTopic: "Lock Topic",
      manageAccount: "Manage your account and learning preferences",
      totalAttempts: "Total Attempts",
      overallAccuracy: "Overall Accuracy",
      questionsSolved: "Questions Solved",
      accountInformation: "Account Information",
      profileUpdated: "Profile updated successfully!",
      failedUpdate: "Failed to update profile. Please try again.",
      enterYourName: "Enter your name",
      emailCannotChange: "Email cannot be changed",
      selectCurrentForm: "Select your current form (Secondary 4, 5, or 6)",
      topicsLearnedUpTo: "Topics Learned Up To",
      selectHighestTopic: "Select the highest topic number you've learned. For example, \"08\" means you've learned topics 01-08.",
      topicExceptionsLabel: "Topic Exceptions (Mark topics NOT learned)",
      clickToExclude: "Click to exclude topics you haven't covered yet, even though they're below your \"learned up to\" level.",
      yourAvailableTopicsCount: "Your Available Topics",
      theseTopicsWillAppear: "These topics will appear in your Timed and Marathon practice modes.",
      saving: "Saving...",
    },
    
    // Leaderboard
    leaderboard: {
      title: "Leaderboard",
      thisWeek: "This Week",
      thisMonth: "This Month",
      allTime: "All Time",
      you: "You",
      attempts: "attempts",
      questions: "questions",
      seeHowYouRank: "See how you rank against other students",
      noDataYet: "No data yet",
      beFirstComplete: "Be the first to complete a quiz!",
      howRankingsWork: "How rankings work:",
      averageScoreLast7: "Average score from all attempts in the last 7 days",
      averageScoreLast30: "Average score from all attempts in the last 30 days",
      overallAccuracyAllTime: "Overall accuracy across all attempts ever",
      formLevel: "S4/S5/S6 = form level",
      flameStreak: "Flame = consecutive study days",
    },
    
    // Forum
    forum: {
      title: "The MCQ Forum",
      discuss: "Discuss",
      addComment: "Add Comment",
      editComment: "Edit Comment",
      deleteComment: "Delete Comment",
      noComments: "No comments yet. Be the first to discuss!",
      loading: "Loading discussion...",
      connectDiscuss: "Connect and discuss with other students",
      notifications: "Notifications",
      markAllRead: "Mark all read",
      noNotificationsYet: "No notifications yet",
      likedYourComment: "liked your comment",
      repliedToPost: "replied to your post",
      likedYourPost: "liked your post",
      likedYourReply: "liked your reply",
      justNow: "Just now",
      mcqDiscussion: "MCQ Discussion",
      generalForum: "General Forum",
      searchQuestions: "Search questions, topics, DSE codes...",
      recent: "Recent",
      popular: "Popular",
      questionsWithDiscussions: "questions with discussions",
      noResultsFound: "No results found",
      noMcqDiscussions: "No MCQ discussions yet. Start one from any quiz!",
      comments: "comments",
      searchPosts: "Search posts...",
      all: "All",
      newPost: "New Post",
      noPosts: "No posts yet. Be the first!",
      createPost: "Create a Post",
      backToForum: "Back to forum",
      edited: "edited",
      save: "Save",
      cancel: "Cancel",
      replies: "Replies",
      writeReply: "Write a reply...",
      reply: "Reply",
      pleaseLoginReply: "Please log in to reply.",
      createNewPost: "Create New Post",
      category: "Category",
      title2: "Title",
      enterClearTitle: "Enter a clear, descriptive title",
      content: "Content",
      shareThoughts: "Share your thoughts, question, or announcement...",
      post: "Post",
      deletePost: "Delete this post?",
      deleteReply: "Delete this reply?",
      editExpired: "Edit window expired (15 min).",
    },
    
    // Mistake Notebook
    notebook: {
      // Main Navigation
      title: "Mistake Notebook",
      commandCenter: "Mistake Command Center",
      mistakeDeck: "Mistake Deck",
      learningInsights: "Learning Insights",
      learningAnalytics: "Learning Analytics",
      masteryArchive: "Mastery Archive",
      
      // Actions
      review: "Review Mistakes",
      practiceMistakes: "Practice Mistakes Only",
      practiceMistakesCount: "Practice {count} Mistake{plural}",
      practiceSelected: "Practice {count} Selected",
      cleared: "All mistakes cleared!",
      addedToNotebook: "Added to Mistake Notebook",
      removedFromNotebook: "Removed from Notebook",
      reviewMaster: "Review and master questions you got wrong",
      
      // Full Question Modal
      questionDetail: "Question Detail",
      question: "Question",
      options: "Options",
      viewFullQuestion: "View Full Question",
      viewFull: "View Full",
      attempts: "Attempts",
      masteryLevelLabel: "Mastery Level",
      lastAttemptedLabel: "Last Attempted",
      
      // Statistics
      totalMistakes: "Total Mistakes",
      topicsToFocus: "Topics to Focus",
      repeatedMistakes: "Repeated Mistakes",
      
      // Configurator
      configurePractice: "Configure Practice Session",
      numberOfQuestions: "Questions",
      questionsLabel: "1. Number of Questions",
      questionsAvailable: "available",
      questionsAvailableFull: "questions available with current filters",
      timeRange: "Time Range",
      timeRangeLabel: "2. Time Range (when you made the mistake)",
      allTime: "All Time",
      lastMonth: "Last Month",
      lastWeek: "Last Week",
      default: "default",
      
      // Filters
      topics: "Topics",
      topicsLabel: "3. Topics (leave empty for all)",
      subtopics: "Subtopics",
      subtopicsFilteredNote: "(filtered by selected topics)",
      masteryLevel: "Mastery Level",
      clearTopicFilter: "✕ Clear topic filter",
      clearSubtopicFilter: "Clear subtopic filter",
      clearMasteryFilter: "Clear mastery filter",
      filteredFrom: "Filtered from",
      clearSelection: "Clear Selection",
      
      // Mastery Status Labels
      masteryNew: "New",
      masteryDeveloping: "Developing",
      masteryProgressing: "Progressing",
      masteryNear: "Near-Mastery",
      statusUnprocessed: "Unprocessed",
      statusInProgress: "In Progress",
      statusNearMastery: "Near Mastery",
      
      // Empty States
      allMistakes: "All Mistakes",
      noMistakesYet: "No mistakes yet!",
      keepPracticing: "Keep practicing. Wrong answers appear here.",
      startPracticing: "Start Practicing",
      noQuestionsFound: "No questions match your filters",
      tryAdjustFilters: "Try adjusting your filter settings",
      noArchivedYet: "No archived questions yet",
      archiveInstructions: "Answer 3 questions correctly to archive them",
      allCaughtUp: "All caught up!",
      
      // Question Details
      lastAttempt: "Last Attempt",
      missed: "Missed {count}×",
      yourAnswer: "Your Answer",
      correctAnswer: "Correct Answer",
      correct: "Correct",
      explanation: "Explanation",
      priority: "Priority",
      
      // How It Works
      howItWorks: "How it works",
      wrongAnswersAutoSaved: "Wrong answers are auto-saved here",
      useFilters: "Use filters to focus on specific topics or recent mistakes",
      practiceUntilMaster: "Practice until you master them!",
      clearAfterThreeCorrect: "✨ Questions automatically clear after 3 consecutive correct attempts!",
      
      // Loading States
      loadingMistakes: "Loading mistakes...",
      sessionLimited: "Session limited to {max} questions maximum.",
      
      // Topic Analysis
      topicBreakdown: "Topic Breakdown",
      hoverForDetails: "Hover over stats for details",
      weakTopics: "Weak Topics",
      focusTheseTopics: "Focus on these topics",
      repeatsByTopic: "Repeated Mistakes by Topic",
      needMorePractice: "Need more practice",
      improved: "Improved {count}",
      
      // Retention Dashboard
      retentionDashboard: "Retention Dashboard",
      addedThisWeek: "Added (7d)",
      masteredThisWeek: "Mastered (7d)",
      decayRate: "Decay Rate",
      decayImproving: "📈 Improving",
      decayStable: "⚖️ Stable",
      decayGrowing: "📉 Growing",
      weakestSubtopics: "Weakest Subtopics",
      urgentReviews: "Urgent Reviews (by priority score)",
      
      // Priority Badge
      priorityScore: "Spaced Repetition Priority Score",
      
      // Metacognitive Tagging
      errorTypeLabel: "Error Type:",
      tagErrorType: "Tag Error Type",
      errorCategory: "Error Category",
      clearTag: "Clear tag",
      errorMisread: "Misread Question",
      errorConceptual: "Conceptual Gap",
      errorCalculation: "Calculation Error",
      errorCareless: "Careless Mistake",
      errorVocabulary: "Vocabulary Gap",
      errorDiagram: "Diagram Misread",
      tagError: "Tag Error",
      
      // Extra Notes
      spacedRepetitionNote: "Cards sorted by Spaced Repetition priority — highest urgency first.",
      metacognitiveNote: "Tag each mistake with an Error Category to track your patterns.",
      
      // Learning Analytics Dashboard
      mistakeClearingActivity: "Mistake Clearing Activity",
      errorDensityByTopic: "Error Density by Topic",
      improvementTrend: "Improvement Trend (14 days)",
      clickTopicToFilter: "Click a topic to filter →",
      clickTopicsToFilter: "Click topics to filter (multi-select)",
      less: "Less",
      more: "More",
      
      // AI Daily Mission
      aiDailyMission: "AI Daily Mission",
      aiDailyMissionNote: "Smart AI selects 10 questions with interleaved practice to maximize retention.",
      needMoreQuestions: "Need 10+ mistakes (have {count})",
      interleavedPractice: "10 Questions • Interleaved Practice",
      
      // Timer Settings
      timerEnabled: "Timer Enabled",
      timedMode: "Timed Mode",
      
      // View Modes
      listView: "List View",
      kanbanView: "Kanban View",
      selectAll: "Select All",
      
      // Archive
      mastered: "Mastered",
      masteredOn: "Mastered {date}",
      archivedAt: "Archived at",
      
      // Filter Pills
      topicFilter: "Topic: {topic}",
    },
    
    // History
    history: {
      title: "Practice History",
      clickToSeeAnalysis: "Click any attempt to see the full analysis",
      totalAttempts: "Total Attempts",
      averageScore: "Average Score",
      bestScore: "Best Score",
      totalTime: "Total Time",
      filtersAndSorting: "Filters & Sorting",
      timePeriod: "Time Period",
      allTime: "All Time",
      lastMonth: "Last Month",
      lastWeek: "Last Week",
      sortBy: "Sort By",
      recent: "Recent",
      score: "Score",
      time: "Time",
      yourAttempts: "Your Attempts",
      clickViewAnalysis: "Click to view full analysis",
      refresh: "Refresh",
      noAttemptsFound: "No attempts found",
      tryChangingFilter: "Try changing the filter period",
      startPracticingHistory: "Start practicing to see your history!",
      takeFirstQuiz: "Take Your First Quiz",
      correct: "correct",
      loadingHistory: "Loading your history...",
    },
    
    // Common
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      retry: "Retry",
      backToTopics: "Back to Topics",
    },
    
    // Authentication
    auth: {
      login: "Login",
      register: "Register",
      email: "Email Address",
      password: "Password",
      confirmPassword: "Confirm Password",
      fullName: "Full Name",
      createAccount: "Create Account",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
      loginHere: "Login here",
      registerHere: "Register here",
      welcomeBack: "Welcome Back",
      enterCredentials: "Enter your credentials to access your account",
      signingIn: "Signing in...",
      signIn: "Sign In",
      createAccountNow: "Create one now",
      secureLogin: "Secure login powered by Firebase Authentication",
      noAccountFound: "No account found with this email.",
      incorrectPassword: "Incorrect password.",
      invalidEmail: "Invalid email address.",
      failedLogin: "Failed to log in. Please check your credentials.",
      joinCommunity: "Join our chemistry learning community",
      creatingAccount: "Creating account...",
      passwordsNoMatch: "Passwords do not match",
      passwordMinLength: "Password must be at least 6 characters",
      enterFullName: "Please enter your full name",
      emailAlreadyInUse: "An account with this email already exists.",
      weakPassword: "Password is too weak. Use at least 6 characters.",
      failedCreateAccount: "Failed to create account. Please try again.",
      minimumCharacters: "Minimum 6 characters",
      secureRegistration: "Secure registration powered by Firebase Authentication",
      switchToChinese: "Switch to Traditional Chinese",
      switchToEnglish: "切換至英文",
    },

    // ChemStore
    store: {
      title: "ChemStore",
      subtitle: "Unlock exclusive items with your tokens",
      yourBalance: "Your Balance",
      profilePics: "Profile Pics",
      badges: "Badges",
      themes: "Themes",
      equipped: "Equipped",
      equip: "Equip",
      buy: "Buy",
      claim: "Claim",
      locked: "Locked",
      buying: "Buying...",
      comingSoon: "Coming soon! 🚀",
      howToEarnTokens: "How to Earn Tokens",
      perfectScore: "Perfect MCQ Score (100%):",
      perfectScoreTokens: "10 tokens",
      excellentScore: "Excellent Score (80%+):",
      excellentScoreTokens: "5 tokens",
      goodScore: "Good Score (60%+):",
      goodScoreTokens: "2 tokens",
      clearMistake: "Clear Mistake:",
      clearMistakeTokens: "1 token (once per question per day)",
      leaderboardGold: "Leaderboard Gold:",
      leaderboardTokens: "60 tokens (weekly) / 10 tokens (daily)",
      studyStreaks: "Study Streaks:",
      studyStreaksTokens: "15 tokens (7 days) / 50 tokens (30 days)",
      notEnoughTokens: "Not enough tokens! 💸",
      purchased: "Purchased {name}! 🎉",
      purchaseFailed: "Purchase failed",
      failedToEquip: "Failed to equip",
      pleaseTryAgain: "Please try again.",
      failedToEquipItem: "Failed to equip item",
    },

    // Practice Mode Selection
    practiceMode: {
      updateYourTopics: "Update Your Topics",
      learnedUpTo: "Learned Up To:",
      exceptions: "Exceptions (Not Learned):",
      saveChanges: "Save Changes",
      updating: "Updating...",
      topicsUpdated: "Topics updated successfully!",
      failedUpdate: "Failed to update topics",
      configureCustomSession: "Configure Custom Session",
      back: "Back",
      selectTopics: "1. Select Topics (Multi-choice)",
      lockedTopicsNotLearned: "Locked topics not yet learned. Update in Profile or click button above.",
      focusSubtopics: "2. Focus on Subtopics (Optional)",
      sessionLength: "3. Session Length",
      generateExam: "GENERATE EXAM",
      startPractice: "Start Practice",
    },
  },
  
  zh: {
    // 品牌
    appName: "ChemLeung HKDSE MCQ 練習平台",
    tagline: "HKDSE 化學練習",
    
    // 導航
    nav: {
      dashboard: "總覧",
      practice: "練習",
      leaderboard: "排行榜",
      history: "歷史記錄",
      profile: "個人資料",
      logout: "登出",
    },
    
    // 儀表板
    dashboard: {
      welcomeBack: "歡迎回來",
      totalAttempts: "總測驗次數",
      overallAccuracy: "整體準確率",
      questionsSolved: "已完成題目",
      correctAnswers: "正確答案",
      studyStreak: "連續學習天數",
      days: "天",
      startNewQuiz: "開始新測驗",
      viewLeaderboard: "查看排行榜",
      recentAttempts: "最近測驗",
      noAttempts: "尚未進行測驗！",
      takeFirstQuiz: "開始您的第一個測驗",
      browseForm: "瀏覽討論區",
      mistakeNotebook: "錯題簿",
      logout: "登出",
      confirmLogout: "確認登出",
      areYouSureLogout: "確定要登出嗎？",
      needSignInAgain: "您需要再次登入才能訪問您的帳戶並繼續練習。",
      cancel: "取消",
      errorLoadingAttempts: "載入記錄失敗",
      retry: "重試",
      clickRowFullAnalysis: "點擊記錄查看完整分析",
      refresh: "刷新",
      noDataYet: "暫無數據",
      completeQuizSeeResults: "完成測驗後記錄將顯示於此",
      correct: "正確",
      timeSpent: "用時",
      loadingDashboard: "載入總覧中...",
    },
    
    // 練習模式
    practice: {
      selectMode: "選擇練習模式",
      timed: "限時練習",
      timedDesc: "與時間競賽 - {minutes} 分鐘",
      marathon: "馬拉松模式",
      marathonDesc: "無限時間 - 追蹤您的進度",
      custom: "自定義練習",
      customDesc: "選擇主題和題目數量",
      startPractice: "開始練習",
      selectPracticeMode: "選擇練習模式",
      chooseHowPractice: "選擇您的練習方式",
      perQuestion: "分鐘每題",
      perfectForExam: "最適合考試模擬，帶有倒數計時器。",
      takeYourTime: "慢慢來。我們會記錄時間但沒有壓力！",
      chooseSpecificTopics: "選擇特定主題、子主題和題數。",
      questions: "題數：",
      configure: "設定",
      yourAvailableTopics: "您可用的主題",
      more: "更多",
      noTopicsConfigured: "尚未設定主題！",
      pleaseSetTopics: "請在個人資料設定中設定您已學習的主題。",
      goToProfile: "前往個人資料",
      updateTopics: "更新主題",
    },
    
    // 測驗介面
    quiz: {
      question: "題目",
      of: "共",
      flagQuestion: "標記題目",
      unflagQuestion: "取消標記",
      periodicTable: "元素週期表",
      overview: "總覽",
      previous: "上一題",
      next: "下一題",
      submit: "提交",
      answered: "已答",
      flagged: "已標記",
      skipped: "跳過",
      timeRemaining: "剩餘時間",
      sessionTime: "練習時間",
      totalTime: "總時間",
      initializingQuiz: "初始化測驗中...",
      type: "輸入",
      toSelect: "選擇",
      flag: "標記",
      tools: "工具",
      backToTopics: "返回主題",
      periodicTableOfElements: "元素週期表",
      time: "時間",
      thisQuestion: "本題時間：",
      questionOverview: "題目概覽",
      tip: "提示：",
      press: "按",
      pleaseAnswerAll: "請在提交前回答所有問題。",
      finishSubmit: "完成並提交",
      confirmBackToTopics: "確定要返回主題選擇嗎？\n\n⚠️ 您的所有進度將會丟失！",
      enableTimer: "啟用計時器",
      trackTimeSpent: "追蹤每題用時",
      showTimer: "顯示計時器",
      countdown: "倒數計時",
      timedMode: "限時模式",
      countdownTimer: "倒數計時並設時限",
      timeUp: "時間到！您的測驗將立即提交。",
    },
    
    // 成績
    results: {
      yourPerformance: "您的表現",
      totalTime: "總時間",
      averagePerQuestion: "每題平均時間",
      strengths: "優勢領域",
      needsFocus: "需要加強",
      detailedReview: "詳細檢討",
      yourAnswer: "您的答案",
      correctAnswer: "正確答案",
      explanation: "解釋",
      shareReport: "分享成績單",
      addToNotebook: "加入錯題簿",
      startNewSession: "開始新練習",
      savingToProfile: "保存至您的個人資料...",
      savedToProfile: "已保存至您的個人資料！",
    },
    
    // 個人資料
    profile: {
      profileSettings: "個人設定",
      yourStatistics: "您的統計資料",
      displayName: "顯示名稱",
      email: "電郵地址",
      schoolLevel: "年級（中學）",
      studyLevel: "當前學習程度",
      memberSince: "註冊日期",
      saveChanges: "儲存變更",
      topicExceptions: "主題例外",
      unlockTopic: "解鎖主題",
      lockTopic: "鎖定主題",
      manageAccount: "管理您的帳戶和學習偏好",
      totalAttempts: "總測驗次數",
      overallAccuracy: "整體準確率",
      questionsSolved: "已完成題目",
      accountInformation: "帳戶資訊",
      profileUpdated: "個人資料更新成功！",
      failedUpdate: "更新個人資料失敗。請重試。",
      enterYourName: "輸入您的名稱",
      emailCannotChange: "電郵地址無法更改",
      selectCurrentForm: "選擇您目前的年級（中四、中五或中六）",
      topicsLearnedUpTo: "已學習至的主題",
      selectHighestTopic: "選擇您已學習的最高主題編號。例如，「08」表示您已學習主題 01-08。",
      topicExceptionsLabel: "主題例外（標記尚未學習的主題）",
      clickToExclude: "點擊以排除您尚未涵蓋的主題，即使它們低於您的「已學習至」級別。",
      yourAvailableTopicsCount: "您可用的主題",
      theseTopicsWillAppear: "這些主題將出現在您的計時和馬拉松練習模式中。",
      saving: "保存中...",
    },
    
    // 排行榜
    leaderboard: {
      title: "排行榜",
      thisWeek: "本週",
      thisMonth: "本月",
      allTime: "歷史總榜",
      you: "您",
      attempts: "次測驗",
      questions: "題",
      seeHowYouRank: "看看您在其他學生中的排名",
      noDataYet: "暫無數據",
      beFirstComplete: "成為第一個完成測驗的人！",
      howRankingsWork: "排名規則：",
      averageScoreLast7: "過去 7 天所有測驗的平均分數",
      averageScoreLast30: "過去 30 天所有測驗的平均分數",
      overallAccuracyAllTime: "所有測驗的整體準確率",
      formLevel: "S4/S5/S6 = 年級",
      flameStreak: "火焰 = 連續學習天數",
    },
    
    // 論壇
    forum: {
      title: "MCQ 討論區",
      discuss: "討論",
      addComment: "新增評論",
      editComment: "編輯評論",
      deleteComment: "刪除評論",
      noComments: "尚無評論。成為第一個討論的人！",
      loading: "載入討論中...",
      connectDiscuss: "與其他學生交流討論",
      notifications: "通知",
      markAllRead: "全部已讀",
      noNotificationsYet: "暫無通知",
      likedYourComment: "點讚了您的評論",
      repliedToPost: "回覆了您的帖子",
      likedYourPost: "點讚了您的帖子",
      likedYourReply: "點讚了您的回覆",
      justNow: "剛剛",
      mcqDiscussion: "MCQ 討論",
      generalForum: "一般討論區",
      searchQuestions: "搜尋題目、主題、DSE 代碼...",
      recent: "最新",
      popular: "熱門",
      questionsWithDiscussions: "個題目有討論",
      noResultsFound: "找不到結果",
      noMcqDiscussions: "尚無MCQ討論。在測驗中開始討論！",
      comments: "則評論",
      searchPosts: "搜尋帖子...",
      all: "全部",
      newPost: "新帖子",
      noPosts: "暫無帖子，成為第一個！",
      createPost: "建立帖子",
      backToForum: "返回討論區",
      edited: "已編輯",
      save: "儲存",
      cancel: "取消",
      replies: "則回覆",
      writeReply: "撰寫回覆...",
      reply: "回覆",
      pleaseLoginReply: "請登入以回覆。",
      createNewPost: "建立新帖子",
      category: "類別",
      title2: "標題",
      enterClearTitle: "輸入清晰的標題",
      content: "內容",
      shareThoughts: "分享您的想法、問題或公告...",
      post: "發表",
      deletePost: "刪除此帖子？",
      deleteReply: "刪除此回覆？",
      editExpired: "編輯時間已過（15分鐘）。",
    },
    
    // 錯題簿
    notebook: {
      // 主導航
      title: "錯題簿",
      commandCenter: "錯題指揮中心",
      mistakeDeck: "錯題卡組",
      learningInsights: "學習洞察",
      learningAnalytics: "學習分析",
      masteryArchive: "掌握檔案",
      
      // 操作
      review: "檢討錯題",
      practiceMistakes: "只練習錯題",
      practiceMistakesCount: "練習 {count} 道錯題",
      practiceSelected: "練習 {count} 道選中題目",
      cleared: "所有錯題已清除！",
      addedToNotebook: "已加入錯題簿",
      removedFromNotebook: "已從錯題簿移除",
      reviewMaster: "複習並掌握您答錯的題目",
      
      // 完整題目彈窗
      questionDetail: "題目詳情",
      question: "題目",
      options: "選項",
      viewFullQuestion: "查看完整題目",
      viewFull: "查看完整",
      attempts: "嘗試次數",
      masteryLevelLabel: "掌握程度",
      lastAttemptedLabel: "最後嘗試",
      
      // 統計
      totalMistakes: "總錯題數",
      topicsToFocus: "需加強主題",
      repeatedMistakes: "重複錯誤",
      
      // 配置器
      configurePractice: "設定練習",
      numberOfQuestions: "題目數量",
      questionsLabel: "1. 題目數量",
      questionsAvailable: "題可用",
      questionsAvailableFull: "題符合目前篩選條件",
      timeRange: "時間範圍",
      timeRangeLabel: "2. 時間範圍（犯錯時間）",
      allTime: "所有時間",
      lastMonth: "上個月",
      lastWeek: "上週",
      default: "預設",
      
      // 篩選器
      topics: "主題",
      topicsLabel: "3. 主題（留空表示全部）",
      subtopics: "子主題",
      subtopicsFilteredNote: "（已按選定主題篩選）",
      masteryLevel: "掌握程度",
      clearTopicFilter: "✕ 清除主題篩選",
      clearSubtopicFilter: "清除子主題篩選",
      clearMasteryFilter: "清除掌握程度篩選",
      filteredFrom: "從以下項目篩選",
      clearSelection: "清除選擇",
      
      // 掌握狀態標籤
      masteryNew: "未處理",
      masteryDeveloping: "發展中",
      masteryProgressing: "進行中",
      masteryNear: "接近掌握",
      statusUnprocessed: "未處理",
      statusInProgress: "進行中",
      statusNearMastery: "接近掌握",
      
      // 空狀態
      allMistakes: "所有錯題",
      noMistakesYet: "目前沒有錯題！",
      keepPracticing: "繼續練習。答錯的題目會出現在這裡。",
      startPracticing: "開始練習",
      noQuestionsFound: "找不到符合條件的題目",
      tryAdjustFilters: "請嘗試調整您的篩選設定",
      noArchivedYet: "暫無已歸檔題目",
      archiveInstructions: "連續答對 3 次以歸檔題目",
      allCaughtUp: "全部完成！",
      
      // 題目詳情
      lastAttempt: "最後嘗試",
      missed: "錯 {count} 次",
      yourAnswer: "您的答案",
      correctAnswer: "正確答案",
      correct: "正確",
      explanation: "解釋",
      priority: "優先度",
      
      // 運作原理
      howItWorks: "運作原理",
      wrongAnswersAutoSaved: "答錯的題目自動儲存在這裡",
      useFilters: "使用篩選器專注於特定主題或最近的錯誤",
      practiceUntilMaster: "練習直到您掌握它們！",
      clearAfterThreeCorrect: "✨ 連續答對 3 次後，題目將自動清除！",
      
      // 載入狀態
      loadingMistakes: "載入錯題中...",
      sessionLimited: "每次練習最多 {max} 題。",
      
      // 主題分析
      topicBreakdown: "主題分析",
      hoverForDetails: "移至統計以查看詳情",
      weakTopics: "弱勢主題",
      focusTheseTopics: "專注於這些主題",
      repeatsByTopic: "按主題重複錯誤",
      needMorePractice: "需要更多練習",
      improved: "改進 {count} 次",
      
      // 保留儀表板
      retentionDashboard: "學習保留儀表板",
      addedThisWeek: "新增（7天）",
      masteredThisWeek: "已掌握（7天）",
      decayRate: "衰減率",
      decayImproving: "📈 持續進步",
      decayStable: "⚖️ 維持穩定",
      decayGrowing: "📉 錯題增加",
      weakestSubtopics: "最弱子主題",
      urgentReviews: "緊急複習（按優先分排序）",
      
      // 優先分徽章
      priorityScore: "間隔重複優先分",
      
      // 元認知標記
      errorTypeLabel: "錯誤類型：",
      tagErrorType: "標記錯誤類型",
      errorCategory: "錯誤類別",
      clearTag: "清除標記",
      errorMisread: "題目看錯",
      errorConceptual: "概念缺口",
      errorCalculation: "計算錯誤",
      errorCareless: "粗心大意",
      errorVocabulary: "詞彙不足",
      errorDiagram: "圖表誤讀",
      tagError: "標記錯誤",
      
      // 額外說明
      spacedRepetitionNote: "卡片按間隔重複優先分排序——最緊急的排在最前。",
      metacognitiveNote: "為每道錯題標記錯誤類別，追蹤您的學習模式。",
      
      // 學習分析儀表板
      mistakeClearingActivity: "錯題清除活動",
      errorDensityByTopic: "按主題錯誤密度",
      improvementTrend: "改進趨勢（14天）",
      clickTopicToFilter: "點擊主題以篩選 →",
      clickTopicsToFilter: "點擊主題以篩選（可多選）",
      less: "較少",
      more: "更多",
      
      // AI每日任務
      aiDailyMission: "AI每日任務",
      aiDailyMissionNote: "智能AI選擇10道題目，交錯練習以最大化記憶保持。",
      needMoreQuestions: "需要10+錯題（您有{count}道）",
      interleavedPractice: "10道題目 • 交錯練習",
      
      // 計時器設定
      timerEnabled: "計時器已啟用",
      timedMode: "限時模式",
      
      // 檢視模式
      listView: "列表檢視",
      kanbanView: "看板檢視",
      selectAll: "全選",
      
      // 歸檔
      mastered: "已掌握",
      masteredOn: "於{date}掌握",
      archivedAt: "歸檔於",
      
      // 篩選標籤
      topicFilter: "主題：{topic}",
    },
    
    // 歷史記錄
    history: {
      title: "練習歷史",
      clickToSeeAnalysis: "點擊任何記錄查看完整分析",
      totalAttempts: "總次數",
      averageScore: "平均分數",
      bestScore: "最高分數",
      totalTime: "總時間",
      filtersAndSorting: "篩選與排序",
      timePeriod: "時間範圍",
      allTime: "全部",
      lastMonth: "上個月",
      lastWeek: "上週",
      sortBy: "排序方式",
      recent: "最新",
      score: "分數",
      time: "時間",
      yourAttempts: "您的記錄",
      clickViewAnalysis: "點擊查看完整分析",
      refresh: "刷新",
      noAttemptsFound: "沒有找到記錄",
      tryChangingFilter: "嘗試更改時間範圍",
      startPracticingHistory: "開始練習以查看歷史記錄！",
      takeFirstQuiz: "開始第一個測驗",
      correct: "正確",
      loadingHistory: "載入歷史記錄...",
    },
    
    // 通用
    common: {
      loading: "載入中...",
      error: "錯誤",
      success: "成功",
      confirm: "確認",
      cancel: "取消",
      save: "儲存",
      delete: "刪除",
      edit: "編輯",
      close: "關閉",
      retry: "重試",
      backToTopics: "返回主題選擇",
    },
    
    // 認證
    auth: {
      login: "登入",
      register: "註冊",
      email: "電郵地址",
      password: "密碼",
      confirmPassword: "確認密碼",
      fullName: "全名",
      createAccount: "建立帳戶",
      alreadyHaveAccount: "已有帳戶？",
      dontHaveAccount: "還沒有帳戶？",
      loginHere: "在此登入",
      registerHere: "在此註冊",
      welcomeBack: "歡迎回來",
      enterCredentials: "輸入您的登入資料以訪問帳戶",
      signingIn: "登入中...",
      signIn: "登入",
      createAccountNow: "立即註冊",
      secureLogin: "由 Firebase 提供安全登入",
      noAccountFound: "找不到此電郵的帳戶。",
      incorrectPassword: "密碼錯誤。",
      invalidEmail: "無效的電郵地址。",
      failedLogin: "登入失敗。請檢查您的登入資料。",
      joinCommunity: "加入我們的化學學習社群",
      creatingAccount: "創建帳戶中...",
      passwordsNoMatch: "密碼不匹配",
      passwordMinLength: "密碼必須至少6個字符",
      enterFullName: "請輸入您的全名",
      emailAlreadyInUse: "此電郵已被使用。",
      weakPassword: "密碼太弱。請使用至少6個字符。",
      failedCreateAccount: "創建帳戶失敗。請重試。",
      minimumCharacters: "最少6個字符",
      secureRegistration: "由 Firebase 提供安全註冊",
      switchToChinese: "Switch to Traditional Chinese",
      switchToEnglish: "切換至英文",
    },

    // ChemStore
    store: {
      title: "ChemStore",
      subtitle: "使用代幣解鎖獨家物品",
      yourBalance: "您的餘額",
      profilePics: "頭像",
      badges: "徽章",
      themes: "主題",
      equipped: "已裝備",
      equip: "裝備",
      buy: "購買",
      claim: "領取",
      locked: "鎖定",
      buying: "購買中...",
      comingSoon: "即將推出！🚀",
      howToEarnTokens: "如何賺取代幣",
      perfectScore: "完美分數 (100%)：",
      perfectScoreTokens: "10 代幣",
      excellentScore: "優秀分數 (80%+)：",
      excellentScoreTokens: "5 代幣",
      goodScore: "良好分數 (60%+)：",
      goodScoreTokens: "2 代幣",
      clearMistake: "清除錯誤：",
      clearMistakeTokens: "1 代幣（每題每天一次）",
      leaderboardGold: "排行榜金牌：",
      leaderboardTokens: "60 代幣（每週）/ 10 代幣（每日）",
      studyStreaks: "學習連勝：",
      studyStreaksTokens: "15 代幣（7天）/ 50 代幣（30天）",
      notEnoughTokens: "代幣不足！💸",
      purchased: "已購買 {name}！🎉",
      purchaseFailed: "購買失敗",
      failedToEquip: "裝備失敗",
      pleaseTryAgain: "請重試。",
      failedToEquipItem: "裝備物品失敗",
    },

    // Practice Mode Selection
    practiceMode: {
      updateYourTopics: "更新您的主題",
      learnedUpTo: "已學習至：",
      exceptions: "例外（未學習）：",
      saveChanges: "儲存變更",
      updating: "更新中...",
      topicsUpdated: "主題已成功更新！",
      failedUpdate: "更新主題失敗",
      configureCustomSession: "自訂練習設定",
      back: "返回",
      selectTopics: "1. 選擇主題（可多選）",
      lockedTopicsNotLearned: "鎖定的主題尚未學習。請在個人資料中更新或點擊上方按鈕。",
      focusSubtopics: "2. 選擇子主題（可選）",
      sessionLength: "3. 練習題數",
      generateExam: "開始練習",
      startPractice: "開始練習",
    },
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('chemleung_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('chemleung_language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }
    return value || key;
  };

  const tf = (key, params = {}) => {
    let text = t(key);
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    tf,
    isEnglish: language === 'en',
    isChinese: language === 'zh',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}