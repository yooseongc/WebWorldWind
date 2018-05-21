/*
 * Copyright 2015-2017 WorldWind Contributors
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
var WorldWind = {};
define([
    'src/layer/heatmap/GeographicalFilter',
    'src/geom/MeasuredLocation',
    'src/geom/Sector'
], function (GeographicalFilter,
             MeasuredLocation,
             Sector) {
    "use strict";

    describe('GeographicalFilter', function () {
        // Lat, lon, measure
        var locationsToUseForTest = [
            new MeasuredLocation(-45, -140, 10),
            new MeasuredLocation(-40, -145, 10),
            new MeasuredLocation(-35, -150, 10),
            new MeasuredLocation(-30, -155, 10),
            new MeasuredLocation(-25, -160, 10),
            new MeasuredLocation(-20, -165, 10),
            new MeasuredLocation(-15, -170, 10),
            new MeasuredLocation(-10, -175, 10),
            new MeasuredLocation(-5,  -179.9, 10),

            new MeasuredLocation(0,  179.9, 10),
            new MeasuredLocation(5,  175, 10),
            new MeasuredLocation(10, 170, 10),
            new MeasuredLocation(15, 165, 10),
            new MeasuredLocation(20, 160, 10),
            new MeasuredLocation(25, 155, 10),
            new MeasuredLocation(30, 150, 10),
            new MeasuredLocation(35, 145, 10),
            new MeasuredLocation(40, 140, 10),
            new MeasuredLocation(45, 135, 10)
        ];

        describe('array', function () {
            var filter = new GeographicalFilter(locationsToUseForTest, 'ARRAY');

            it('filters the data on the standard areas.', function () {
                var filteredData = filter.array(new Sector(20, 30, 150, 160));
                expect(filteredData.length).toEqual(3);
            });

            it('filters the data for the areas antemeridian', function(){
                var filteredData = filter.array(new Sector(-30, 30, -225, -160));
                expect(filteredData.length).toEqual(12);
            });
        });

        describe('grid', function () {
            var filter = new GeographicalFilter(locationsToUseForTest, 'GRID');

            it('filters the data on the standard areas.', function () {
                var filteredData = filter.grid(new Sector(20, 30, 150, 160));
                expect(filteredData.length).toEqual(3);
            });

            it('filters the data for the areas antemeridian', function(){
                var filteredData = filter.grid(new Sector(-30, 30, -225, -160));
                console.log(filteredData);

                expect(filteredData.length).toEqual(12);
                expect(filteredData[0].longitude).toEqual(-160);
                expect(filteredData[1].longitude).toEqual(-165);
                expect(filteredData[2].longitude).toEqual(-170);
                expect(filteredData[3].longitude).toEqual(-175);
                expect(filteredData[4].longitude).toEqual(-179.9);
                expect(filteredData[5].longitude).toEqual(-180.1);
                expect(filteredData[6].longitude).toEqual(-185);
                expect(filteredData[7].longitude).toEqual(-190);
                expect(filteredData[8].longitude).toEqual(-195);
                expect(filteredData[9].longitude).toEqual(-200);
                expect(filteredData[10].longitude).toEqual(-205);
                expect(filteredData[11].longitude).toEqual(-210);
            });
        });
    });
});
