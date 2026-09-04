// Finance - Direction Générale (DG)
// Vue consolidée des encaissements (façon comptable, mais en lecture seule) +
// pilotage des objectifs mensuels de chiffre d'affaires par division.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ICON_CLASSES, LABEL_CLASSES } from '../../components/ui/formStyles';
import Modal from '../../components/ui/Modal';
import { listDivisions, getDivisionIcon, type Division } from '../../services/divisionService';
import { listProjects, getProjectDivisions, type Project } from '../../services/projectService';
import {
  listDivisionObjectives,
  setDivisionObjective,
  updateDivisionObjective,
  type DivisionObjective,
} from '../../services/divisionObjectiveService';

const ICON_INPUT_CLASSES =
  'w-full pl-10 pr-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all';

// La Comptabilité n'a pas d'objectif de CA : elle encaisse ce que les autres
// divisions apportent, elle n'en génère pas elle-même.
const EXCLUDED_DIVISION = 'Comptabilité';

const DIVISION_CHIP_BG: Record<string, string> = {
  Ventes: 'bg-primary',
  Marketing: 'bg-stone-800',
  Numérique: 'bg-stone-600',
};

function chipBgFor(name: string): string {
  return DIVISION_CHIP_BG[name] ?? 'bg-stone-700';
}

type RowStatus = 'ATTENTE_ACOMPTE' | 'PARTIEL' | 'SOLDE' | 'EN_ATTENTE';

const STATUS_LABELS: Record<RowStatus, string> = {
  ATTENTE_ACOMPTE: 'Acompte en attente',
  PARTIEL: 'Partiellement encaissé',
  SOLDE: 'Soldé',
  EN_ATTENTE: "Rien d'encaissé",
};

const STATUS_CLASSES: Record<RowStatus, string> = {
  ATTENTE_ACOMPTE: 'bg-rose-50 text-rose-700 border-rose-200',
  PARTIEL: 'bg-amber-50 text-amber-700 border-amber-200',
  SOLDE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EN_ATTENTE: 'bg-slate-100 text-slate-600 border-slate-200',
};

function toAmount(value: string | null): number {
  if (!value) return 0;
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function buildRowStatus(project: Project): { collected: number; remaining: number; status: RowStatus } {
  const budget = toAmount(project.budget);
  const collected = toAmount(project.collected_amount);
  const remaining = Math.max(0, budget - collected);

  let status: RowStatus = 'EN_ATTENTE';
  if (project.requires_deposit && !project.deposit_received) status = 'ATTENTE_ACOMPTE';
  else if (budget > 0 && collected >= budget) status = 'SOLDE';
  else if (collected > 0) status = 'PARTIEL';

  return { collected, remaining, status };
}

const MONTH_OFFSETS = [-2, -1, 0, 1, 2];
const TODAY = new Date();
const MONTHS = MONTH_OFFSETS.map((offset) => new Date(TODAY.getFullYear(), TODAY.getMonth() + offset, 1));
const CURRENT_MONTH_INDEX = MONTH_OFFSETS.indexOf(0);

function monthISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function monthLabel(date: Date): string {
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatFCFA(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

function formatM(value: number): string {
  return `${(value / 1_000_000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M FCFA`;
}

export default function DgFinancePage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(CURRENT_MONTH_INDEX);
  const [monthObjectives, setMonthObjectives] = useState<DivisionObjective[]>([]);
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(true);

  const [isObjectivesModalOpen, setIsObjectivesModalOpen] = useState(false);
  const [draftObjectives, setDraftObjectives] = useState<Record<number, number>>({});
  const [isSavingObjectives, setIsSavingObjectives] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const selectedMonth = MONTHS[selectedMonthIndex];

  useEffect(() => {
    setIsLoading(true);
    Promise.all([listDivisions(), listProjects({ kind: 'PROJET' })])
      .then(([divisionsList, projectsList]) => {
        setDivisions(divisionsList.filter((d) => d.name !== EXCLUDED_DIVISION));
        setProjects(projectsList);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setIsLoadingObjectives(true);
    listDivisionObjectives(monthISO(selectedMonth))
      .then(setMonthObjectives)
      .finally(() => setIsLoadingObjectives(false));
  }, [selectedMonth]);

  // KPIs comptables — dérivés des projets facturables actifs, en lecture seule.
  const kpis = useMemo(() => {
    let totalBudget = 0;
    let totalCollected = 0;
    for (const p of projects) {
      totalBudget += toAmount(p.budget);
      totalCollected += toAmount(p.collected_amount);
    }
    const totalRemaining = Math.max(0, totalBudget - totalCollected);
    const recoveryRate = totalBudget > 0 ? Math.round((totalCollected / totalBudget) * 100) : 0;
    return { totalBudget, totalCollected, totalRemaining, recoveryRate };
  }, [projects]);

  // Réalisé par division pour le mois sélectionné — approximation : le
  // budget d'un projet touchant plusieurs divisions (via ses prestations)
  // est réparti à parts égales entre elles (pas de montant par prestation
  // côté backend, donc pas d'attribution exacte possible).
  const realizedByDivision = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      const budget = toAmount(p.budget);
      if (budget <= 0) continue;
      const created = new Date(p.created_at);
      if (created.getFullYear() !== selectedMonth.getFullYear() || created.getMonth() !== selectedMonth.getMonth()) continue;
      const divs = getProjectDivisions(p);
      if (divs.length === 0) continue;
      const share = budget / divs.length;
      for (const d of divs) map.set(d, (map.get(d) ?? 0) + share);
    }
    return map;
  }, [projects, selectedMonth]);

  function goToMonth(delta: number) {
    setSelectedMonthIndex((prev) => Math.min(MONTHS.length - 1, Math.max(0, prev + delta)));
  }

  function openObjectivesModal() {
    setDraftObjectives(
      divisions.reduce((acc, d) => {
        const existing = monthObjectives.find((o) => o.division === d.id);
        return { ...acc, [d.id]: existing ? toAmount(existing.amount) / 1_000_000 : 0 };
      }, {} as Record<number, number>),
    );
    setIsObjectivesModalOpen(true);
  }

  async function handleSaveObjectives(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingObjectives(true);
    try {
      const updated = await Promise.all(
        divisions.map((d) => {
          const amount = String((draftObjectives[d.id] ?? 0) * 1_000_000);
          const existing = monthObjectives.find((o) => o.division === d.id);
          return existing
            ? updateDivisionObjective(existing.id, amount)
            : setDivisionObjective({ division: d.id, month: monthISO(selectedMonth), amount });
        }),
      );
      setMonthObjectives(updated);
      setIsObjectivesModalOpen(false);
      showToast(`Objectifs enregistrés pour ${monthLabel(selectedMonth).toLowerCase()}.`);
    } finally {
      setIsSavingObjectives(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-12 max-w-[1480px] mx-auto text-slate-800 animate-fadeIn">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium border border-slate-700 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Finance</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                Direction Générale
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Vue consolidée des encaissements et pilotage des objectifs mensuels par division.
            </p>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* KPIS COMPTABLES (LECTURE SEULE)                                      */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>CA Budgété (actif)</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">account_tree</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">
            {isLoading ? '—' : formatFCFA(kpis.totalBudget)}
          </div>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Total Encaissé</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">payments</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">
            {isLoading ? '—' : formatFCFA(kpis.totalCollected)}
          </div>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Reste à Percevoir</span>
            <span className="material-symbols-outlined text-amber-600 text-[18px]">schedule</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">
            {isLoading ? '—' : formatFCFA(kpis.totalRemaining)}
          </div>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Taux de Recouvrement</span>
            <span className="material-symbols-outlined text-blue-600 text-[18px]">percent</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">
            {isLoading ? '—' : `${kpis.recoveryRate}%`}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* OBJECTIFS MENSUELS PAR DIVISION                                      */}
      {/* ==================================================================== */}
      <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline-md text-sm font-bold text-slate-900">Objectifs mensuels par division</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Fixez le cap du mois pour chaque division et suivez sa progression en temps réel.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                disabled={selectedMonthIndex === 0}
                onClick={() => goToMonth(-1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <span className="px-2 text-xs font-bold text-slate-800 min-w-[128px] text-center capitalize">
                {monthLabel(selectedMonth)}
              </span>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                disabled={selectedMonthIndex === MONTHS.length - 1}
                onClick={() => goToMonth(1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>

            <button
              className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all"
              onClick={openObjectivesModal}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Définir les objectifs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {(isLoading || isLoadingObjectives) && (
            <p className="text-xs text-slate-400 col-span-full text-center py-6">Chargement...</p>
          )}

          {!isLoading &&
            !isLoadingObjectives &&
            divisions.map((div) => {
              const objectiveRecord = monthObjectives.find((o) => o.division === div.id);
              const objectif = objectiveRecord ? toAmount(objectiveRecord.amount) : 0;
              const realized = realizedByDivision.get(div.name) ?? 0;
              const pct = objectif > 0 ? Math.round((realized / objectif) * 100) : 0;
              const gap = Math.max(0, objectif - realized);

              return (
                <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/60" key={div.id}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${chipBgFor(div.name)}`}>
                      <span className="material-symbols-outlined text-[16px]">{getDivisionIcon(div.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{div.name}</p>
                    </div>
                  </div>

                  {objectif > 0 ? (
                    <>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-lg font-black text-slate-900 font-headline-md">{formatM(realized)}</span>
                        <span className="text-[11px] text-slate-500 font-semibold shrink-0">/ {formatM(objectif)}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[10px]">
                        <span className={`font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>{pct}% atteint</span>
                        <span className="text-slate-400">{gap > 0 ? `Reste ${formatM(gap)}` : 'Objectif atteint'}</span>
                      </div>
                    </>
                  ) : (
                    <button
                      className="w-full flex items-center justify-center gap-1.5 text-slate-400 hover:text-primary border border-dashed border-slate-300 hover:border-primary/40 hover:bg-white rounded-lg py-3 text-[11px] font-semibold transition-all"
                      onClick={openObjectivesModal}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">add_circle</span>
                      Objectif non défini
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SUIVI DES PROJETS FACTURABLES (LECTURE SEULE)                        */}
      {/* ==================================================================== */}
      <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-headline-md text-sm font-bold text-slate-900">Suivi des projets facturables</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Vue de contrôle — lecture seule. La saisie des encaissements reste gérée par la Comptabilité.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <th className="px-5 py-3.5">Projet</th>
                <th className="px-5 py-3.5">Client</th>
                <th className="px-5 py-3.5">Budget</th>
                <th className="px-5 py-3.5">Encaissé</th>
                <th className="px-5 py-3.5">Reste</th>
                <th className="px-5 py-3.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={6}>
                    Chargement...
                  </td>
                </tr>
              )}

              {!isLoading &&
                projects
                  .filter((p) => p.budget !== null)
                  .map((project) => {
                    const { collected, remaining, status } = buildRowStatus(project);
                    return (
                      <tr className="hover:bg-slate-50/80 transition-colors" key={project.id}>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{project.name}</td>
                        <td className="px-5 py-3.5 text-slate-600">{project.client_name}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{formatFCFA(toAmount(project.budget))}</td>
                        <td className="px-5 py-3.5 font-semibold text-emerald-700">{formatFCFA(collected)}</td>
                        <td className={`px-5 py-3.5 font-semibold ${remaining > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                          {formatFCFA(remaining)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CLASSES[status]}`}>
                            {STATUS_LABELS[status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

              {!isLoading && projects.filter((p) => p.budget !== null).length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={6}>
                    Aucun projet facturable pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* MODAL : DÉFINIR LES OBJECTIFS DU MOIS                                */}
      {/* ==================================================================== */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => setIsObjectivesModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
              disabled={isSavingObjectives}
              form="dg-objectives-form"
              type="submit"
            >
              {isSavingObjectives ? 'Enregistrement...' : 'Enregistrer les objectifs'}
            </button>
          </>
        }
        isOpen={isObjectivesModalOpen}
        maxWidthClassName="max-w-xl"
        onClose={() => setIsObjectivesModalOpen(false)}
        title={`Objectifs — ${monthLabel(selectedMonth)}`}
      >
        <form className="grid grid-cols-2 gap-3" id="dg-objectives-form" onSubmit={handleSaveObjectives}>
          {divisions.map((div) => (
            <div className="space-y-0.5" key={div.id}>
              <label className={LABEL_CLASSES} htmlFor={`obj-${div.id}`}>
                {div.name} (M FCFA)
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>{getDivisionIcon(div.name)}</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  id={`obj-${div.id}`}
                  min="0"
                  onChange={(event) => setDraftObjectives((prev) => ({ ...prev, [div.id]: Number(event.target.value) }))}
                  step="0.1"
                  type="number"
                  value={draftObjectives[div.id] ?? 0}
                />
              </div>
            </div>
          ))}
        </form>
      </Modal>
    </div>
  );
}
