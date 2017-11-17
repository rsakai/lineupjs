/**
 * Created by sam on 04.11.2016.
 */

import {scale} from 'd3';
import Column, {IColumnDesc} from './Column';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import StringColumn from './StringColumn';
import {FIRST_IS_NAN} from './missing';

export interface ICategoricalColumn {
  readonly categories: string[];
  readonly categoryLabels: string[];
  readonly categoryColors: string[];

  getCategories(row: any, index: number): string[];

  getColor(row: any, index: number): string | null;
}

export interface ICategory {
  name: string;

  /**
   * optional label of this category (the one to render)
   */
  label?: string;
  /**
   * associated value with this category
   */
  value?: any;
  /**
   * category color
   * @default next in d3 color 10 range
   */
  color?: string;
}

export interface IBaseCategoricalDesc {
  /**
   * separator to split  multi value
   * @defualt ;
   */
  separator?: string;

  categories: (string | ICategory)[];
}

export declare type ICategoricalDesc = IValueColumnDesc<string> & IBaseCategoricalDesc;

/**
 * checks whether the given column or description is a categorical column, i.e. the value is a list of categories
 * @param col
 * @returns {boolean}
 */
export function isCategoricalColumn(col: Column): col is ICategoricalColumn & Column;
export function isCategoricalColumn(col: IColumnDesc): col is ICategoricalDesc;
export function isCategoricalColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<any>col).getCategories === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(categorical|ordinal|hierarchy)/) != null));
}

export interface ICategoricalFilter {
  filter: string[] | string | RegExp;
  filterMissing: boolean;
}

function isEqualFilter(a: ICategoricalFilter | null, b: ICategoricalFilter | null) {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  if (a.filterMissing !== b.filterMissing || (typeof a.filter !== typeof b.filter)) {
    return false;
  }
  if (Array.isArray(a.filter)) {
    return arrayEquals(<string[]>a.filter, <string[]>b.filter);
  }
  return String(a.filter) === String(b.filter);
}

function arrayEquals<T>(a: T[], b: T[]) {
  const al = a != null ? a.length : 0;
  const bl = b != null ? b.length : 0;
  if (al !== bl) {
    return false;
  }
  if (al === 0) {
    return true;
  }
  return a.every((ai, i) => ai === b[i]);
}

/**
 * column for categorical values
 */
export default class CategoricalColumn extends ValueColumn<string> implements ICategoricalColumn {
  /**
   * colors for each category
   * @type {Ordinal<string, string>}
   */
  private colors = scale.category10();

  /**
   * category labels by default the category name itself
   * @type {Array}
   */
  private catLabels = new Map<string, string>();

  /**
   * set of categories to show
   * @type {null}
   * @private
   */
  private currentFilter: ICategoricalFilter | null = null;

  /**
   * split multiple categories
   * @type {string}
   */
  private separator = ';';

  constructor(id: string, desc: ICategoricalDesc) {
    super(id, desc);
    this.separator = desc.separator || this.separator;
    this.initCategories(desc);
    //TODO infer categories from data
  }

  initCategories(desc: IBaseCategoricalDesc) {
    if (!desc.categories) {
      return;
    }
    const cats: string[] = [],
      cols = this.colors.range().slice(), //work on a copy since it will be manipulated
      labels = new Map<string, string>();
    desc.categories.forEach((cat, i) => {
      if (typeof cat === 'string') {
        //just the category value
        cats.push(cat);
        return;
      }
      //the name or value of the category
      cats.push(cat.name || cat.value);
      //optional label mapping
      if (cat.label) {
        labels.set(cat.name, cat.label);
      }
      //optional color
      if (cat.color) {
        cols[i] = cat.color;
      }
    });
    this.catLabels = labels;
    this.colors.domain(cats).range(cols);
  }

  get categories() {
    return this.colors.domain();
  }

  get categoryColors() {
    return this.colors.range();
  }

  get categoryLabels() {
    //no mapping
    if (this.catLabels === null || this.catLabels.size === 0) {
      return this.categories;
    }
    //label or identity mapping
    return this.categories.map((c) => this.catLabels.has(c) ? this.catLabels.get(c)! : c);
  }

  getLabel(row: any, index: number) {
    //no mapping
    if (this.catLabels === null || this.catLabels.size === 0) {
      return StringColumn.prototype.getValue.call(this, row, index);
    }
    return this.getLabels(row, index).join(this.separator);
  }

  getFirstLabel(row: any, index: number) {
    const l = this.getLabels(row, index);
    return l.length > 0 ? l[0] : null;
  }

  getLabels(row: any, index: number) {
    const v = StringColumn.prototype.getValue.call(this, row, index);
    const r = v ? v.split(this.separator) : [];

    const mapToLabel = (values: string[]) => {
      if (this.catLabels === null || this.catLabels.size === 0) {
        return values;
      }
      return values.map((v) => this.catLabels.has(v) ? this.catLabels.get(v) : v);
    };
    return mapToLabel(r);
  }

  getValue(row: any, index: number) {
    const r = this.getValues(row, index);
    return r.length > 0 ? r[0] : null;
  }

  getValues(row: any, index: number): string[] {
    const v = StringColumn.prototype.getValue.call(this, row, index);
    return v ? v.split(this.separator) : [];
  }

  isMissing(row: any, index: number) {
    const v = this.getValues(row, index);
    return !v || v.length === 0;
  }

  getCategories(row: any, index: number) {
    return this.getValues(row, index);
  }

  getColor(row: any, index: number) {
    const cat = this.getValue(row, index);
    if (cat === null || cat === '') {
      return null;
    }
    return this.colors(cat);
  }

  getColors(row: any, index: number) {
    return this.getCategories(row, index).map(this.colors);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.filter = this.currentFilter;
    r.colors = {
      domain: this.colors.domain(),
      range: this.colors.range(),
      separator: this.separator
    };
    if (this.catLabels !== null && this.catLabels.size !== 0) {
      r.labels = Array.from(this.catLabels.entries());
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if ('filter' in dump) {
      const bak = dump.filter;
      if (typeof bak === 'string' || Array.isArray(bak)) {
        this.currentFilter = {filter: bak, filterMissing: false};
      } else {
        this.currentFilter = bak;
      }
    } else {
      this.currentFilter = null;
    }
    if (dump.colors) {
      this.colors.domain(dump.colors.domain).range(dump.colors.range);
    }
    if (Array.isArray(dump.labels)) {
      this.catLabels = new Map<string, string>();
      dump.labels.forEach((e: { key: string, value: string }) => this.catLabels.set(e.key, e.value));
    }
    this.separator = dump.separator || this.separator;
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  static filter(filter: ICategoricalFilter | null, category: string) {
    if (!filter) {
      return true;
    }
    if (category == null && filter.filterMissing) {
      return false;
    }
    const filterObj = filter.filter;
    if (Array.isArray(filterObj)) { //array mode
      return filterObj.indexOf(category) >= 0;
    }
    if (typeof filterObj === 'string' && filterObj.length > 0) { //search mode
      return category != null && category.toLowerCase().indexOf(filterObj.toLowerCase()) >= 0;
    }
    if (filterObj instanceof RegExp) { //regex match mode
      return category != null && filterObj.test(category);
    }
    return true;
  }

  filter(row: any, index: number): boolean {
    if (!this.isFiltered()) {
      return true;
    }
    const vs = this.getCategories(row, index);

    if (this.currentFilter!.filterMissing && vs.length === 0) {
      return false;
    }

    return vs.every((v) => CategoricalColumn.filter(this.currentFilter, v));
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: ICategoricalFilter | null) {
    if (isEqualFilter(this.currentFilter, filter)) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    const va = this.getValues(a, aIndex);
    const vb = this.getValues(b, bIndex);
    if (va.length === 0) {
      // missing
      return vb.length === 0 ? 0 : FIRST_IS_NAN;
    }
    if (vb.length === 0) {
      return FIRST_IS_NAN * -1;
    }
    //check all categories
    for (let i = 0; i < Math.min(va.length, vb.length); ++i) {
      const ci = va[i].localeCompare(vb[i]);
      if (ci !== 0) {
        return ci;
      }
    }
    //smaller length wins
    return va.length - vb.length;
  }

  group(row: any, index: number) {
    const name = this.getValue(row, index);
    if (!name) {
      return super.group(row, index);
    }
    const color = this.getColor(row, index)!;
    return {name, color};
  }

  getGroupRenderer() {
    const current = super.getGroupRenderer();
    if (current === this.desc.type && this.isGroupedBy() >= 0) {
      // still the default and the stratification criteria
      return 'catcolorshifted';
    }
    return current;
  }
}
