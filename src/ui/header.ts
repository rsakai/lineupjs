// import Popper from 'popper.js';
import {MIN_LABEL_WIDTH} from '../config';
import {equalArrays} from '../internal';
import {dragAble, dropAble, hasDnDType, IDropResult} from '../internal/dnd';
import {
  createImpositionBoxPlotDesc, createImpositionDesc, createImpositionsDesc, createNestedDesc, createReduceDesc,
  createStackDesc, IColumnDesc, isArrayColumn, isBoxPlotColumn, isCategoricalColumn, isMapColumn, isNumberColumn,
  isNumbersColumn
} from '../model';
import {categoryOf} from '../model/annotations';
import Column from '../model/Column';
import {default as CompositeColumn, IMultiLevelColumn, isMultiLevelColumn} from '../model/CompositeColumn';
import ImpositionBoxPlotColumn from '../model/ImpositionBoxPlotColumn';
import ImpositionCompositeColumn from '../model/ImpositionCompositeColumn';
import ImpositionCompositesColumn from '../model/ImpositionCompositesColumn';
import {IRankingHeaderContext} from './interfaces';
import {IOnClickHandler, getToolbar, dialogContext} from './toolbar';
import {IToolbarAction} from './toolbar';
import MoreColumnOptionsDialog from './dialogs/MoreColumnOptionsDialog';

/** @internal */
export interface IHeaderOptions {
  dragAble: boolean;
  mergeDropAble: boolean;
  rearrangeAble: boolean;
  resizeable: boolean;
  level: number;
}

/** @internal */
export function createHeader(col: Column, ctx: IRankingHeaderContext, options: Partial<IHeaderOptions> = {}) {
  options = Object.assign({
    dragAble: true,
    mergeDropAble: true,
    rearrangeAble: true,
    resizeable: true,
    level: 0
  }, options);
  const node = ctx.document.createElement('section');
  node.innerHTML = `
    <div class="lu-label">${col.getWidth() < MIN_LABEL_WIDTH ? '&nbsp;' : col.label}</div>
    <div class="lu-toolbar"></div>
    <div class="lu-spacing"></div>
    <div class="lu-handle lu-feature-advanced lu-feature-ui"></div>
  `;

  // addTooltip(node, col);

  createShortcutMenuItems(<HTMLElement>node.querySelector('div.lu-toolbar')!, options.level!, col, ctx);

  toggleToolbarIcons(node, col);

  if (options.dragAble) {
    dragAbleColumn(node, col, ctx);
  }
  if (options.mergeDropAble) {
    mergeDropAble(node, col, ctx);
  }
  if (options.rearrangeAble) {
    rearrangeDropAble(<HTMLElement>node.querySelector('.lu-handle')!, col, ctx);
  }
  if (options.resizeable) {
    dragWidth(col, node);
  }
  return node;
}


/** @internal */
export function updateHeader(node: HTMLElement, col: Column) {
  const label = <HTMLElement>node.querySelector('.lu-label')!;
  label.innerHTML = col.getWidth() < MIN_LABEL_WIDTH ? '&nbsp;' : col.label;
  node.title = col.description ? `${col.label}\n${col.description}` : col.label;
  node.dataset.colId = col.id;
  node.dataset.type = col.desc.type;
  node.dataset.typeCat = categoryOf(col).name;

  updateIconState(node, col);
}


/** @internal */
export function updateIconState(node: HTMLElement, col: Column) {
  const sort = <HTMLElement>node.querySelector(`i[title='Sort']`)!;
  if (sort) {
    const {asc, priority} = col.isSortedByMe();
    sort.dataset.sort = asc !== undefined ? asc : '';
    if (priority !== undefined) {
      sort.dataset.priority = (priority + 1).toString();
    } else {
      delete sort.dataset.priority;
    }
  }

  const sortGroups = <HTMLElement>node.querySelector(`i[title='Sort Group']`)!;
  if (sortGroups) {
    const {asc, priority} = col.isGroupSortedByMe();
    sortGroups.dataset.sort = asc !== undefined ? asc : '';
    if (priority !== undefined) {
      sortGroups.dataset.priority = (priority + 1).toString();
    } else {
      delete sortGroups.dataset.priority;
    }
  }

  const group = <HTMLElement>node.querySelector(`i[title^='Group']`)!;
  if (group) {
    const groupedBy = col.isGroupedBy();
    group.dataset.group = groupedBy >= 0 ? 'true' : 'false';
    if (groupedBy >= 0) {
      group.dataset.priority = (groupedBy + 1).toString();
    } else {
      delete group.dataset.priority;
    }
  }

  const filter = <HTMLElement>node.querySelector(`i[title^='Filter']`)!;
  if (!filter) {
    return;
  }
  if (col.isFiltered()) {
    filter.dataset.active = '';
  } else {
    delete filter.dataset.active;
  }
}

function addIconDOM(node: HTMLElement, col: Column, ctx: IRankingHeaderContext, level: number, showLabel: boolean) {
  return (action: IToolbarAction) => {
    node.insertAdjacentHTML('beforeend', `<i data-a="${action.options.shortcut === 'only' ? 'o' : action.options.shortcut ? 's' : 'r'}" title="${action.title}" class="lu-action lu-feature-${action.options.featureLevel || 'basic'} lu-feature-${action.options.featureCategory || 'others'}"><span${!showLabel ? ' aria-hidden="true"' : ''}>${action.title}</span> </i>`);
    const i = <HTMLElement>node.lastElementChild;
    i.onclick = (evt) => {
      evt.stopPropagation();
      ctx.dialogManager.setHighlightColumn(col);
      action.onClick(col, <any>evt, ctx, level, !showLabel);
    };
    return i;
  };
}

export interface IAddIcon {
  (title: string, onClick: IOnClickHandler): void;
}

export function createShortcutMenuItems(node: HTMLElement, level: number, col: Column, ctx: IRankingHeaderContext, willAutoHide: boolean = true) {
  const addIcon = addIconDOM(node, col, ctx, level, false);
  const toolbar = getToolbar(col, ctx);
  const shortcuts = toolbar.filter((d) => d.options.shortcut);
  const hybrids = shortcuts.reduce((a, b) => a + (b.options.shortcut === true ? 1 : 0), 0);

  shortcuts.forEach(addIcon);
  const moreEntries = toolbar.length - shortcuts.length + hybrids;

  if (shortcuts.length === toolbar.length || (moreEntries === hybrids && !willAutoHide)) {
    // all visible or just hybrids that will always be visible
    return;
  }

  // need a more entry
  node.insertAdjacentHTML('beforeend', `<i data-a="m" data-m="${moreEntries}" title="More &hellip;" class="lu-action"><span aria-hidden="true">More &hellip;</span></i>`);
  const i = <HTMLElement>node.lastElementChild;
  i.onclick = (evt) => {
    evt.stopPropagation();
    ctx.dialogManager.setHighlightColumn(col);
    const dialog = new MoreColumnOptionsDialog(col, dialogContext(ctx, level, <any>evt), ctx);
    dialog.open();
  };
}

export function createToolbarMenuItems(node: HTMLElement, level: number, col: Column, ctx: IRankingHeaderContext) {
  const addIcon = addIconDOM(node, col, ctx, level, true);
  getToolbar(col, ctx).filter((d) => d.options.shortcut !== 'only').forEach(addIcon);
}

/** @internal */
function toggleRotatedHeader(node: HTMLElement, col: Column, defaultVisibleClientWidth: number) {
  // rotate header flag if needed
  const label = <HTMLElement>node.querySelector('.lu-label');
  if (col.getWidth() < MIN_LABEL_WIDTH) {
    label.classList.remove('lu-rotated');
    return;
  }
  const width = label.clientWidth;
  const rotated = width <= 0 ? (col.label.length * defaultVisibleClientWidth / 3 * 0.6 > col.getWidth()) : (label.scrollWidth * 0.6 > label.clientWidth);
  label.classList.toggle('lu-rotated', rotated);
}

/** @internal */
function toggleToolbarIcons(node: HTMLElement, col: Column, defaultVisibleClientWidth = 22.5) {
  toggleRotatedHeader(node, col, defaultVisibleClientWidth);

  const toolbar = <HTMLElement>node.querySelector('.lu-toolbar');
  if (toolbar.childElementCount === 0) {
    return;
  }
  const availableWidth = col.getWidth();
  const actions = Array.from(toolbar.children).map((d) => ({node: <HTMLElement>d, width: d.clientWidth > 0 ? d.clientWidth : defaultVisibleClientWidth}));

  const shortCuts =  actions.filter((d) => d.node.dataset.a === 'o');
  const hybrids = actions.filter((d) => d.node.dataset.a === 's');
  const moreIcon = actions.find((d) => d.node.dataset.a === 'm');
  const moreEntries = moreIcon ? parseInt(moreIcon.node.dataset.m!, 10) : 0;
  const needMore = moreEntries > hybrids.length;

  let total = actions.reduce((a, b) => a + b.width, 0);

  for (const action of actions) {
    // maybe hide not needed "more"
    action.node.classList.remove('hidden');
  }

  // all visible
  if (total < availableWidth) {
    return;
  }
  if (moreIcon && !needMore && (total - moreIcon.width) < availableWidth) {
    // available space is enougth we can skip the "more" and then it fits
    moreIcon.node.classList.add('hidden');
    return;
  }

  for (const action of hybrids.reverse().concat(shortCuts.reverse())) { // back to forth and hybrids earlier than pure shortcuts
    // hide and check if enough
    action.node.classList.add('hidden');
    total -= action.width;
    if (total < availableWidth) {
      return;
    }
  }
}


// function addTooltip(node: HTMLElement, col: Column) {
//   let timer = -1;
//   let popper: Popper | null = null;

//   const showTooltip = () => {
//     timer = -1;
//     // no tooltip if no description
//     if (col.description.length <= 0) {
//       return;
//     }
//     const parent = <HTMLElement>node.closest('.lu')!;
//     parent.insertAdjacentHTML('beforeend', `<div class="lu-tooltip" data-type="${col.desc.type}" data-type-cat="${categoryOf(col).name}">
//         <div x-arrow></div>
//         <strong class="lu-label">${col.label}</strong>
//         <p>${col.description.replace('\n', `<br/>`)}</p>
//     </div>`);
//     popper = new Popper(node, parent.lastElementChild!, {
//       removeOnDestroy: true,
//       placement: 'auto',
//       modifiers: {
//         flip: {
//           enabled: false
//         },
//         preventOverflow: {
//           enabled: false
//         }
//       }
//     });
//   };

//   node.addEventListener('mouseenter', () => {
//     if (col.description.length > 0) {
//       timer = self.setTimeout(showTooltip, HOVER_DELAY_SHOW_DETAIL);
//     }
//   });
//   node.addEventListener('mouseleave', () => {
//     if (timer >= 0) {
//       clearTimeout(timer);
//       timer = -1;
//     }
//     if (popper) {
//       popper.destroy();
//       popper = null;
//     }
//   });
// }

/**
 * allow to change the width of a column using dragging the handle
 * @internal
 */
export function dragWidth(col: Column, node: HTMLElement) {
  let ueberElement: HTMLElement;
  const handle = <HTMLElement>node.querySelector('.lu-handle');


  let start = 0;
  const mouseMove = (evt: MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
    const end = evt.clientX;
    const delta = end - start;
    const width = Math.max(0, col.getWidth() + delta);

    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }
    start = end;
    node.style.width = `${width}px`;
    col.setWidth(width);
    toggleToolbarIcons(node, col);
  };

  const mouseUp = (evt: MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
    const end = evt.clientX;
    node.classList.remove('lu-change-width');

    ueberElement.removeEventListener('mousemove', mouseMove);
    ueberElement.removeEventListener('mouseup', mouseUp);
    ueberElement.removeEventListener('mouseleave', mouseUp);
    node.style.width = null;

    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }
    const delta = end - start;
    const width = Math.max(0, col.getWidth() + delta);
    col.setWidth(width);
    toggleToolbarIcons(node, col);
  };
  handle.onmousedown = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    node.classList.add('lu-change-width');

    start = evt.clientX;
    ueberElement = <HTMLElement>node.closest('header')!;
    ueberElement.addEventListener('mousemove', mouseMove);
    ueberElement.addEventListener('mouseup', mouseUp);
    ueberElement.addEventListener('mouseleave', mouseUp);
  };
  handle.onclick = (evt) => {
    // avoid resorting
    evt.stopPropagation();
    evt.preventDefault();
  };
}

export const MIMETYPE_PREFIX = 'text/x-caleydo-lineup-column';

/**
 * allow to drag the column away
 * @internal
 */
export function dragAbleColumn(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  dragAble(node, () => {
    const ref = JSON.stringify(ctx.provider.toDescRef(column.desc));
    const data: any = {
      'text/plain': column.label,
      [`${MIMETYPE_PREFIX}-ref`]: column.id,
      [MIMETYPE_PREFIX]: ref
    };
    if (isNumberColumn(column)) {
      data[`${MIMETYPE_PREFIX}-number`] = ref;
      data[`${MIMETYPE_PREFIX}-number-ref`] = column.id;
    }
    if (isCategoricalColumn(column)) {
      data[`${MIMETYPE_PREFIX}-categorical`] = ref;
      data[`${MIMETYPE_PREFIX}-categorical-ref`] = column.id;
    }
    if (isBoxPlotColumn(column)) {
      data[`${MIMETYPE_PREFIX}-boxplot`] = ref;
      data[`${MIMETYPE_PREFIX}-boxplot-ref`] = column.id;
    }
    if (isMapColumn(column)) {
      data[`${MIMETYPE_PREFIX}-map`] = ref;
      data[`${MIMETYPE_PREFIX}-map-ref`] = column.id;
    }
    if (isArrayColumn(column)) {
      data[`${MIMETYPE_PREFIX}-array`] = ref;
      data[`${MIMETYPE_PREFIX}-array-ref`] = column.id;
    }
    if (isNumbersColumn(column)) {
      data[`${MIMETYPE_PREFIX}-numbers`] = ref;
      data[`${MIMETYPE_PREFIX}-numbers-ref`] = column.id;
    }
    return {
      effectAllowed: 'copyMove',
      data
    };
  }, true);
}

/**
 * dropper for allowing to rearrange (move, copy) columns
 * @internal
 */
export function rearrangeDropAble(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  dropAble(node, [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (result) => {
    let col: Column | null = null;
    const data = result.data;
    if (!(`${MIMETYPE_PREFIX}-ref` in data)) {
      const desc = JSON.parse(data[MIMETYPE_PREFIX]);
      col = ctx.provider.create(ctx.provider.fromDescRef(desc));
      return col != null && column.insertAfterMe(col) != null;
    }

    // find by reference
    const id = data[`${MIMETYPE_PREFIX}-ref`];
    col = ctx.provider.find(id);
    if (!col || (col === column && !result.effect.startsWith('copy'))) {
      return false;
    }
    if (result.effect.startsWith('copy')) {
      col = ctx.provider.clone(col!);
      return col != null && column.insertAfterMe(col) != null;
    }
    // detect whether it is an internal move operation or an real remove/insert operation
    const toInsertParent = col.parent;
    if (!toInsertParent) { // no parent will always be a move
      return column.insertAfterMe(col) != null;
    }
    if (toInsertParent === column.parent) {
      // move operation
      return toInsertParent.moveAfter(col, column) != null;
    }
    col.removeMe();
    return column.insertAfterMe(col) != null;
  }, null, true);
}

/**
 * dropper for allowing to change the order by dropping it at a certain position
 * @internal
 */
export function resortDropAble(node: HTMLElement, column: Column, ctx: IRankingHeaderContext, where: 'before' | 'after', autoGroup: boolean) {
  dropAble(node, [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (result) => {
    let col: Column | null = null;
    const data = result.data;
    if (`${MIMETYPE_PREFIX}-ref` in data) {
      const id = data[`${MIMETYPE_PREFIX}-ref`];
      col = ctx.provider.find(id);
      if (!col || col === column) {
        return false;
      }
    } else {
      const desc = JSON.parse(data[MIMETYPE_PREFIX]);
      col = ctx.provider.create(ctx.provider.fromDescRef(desc));
      if (col) {
        column.findMyRanker()!.push(col);
      }
    }
    const ranking = column.findMyRanker()!;
    if (!col || col === column || !ranking) {
      return false;
    }

    const criteria = ranking.getSortCriteria();
    const groups = ranking.getGroupCriteria();

    const removeFromSort = (col: Column) => {
      const existing = criteria.findIndex((d) => d.col === col);
      if (existing >= 0) { // remove existing column but keep asc state
        return criteria.splice(existing, 1)[0].asc;
      }
      return false;
    };

    // remove the one to add
    const asc = removeFromSort(col);

    const groupIndex = groups.indexOf(column);
    const index = criteria.findIndex((d) => d.col === column);

    if (autoGroup && groupIndex >= 0) {
      // before the grouping, so either ungroup or regroup
      removeFromSort(column);
      if (isCategoricalColumn(col)) { // we can group by it
        groups.splice(groupIndex + (where === 'after' ? 1 : 0), 0, col);
        if (groups.length > ranking.getMaxGroupColumns()) {
          // move the rest to sorting
          const removed = groups.splice(0, groups.length - ranking.getMaxGroupColumns());
          criteria.unshift(...removed.reverse().map((d) => ({asc: false, col: d}))); // now a first sorting criteria
        }
      } else {
        // remove all before and shift to sorting + sorting
        const removed = groups.splice(0, groups.length - groupIndex);
        criteria.unshift(...removed.reverse().map((d) => ({asc: false, col: d}))); // now a first sorting criteria
        criteria.unshift({asc, col});
      }
    } else if (index < 0) {
      criteria.push({asc, col});
    } else if (index === 0 && autoGroup && isCategoricalColumn(col)) {
      // make group criteria
      groups.push(col);
    } else {
      criteria.splice(index + (where === 'after' ? 1 : 0), 0, {asc, col});
    }

    if (!equalArrays(groups, ranking.getGroupCriteria())) {
      ranking.setGroupCriteria(groups);
    }
    ranking.setSortCriteria(criteria);
    return true;
  }, null, true);
}

/**
 * dropper for merging columns
 * @internal
 */
export function mergeDropAble(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  const resolveDrop = (result: IDropResult) => {
    const data = result.data;
    const copy = result.effect === 'copy';
    const prefix = MIMETYPE_PREFIX;
    const key = Object.keys(data).find((d) => d.startsWith(prefix) && d.endsWith('-ref'));
    if (key) {
      const id = data[key];
      let col: Column = ctx.provider.find(id)!;
      if (copy) {
        col = ctx.provider.clone(col);
      } else if (col === column) {
        return null;
      } else {
        col.removeMe();
      }
      return col;
    }
    const alternative = Object.keys(data).find((d) => d.startsWith(prefix));
    if (!alternative) {
      return null;
    }
    const desc = JSON.parse(alternative);
    return ctx.provider.create(ctx.provider.fromDescRef(desc))!;
  };

  const pushChild = (result: IDropResult) => {
    const col: Column | null = resolveDrop(result);
    return col != null && (<CompositeColumn>column).push(col) != null;
  };

  const mergeImpl = (col: Column | null, desc: IColumnDesc) => {
    if (col == null) {
      return false;
    }
    const ranking = column.findMyRanker()!;
    const index = ranking.indexOf(column);
    const parent = <CompositeColumn>ctx.provider.create(desc);
    column.removeMe();
    parent.push(column);
    parent.push(col);
    return ranking.insert(parent, index) != null;
  };

  const mergeWith = (desc: IColumnDesc) => (result: IDropResult) => {
    const col: Column | null = resolveDrop(result);
    return mergeImpl(col, desc);
  };

  const all = [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX];
  const numberish = [`${MIMETYPE_PREFIX}-number-ref`, `${MIMETYPE_PREFIX}-number`];
  const categorical = [`${MIMETYPE_PREFIX}-categorical-ref`, `${MIMETYPE_PREFIX}-categorical`];
  const boxplot = [`${MIMETYPE_PREFIX}-boxplot-ref`, `${MIMETYPE_PREFIX}-boxplot`];
  const numbers = [`${MIMETYPE_PREFIX}-numbers-ref`, `${MIMETYPE_PREFIX}-numbers`];

  node.dataset.draginfo = '+';
  if (column instanceof ImpositionCompositeColumn) {
    return dropAble(node, categorical.concat(numberish), pushChild, (e) => {
      if (hasDnDType(e, ...categorical)) {
        node.dataset.draginfo = 'Color by';
        return;
      }
      if (hasDnDType(e, ...numberish)) {
        node.dataset.draginfo = 'Wrap';
      }
    });
  }
  if (column instanceof ImpositionBoxPlotColumn) {
    return dropAble(node, categorical.concat(boxplot), pushChild, (e) => {
      if (hasDnDType(e, ...categorical)) {
        node.dataset.draginfo = 'Color by';
        return;
      }
      if (hasDnDType(e, ...boxplot)) {
        node.dataset.draginfo = 'Wrap';
      }
    });
  }
  if (column instanceof ImpositionCompositesColumn) {
    return dropAble(node, categorical.concat(numbers), pushChild, (e) => {
      if (hasDnDType(e, ...categorical)) {
        node.dataset.draginfo = 'Color by';
        return;
      }
      if (hasDnDType(e, ...numbers)) {
        node.dataset.draginfo = 'Wrap';
      }
    });
  }
  if (isMultiLevelColumn(column)) {
    // stack column or nested
    return dropAble(node, (<IMultiLevelColumn>column).canJustAddNumbers ? numberish : all, pushChild);
  }
  if (column instanceof CompositeColumn) {
    return dropAble(node, (<CompositeColumn>column).canJustAddNumbers ? numberish : all, pushChild);
  }
  if (isNumbersColumn(column)) {
    node.dataset.draginfo = 'Color by';
    return dropAble(node, categorical, mergeWith(createImpositionsDesc()));
  }
  if (isBoxPlotColumn(column)) {
    node.dataset.draginfo = 'Color by';
    return dropAble(node, categorical, mergeWith(createImpositionBoxPlotDesc()));
  }
  if (isNumberColumn(column)) {
    node.dataset.draginfo = 'Merge';
    return dropAble(node, categorical.concat(numberish), (result: IDropResult, evt: DragEvent) => {
      const col: Column | null = resolveDrop(result);
      if (col == null) {
        return false;
      }
      if (isCategoricalColumn(col)) {
        return mergeImpl(col, createImpositionDesc());
      }
      if (isNumberColumn(col)) {
        return mergeImpl(col, evt.shiftKey ? createReduceDesc() : createStackDesc());
      }
      return false;
    }, (e) => {
      if (hasDnDType(e, ...categorical)) {
        node.dataset.draginfo = 'Color by';
        return;
      }
      if (hasDnDType(e, ...numberish)) {
        node.dataset.draginfo = e.shiftKey ? 'Min/Max' : 'Sum';
      }
    });
  }
  node.dataset.draginfo = 'Group';
  return dropAble(node, all, mergeWith(createNestedDesc()));
}
