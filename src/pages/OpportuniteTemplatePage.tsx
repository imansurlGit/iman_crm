const opportunite = {
  nom: 'Migration ERP Multi-Sites',
  code: 'OPP-2026-047',
  client: 'Atlas Distribution SA',
  division: 'Division Commerciale',
  owner: 'Amina Test',
  valeur: '42 500 000 FCFA',
  marge: '27%',
  probabilite: 72,
  stade: 'Negociation finale',
  dateCloture: '30 Sept 2026',
  dateComite: '12 Aout 2026 - 10:00',
};

const pipeline = [
  { label: 'Qualification', done: true },
  { label: 'Decouverte', done: true },
  { label: 'Cadrage', done: true },
  { label: 'Proposition', done: true },
  { label: 'Negociation', done: false, active: true },
  { label: 'Closing', done: false },
];

const decideurs = [
  { nom: 'Moussa T.', role: 'Directeur General', influence: 'Elevee', position: 'Favorable' },
  { nom: 'Kadi B.', role: 'DAF', influence: 'Elevee', position: 'Neutre' },
  { nom: 'Ismael Y.', role: 'DSI', influence: 'Moyenne', position: 'Champion interne' },
];

const planActions = [
  {
    tache: 'Atelier de validation ROI',
    responsable: 'Bulma Brief',
    deadline: '11 Aout',
    statut: 'En cours',
  },
  {
    tache: 'Version finale de la proposition',
    responsable: 'Amina Test',
    deadline: '13 Aout',
    statut: 'Bloquee',
  },
  {
    tache: 'Preparation comite decision',
    responsable: 'Equipe Commerciale',
    deadline: '12 Aout',
    statut: 'Planifiee',
  },
  {
    tache: 'Negociation clauses support',
    responsable: 'Service Juridique',
    deadline: '15 Aout',
    statut: 'A lancer',
  },
];

const signaux = [
  {
    type: 'Positif',
    note: 'Le client a demande un draft de planning de deploiement sur 3 ans.',
    heure: 'Aujourd\'hui, 09:14',
  },
  {
    type: 'Attention',
    note: 'Le concurrent NovaSoft a propose une remise additionnelle de 8%.',
    heure: 'Hier, 16:30',
  },
  {
    type: 'Positif',
    note: 'Le sponsor metier confirme la priorite du projet au T4.',
    heure: 'Hier, 10:05',
  },
];

const risques = [
  { titre: 'Sensibilite prix', impact: 'Fort', mitigation: 'Ancrer la discussion sur le TCO a 36 mois.' },
  { titre: 'Cycle de validation IT', impact: 'Moyen', mitigation: 'Prequalifier les exigences securite avant comite.' },
  { titre: 'Charge juridique', impact: 'Moyen', mitigation: 'Transmettre les clauses en amont du closing.' },
];

const concurrence = [
  { critere: 'Couverture fonctionnelle', nous: '9/10', concurrent: '7/10' },
  { critere: 'Accompagnement local', nous: '10/10', concurrent: '6/10' },
  { critere: 'Prix initial', nous: '7/10', concurrent: '8/10' },
  { critere: 'Vitesse de deploiement', nous: '8/10', concurrent: '7/10' },
];

export default function OpportuniteTemplatePage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-outline-variant bg-[linear-gradient(135deg,#680200_0%,#8b1a0e_45%,#c84f39_100%)] p-6 text-white">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-black/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              Template Opportunite
            </div>
            <p className="text-sm text-white/80">{opportunite.division}</p>
            <h1 className="font-headline-lg text-3xl font-bold tracking-tight">{opportunite.nom}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">apartment</span>
                {opportunite.client}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">badge</span>
                {opportunite.code}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">event</span>
                Closing cible: {opportunite.dateCloture}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 self-start lg:self-auto">
            <div className="rounded-lg bg-white/15 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-white/70">Valeur</p>
              <p className="mt-1 text-lg font-bold">{opportunite.valeur}</p>
            </div>
            <div className="rounded-lg bg-white/15 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-white/70">Probabilite</p>
              <p className="mt-1 text-lg font-bold">{opportunite.probabilite}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-secondary">Stade actuel</p>
          <p className="mt-2 text-lg font-bold text-on-surface">{opportunite.stade}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Momentum eleve sur les 7 derniers jours</p>
        </article>
        <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-secondary">Marge projetee</p>
          <p className="mt-2 text-lg font-bold text-on-surface">{opportunite.marge}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Inclut les services de support premium</p>
        </article>
        <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-secondary">Owner</p>
          <p className="mt-2 text-lg font-bold text-on-surface">{opportunite.owner}</p>
          <p className="mt-1 text-xs text-on-surface-variant">1 co-seller + 1 pre-sales affectes</p>
        </article>
        <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-secondary">Comite decision</p>
          <p className="mt-2 text-lg font-bold text-on-surface">{opportunite.dateComite}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Room: Direction Financiere</p>
        </article>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline-md text-lg font-bold text-on-surface">Pipeline de closing</h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Execution commerciale</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          {pipeline.map((step, index) => (
            <div
              className={`rounded-lg border p-3 text-center ${
                step.active
                  ? 'border-primary bg-primary/10'
                  : step.done
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-outline-variant bg-surface'
              }`}
              key={step.label}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Etape {index + 1}</p>
              <p className="mt-1 text-sm font-bold text-on-surface">{step.label}</p>
              <div className="mt-2 flex items-center justify-center">
                {step.done ? (
                  <span className="material-symbols-outlined text-emerald-600">task_alt</span>
                ) : step.active ? (
                  <span className="material-symbols-outlined text-primary">pending</span>
                ) : (
                  <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h2 className="mb-4 font-headline-md text-lg font-bold text-on-surface">Plan d'action des 10 prochains jours</h2>
            <div className="space-y-3">
              {planActions.map((action) => (
                <article className="rounded-lg border border-outline-variant bg-surface p-4" key={action.tache}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface">{action.tache}</h3>
                      <p className="mt-1 text-xs text-on-surface-variant">Responsable: {action.responsable}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-secondary">Deadline</p>
                      <p className="text-sm font-semibold text-on-surface">{action.deadline}</p>
                    </div>
                  </div>
                  <span className="mt-3 inline-flex rounded-full bg-secondary-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                    {action.statut}
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h2 className="mb-4 font-headline-md text-lg font-bold text-on-surface">Matrice concurrentielle</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-outline-variant text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-secondary">
                    <th className="pb-3 pr-4">Critere</th>
                    <th className="pb-3 pr-4">Notre offre</th>
                    <th className="pb-3">Concurrent principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {concurrence.map((row) => (
                    <tr key={row.critere}>
                      <td className="py-3 pr-4 font-medium text-on-surface">{row.critere}</td>
                      <td className="py-3 pr-4 text-on-surface">{row.nous}</td>
                      <td className="py-3 text-on-surface">{row.concurrent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h2 className="mb-4 font-headline-md text-lg font-bold text-on-surface">Comite de decision</h2>
            <div className="space-y-3">
              {decideurs.map((person) => (
                <article className="rounded-lg border border-outline-variant bg-surface p-3" key={person.nom}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface">{person.nom}</h3>
                      <p className="text-xs text-on-surface-variant">{person.role}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{person.influence}</span>
                  </div>
                  <p className="mt-2 text-xs text-secondary">Position: {person.position}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h2 className="mb-4 font-headline-md text-lg font-bold text-on-surface">Signaux terrain</h2>
            <div className="space-y-3">
              {signaux.map((signal, index) => (
                <article className="rounded-lg bg-surface-container-high p-3" key={`${signal.type}-${index}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        signal.type === 'Positif' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {signal.type}
                    </span>
                    <span className="text-[11px] text-secondary">{signal.heure}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-on-surface-variant">{signal.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h2 className="mb-4 font-headline-md text-lg font-bold text-on-surface">Risques et mitigation</h2>
            <div className="space-y-3">
              {risques.map((risque) => (
                <article className="rounded-lg border border-outline-variant p-3" key={risque.titre}>
                  <h3 className="text-sm font-semibold text-on-surface">{risque.titre}</h3>
                  <p className="mt-1 text-xs text-secondary">Impact: {risque.impact}</p>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{risque.mitigation}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
