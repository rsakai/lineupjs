import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import StringColumn from '../model/StringColumn';
import {filterMissingMarkup, findFilterMissing} from '../ui/missing';
import {default as IRenderContext, ICellRendererFactory, ICellRenderer, IGroupCellRenderer, ISummaryRenderer} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, setText, uniqueId, exampleText} from './utils';


/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 */
export default class StringCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Default';

  canRender(col: Column): boolean {
    return col instanceof StringColumn;
  }

  create(col: StringColumn): ICellRenderer {
    const align = col.alignment || 'left';
    return {
      template: `<div${align !== 'left' ? ` class="lu-${align}"` : ''}> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        if (col.escape) {
          setText(n, col.getLabel(d));
        } else {
          n.innerHTML = col.getLabel(d);
        }
      },
      render: noop
    };
  }


  createGroup(col: StringColumn): IGroupCellRenderer {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        const v = exampleText(col, rows);
        if (col.escape) {
          setText(n, v);
        } else {
          n.innerHTML = v;
        }
      }
    };
  }

  private static interactiveSummary(col: StringColumn, node: HTMLElement) {
    const form = <HTMLFormElement>node;
    const filterMissing = findFilterMissing(node);
    const input = <HTMLInputElement>node.querySelector('input[type="text"]');
    const isRegex = <HTMLInputElement>node.querySelector('input[type="checkbox"]');

    const update = () => {
      input.disabled = filterMissing.checked;
      isRegex.disabled = filterMissing.checked;

      if (filterMissing.checked) {
        col.setFilter(StringColumn.FILTER_MISSING);
        return;
      }
      const valid = input.value.trim();
      filterMissing.disabled = valid.length > 0;
      if (valid.length <= 0) {
        col.setFilter(null);
        return;
      }
      col.setFilter(isRegex.checked ? new RegExp(input.value) : input.value);
    };

    filterMissing.onchange = update;
    input.onchange = update;
    isRegex.onchange = update;
    form.onsubmit = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      update();
      return false;
    };

    return (actCol: StringColumn) => {
      col = actCol;
      let bak = col.getFilter() || '';
      const bakMissing = bak === StringColumn.FILTER_MISSING;
      if (bakMissing) {
        bak = '';
      }
      filterMissing.checked = bakMissing;
      input.value = bak instanceof RegExp ? bak.source : bak;
      isRegex.checked = bak instanceof RegExp;
      filterMissing.disabled = input.value.trim().length > 0;
      input.disabled = filterMissing.checked;
      isRegex.disabled = filterMissing.checked;
    };
  }

  createSummary(col: StringColumn, context: IRenderContext, interactive: boolean): ISummaryRenderer {
    if (!interactive) {
      return {
        template: `<div></div>`,
        update: (node: HTMLElement) => {
          const filter = col.getFilter() || '';
          node.textContent = toString(filter);
        }
      };
    }
    let bak = col.getFilter() || '';
    const bakMissing = bak === StringColumn.FILTER_MISSING;
    if (bakMissing) {
      bak = '';
    }
    let update: (col: StringColumn) => void;
    const id = uniqueId(context.idPrefix);
    return {
      template: `<form><input type="text" placeholder="Filter ${col.desc.label}..." autofocus value="${(bak instanceof RegExp) ? bak.source : bak}">
          <div class="lu-checkbox"><input id="${id}" type="checkbox" ${(bak instanceof RegExp) ? 'checked="checked"' : ''}><label for="${id}">Use regular expressions</label></div>
          ${filterMissingMarkup(bakMissing, context.idPrefix)}</form>`,
      update: (node: HTMLElement) => {
        if (!update) {
          update = StringCellRenderer.interactiveSummary(col, node);
        }
        update(col);
      }
    };
  }
}

function toString(filter: null | string | RegExp) {
  if (filter == null || filter === '' || filter === StringColumn.FILTER_MISSING) {
    return '';
  }
  if (filter instanceof RegExp) {
    return filter.source;
  }
  return String(filter);
}
