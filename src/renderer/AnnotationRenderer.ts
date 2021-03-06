import {IDataRow} from '../model';
import AnnotateColumn from '../model/AnnotateColumn';
import Column from '../model/Column';
import StringCellRenderer from './StringCellRenderer';
import {noop} from './utils';
import {ICellRenderer} from './interfaces';

export default class AnnotationRenderer extends StringCellRenderer {
  readonly title: string = 'Default';

  canRender(col: Column): boolean {
    return super.canRender(col) && col instanceof AnnotateColumn;
  }

  create(col: AnnotateColumn): ICellRenderer {
    return {
      template: `<div class='annotations text'>
        <input class='lu-hover-only'>
        <span class='text lu-not-hover'></span>
       </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const input: HTMLInputElement = <HTMLInputElement>n.firstElementChild!;
        input.onchange = () => {
          col.setValue(d, input.value);
        };
        input.onclick = (event) => {
          event.stopPropagation();
        };
        n.lastElementChild!.textContent = input.value = col.getLabel(d);
      },
      render: noop
    };
  }
}
