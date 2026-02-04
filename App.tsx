
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, DailyChallenge, Language, UI_TRANSLATIONS } from './types';
import Onboarding from './components/Onboarding';
import ChallengeCard from './components/ChallengeCard';
import { generatePersonalizedChallenge } from './services/geminiService';

const LANGUAGES: Language[] = ['Français', 'English', 'Español', 'Deutsch', 'Italiano', 'Português'];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('challenge_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentChallenge, setCurrentChallenge] = useState<DailyChallenge | null>(() => {
    const saved = localStorage.getItem('current_challenge');
    if (saved) {
      const challenge = JSON.parse(saved);
      const today = new Date().toISOString().split('T')[0];
      if (challenge.date === today) return challenge;
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DailyChallenge[]>(() => {
    const saved = localStorage.getItem('challenge_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [showSettings, setShowSettings] = useState(false);

  const lang = user?.language || 'Français';
  const t = UI_TRANSLATIONS[lang];

  const fetchChallenge = useCallback(async (profile: UserProfile) => {
    setLoading(true);
    try {
      const newChallenge = await generatePersonalizedChallenge(profile);
      setCurrentChallenge(newChallenge);
      localStorage.setItem('current_challenge', JSON.stringify(newChallenge));
    } catch (error) {
      console.error("Failed to generate challenge", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !currentChallenge && !loading) {
      fetchChallenge(user);
    }
  }, [user, currentChallenge, fetchChallenge, loading]);

  const handleOnboarding = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('challenge_user', JSON.stringify(profile));
  };

  const updateLanguage = (newLang: Language) => {
    if (user) {
      const updatedUser = { ...user, language: newLang };
      setUser(updatedUser);
      localStorage.setItem('challenge_user', JSON.stringify(updatedUser));
      fetchChallenge(updatedUser);
    }
  };

  const handleAcceptChallenge = () => {
    if (currentChallenge) {
      const updated = { 
        ...currentChallenge, 
        isAccepted: true, 
        acceptedAt: Date.now() 
      };
      setCurrentChallenge(updated);
      localStorage.setItem('current_challenge', JSON.stringify(updated));
    }
  };

  const handleConfirmDone = () => {
    if (currentChallenge) {
      const completedChallenge = { 
        ...currentChallenge, 
        isCompleted: true, 
        isAccepted: true,
        completedAt: Date.now()
      };
      const updatedHistory = [completedChallenge, ...history].slice(0, 20);
      
      setHistory(updatedHistory);
      localStorage.setItem('challenge_history', JSON.stringify(updatedHistory));
      
      setCurrentChallenge(completedChallenge);
      localStorage.setItem('current_challenge', JSON.stringify(completedChallenge));
    }
  };

  const formatDuration = (start?: number, end?: number) => {
    if (!start || !end) return '';
    const diff = Math.floor((end - start) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const resetProfile = () => {
    if (confirm(t.reset + "?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const getNextChallenge = () => {
    if (user) {
      fetchChallenge(user);
    }
  };

  if (!user) {
    return <Onboarding onComplete={handleOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-xl py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t.appName}</h1>
            <p className="text-slate-500 font-medium">{t.welcome}, {user.name}</p>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-indigo-600 active:scale-90 transition-all border border-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </button>
        </header>

        {showSettings && (
          <div className="mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in slide-in-from-top duration-300">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Paramètres</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">{t.language}</label>
                <select 
                  value={user.language} 
                  onChange={(e) => updateLanguage(e.target.value as Language)}
                  className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-base appearance-none"
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <button 
                onClick={resetProfile}
                className="w-full text-rose-500 text-xs font-black uppercase tracking-widest hover:underline py-2"
              >
                {t.reset} mon profil
              </button>
            </div>
          </div>
        )}

        <main className="min-h-[400px]">
          {loading ? (
            <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-slate-500 font-medium">{t.loading}</p>
            </div>
          ) : currentChallenge ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              {currentChallenge.isCompleted ? (
                <div className="bg-indigo-600 text-white rounded-3xl p-10 shadow-xl flex flex-col items-center text-center">
                  <div className="bg-white/20 p-5 rounded-full mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-black mb-3">{t.congrats}</h3>
                  <div className="mb-6 flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{t.duration}</span>
                    <span className="text-2xl font-mono font-bold">{formatDuration(currentChallenge.acceptedAt, currentChallenge.completedAt)}</span>
                  </div>
                  <p className="opacity-90 mb-8 text-lg">{t.congratsSub}</p>
                  <button 
                    onClick={getNextChallenge}
                    className="w-full bg-white text-indigo-700 px-10 py-5 rounded-2xl font-black shadow-lg hover:bg-indigo-50 active:scale-95 transition-all"
                  >
                    {t.another}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <ChallengeCard 
                    challenge={currentChallenge} 
                    onAccept={handleAcceptChallenge}
                    onConfirmDone={handleConfirmDone}
                    loading={loading}
                    lang={lang}
                  />
                  {!currentChallenge.isAccepted && (
                    <button 
                      onClick={getNextChallenge}
                      className="w-full py-4 text-slate-400 text-sm font-bold uppercase tracking-widest hover:text-indigo-500 transition-colors"
                    >
                      Proposer un autre défi
                    </button>
                  )}
                </div>
              )}

              {history.length > 0 && (
                <section className="mt-12 pb-12">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-2">{t.history}</h4>
                  <div className="space-y-3">
                    {history.map((hc) => (
                      <div key={hc.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm opacity-80 active:opacity-100 active:scale-[0.98] transition-all">
                        <div className="bg-emerald-50 p-2 rounded-lg text-emerald-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-800 truncate text-sm">{hc.title}</h5>
                          <div className="flex items-center space-x-2">
                             <p className="text-[10px] text-slate-400 font-bold uppercase">{hc.category}</p>
                             <span className="text-[10px] text-slate-300">•</span>
                             <p className="text-[10px] text-indigo-400 font-mono font-bold">{formatDuration(hc.acceptedAt, hc.completedAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
             <div className="text-center py-20">
               <button 
                onClick={getNextChallenge}
                className="bg-slate-900 text-white px-12 py-6 rounded-3xl font-black text-2xl shadow-2xl active:scale-95 transition-all"
              >
                {t.generateFirst}
              </button>
             </div>
          )}
        </main>

        <footer className="mt-8 text-center text-slate-400 text-xs pb-10 uppercase tracking-widest font-bold">
          <p>© {new Date().getFullYear()} {t.appName}</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
