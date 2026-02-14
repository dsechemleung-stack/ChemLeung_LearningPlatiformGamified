import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Share2, X, Trophy, Target, Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export default function ShareableReport({ 
  questions, 
  userAnswers, 
  questionTimes,
  onClose 
}) {
  const { currentUser } = useAuth();
  const { isEnglish, t, tf } = useLanguage();
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Calculate stats
  const totalQuestions = questions.length;
  const correctAnswers = questions.reduce((acc, q) => {
    return acc + (userAnswers[q.ID] === q.CorrectOption ? 1 : 0);
  }, 0);
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const topics = [...new Set(questions.map(q => q.Topic))].filter(Boolean);

  const totalTime = questionTimes 
    ? Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
    : null;

  const formatTime = (ms) => {
    if (!ms) return t('report.na');
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    if (hrs > 0) {
      return tf('report.timeHrsMins', { h: hrs, m: minutes % 60 });
    }
    return tf('report.timeMinsSecs', { m: minutes, s: seconds % 60 });
  };

  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString(isEnglish ? 'en-GB' : 'zh-HK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Topic analysis
  const topicAnalysis = questions.reduce((acc, q) => {
    if (!acc[q.Topic]) {
      acc[q.Topic] = { total: 0, correct: 0 };
    }
    acc[q.Topic].total += 1;
    if (userAnswers[q.ID] === q.CorrectOption) {
      acc[q.Topic].correct += 1;
    }
    return acc;
  }, {});

  const topicResults = Object.entries(topicAnalysis).map(([topic, data]) => ({
    topic,
    percent: Math.round((data.correct / data.total) * 100),
    ...data
  }));

  // IMPROVED: Export as Image with better error handling and proxy for CORS
  const exportAsImage = async () => {
    if (!reportRef.current) {
      setError(t('report.reportNotReady'));
      return;
    }
    
    setExporting(true);
    setError(null);
    
    try {
      console.log('🔵 Starting image export...');
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create canvas with improved settings
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // High quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false, // Changed to false for better CORS handling
        foreignObjectRendering: false,
        imageTimeout: 15000, // Increased timeout
        onclone: (clonedDoc) => {
          // Remove any problematic images in the cloned document
          const images = clonedDoc.getElementsByTagName('img');
          Array.from(images).forEach(img => {
            // If image has CORS issues, replace with placeholder
            if (img.src && !img.complete) {
              img.style.display = 'none';
            }
          });
        }
      });
      
      console.log('✅ Canvas created successfully');
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error(t('report.failedCreateImage'));
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${t('report.fileNamePrefix')}-${formatDate().replace(/\s/g, '-')}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('✅ Image downloaded successfully');
        setExporting(false);
      }, 'image/png', 0.95); // High quality PNG
      
    } catch (error) {
      console.error('❌ Error exporting image:', error);
      setError(t('report.failedExportImageTryPdf'));
      setExporting(false);
    }
  };

  // IMPROVED: Export as PDF with better error handling
  const exportAsPDF = async () => {
    if (!reportRef.current) {
      setError(t('report.reportNotReady'));
      return;
    }
    
    setExporting(true);
    setError(null);
    
    try {
      console.log('🔵 Starting PDF export...');
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create canvas
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Remove any problematic images in the cloned document
          const images = clonedDoc.getElementsByTagName('img');
          Array.from(images).forEach(img => {
            if (img.src && !img.complete) {
              img.style.display = 'none';
            }
          });
        }
      });
      
      console.log('✅ Canvas created for PDF');
      
      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${t('report.fileNamePrefix')}-${formatDate().replace(/\s/g, '-')}.pdf`);
      
      console.log('✅ PDF downloaded successfully');
      setExporting(false);
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      setError(t('report.failedExportPdfTryImage'));
      setExporting(false);
    }
  };

  const getGradeColor = (percent) => {
    if (percent >= 80) return 'from-green-500 to-emerald-600';
    if (percent >= 60) return 'from-blue-500 to-indigo-600';
    if (percent >= 40) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getGrade = (percent) => {
    if (percent >= 90) return 'A+';
    if (percent >= 80) return 'A';
    if (percent >= 70) return 'B';
    if (percent >= 60) return 'C';
    if (percent >= 50) return 'D';
    return 'F';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with close and export buttons */}
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 p-4 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Share2 className="text-lab-blue" size={24} />
            {t('report.shareReportCard')}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={exportAsImage}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 transition-all"
              title={t('report.downloadPngTitle')}
            >
              <Download size={18} />
              {t('report.image')}
            </button>
            
            <button
              onClick={exportAsPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-chemistry-green text-white rounded-lg font-bold hover:opacity-90 disabled:bg-slate-300 transition-all"
              title={t('report.downloadPdfTitle')}
            >
              <Download size={18} />
              {t('report.pdf')}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              title={t('common.close')}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-red-800 font-semibold">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-600 hover:underline mt-1"
              >
                {t('report.dismiss')}
              </button>
            </div>
          </div>
        )}

        {/* Report Card Content - NO EXTERNAL IMAGES to avoid CORS */}
        <div ref={reportRef} className="p-8 bg-gradient-to-br from-slate-50 to-blue-50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-lab-blue px-6 py-2 rounded-full mb-4">
              <h1 className="text-3xl font-black text-white">ChemLeung</h1>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {t('report.hkDsePracticeReport')}
            </h2>
            <div className="flex items-center justify-center gap-4 text-slate-600">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span className="text-sm font-semibold">{formatDate()}</span>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  {t('report.studentName')}
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {currentUser?.displayName || t('report.student')}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  {t('report.topicsCovered')}
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {topics.length} {t('report.topicsUnit')}
                </div>
              </div>
            </div>
          </div>

          {/* Main Score Display */}
          <div className={`bg-gradient-to-r ${getGradeColor(percentage)} rounded-2xl shadow-2xl p-8 mb-6 text-white`}>
            <div className="text-center">
              <div className="text-6xl font-black mb-2">{percentage}%</div>
              <div className="text-3xl font-bold mb-4">{getGrade(percentage)}</div>
              <div className="text-xl opacity-90">
                {correctAnswers} {t('report.outOf')} {totalQuestions} {t('report.correctLabel')}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-blue-200 text-center">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy size={20} className="text-white" />
              </div>
              <div className="text-2xl font-black text-slate-800">{correctAnswers}</div>
              <div className="text-sm text-slate-600">{t('report.correct')}</div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-red-200 text-center">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target size={20} className="text-white" />
              </div>
              <div className="text-2xl font-black text-slate-800">{totalQuestions - correctAnswers}</div>
              <div className="text-sm text-slate-600">{t('report.incorrect')}</div>
            </div>
            
            {totalTime && (
              <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-purple-200 text-center">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Clock size={20} className="text-white" />
                </div>
                <div className="text-2xl font-black text-slate-800">{formatTime(totalTime)}</div>
                <div className="text-sm text-slate-600">{t('report.timeUsed')}</div>
              </div>
            )}
          </div>

          {/* Topic Breakdown */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="w-5 h-5 bg-lab-blue rounded-full flex items-center justify-center">
                <CheckCircle size={14} className="text-white" />
              </div>
              {t('report.topicBreakdown')}
            </h3>
            
            <div className="space-y-3">
              {topicResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700">{result.topic}</span>
                      <span className="text-sm font-bold text-slate-800">{result.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          result.percent >= 70 ? 'bg-chemistry-green' :
                          result.percent >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${result.percent}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {result.correct}/{result.total} {t('dashboard.correct')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 text-center text-slate-500 text-sm">
            <p className="font-semibold">
              {t('report.generatedBy')}
            </p>
            <p className="text-xs mt-1">{t('report.website')}</p>
          </div>
        </div>

        {/* Loading Overlay */}
        {exporting && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-lab-blue mx-auto mb-4"></div>
              <p className="text-slate-700 font-semibold">
                {t('report.generating')}
              </p>
              <p className="text-slate-500 text-sm mt-2">
                {t('report.mayTakeSeconds')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}