import { useState, type FormEvent } from 'react';
import { createTask, formatTaskDueLabel, type Task } from '../services/taskService';

interface TasksCardProps {
  title: string;
  contactId: number;
  tasks: Task[];
  onToggle: (task: Task) => void;
  onCreated: (task: Task) => void;
}

export default function TasksCard({ title, contactId, tasks, onToggle, onCreated }: TasksCardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function closeForm() {
    setIsFormOpen(false);
    setLabel('');
    setDueAt('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createTask({
        contact: contactId,
        label: label.trim(),
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      onCreated(created);
      closeForm();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-headline-md text-base font-bold text-on-surface">{title}</h3>
        <button
          aria-label={isFormOpen ? 'Fermer' : 'Ajouter une tâche'}
          className="p-1 hover:bg-surface-container-low transition-colors rounded"
          onClick={() => (isFormOpen ? closeForm() : setIsFormOpen(true))}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">{isFormOpen ? 'close' : 'add'}</span>
        </button>
      </div>

      {isFormOpen && (
        <form className="space-y-2 mb-4 pb-4 border-b border-outline-variant" onSubmit={handleSubmit}>
          <input
            autoFocus
            className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex : Relancer par téléphone"
            type="text"
            value={label}
          />
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              onChange={(event) => setDueAt(event.target.value)}
              type="datetime-local"
              value={dueAt}
            />
            <button
              className="px-3 py-2 bg-primary-container text-on-primary font-semibold text-sm rounded transition-transform active:scale-95 hover:bg-primary disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? '...' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <label
            className={`flex items-start gap-2.5 p-2.5 bg-surface-container-lowest border border-outline-variant rounded-sm cursor-pointer group ${
              task.done ? 'opacity-50 grayscale' : ''
            }`}
            key={task.id}
          >
            <input
              checked={task.done}
              className="mt-1 w-4 h-4 text-primary focus:ring-primary rounded-sm border-outline"
              onChange={() => onToggle(task)}
              type="checkbox"
            />
            <div className="flex-1">
              <p
                className={`text-sm font-semibold text-on-surface group-hover:text-primary transition-colors ${
                  task.done ? 'line-through' : ''
                }`}
              >
                {task.label}
              </p>
              <p className={`text-[11px] mt-0.5 ${task.done ? 'text-on-surface-variant' : 'text-primary'}`}>
                {formatTaskDueLabel(task)}
              </p>
            </div>
          </label>
        ))}
        {tasks.length === 0 && <p className="text-xs text-secondary">Aucune tâche pour le moment.</p>}
      </div>
    </div>
  );
}
