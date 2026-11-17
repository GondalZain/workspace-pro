/**
 * Central reactive forms layer.
 *
 * Each builder file follows the same contract:
 * 1. `*FormValue` — typed shape returned on submit
 * 2. `create*Form(fb)` — controls + validators (edit fields/rules here)
 * 3. `*FormValueFromRaw` — trim/normalize before API calls (optional)
 * 4. `patch*Form` / `patchFormIfChanged` — load existing data into the form
 * 5. `*FormTo*` — map form value to domain models (e.g. task editor → NewTask)
 *
 * Components should only: create form from builder, bind template, call FromRaw/To on submit.
 *
 * Two-way UI state: use `model()` on the component and `[(prop)]` in parents; sync forms via
 * `linkFormControlToModel` / `linkFormGroupToModels`.
 */

export { appValidators, passwordsMatch } from './validators';
export { controlErrorMessage, groupErrorMessage } from './form-messages';
export { patchFormIfChanged } from './patch-form.util';
export { linkFormControlToModel, linkFormGroupToModels } from './model-form-link.util';
export { submitFormGroup } from './submit-form.util';

export {
  createProjectForm,
  projectFormValueFromRaw,
  type ProjectFormValue
} from './builders/project.builder';

export {
  createTaskEditorForm,
  createQuickTaskForm,
  createTaskNoteForm,
  patchTaskEditorForm,
  type PatchTaskEditorOptions,
  quickTaskFormValueFromRaw,
  taskNoteFormValueFromRaw,
  taskEditorFormToNewTask,
  type TaskEditorFormValue,
  type QuickTaskFormValue,
  type TaskNoteFormValue
} from './builders/task.builder';

export {
  createLoginForm,
  createRegistrationForm,
  loginFormValueFromRaw,
  registrationFormValueFromRaw,
  type LoginFormValue,
  type RegistrationFormValue
} from './builders/auth.builder';

export {
  createProfileForm,
  createAdminUserProfileForm,
  profileFormValueFromRaw,
  adminUserProfileFormValueFromRaw,
  type ProfileFormValue,
  type AdminUserProfileFormValue
} from './builders/profile.builder';

export {
  createRoleForm,
  roleFormValueFromRaw,
  patchRoleForm,
  type RoleFormValue
} from './builders/role.builder';

export { createSearchForm, type SearchFormValue } from './builders/search.builder';

export {
  createTaskBoardToolbarForm,
  type TaskBoardToolbarFormValue,
  type TaskBoardPriorityFilter,
  type TaskBoardSort
} from './builders/task-toolbar.builder';
