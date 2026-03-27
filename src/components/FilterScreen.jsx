import React, { useState, useMemo } from 'react';
import { Settings, Play, Check, Filter } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function FilterScreen({ questions, onStart }) {
  const { t, tf } = useLanguage();
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [count, setCount] = useState(10);

  // 1. Sort Topics numerically/alphabetically
  const topics = useMemo(() => {
    return [...new Set(questions.map(q => q.Topic))]
      .filter(t => t && t !== "Uncategorized")
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [questions]);

  // 2. Derive available subtopics based on ALL selected topics
  const availableSubtopics = useMemo(() => {
    if (selectedTopics.length === 0) return [];
    return [...new Set(questions
      .filter(q => selectedTopics.includes(q.Topic))
      .map(q => q.Subtopic))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [selectedTopics, questions]);

  const toggleTopic = (topic) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
    // Reset subtopics that no longer belong to selected topics
    setSelectedSubtopics([]);
  };

  // NEW: Select all topics at once
  const selectAllTopics = () => {
    if (selectedTopics.length === topics.length) {
      // If all are selected, deselect all
      setSelectedTopics([]);
      setSelectedSubtopics([]);
    } else {
      // Select all topics
      setSelectedTopics([...topics]);
      setSelectedSubtopics([]);
    }
  };

  const toggleSubtopic = (sub) => {
    setSelectedSubtopics(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleStart = () => {
    // Filter pool based on multiple selections
    let pool = questions.filter(q => selectedTopics.includes(q.Topic));
    
    if (selectedSubtopics.length > 0) {
      pool = pool.filter(q => selectedSubtopics.includes(q.Subtopic));
    }
    
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const finalSelection = count === 'All' ? shuffled : shuffled.slice(0, parseInt(count));
    
    if (finalSelection.length === 0) {
      alert(`${t('practiceMode.noQuestionsFound')} ${t('practiceMode.tryBroaderFilters')}`);
      return;
    }
    onStart(finalSelection);
  };

  const allTopicsSelected = selectedTopics.length === topics.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Filter size={20} className="text-lab-blue" />
            {t('practiceMode.configureCustomSession')}
          </h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">
            {tf('practiceMode.questionsLoaded', { count: questions.length })}
          </span>
        </div>

        <div className="p-8 space-y-8">
          {/* 1. Multi-Topic Selection */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">
                {t('practiceMode.selectTopics')}
              </label>
              <button
                onClick={selectAllTopics}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  allTopicsSelected
                    ? 'bg-lab-blue text-white hover:bg-blue-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {allTopicsSelected ? `✓ ${t('practiceMode.allSelected')}` : t('practiceMode.selectAllTopics')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {topics.map(topic => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedTopics.includes(topic)
                    ? 'border-lab-blue bg-blue-50 text-lab-blue shadow-sm'
                    : 'border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <span className="text-sm font-semibold">{topic}</span>
                  {selectedTopics.includes(topic) && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Multi-Subtopic Selection */}
          {selectedTopics.length > 0 && availableSubtopics.length > 0 && (
            <div className="animate-in slide-in-from-top-4">
              <label className="block text-sm font-black text-slate-500 mb-4 uppercase tracking-widest">
                {t('practiceMode.focusSubtopics')}
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSubtopics.map(sub => (
                  <button
                    key={sub}
                    onClick={() => toggleSubtopic(sub)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                      selectedSubtopics.includes(sub)
                      ? 'bg-lab-blue border-lab-blue text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Question Count */}
          <div>
            <label className="block text-sm font-black text-slate-500 mb-4 uppercase tracking-widest">
              {t('practiceMode.sessionLength')}
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {['5', '10', '15', '20', '36', 'All'].map(num => (
                <button
                  key={num}
                  onClick={() => setCount(num)}
                  className={`py-3 rounded-xl border-2 font-bold transition-all ${
                    count === num ? 'border-lab-blue bg-blue-50 text-lab-blue' : 'border-slate-100 text-slate-400'
                  }`}
                >
                  {num === 'All' ? t('common.all') : num}
                </button>
              ))}
            </div>
          </div>

          <button 
            disabled={selectedTopics.length === 0}
            onClick={handleStart}
            className="w-full py-5 bg-lab-blue text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-800 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Play fill="currentColor" size={18} />
            {t('practiceMode.generateExam')}
          </button>
        </div>
      </div>
    </div>
  );
}