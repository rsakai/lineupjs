import AEventDispatcher, {IEventListener} from '../internal/AEventDispatcher';
import {ISequence} from '../internal/interable';
import {similar} from '../internal/math';
import {fixCSS} from '../internal/utils';
import {IColumnDump} from '../provider/interfaces';
import {isSortingAscByDefault} from './annotations';
import {defaultGroup} from './Group';
import {ECompareValueType, IColumnDesc, IDataRow, IGroup, IValueCacheLookup, IGroupValueCacheLookup} from './interfaces';
import Ranking, {ISortCriteria} from './Ranking';

export {ECompareValueType, IColumnDesc} from './interfaces';

export interface IFlatColumn {
  readonly col: Column;
  readonly offset: number;
  readonly width: number;
}

export interface IColumnParent {
  remove(col: Column): boolean;

  insert(col: Column, index?: number): Column | null;

  insertAfter(col: Column, reference: Column): Column | null;

  move(col: Column, index?: number): Column | null;

  moveAfter(col: Column, reference: Column): Column | null;

  findMyRanker(): Ranking | null;

  readonly fqid: string;

  indexOf(col: Column): number;

  at(index: number): Column;

  readonly fqpath: string;

}


export interface IColumnMetaData {
  label: string;
  description: string;
}

export declare type ICompareValue = string | number | null;

/**
 * emitted when the width property changes
 * @asMemberOf Column
 * @event
 */
export declare function widthChanged(previous: number, current: number): void;

/**
 * emitted when the label property changes
 * @asMemberOf Column
 * @event
 */
export declare function labelChanged(previous: string, current: string): void;

/**
 * emitted when the meta data property changes
 * @asMemberOf Column
 * @event
 */
export declare function metaDataChanged(previous: IColumnMetaData, current: IColumnMetaData): void;

/**
 * emitted when state of the column is dirty
 * @asMemberOf Column
 * @event
 */
export declare function dirty(): void;

/**
 * emitted when state of the column related to its header is dirty
 * @asMemberOf Column
 * @event
 */
export declare function dirtyHeader(): void;

/**
 * emitted when state of the column related to its values is dirty
 * @asMemberOf Column
 * @event
 */
export declare function dirtyValues(): void;

/**
 * emitted when state of the column related to cached values (hist, compare, ...) is dirty
 * @asMemberOf Column
 * @event
 */
export declare function dirtyCaches(): void;

/**
 * emitted when the renderer type property changes
 * @asMemberOf Column
 * @event
 */
export declare function rendererTypeChanged(previous: string, current: string): void;

/**
 * emitted when the group renderer property changes
 * @asMemberOf Column
 * @event
 */
export declare function groupRendererChanged(previous: string, current: string): void;

/**
 * emitted when the pattern property changes
 * @asMemberOf Column
 * @event
 */
export declare function summaryRendererChanged(previous: string, current: string): void;

/**
 * emitted when the visibility of this column changes
 * @asMemberOf Column
 * @event
 */
export declare function visibilityChanged(previous: boolean, current: boolean): void;


/**
 * a column in LineUp
 */
export default class Column extends AEventDispatcher {
  /**
   * default color that should be used
   * @type {string}
   */
  static readonly DEFAULT_COLOR = '#C1C1C1';
  /**
   * magic variable for showing all columns
   * @type {number}
   */
  static readonly FLAT_ALL_COLUMNS = -1;

  static readonly EVENT_WIDTH_CHANGED = 'widthChanged';
  static readonly EVENT_LABEL_CHANGED = 'labelChanged';
  static readonly EVENT_METADATA_CHANGED = 'metaDataChanged';
  static readonly EVENT_DIRTY = 'dirty';
  static readonly EVENT_DIRTY_HEADER = 'dirtyHeader';
  static readonly EVENT_DIRTY_VALUES = 'dirtyValues';
  static readonly EVENT_DIRTY_CACHES = 'dirtyCaches';
  static readonly EVENT_RENDERER_TYPE_CHANGED = 'rendererTypeChanged';
  static readonly EVENT_GROUP_RENDERER_TYPE_CHANGED = 'groupRendererChanged';
  static readonly EVENT_SUMMARY_RENDERER_TYPE_CHANGED = 'summaryRendererChanged';
  static readonly EVENT_VISIBILITY_CHANGED = 'visibilityChanged';

  /**
   * the id of this column
   */
  private uid: string;

  /**
   * width of the column
   * @type {number}
   * @private
   */
  private width: number = 100;

  /**
   * parent column of this column, set when added to a ranking or combined column
   */
  parent: Readonly<IColumnParent> | null = null;

  private metadata: Readonly<IColumnMetaData>;
  private renderer: string;
  private groupRenderer: string;
  private summaryRenderer: string;
  private visible: boolean;

  constructor(id: string, public readonly desc: Readonly<IColumnDesc>) {
    super();
    this.uid = fixCSS(id);
    this.renderer = this.desc.renderer || this.desc.type;
    this.groupRenderer = this.desc.groupRenderer || this.desc.type;
    this.summaryRenderer = this.desc.summaryRenderer || this.desc.type;
    this.width = this.desc.width != null && this.desc.width > 0 ? this.desc.width : 100;
    this.visible = this.desc.visible !== false;

    this.metadata = {
      label: desc.label || this.id,
      description: desc.description || ''
    };
  }

  get fixed() {
    return Boolean(this.desc.fixed);
  }

  get frozen() {
    return Boolean(this.desc.frozen);
  }

  get id() {
    return this.uid;
  }

  assignNewId(idGenerator: () => string) {
    this.uid = fixCSS(idGenerator());
  }

  get label() {
    return this.metadata.label;
  }

  get description() {
    return this.metadata.description;
  }

  /**
   * returns the fully qualified id i.e. path the parent
   * @returns {string}
   */
  get fqid() {
    return this.parent ? `${this.parent.fqid}_${this.id}` : this.id;
  }

  get fqpath() {
    return this.parent ? `${this.parent.fqpath}@${this.parent.indexOf(this)}` : '';
  }

  protected createEventList() {
    return super.createEventList().concat([Column.EVENT_WIDTH_CHANGED,
    Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_VISIBILITY_CHANGED, Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED,
    Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_GROUP_RENDERER_TYPE_CHANGED,
    Column.EVENT_DIRTY, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES]);
  }

  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  getWidth() {
    return this.width;
  }

  hide() {
    this.setVisible(false);
  }

  show() {
    this.setVisible(true);
  }

  isVisible() {
    return this.visible;
  }

  getVisible() {
    return this.isVisible();
  }

  setVisible(value: boolean) {
    if (this.visible === value) {
      return;
    }
    this.fire([Column.EVENT_VISIBILITY_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.visible, this.visible = value);
  }

  /**
   * visitor pattern for flattening the columns
   * @param {IFlatColumn} r the result array
   * @param {number} offset left offset
   * @param {number} _levelsToGo how many levels down
   * @param {number} _padding padding between columns
   * @returns {number} the used width by this column
   */
  flatten(r: IFlatColumn[], offset: number, _levelsToGo = 0, _padding = 0): number {
    const w = this.getWidth();
    r.push({col: this, offset, width: w});
    return w;
  }

  setWidth(value: number) {
    if (similar(this.width, value, 0.5)) {
      return;
    }
    this.fire([Column.EVENT_WIDTH_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.width, this.width = value);
  }

  setWidthImpl(value: number) {
    this.width = value;
  }

  setMetaData(value: Readonly<IColumnMetaData>) {
    if (value.label === this.label && this.description === value.description) {
      return;
    }
    const bak = this.getMetaData();
    //copy to avoid reference
    this.metadata = {
      label: value.label,
      description: value.description
    };

    this.fire([Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], bak, this.getMetaData());
  }

  getMetaData(): Readonly<IColumnMetaData> {
    return Object.assign({}, this.metadata);
  }

  /**
   * triggers that the ranking is sorted by this column
   * @param ascending ascending order?
   * @param priority sorting priority
   * @returns {boolean} was successful
   */
  sortByMe(ascending = isSortingAscByDefault(this), priority = 0) {
    const r = this.findMyRanker();
    if (r) {
      return r.sortBy(this, ascending, priority);
    }
    return false;
  }

  groupByMe(): boolean {
    const r = this.findMyRanker();
    if (r) {
      return r.toggleGrouping(this);
    }
    return false;
  }

  /**
   *
   * @return {number}
   */
  isGroupedBy(): number {
    const r = this.findMyRanker();
    if (!r) {
      return -1;
    }
    return r.getGroupCriteria().indexOf(this);
  }

  /**
   * toggles the sorting order of this column in the ranking
   * @returns {boolean} was successful
   */
  toggleMySorting() {
    const r = this.findMyRanker();
    if (r) {
      return r.toggleSorting(this);
    }
    return false;
  }

  private isSortedByMeImpl(selector: ((r: Ranking) => ISortCriteria[])): {asc: 'asc' | 'desc' | undefined, priority: number | undefined} {
    const ranker = this.findMyRanker();
    if (!ranker) {
      return {asc: undefined, priority: undefined};
    }
    const criterias = selector(ranker);
    const index = criterias.findIndex((c) => c.col === this);
    if (index < 0) {
      return {asc: undefined, priority: undefined};
    }
    return {
      asc: criterias[index].asc ? 'asc' : 'desc',
      priority: index
    };
  }

  isSortedByMe() {
    return this.isSortedByMeImpl((r) => r.getSortCriteria());
  }

  groupSortByMe(ascending = isSortingAscByDefault(this), priority = 0) {
    const r = this.findMyRanker();
    if (r) {
      return r.groupSortBy(this, ascending, priority);
    }
    return false;
  }

  toggleMyGroupSorting() {
    const r = this.findMyRanker();
    if (r) {
      return r.toggleGroupSorting(this);
    }
    return false;
  }

  isGroupSortedByMe() {
    return this.isSortedByMeImpl((r) => r.getGroupSortCriteria());
  }

  /**
   * removes the column from the ranking
   * @returns {boolean} was successful
   */
  removeMe() {
    if (this.fixed) {
      return false;
    }
    if (this.parent) {
      return this.parent.remove(this);
    }
    return false;
  }

  /**
   * called when the columns added to a ranking
   */
  attach(parent: IColumnParent) {
    this.parent = parent;
  }

  /**
   * called when the column is removed from the ranking
   */
  detach() {
    this.parent = null;
  }

  /**
   * inserts the given column after itself
   * @param col the column to insert
   * @returns {boolean} was successful
   */
  insertAfterMe(col: Column) {
    if (this.parent) {
      return this.parent.insertAfter(col, this) != null;
    }
    return false;
  }

  /**
   * finds the underlying ranking column
   * @returns {Ranking|null} my current ranking
   */
  findMyRanker(): Ranking | null {
    if (this.parent) {
      return this.parent.findMyRanker();
    }
    return null;
  }

  /**
   * dumps this column to JSON compatible format
   * @param toDescRef helper mapping function
   * @returns {any} dump of this column
   */
  dump(toDescRef: (desc: any) => any): any {
    const r: IColumnDump = {
      id: this.id,
      desc: toDescRef(this.desc),
      width: this.width
    };
    if (this.label !== (this.desc.label || this.id)) {
      r.label = this.label;
    }
    if (this.getRenderer() !== this.desc.type) {
      r.renderer = this.getRenderer();
    }
    if (this.getGroupRenderer() !== this.desc.type) {
      r.groupRenderer = this.getGroupRenderer();
    }
    if (this.getSummaryRenderer() !== this.desc.type) {
      r.summaryRenderer = this.getSummaryRenderer();
    }
    return r;
  }

  /**
   * restore the column content from a dump
   * @param dump column dump
   * @param _factory helper for creating columns
   */
  restore(dump: IColumnDump, _factory: (dump: IColumnDump) => Column | null) {
    this.width = dump.width || this.width;
    this.metadata = {
      label: dump.label || this.label,
      description: this.description
    };
    if (dump.renderer || dump.rendererType) {
      this.renderer = dump.renderer || dump.rendererType || this.renderer;
    }
    if (dump.groupRenderer) {
      this.groupRenderer = dump.groupRenderer;
    }
    if (dump.summaryRenderer) {
      this.summaryRenderer = dump.summaryRenderer;
    }
  }

  /**
   * return the label of a given row for the current column
   * @param row the current row
   * @return {string} the label of this column at the specified row
   */
  getLabel(row: IDataRow): string {
    const v = this.getValue(row);
    return v == null ? '' : String(v);
  }

  /**
   * return the value of a given row for the current column
   * @param _row the current row
   * @return the value of this column at the specified row
   */
  getValue(_row: IDataRow): any | null {
    return ''; //no value
  }

  /**
   * returns the value to be used when exporting
   * @param format format hint
   */
  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    return format === 'text' ? this.getLabel(row) : this.getValue(row);
  }

  getColor(_row: IDataRow) {
    return Column.DEFAULT_COLOR;
  }

  toCompareValue(_row: IDataRow, _valueCacheLookup?: IValueCacheLookup): ICompareValue | ICompareValue[] {
    return 0;
  }

  toCompareValueType(): ECompareValueType | ECompareValueType[] {
    return ECompareValueType.UINT8;
  }

  /**
   * group the given row into a bin/group
   * @param _row
   * @return {IGroup}
   */
  group(_row: IDataRow, _valueCacheLookup?: IValueCacheLookup): IGroup {
    return defaultGroup;
  }

  toCompareGroupValue(_rows: ISequence<IDataRow>, group: IGroup, _valueCacheLookup?: IGroupValueCacheLookup): ICompareValue | ICompareValue[] {
    return group.name.toLowerCase();
  }

  toCompareGroupValueType(): ECompareValueType | ECompareValueType[] {
    return ECompareValueType.STRING;
  }

  /**
   * flag whether any filter is applied
   * @return {boolean}
   */
  isFiltered() {
    return false;
  }

  /**
   * predicate whether the current row should be included
   * @param row
   * @return {boolean}
   */
  filter(row: IDataRow, _valueCacheLookup?: IValueCacheLookup) {
    return row != null;
  }

  /**
   * determines the renderer type that should be used to render this column. By default the same type as the column itself
   * @return {string}
   */
  getRenderer(): string {
    return this.renderer;
  }

  getGroupRenderer(): string {
    return this.groupRenderer;
  }

  getSummaryRenderer(): string {
    return this.summaryRenderer;
  }

  setRenderer(renderer: string) {
    if (renderer === this.renderer) {
      // nothing changes
      return;
    }
    this.fire([Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.renderer, this.renderer = renderer);
  }

  protected setDefaultRenderer(renderer: string) {
    if (this.renderer !== this.desc.type || this.desc.renderer) {
      return;
    }
    return this.setRenderer(renderer);
  }

  setGroupRenderer(renderer: string) {
    if (renderer === this.groupRenderer) {
      // nothing changes
      return;
    }
    this.fire([Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.groupRenderer, this.groupRenderer = renderer);
  }

  protected setDefaultGroupRenderer(renderer: string) {
    if (this.groupRenderer !== this.desc.type || this.desc.groupRenderer) {
      return;
    }
    return this.setGroupRenderer(renderer);
  }

  setSummaryRenderer(renderer: string) {
    if (renderer === this.summaryRenderer) {
      // nothing changes
      return;
    }
    this.fire([Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], this.summaryRenderer, this.summaryRenderer = renderer);
  }

  protected setDefaultSummaryRenderer(renderer: string) {
    if (this.summaryRenderer !== this.desc.type || this.desc.summaryRenderer) {
      return;
    }
    return this.setSummaryRenderer(renderer);
  }

  protected setDefaultWidth(width: number) {
    if (this.width !== 100 || this.desc.width) {
      return;
    }
    return this.setWidthImpl(width);
  }

  /**
   * marks the header, values, or both as dirty such that the values are reevaluated
   * @param type specify in more detail what is dirty, by default whole column
   */
  markDirty(type: 'header' | 'values' | 'all' = 'all') {
    switch (type) {
      case 'header':
        return this.fire([Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY]);
      case 'values':
        return this.fire([Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY]);
      default:
        return this.fire([Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY]);
    }
  }
}
