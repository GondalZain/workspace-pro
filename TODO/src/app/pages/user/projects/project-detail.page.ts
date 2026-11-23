import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import {
  ProjectDetailViewComponent,
  ProjectPageChromeComponent,
  findProjectBySlug,
  projectEditNav,
  projectSlug
} from '../../../components/projects';
import { ProjectStoreService } from '../../../services/project-store.service';
import { TaskStoreService } from '../../../services/task-store.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Project } from '../../../models/project.model';
import { Task, TaskStatus } from '../../../models/task.model';
import { ROUTES } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-user-project-detail-page',
  standalone: true,
  imports: [WorkspaceUserLayoutComponent, ProjectPageChromeComponent, ProjectDetailViewComponent],
  templateUrl: './project-detail.page.html'
})
export class UserProjectDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectStore = inject(ProjectStoreService);
  private readonly taskStore = inject(TaskStoreService);
  private readonly auth = inject(AuthService);

  protected readonly currentUser = signal(this.auth.getUser());
  protected readonly isAdmin = computed(
    () => this.currentUser()?.permissions?.includes('users.manage') === true
  );

  protected readonly isAdminRoute = computed(() => this.router.url.startsWith('/admin'));

  private readonly routeSlug = signal<string | null>(null);

  protected readonly project = computed<Project | null>(() =>
    findProjectBySlug(this.projectStore.projects(), this.routeSlug())
  );

  protected readonly projectTasks = computed(() => {
    const currentProject = this.project();
    if (!currentProject) return [];
    return this.taskStore.tasks().filter((task) => Number(task.projectId) === currentProject.id);
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.routeSlug.set(params.get('slug'));
    });

    effect(() => {
      const currentProject = this.project();
      this.projectStore.setActiveProjectId(currentProject?.id ?? null);

      const slug = this.routeSlug();
      const list = this.projectStore.projects();
      if (!currentProject || !slug) return;

      const canonical = projectSlug(currentProject, list);
      if (slug !== canonical) {
        const routeFn = this.isAdminRoute() ? ROUTES.adminProjectDetail : ROUTES.projectDetail;
        this.router.navigate(routeFn(canonical), { replaceUrl: true });
      }
    });

    if (this.projectStore.projects().length === 0) {
      this.projectStore.refresh();
    }

    if (this.taskStore.tasks().length === 0) {
      this.taskStore.refresh();
    }
  }

  protected goBack(): void {
    if (this.isAdminRoute()) {
      this.router.navigate(ROUTES.adminProjects);
    } else {
      this.router.navigate(ROUTES.dashboardProjects);
    }
  }

  protected editProject(_projectId: number): void {
    const currentProject = this.project();
    if (!currentProject) return;
    this.router.navigate(projectEditNav(currentProject, this.projectStore.projects(), this.isAdminRoute()));
  }

  protected openTaskDetail(task: Task): void {
    this.taskStore.setActiveTaskId(task.id);
    this.taskStore.setTaskReturnContext('project', this.project()?.id ?? null, this.isAdminRoute());
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskDetail : ROUTES.taskDetail);
  }

  protected newTask(): void {
    this.taskStore.setEditOrigin('project');
    this.taskStore.setTaskReturnContext('project', this.project()?.id ?? null, this.isAdminRoute());
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskNew : ROUTES.taskNew);
  }

  protected editTask(task: Task): void {
    this.taskStore.setActiveTaskId(task.id);
    this.taskStore.setEditOrigin('project');
    this.taskStore.setTaskReturnContext('project', this.project()?.id ?? null, this.isAdminRoute());
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskEdit : ROUTES.taskEdit);
  }

  protected toggleTask(id: number): void {
    this.taskStore.toggle(id);
  }

  protected onStatusChanged(event: { id: number; status: TaskStatus }): void {
    this.taskStore.update(event.id, { status: event.status });
  }

  protected deleteTask(id: number): void {
    this.taskStore.remove(id);
  }

  protected refreshProject(): void {
    this.projectStore.refresh();
    this.taskStore.refresh();
  }
}
