import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOGO_URL } from '../constants/brand';
import { useAuth } from '../context/AuthContext';

type SubmitStatus = 'idle' | 'loading' | 'success';

const HERO_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBanzbxCDa4HwxG7OX624mTGO-MX4XXN2Ae3rCtL_CC1Z3Etmypjo-tc8SInAABnviIiG4FzgSj-AmG2daW8SwC1tB89HIkshDXxuFw-SYKUEZDo8a0ZH37Alqh6qOxXe3in5EVymF5Fibq6DIVwgEh_zeU3PXtuCureXot569HI__EMrQLdhtIXA04rWdqGPsqcOZeX-k2WqxRHqvWarfnYI-0kqr3Otlv0EByOVFM4R1ztJCtLwA8zYIiE8tqpxSMs1KifnC3VA';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const { login, sessionExpired, acknowledgeSessionExpired } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    return () => acknowledgeSessionExpired();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePassword() {
    setShowPassword((prev) => !prev);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus('loading');

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await login(email, password);
      setStatus('success');
      navigate('/dashboard');
    } catch {
      setStatus('idle');
      setError('Identifiant ou mot de passe incorrect.');
    }
  }

  return (
    <main className="login-canvas relative overflow-hidden">
      {/* Left Side: Brand Identity & Visual (Fixed Width on Desktop) */}
      <section className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-inverse-surface relative p-12 overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-110"
          style={{ backgroundImage: `url('${HERO_IMAGE_URL}')` }}
        />
        <div className="absolute inset-0 z-10 bg-black/60" />

        {/* Branding Header */}
        <div className="relative z-20 flex items-center gap-4">
          <img alt="Logo Agence Iman" className="h-16 w-auto" src={LOGO_URL} />
          <div className="flex flex-col">
            <h1 className="font-headline-md text-headline-md text-white tracking-tight">Agence Iman</h1>
            <span className="font-label-md text-label-md text-secondary-fixed opacity-70 uppercase tracking-widest">
              Agence de Communication
            </span>
          </div>
        </div>

        {/* Slogan */}
        <div className="relative z-20 max-w-lg mb-12">
          <h2 className="font-headline-xl text-headline-xl text-white">
            Des idées qui marquent. <br />
            Une communication qui engage.
          </h2>
        </div>
      </section>

      {/* Right Side: Login Form */}
      <section className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 md:p-24 bg-surface relative">
        {/* Mobile Logo (Hidden on Desktop) */}
        <div className="lg:hidden absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <img alt="Logo Iman CRM" className="h-12 w-auto" src={LOGO_URL} />
          <h1 className="font-headline-md text-headline-md text-primary font-bold">Iman CRM</h1>
        </div>

        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center lg:text-left">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Bienvenue</h2>
            <p className="font-body-md text-body-md text-secondary mt-2">
              Veuillez saisir vos identifiants pour accéder à votre tableau de bord.
            </p>
          </div>

          {sessionExpired && (
            <div className="flex items-center gap-3 px-4 py-3 bg-error-container/20 border border-error/20 rounded text-error">
              <span className="material-symbols-outlined shrink-0">info</span>
              <p className="font-body-sm text-body-sm">Votre session a expiré. Veuillez vous reconnecter.</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" id="login-form" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label
                  className="font-label-md text-label-md text-on-surface-variant block uppercase tracking-wide"
                  htmlFor="email"
                >
                  Identifiant
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    mail
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant input-transition font-body-md outline-none"
                    id="email"
                    name="email"
                    placeholder="votre adresse mail"
                    required
                    type="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    className="font-label-md text-label-md text-on-surface-variant block uppercase tracking-wide"
                    htmlFor="password"
                  >
                    Mot de passe
                  </label>
                  {/* <a className="text-primary hover:underline font-label-md text-label-md transition-all" href="#">
                    Oublié ?
                  </a> */}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    lock
                  </span>
                  <input
                    className="w-full pl-12 pr-12 py-3 bg-white border border-outline-variant rounded focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant input-transition font-body-md outline-none"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type={showPassword ? 'text' : 'password'}
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                    onClick={togglePassword}
                    type="button"
                  >
                    <span className="material-symbols-outlined" id="pw-icon">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="text-body-sm text-error">{error}</p>}

            {/* CTA Buttons */}
            <div className="space-y-3 pt-2">
              <button
                className={`w-full py-4 text-white font-headline-md text-headline-md rounded transition-all duration-300 active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2 group ${
                  status === 'success' ? 'bg-green-700' : 'bg-on-primary-fixed-variant hover:bg-primary'
                }`}
                disabled={status !== 'idle'}
                id="submit-btn"
                type="submit"
              >
                {status === 'idle' && (
                  <>
                    Se connecter
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </>
                )}
                {status === 'loading' && (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Authentification...
                  </>
                )}
                {status === 'success' && (
                  <>
                    <span className="material-symbols-outlined">check_circle</span>
                    Connecté
                  </>
                )}
              </button>
              {/* <button
                className="w-full py-4 bg-transparent border-2 border-tertiary text-tertiary font-headline-md text-headline-md rounded hover:bg-surface-container-high transition-all duration-300 active:scale-[0.98]"
                type="button"
              >
                Connexion SSO Entreprise
              </button> */}
            </div>
          </form>

          {/* Footer Links */} 
          <div className="pt-12 text-center">
            <p className="font-body-sm text-body-sm text-secondary">
              Pas encore d'accès ?{' '}
              <a className="text-on-primary-fixed-variant font-semibold hover:underline" href="#">
                Contactez l'administrateur
              </a>
            </p>
            {/* <div className="mt-8 flex justify-center gap-6 opacity-40">
              <span className="font-label-md text-label-md uppercase tracking-tighter">Conforme RGPD</span>
              <span className="font-label-md text-label-md uppercase tracking-tighter">Chiffrement AES-256</span>
              <span className="font-label-md text-label-md uppercase tracking-tighter">Certifié SOC2</span>
            </div> */}
          </div>
        </div>
      </section>
    </main>
  );
}
