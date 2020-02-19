class IndexPage {

    swimUrl = null;
    rootHtmlElementId = null;
    rootSwimTemplateId = null;
    rootHtmlElement = null;
    rootSwimElement = null;
    canvas = null;
    context = null;
    overlay = null;
    map = null;
    userGuid = null;
    selectedAgency = null;
    agencyChanged = false;
    currentSimTime = new Date(0);

    links = {};
    agencies = {};
    vehicles = {};

    routeListDiv = null;
    routeCountDiv = null;
    routeList = [];
    routePathPolys = [];
    routeStopMarkers = [];

    vehicleList = [];
    vehicleMarkers = [];

    agencyListDirty = false;
    routeDirty = false;
    stopsDirty = false;
    scheduleDirty = false;
    
    constructor(swimUrl, elementID, templateID) {
        console.info("[IndexPage]: constructor");
        this.swimUrl = swimUrl;
        this.rootHtmlElementId = elementID;
        this.rootSwimTemplateId = templateID;

        console.info("[IndexPage]: cookie", document.cookie, Utils.getCookie("swim.user.guid"))
        if(Utils.getCookie("swim.user.guid") === "") {
            this.userGuid = Utils.newGuid();
            Utils.setCookie("swiw.user.guid", this.userGuid, 30);
            console.info("[IndexPage]: new user guid set", this.userGuid);
        } else {
            this.userGuid = Utils.getCookie("swim.user.guid");
            console.info("[IndexPage]: user has guid cookie", this.userGuid);
        }
        
    }

    initialize() {
        console.info("[IndexPage]: init", this.userGuid);
        swim.command(this.swimUrl, "/userPrefs/" + this.userGuid, "setGuid", this.userGuid);
        this.rootHtmlElement = document.getElementById(this.rootHtmlElementId);
        this.rootSwimElement = swim.HtmlView.fromNode(this.rootHtmlElement);
        this.loadTemplate(this.rootSwimTemplateId, this.rootSwimElement, this.start.bind(this));


        this.links["agencyList"] = swim.nodeRef(this.swimUrl, '/aggregation').downlinkMap().laneUri('agencies')
            // when an new item is added to the list, append it to listItems
            .didUpdate((key, newValue) => {
                // console.info(key, newValue);
                const agencyTag = key.stringValue();
                this.agencies[agencyTag] = {
                    tag: agencyTag,
                    info: newValue,
                    details: null
                };
                this.getAgencyDetails(agencyTag);
            })
            .didSync(() => {
                // console.info('synced')
                // this.map.map.synced = true;
                // this.airplaneDataDirty = true;
                // window.requestAnimationFrame(this.drawAirplanes.bind(this));
            });


        this.links["appConfigLink"] = swim.nodeRef(this.swimUrl, '/aggregation').downlinkValue().laneUri('appConfig')
            .didSet((newValue) => {
                if (newValue !== swim.Value.absent()) {
                    this.appConfig = newValue.toObject();
                    document.getElementById("mainTitle").innerText = this.appConfig.appName;
                    document.title = "Swim - " + this.appConfig.appName;
                    // console.info("[Index] app config updated", this.appConfig);
                    swim.command(this.swimUrl, "/userPrefs/" + this.userGuid, "setGuid", this.userGuid);
                }
            });

        this.links["simTimeLink"] = swim.nodeRef(this.swimUrl, '/aggregation').downlinkValue().laneUri('currentSimTime')
            .didSet((key, newValue) => {
                this.currentSimTime = new Date(newValue.value).toLocaleString('en-US', { timeZone: 'America/Chicago' });
                this.displayedTimeDirty = true;

            });

        this.links["simTickLink"] = swim.nodeRef(this.swimUrl, '/aggregation').downlinkValue().laneUri('currentSimTicks')
            .didSet((newValue) => {
                this.currentSimTicks = newValue;
                this.isNewTickRendered = false;

            });            
    }

    getVehicles(agencyTag) {
        this.links["vehicleLocations"] = swim.nodeRef(this.swimUrl, '/agency/' + agencyTag).downlinkValue().laneUri('vehicleList')
            .didSet((newValue, oldValue) => {
                // console.info(newValue);
                // this.agencies[agencyTag].details = newValue;
                // this.links["agencyDetail-" + agencyTag].close();
            })
            .open();

    }

    getAgencyDetails(agencyTag) {
        this.links["agencyDetail-" + agencyTag] = swim.nodeRef(this.swimUrl, '/agency/' + agencyTag).downlinkValue().laneUri('agencyDetails')
            .didSet((newValue, oldValue) => {
                this.agencies[agencyTag].details = newValue;
                this.links["agencyDetail-" + agencyTag].close();
                this.agencyListDirty = true;
            })
            .open();
    }

    toggleMenu() {
        const menuDiv = document.getElementById("b3a6b5bb");
        menuDiv.className = (menuDiv.className === "sideMenuOpen") ? "sideMenu" : "sideMenuOpen";

    }    

    start() {
        console.info("[IndexPage]: start");
        this.map = this.rootSwimElement.getCachedElement("e55efe2c");
        this.overlay = this.map.overlays['121246ec'];
        this.routeListDiv = this.rootSwimElement.getCachedElement("cec61646");
        this.routeCountDiv = this.rootSwimElement.getCachedElement("1a6cff34");
        
        // this.pie2Div = this.rootSwimElement.getCachedElement("c3ab4b07");
        // this.datagridDiv = this.rootSwimElement.getCachedElement("d5dbe551");
        // const menuDivButton = document.getElementById("9567a26b");
        // menuDivButton.onclick = () => {
        //     this.toggleMenu()
        // }



        this.map.map.on("load", () => {
            // this.drawOnGroundPie();
            // this.drawAltitudePie();
            this.updateMapBoundingBox();
            for(let linkLKey in this.links) {
                this.links[linkLKey].open();
            }

        });

        this.map.map.on("zoomend", () => {
            this.didMapMove = true;
            this.updateMapBoundingBox();
            // console.info(this.map.map)
        });

        this.map.map.on("moveend", () => {
            this.didMapMove = true;
            this.updateMapBoundingBox();
        });

        window.requestAnimationFrame(() => {
            this.render();
        })
        // swim.command(this.swimUrl.replace("9001", "9002"), "/simulator", "addAppLog", "Map Page Opened");

    }

    render() {

        // update displayed time
        // if(this.displayedTimeDirty) {
        //     let timestampDiv = this.rootSwimElement.getCachedElement("c0ebccfc");
        //     if (this.currentSimTime !== "Invalid Date") {
        //         timestampDiv.text(this.currentSimTime + " CST");
        //     } else {
        //         timestampDiv.text("");
        //     }
        //     this.displayedTimeDirty = false;
        // }

        // // update progress bar
        // if(!this.isNewTickRendered) {
        //     const progressBarContainer = this.rootSwimElement.getCachedElement("e5bdb7f9");
        //     const progressBar = this.rootSwimElement.getCachedElement("3e5db015");
        //     const liveBar = this.rootSwimElement.getCachedElement("93c39404");
        //     const apiQueryEnabled = false;//this.currentSimTicks.get("apiQueryEnabled").booleanValue(false);
        //     console.info("[Index] simTickLink", apiQueryEnabled);
        //     if(apiQueryEnabled) {
        //         progressBarContainer.display("none");
        //         liveBar.display("block");
        //     } else {
        //         progressBarContainer.display("block");
        //         liveBar.display("none");
        //         const currTick = this.currentSimTicks.get("currentTick");
        //         const totalTicks = this.currentSimTicks.get("totalTicks");
        //         const width = currTick / totalTicks;
        //         progressBar.node.style.width = Math.round(width * 100) + "%";
    
        //     }        
        //     this.isNewTickRendered = true;
        // }

        // render agency list
        if (this.agencyListDirty) {
            this.renderAgencyList();
            this.agencyListDirty = false;
        }

        // render route listing for selected agency (if any)
        if(this.selectAgency && this.agencyChanged) {
            console.info("render route list", this.routeList);
            this.routeListDiv.node.innerHTML = "";
            this.routeCountDiv.node.innerHTML = Object.keys(page.routeList).length;
            for(const route in this.routeList) {
                const routeData = this.routeList[route];
                const routeDiv = swim.HtmlView.create("div");
                console.info("route", routeData.info.stringValue());
                routeDiv.node.innerHTML = routeData.info.stringValue();
                routeDiv.on("click", (evt) => {
                    this.selectRoute(route);
                });
                this.routeListDiv.append(routeDiv);
            }
            this.agencyChanged = false;
        }

        // draw route line and stops if needed
        if(this.selectedAgency && this.selectedRoute && (this.routeDirty || this.stopsDirty)) {
            const routeData = this.routeList[this.selectedRoute];
            if(!routeData) {
                return;
            }
            const routeDetails = routeData.details;
            if(routeDetails != null) {

                // center map on route
                var bbox = [
                    [routeDetails.get("minLong").numberValue(), routeDetails.get("minLat").numberValue()],
                    [routeDetails.get("maxLong").numberValue(), routeDetails.get("maxLat").numberValue()]
        
                ];
                this.map.map.fitBounds(bbox, {padding: 200});                     

                // get the route line color
                let pathColor = swim.Color.parse(`#${routeDetails.get("color").stringValue()}`);
                // don't allow black lines
                const black = swim.Color.rgb("#000000");
                const altColor = swim.Color.rgb("#00ff00");
                if(pathColor.equals(black)) {
                    pathColor = altColor; 
                }

                // draw route lines
                if(this.routeDirty) {
                    
                    this.renderBusRoute(routeData.paths, pathColor);
                    this.routeDirty = false;
                }

                // draw stops
                if(this.stopsDirty) {
                    const stops = routeData.stops;
                    // console.info(stops);
                    for(const stop in stops) {
                        
                        this.renderBusStop(stops[stop], pathColor);
                    }
                    this.stopsDirty = false;
                }

            }
            
        }

        //draw agency vehicles
        if(this.vehicleListDirty) {
            for(const vehicle in this.vehicleList) {
                // console.info(vehicle);
                this.renderVehicle(this.vehicleList[vehicle]);
            }
            this.vehicleListDirty = false;
        }

        window.requestAnimationFrame(() => {
            this.render();
        })
    }
    renderRouteSchedule() {
        
        const scheduleContainer = this.rootSwimElement.getCachedElement("d5dbe551");
        scheduleContainer.node.innerHTML = "";
        const routeData = this.routeList[this.selectedRoute];

        if(routeData.schedule) {
            scheduleContainer.node.innerHTML = routeData.schedule;
        }

    }

    renderAgencyList() {
        const listContainer = this.rootSwimElement.getCachedElement("cfb9be55");
        listContainer.node.innerHTML = "";
        for(const agencyTag in this.agencies) {
            const rowDiv = swim.HtmlView.create("div")
            rowDiv.node.onclick = (clickEvent) => {
                this.selectAgency(agencyTag);
            }
            rowDiv.text(agencyTag);
            listContainer.append(rowDiv);

            // console.info(agencyTag);
        }
    }

    renderVehicle(vehicleData) {
        // console.info(vehicleData);
        let routeId = this.selectedAgency.tag + "-" + vehicleData.get("routeTag").stringValue("deadbeef");
        let route = this.routeList[routeId]; 
        let newRgb = swim.Color.rgb(255,255,255);
        if(route && route.details) {
            newRgb = swim.Color.parse(`#${route.details.get("color").stringValue("ffffff")}`);
        }
        let markerFillColor = newRgb.alpha(0.75);
        let markerStrokeColor = newRgb.alpha(0.95);
        let markerId = vehicleData.get("id").stringValue("deadbeef");
        let tempMarker = new swim.MapCircleView()
            // .center([newLat, newLng])
            .center([vehicleData.get("lon").numberValue(0), vehicleData.get("lat").numberValue(0)])
            // .center(mapboxgl.LngLat.convert([newLng, newLat]))
            .radius(4)
            .fill(markerFillColor)
            .stroke(markerStrokeColor)
            .strokeWidth(1);        

        this.overlay.setChildView(markerId, tempMarker);
        this.vehicleMarkers[markerId] = tempMarker;            
    }

    renderBusStop(stopData, pathColor) {
        let markerFillColor = pathColor.alpha(0.1);//newRgb.alpha(0.75);
        let markerStrokeColor = pathColor; //newRgb.alpha(0.95);
        let markerId = stopData.get("stopId").stringValue("deadbeef");
        let tempMarker = new swim.MapCircleView()
            // .center([newLat, newLng])
            .center([stopData.get("lon").numberValue(0), stopData.get("lat").numberValue(0)])
            // .center(mapboxgl.LngLat.convert([newLng, newLat]))
            .radius(8)
            .fill(markerFillColor)
            .stroke(markerStrokeColor)
            .strokeWidth(1);        

        this.overlay.setChildView(markerId, tempMarker);
        this.routeStopMarkers[markerId] = tempMarker;            
    }

    renderBusRoute(paths, pathColor) {
        
        // draw the points for each path segment
        for(const pathKey in paths) {
            const pathPoints = paths[pathKey];
            const fullPath = [];    

            // build path point array
            pathPoints.forEach((thing) => {
                const point = thing.get("point");
                const newPoint = {
                    "lat": point.get("lat").numberValue(),
                    "lng": point.get("lon").numberValue()
                }
                fullPath.push(newPoint);
            });

            // draw the line
            this.drawTrackLine(pathKey, fullPath.concat(fullPath.slice().reverse()), pathColor);
        }
    }

    selectAgency(agencyTag) {
        console.info(`Selected ${agencyTag}`);
        this.clearTracks();
        this.clearStopMarkers();
        this.selectedAgency = this.agencies[agencyTag];
        this.selectedRoute = null;
        this.routeList = [];
        this.vehicleList = [];
        // update page title
        document.getElementById("mainTitle").innerText = this.selectedAgency.info.get("title").stringValue();

        // center map on agency area
        const agencyBounds = this.selectedAgency.details.get("agencyBounds");
        var bbox = [
            [agencyBounds.get("minLong").numberValue(), agencyBounds.get("minLat").numberValue()],
            [agencyBounds.get("maxLong").numberValue(), agencyBounds.get("maxLat").numberValue()]

        ];
        this.map.map.fitBounds(bbox, {padding: 200});        

        // get all route data for selected agency
        const routeLink = swim.nodeRef(this.swimUrl, '/agency/' + agencyTag).downlinkMap().laneUri('routeList')
            .didUpdate((key, newValue) => {
                // console.info('route list', key, newValue);
                this.routeList[key] = {
                    info: newValue,
                    details: null,
                    paths: {},
                    stops: {}
                };
                // make call to get route detail data from routeDetails lane
                const detailsLink = swim.nodeRef(this.swimUrl, '/routes/' + key).downlinkValue().laneUri('routeDetails')
                    .didSet((newValue) => {
                        this.routeList[key].details = newValue;
                    })
                    .didSync(() => {
                        detailsLink.close();
                    })                    
                    .open();                

            })
            .didSync(() => {
                // this.links["routeList"].close();
                this.agencyChanged = true;
                this.routeDirty = true;
                routeLink.close();
            })            
            .open();        

        // get all vehicle data for selected agency
        const vehicleLink = swim.nodeRef(this.swimUrl, '/agency/' + agencyTag).downlinkMap().laneUri('vehicleList')
            .didUpdate((key, newValue) => {
                // console.info("vehicle:", key.stringValue(), newValue);
                this.vehicleList[key.stringValue()] = newValue;
                this.vehicleListDirty = true;
            })
            .didSync(() => {
                this.agencyChanged = true;
                this.vehicleListDirty = true;
                // vehicleLink.close();
            })            
            .open(); 
    }

    selectRoute(routeId) {
        this.selectedRoute = routeId;
        console.info(`selected route: ${this.selectedRoute}`);
        this.clearTracks();
        this.clearStopMarkers();
        const routeData = this.routeList[this.selectedRoute];
        this.routeDirty = true;
        const pathLink = swim.nodeRef(this.swimUrl, '/routes/' + this.selectedRoute).downlinkMap().laneUri('paths')
            .didUpdate((pathKey, pathValue) => {
                this.routeList[this.selectedRoute].paths[pathKey.numberValue()] = pathValue;
                this.routeDirty = true;
            })
            .didSync(() => {
                this.routeDirty = true;
                pathLink.close();
            })                    
            .open();
        const stopsLink = swim.nodeRef(this.swimUrl, '/routes/' + this.selectedRoute).downlinkMap().laneUri('stops')
            .didUpdate((pathKey, pathValue) => {
                // console.info(pathKey, pathValue)
                this.routeList[this.selectedRoute].stops[pathKey.stringValue()] = pathValue;
                this.stopsDirty = true;
            })
            .didSync(() => {
                this.stopsDirty = true;
                stopsLink.close();
            })                    
            .open();
        const scheduleLink = swim.nodeRef(this.swimUrl, '/routes/' + this.selectedRoute).downlinkValue().laneUri('schedule')
            .didSet((newValue) => {
                console.info(newValue)
                this.routeList[this.selectedRoute].schedule = newValue;
                this.scheduleDirty = true;
            })
            .didSync(() => {
                this.scheduleDirty = true;
                scheduleLink.close();
            })                    
            .open();
    }

    drawTrackLine(routeId, trackPoints, strokeColor = swim.Color.rgb(108, 95, 206, 0.75)) {
        const currPolys = this.routePathPolys.length;
        const tempMarker = new swim.MapPolygonView();
        tempMarker.setCoords(trackPoints);
        tempMarker.stroke(strokeColor);
        // tempMarker.fill(strokeColor);
        tempMarker.strokeWidth(2);

        if(this.overlay.getChildView(routeId) === null){
            this.overlay.setChildView(routeId, tempMarker);

            this.routePathPolys.push(tempMarker);
    
        }


    }

    updateMapBoundingBox() {
        const topLeftPoint = new mapboxgl.Point(0, 0);
        const bottomRightPoint = new mapboxgl.Point(document.body.offsetWidth, document.body.offsetHeight)
        const topLeftCoords = this.map.map.unproject(topLeftPoint);
        const bottomRightCoords = this.map.map.unproject(bottomRightPoint);

        this.mapBoundingBox = [topLeftCoords, bottomRightCoords];
        
    }

    refreshMapInfo() {
        const mapInfo = swim.Record.create()
            .slot('boundBoxTopRightLat', this.mapBoundingBox[0].lat)
            .slot('boundBoxTopRightLong', this.mapBoundingBox[0].lng)
            .slot('boundBoxBottomLeftLat', this.mapBoundingBox[1].lat)
            .slot('boundBoxBottomLeftLong', this.mapBoundingBox[1].lng);

        swim.command(this.swimUrl, '/userPrefs/' + this.userGuid, 'updateMapSettings', mapInfo);

    }

    drawRoute(routeId, routePoints, routeColor) {
        const trackList = [];
        // const trackKeys = Object.keys(routePoints);

        for (let i = 0; i < routePoints.length; i++) {
            const currTrackPoint = routePoints[i];
            trackList.push(currTrackPoint);
            const currCoords = this.checkBounds(currTrackPoint, this.mapBoundingBox);
            if(currCoords[2]) {
                const newCoord = { "lng": currCoords[1], "lat": currCoords[0] };
                // console.info(newCoord);
                trackList.push(newCoord);
            }
        }
        for (let i = (routePoints.length - 1); i >= 0; i--) {
            const currTrackPoint = routePoints[i];
            const currCoords = this.checkBounds(currTrackPoint, this.mapBoundingBox);
            if(currCoords[2]) {
                const newCoord = { "lng": currCoords[1], "lat": currCoords[0] };
                // console.info(newCoord);
                trackList.push(newCoord);
            }
        }

        if(trackList) {
            this.drawTrackLine(routeId, trackList, routeColor);
        }
        
    }

    clearTracks() {
        for (let trackKey in this.routePathPolys) {
            this.removeMapElement(this.routePathPolys[trackKey]);
        }
        this.routePathPolys = [];
        
    }

    clearStopMarkers() {
        for(let markerKey in this.routeStopMarkers) {
            this.removeMapElement(this.routeStopMarkers[markerKey]);
        }
    }

    removeMapElement(mapElement) {
        if (mapElement !== null && mapElement.parentView !== null) {
            try {
                this.overlay.removeChildView(mapElement);
            } catch (ex) {
                console.info('track parent not found', mapElement);
            }

        }        
    }

    loadTemplate(templateId, swimElement, onTemplateLoad = null, keepSynced = false) {
        console.info("[IndexPage]: load template");
        swimElement.render(templateId, () => {
            if (onTemplateLoad) {
                onTemplateLoad();
            }
        }, keepSynced);
    }

    handleResize() {
        this.map.map.resize();
        this.updateMapBoundingBox();
    }

    interpolate = (startValue, endValue, stepNumber, lastStepNumber) => {
        return (endValue - startValue) * stepNumber / lastStepNumber + startValue;
    }

    drawRotatedImage = (context, image, x, y, angle, scale = 5) => {
        const toRadians = Math.PI / 180;
        context.save();
        context.translate(x + scale, y + scale);
        context.rotate(angle * toRadians);
        context.drawImage(image, (scale*-1), (scale*-1), (scale*2), (scale*2));
        context.restore();
    }

    checkBounds = (currTrackPoint, boundingBox) => {
        let currLong = currTrackPoint.lng;
        let currLat = currTrackPoint.lat;
        let inBounds = true;

        if(currLat > boundingBox[0].lat) {
            // inBounds = false;
            currLat = boundingBox[0].lat;
        }

        if(currLat < boundingBox[1].lat) {
            // inBounds = false;
            currLat = boundingBox[1].lat;
        }

        if(currLong < boundingBox[0].lng) {
            // inBounds = false;
            currLong = boundingBox[0].lng;
        }

        if(currLong > boundingBox[1].lng) {
            // inBounds = false;
            currLong = boundingBox[1].lng;
        }        
        
        return [currLat, currLong, inBounds];
    }    
}