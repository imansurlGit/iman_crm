import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useAuth } from './AuthContext';
import {
  advancePartnershipDossier,
  createPartnershipDossier,
  listPartnershipDossiers,
  markPartnershipBilanValide,
  markPartnershipPaymentReceived,
  setPartnershipConventionStatus,
  togglePartnershipTask,
  type ApiPartnershipDossier,
  type NewPartnershipDossierPayload,
} from '../services/partnershipDossierService';
import type { ConventionStatus } from '../data/partenariatDossiers';

export type Dossier = ApiPartnershipDossier;

interface PartenariatDossiersContextValue {
  dossiers: Dossier[];
  isLoading: boolean;
  addDossier: (input: NewPartnershipDossierPayload) => Promise<Dossier>;
  advanceStep: (id: number) => Promise<void>;
  setConventionStatus: (id: number, status: ConventionStatus) => Promise<void>;
  setPaymentReceived: (id: number) => Promise<void>;
  setBilanValide: (id: number) => Promise<void>;
  toggleTask: (dossierId: number, taskId: number) => Promise<void>;
}

const PartenariatDossiersContext = createContext<PartenariatDossiersContextValue | undefined>(undefined);

export function PartenariatDossiersProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    listPartnershipDossiers()
      .then(setDossiers)
      .finally(() => setIsLoading(false));
  }, [user]);

  function replace(updated: Dossier) {
    setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  async function addDossier(input: NewPartnershipDossierPayload): Promise<Dossier> {
    const created = await createPartnershipDossier(input);
    setDossiers((prev) => [created, ...prev]);
    return created;
  }

  async function advanceStep(id: number) {
    replace(await advancePartnershipDossier(id));
  }

  async function setConventionStatus(id: number, status: ConventionStatus) {
    replace(await setPartnershipConventionStatus(id, status));
  }

  async function setPaymentReceived(id: number) {
    replace(await markPartnershipPaymentReceived(id));
  }

  async function setBilanValide(id: number) {
    replace(await markPartnershipBilanValide(id));
  }

  async function toggleTask(dossierId: number, taskId: number) {
    const dossier = dossiers.find((d) => d.id === dossierId);
    const task = dossier?.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updatedTask = await togglePartnershipTask(taskId, !task.done);
    setDossiers((prev) =>
      prev.map((d) => (d.id === dossierId ? { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? updatedTask : t)) } : d)),
    );
  }

  return (
    <PartenariatDossiersContext.Provider
      value={{ dossiers, isLoading, addDossier, advanceStep, setConventionStatus, setPaymentReceived, setBilanValide, toggleTask }}
    >
      {children}
    </PartenariatDossiersContext.Provider>
  );
}

export function usePartenariatDossiers() {
  const context = useContext(PartenariatDossiersContext);
  if (!context) {
    throw new Error("usePartenariatDossiers doit être utilisé à l'intérieur de PartenariatDossiersProvider");
  }
  return context;
}
