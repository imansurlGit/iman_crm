// Règle de visibilité du calendrier collaboratif :
// - DG et ADCH voient l'agenda de tout le monde.
// - Un chef de division (même liste que `DIVISION_CHIEF_ROLES` côté backend,
//   core/models.py) voit l'agenda des membres de sa division.
// - Tout le monde d'autre ne voit que son propre agenda.

export const CALENDAR_CHIEF_ROLES = ['CDV', 'CDM', 'CDN', 'VIP', 'COMPTABLE_GENERAL'];

export function canSeeEveryone(role: string | null | undefined): boolean {
  return role === 'DG' || role === 'ADCH';
}

export function isDivisionChief(role: string | null | undefined): boolean {
  return !!role && CALENDAR_CHIEF_ROLES.includes(role);
}

/** `teamMemberIds` : membres de la division du chef connecté, uniquement
 * pertinent quand `isDivisionChief(viewerRole)` — `null` sinon. */
export function canSeeOwner(
  ownerId: number,
  viewerId: number,
  viewerRole: string | null | undefined,
  teamMemberIds: Set<number> | null,
): boolean {
  if (canSeeEveryone(viewerRole)) return true;
  if (teamMemberIds) return teamMemberIds.has(ownerId);
  return ownerId === viewerId;
}
