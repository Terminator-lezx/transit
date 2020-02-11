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
    links = {};
    agencies = {};
    vehicles = {};

    routeList = {};
    routePaths = {};
    routeStops = {};

    agencyListDirty = false;
    
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


        // this.links["airportListLink"] = swim.nodeRef(this.swimUrl, '/userPrefs/' + this.userGuid).downlinkMap().laneUri('filteredAirportList')
        //     // when an new item is added to the list, append it to listItems
        //     .didUpdate((key, newValue) => {
        //         // add new item to listItems
        //         this.overlay.airportDataset[key.stringValue()] = newValue;
        //         this.airportsDirty = true;
        //     })
        //     .didRemove((key, newValue) => {
        //         const markerId = key.stringValue();
        //         this.overlay.airportDataset[markerId].removed = true;
        //         this.airportsDirty = true;
        //     })
        //     .didSync(() => {
        //         this.airportsDirty = true;
        //     });

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

        this.getVehicles("sf-muni");
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
        // if(this.didMapMove) {
        //     this.updateMapBoundingBox();
        //     this.didMapMove = false;
        // }
        
        // if(this.airportsDirty) {
        //     this.drawAirports();
        //     this.airportsDirty = false;
        // }

        // if(this.airplaneDataDirty) {
        //     this.drawTracks();
        //     this.drawAirplanes();
        //     this.airplaneDataDirty = false;    
        // }

        // if(this.weatherDirty) {
        //     this.drawWeather();
        //     this.weatherDirty = false;
        // }

        // if(this.uiFilterDirty) {
        //     this.drawUiFilterList();
        //     this.uiFilterDirty = false;
        // }
        

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
        const agencyData = this.agencies[agencyTag];
        // const agencyDetails = agencyData.info.get("details"); 
        document.getElementById("mainTitle").innerText = agencyData.info.get("title").stringValue();
        // console.info(agencyData);
        const agencyBounds = agencyData.details.get("agencyBounds");
        // console.info(agencyBounds.get("minLong"));
        var bbox = [
            [agencyBounds.get("minLong").numberValue(), agencyBounds.get("minLat").numberValue()],
            [agencyBounds.get("maxLong").numberValue(), agencyBounds.get("maxLat").numberValue()]

        ];
        console.info(bbox);
        this.map.map.fitBounds(bbox, {
          padding: {top: 10, bottom:25, left: 15, right: 5}
        });        

        if(this.links['routeList'] && this.links['routeList'].close) {
            this.links['routeList'].close();
        }

        this.links["routeList"] = swim.nodeRef(this.swimUrl, '/agency/' + agencyTag).downlinkMap().laneUri('routeList')
            .didUpdate((key, newValue) => {
                console.info('routes', key, newValue);
            })
            .didSync(() => {
                // this.links["routeList"].close();
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

    drawTrackLine(trackPoints, strokeColor = swim.Color.rgb(108, 95, 206, 0.75)) {
        const currPolys = this.overlay.trackMarkers.length;
        const tempMarker = new swim.MapPolygonView();
        tempMarker.setCoords(trackPoints);
        tempMarker.stroke(strokeColor);
        // tempMarker.fill(strokeColor);
        tempMarker.strokeWidth(2);


        this.overlay.setChildView('track', tempMarker);

        this.overlay.trackMarkers[currPolys] = tempMarker;

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

    drawTracks() {
        const trackList = [];
        const trackKeys = Object.keys(this.overlay.trackDataset);

        for (let i = 0; i < trackKeys.length; i++) {
            const currTrackPoint = this.overlay.trackDataset[trackKeys[i]];
            const currCoords = this.checkBounds(currTrackPoint, this.mapBoundingBox);
            if(currCoords[2]) {
                const newCoord = { "lng": currCoords[1], "lat": currCoords[0] };
                // console.info(newCoord);
                trackList.push(newCoord);
            }
        }
        for (let i = (trackKeys.length - 1); i >= 0; i--) {
            const currTrackPoint = this.overlay.trackDataset[trackKeys[i]];
            const currCoords = this.checkBounds(currTrackPoint, this.mapBoundingBox);
            if(currCoords[2]) {
                const newCoord = { "lng": currCoords[1], "lat": currCoords[0] };
                // console.info(newCoord);
                trackList.push(newCoord);
            }
        }

        this.drawTrackLine(trackList);
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
        let currLong = currTrackPoint.get("lng").numberValue();
        let currLat = currTrackPoint.get("lat").numberValue();
        let inBounds = true;

        if(currLat > boundingBox[0].lat) {
            inBounds = false;
            currLat = boundingBox[0].lat;
        }

        if(currLat < boundingBox[1].lat) {
            inBounds = false;
            currLat = boundingBox[1].lat;
        }

        if(currLong < boundingBox[0].lng) {
            inBounds = false;
            currLong = boundingBox[0].lng;
        }

        if(currLong > boundingBox[1].lng) {
            inBounds = false;
            currLong = boundingBox[1].lng;
        }        
        
        return [currLat, currLong, inBounds];
    }    
}