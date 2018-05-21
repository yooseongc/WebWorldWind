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
    '../../util/Logger',
    '../../geom/MeasuredLocation',
    '../../geom/Sector'
], function (ArgumentError,
             Logger,
             MeasuredLocation,
             Sector) {
    /**
     * It takes a data and based on the type of the provided data and the provided filter area it returns relevant data.
     * @constructor
     */
    var GeographicalFilter = function (data, dataStructure) {
        if(dataStructure !== 'GRID' && dataStructure !== 'ARRAY') {
            throw new ArgumentError(
                Logger.logMessage(Logger.LEVEL_SEVERE, 'GeographicalFilter', 'filter', 'The provided data structure was incorrect. Use either GRID or ARRAY.')
            );
        }

        if(dataStructure === 'GRID') {
            this._data = this.createGrid(data);
        } else {
            this._data = data;
        }

        this._dataStructure = dataStructure;
    };

    /**
     * It creates grid for the data to be displayed on the globe.
     * @private
     * @param measuredLocations {MeasuredLocation[]} All the data.
     */
    GeographicalFilter.prototype.createGrid = function(measuredLocations) {
        var data = {};
        var lat, lon;
        for (lat = -90; lat <= 90; lat++) {
            data[lat] = {};
            for (lon = -180; lon <= 180; lon++) {
                data[lat][lon] = [];
            }
        }

        var latitude, longitude;
        measuredLocations.forEach(function (measured) {
            latitude = Math.floor(measured.latitude);
            longitude = Math.floor(measured.longitude);
            data[latitude][longitude].push(measured);
        });

        return data;
    };

    /**
     * It filters the data kept in this filter based on the Sector. All the data are moved so that they will be correctly
     * contained within the sector. In the end the data will be sorted based on the latitude and then longitude to
     * make sure that the drawn shape is always the same.
     * @param sector {Sector} Sector for which the data needs to be returned.
     * @return {*} Filtered and sorted data to be displayed.
     */
    GeographicalFilter.prototype.filter = function (sector) {
        var result;

        if(this._dataStructure === 'GRID') {
            result = this.grid(sector);
        } else if(this._dataStructure === 'ARRAY') {
            result = this.array(sector);
        }

        result.sort(function (elm1, elm2) {
            if (elm1.latitude > elm2.latitude) {
                return 1;
            } else if (elm1.latitude < elm2.latitude) {
                return -1;
            } else {
                if (elm1.longitude > elm2.longitude) {
                    return 1;
                } else if (elm2.longitude < elm2.longitude) {
                    return -1;
                } else {
                    return 0;
                }
            }
        });

        return result;
    };

    GeographicalFilter.prototype.grid = function(sector) {
        var data = this._data;
        var result = [], beforeSector, afterSector;
        var minLongitude = Math.floor(sector.minLongitude);
        var maxLongitude = Math.floor(sector.maxLongitude);
        var minLatitude = Math.floor(sector.minLatitude);
        var maxLatitude = Math.floor(sector.maxLatitude);

        var extraLongitudeBefore = 0, extraLongitudeAfter = 0;

        if (minLongitude <= -180) {
            extraLongitudeBefore = Math.abs(minLongitude - (-180));
        }
        if (maxLongitude >= 180) {
            extraLongitudeAfter = Math.abs(maxLongitude - 180);
        }

        if (minLatitude <= -90) {
            minLatitude = -90;
        }
        if (maxLatitude >= 90) {
            maxLatitude = 90;
        }

        if (minLongitude <= -180) {
            minLongitude = -180;
        }
        if (maxLongitude >= 180) {
            maxLongitude = 180;
        }

        var lat, lon;
        for (lat = minLatitude; lat <= maxLatitude; lat++) {
            for (lon = minLongitude; lon <= maxLongitude; lon++) {
                data[lat][lon].forEach(function (element) {
                    if (sector.containsLocation(element.latitude, element.longitude)) {
                        result.push(element);
                    }
                });
            }
        }

        if (extraLongitudeBefore !== 0) {
            beforeSector = new Sector(minLatitude, maxLatitude, 180 - extraLongitudeBefore, 180);
            for (lat = minLatitude; lat <= maxLatitude; lat++) {
                for (lon = 180 - extraLongitudeBefore; lon <= 180; lon++) {
                    data[lat][lon].forEach(function (element) {
                        if (beforeSector.containsLocation(element.latitude, element.longitude)) {
                            result.push(new MeasuredLocation(element.latitude, -360 + element.longitude, element.measure));
                        }
                    });
                }
            }
        }
        if (extraLongitudeAfter !== 0) {
            afterSector = new Sector(minLatitude, maxLatitude, -180, -180 + extraLongitudeAfter);

            for (lat = minLatitude; lat <= maxLatitude; lat++) {
                for (lon = -180; lon <= -180 + extraLongitudeAfter; lon++) {
                    data[lat][lon].forEach(function (element) {
                        if (afterSector.containsLocation(element.latitude, element.longitude)) {
                            result.push(new MeasuredLocation(element.latitude, 360 + element.longitude, element.measure));
                        }
                    });
                }
            }
        }

        return result;
    };

    GeographicalFilter.prototype.array = function(sector) {
        var data = this._data;
        var result = [], beforeSector, afterSector;
        var minLongitude = Math.floor(sector.minLongitude);
        var maxLongitude = Math.floor(sector.maxLongitude);
        var minLatitude = Math.floor(sector.minLatitude);
        var maxLatitude = Math.floor(sector.maxLatitude);

        var extraLongitudeBefore = 0, extraLongitudeAfter = 0;

        if (minLongitude <= -180) {
            extraLongitudeBefore = Math.abs(minLongitude - (-180));
        }
        if (maxLongitude >= 180) {
            extraLongitudeAfter = Math.abs(maxLongitude - 180);
        }

        // Get the geographicaly correct ones.
        data.forEach(function (element) {
            if (sector.containsLocation(element.latitude, element.longitude)) {
                result.push(element);
            }
        });

        // Get and update the ones before the sector
        if (extraLongitudeBefore !== 0) {
            beforeSector = new Sector(minLatitude, maxLatitude, 180 - extraLongitudeBefore, 180);

            data.forEach(function (element) {
                if (beforeSector.containsLocation(element.latitude, element.longitude)) {
                    result.push(new MeasuredLocation(element.latitude, -360 + element.longitude, element.measure));
                }
            });
        }

        // Get and update the ones after the sector
        if (extraLongitudeAfter !== 0) {
            afterSector = new Sector(minLatitude, maxLatitude, -180, -180 + extraLongitudeAfter);

            data.forEach(function (element) {
                if (afterSector.containsLocation(element.latitude, element.longitude)) {
                    result.push(new MeasuredLocation(element.latitude, 360 + element.longitude, element.measure));
                }
            });
        }

        return result;
    };

    return GeographicalFilter;
});