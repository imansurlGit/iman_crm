import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listContacts, type Contact } from '../../services/contactService';
import { listAllTasks, createTask, updateTask, type Task } from '../../services/taskService';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(task: Task): boolean {
  return !task.done && !!task.due_at && new Date(task.due_at) < new Date();
}

const PRIORITY_CLASSES: Record<Task['priority'], string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-700',
};

const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';

export default function CommercialTachesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState<'TOUTES' | 'A_FAIRE' | 'TERMINEES'>('A_FAIRE');

  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newContactId, setNewContactId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listContacts('PROSPECT'), listContacts('CLIENT'), listAllTasks()])
      .then(([prospectsData, clientsData, tasksData]) => {
        const mine = [...prospectsData, ...clientsData].filter((c) => c.assigned_to === user?.id);
        setContacts(mine);
        setTasks(tasksData.filter((t) => t.assignee === user?.id));
      })
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  function contactLabel(task: Task): string {
    if (!task.contact) return 'Tâche interne';
    const contact = contactById.get(task.contact);
    if (!contact) return '';
    return contact.company ? `${contact.company} · ${contact.name}` : contact.name;
  }

  const pendingCount = tasks.filter((t) => !t.done).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const doneCount = tasks.filter((t) => t.done).length;

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter((task) => !query || task.label.toLowerCase().includes(query) || contactLabel(task).toLowerCase().includes(query))
      .filter((task) => !contactFilter || task.contact === Number(contactFilter))
      .filter((task) => {
        if (statutFilter === 'A_FAIRE') return !task.done;
        if (statutFilter === 'TERMINEES') return task.done;
        return true;
      })
      .sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || (a.due_at ?? '').localeCompare(b.due_at ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search, contactFilter, statutFilter, contactById]);

  async function toggleTask(task: Task) {
    const updated = await updateTask(task.id, { done: !task.done, status: task.done ? 'TODO' : 'DONE' });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newLabel.trim() || !newContactId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await createTask({
        contact: Number(newContactId),
        label: newLabel.trim(),
        due_at: newDueDate ? new Date(newDueDate).toISOString() : null,
        assignee: user?.id,
      });
      setTasks((prev) => [created, ...prev]);
      setNewLabel('');
      setNewContactId('');
      setNewDueDate('');
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Mes tâches</h2>
          <p className="text-secondary mt-1 text-sm">Les tâches qui vous incombent, tous dossiers confondus.</p>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={() => setIsAdding((prev) => !prev)}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">{isAdding ? 'close' : 'add'}</span>
          {isAdding ? 'Fermer' : 'Nouvelle tâche'}
        </button>
      </section>

      {isAdding && (
        <form className="bg-white border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-end" onSubmit={handleAddTask}>
          <div className="flex-1 space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="taskLabel">
              Tâche
            </label>
            <input
              autoFocus
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="taskLabel"
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Ex : Relancer par téléphone"
              type="text"
              value={newLabel}
            />
          </div>
          <div className="w-full md:w-56 space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="taskContact">
              Dossier
            </label>
            <select
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded appearance-none text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="taskContact"
              onChange={(event) => setNewContactId(event.target.value)}
              value={newContactId}
            >
              <option value="">Choisir un dossier...</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.company || contact.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-44 space-y-1">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="taskDue">
              Échéance
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="taskDue"
              onChange={(event) => setNewDueDate(event.target.value)}
              type="datetime-local"
              value={newDueDate}
            />
          </div>
          <button
            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            disabled={!newLabel.trim() || !newContactId || isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">checklist</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">À faire</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{pendingCount}</span>
          </div>
        </div>
        <div className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${overdueCount > 0 ? 'border-error/30' : 'border-outline-variant'}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${overdueCount > 0 ? 'text-error' : 'text-primary-container'}`}>
            schedule
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">En retard</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{overdueCount}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">task_alt</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Terminées</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{doneCount}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className={SEARCH_INPUT_CLASSES}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une tâche, un dossier..."
            type="text"
            value={search}
          />
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-sm">folder_shared</span>
          </span>
          <select
            className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setContactFilter(event.target.value)}
            value={contactFilter}
          >
            <option value="">Tous les dossiers</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.company || contact.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          {(
            [
              { value: 'A_FAIRE', label: 'À faire' },
              { value: 'TERMINEES', label: 'Terminées' },
              { value: 'TOUTES', label: 'Toutes' },
            ] as const
          ).map((option) => (
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                statutFilter === option.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-outline-variant text-secondary hover:bg-surface-container-high'
              }`}
              key={option.value}
              onClick={() => setStatutFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {filteredTasks.map((task) => {
          const overdue = isOverdue(task);
          return (
            <label
              className={`flex items-center gap-3 px-4 py-3.5 bg-white border rounded-lg cursor-pointer transition-colors ${
                overdue ? 'border-error/40 bg-error-container/10' : 'border-outline-variant hover:bg-surface-container-low'
              }`}
              key={task.id}
            >
              <input checked={task.done} className="w-4 h-4 accent-primary shrink-0" onChange={() => toggleTask(task)} type="checkbox" />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${task.done ? 'line-through text-secondary' : 'text-on-surface'}`}>{task.label}</p>
                {contactLabel(task) && <p className="text-xs text-secondary mt-0.5 truncate">{contactLabel(task)}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${PRIORITY_CLASSES[task.priority]}`}>
                {task.priority_display}
              </span>
              <div className="text-right shrink-0">
                <p className={`text-[11px] font-bold ${overdue ? 'text-error' : 'text-secondary'}`}>
                  {task.due_at ? formatDateTime(task.due_at) : 'Sans échéance'}
                </p>
                {overdue && <p className="text-[10px] text-error">En retard</p>}
              </div>
            </label>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="text-center text-secondary text-sm py-10 bg-white border border-dashed border-outline-variant rounded-lg">
            Aucune tâche ne correspond à votre recherche.
          </div>
        )}
      </div>
    </div>
  );
}
