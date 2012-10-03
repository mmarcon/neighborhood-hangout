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
 
//##Neighborhood Hangouts
//
//This little app is live on Mozilla Hacks.
//Go and play with [Neighborhood Hangouts](https://developer.mozilla.org/en-US/demos/detail/neighborhood-hangouts)!
(function(doc, nokia){
    'use strict';

    var init, locationFound, locationNotFound, cities, attachEventHandlers, dataReady,
        API = {
            id: 'C2Cse_31xwvbccaAIAaP',
            token: 'fjFdGyRjstwqr9iJxLwQ-g'
        },
        FSQ = {
            //Foursquare API base URL. This already contains MY credentials, please get yours for you tests.
            baseUrl: 'https://api.foursquare.com/v2/venues/search?radius=1500&ll={LAT},{LON}&limit=50&client_id=ORIQ5J0OX5QKKIWXFGEEADVVKI0DUKHW10QV2LCKC4KYC3SU&client_secret=4VSNLFBMRRED1ISQF5FNC4RBDSXAJJL11ZMJZP4XUMTRS51G&v=20120927&callback=fsqdata'
        },
        map, mapEl = doc.querySelector('#map'), density, value, infoBubbles;


    //Bootstrap the application. Everything begins here.
    init = function(){
        var m, pos;
        attachEventHandlers();
        //Before attempting to get the location via the API
        //let's see if there is one contained in the URL.
        //Use `domain.com?p=<latitude>,<longitude>` to set the location.
        if((m = window.location.href.match(/\?p=(.+),(.+)/))) {
            pos = {
                coords: {
                    latitude: parseFloat(m[1]),
                    longitude: parseFloat(m[2])
                }
            };
            locationFound(pos);
            return;
        }
        //Here we go: let's try to detect the user's location
        //with the **Geolocation API**..
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(locationFound, locationNotFound);
        }
        else {
            locationNotFound();
        }
    };

    //Location was found, the application lives here.
    locationFound = function(position){
        var lat = position.coords.latitude,
            lon = position.coords.longitude,
            jsonp;

        //Credentials for Nokia Maps API.
        //**Register yours [here](http://api.developer.nokia.com)**.
        nokia.maps.util.ApplicationContext.set({"appId": API.id, "authenticationToken": API.token});

        //Keep a reference to the `InfoBubbles` component. We are going to need it later.
        infoBubbles = new nokia.maps.map.component.InfoBubbles()

        //Build the `map` object.
        map = new nokia.maps.map.Display(mapEl,
            {center: [lat, lon],
             zoomLevel: 16,
             components:[
                new nokia.maps.map.component.ZoomBar(),
                new nokia.maps.map.component.Behavior(),
                infoBubbles
             ]});
        //`nokia.maps.map.Display.SMARTMAP` is a pretty clever map style.
        //tiles are gray-ish and are perfect to put data viz layers on top.
        map.set("baseMapType", nokia.maps.map.Display.SMARTMAP);

        //Limit the min and max zoom levels.
        //Considering the type/amount of data that is possible
        //to pull from Foursquare zooming out of this range doesn't really make sense.
        map.set("maxZoomLevel", 18);
        map.set("minZoomLevel", 15);

        //Let's use JSONP to get the data from Foursquare.
        //It's the safest way, it'll always work.
        jsonp = doc.createElement('script');
        doc.querySelector('head').appendChild(jsonp);
        jsonp.src = FSQ.baseUrl.replace('{LAT}', lat).replace('{LON}', lon);

        //Also add a marker in the user's current location.
        var me = new nokia.maps.map.Marker([lat, lon], {
            icon: "img/me.png",
            anchor: new nokia.maps.util.Point(12, 24)
        });
        map.objects.add(me);
    };

    //No location in URL, browser does not support Geolocation or the
    //user has not allowed the browser to detect location.
    //There is nothing we can do, and this is just a proof-of-concept,
    //so we just `console.log`.
    //In an actual application you'd call from here some UI component
    //to notify the user about the unavailability of her position.
    locationNotFound = function(){
        console.log('No location');
    };

    //This will be the JSONP callback.
    //Will be called with the data pulled from Foursquare.
    dataReady = function(data) {
        //We *normalize* the data here, in the sense that we
        //get the raw data from Foursquare and we make an array
        //of simple objects that look like this:
        //
        //  `{value: <# of checkins>,
        //   latitude: <lat>,
        //   longitude: <lng>,
        //   name: <place name>}`
        //
        //This is the format expected by the **Heatmap** module.
        var normalizedData = data.map(function(place){
            return {value: place.stats.checkinsCount,
                    latitude: place.location.lat,
                    longitude: place.location.lng,
                    name: place.name};
        }), fav, favMarker;

        //Sort by number of checkins, ascending.
        normalizedData.sort(function(o1, o2){
            return o1.value - o2.value;
        });

        //Get the favorite place, i.e. the one where people checked in the most.
        fav = normalizedData[normalizedData.length - 1];
        //And display a marker for it.
        favMarker = new nokia.maps.map.Marker([fav.latitude, fav.longitude], {
            icon: "img/heart-mini.png",
            anchor: new nokia.maps.util.Point(8, 16)
        });
        map.objects.add(favMarker);
        //Additionally add a bubble that containes the place name
        //We can use HTML for the buble and add a class so we can override
        //the default style via CSS if we need to.
        infoBubbles.openBubble('<span class="bubble"><b>Most popular spot:</b><br/>' + fav.name + '<br/>Checkins: '+ fav.value + '</span>',
                               [fav.latitude, fav.longitude],
                               function(){},
                               true);

        //Make the **value based heatmap object** to
        //display the spots that people like the most.
        value = new nokia.maps.heatmap.Overlay({
            //Greatest zoom level for which the overlay will provide tiles.
            max: 20,
            //Overall opacity of the heatmap.
            opacity: 0.45,
            //Heatmap is value based.
            type: "value",
            //Resolution.
            coarseness: 2
        });
        //Add the data to render the heatmap.
        value.addData(normalizedData);

        //Make the **density based heatmap object** to
        //display  the areas where people like to hang out.
        density = new nokia.maps.heatmap.Overlay({
            max: 20,
            opacity: 0.8,
            //Heatmap is now density based.
            type: "density",
            coarseness: 2
        });
        //Add the data to render the heatmap.
        density.addData(normalizedData);
    };

    //Attaches all the event handlers that are needed within
    //the application.
    //Everything done in one place, to keep things clean...
    attachEventHandlers = function(){
        //Provide an ungly global callback for the JSONP call
        //to Foursquare.
        window.fsqdata = function(data){
            if(data.meta.code === 200) {
                //Call succeeded, pass the result to `dataReady`.
                dataReady(data.response.venues);
            }
            else {
                //Oh god, what do I see here? An `alert`?! Seriously?
                alert('uhmm... something wrong with Foursquare API');
            }
        };
        //Use **[Event Delegation](https://developer.mozilla.org/en-US/docs/DOM/event.target)**
        //to attach event handlers to the links.
        //Clicking on links will switch heatmap type
        doc.querySelector('dl').addEventListener('click', function(e){
            e.preventDefault();
            if(e.target.tagName.match(/a/i)) {
                if(e.target.classList.contains('value')) {
                    map.overlays.remove(density);
                    map.overlays.add(value);
                } else {
                    map.overlays.remove(value);
                    map.overlays.add(density);
                }
            }
        }, true);
    };

    //Wait for the DOM to be ready.
    //Or for `window.onload` if we have to.
    if(doc.addEventListener) {
        doc.addEventListener('DOMContentLoaded', init, false);
    }
    else {
        window.onload = init;
    }
})(document, nokia);