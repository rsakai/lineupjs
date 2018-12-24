import Column from './Column';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

export {isSupportType, Category, SupportType, SortByDefault, Categories, toolbar, dialogAddons, categoryOfDesc, categoryOf, IColumnCategory, getSortType, isSortingAscByDefault} from './annotations';
export {isMissingValue, isUnknown, FIRST_IS_NAN, FIRST_IS_MISSING, missingGroup} from './missing';
export * from './interfaces';
export * from './ICategoricalColumn';
export * from './INumberColumn';
export * from './IDateColumn';
export * from './IArrayColumn';
export * from './MappingFunction';

export {default as ActionColumn} from './ActionColumn';
export * from './ActionColumn';
export {default as AggregateGroupColumn, createAggregateDesc, IAggregateGroupColumnDesc} from './AggregateGroupColumn';
export {default as AnnotateColumn} from './AnnotateColumn';
export {default as ArrayColumn, IArrayColumnDesc} from './ArrayColumn';
export {default as BooleanColumn, IBooleanColumnDesc, IBooleanDesc} from './BooleanColumn';
export * from './BooleansColumn';
export {default as BooleansColumn} from './BooleansColumn';
export {default as BoxPlotColumn, IBoxPlotColumnDesc, IBoxPlotDesc} from './BoxPlotColumn';
export {default as CategoricalColumn} from './CategoricalColumn';
export {default as CategoricalMapColumn, ICategoricalMapColumnDesc} from './CategoricalMapColumn';
export {default as CategoricalsColumn, ICategoricalsColumnDesc} from './CategoricalsColumn';
export {default, default as Column, IFlatColumn, IColumnParent, IColumnMetaData, IColumnDesc, ICompareValue} from './Column';
export {default as CompositeColumn, isMultiLevelColumn, IMultiLevelColumn} from './CompositeColumn';
export * from './CompositeNumberColumn';
export {default as CompositeNumberColumn} from './CompositeNumberColumn';
export {default as DateColumn, IDateColumnDesc} from './DateColumn';
export {default as DatesMapColumn, IDateMapColumnDesc} from './DatesMapColumn';
export {default as DatesColumn, IDatesDesc, IDatesColumnDesc, EDateSort} from './DatesColumn';
export * from './DummyColumn';
export {default as DummyColumn} from './DummyColumn';
export {default as GroupColumn, createGroupDesc, EGroupSortMethod} from './GroupColumn';
export {default as HierarchyColumn, ICategoryNode, IPartialCategoryNode, IHierarchyColumnDesc, IHierarchyDesc, ICategoryInternalNode, ICutOffNode, resolveInnerNodes, isHierarchical, deriveHierarchy} from './HierarchyColumn';
export * from './ImpositionBoxPlotColumn';
export {default as ImpositionBoxPlotColumn} from './ImpositionBoxPlotColumn';
export * from './ImpositionCompositeColumn';
export {default as ImpositionCompositeColumn} from './ImpositionCompositeColumn';
export * from './ImpositionCompositesColumn';
export {default as ImpositionCompositesColumn} from './ImpositionCompositesColumn';
export * from './MapColumn';
export {default as MapColumn} from './MapColumn';
export {default as MultiLevelCompositeColumn} from './MultiLevelCompositeColumn';
export * from './NestedColumn';
export {default as NestedColumn} from './NestedColumn';
export {default as NumberColumn, INumberColumnDesc} from './NumberColumn';
export {default as NumberMapColumn, INumberMapDesc, INumberMapColumnDesc} from './NumberMapColumn';
export {default as NumbersColumn, INumbersDesc, INumbersColumnDesc} from './NumbersColumn';
export {default as OrdinalColumn, ICategoricalNumberColumnDesc} from './OrdinalColumn';
export * from './RankColumn';
export {default as RankColumn} from './RankColumn';
export {default as Ranking, ISortCriteria, EDirtyReason} from './Ranking';
export {default as ReduceColumn, createReduceDesc, IReduceDesc, IReduceColumnDesc} from './ReduceColumn';
export {default as ScriptColumn, createScriptDesc, IScriptDesc, IScriptColumnDesc} from './ScriptColumn';
export {default as SelectionColumn, createSelectionDesc, ISelectionColumnDesc} from './SelectionColumn';
export {default as SetColumn, ISetColumnDesc, ISetDesc} from './SetColumn';
export {default as StackColumn, createStackDesc} from './StackColumn';
export {default as StringColumn, EAlignment, IStringDesc, IStringColumnDesc} from './StringColumn';
export * from './StringMapColumn';
export {default as StringMapColumn} from './StringMapColumn';
export * from './StringsColumn';
export {default as StringsColumn} from './StringsColumn';
export {default as ValueColumn, IValueColumnDesc} from './ValueColumn';
export {default as LinkColumn, ILinkDesc, ILinkColumnDesc, ILink} from './LinkColumn';
export * from './LinkMapColumn';
export {default as LinkMapColumn} from './LinkMapColumn';
export * from './LinksColumn';
export {default as LinksColumn} from './LinksColumn';


/**
 * defines a new column type
 * @param name
 * @param functions
 * @returns {CustomColumn}
 */
export function defineColumn<T>(name: string, functions: any = {}): typeof Column {
  class CustomColumn extends ValueColumn<T> {
    constructor(id: string, desc: IValueColumnDesc<T>, ...args: any[]) {
      super(id, desc);
      if (typeof (this.init) === 'function') {
        this.init(id, desc, ...args);
      }
    }

    init(..._args: any[]) {
      // dummy
    }
  }

  CustomColumn.prototype.toString = () => name;
  CustomColumn.prototype = Object.assign(CustomColumn.prototype, functions);

  return CustomColumn;
}
