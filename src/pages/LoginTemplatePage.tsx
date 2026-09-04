import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOGO_URL } from '../constants/brand';

// ============================================================================
// TEMPLATE LOGIN — IMAN ACTIVITY & WORKFLOW SUITE
// Plateforme de pilotage des activités, du pipeline commercial et de la production
// Design épuré, prestigieux, interactif avec aperçu des modules d'activité
// ============================================================================

export default function LoginTemplatePage() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('direction.ventes@agenceiman.com');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRolePreview, setSelectedRolePreview] = useState<'CDV' | 'DG' | 'COMMERCIAL' | 'CREA'>('CDV');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast('Authentification réussie ! Redirection...');
      setTimeout(() => navigate('/templates/dashboard-cdv'), 900);
    }, 1200);
  };

  const quickRoles = [
    {
      key: 'CDV' as const,
      label: 'Cheffe Division Ventes',
      email: 'cdv@agenceiman.com',
      icon: 'military_tech',
      desc: 'Quotas, pipeline commercial, arbitrages & agenda',
      stats: '54.8M FCFA signés',
    },
    {
      key: 'DG' as const,
      label: 'Direction Générale',
      email: 'dg@agenceiman.com',
      icon: 'shield_person',
      desc: 'Vision 360°, arbitrages stratégiques & performance globale',
      stats: '84.6M FCFA CA Global',
    },
    {
      key: 'COMMERCIAL' as const,
      label: 'Commercial Terrain',
      email: 'commercial@agenceiman.com',
      icon: 'person_search',
      desc: 'Gestion des prospects, devis, fiches et suivi des opportunités',
      stats: '21.4M FCFA (107%)',
    },
    {
      key: 'CREA' as const,
      label: 'Pôle Studio & Prod',
      email: 'creation@agenceiman.com',
      icon: 'palette',
      desc: 'Exécution créative, validations BAT & suivi des livrables',
      stats: '14 livrables actifs',
    },
  ];

  return (
    <div className="min-h-screen w-full flex bg-[#0f1115] text-slate-100 font-body-md selection:bg-primary selection:text-white">
      {/* Toast de notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md text-white border border-emerald-500/30 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ==================================================================== */}
      {/* VOLET GAUCHE (BRAND & HUB DE PILOTAGE DES ACTIVITÉS)                 */}
      {/* ==================================================================== */}
      <section className="hidden lg:flex lg:w-[58%] xl:w-[60%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-gradient-to-br from-[#180504] via-[#0d0f14] to-[#0a0b0e] border-r border-white/5">
        {/* Cercles de diffusion d'ambiance bordeaux & ambre doux */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#8b1a0e]/15 blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03),_transparent_70%)] pointer-events-none" />

        {/* 1. Header de marque */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-white/20 flex items-center justify-center">
              <img alt="Logo Agence Iman" className="h-full w-full object-contain" src={LOGO_URL} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-lg font-black tracking-tight text-white">
                  IMAN SYSTEM
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-primary/30 text-red-200 px-2 py-0.5 rounded-md border border-primary/40">
                  v3.4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Plateforme Unifiée de Pilotage des Activités
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-300">Serveurs Opérationnels</span>
          </div>
        </div>

        {/* 2. Centre : Titre percutant & Carte de pilotage interactive */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-2xl">
          <div className="space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary-fixed-dim bg-primary/20 px-3 py-1 rounded-lg border border-primary/30">
              Système de Pilotage Stratégique & Opérationnel
            </span>
            <h1 className="text-3xl xl:text-4xl font-extrabold font-headline-md tracking-tight text-white leading-tight">
              Tout le flux d'activité de l'agence, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-200">
                orchestré avec précision.
              </span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              Bien plus qu'un CRM : un poste de commandement pour piloter le cycle de vente de A à Z, accélérer les arbitrages, sécuriser les acomptes et coordonner la production.
            </p>
          </div>

          {/* Module Visuel Interactif : Vue d'ensemble des pôles d'activité */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                <span>Pôles de Pilotage Intégrés</span>
              </div>
              <span className="text-[11px] text-slate-400">Cliquez pour tester un profil</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickRoles.map((role) => {
                const isSelected = selectedRolePreview === role.key;
                return (
                  <button
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-primary/30 to-black/60 border-red-500/50 shadow-lg ring-1 ring-red-500/30'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                    key={role.key}
                    onClick={() => {
                      setSelectedRolePreview(role.key);
                      setEmail(role.email);
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[15px] ${
                            isSelected ? 'bg-primary text-white' : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{role.icon}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{role.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {role.stats}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{role.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Footer du volet gauche */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-6 border-t border-white/5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">lock</span>
              Chiffrement AES-256
            </span>
            <span>·</span>
            <span>Accès sécurisé SSO & Rôles</span>
          </div>
          <span>© 2026 Agence Iman · Niamey, Niger</span>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* VOLET DROIT (FORMULAIRE DE CONNEXION ÉPURÉ & MODERNE)                */}
      {/* ==================================================================== */}
      <section className="w-full lg:w-[42%] xl:w-[40%] flex flex-col justify-between p-6 sm:p-10 xl:p-14 bg-[#12141a] relative">
        {/* Lien de retour au template CDV pour tester */}
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-xl border border-white/10"
            onClick={() => navigate('/templates/dashboard-cdv')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Gabarit Dashboard CDV
          </button>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Portail Collaborateur
          </span>
        </div>

        {/* Formulaire Principal */}
        <div className="my-auto py-8 max-w-sm w-full mx-auto space-y-7">
          {/* Logo sur Mobile */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white p-1.5 shadow-md">
              <img alt="Logo Agence Iman" className="h-full w-full object-contain" src={LOGO_URL} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Agence Iman</h2>
              <p className="text-[11px] text-slate-400">Pilotage des Activités</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-black font-headline-md tracking-tight text-white">
              Connexion à l'espace
            </h2>
            <p className="text-xs text-slate-400">
              Saisissez vos identifiants pour accéder à votre console de travail.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            {/* Champ Email / Identifiant */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between" htmlFor="email-input">
                <span>Adresse Email Professionnelle</span>
                <span className="text-slate-500 text-[10px] lowercase">@agenceiman.com</span>
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px] group-focus-within:text-primary transition-colors">
                  alternate_email
                </span>
                <input
                  className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-primary focus:bg-white/[0.07] focus:ring-2 focus:ring-primary/20 text-white pl-10 pr-4 py-3 rounded-xl text-xs font-medium outline-none transition-all placeholder:text-slate-600"
                  id="email-input"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom.prenom@agenceiman.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            {/* Champ Mot de Passe */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-bold uppercase tracking-wider text-slate-300" htmlFor="password-input">
                  Mot de passe
                </label>
                <button
                  className="text-primary hover:text-red-400 transition-colors font-semibold"
                  onClick={() => showToast('Veuillez contacter votre administrateur (ADCH) pour réinitialiser votre mot de passe.')}
                  type="button"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px] group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-primary focus:bg-white/[0.07] focus:ring-2 focus:ring-primary/20 text-white pl-10 pr-11 py-3 rounded-xl text-xs font-medium outline-none transition-all placeholder:text-slate-600 font-label-md"
                  id="password-input"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Se souvenir de moi */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  checked={rememberMe}
                  className="w-4 h-4 rounded bg-white/10 border-white/20 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  onChange={(e) => setRememberMe(e.target.checked)}
                  type="checkbox"
                />
                <span>Mémoriser ma session sur ce terminal</span>
              </label>
            </div>

            {/* Bouton de Soumission */}
            <div className="pt-2">
              <button
                className="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-[#8b1a0e] hover:from-[#8b1a0e] hover:to-primary text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Accéder au Tableau de Bord</span>
                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Raccourcis de profil de démo */}
          <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl text-[11px] text-slate-400 text-center space-y-1">
            <span className="font-semibold text-slate-300">Profil sélectionné :</span>{' '}
            <span className="text-primary-fixed-dim font-bold">{selectedRolePreview}</span> ·{' '}
            <span className="text-slate-500">{email}</span>
          </div>
        </div>

        {/* Footer droit */}
        <div className="text-center text-[11px] text-slate-500">
          Besoin d'un accès ? Contactez la direction des ressources humaines.
        </div>
      </section>
    </div>
  );
}
