
import React, { useState, useEffect } from 'react';
import { DailyChallenge, UI_TRANSLATIONS, Language } from '../types';

interface ChallengeCardProps {
  challenge: DailyChallenge;
  onAccept: () => void;
  onConfirmDone: () => void;
  loading?: boolean;
  lang: Language;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onAccept, onConfirmDone, loading, lang }) => {
  const t = UI_TRANSLATIONS[lang];
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    let interval: number | undefined;
    if (challenge.isAccepted && challenge.acceptedAt && !challenge.isCompleted) {
      // Logic for background: Since we use Date.now() - acceptedAt,
      // the timer "works" in background because it's stateless.
      const update = () => {
        setElapsed(Math.floor((Date.now() - (challenge.acceptedAt || 0)) / 1000));
      };
      update();
      interval = window.setInterval(update, 1000);
    }
    return () => clearInterval(interval);
  }, [challenge.isAccepted, challenge.acceptedAt, challenge.isCompleted]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const shareChallenge = async () => {
    const text = `${t.appName} - Mon défi : "${challenge.title}"\n\n"${challenge.description}"\n\n#${t.appName.replace(/\s+/g, '')}`;
    
    const shareData: ShareData = {
      title: t.appName,
      text: text,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        navigator.clipboard.writeText(text);
        alert('Copié !');
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className={`bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 transition-all ${loading ? 'opacity-50 blur-sm pointer-events-none' : ''}`}>
      <div className="flex justify-between items-start mb-6">
        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
          {challenge.category}
        </span>
        <div className="flex items-center space-x-1.5">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Niveau {challenge.difficulty}</span>
        </div>
      </div>

      <h2 className="text-3xl font-black text-slate-900 mb-4 leading-none tracking-tight">
        {challenge.title}
      </h2>

      <div className="bg-slate-900 rounded-2xl p-6 mb-8 text-white font-medium leading-snug text-xl shadow-inner">
        {challenge.description}
      </div>

      {challenge.isAccepted && !challenge.isCompleted && (
        <div className="mb-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-600 opacity-10 animate-pulse"></div>
          <div className="relative z-10 flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-indigo-100">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-2">{t.timer}</span>
            <span className="text-5xl font-mono font-black tracking-tighter text-slate-900">{formatTime(elapsed)}</span>
            <div className="mt-4 flex items-center space-x-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>Actif en arrière-plan</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-3">
        {!challenge.isAccepted ? (
          <button
            onClick={onAccept}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] text-lg uppercase tracking-widest"
          >
            {t.accept}
          </button>
        ) : (
          <button
            onClick={onConfirmDone}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center space-x-3 text-lg uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t.done}</span>
          </button>
        )}

        <button
          onClick={shareChallenge}
          className="w-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12a3 3 0 100-2.684 3 3 0 000 2.684z" />
          </svg>
          <span>{t.share}</span>
        </button>
      </div>
    </div>
  );
};

export default ChallengeCard;
