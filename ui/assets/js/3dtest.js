class Test3DPage {

    swimUrl = null;
    rootHtmlElementId = null;
    rootSwimTemplateId = null;
    rootHtmlElement = null;
    rootSwimElement = null;
    canvas = null;
    context = null;
    overlay = null;
    map = null;
    links = [];
    airplaneDataset = {};
    airplaneDataDirty = false;
    customLayer = null;

    constructor(swimUrl, elementID, templateID) {
        console.info("[3DPage]: constructor");
        this.swimUrl = swimUrl;
        this.rootHtmlElementId = elementID;
        this.rootSwimTemplateId = templateID;
    }

    initialize() {
        console.info("[3DPage]: init");
        this.rootHtmlElement = document.getElementById(this.rootHtmlElementId);
        this.rootSwimElement = swim.HtmlView.fromNode(this.rootHtmlElement);
        this.loadTemplate(this.rootSwimTemplateId, this.rootSwimElement, this.start.bind(this), true);

        this.links["airplaneListLink"] = swim.nodeRef(this.swimUrl, 'aggregation').downlinkMap().laneUri('airplaneList')
            // when an new item is added to the list, append it to listItems
            .didUpdate((key, newValue) => {
                // add new item to listItems
                const markerId = key.stringValue();
                this.airplaneDataset[markerId] = newValue;
                this.airplaneDataset[markerId].dirty = true;
                this.airplaneDataDirty = true;
            })
            .didRemove((key) => {
                const markerId = key.stringValue();
                if (this.airplaneDataset[markerId]) {
                    this.airplaneDataset[markerId].removed = true;
                    this.airplaneDataset[markerId].dirty = true;

                }
                this.airplaneDataDirty = true;
            })
            .didSync(() => {
                this.airplaneDataDirty = true;
            });
    }

    start() {
        this.map = this.rootSwimElement.getCachedElement("e55efe2c");
        for (let linkLKey in this.links) {
            this.links[linkLKey].open();
        }
        this.map.map.on('style.load', () => {
            this.drawDish();
            this.drawBuilding()
        });
        window.requestAnimationFrame(() => {
            this.render();
        })

    }

    render() {
        this.moveDish();
        window.requestAnimationFrame(() => {
            this.render();
        })
    }

    drawBuilding() {
        // Insert the layer beneath any symbol layer.
        var layers = this.map.map.getStyle().layers;

        var labelLayerId;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                labelLayerId = layers[i].id;
                break;
            }
        }

        this.map.map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 5,
                'paint': {
                    'fill-extrusion-color': '#aaa',

                    // use an 'interpolate' expression to add a smooth transition effect to the
                    // buildings as the user zooms in
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.6
                }
            },
            labelLayerId
        );
    }

    moveDish() {
        if(!page.airplaneDataset.DAL2885) {
            return;
        }

        // parameters to ensure the model is georeferenced correctly on the map
        var modelOrigin = [page.airplaneDataset.QTR9VZ.get("longitude").numberValue(), page.airplaneDataset.QTR9VZ.get("latitude").numberValue()];
        // var modelOrigin = [-87.906914, 41.979246];
        var modelAltitude = page.airplaneDataset.QTR9VZ.get("baroAltitude").numberValue();
        var modelRotate = [Math.PI / 2, 0, 0];

        var modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
            modelOrigin,
            modelAltitude
        );

        // transformation parameters to position, rotate and scale the 3D model onto the map
        this.modelTransform = {
            translateX: modelAsMercatorCoordinate.x,
            translateY: modelAsMercatorCoordinate.y,
            translateZ: modelAsMercatorCoordinate.z,
            rotateX: modelRotate[0],
            rotateY: modelRotate[1],
            rotateZ: modelRotate[2],
            /* Since our 3D model is in real world meters, a scale transform needs to be
             * applied since the CustomLayerInterface expects units in MercatorCoordinates.
             */
            scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
        };
    }
    
    drawDish() {

        // parameters to ensure the model is georeferenced correctly on the map
        var modelOrigin = [-87.906914, 41.979246];
        var modelAltitude = 100;
        var modelRotate = [Math.PI / 2, 0, 0];

        var modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
            modelOrigin,
            modelAltitude
        );

        // transformation parameters to position, rotate and scale the 3D model onto the map
        this.modelTransform = {
            translateX: modelAsMercatorCoordinate.x,
            translateY: modelAsMercatorCoordinate.y,
            translateZ: modelAsMercatorCoordinate.z,
            rotateX: modelRotate[0],
            rotateY: modelRotate[1],
            rotateZ: modelRotate[2],
            /* Since our 3D model is in real world meters, a scale transform needs to be
             * applied since the CustomLayerInterface expects units in MercatorCoordinates.
             */
            scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
        };

        var THREE = window.THREE;


        // configuration of the custom layer for a 3D model per the CustomLayerInterface
        this.customLayer = {
            id: '3d-model',
            type: 'custom',
            renderingMode: '3d',
            onAdd: (map, gl) => {
                this.camera = new THREE.Camera();
                this.scene = new THREE.Scene();

                // create two three.js lights to illuminate the model
                var directionalLight = new THREE.DirectionalLight(0xffffff);
                directionalLight.position.set(0, -70, 100).normalize();
                this.scene.add(directionalLight);

                var directionalLight2 = new THREE.DirectionalLight(0xffffff);
                directionalLight2.position.set(0, 70, 100).normalize();
                this.scene.add(directionalLight2);

                // use the three.js GLTF loader to add the 3D model to the three.js scene
                var loader = new THREE.GLTFLoader();
                loader.load(
                    //'https://docs.mapbox.com/mapbox-gl-js/assets/34M_17/34M_17.gltf',
                    'http://127.0.0.1:9001/assets/plane_ultralight.glb',
                    function (gltf) {
                        this.scene.add(gltf.scene);
                    }.bind(this)
                );
                // this.map = map;

                // use the Mapbox GL JS map canvas for three.js
                this.renderer = new THREE.WebGLRenderer({
                    canvas: map.getCanvas(),
                    context: gl,
                    antialias: true
                });

                this.renderer.autoClear = false;
            },
            render: (gl, matrix) => {
                var rotationX = new THREE.Matrix4().makeRotationAxis(
                    new THREE.Vector3(1, 0, 0),
                    this.modelTransform.rotateX
                );
                var rotationY = new THREE.Matrix4().makeRotationAxis(
                    new THREE.Vector3(0, 1, 0),
                    this.modelTransform.rotateY
                );
                var rotationZ = new THREE.Matrix4().makeRotationAxis(
                    new THREE.Vector3(0, 0, 1),
                    this.modelTransform.rotateZ
                );

                var m = new THREE.Matrix4().fromArray(matrix);
                var l = new THREE.Matrix4()
                    .makeTranslation(
                        this.modelTransform.translateX,
                        this.modelTransform.translateY,
                        this.modelTransform.translateZ
                    )
                    .scale(
                        new THREE.Vector3(
                            this.modelTransform.scale,
                            -this.modelTransform.scale,
                            this.modelTransform.scale
                        )
                    )
                    .multiply(rotationX)
                    .multiply(rotationY)
                    .multiply(rotationZ);

                this.camera.projectionMatrix = m.multiply(l);
                this.renderer.state.reset();
                this.renderer.render(this.scene, this.camera);
                this.map.map.triggerRepaint();
            }
        };
        this.map.map.addLayer(this.customLayer, 'waterway-label');
        console.info("layer added to map?");
    }

    loadTemplate(templateId, swimElement, onTemplateLoad = null, keepSynced = true) {
        console.info("[3DPage]: load template");
        swimElement.render(templateId, () => {
            if (onTemplateLoad) {
                onTemplateLoad();
            }
        }, keepSynced);
    }
}