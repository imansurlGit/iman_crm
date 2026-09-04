import { useMemo, useState, type FormEvent } from 'react';

// TODO: page volontairement statique — données de démonstration en mémoire,
// aucun appel au backend pour le moment.

type Scope = 'MINE' | 'TEAM';
type Bucket = 'LATE' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'LATER';

interface DemoTask {
  id: number;
  label: string;
  linkedLabel: string;
  contextLabel: string;
  assignee: string;
  dueAt: string | null;
  done: boolean;
}

const CURRENT_USER = 'Aïcha Moussa';
const TEAM_MEMBERS = [CURRENT_USER, 'Halima Boubacar', 'Ibrahim Souley', 'Yacouba Amadou'];

function iso(daysFromNow: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const INITIAL_TASKS: DemoTask[] = [
  {
    id: 1,
    label: 'Relancer par téléphone',
    linkedLabel: 'Moussa Idrissa Chaibou',
    contextLabel: 'Prospect — Chiffrage offre',
    assignee: CURRENT_USER,
    dueAt: iso(0, 9, 30),
    done: false,
  },
  {
    id: 2,
    label: 'Planifier une démonstration',
    linkedLabel: 'Zinder Télécom Services',
    contextLabel: 'Prospect — Échanges',
    assignee: CURRENT_USER,
    dueAt: iso(0, 16, 0),
    done: false,
  },
  {
    id: 3,
    label: 'Négocier les conditions du contrat',
    linkedLabel: "Ministère de l'Agriculture",
    contextLabel: 'Prospect — Négociation',
    assignee: 'Halima Boubacar',
    dueAt: iso(-3, 11, 0),
    done: false,
  },
  {
    id: 4,
    label: 'Envoyer le contrat pour signature',
    linkedLabel: 'Sahel Construction SARL',
    contextLabel: 'Prospect — Négociation',
    assignee: 'Ibrahim Souley',
    dueAt: iso(-1, 18, 0),
    done: false,
  },
  {
    id: 5,
    label: 'Envoyer la proposition commerciale',
    linkedLabel: 'Fatouma Abdou Kadri',
    contextLabel: 'Prospect — Chiffrage offre',
    assignee: CURRENT_USER,
    dueAt: iso(1, 14, 0),
    done: false,
  },
  {
    id: 6,
    label: 'Relancer par email',
    linkedLabel: 'Banque Agricole du Niger',
    contextLabel: 'Client',
    assignee: CURRENT_USER,
    dueAt: iso(2, 10, 0),
    done: false,
  },
  {
    id: 7,
    label: 'Qualifier le besoin',
    linkedLabel: 'Zinder Télécom Services',
    contextLabel: 'Prospect — Échanges',
    assignee: 'Halima Boubacar',
    dueAt: iso(0, 15, 0),
    done: false,
  },
  {
    id: 8,
    label: 'Confirmer le rendez-vous',
    linkedLabel: 'Fatouma Abdou Kadri',
    contextLabel: 'Prospect — Chiffrage offre',
    assignee: CURRENT_USER,
    dueAt: iso(5, 9, 0),
    done: false,
  },
  {
    id: 9,
    label: 'Envoyer le devis',
    linkedLabel: 'Sahel Construction SARL',
    contextLabel: 'Prospect — Chiffrage offre',
    assignee: 'Yacouba Amadou',
    dueAt: iso(3, 12, 0),
    done: false,
  },
  {
    id: 10,
    label: 'Présenter les références agence',
    linkedLabel: "Ministère de l'Agriculture",
    contextLabel: 'Prospect — Prise de contact',
    assignee: 'Ibrahim Souley',
    dueAt: iso(7, 9, 0),
    done: false,
  },
  {
    id: 11,
    label: 'Appel de suivi post-livraison',
    linkedLabel: 'Banque Agricole du Niger',
    contextLabel: 'Client',
    assignee: CURRENT_USER,
    dueAt: iso(-1, 10, 0),
    done: true,
  },
  {
    id: 12,
    label: 'Qualifier le besoin',
    linkedLabel: 'Fatouma Abdou Kadri',
    contextLabel: 'Prospect — Prise de contact',
    assignee: CURRENT_USER,
    dueAt: iso(-2, 9, 0),
    done: true,
  },
];

const BUCKET_META: Record<Bucket, { label: string; classes: string }> = {
  LATE: { label: 'En retard', classes: 'text-error' },
  TODAY: { label: "Aujourd'hui", classes: 'text-primary' },
  TOMORROW: { label: 'Demain', classes: 'text-on-surface' },
  WEEK: { label: 'Cette semaine', classes: 'text-on-surface' },
  LATER: { label: 'Plus tard', classes: 'text-secondary' },
};

const BUCKET_ORDER: Bucket[] = ['LATE', 'TODAY', 'TOMORROW', 'WEEK', 'LATER'];

function getBucket(task: DemoTask): Bucket {
  if (!task.dueAt) return 'LATER';

  const due = new Date(task.dueAt);
  const now = new Date();
  const startOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const diffDays = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86_400_000);

  if (diffDays < 0) return 'LATE';
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  if (diffDays <= 7) return 'WEEK';
  return 'LATER';
}

function formatDueLabel(task: DemoTask): string {
  if (!task.dueAt) return 'Sans échéance';
  const due = new Date(task.dueAt);
  const time = due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const bucket = getBucket(task);

  if (bucket === 'LATE') {
    const days = Math.abs(
      Math.round((new Date().setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 86_400_000),
    );
    return `En retard de ${days} jour${days > 1 ? 's' : ''} — ${time}`;
  }
  if (bucket === 'TODAY') return `Aujourd'hui, ${time}`;
  if (bucket === 'TOMORROW') return `Demain, ${time}`;
  return due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + `, ${time}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function FeuillesDeTachesPage() {
  const [tasks, setTasks] = useState<DemoTask[]>(INITIAL_TASKS);
  const [scope, setScope] = useState<Scope>('MINE');
  const [search, setSearch] = useState('');

  const [newLabel, setNewLabel] = useState('');
  const [newAssignee, setNewAssignee] = useState(CURRENT_USER);
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');

  function toggleTask(id: number) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newLabel.trim()) return;
    const nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    const dueAt = newDueDate ? new Date(`${newDueDate}T${newDueTime || '00:00'}`).toISOString() : null;
    setTasks((prev) => [
      ...prev,
      {
        id: nextId,
        label: newLabel.trim(),
        linkedLabel: '',
        contextLabel: '',
        assignee: newAssignee,
        dueAt,
        done: false,
      },
    ]);
    setNewLabel('');
    setNewAssignee(CURRENT_USER);
    setNewDueDate('');
    setNewDueTime('');
  }

  const scopedTasks = useMemo(
    () => (scope === 'MINE' ? tasks.filter((t) => t.assignee === CURRENT_USER) : tasks),
    [tasks, scope],
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedTasks.filter((task) => {
      return (
        !query ||
        task.label.toLowerCase().includes(query) ||
        task.linkedLabel.toLowerCase().includes(query) ||
        task.assignee.toLowerCase().includes(query)
      );
    });
  }, [scopedTasks, search]);

  const groups = useMemo(() => {
    const map = new Map<Bucket, DemoTask[]>();
    for (const task of filteredTasks) {
      const bucket = getBucket(task);
      map.set(bucket, [...(map.get(bucket) ?? []), task]);
    }
    return map;
  }, [filteredTasks]);

  const workload = useMemo(() => {
    const byAssignee = new Map<string, number>();
    for (const task of tasks) {
      if (task.done) continue;
      byAssignee.set(task.assignee, (byAssignee.get(task.assignee) ?? 0) + 1);
    }
    const max = Math.max(1, ...byAssignee.values());
    return Array.from(byAssignee.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([assignee, count]) => ({ assignee, count, ratio: count / max }));
  }, [tasks]);

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Feuilles de Tâches</h2>
        <p className="text-secondary mt-1 text-sm">
          Suivi de vos tâches et de celles de l'équipe auprès des contacts.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        <div className="lg:col-span-2 flex flex-col gap-gutter">
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl w-fit">
              <button
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  scope === 'MINE' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
                }`}
                onClick={() => setScope('MINE')}
                type="button"
              >
                Mes tâches
              </button>
              <button
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  scope === 'TEAM' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
                }`}
                onClick={() => setScope('TEAM')}
                type="button"
              >
                Toute l'équipe
              </button>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input
                className="w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une tâche ou un contact..."
                type="text"
                value={search}
              />
            </div>
          </section>

          <div className="flex flex-col gap-6">
            {BUCKET_ORDER.map((bucket) => {
              const items = groups.get(bucket);
              if (!items || items.length === 0) return null;
              const meta = BUCKET_META[bucket];
              return (
                <section key={bucket}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-bold text-[11px] uppercase tracking-widest ${meta.classes}`}>{meta.label}</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-secondary">
                      {items.length}
                    </span>
                  </div>
                  <div className="bg-white border border-outline-variant rounded-xl divide-y divide-outline-variant/40 overflow-hidden shadow-sm">
                    {items.map((task) => (
                      <label
                        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-surface-container-lowest transition-colors"
                        key={task.id}
                      >
                        <input
                          checked={task.done}
                          className="mt-1 w-4 h-4 text-primary focus:ring-primary rounded-sm border-outline shrink-0"
                          onChange={() => toggleTask(task.id)}
                          type="checkbox"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold ${
                              task.done ? 'line-through text-on-surface-variant' : 'text-on-surface'
                            }`}
                          >
                            {task.label}
                          </p>
                          {(task.linkedLabel || task.contextLabel) && (
                            <p className="text-xs text-secondary mt-0.5 truncate">
                              {task.linkedLabel && task.contextLabel
                                ? `${task.linkedLabel} · ${task.contextLabel}`
                                : task.linkedLabel || task.contextLabel}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                          <span
                            className={`text-[11px] font-semibold ${
                              bucket === 'LATE' && !task.done ? 'text-error' : 'text-secondary'
                            }`}
                          >
                            {formatDueLabel(task)}
                          </span>
                          <span
                            className="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold"
                            title={task.assignee}
                          >
                            {getInitials(task.assignee)}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="bg-white border border-outline-variant rounded-xl p-8 text-center text-secondary text-sm shadow-sm">
                Aucune tâche ne correspond à votre recherche.
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-gutter lg:sticky lg:top-6">
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Nouvelle tâche</h3>
            <form className="flex flex-col gap-3" onSubmit={handleAddTask}>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="taskLabel">
                  Tâche
                </label>
                <input
                  className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
                  id="taskLabel"
                  onChange={(event) => setNewLabel(event.target.value)}
                  placeholder="Ex : Relancer par téléphone"
                  type="text"
                  value={newLabel}
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="taskAssignee">
                  Commercial
                </label>
                <div className="relative">
                  <select
                    className="w-full px-3 py-2 bg-white border border-outline-variant rounded appearance-none text-sm focus:ring-1 focus:ring-primary-container outline-none"
                    id="taskAssignee"
                    onChange={(event) => setNewAssignee(event.target.value)}
                    value={newAssignee}
                  >
                    {TEAM_MEMBERS.map((member) => (
                      <option key={member} value={member}>
                        {member === CURRENT_USER ? `${member} (vous)` : member}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="taskDueDate">
                    Date
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
                    id="taskDueDate"
                    onChange={(event) => setNewDueDate(event.target.value)}
                    type="date"
                    value={newDueDate}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="taskDueTime">
                    Heure
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
                    id="taskDueTime"
                    onChange={(event) => setNewDueTime(event.target.value)}
                    type="time"
                    value={newDueTime}
                  />
                </div>
              </div>
              <button
                className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                disabled={!newLabel.trim()}
                type="submit"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Ajouter la tâche
              </button>
            </form>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Charge de l'équipe</h3>
            <div className="flex flex-col gap-3">
              {workload.map(({ assignee, count, ratio }) => (
                <div key={assignee}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span
                      className={`font-semibold truncate ${assignee === CURRENT_USER ? 'text-primary' : 'text-on-surface'}`}
                    >
                      {assignee}
                      {assignee === CURRENT_USER && ' (vous)'}
                    </span>
                    <span className="font-bold text-secondary shrink-0 ml-2">{count}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${assignee === CURRENT_USER ? 'bg-primary' : 'bg-primary-container'}`}
                      style={{ width: `${Math.max(8, ratio * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
