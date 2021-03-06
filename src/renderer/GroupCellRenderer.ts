import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import GroupColumn from '../model/GroupColumn';
import {ICellRendererFactory, ICellRenderer, IGroupCellRenderer, ISummaryRenderer} from './interfaces';
import {noop, noRenderer} from './utils';

export default class GroupCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Default';

  canRender(col: Column): boolean {
    return col instanceof GroupColumn;
  }

  create(): ICellRenderer {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, _row: IDataRow, i: number, group: IGroup) {
        const p = (<HTMLElement>node.firstElementChild!);
        if (i !== 0) {
          p.innerText = '';
        } else if (Array.isArray((<any>group).order)) {
          p.innerText = `${group.name} (${(<any>group).order.length})`;
        } else {
          p.innerText = group.name;
        }
      },
      render: noop
    };
  }

  createGroup(): IGroupCellRenderer {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, group: IGroup, rows: IDataRow[]) {
        (<HTMLElement>node.firstElementChild!).innerText = `${group.name} (${rows.length})`;
      }
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
