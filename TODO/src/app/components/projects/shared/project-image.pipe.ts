import { Pipe, PipeTransform } from '@angular/core';
import { resolveProjectImageUrl } from './project-image.util';

@Pipe({
  name: 'projectImage',
  standalone: true
})
export class ProjectImagePipe implements PipeTransform {
  transform(imagePath: string | null | undefined): string | null {
    return resolveProjectImageUrl(imagePath);
  }
}
