// Feuille de tâches — partagée par CDV, VIP, CHARGE_PARTENARIAT et
// COMPTABLE. Branchée sur les vraies tâches (`Task`, task_type=CONTACT) et
// les vrais contacts (prospects, clients, partenaires) — les tâches liées au
// contact interne (agenda personnel du DG/ADCH, voir getOrCreateAgencyContact)
// sont volontairement exclues : ce sont des notes personnelles, pas du suivi
// d'équipe sur des contacts.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import { LABEL_CLASSES } from '../components/ui/formStyles';
import { listContacts, type Contact } from '../services/contactService';
import { listDirectory, type CurrentUser } from '../services/userService';
import { createTask, listAllTasks, updateTask, type Task } from '../services/taskService';

type Scope = 'MINE' | 'TEAM';
type Bucket = 'LATE' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'LATER';

const BUCKET_META: Record<Bucket, { label: string; classes: string }> = {
  LATE: { label: 'En retard', classes: 'text-rose-600' },
  TODAY: { label: "Aujourd'hui", classes: 'text-primary' },
  TOMORROW: { label: 'Demain', classes: 'text-slate-900' },
  WEEK: { label: 'Cette semaine', classes: 'text-slate-900' },
  LATER: { label: 'Plus tard', classes: 'text-slate-500' },
};

const BUCKET_ORDER: Bucket[] = ['LATE', 'TODAY', 'TOMORROW', 'WEEK', 'LATER'];

function getBucket(task: Task): Bucket {
  if (!task.due_at) return 'LATER';

  const due = new Date(task.due_at);
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

function formatDueLabel(task: Task): string {
  if (!task.due_at) return 'Sans échéance';
  const due = new Date(task.due_at);
  const time = due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const bucket = getBucket(task);

  if (bucket === 'LATE') {
    const days = Math.abs(Math.round((new Date().setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 86_400_000));
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
  const { user } = useAuth();
  // La chargée de partenariat est seule sur son périmètre — pas de notion
  // d'équipe à afficher, contrairement à CDV/VIP/Comptabilité qui partagent
  // cette page avec des collègues du même rôle.
  const isSoloRole = user?.role === 'CHARGE_PARTENARIAT';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [directory, setDirectory] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('MINE');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newContactId, setNewContactId] = useState<number | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([listContacts('PROSPECT'), listContacts('CLIENT'), listContacts('PARTENAIRE'), listDirectory(), listAllTasks()])
      .then(([prospects, clients, partenaires, dir, allTasks]) => {
        const allContacts = [...prospects, ...clients, ...partenaires];
        const contactIds = new Set(allContacts.map((c) => c.id));
        setContacts(allContacts);
        setDirectory(dir);
        setTasks(allTasks.filter((t) => t.task_type === 'CONTACT' && t.contact !== null && contactIds.has(t.contact)));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  function linkedLabel(task: Task): string {
    const contact = task.contact !== null ? contactById.get(task.contact) : undefined;
    return contact ? contact.company || contact.name : '';
  }

  function contextLabel(task: Task): string {
    const contact = task.contact !== null ? contactById.get(task.contact) : undefined;
    if (!contact) return '';
    return contact.contact_type === 'PROSPECT' ? `Prospect — ${contact.stage_display}` : contact.contact_type_display;
  }

  async function toggleTask(task: Task) {
    const done = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done, status: done ? 'DONE' : 'TODO' } : t)));
    await updateTask(task.id, { done, status: done ? 'DONE' : 'TODO' });
  }

  function openCreateModal() {
    setFormError(null);
    setNewLabel('');
    setNewContactId(contacts[0]?.id ?? null);
    setNewAssigneeId(user?.id ?? directory[0]?.id ?? null);
    setNewDueDate('');
    setNewDueTime('');
    setIsModalOpen(true);
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newLabel.trim() || !newContactId || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const dueAt = newDueDate ? new Date(`${newDueDate}T${newDueTime || '00:00'}`).toISOString() : null;
      const created = await createTask({
        contact: newContactId,
        label: newLabel.trim(),
        due_at: dueAt,
        assignee: newAssigneeId,
      });
      setTasks((prev) => [...prev, created]);
      setIsModalOpen(false);
    } catch {
      setFormError('Une erreur est survenue. Vérifiez les champs et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const scopedTasks = useMemo(
    () => (isSoloRole || scope === 'MINE' ? tasks.filter((t) => t.assignee === user?.id) : tasks),
    [tasks, scope, user?.id, isSoloRole],
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedTasks.filter((task) => {
      return (
        !query ||
        task.label.toLowerCase().includes(query) ||
        linkedLabel(task).toLowerCase().includes(query) ||
        (task.assignee_name ?? '').toLowerCase().includes(query)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedTasks, search, contactById]);

  const groups = useMemo(() => {
    const map = new Map<Bucket, Task[]>();
    for (const task of filteredTasks) {
      const bucket = getBucket(task);
      map.set(bucket, [...(map.get(bucket) ?? []), task]);
    }
    return map;
  }, [filteredTasks]);

  const workload = useMemo(() => {
    const byAssignee = new Map<string, number>();
    for (const task of tasks) {
      if (task.done || !task.assignee_name) continue;
      byAssignee.set(task.assignee_name, (byAssignee.get(task.assignee_name) ?? 0) + 1);
    }
    const max = Math.max(1, ...byAssignee.values());
    return Array.from(byAssignee.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([assignee, count]) => ({ assignee, count, ratio: count / max }));
  }, [tasks]);

  const currentUserName = user ? `${user.first_name} ${user.last_name}`.trim() : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Chargement...
      </div>
    );
  }

  return (
    <div className="max-w-[1480px] mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">checklist</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Feuilles de Tâches</h2>
            <p className="text-slate-500 text-xs mt-0.5">Suivi de vos tâches et de celles de l'équipe auprès des contacts.</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={openCreateModal}
          type="button"
        >
          <span className="material-symbols-outlined text-[17px]">add_task</span>
          Nouvelle tâche
        </button>
      </header>

      <div className={`grid grid-cols-1 gap-3.5 items-start ${isSoloRole ? '' : 'lg:grid-cols-3'}`}>
        <div className={`flex flex-col gap-3.5 ${isSoloRole ? '' : 'lg:col-span-2'}`}>
          <section className="flex flex-col md:flex-row md:items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
            {!isSoloRole && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    scope === 'MINE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  onClick={() => setScope('MINE')}
                  type="button"
                >
                  Mes tâches
                </button>
                <button
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    scope === 'TEAM' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  onClick={() => setScope('TEAM')}
                  type="button"
                >
                  Toute l'équipe
                </button>
              </div>
            )}

            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-[16px]">search</span>
              </span>
              <input
                className="w-full bg-slate-50 border border-slate-200 py-1.5 pl-9 pr-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une tâche ou un contact..."
                type="text"
                value={search}
              />
            </div>
          </section>

          <div className="flex flex-col gap-5">
            {BUCKET_ORDER.map((bucket) => {
              const items = groups.get(bucket);
              if (!items || items.length === 0) return null;
              const meta = BUCKET_META[bucket];
              return (
                <section key={bucket}>
                  <div className="flex items-center gap-2 mb-2 px-0.5">
                    <span className={`font-bold text-[11px] uppercase tracking-widest ${meta.classes}`}>{meta.label}</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500">
                      {items.length}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
                    {items.map((task) => (
                      <label
                        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                        key={task.id}
                      >
                        <input
                          checked={task.done}
                          className="mt-1 w-4 h-4 text-primary focus:ring-primary rounded-sm border-slate-300 shrink-0"
                          onChange={() => toggleTask(task)}
                          type="checkbox"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${task.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.label}
                          </p>
                          {(linkedLabel(task) || contextLabel(task)) && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {linkedLabel(task) && contextLabel(task)
                                ? `${linkedLabel(task)} · ${contextLabel(task)}`
                                : linkedLabel(task) || contextLabel(task)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                          <span
                            className={`text-[11px] font-semibold ${
                              bucket === 'LATE' && !task.done ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            {formatDueLabel(task)}
                          </span>
                          {task.assignee_name && (
                            <span
                              className="w-6 h-6 rounded-full bg-primary/80 text-white flex items-center justify-center text-[10px] font-bold"
                              title={task.assignee_name}
                            >
                              {getInitials(task.assignee_name)}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs shadow-xs">
                Aucune tâche ne correspond à votre recherche.
              </div>
            )}
          </div>
        </div>

        {!isSoloRole && (
        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
            <h3 className="font-headline-md text-sm font-bold text-slate-900 mb-4">Charge de l'équipe</h3>
            <div className="flex flex-col gap-3">
              {workload.map(({ assignee, count, ratio }) => (
                <div key={assignee}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-semibold truncate ${assignee === currentUserName ? 'text-primary' : 'text-slate-900'}`}>
                      {assignee}
                      {assignee === currentUserName && ' (vous)'}
                    </span>
                    <span className="font-bold text-slate-400 shrink-0 ml-2">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${assignee === currentUserName ? 'bg-primary' : 'bg-primary/50'}`}
                      style={{ width: `${Math.max(8, ratio * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {workload.length === 0 && <p className="text-xs text-slate-400">Aucune tâche en cours pour le moment.</p>}
            </div>
          </div>
        </aside>
        )}
      </div>

      {/* Modal : nouvelle tâche */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
              disabled={isSubmitting || !newContactId}
              form="feuille-taches-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : 'Ajouter la tâche'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        maxWidthClassName="max-w-md"
        onClose={() => setIsModalOpen(false)}
        title="Nouvelle tâche"
      >
        <form className="space-y-3" id="feuille-taches-form" onSubmit={handleAddTask}>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="ft-label">
              Tâche *
            </label>
            <input
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all"
              id="ft-label"
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Ex : Relancer par téléphone"
              required
              type="text"
              value={newLabel}
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="ft-contact">
              Lié à *
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              id="ft-contact"
              onChange={(event) => setNewContactId(Number(event.target.value))}
              required
              value={newContactId ?? ''}
            >
              {contacts.length === 0 && <option value="">Aucun contact disponible</option>}
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.company || contact.name} — {contact.contact_type_display}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="ft-assignee">
              Assignée à
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              id="ft-assignee"
              onChange={(event) => setNewAssigneeId(Number(event.target.value))}
              value={newAssigneeId ?? ''}
            >
              {directory.map((member) => (
                <option key={member.id} value={member.id}>
                  {`${member.first_name} ${member.last_name}`.trim() || member.email}
                  {member.id === user?.id ? ' (vous)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="ft-date">
                Date
              </label>
              <input
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                id="ft-date"
                onChange={(event) => setNewDueDate(event.target.value)}
                type="date"
                value={newDueDate}
              />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="ft-time">
                Heure
              </label>
              <input
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                id="ft-time"
                onChange={(event) => setNewDueTime(event.target.value)}
                type="time"
                value={newDueTime}
              />
            </div>
          </div>

          {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
}
