export { ProjectPortfolioComponent, type ProjectPortfolioLayout } from './portfolio/project-portfolio';
export { ProjectFormComponent } from './form/project-form';
export type { ProjectFormValue } from '../../core/forms';
export { ProjectDetailViewComponent } from './detail-view/project-detail-view';
export { ProjectCardComponent } from './card/project-card';
export { ProjectPageChromeComponent } from './chrome/project-page-chrome';
export { ProjectImagePipe } from './shared/project-image.pipe';
export { resolveProjectImageUrl } from './shared/project-image.util';
export { findProjectById } from './shared/project-id.util';
export {
  projectSlug,
  slugifyProjectTitle,
  findProjectBySlug,
  projectDetailNav,
  projectEditNav,
  projectDetailNavById
} from './shared/project-slug.util';
