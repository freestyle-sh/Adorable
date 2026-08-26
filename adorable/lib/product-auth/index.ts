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
  createSupabaseProjectOwnershipStore,
  hasProjectOwnership,
  projectFromRow,
  projectMatchesRepoId,
  ProjectOwnershipRequiredError,
} from "./project-ownership";
export type {
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
