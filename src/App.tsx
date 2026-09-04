import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ProspectionPage from './pages/ventes/ProspectionPage';
import ProspectDetailPage from './pages/ventes/ProspectDetailPage';
import ClientsPage from './pages/ventes/ClientsPage';
import ClientDetailPage from './pages/ventes/ClientDetailPage';
import PartenairesPage from './pages/PartenairesPage';
import MesContactsPage from './pages/ventes/MesContactsPage';
import MesProjetsPage from './pages/MesProjetsPage';
import ParametresPage from './pages/ParametresPage';
import OpportunitesPage from './pages/ventes/OpportunitesPage';
import NouvelleOpportunitePage from './pages/ventes/NouvelleOpportunitePage';
import OpportuniteDetailPage from './pages/ventes/OpportuniteDetailPage';
import ProjetsPage from './pages/ProjetsPage';
import NouveauProjetPage from './pages/NouveauProjetPage';
import ProjetDetailPage from './pages/ProjetDetailPage';
import ProjetAffectationPage from './pages/ProjetAffectationPage';
import FeuillesDeTachesPage from './pages/FeuillesDeTachesPage';
import CalendrierCollaboratifPage from './pages/CalendrierCollaboratifPage';
import FinancePage from './pages/FinancePage';
import AcomptesAConfirmerPage from './pages/AcomptesAConfirmerPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import MessageriePage from './pages/MessageriePage';
import CentreValidationPage from './pages/CentreValidationPage';
import OpportuniteTemplatePage from './pages/OpportuniteTemplatePage';
import ProspectTemplatePage from './pages/ProspectTemplatePage';
import ProspectTemplate2Page from './pages/ProspectTemplate2Page';
import ClientTemplatePage from './pages/ClientTemplatePage';
import DossierClientProjetTemplatePage from './pages/DossierClientProjetTemplatePage';
import DashboardCdvTemplatePage from './pages/DashboardCdvTemplatePage';
import DashboardDgTemplatePage from './pages/DashboardDgTemplatePage';
import LoginTemplatePage from './pages/LoginTemplatePage';
import PartenaireDetailPage from './pages/PartenaireDetailPage';
import PartenariatsSuiviPage from './pages/PartenariatsSuiviPage';
import PartenariatsDossiersPage from './pages/PartenariatsDossiersPage';
import NouveauDossierPartenariatPage from './pages/NouveauDossierPartenariatPage';
import CdvPartenariatsPage from './pages/ventes/CdvPartenariatsPage';
import CommercialFichePage from './pages/ventes/CommercialFichePage';
import PartenariatDossierDetailPage from './pages/PartenariatDossierDetailPage';
import DossiersClientsPage from './pages/ventes/DossiersClientsPage';
import DossierClientDetailPage from './pages/ventes/DossierClientDetailPage';
import GraphisteTachesPage from './pages/GraphisteTachesPage';
import GraphisteProjetsPage from './pages/GraphisteProjetsPage';
import GraphisteProjetDetailPage from './pages/GraphisteProjetDetailPage';
import GraphisteValidationsPage from './pages/GraphisteValidationsPage';
import RdwEquipePage from './pages/RdwEquipePage';
import RdwProjetsPage from './pages/RdwProjetsPage';
import DeveloppeurTachesPage from './pages/DeveloppeurTachesPage';
import DeveloppeurTacheDetailPage from './pages/DeveloppeurTacheDetailPage';
import DeveloppeurProjetsPage from './pages/DeveloppeurProjetsPage';
import DeveloppeurProjetDetailPage from './pages/DeveloppeurProjetDetailPage';
import VipProductionPage from './pages/VipProductionPage';
import AdchAgendaDgPage from './pages/AdchAgendaDgPage';
import AdchCongesPage from './pages/AdchCongesPage';
import AdchComptesPage from './pages/AdchComptesPage';
import DgTachesPage from './pages/dg/DgTachesPage';
import DgContactsPage from './pages/dg/DgContactsPage';
import DgOpportunitesPage from './pages/dg/DgOpportunitesPage';
import DgProjetsPage from './pages/dg/DgProjetsPage';
import AnalyticsPage from './pages/dg/AnalyticsPage';
import DgFinancePage from './pages/dg/DgFinancePage';
import CalendrierDgPage from './pages/dg/CalendrierDgPage';
import DgValidationsPage from './pages/dg/DgValidationsPage';
import CommercialTachesPage from './pages/ventes/CommercialTachesPage';
import ChefDivisionTachesPage from './pages/ChefDivisionTachesPage';
import CommercialProjetsPage from './pages/ventes/CommercialProjetsPage';
import CommercialValidationsPage from './pages/ventes/CommercialValidationsPage';
import { AuthProvider } from './context/AuthContext';
import { PartenariatDossiersProvider } from './context/PartenariatDossiersContext';
import { GraphisteWorkspaceProvider } from './context/GraphisteWorkspaceContext';
import { RdwWorkspaceProvider } from './context/RdwWorkspaceContext';
import { DeveloppeurWorkspaceProvider } from './context/DeveloppeurWorkspaceContext';
import { VipWorkspaceProvider } from './context/VipWorkspaceContext';
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <PartenariatDossiersProvider>
          <GraphisteWorkspaceProvider>
            <RdwWorkspaceProvider>
              <DeveloppeurWorkspaceProvider>
                <VipWorkspaceProvider>
                  <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/templates/login" element={<LoginTemplatePage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/utilisateurs" element={<UsersPage />} />
                      <Route path="/prospection" element={<ProspectionPage />} />
                      <Route path="/prospection/:id" element={<ProspectDetailPage />} />
                      <Route path="/clients" element={<ClientsPage />} />
                      <Route path="/clients/:id" element={<ClientDetailPage />} />
                      <Route path="/partenaires" element={<PartenairesPage />} />
                      <Route path="/partenaires/:id" element={<PartenaireDetailPage />} />
                      <Route path="/partenariats/suivi" element={<PartenariatsSuiviPage />} />
                      <Route path="/partenariats/apercu" element={<CdvPartenariatsPage />} />
                      <Route path="/equipe/commerciaux/:id" element={<CommercialFichePage />} />
                      <Route path="/partenariats/dossiers" element={<PartenariatsDossiersPage />} />
                      <Route path="/partenariats/dossiers/nouveau" element={<NouveauDossierPartenariatPage />} />
                      <Route path="/partenariats/dossiers/:id" element={<PartenariatDossierDetailPage />} />
                      <Route path="/mes-contacts" element={<MesContactsPage />} />
                      <Route path="/mes-projets" element={<MesProjetsPage />} />
                      <Route path="/dossiers-clients" element={<DossiersClientsPage />} />
                      <Route path="/dossiers-clients/:id" element={<DossierClientDetailPage />} />
                      <Route path="/parametres" element={<ParametresPage />} />
                      <Route path="/opportunites" element={<OpportunitesPage />} />
                      <Route path="/opportunites/nouvelle" element={<NouvelleOpportunitePage />} />
                      <Route path="/opportunites/:id" element={<OpportuniteDetailPage />} />
                      <Route path="/projets" element={<ProjetsPage />} />
                      <Route path="/projets/nouveau" element={<NouveauProjetPage />} />
                      <Route path="/projets/:id" element={<ProjetDetailPage />} />
                      <Route path="/projets/:id/affectation" element={<ProjetAffectationPage />} />
                      <Route path="/feuilles-de-taches" element={<FeuillesDeTachesPage />} />
                      <Route path="/calendrier-collaboratif" element={<CalendrierCollaboratifPage />} />
                      <Route path="/finance" element={<FinancePage />} />
                      <Route path="/finance/acomptes" element={<AcomptesAConfirmerPage />} />
                      <Route path="/documents" element={<DocumentsPage />} />
                      <Route path="/documents/nouveau" element={<DocumentDetailPage />} />
                      <Route path="/documents/:id" element={<DocumentDetailPage />} />
                      <Route path="/messagerie" element={<MessageriePage />} />
                      <Route path="/centre-validation" element={<CentreValidationPage />} />
                      <Route path="/templates/opportunite" element={<OpportuniteTemplatePage />} />
                      <Route path="/templates/prospect" element={<ProspectTemplatePage />} />
                      <Route path="/templates/prospect-2" element={<ProspectTemplate2Page />} />
                      <Route path="/templates/prospect2" element={<ProspectTemplate2Page />} />
                      <Route path="/templates/client" element={<ClientTemplatePage />} />
                      <Route path="/templates/dossier-client-projet" element={<DossierClientProjetTemplatePage />} />
                      <Route path="/templates/dashboard-cdv" element={<DashboardCdvTemplatePage />} />
                      <Route path="/templates/cdv" element={<DashboardCdvTemplatePage />} />
                      <Route path="/templates/dashboard-dg" element={<DashboardDgTemplatePage />} />
                      <Route path="/graphiste/taches" element={<GraphisteTachesPage />} />
                      <Route path="/graphiste/projets" element={<GraphisteProjetsPage />} />
                      <Route path="/graphiste/projets/:id" element={<GraphisteProjetDetailPage />} />
                      <Route path="/graphiste/validations" element={<GraphisteValidationsPage />} />
                      <Route path="/rdw/equipe" element={<RdwEquipePage />} />
                      <Route path="/rdw/projets" element={<RdwProjetsPage />} />
                      <Route path="/rdw/taches" element={<ChefDivisionTachesPage />} />
                      <Route path="/developpeur/taches" element={<DeveloppeurTachesPage />} />
                      <Route path="/developpeur/taches/:id" element={<DeveloppeurTacheDetailPage />} />
                      <Route path="/developpeur/projets" element={<DeveloppeurProjetsPage />} />
                      <Route path="/developpeur/projets/:id" element={<DeveloppeurProjetDetailPage />} />
                      <Route path="/vip/production" element={<VipProductionPage />} />
                      <Route path="/adch/agenda-dg" element={<AdchAgendaDgPage />} />
                      <Route path="/adch/conges" element={<AdchCongesPage />} />
                      <Route path="/adch/comptes" element={<AdchComptesPage />} />
                      <Route path="/dg/taches" element={<DgTachesPage />} />
                      <Route path="/dg/contacts" element={<DgContactsPage />} />
                      <Route path="/dg/opportunites" element={<DgOpportunitesPage />} />
                      <Route path="/dg/projets" element={<DgProjetsPage />} />
                      <Route path="/dg/analytics" element={<AnalyticsPage />} />
                      <Route path="/dg/finance" element={<DgFinancePage />} />
                      <Route path="/dg/calendrier" element={<CalendrierDgPage />} />
                      <Route path="/dg/validations" element={<DgValidationsPage />} />
                      <Route path="/commercial/taches" element={<CommercialTachesPage />} />
                      <Route path="/commercial/projets" element={<CommercialProjetsPage />} />
                      <Route path="/commercial/validations" element={<CommercialValidationsPage />} />
                      <Route path="/cdn/taches" element={<ChefDivisionTachesPage />} />
                      <Route path="/cdm/taches" element={<ChefDivisionTachesPage />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </VipWorkspaceProvider>
              </DeveloppeurWorkspaceProvider>
            </RdwWorkspaceProvider>
          </GraphisteWorkspaceProvider>
        </PartenariatDossiersProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
