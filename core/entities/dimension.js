import {Point} from './point.js';
import {Utils} from '../lib/utils.js';
import {Block} from './block.js';
import {Text} from './text.js';
import {Line} from './line.js';
// import {Intersection} from '../lib/intersect.js';
// import {Colours} from '../lib/colours.js';

export class Dimension {
  constructor(data) {
    // Define Properties         //Associated DXF Value
    this.type = 'Dimension';
    this.family = 'Geometry';
    this.minPoints = 3;
    this.showPreview = true; // show preview of item as its being created
    this.helper_geometry = false; // If true a line will be drawn between points when defining geometry
    this.points = [];

    this.blockName = '';
    this.block = new Block();
    this.text = new Text();
    this.dimType = 0;
    this.leaderLength = 0; // 40: Leader length for radius and diameter dimensions
    this.angle = 0; // 50 Angle of rotated, horizontal or vertical linear dimensions

    this.colour = 'BYLAYER';
    this.layer = '0';
    this.styleName = 'STANDARD';


    // this.baselineOffset = 5 //1.125;

    if (data) {
      // console.log("Dimnension Data:", data)

      if (data.points) {
        this.points = data.points;
      }

      if (data.blockName) {
        this.blockName = data.blockName;
      }

      if (data.dimType) {
        this.dimType = data.dimType;
      }

      if (data.leaderLength) {
        this.leaderLength = data.leaderLength;
      }

      if (data.angle) {
        this.angle = data.angle;
      }

      if (data.colour) {
        this.colour = data.colour;
      }

      if (data.layer) {
        this.layer = data.layer;
      }

      if (data.styleName) {
        this.styleName = data.styleName;
      }
    }
  }

  static register() {
    const command = {command: 'Dimension'}; // , shortcut: 'DIM', type: 'Entity'};
    return command;
  }

  prompt(core) {
    const num = core.scene.inputArray.length;
    const expectedType = [];
    let reset = false;
    let action = false;
    const prompt = [];

    // console.log('dimension inputArray: ', inputArray);
    // console.log('type: ', typeof core.scene.inputArray[num - 1]);

    expectedType[0] = ['undefined'];
    prompt[0] = 'Pick start point:'; // TODO: allow selecting entites, line / arc / circle

    expectedType[1] = ['object'];
    prompt[1] = 'Pick second point:';

    expectedType[2] = ['object'];
    prompt[2] = 'Position extension:';

    expectedType[3] = ['object'];
    prompt[3] = prompt[1];

    const validInput = expectedType[num].includes(typeof core.scene.inputArray[num - 1]);

    if (!validInput || num > this.minPoints) {
      core.scene.inputArray.pop();
    }

    if (core.scene.inputArray.length === this.minPoints) {
      action = true;
      reset = true;
    }

    return {promptInput: prompt[core.scene.inputArray.length], resetBool: reset, actionBool: action, validInput: validInput};
  }

  getBaseDimType() {
    // 0 = Rotated, horizontal, or vertical
    // 1 = Aligned
    // 2 = Angular
    // 3 = Diameter
    // 4 = Radius
    // 5 = Angular 3-point
    // 6 = Ordinate
    // 64 = Ordinate type. This is a bit value (bit 7) used only with integer value 6. If set, ordinate is X-type; if not set, ordinate is Y-type
    // 128 = This is a bit value (bit 8) added to the other group 70 values if the dimension text has been positioned at a user-defined location rather than at the default location

    let type = this.dimType;

    if (this.dimType > 64 && this.dimType < 128) {
      type = 6;
    }

    // if the value is over 128 subtract 128 to get the base type
    if (this.dimType > 128) {
      type = this.dimType - 128;
    }

    return type;
  }

  length() {
    const A = (this.points[0].x - this.points[1].x);
    const B = (this.points[0].y - this.points[1].y);
    const ASQ = Math.pow(A, 2);
    const BSQ = Math.pow(B, 2);
    const dist = Math.sqrt(ASQ + BSQ);

    return dist;
  }


  getExtensionPoints() {
    // return p1 and p2 for the dimension arrows

    const Pt1 = this.points[0];
    const Pt2 = this.points[1];
    const Pt3 = this.points[2];

    let dimension = 0;

    // invalid points
    if (Pt1.isSame(Pt2) || Pt1.isSame(Pt3) || Pt2.isSame(Pt3)) {
      return null; // [Pt1, Pt2, Pt1.midPoint(Pt2)]
    }

    // extension points
    let P1e = new Point(); // this.points[0];
    let P2e = new Point(); // this.points[1];
    let P3e = new Point();

    const pntPerp = Pt3.perpendicular(Pt1, Pt2);

    if (pntPerp !== null) {
      const projectionAngle = pntPerp.angle(Pt3);
      const distance = Pt3.distance(pntPerp);
      P1e = Pt1.project(projectionAngle, distance);
      P2e = Pt2.project(projectionAngle, distance);
      dimension = Pt1.distance(Pt2);
    } else {
      const dx = Pt2.x - Pt1.x;
      const dy = Pt2.y - Pt1.y;

      const iX = ((Math.abs(Pt3.x - Pt1.x) + Math.abs(Pt2.x - Pt3.x)) - Math.abs(dx));
      const iY = ((Math.abs(Pt3.y - Pt1.y) + Math.abs(Pt2.y - Pt3.y)) - Math.abs(dy));

      if (iX > iY && dy !== 0) {
        // console.log("X Direction")
        P1e.x = Pt3.x;
        P1e.y = Pt1.y;
        P2e.x = Pt3.x;
        P2e.y = Pt2.y;
        dimension = dy;
      } else if (iX < iY && dx !== 0) {
        // console.log("Y Direction")
        P1e.x = Pt1.x;
        P1e.y = Pt3.y;
        P2e.x = Pt2.x;
        P2e.y = Pt3.y;
        dimension = dx;
      }
    }

    const midPoint = P1e.midPoint(P2e);
    P3e = midPoint; // TODO: Offset text from baseline
    const dimAngle = P1e.angle(P2e);

    // return [P1e, P2e, P3e]
    return {startPoint: P1e, endPoint: P2e, textPoint: P3e, dimension: dimension, dimAngle: dimAngle};
  }


  getBoundingRect() {
    extPnts = this.getExtensionPoints();

    if (!extPnts) {
      return null;
    }

    const xmin = Math.min(this.points[0].x, this.points[1].x, extPnts.startPoint.x, extPnts.endPoint.x);
    const xmax = Math.max(this.points[0].x, this.points[1].x, extPnts.startPoint.x, extPnts.endPoint.x);
    const ymin = Math.min(this.points[0].y, this.points[1].y, extPnts.startPoint.y, extPnts.endPoint.y);
    const ymax = Math.max(this.points[0].y, this.points[1].y, extPnts.startPoint.y, extPnts.endPoint.y);

    width = xmax - xmin;
    height = ymax - ymin;

    const rect = {width: width, height: height, x: xmin, y: ymin};

    return rect;
  }

  getDimensionPoints() {
    // Return the points required to draw the dimension
    // Pt1 = Dimension Start point
    // Pt2 = Dimension End Point
    // Pt3 = Baseline Extension Point
    // Pt4 = Text Center Point

    points = [];

    switch (this.getBaseDimType()) {
      case 0:
        // console.log('Dimension.getDimensionPoints() - Rotated, horizontal, or vertical Dimension Type Not Handled');
        break;
      case 1:
        // console.log('Dimension.getDimensionPoints() - Aligned Dimension Type Not Handled');
        break;
      case 2:
        // console.log('Dimension.getDimensionPoints() - Angular Dimension Type Not Handled');
        break;
      case 3:
        // console.log('Dimension.getDimensionPoints() - Diameter Dimension Type Not Handled');
        break;
      case 4:
        // console.log('Dimension.getDimensionPoints() - Radius Dimension Type Not Handled');
        break;
      case 5:
        // console.log('Dimension.getDimensionPoints() - Anglar 3-Point Dimension Type Not Handled');
        break;
      case 6:
        // console.log('Dimension.getDimensionPoints() - Ordinate Dimension Type Not Handled');
        break;
    }

    return points;
  }


  getBlockEntities() {
    const entities = [];
    const extPnts = this.getExtensionPoints();

    if (!extPnts) {
      return entities;
    }

    this.text.points = [extPnts.textPoint];
    this.text.setRotation(extPnts.dimAngle);

    if (typeof (extPnts.dimension) === 'number') {
      this.text.string = Math.abs(extPnts.dimension.toFixed(2)).toString(); // TODO: Honor the precision from the style
    }

    if (typeof (extPnts.dimAngle) === 'number') {
      const angle = Utils.radians2degrees(extPnts.dimAngle);
      // console.log('text angle', angle);
      this.text.rotation = angle; // TODO: Honor the style
    }

    switch (this.getBaseDimType()) {
      case 0:
        const line1 = new Line({points: [this.points[0], extPnts.startPoint]});
        const line2 = new Line({points: [this.points[1], extPnts.endPoint]});
        const baseLine = new Line({points: [extPnts.startPoint, extPnts.endPoint]});

        entities.push(line1, line2, baseLine);

        // drawArrowHead(extPnts.startPoint, extPnts.startPoint.angle(extPnts.endPoint), this.text.height / 2)
        // drawArrowHead(extPnts.endPoint, extPnts.endPoint.angle(extPnts.startPoint), this.text.height / 2)
        break;

      case 1:
        // console.log('Dimension Type Not Handled');
        break;
      case 2:
        // console.log('Aligned Dimension Type Not Handled');
        break;
      case 3:
        // console.log('Diameter Dimension Type Not Handled');
        // console.log("Diameter Dimension Type Not Handled")
        // line1 = new Line({ points: [this.points[3], this.points[4]] });
        // this.block.addItem(line1);
        // drawArrowHead(this.points[3], this.points[3].angle(this.points[4]), this.text.height / 2)
        // drawArrowHead(this.points[4], this.points[4].angle(this.points[3]), this.text.height / 2)
        break;
      case 4:
        // console.log('Radius Dimension Type Not Handled');
        break;
      case 5:
        // console.log('Anglar 3-Point Dimension Type Not Handled');
        break;
      case 6:
        // console.log('Ordinate Dimension Type Not Handled');
        break;
    }

    return entities;
  }

  draw(ctx, scale, core) {
    // const rect = this.getBoundingRect();

    if (!core.layerManager.layerVisible(this.layer)) {
      return;
    }

    const entities = this.getBlockEntities();

    if (entities) {
      this.block.clearItems();
      entities.forEach((element) => {
        this.block.addItem(element);
      });

      this.block.addItem(this.text);
    }

    this.block.draw(ctx, scale, core);
    /*
    function drawArrowHead(point, angle, height) {
      // console.log("arrow head height:", height)
      triangleWidth = height;
      triangleHeight = height * 1.5;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      p1 = new Point(point.x + triangleWidth / 2, point.y + triangleHeight);
      p2 = new Point(point.x + -triangleWidth / 2, point.y + triangleHeight);
      angle = angle - Math.PI / 2;
      p1 = p1.rotate(point, angle);
      p2 = p2.rotate(point, angle);

      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      // ctx.fillStyle = this.colour;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    */

    // ////////////////////////////////////////
    // draw test point for perpendicular
    /*
        pnt = this.points[2].perpendicular(this.points[0], this.points[1])
        if (pnt) {
            ctx.moveTo(pnt.x, pnt.y);
            ctx.arc(pnt.x, pnt.y, 5 / scale, radians2degrees(0), radians2degrees(360), false);
            ctx.stroke()
        }
        */
    // ////////////////////////////////////////

    // Draw Bounding Box to test the getBoundingRect() /
    /*
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1 / scale;
        ctx.beginPath()
        ctx.moveTo(rect.x, rect.y);
        ctx.lineTo(rect.x + rect.width, rect.y);
        ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
        ctx.lineTo(rect.x, rect.y + rect.height);
        ctx.lineTo(rect.x, rect.y);
        ctx.stroke()
        */
    // ////////////////////////////////////////
  }

  dxf() {
    const dxfitem = '';
    const data = dxfitem.concat(
        '0',
        '\n', 'DIMENSION',
        '\n', '8', // LAYERNAME
        '\n', this.layer,
        '\n', '2', // BLOCKNAME
        '\n', this.blockName,
        '\n', '10', // X - DEFINITION / ARROW POINT
        '\n', this.points[0].x,
        '\n', '20', // Y - DEFINITION / ARROW POINT
        '\n', this.points[0].y,
        '\n', '30', // Z - DEFINITION / ARROW POINT
        '\n', '0.0',
        '\n', '11', // X - TEXT MIDPOINT
        '\n', this.points[2].x,
        '\n', '21', // Y - TEXT MIDPOINT
        '\n', this.points[2].y, // Y
        '\n', '31', // Z - TEXT MIDPOINT
        '\n', '0.0',
        '\n', '70', // DIMENSION TYPE
        '\n', 0, // this.dimType,
        // 0 = Rotated, horizontal, or vertical
        // 1 = Aligned
        // 2 = Angular
        // 3 = Diameter
        // 4 = Radius
        '\n', '13', // X - START POINT OF FIRST EXTENSION LINE
        '\n', this.points[0].x,
        '\n', '23', // Y - START POINT OF FIRST EXTENSION LINE
        '\n', this.points[0].y, // Y
        '\n', '33', // Z - START POINT OF FIRST EXTENSION LINE
        '\n', '0.0',
        '\n', '14', // X - START POINT OF SECOND EXTENSION LINE
        '\n', this.points[1].x,
        '\n', '24', // Y - START POINT OF SECOND EXTENSION LINE
        '\n', this.points[1].y, // Y
        '\n', '34', // Z - START POINT OF SECOND EXTENSION LINE
        '\n', '0.0',
        '\n', '3', // DIMENSION STYLE
        '\n', 'STANDARD',

    );
    // console.log(" line.js - DXF Data:" + data)
    return data;
  }

  snaps(mousePoint, delta, core) {
    const snaps = [];
    const extPnts = this.getExtensionPoints();
    snaps.push(extPnts.startPoint);
    snaps.push(extPnts.endPoint);
    snaps.push(extPnts.textPoint);
    snaps.push(this.points[0]);
    snaps.push(this.points[1]);

    return snaps;
  }

  closestPoint(P) {
    return this.block.closestPoint(P);
  }

  extremes() {
    return this.block.extremes();
  }

  within(selectionExtremes, core) {
    return this.block.within(selectionExtremes, core);
  }

  intersectPoints() {
    return this.block.intersectPoints();
  }

  touched(selectionExtremes, core) {
    return this.block.touched(selectionExtremes, core);
  }
}
