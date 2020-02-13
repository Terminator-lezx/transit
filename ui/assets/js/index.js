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

    links = {};
    agencies = {};
    vehicles = {};

    routeList = {};
    routePathPolys = [];

    agencyListDirty = false;
    routeDirty = false;
    
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
        this.loadTemplate(this.rootSwimTemplateId, this.rootSwimElement, this.start.bind(this), true);


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
                // add new item to listItems
                // const markerId = key.stringValue();
                // this.overlay.airplaneDataset[markerId] = newValue;
                // this.overlay.airplaneDataset[markerId].dirty = true;
                // this.airplaneDataDirty = true;
            })
            .didSync(() => {
                // console.info('synced')
                // this.map.map.synced = true;
                // this.airplaneDataDirty = true;
                // window.requestAnimationFrame(this.drawAirplanes.bind(this));
            });

        // this.getVehicles("sf-muni");
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
        // this.pie1Div = this.rootSwimElement.getCachedElement("cec61646");
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
            this.airplaneDataDirty = true;
            // console.info(this.map.map)
        });

        this.map.map.on("moveend", () => {
            this.didMapMove = true;
            this.airplaneDataDirty = true;
        });

        window.requestAnimationFrame(() => {
            this.render();
        })
        // swim.command(this.swimUrl.replace("9001", "9002"), "/simulator", "addAppLog", "Map Page Opened");

    }

    render() {

        // // update displayed time
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
        //     const apiQueryEnabled = this.currentSimTicks.get("apiQueryEnabled").booleanValue(false);
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

        if (this.agencyListDirty) {
            this.renderAgencyList();
            this.agencyListDirty = false;
        }

        if(this.selectedAgency != null && this.routeDirty) {
            // const agencyData = page.routeList[this.selectedAgency];
            for(const route in this.routeList) {
                // console.info(route);
                const routeData = this.routeList[route];
                const routeDetails = routeData.details;
                if(routeDetails != null) {
                    const paths = routeData.paths;
                    const pathColor = swim.Color.parse(`#${routeDetails.get("color").stringValue()}`);
                    // const stops = routeData.stops;
                    
                    for(const pathKey in paths) {
                        const pathPoints = paths[pathKey];
                        const fullPath = [];    
                        pathPoints.forEach((thing) => {
                            const point = thing.get("point");
                            const newPoint = {
                                "lat": point.get("lat").numberValue(),
                                "lng": point.get("lon").numberValue()
                            }
                            fullPath.push(newPoint);
                            // this.drawRoute(point);
                            // console.info(point);
                        })
                        // console.info(fullPath);
                        this.drawRoute(pathKey, fullPath, pathColor);
                    }
                    this.routeDirty = false;
                }

            }
            
        }
        

        window.requestAnimationFrame(() => {
            this.render();
        })
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

    selectAgency(agencyTag) {
        console.info(`Selected ${agencyTag}`);
        
        this.selectedAgency = this.agencies[agencyTag];
        // const agencyDetails = this.selectedAgency.info.get("details"); 
        document.getElementById("mainTitle").innerText = this.selectedAgency.info.get("title").stringValue();
        // console.info(this.selectedAgency);
        const agencyBounds = this.selectedAgency.details.get("agencyBounds");
        console.info(agencyBounds.get("maxLong").numberValue() - agencyBounds.get("minLong").numberValue());
        var bbox = [
            [agencyBounds.get("minLong").numberValue(), agencyBounds.get("minLat").numberValue()],
            [agencyBounds.get("maxLong").numberValue(), agencyBounds.get("maxLat").numberValue()]

        ];
        // console.info(bbox);
        this.map.map.fitBounds(bbox);        

        if(this.links['routeList'] && this.links['routeList'].close) {
            this.links['routeList'].close();
        }

        this.links["routeList"] = swim.nodeRef(this.swimUrl, '/agency/' + agencyTag).downlinkMap().laneUri('routeList')
            .didUpdate((key, newValue) => {
                // console.info('route list', key, newValue);
                this.routeList[key] = {
                    info: newValue,
                    details: null,
                    paths: {},
                    stops: {}
                };
                swim.nodeRef(this.swimUrl, '/routes/' + key).downlinkValue().laneUri('routeDetails')
                    .didSet((newValue) => {
                        this.routeList[key].details = newValue;
                    })
                    .didSync(() => {
                        // this.links["routeList"].close();
                        // this.routeDirty = true;
                    })                    
                    // .keepSynced(false)
                    .open();                
                swim.nodeRef(this.swimUrl, '/routes/' + key).downlinkMap().laneUri('paths')
                    .didUpdate((pathKey, pathValue) => {
                        this.routeList[key].paths[pathKey.numberValue()] = pathValue;
                    })
                    .didSync(() => {
                        // this.links["routeList"].close();
                        this.routeDirty = true;
                    })                    
                    // .keepSynced(false)
                    .open();
                swim.nodeRef(this.swimUrl, '/routes/' + key).downlinkMap().laneUri('stops')
                    .didUpdate((stopKey, stopValue) => {
                        this.routeList[key].stops[stopKey] = stopValue;
                    })
                    .didSync(() => {
                        // this.links["routeList"].close();
                        // this.routeDirty = true;
                    })                    
                    // .keepSynced(false)
                    .open();

            })
            .didSync(() => {
                // this.links["routeList"].close();
                this.routeDirty = true;
            })
            
            .open();        
    }

    drawPoly(key, coords, weatherData = [], fillColor = swim.Color.rgb(255, 0, 0, 0.3), strokeColor = swim.Color.rgb(255, 0, 0, 0.8), strokeSize = 2) {

        const geometryType = weatherData.get("geometry_type").stringValue().toLowerCase();
        const currPolys = this.overlay.gairmetWeatherPolys.length;
        const tempMarker = new swim.MapPolygonView()
        tempMarker.setCoords(coords);
        if (geometryType === "area") {
            tempMarker.fill(fillColor);
        }
        tempMarker.stroke(strokeColor);
        tempMarker.strokeWidth(strokeSize);


        tempMarker.on("click", () => {
            this.datagridDiv.node.innerHTML = "<h3>G-AIRMET</h3>";
            weatherData.forEach((dataKey) => {
                if (dataKey.key.value !== "points") {
                    this.datagridDiv.node.innerHTML += `<div><span>${dataKey.key.value.replace("_", " ")}</span><span>${dataKey.value.value}</span></h3>`;
                }
            })
        });
        this.overlay.setChildView(key, tempMarker);

        this.overlay.gairmetWeatherPolys[currPolys] = tempMarker;
        // console.info('test poly drawn');
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
        for (let trackKey in this.overlay.trackMarkers) {
            if (this.overlay.trackMarkers[trackKey] !== null && this.overlay.trackMarkers[trackKey].parentView !== null) {
                try {
                    this.overlay.removeChildView(this.overlay.trackMarkers[trackKey]);
                } catch (ex) {
                    console.info('track parent not found', this.overlay.trackMarkers[trackKey]);
                }

            }

        }
        this.overlay.trackMarkers = [];
        this.overlay.trackDataset = [];
    }

    loadTemplate(templateId, swimElement, onTemplateLoad = null, keepSynced = true) {
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