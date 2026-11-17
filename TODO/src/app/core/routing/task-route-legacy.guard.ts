import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TaskStoreService } from '../../services/task-store.service';
import { ROUTES } from './route-paths';

function parseTaskId(id: string | null): number | null {
  if (!id || !/^\d+$/.test(id)) return null;
  const parsed = Number(id);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Bookmarked `/dashboard/tasks/:id` — store id, open canonical URL without id. */
export const legacyTaskDetailRedirect: CanActivateFn = (route) => {
  const router = inject(Router);
  const taskStore = inject(TaskStoreService);
  const taskId = parseTaskId(route.paramMap.get('id'));
  if (taskId == null) {
    return router.createUrlTree(ROUTES.dashboardTasks);
  }
  taskStore.setActiveTaskId(taskId);
  return router.createUrlTree(ROUTES.taskDetail);
};

/** Bookmarked `/dashboard/tasks/:id/edit`. */
export const legacyTaskEditRedirect: CanActivateFn = (route) => {
  const router = inject(Router);
  const taskStore = inject(TaskStoreService);
  const taskId = parseTaskId(route.paramMap.get('id'));
  if (taskId == null) {
    return router.createUrlTree(ROUTES.taskNew);
  }
  taskStore.setActiveTaskId(taskId);
  return router.createUrlTree(ROUTES.taskEdit);
};

/** Bookmarked `/dashboard/task/:id`. */
export const legacyTaskDetailByIdRedirect: CanActivateFn = (route) => {
  const router = inject(Router);
  const taskStore = inject(TaskStoreService);
  const taskId = parseTaskId(route.paramMap.get('id'));
  if (taskId == null) {
    return router.createUrlTree(ROUTES.dashboardTasks);
  }
  taskStore.setActiveTaskId(taskId);
  return router.createUrlTree(ROUTES.taskDetail);
};

/** Bookmarked `/dashboard/task/:id/edit`. */
export const legacyTaskEditByIdRedirect: CanActivateFn = (route) => {
  const router = inject(Router);
  const taskStore = inject(TaskStoreService);
  const taskId = parseTaskId(route.paramMap.get('id'));
  if (taskId == null) {
    return router.createUrlTree(ROUTES.taskNew);
  }
  taskStore.setActiveTaskId(taskId);
  return router.createUrlTree(ROUTES.taskEdit);
};

/** Require a task id in session before showing detail/edit (id is not in the URL). */
export const taskContextGuard: CanActivateFn = () => {
  const router = inject(Router);
  const taskStore = inject(TaskStoreService);
  return taskStore.activeTaskId() != null ? true : router.createUrlTree(ROUTES.dashboardTasks);
};

export const taskEditContextGuard: CanActivateFn = () => {
  const router = inject(Router);
  const taskStore = inject(TaskStoreService);
  return taskStore.activeTaskId() != null ? true : router.createUrlTree(ROUTES.taskNew);
};
