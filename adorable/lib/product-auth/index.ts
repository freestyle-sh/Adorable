export {
  AuthenticationRequiredError,
  getCurrentUser,
  getCurrentUserFromSupabase,
  requireCurrentUser,
} from "./current-user";
export type { CurrentUser } from "./current-user";
export { getSafeAuthRedirectPath } from "./auth-redirect";
export {
  assertProjectOwnership,
  createOwnedProject,
  createSupabaseProjectOwnershipStore,
  hasProjectOwnership,
  projectFromRow,
  projectMatchesRepoId,
  resolveOwnedProjectName,
  ProjectOwnershipRequiredError,
  toProjectInsert,
} from "./project-ownership";
export type {
  CreateOwnedProjectInput,
  ProductProject,
  ProjectOwnershipStore,
} from "./project-ownership";
export {
  createSupabaseUserFreestyleIdentityDependencies,
  getOrCreateUserFreestyleIdentity,
  getOrCreateUserFreestyleIdentityWithDependencies,
} from "./user-freestyle-identity";
export type {
  PersistUserFreestyleIdentityResult,
  UserFreestyleIdentityDependencies,
  UserFreestyleIdentityResult,
  UserInfrastructureIdentityRecord,
} from "./user-freestyle-identity";
