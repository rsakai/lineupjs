import Column from '../model/Column';
import ICellRendererFactory from './ICellRendererFactory';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {IHTMLCellRenderer, IHTMLGroupRenderer} from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {clipText, setText} from '../utils';
import {IGroup} from '../model/Group';

/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ICellRendererFactory {

  /**
   * @param textClass {string} class to append to the text elements
   * @param align {string} the text alignment: left, center, right
   */
  constructor(private readonly textClass: string = 'text', private readonly align: string = 'left') {
    this.textClass = textClass;
    this.align = align;
  }

  createDOM(col: Column): IDOMCellRenderer {
    const w = col.getVisibleWidth();
    let alignmentShift = 2;
    if (this.align === 'right') {
      alignmentShift = w - 5;
    } else if (this.align === 'center') {
      alignmentShift = w * 0.5;
    }
    return {
      template: `<div class="${this.textClass} ${this.align}"> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        setText(n, col.getLabel(d.v, d.dataIndex));
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow) => {
      const bak = ctx.textAlign;
      ctx.textAlign = this.align;
      const w = context.colWidth(col);
      let shift = 0;
      if (this.align === 'center') {
        shift = w / 2;
      } else if (this.align === 'right') {
        shift = w;
      }
      clipText(ctx, col.getLabel(d.v, d.dataIndex), shift, 0, w, context.textHints);
      ctx.textAlign = bak;
    };
  }

  createGroupSVG(col: Column, context: IDOMRenderContext): ISVGGroupRenderer {
    return {
      template: `<text class="text_center"></text>`,
      update: (n: SVGGElement, group: IGroup, rows: IDataRow[]) => {
        n.textContent = `${group.name} (${rows.length})`;
        attr(n, {
          x: col.getVisibleWidth() / 2,
          y: context.groupHeight(group) / 2
        });
      }
    };
  }

  createGroupHTML(col: Column, context: IDOMRenderContext): IHTMLGroupRenderer {
    return {
      template: `<div class="text_center"></div>`,
      update: (n: HTMLDivElement, group: IGroup, rows: IDataRow[]) => {
        n.textContent = `${group.name} (${rows.length})`;
        n.style.height = (context.groupHeight(group) / 2) + 'px';
      }
    };
  }

  createGroupCanvas(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const w = col.getVisibleWidth();
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const bak = ctx.textAlign;
      ctx.textAlign = 'center';
      const shift = w / 2;
      clipText(ctx, `${group.name} (${rows.length})`, shift, context.groupHeight(group) / 2, w, context.textHints);
      ctx.textAlign = bak;
    };
  }
}
