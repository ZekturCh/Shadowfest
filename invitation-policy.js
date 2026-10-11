export const invitationLimit = 110;
export const invitationPackageId = 'invitation';
export const isInvitation = ticket => ticket?.packageId === invitationPackageId;
export function allocateInvitations(current, quantity) {
  if (!Number.isSafeInteger(current) || current < 0 || current > invitationLimit || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error('Cupo de invitaciones inválido.');
  if (current + quantity > invitationLimit) throw new Error(`Quedan ${invitationLimit-current} cupos de cortesía. El límite es ${invitationLimit}.`);
  return current + quantity;
}
export function ticketPackageName(packages, id) {
  return id === invitationPackageId ? 'Cortesía · General' : packages.find(pack => pack.id === id)?.name || id;
}
