/*
 * Copyright 2015-2018 WorldWind Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
    '../../error/ArgumentError',
    './ColoredTile',
    './GeographicalFilter',
    './HeatMapTile',
    '../../util/ImageSource',
    './IntervalType',
    '../../geom/Location',
    '../../util/Logger',
    '../../geom/MeasuredLocation',
    '../TiledImageLayer',
    '../../geom/Sector',
    '../../util/WWUtil'
], function (ArgumentError,
             ColoredTile,
             GeographicalFilter,
             HeatMapTile,
             ImageSource,
             IntervalType,
             Location,
             Logger,
             MeasuredLocation,
             TiledImageLayer,
             Sector,
             WWUtil) {
    "use strict";

    /**
     * It represents a HeatMap Layer. The default implementation uses gradient circles as the way to display the
     * point. The intensity of the point is taken in the account. The default implementation should look just fine,
     * though it is possible to change the way the HeatMap looks via options to quite some extent.
     * @constructor
     * @augments TiledImageLayer
     * @alias HeatMapLayer
     * @param displayName {String} The display name to associate with this layer.
     * @param measuredLocations {MeasuredLocation[]} Array of the points with the measured locations provided.
     * @param usedDataStructure {String} Enumeration. If there is none provided, the default is Object based. The possible
     *  options are: ARRAY, GRID
     *  The ARRAY structure is more effective if you have less than around 50 000 points and if you work with bigger areas
     *  most of the time.
     *  The GRID structure is more effective in smaller areas and/or if there is more than 50 000 point. At around 100 000
     *  points the gain for smaller areas is up to 30% and around 10% for large areas.
     *  The previous results were obtained by generating randomly distributed 10 000, 100 000, 500 000 and 1 000 000 points
     *  across the whole globe. The first test was focused on initial load of the globe in distance big enough for the whole
     *  globe to be displayed. The second test was focused on loading of the HeatMap Tiles in the distance of 4 000 km
     *  meaning that the size of tile is quarter of the maximum sized tiles.
     */
    var HeatMapLayer = function (displayName, measuredLocations, usedDataStructure) {
        this.tileWidth = 512;
        this.tileHeight = 512;

        TiledImageLayer.call(this, new Sector(-90, 90, -180, 180), new Location(45, 45), 14, 'image/png', 'HeatMap' + WWUtil.guid(), this.tileWidth, this.tileHeight);

        this.displayName = displayName;
        usedDataStructure = usedDataStructure || "GRID";

        this._filter = new GeographicalFilter(measuredLocations, usedDataStructure);
        this._intervalType = IntervalType.CONTINUOUS;
        this._scale = ['blue', 'cyan', 'lime', 'yellow', 'red'];
        this._radius = 25;
        this._blur = 10;
        this._incrementPerIntensity = 0.025;

        this.setGradient(measuredLocations);
    };

    HeatMapLayer.prototype = Object.create(TiledImageLayer.prototype);

    Object.defineProperties(HeatMapLayer.prototype, {
        /**
         * Different types of approaches to handling the interval between min
         * and max values. Default value is Continuous.
         * @memberof HeatMapLayer.prototype
         * @type {IntervalType}
         */
        intervalType: {
            get: function () {
                return this._intervalType;
            },
            set: function (intervalType) {
                this._intervalType = intervalType;
                this.setGradient();
            }
        },

        /**
         * Array of colors representing the scale which should be used when generating the
         * layer. Default is ['blue', 'cyan', 'lime', 'yellow', 'red']
         * @memberof HeatMapLayer.prototype
         * @type {String[]}
         */
        scale: {
            get: function () {
                return this._scale;
            },
            set: function (scale) {
                this._scale = scale;
                this.setGradient();
            }
        },

        /**
         * Gradient to use for coloring of the HeatMap.
         * @memberOf HeatMapLayer.prototype
         * @type {String[]}
         */
        gradient: {
            get: function () {
                return this._gradient;
            },
            set: function (gradient) {
                this._gradient = gradient;
            }
        },

        /**
         * It is also possible to provide a function. Radius of the point to
         * be representing the intensity location. Default value is 25. The size of the radius.
         * @memberof HeatMapLayer.prototype
         * @type {Function|Number}
         */
        radius: {
            get: function () {
                return this._radius;
            },
            set: function (radius) {
                this._radius = radius;
            }
        },

        /**
         * Amount of pixels used for blur.
         * @memberof HeatMapLayer.prototype
         * @type {Number}
         */
        blur: {
            get: function () {
                return this._blur;
            },
            set: function (blur) {
                this._blur = blur;
            }
        },

        /**
         * Increment per intensity. How strong is going to be the change in
         * the intensity based on the intensity vector of the point
         * @memberof HeatMapLayer.prototype
         * @type {Number}
         */
        incrementPerIntensity: {
            get: function () {
                return this._incrementPerIntensity;
            },
            set: function (incrementPerIntensity) {
                this._incrementPerIntensity = incrementPerIntensity;
            }
        }
    });

    /**
     * It sets gradient based on the Scale and IntervalType.
     */
    HeatMapLayer.prototype.setGradient = function (data) {
        var intervalType = this.intervalType;
        var scale = this.scale;

        var gradient = {};
        if (intervalType === IntervalType.CONTINUOUS) {
            scale.forEach(function (color, index) {
                gradient[index / scale.length] = color;
            });
        } else if (intervalType === IntervalType.QUANTILES) {
            // Equal amount of pieces in each group.
            data.sort(function (item1, item2) {
                if (item1.measure < item2.measure) {
                    return -1;
                } else if (item1.measure > item2.measure) {
                    return 1;
                } else {
                    return 0;
                }
            });
            var max = data[data.length - 1].measure;
            if (data.length >= scale.length) {
                scale.forEach(function (color, index) {
                    // What is the fraction of the colors
                    var fractionDecidingTheScale = index / scale.length;
                    var pointInScale = data[Math.floor(fractionDecidingTheScale * data.length)].intensity / max;
                    gradient[pointInScale] = color;
                });
            } else {
                scale.forEach(function (color, index) {
                    gradient[index / scale.length] = color;
                });
            }
        }
        this.gradient = gradient;
    };

    /**
     * @inheritDoc
     */
    HeatMapLayer.prototype.retrieveTileImage = function (dc, tile, suppressRedraw) {
        if (this.currentRetrievals.indexOf(tile.imagePath) < 0) {
            if (this.absentResourceList.isResourceAbsent(tile.imagePath)) {
                return;
            }

            var imagePath = tile.imagePath,
                cache = dc.gpuResourceCache,
                layer = this,
                radius = this.calculateRadius(tile.sector);

            var extended = this.calculateExtendedSector(tile.sector);
            var extendedWidth = Math.ceil(extended.extensionFactor * this.tileWidth);
            var extendedHeight = Math.ceil(extended.extensionFactor * this.tileHeight);

            var data = this._filter.filter(extended.sector);

            var canvas = this.createHeatMapTile(data, {
                sector: extended.sector,

                width: this.tileWidth + 2 * extendedWidth,
                height: this.tileHeight + 2 * extendedHeight,
                radius: radius,
                blur: this.blur,

                intensityGradient: this.gradient,
                incrementPerIntensity: this.incrementPerIntensity
            }).canvas();

            var result = document.createElement('canvas');
            result.height = this.tileHeight;
            result.width = this.tileWidth;
            var dataToDraw = canvas.getContext('2d').getImageData(extendedWidth, extendedHeight, this.tileWidth, this.tileHeight);
            result.getContext('2d').putImageData(dataToDraw, 0, 0);

            var texture = layer.createTexture(dc, tile, result);
            layer.removeFromCurrentRetrievals(imagePath);

            if (texture) {
                cache.putResource(imagePath, texture, texture.size);

                layer.currentTilesInvalid = true;
                layer.absentResourceList.unmarkResourceAbsent(imagePath);

                if (!suppressRedraw) {
                    // Send an event to request a redraw.
                    var e = document.createEvent('Event');
                    e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
                    canvas.dispatchEvent(e);
                }
            }
        }
    };

    /**
     * It returns radius used to draw the points relevant to the HeatMap.
     * @protected
     * @param sector {Sector} Sector to be used for the calculation of the radius.
     * @return {Number} Pixels representing the radius.
     */
    HeatMapLayer.prototype.calculateRadius = function (sector) {
        var radius = this.radius;

        if (typeof this.radius === 'function') {
            radius = this.radius(sector, this.tileWidth, this.tileHeight);
        }

        return radius;
    };

    /**
     * This method calculates the new sector for which the data will be filtered and which will be drawn on the tile.
     * The standard version just applies extension factor to the difference between minimum and maximum.
     * This is useful to overwrite if you have specifically structured data and you know that for certain levels of detail,
     * you won't need the bigger extension or knows that for certain areas and level of detail you will need the
     * bigger extension area.
     * @protected
     * @param sector {Sector} Sector to use as basis for the extension.
     * @return {Object} .sector New extended sector.
     *                  .extensionFactor The factor by which the area is changed.
     */
    HeatMapLayer.prototype.calculateExtendedSector = function (sector) {
        var extensionFactor = 1;
        var latitudeChange = (sector.maxLatitude - sector.minLatitude) * extensionFactor;
        var longitudeChange = (sector.maxLongitude - sector.minLongitude) * extensionFactor;
        return {
            sector: new Sector(
                sector.minLatitude - latitudeChange,
                sector.maxLatitude + latitudeChange,
                sector.minLongitude - longitudeChange,
                sector.maxLongitude + longitudeChange
            ),
            extensionFactor: extensionFactor
        };
    };

    /**
     * Overwrite this method if you want to use a custom implementation of tile used for displaying the data.
     * @protected
     * @param data {Object[]} Array of information constituting points in the map.
     * @param options {Object}
     * @param options.sector {Sector} Sector with the geographical information for tile representation.
     * @param options.width {Number} Width of the Canvas to be created in pixels.
     * @param options.height {Number} Height of the Canvas to be created in pixels.
     * @param options.radius {Number} Radius of the data point in pixels.
     * @param options.blur {Number} Blur of the HeatMap element in the pixels.
     * @param options.incrementPerIntensity {Number}
     * @return {HeatMapTile} Implementation of the HeatMapTile used for this instance of the layer.
     */
    HeatMapLayer.prototype.createHeatMapTile = function (data, options) {
        return new ColoredTile(data, options);
    };

    return HeatMapLayer;
});