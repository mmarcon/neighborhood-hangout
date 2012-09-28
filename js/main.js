/*
 * Copyright 2012 Massimiliano Marcon (http://marcon.me)
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
 
(function(doc){
    'use strict';

    var init, locationFound, locationNotFound, cities, attachEventHandlers, dataReady,
        API = {
            id: 'C2Cse_31xwvbccaAIAaP',
            token: 'fjFdGyRjstwqr9iJxLwQ-g'
        },
        FSQ = {
            baseUrl: 'https://api.foursquare.com/v2/venues/search?radius=1500&ll={LAT},{LON}&limit=50&client_id=ORIQ5J0OX5QKKIWXFGEEADVVKI0DUKHW10QV2LCKC4KYC3SU&client_secret=4VSNLFBMRRED1ISQF5FNC4RBDSXAJJL11ZMJZP4XUMTRS51G&v=20120927&callback=fsqdata'
        },
        map, mapEl = doc.querySelector('#map'), density, value;


    init = function(){
        //app lives here
        attachEventHandlers();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(locationFound, locationNotFound);
        }
        else {
            locationNotFound();
        }
    };

    locationFound = function(position){
        var lat = position.coords.latitude,
            lon = position.coords.longitude,
            jsonp;

        nokia.maps.util.ApplicationContext.set({"appId": API.id, "authenticationToken": API.token});
        map = new nokia.maps.map.Display(mapEl,
            {center: [lat, lon],
             zoomLevel: 16,
             components:[
                new nokia.maps.map.component.ZoomBar()
             ]});
        map.set("baseMapType", nokia.maps.map.Display.SMARTMAP);

        jsonp = doc.createElement('script');
        doc.querySelector('head').appendChild(jsonp);
        jsonp.src = FSQ.baseUrl.replace('{LAT}', lat).replace('{LON}', lon);

        var me = new nokia.maps.map.Marker([lat, lon], {
            icon: "../img/me.png",
            anchor: new nokia.maps.util.Point(12, 24)
        });
        map.objects.add(me);
    };

    locationNotFound = function(){
        
    };

    dataReady = function(data) {
        var normalizedData = data.map(function(place){
            return {value: place.stats.checkinsCount,
                    latitude: place.location.lat,
                    longitude: place.location.lng,
                    name: place.name};
        });

        console.log(data);

        value = new nokia.maps.heatmap.Overlay({
            // This is the greatest zoom level for which the overlay will provide tiles
            max: 20,
            // This is the overall opacity applied to this overlay
            opacity: 0.45,
            // Defines if our heatmap is value or density based
            type: "value",
            // Coarseness defines the resolution with which the heat map is created.
            coarseness: 2
        });
        value.addData(normalizedData);

        density = new nokia.maps.heatmap.Overlay({
            // This is the greatest zoom level for which the overlay will provide tiles
            max: 20,
            // This is the overall opacity applied to this overlay
            opacity: 0.8,
            // Defines if our heatmap is value or density based
            type: "density",
            // Coarseness defines the resolution with which the heat map is created.
            coarseness: 2
        });
        density.addData(normalizedData);
    };

    attachEventHandlers = function(){
        window.fsqdata = function(data){
            if(data.meta.code === 200) {
                dataReady(data.response.venues);
            }
            else {
                alert('uhmm... something wrong with Foursquare API')
            }
        };
        doc.querySelector('ul').addEventListener('click', function(e){
            e.preventDefault();
            if(e.target.tagName.match(/a/i)) {
                if(e.target.classList+'' === 'value') {
                    map.overlays.remove(density);
                    map.overlays.add(value);
                } else {
                    map.overlays.remove(value);
                    map.overlays.add(density);
                }
            }
        }, true);
    };

    if(doc.addEventListener) {
        doc.addEventListener('DOMContentLoaded', init, false);
    }
    else {
        window.onload = init;
    }
})(document);

