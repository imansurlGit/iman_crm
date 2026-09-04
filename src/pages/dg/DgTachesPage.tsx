// Mes Tâches - Direction Générale (DG)
// Pilotage des tâches exécutives & stratégiques avec Kanban, vue Liste, statistiques et création rapide

import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateAgencyContact, type Contact } from '../../services/contactService';
import { listTasks, createTask, updateTask, deleteTask, type Task, type TaskPriority, type TaskStatus } from '../../services/taskService';
import Modal from '../../components/ui/Modal';
import { LABEL_CLASSES } from '../../components/ui/formStyles';

type ViewMode = 'KANBAN' | 'LIST';
type PriorityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; badge: string; dot: string }[] = [
  { value: 'HIGH', label: 'Urgente / Haute', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  { value: 'MEDIUM', label: 'Normale / Moyenne', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { value: 'LOW', label: 'Secondaire / Faible', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
];

const PRIORITY_META: Record<TaskPriority, { label: string; badge: string; dot: string }> = {
  HIGH: { label: 'Urgente', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  MEDIUM: { label: 'Moyenne', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  LOW: { label: 'Faible', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

interface ColumnDef {
  status: TaskStatus;
  label: string;
  icon: string;
  headerBadge: string;
  countBadge: string;
  dropClasses: string;
}

const COLUMNS: ColumnDef[] = [
  {
    status: 'TODO',
    label: 'À traiter',
    icon: 'format_list_bulleted',
    headerBadge: 'text-slate-800',
    countBadge: 'bg-slate-100 text-slate-700',
    dropClasses: 'ring-primary/30 bg-primary/5',
  },
  {
    status: 'IN_PROGRESS',
    label: 'En cours',
    icon: 'pending_actions',
    headerBadge: 'text-blue-700',
    countBadge: 'bg-blue-50 text-blue-700 border border-blue-200',
    dropClasses: 'ring-blue-300 bg-blue-50/50',
  },
  {
    status: 'DONE',
    label: 'Finalisées',
    icon: 'check_circle',
    headerBadge: 'text-emerald-700',
    countBadge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dropClasses: 'ring-emerald-300 bg-emerald-50/50',
  },
];

function isOverdue(task: Task): boolean {
  return !task.done && !!task.due_at && new Date(task.due_at) < new Date();
}

function formatDue(value: string): string {
  const due = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return `Aujourd'hui ${due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `Demain ${due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === -1) return `Hier ${due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  return due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function DgTachesPage() {
  const { user } = useAuth();
  const [agencyContact, setAgencyContact] = useState<Contact | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Vue & Filtres
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');

  // Drag & Drop
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Modal d'édition/création
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    getOrCreateAgencyContact()
      .then((contact) => {
        setAgencyContact(contact);
        return listTasks(contact.id);
      })
      .then((data) => setTasks(data.filter((task) => task.assignee === user?.id)))
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  // Filtrage des tâches
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !q || task.label.toLowerCase().includes(q) || (task.description && task.description.toLowerCase().includes(q));
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const task of filteredTasks) {
      map[task.status].push(task);
    }
    for (const key of Object.keys(map) as TaskStatus[]) {
      map[key].sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || (a.due_at ?? '').localeCompare(b.due_at ?? ''));
    }
    return map;
  }, [filteredTasks]);

  function handleDragStart(event: DragEvent<HTMLDivElement>, task: Task) {
    setDraggingId(task.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverColumn(null);
  }

  function handleColumnDragOver(event: DragEvent<HTMLDivElement>, statusVal: TaskStatus) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== statusVal) setDragOverColumn(statusVal);
  }

  async function handleColumnDrop(event: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) {
    event.preventDefault();
    setDragOverColumn(null);
    const idText = event.dataTransfer.getData('text/plain');
    const taskId = Number(idText);
    setDraggingId(null);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, done: targetStatus === 'DONE' } : t)));
    await updateTask(taskId, { status: targetStatus, done: targetStatus === 'DONE' });
  }

  function openCreateModal(initialStatus: TaskStatus = 'TODO') {
    setEditingTask(null);
    setLabel('');
    setDescription('');
    setDueAt('');
    setPriority('MEDIUM');
    setStatus(initialStatus);
    setIsModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setLabel(task.label);
    setDescription(task.description || '');
    setDueAt(task.due_at ? task.due_at.slice(0, 16) : '');
    setPriority(task.priority);
    setStatus(task.status);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, {
          label: label.trim(),
          description: description.trim(),
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          priority,
          status,
          done: status === 'DONE',
        });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        showToast('Tâche mise à jour.');
      } else if (agencyContact && user) {
        const created = await createTask({
          contact: agencyContact.id,
          label: label.trim(),
          description: description.trim(),
          due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
          priority,
          status,
          assignee: user.id,
        });
        setTasks((prev) => [created, ...prev]);
        showToast('Nouvelle tâche créée.');
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await deleteTask(task.id);
    showToast('Tâche supprimée.');
  }

  async function handleToggleDone(task: Task, e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    const isDone = newStatus === 'DONE';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus, done: isDone } : t)));
    await updateTask(task.id, { status: newStatus, done: isDone });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Chargement de vos tâches...
      </div>
    );
  }

  return (
    <div className="max-w-[1480px] mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium border border-slate-700 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. EN-TÊTE ÉPURÉ DE LA PAGE                                          */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">
                  Mes Tâches & Décisions
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                  Direction Générale
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Organisez vos priorités exécutives, notes stratégiques et arbitrages quotidiens.
              </p>
            </div>
          </div>
        </div>

        <button
          className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all shrink-0"
          onClick={() => openCreateModal()}
          type="button"
        >
          <span className="material-symbols-outlined text-[17px]">add_task</span>
          Nouvelle Tâche
        </button>
      </header>

      {/* ==================================================================== */}
      {/* 2. BARRE DE FILTRES ET D'AJOUT RAPIDE                                */}
      {/* ==================================================================== */}
      <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        {/* Contrôles de filtrage & affichage */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre Priorité */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  type="button"
                  className={`px-3 py-1 rounded-lg transition-all ${
                    priorityFilter === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {p === 'ALL' ? 'Toutes' : p === 'HIGH' ? 'Urgentes' : p === 'MEDIUM' ? 'Moyennes' : 'Faibles'}
                </button>
              ))}
            </div>

            {/* Recherche textuelle */}
            <div className="relative">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-[15px]">search</span>
              </span>
              <input
                className="bg-slate-50 border border-slate-200 py-1 pl-8 pr-3 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 placeholder-slate-400 w-48"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer par mot-clé..."
                type="text"
                value={searchQuery}
              />
            </div>
          </div>

          {/* Sélecteur de Mode (Kanban / Liste) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'KANBAN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setViewMode('KANBAN')}
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">view_kanban</span>
              Kanban
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setViewMode('LIST')}
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">table_rows</span>
              Liste
            </button>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. VUE KANBAN (PAR DÉFAUT)                                           */}
      {/* ==================================================================== */}
      {viewMode === 'KANBAN' && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = tasksByColumn[col.status];
            const isDragOver = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                className={`flex flex-col gap-3 rounded-2xl p-4 bg-slate-50/70 border-2 transition-all min-h-[350px] ${
                  isDragOver ? `${col.dropClasses} border-solid ring-2 border-primary/40` : 'border-slate-200/60'
                }`}
                onDragLeave={() => setDragOverColumn((prev) => (prev === col.status ? null : prev))}
                onDragOver={(e) => handleColumnDragOver(e, col.status)}
                onDrop={(e) => handleColumnDrop(e, col.status)}
              >
                {/* Header Colonne */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-slate-600">{col.icon}</span>
                    <h2 className={`font-headline-md text-xs font-bold uppercase tracking-wider ${col.headerBadge}`}>
                      {col.label}
                    </h2>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${col.countBadge}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Liste des cartes de tâches */}
                <div className="flex flex-col gap-2.5 flex-1">
                  {colTasks.map((task) => {
                    const overdue = isOverdue(task);
                    const pMeta = PRIORITY_META[task.priority];

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openEditModal(task)}
                        className={`group bg-white border rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-2.5 ${
                          draggingId === task.id ? 'opacity-40 rotate-1 scale-95' : ''
                        } ${
                          task.status === 'DONE'
                            ? 'border-slate-200/80 bg-slate-50/40 opacity-75'
                            : overdue
                            ? 'border-rose-300 bg-rose-50/30'
                            : 'border-slate-200/90'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => handleToggleDone(task, e)}
                                className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  task.status === 'DONE'
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 hover:border-primary'
                                }`}
                              >
                                {task.status === 'DONE' && (
                                  <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                )}
                              </button>

                              <h3
                                className={`text-xs font-bold leading-snug break-words ${
                                  task.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
                                {task.label}
                              </h3>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task);
                              }}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all shrink-0"
                              title="Supprimer"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-1.5 ml-6 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Footer Carte : Badge Priorité & Échéance */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 ml-6 text-[10px]">
                          <span
                            className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded border ${pMeta.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pMeta.dot}`} />
                            {pMeta.label}
                          </span>

                          {task.due_at && (
                            <span
                              className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded ${
                                overdue
                                  ? 'bg-rose-100 text-rose-700 font-bold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              {formatDue(task.due_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 ? (
                    <button
                      className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-primary border border-dashed border-slate-300 hover:border-primary/40 hover:bg-white rounded-xl py-10 text-xs font-semibold transition-all"
                      onClick={() => openCreateModal(col.status)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                      Ajouter une tâche
                    </button>
                  ) : (
                    <button
                      className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-primary border border-dashed border-slate-300 hover:border-primary/40 hover:bg-white rounded-xl py-2 text-[11px] font-semibold transition-all"
                      onClick={() => openCreateModal(col.status)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Ajouter une tâche
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ==================================================================== */}
      {/* 4. VUE LISTE TABULAIRE                                               */}
      {/* ==================================================================== */}
      {viewMode === 'LIST' && (
        <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="px-4 py-3.5 w-12 text-center">Statut</th>
                  <th className="px-4 py-3.5">Intitulé & Notes</th>
                  <th className="px-4 py-3.5">Priorité</th>
                  <th className="px-4 py-3.5">État actuel</th>
                  <th className="px-4 py-3.5">Échéance</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTasks.map((task) => {
                  const overdue = isOverdue(task);
                  const pMeta = PRIORITY_META[task.priority];

                  return (
                    <tr
                      key={task.id}
                      onClick={() => openEditModal(task)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleDone(task, e)}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors mx-auto ${
                            task.status === 'DONE'
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-primary'
                          }`}
                        >
                          {task.status === 'DONE' && (
                            <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <p
                            className={`font-bold text-xs ${
                              task.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.label}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] border ${pMeta.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pMeta.dot}`} />
                          {pMeta.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            task.status === 'DONE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {task.status === 'DONE' ? 'Terminée' : task.status === 'IN_PROGRESS' ? 'En cours' : 'À traiter'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {task.due_at ? (
                          <span
                            className={`text-[11px] ${
                              overdue ? 'text-rose-600 font-bold' : 'text-slate-600'
                            }`}
                          >
                            {formatDue(task.due_at)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(task)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={6}>
                      Aucune tâche ne correspond aux critères de recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* 5. MODAL CRÉATION / ÉDITION DE TÂCHE                                  */}
      {/* ==================================================================== */}
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
              disabled={isSubmitting}
              form="dg-task-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : editingTask ? 'Mettre à jour' : 'Créer la tâche'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        maxWidthClassName="max-w-md"
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Modifier la tâche' : 'Nouvelle tâche de direction'}
      >
        <form className="space-y-3.5" id="dg-task-form" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="dg-task-label">
              Intitulé de la tâche *
            </label>
            <input
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all"
              id="dg-task-label"
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Valider l'accord-cadre Ministère du Plan"
              required
              type="text"
              value={label}
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="dg-task-description">
              Notes & Précisions
            </label>
            <textarea
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:bg-white outline-none min-h-[75px] transition-all placeholder:text-slate-400"
              id="dg-task-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails, points de vigilance, pièces jointes à réclamer..."
              value={description}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="dg-task-status">
                Statut
              </label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                id="dg-task-status"
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                value={status}
              >
                <option value="TODO">À traiter</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="DONE">Finalisée</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="dg-task-due">
                Échéance
              </label>
              <input
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                id="dg-task-due"
                onChange={(e) => setDueAt(e.target.value)}
                type="datetime-local"
                value={dueAt}
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className={LABEL_CLASSES}>Niveau de priorité</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    priority === opt.value
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                  {opt.label.split(' / ')[0]}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

