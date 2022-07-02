/**
 * Cesium - https://github.com/CesiumGS/cesium
 *
 * Copyright 2011-2020 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

define(['./defaultValue-81eec7ed', './Matrix2-e0921750', './arrayRemoveDuplicates-9877adc7', './BoundingRectangle-9ce149e2', './Transforms-38070b06', './ComponentDatatype-0f8fc942', './PolylineVolumeGeometryLibrary-0d7f2da5', './RuntimeError-8952249c', './GeometryAttribute-0fe2ec20', './GeometryAttributes-32b29525', './GeometryPipeline-8ec6816a', './IndexDatatype-2261ba8d', './PolygonPipeline-4229a1ef', './VertexFormat-7df34ea5', './_commonjsHelpers-3aae1032-26891ab7', './combine-3c023bda', './WebGLConstants-508b9636', './EllipsoidTangentPlane-19768649', './AxisAlignedBoundingBox-982e50b2', './IntersectionTests-12725781', './Plane-e7da25b6', './PolylinePipeline-ea70d5a8', './EllipsoidGeodesic-ca8d04b3', './EllipsoidRhumbLine-ac050b55', './AttributeCompression-a65cf082', './EncodedCartesian3-4e052475'], (function (defaultValue, Matrix2, arrayRemoveDuplicates, BoundingRectangle, Transforms, ComponentDatatype, PolylineVolumeGeometryLibrary, RuntimeError, GeometryAttribute, GeometryAttributes, GeometryPipeline, IndexDatatype, PolygonPipeline, VertexFormat, _commonjsHelpers3aae1032, combine, WebGLConstants, EllipsoidTangentPlane, AxisAlignedBoundingBox, IntersectionTests, Plane, PolylinePipeline, EllipsoidGeodesic, EllipsoidRhumbLine, AttributeCompression, EncodedCartesian3) { 'use strict';

  function computeAttributes(
    combinedPositions,
    shape,
    boundingRectangle,
    vertexFormat
  ) {
    const attributes = new GeometryAttributes.GeometryAttributes();
    if (vertexFormat.position) {
      attributes.position = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: combinedPositions,
      });
    }
    const shapeLength = shape.length;
    const vertexCount = combinedPositions.length / 3;
    const length = (vertexCount - shapeLength * 2) / (shapeLength * 2);
    const firstEndIndices = PolygonPipeline.PolygonPipeline.triangulate(shape);

    const indicesCount =
      (length - 1) * shapeLength * 6 + firstEndIndices.length * 2;
    const indices = IndexDatatype.IndexDatatype.createTypedArray(vertexCount, indicesCount);
    let i, j;
    let ll, ul, ur, lr;
    const offset = shapeLength * 2;
    let index = 0;
    for (i = 0; i < length - 1; i++) {
      for (j = 0; j < shapeLength - 1; j++) {
        ll = j * 2 + i * shapeLength * 2;
        lr = ll + offset;
        ul = ll + 1;
        ur = ul + offset;

        indices[index++] = ul;
        indices[index++] = ll;
        indices[index++] = ur;
        indices[index++] = ur;
        indices[index++] = ll;
        indices[index++] = lr;
      }
      ll = shapeLength * 2 - 2 + i * shapeLength * 2;
      ul = ll + 1;
      ur = ul + offset;
      lr = ll + offset;

      indices[index++] = ul;
      indices[index++] = ll;
      indices[index++] = ur;
      indices[index++] = ur;
      indices[index++] = ll;
      indices[index++] = lr;
    }

    if (vertexFormat.st || vertexFormat.tangent || vertexFormat.bitangent) {
      // st required for tangent/bitangent calculation
      const st = new Float32Array(vertexCount * 2);
      const lengthSt = 1 / (length - 1);
      const heightSt = 1 / boundingRectangle.height;
      const heightOffset = boundingRectangle.height / 2;
      let s, t;
      let stindex = 0;
      for (i = 0; i < length; i++) {
        s = i * lengthSt;
        t = heightSt * (shape[0].y + heightOffset);
        st[stindex++] = s;
        st[stindex++] = t;
        for (j = 1; j < shapeLength; j++) {
          t = heightSt * (shape[j].y + heightOffset);
          st[stindex++] = s;
          st[stindex++] = t;
          st[stindex++] = s;
          st[stindex++] = t;
        }
        t = heightSt * (shape[0].y + heightOffset);
        st[stindex++] = s;
        st[stindex++] = t;
      }
      for (j = 0; j < shapeLength; j++) {
        s = 0;
        t = heightSt * (shape[j].y + heightOffset);
        st[stindex++] = s;
        st[stindex++] = t;
      }
      for (j = 0; j < shapeLength; j++) {
        s = (length - 1) * lengthSt;
        t = heightSt * (shape[j].y + heightOffset);
        st[stindex++] = s;
        st[stindex++] = t;
      }

      attributes.st = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: new Float32Array(st),
      });
    }

    const endOffset = vertexCount - shapeLength * 2;
    for (i = 0; i < firstEndIndices.length; i += 3) {
      const v0 = firstEndIndices[i] + endOffset;
      const v1 = firstEndIndices[i + 1] + endOffset;
      const v2 = firstEndIndices[i + 2] + endOffset;

      indices[index++] = v0;
      indices[index++] = v1;
      indices[index++] = v2;
      indices[index++] = v2 + shapeLength;
      indices[index++] = v1 + shapeLength;
      indices[index++] = v0 + shapeLength;
    }

    let geometry = new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      boundingSphere: Transforms.BoundingSphere.fromVertices(combinedPositions),
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
    });

    if (vertexFormat.normal) {
      geometry = GeometryPipeline.GeometryPipeline.computeNormal(geometry);
    }

    if (vertexFormat.tangent || vertexFormat.bitangent) {
      try {
        geometry = GeometryPipeline.GeometryPipeline.computeTangentAndBitangent(geometry);
      } catch (e) {
        PolylineVolumeGeometryLibrary.oneTimeWarning(
          "polyline-volume-tangent-bitangent",
          "Unable to compute tangents and bitangents for polyline volume geometry"
        );
        //TODO https://github.com/CesiumGS/cesium/issues/3609
      }

      if (!vertexFormat.tangent) {
        geometry.attributes.tangent = undefined;
      }
      if (!vertexFormat.bitangent) {
        geometry.attributes.bitangent = undefined;
      }
      if (!vertexFormat.st) {
        geometry.attributes.st = undefined;
      }
    }

    return geometry;
  }

  /**
   * A description of a polyline with a volume (a 2D shape extruded along a polyline).
   *
   * @alias PolylineVolumeGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.polylinePositions An array of {@link Cartesian3} positions that define the center of the polyline volume.
   * @param {Cartesian2[]} options.shapePositions An array of {@link Cartesian2} positions that define the shape to be extruded along the polyline
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
   *
   * @see PolylineVolumeGeometry#createGeometry
   *
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Polyline%20Volume.html|Cesium Sandcastle Polyline Volume Demo}
   *
   * @example
   * function computeCircle(radius) {
   *   const positions = [];
   *   for (let i = 0; i < 360; i++) {
   *     const radians = Cesium.Math.toRadians(i);
   *     positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
   *   }
   *   return positions;
   * }
   *
   * const volume = new Cesium.PolylineVolumeGeometry({
   *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY,
   *   polylinePositions : Cesium.Cartesian3.fromDegreesArray([
   *     -72.0, 40.0,
   *     -70.0, 35.0
   *   ]),
   *   shapePositions : computeCircle(100000.0)
   * });
   */
  function PolylineVolumeGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);
    const positions = options.polylinePositions;
    const shape = options.shapePositions;

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(positions)) {
      throw new RuntimeError.DeveloperError("options.polylinePositions is required.");
    }
    if (!defaultValue.defined(shape)) {
      throw new RuntimeError.DeveloperError("options.shapePositions is required.");
    }
    //>>includeEnd('debug');

    this._positions = positions;
    this._shape = shape;
    this._ellipsoid = Matrix2.Ellipsoid.clone(
      defaultValue.defaultValue(options.ellipsoid, Matrix2.Ellipsoid.WGS84)
    );
    this._cornerType = defaultValue.defaultValue(options.cornerType, PolylineVolumeGeometryLibrary.CornerType.ROUNDED);
    this._vertexFormat = VertexFormat.VertexFormat.clone(
      defaultValue.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT)
    );
    this._granularity = defaultValue.defaultValue(
      options.granularity,
      ComponentDatatype.CesiumMath.RADIANS_PER_DEGREE
    );
    this._workerName = "createPolylineVolumeGeometry";

    let numComponents = 1 + positions.length * Matrix2.Cartesian3.packedLength;
    numComponents += 1 + shape.length * Matrix2.Cartesian2.packedLength;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength =
      numComponents + Matrix2.Ellipsoid.packedLength + VertexFormat.VertexFormat.packedLength + 2;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PolylineVolumeGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  PolylineVolumeGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(value)) {
      throw new RuntimeError.DeveloperError("value is required");
    }
    if (!defaultValue.defined(array)) {
      throw new RuntimeError.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    let i;

    const positions = value._positions;
    let length = positions.length;
    array[startingIndex++] = length;

    for (i = 0; i < length; ++i, startingIndex += Matrix2.Cartesian3.packedLength) {
      Matrix2.Cartesian3.pack(positions[i], array, startingIndex);
    }

    const shape = value._shape;
    length = shape.length;
    array[startingIndex++] = length;

    for (i = 0; i < length; ++i, startingIndex += Matrix2.Cartesian2.packedLength) {
      Matrix2.Cartesian2.pack(shape[i], array, startingIndex);
    }

    Matrix2.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Matrix2.Ellipsoid.packedLength;

    VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);
    startingIndex += VertexFormat.VertexFormat.packedLength;

    array[startingIndex++] = value._cornerType;
    array[startingIndex] = value._granularity;

    return array;
  };

  const scratchEllipsoid = Matrix2.Ellipsoid.clone(Matrix2.Ellipsoid.UNIT_SPHERE);
  const scratchVertexFormat = new VertexFormat.VertexFormat();
  const scratchOptions = {
    polylinePositions: undefined,
    shapePositions: undefined,
    ellipsoid: scratchEllipsoid,
    vertexFormat: scratchVertexFormat,
    cornerType: undefined,
    granularity: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PolylineVolumeGeometry} [result] The object into which to store the result.
   * @returns {PolylineVolumeGeometry} The modified result parameter or a new PolylineVolumeGeometry instance if one was not provided.
   */
  PolylineVolumeGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(array)) {
      throw new RuntimeError.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    let i;

    let length = array[startingIndex++];
    const positions = new Array(length);

    for (i = 0; i < length; ++i, startingIndex += Matrix2.Cartesian3.packedLength) {
      positions[i] = Matrix2.Cartesian3.unpack(array, startingIndex);
    }

    length = array[startingIndex++];
    const shape = new Array(length);

    for (i = 0; i < length; ++i, startingIndex += Matrix2.Cartesian2.packedLength) {
      shape[i] = Matrix2.Cartesian2.unpack(array, startingIndex);
    }

    const ellipsoid = Matrix2.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Matrix2.Ellipsoid.packedLength;

    const vertexFormat = VertexFormat.VertexFormat.unpack(
      array,
      startingIndex,
      scratchVertexFormat
    );
    startingIndex += VertexFormat.VertexFormat.packedLength;

    const cornerType = array[startingIndex++];
    const granularity = array[startingIndex];

    if (!defaultValue.defined(result)) {
      scratchOptions.polylinePositions = positions;
      scratchOptions.shapePositions = shape;
      scratchOptions.cornerType = cornerType;
      scratchOptions.granularity = granularity;
      return new PolylineVolumeGeometry(scratchOptions);
    }

    result._positions = positions;
    result._shape = shape;
    result._ellipsoid = Matrix2.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);
    result._cornerType = cornerType;
    result._granularity = granularity;

    return result;
  };

  const brScratch = new BoundingRectangle.BoundingRectangle();

  /**
   * Computes the geometric representation of a polyline with a volume, including its vertices, indices, and a bounding sphere.
   *
   * @param {PolylineVolumeGeometry} polylineVolumeGeometry A description of the polyline volume.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  PolylineVolumeGeometry.createGeometry = function (polylineVolumeGeometry) {
    const positions = polylineVolumeGeometry._positions;
    const cleanPositions = arrayRemoveDuplicates.arrayRemoveDuplicates(
      positions,
      Matrix2.Cartesian3.equalsEpsilon
    );
    let shape2D = polylineVolumeGeometry._shape;
    shape2D = PolylineVolumeGeometryLibrary.PolylineVolumeGeometryLibrary.removeDuplicatesFromShape(shape2D);

    if (cleanPositions.length < 2 || shape2D.length < 3) {
      return undefined;
    }

    if (
      PolygonPipeline.PolygonPipeline.computeWindingOrder2D(shape2D) === PolygonPipeline.WindingOrder.CLOCKWISE
    ) {
      shape2D.reverse();
    }
    const boundingRectangle = BoundingRectangle.BoundingRectangle.fromPoints(shape2D, brScratch);

    const computedPositions = PolylineVolumeGeometryLibrary.PolylineVolumeGeometryLibrary.computePositions(
      cleanPositions,
      shape2D,
      boundingRectangle,
      polylineVolumeGeometry,
      true
    );
    return computeAttributes(
      computedPositions,
      shape2D,
      boundingRectangle,
      polylineVolumeGeometry._vertexFormat
    );
  };

  function createPolylineVolumeGeometry(polylineVolumeGeometry, offset) {
    if (defaultValue.defined(offset)) {
      polylineVolumeGeometry = PolylineVolumeGeometry.unpack(
        polylineVolumeGeometry,
        offset
      );
    }
    polylineVolumeGeometry._ellipsoid = Matrix2.Ellipsoid.clone(
      polylineVolumeGeometry._ellipsoid
    );
    return PolylineVolumeGeometry.createGeometry(polylineVolumeGeometry);
  }

  return createPolylineVolumeGeometry;

}));
//# sourceMappingURL=createPolylineVolumeGeometry.js.map
