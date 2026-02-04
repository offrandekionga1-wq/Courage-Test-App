
import React, { useState } from 'react';
import { UserProfile, Identity, Language } from '../types';

interface OnboardingProps {
  onComplete: (user: UserProfile) => void;
}

const IDENTITIES: Identity[] = [
  'Homme', 'Femme', 'Non-binaire', 'Genderfluid', 'Agender', 'Bigender', 
  'Pangender', 'Queer', 'Questionnement', 'Trans-homme', 'Trans-femme', 
  'Cis-homme', 'Cis-femme', 'Hétérosexuel', 'Homosexuel', 'Bisexuel', 
  'Pansexuel', 'Asexuel', 'Demisexuel'
].sort() as Identity[];

const LANGUAGES: Language[] = ['Français', 'English', 'Español', 'Deutsch', 'Italiano', 'Português'];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState<Identity>('Hétérosexuel');
  const [birthDate, setBirthDate] = useState('');
  const [language, setLanguage] = useState<Language>('Français');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && identity && birthDate) {
      onComplete({ name, identity, birthDate, language });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0f172a] overflow-hidden relative">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full"></div>

      <div className="bg-white/10 backdrop-blur-xl p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-white/10 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl mb-6 shadow-lg shadow-indigo-500/30 transform -rotate-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Courage</h1>
          <p className="text-indigo-200/60 font-medium text-sm tracking-wide uppercase">Défiez votre réalité</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Nom d'avatar</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-2xl text-white placeholder-indigo-300/30 focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-bold"
              placeholder="Ex: Ghost"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Identité</label>
              <select
                value={identity}
                onChange={(e) => setIdentity(e.target.value as Identity)}
                className="w-full bg-white/5 border border-white/10 px-4 py-4 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
              >
                {IDENTITIES.map(id => (
                  <option key={id} value={id} className="bg-slate-900">{id}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Langue</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full bg-white/5 border border-white/10 px-4 py-4 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang} className="bg-slate-900">{lang}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Naissance</label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-bold"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-white text-slate-900 font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-50 transition-all active:scale-[0.97] mt-4 uppercase tracking-[0.2em] text-sm"
          >
            S'affranchir
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
