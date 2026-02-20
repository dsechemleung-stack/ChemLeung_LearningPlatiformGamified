import React from 'react';
import ForumPage from './pages/ForumPage';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage_Fixed';
import TopicSelectionPage from './pages/TopicSelectionPage_Updated';
import PracticeModeSelection from './pages/PracticeModeSelection';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage_Updated_Fixed';
import MillionaireQuiz from './pages/MillionaireQuiz';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage_Fixed';
import MistakeNotebookPage from './pages/MistakeNotebookPage';
import FirebaseTestPage from './pages/FirebaseTestPage';
import DebugDashboard from './pages/DebugDashboard';
import SRSReviewPage from './pages/SRSReviewPage';
import { useQuizData } from './hooks/useQuizData';
import ChemistryLoading from './components/ChemistryLoading';
import ChemStore from './components/ChemStore';
import TokenLog from './components/TokenLog';
import { ChemCityRoot } from './components/chemcity/ChemCityRoot';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK36yaUN-NMCkQNT-DAHgc6FMZPjUc0Yv3nYEK4TA9W2qE9V1TqVD10Tq98-wXQoAvKOZlwGWRSDkU/pub?gid=1182550140&single=true&output=csv';

function AppContent() {
  const location = useLocation();
  const { questions, loading, error } = useQuizData(SHEET_URL);
  const isNotebookRoute = location.pathname === '/notebook';
  const isChemCityRoute = location.pathname === '/chemcity';
  const noShellRoutes = new Set(['/dashboard', '/login', '/register', '/millionaire']);
  const useNoShell = noShellRoutes.has(location.pathname);
  const hideHeaderRoutes = new Set(['/login', '/register', '/millionaire']);
  const showHeader = !hideHeaderRoutes.has(location.pathname);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <ChemistryLoading persistKey="startup" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border-2 border-red-200">
          <p className="text-red-500 font-bold mb-2">Error loading questions</p>
          <p className="text-academic-slate">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showHeader && <Header />}
      <div
        className={`${showHeader && !isChemCityRoute ? 'pt-[76px]' : ''} ${isChemCityRoute ? 'bg-slate-950' : ''} ${(useNoShell || isNotebookRoute || isChemCityRoute) ? '' : 'container mx-auto px-4 py-6'}`.trim()}
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          {/* ✅ FIXED: Now passes questions prop to DashboardPage */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage questions={questions} />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Navigate to="/dashboard" replace />
              </PrivateRoute>
            }
          />

          {/* Practice Mode Selection */}
          <Route
            path="/practice"
            element={
              <PrivateRoute>
                <PracticeModeSelection questions={questions} />
              </PrivateRoute>
            }
          />

          <Route
            path="/srs-review"
            element={
              <PrivateRoute>
                <SRSReviewPage questions={questions} />
              </PrivateRoute>
            }
          />
          
          {/* Legacy Topic Selection */}
          <Route
            path="/topics"
            element={
              <PrivateRoute>
                <TopicSelectionPage questions={questions} />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/quiz"
            element={
              <PrivateRoute>
                <QuizPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/millionaire"
            element={
              <PrivateRoute>
                <MillionaireQuiz questions={questions} />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/results"
            element={
              <PrivateRoute>
                <ResultsPage />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/leaderboard"
            element={
              <PrivateRoute>
                <LeaderboardPage />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/history"
            element={
              <PrivateRoute>
                <HistoryPage />
              </PrivateRoute>
            }
          />
          
          {/* Mistake Notebook - NEW */}
          <Route
            path="/notebook"
            element={
              <PrivateRoute>
                <MistakeNotebookPage questions={questions} />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/forum"
            element={
              <PrivateRoute>
                <ForumPage />
              </PrivateRoute>
            }
          />

          {/* ChemStore - FIXED: Now inside Routes */}
          <Route
            path="/store"
            element={
              <PrivateRoute>
                <ChemStore />
              </PrivateRoute>
            }
          />

          <Route
            path="/chemcity"
            element={
              <PrivateRoute>
                <ChemCityRoot />
              </PrivateRoute>
            }
          />

          {/* Token Log - FIXED: Now inside Routes */}
          <Route
            path="/token-log"
            element={
              <PrivateRoute>
                <TokenLog />
              </PrivateRoute>
            }
          />

          {/* Firebase Test Page - for debugging */}
          <Route
            path="/test-firebase"
            element={
              <PrivateRoute>
                <FirebaseTestPage />
              </PrivateRoute>
            }
          />
          
          {/* Debug Dashboard - comprehensive diagnostics */}
          <Route
            path="/debug"
            element={
              <PrivateRoute>
                <DebugDashboard />
              </PrivateRoute>
            }
          />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </>
  );
}

function AppShell() {
  const location = useLocation();
  const noShellRoutes = new Set(['/dashboard', '/login', '/register']);
  const useNoShell = noShellRoutes.has(location.pathname);

  return (
    <div className={useNoShell ? 'min-h-screen' : 'min-h-screen bg-gray-50'}>
      <AppContent />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppShell />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}