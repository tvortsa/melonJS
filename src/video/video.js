(function () {
    /**
     * video functions
     * There is no constructor function for me.video
     * @namespace me.video
     * @memberOf me
     */
    me.video = (function () {
        // hold public stuff in our api
        var api = {};

        var deferResizeId = -1;

        var designRatio = 1;
        var designWidth = 0;
        var designHeight = 0;

        // max display size
        var maxWidth = Infinity;
        var maxHeight = Infinity;

        // default video settings
        var settings = {
            wrapper : undefined,
            renderer : 2, // AUTO
            doubleBuffering : false,
            autoScale : false,
            scale : 1.0,
            scaleMethod : "fit",
            transparent : false,
            blendMode : "normal",
            antiAlias : false,
            failIfMajorPerformanceCaveat : true,
            subPixel : false,
            preferWebGL1 : true,
            powerPreference : "default",
            verbose : false,
            consoleHeader : true
        };

        /**
         * Auto-detect the best renderer to use
         * @ignore
         */
        function autoDetectRenderer(options) {
            try {
                if (me.device.isWebGLSupported(options)) {
                    return new me.WebGLRenderer(options);
                }
            } catch (e) {
                console.log("Error creating WebGL renderer :" + e.message);
            }
            return new me.CanvasRenderer(options);
        }

        /*
         * PUBLIC STUFF
         */

        /**
         * Select the HTML5 Canvas renderer
         * @public
         * @name CANVAS
         * @memberOf me.video
         * @enum {Number}
         */
        api.CANVAS = 0;

        /**
         * Select the WebGL renderer
         * @public
         * @name WEBGL
         * @memberOf me.video
         * @enum {Number}
         */
        api.WEBGL = 1;

        /**
         * Auto-select the renderer (Attempt WebGL first, with fallback to Canvas)
         * @public
         * @name AUTO
         * @memberOf me.video
         * @enum {Number}
         */
        api.AUTO = 2;

        /**
         * Initialize the "video" system (create a canvas based on the given arguments, and the related renderer). <br>
         * melonJS support various scaling mode, that can be enabled <u>once the scale option is set to <b>`auto`</b></u> : <br>
         *  - <i><b>`fit`</b></i> : Letterboxed; content is scaled to design aspect ratio <br>
         * <center><img src="images/scale-fit.png"/></center><br>
         *  - <i><b>`fill-min`</b></i> : Canvas is resized to fit minimum design resolution; content is scaled to design aspect ratio <br>
         * <center><img src="images/scale-fill-min.png"/></center><br>
         *  - <i><b>`fill-max`</b></i> : Canvas is resized to fit maximum design resolution; content is scaled to design aspect ratio <br>
         * <center><img src="images/scale-fill-max.png"/></center><br>
         *  - <i><b>`flex`</b><</i> : Canvas width & height is resized to fit; content is scaled to design aspect ratio <br>
         * <center><img src="images/scale-flex.png"/></center><br>
         *  - <i><b>`flex-width`</b></i> : Canvas width is resized to fit; content is scaled to design aspect ratio <br>
         * <center><img src="images/scale-flex-width.png"/></center><br>
         *  - <i><b>`flex-height`</b></i> : Canvas height is resized to fit; content is scaled to design aspect ratio <br>
         * <center><img src="images/scale-flex-height.png"/></center><br>
         *  - <i><b>`stretch`</b></i> : Canvas is resized to fit; content is scaled to screen aspect ratio
         * <center><img src="images/scale-stretch.png"/></center><br>
         * @name init
         * @memberOf me.video
         * @function
         * @param {Number} width The width of the canvas viewport
         * @param {Number} height The height of the canvas viewport
         * @param {Object} [options] The optional video/renderer parameters.<br> (see Renderer(s) documentation for further specific options)
         * @param {String} [options.wrapper=document.body] the "div" element name to hold the canvas in the HTML file
         * @param {Number} [options.renderer=me.video.AUTO] renderer to use (me.video.CANVAS, me.video.WEBGL, me.video.AUTO)
         * @param {Boolean} [options.doubleBuffering=false] enable/disable double buffering
         * @param {Number|String} [options.scale=1.0] enable scaling of the canvas ('auto' for automatic scaling)
         * @param {String} [options.scaleMethod="fit"] screen scaling modes ('fit','fill-min','fill-max','flex','flex-width','flex-height','stretch')
         * @param {Boolean} [options.useParentDOMSize=false] on browser devices, limit the canvas width and height to its parent container dimensions as returned by getBoundingClientRect(),
         *                                                   as opposed to the browser window dimensions
         * @param {Boolean} [options.preferWebGL1=true] if false the renderer will try to use WebGL 2 if supported
         * @param {String} [options.powerPreference="default"] a hint to the user agent indicating what configuration of GPU is suitable for the WebGL context ("default", "high-performance", "low-power"). To be noted that Safari and Chrome (since version 80) both default to "low-power" to save battery life and improve the user experience on these dual-GPU machines.
         * @param {Boolean} [options.transparent=false] whether to allow transparent pixels in the front buffer (screen).
         * @param {Boolean} [options.antiAlias=false] whether to enable or not video scaling interpolation
         * @param {Boolean} [options.consoleHeader=true] whether to display melonJS version and basic device information in the console
         * @return {Boolean} false if initialization failed (canvas not supported)
         * @see me.CanvasRenderer
         * @see me.WebGLRenderer
         * @example
         * // init the video with a 640x480 canvas
         * me.video.init(640, 480, {
         *     wrapper : "screen",
         *     renderer : me.video.AUTO,
         *     scale : "auto",
         *     scaleMethod : "fit",
         *     doubleBuffering : true
         * });
         */
        api.init = function (game_width, game_height, options) {

            // ensure melonjs has been properly initialized
            if (!me.initialized) {
                throw new Error("me.video.init() called before engine initialization.");
            }

            // revert to default options if not defined
            settings = Object.assign(settings, options || {});

            // sanitize potential given parameters
            settings.width = game_width;
            settings.height = game_height;
            settings.doubleBuffering = !!(settings.doubleBuffering);
            settings.useParentDOMSize = !!(settings.useParentDOMSize);
            settings.autoScale = (settings.scale === "auto") || false;
            settings.transparent = !!(settings.transparent);
            settings.antiAlias = !!(settings.antiAlias);
            settings.failIfMajorPerformanceCaveat = !!(settings.failIfMajorPerformanceCaveat);
            settings.subPixel = !!(settings.subPixel);
            settings.verbose = !!(settings.verbose);
            if (settings.scaleMethod.search(/^(fill-(min|max)|fit|flex(-(width|height))?|stretch)$/) !== 0) {
                settings.scaleMethod = "fit";
            }

            // display melonJS version
            if (settings.consoleHeader !== false) {
                // output video information in the console
                console.log("melonJS v" + me.version + " | http://melonjs.org" );
            }

            // override renderer settings if &webgl is defined in the URL
            var uriFragment = me.utils.getUriFragment();
            if (uriFragment.webgl === true || uriFragment.webgl1 === true || uriFragment.webgl2 === true) {
                settings.renderer = api.WEBGL;
                if (uriFragment.webgl2 === true) {
                    settings.preferWebGL1 = false;
                }
            }

            // normalize scale
            settings.scale = (settings.autoScale) ? 1.0 : (+settings.scale || 1.0);
            me.sys.scale = new me.Vector2d(settings.scale, settings.scale);

            // force double buffering if scaling is required
            if (settings.autoScale || (settings.scale !== 1.0)) {
                settings.doubleBuffering = true;
            }

            // hold the requested video size ratio
            designRatio = game_width / game_height;
            designWidth = game_width;
            designHeight = game_height;

            // default scaled size value
            settings.zoomX = game_width * me.sys.scale.x;
            settings.zoomY = game_height * me.sys.scale.y;

            //add a channel for the onresize/onorientationchange event
            window.addEventListener(
                "resize",
                me.utils.function.throttle(
                    function (event) {
                        me.event.publish(me.event.WINDOW_ONRESIZE, [ event ]);
                    }, 100
                ), false
            );

            // Screen Orientation API
            window.addEventListener(
                "orientationchange",
                function (event) {
                    me.event.publish(me.event.WINDOW_ONORIENTATION_CHANGE, [ event ]);
                },
                false
            );
            // pre-fixed implementation on mozzila
            window.addEventListener(
                "onmozorientationchange",
                function (event) {
                    me.event.publish(me.event.WINDOW_ONORIENTATION_CHANGE, [ event ]);
                },
                false
            );
            if (typeof window.screen !== "undefined") {
                // is this one required ?
                window.screen.onorientationchange = function (event) {
                    me.event.publish(me.event.WINDOW_ONORIENTATION_CHANGE, [ event ]);
                };
            }

            // Automatically update relative canvas position on scroll
            window.addEventListener("scroll", me.utils.function.throttle(
                function (e) {
                    me.video.renderer.updateBounds();
                    me.event.publish(me.event.WINDOW_ONSCROLL, [ e ]);
                }, 100
            ), false);

            // register to the channel
            me.event.subscribe(
                me.event.WINDOW_ONRESIZE,
                me.video.onresize.bind(me.video)
            );
            me.event.subscribe(
                me.event.WINDOW_ONORIENTATION_CHANGE,
                me.video.onresize.bind(me.video)
            );

            try {
                /**
                 * A reference to the current video renderer
                 * @public
                 * @memberOf me.video
                 * @name renderer
                 * @type {me.Renderer|me.CanvasRenderer|me.WebGLRenderer}
                 */
                switch (settings.renderer) {
                    case api.AUTO:
                    case api.WEBGL:
                        this.renderer = autoDetectRenderer(settings);
                        break;
                    default:
                        this.renderer = new me.CanvasRenderer(settings);
                        break;
                }
            } catch (e) {
                console(e.message);
                // me.video.init() returns false if failing at creating/using a HTML5 canvas
                return false;
            }

            // add our canvas
            if (typeof settings.wrapper !== "undefined") {
                settings.wrapper = document.getElementById(settings.wrapper);
            }

            // fallback, if invalid target or non HTMLElement object
            if (!settings.wrapper)  {
              // if wrapper is not defined, add the canvas to document.body
              settings.wrapper = document.body;
            }

            settings.wrapper.appendChild(this.renderer.getScreenCanvas());

            // adjust CSS style for High-DPI devices
            var ratio = me.device.devicePixelRatio;
            if (ratio > 1) {
                this.renderer.getScreenCanvas().style.width = (this.renderer.getScreenCanvas().width / ratio) + "px";
                this.renderer.getScreenCanvas().style.height = (this.renderer.getScreenCanvas().height / ratio) + "px";
            }


            // set max the canvas max size if CSS values are defined
            if (window.getComputedStyle) {
                var style = window.getComputedStyle(this.renderer.getScreenCanvas(), null);
                me.video.setMaxSize(parseInt(style.maxWidth, 10), parseInt(style.maxHeight, 10));
            }

            // trigger an initial resize();
            me.video.onresize(true);

            // add an observer to detect when the dom tree is modified
            if ("MutationObserver" in window) {
                // Create an observer instance linked to the callback function
                var observer = new MutationObserver(me.video.onresize.bind(me.video));

                // Start observing the target node for configured mutations
                observer.observe(settings.wrapper, {
                    attributes: false, childList: true, subtree: true
                });
            }

            if (settings.consoleHeader !== false) {
                var renderType = (me.video.renderer instanceof me.CanvasRenderer) ? "CANVAS" : "WebGL" + me.video.renderer.WebGLVersion;
                var audioType = me.device.hasWebAudio ? "Web Audio" : "HTML5 Audio";
                var gpu_renderer = (typeof me.video.renderer.GPURenderer === "string") ? " (" + me.video.renderer.GPURenderer + ")" : "";
                // output video information in the console
                console.log(
                    renderType + " renderer" + gpu_renderer + " | " +
                    audioType + " | " +
                    "pixel ratio " + me.device.devicePixelRatio + " | " +
                    (me.device.isMobile ? "mobile" : "desktop") + " | " +
                    me.device.getScreenOrientation() + " | " +
                    me.device.language
                );
                console.log( "resolution: " + "requested " + game_width + "x" + game_height +
                    ", got " + me.video.renderer.getWidth() + "x" + me.video.renderer.getHeight()
                );
            }

            // notify the video has been initialized
            me.event.publish(me.event.VIDEO_INIT);

            return true;
        };

        /**
         * set the max canvas display size (when scaling)
         * @name setMaxSize
         * @memberOf me.video
         * @function
         * @param {Number} width width
         * @param {Number} height height
         */
        api.setMaxSize = function (w, h) {
            // max display size
            maxWidth = w || Infinity;
            maxHeight = h || Infinity;
            // trigger a resize
            // defer it to ensure everything is properly intialized
            me.utils.function.defer(me.video.onresize, me.video);
        };

        /**
         * Create and return a new Canvas element
         * @name createCanvas
         * @memberOf me.video
         * @function
         * @param {Number} width width
         * @param {Number} height height
         * @param {Boolean} [offscreen=false] will returns an OffscreenCanvas if supported
         * @return {HTMLCanvasElement|OffscreenCanvas}
         */
        api.createCanvas = function (width, height, offscreen) {
            var _canvas;

            if (width === 0 || height === 0) {
                throw new Error("width or height was zero, Canvas could not be initialized !");
            }

            if (me.device.OffscreenCanvas === true && offscreen === true) {
                _canvas = new OffscreenCanvas(0, 0);
                // stubbing style for compatibility,
                // as OffscreenCanvas is detached from the DOM
                if (typeof _canvas.style === "undefined") {
                    _canvas.style = {};
                }
            } else {
                // "else" create a "standard" canvas
                _canvas = document.createElement("canvas");
            }
            _canvas.width = width;
            _canvas.height = height;

            return _canvas;
        };

        /**
         * return a reference to the wrapper
         * @name getWrapper
         * @memberOf me.video
         * @function
         * @return {Document}
         */
        api.getWrapper = function () {
            return settings.wrapper;
        };

        /**
         * callback for window resize event
         * @param {Boolean} force force immediate resize
         * @param force force immediate resize
         * @ignore
         */
        api.onresize = function (force) {
            // default (no scaling)
            var scaleX = 1, scaleY = 1;

            if (settings.autoScale) {
                var parentNodeWidth;
                var parentNodeHeight;
                var parentNode = me.video.renderer.getScreenCanvas().parentNode;
                if (typeof (parentNode) !== "undefined") {
                    if (settings.useParentDOMSize && typeof parentNode.getBoundingClientRect === "function") {
                        var rect = parentNode.getBoundingClientRect();
                        parentNodeWidth = rect.width || (rect.right - rect.left);
                        parentNodeHeight = rect.height || (rect.bottom - rect.top);
                    } else {
                        // for cased where DOM is not implemented and so parentNode (e.g. Ejecta, Weixin)
                        parentNodeWidth = parentNode.width;
                        parentNodeHeight = parentNode.height;
                    }
                }
                var _max_width = Math.floor(Math.min(maxWidth, parentNodeWidth || window.innerWidth));
                var _max_height = Math.floor(Math.min(maxHeight, parentNodeHeight || window.innerHeight));
                var screenRatio = _max_width / _max_height;

                if ((settings.scaleMethod === "fill-min" && screenRatio > designRatio) ||
                    (settings.scaleMethod === "fill-max" && screenRatio < designRatio) ||
                    (settings.scaleMethod === "flex-width")
                ) {
                    // resize the display canvas to fill the parent container
                    var sWidth = Math.min(maxWidth, designHeight * screenRatio);
                    scaleX = scaleY = _max_width / sWidth;
                    sWidth = ~~(sWidth + 0.5);
                    this.renderer.resize(sWidth, designHeight);
                }
                else if ((settings.scaleMethod === "fill-min" && screenRatio < designRatio) ||
                         (settings.scaleMethod === "fill-max" && screenRatio > designRatio) ||
                         (settings.scaleMethod === "flex-height")
                ) {
                    // resize the display canvas to fill the parent container
                    var sHeight = Math.min(maxHeight, designWidth * (_max_height / _max_width));
                    scaleX = scaleY = _max_height / sHeight;
                    sHeight = ~~(sHeight + 0.5);
                    this.renderer.resize(designWidth, sHeight);
                }
                else if (settings.scaleMethod === "flex") {
                    // resize the display canvas to fill the parent container
                    this.renderer.resize(_max_width, _max_height);
                }
                else if (settings.scaleMethod === "stretch") {
                    // scale the display canvas to fit with the parent container
                    scaleX = _max_width / designWidth;
                    scaleY = _max_height / designHeight;
                }
                else {
                    // scale the display canvas to fit the parent container
                    // make sure we maintain the original aspect ratio
                    if (screenRatio < designRatio) {
                        scaleX = scaleY = _max_width / designWidth;
                    }
                    else {
                        scaleX = scaleY = _max_height / designHeight;
                    }
                }

                // adjust scaling ratio based on the device pixel ratio
                scaleX *= me.device.devicePixelRatio;
                scaleY *= me.device.devicePixelRatio;


                if (deferResizeId > 0) {
                    // cancel any previous pending resize
                    clearTimeout(deferResizeId);
                }
                if (force !== true) {
                    deferResizeId = me.utils.function.defer(me.video.scale, this, scaleX, scaleY);
                } else {
                    me.video.scale(scaleX, scaleY);
                }
            }

            // update parent container bounds
            this.renderer.updateBounds();
        };

        /**
         * scale the "displayed" canvas by the given scalar.
         * this will modify the size of canvas element directly.
         * Only use this if you are not using the automatic scaling feature.
         * @name scale
         * @memberOf me.video
         * @function
         * @see me.video.init
         * @param {Number} x x scaling multiplier
         * @param {Number} y y scaling multiplier
         */
        api.scale = function (x, y) {
            var canvas = this.renderer.getScreenCanvas();
            var context = this.renderer.getScreenContext();
            var settings = this.renderer.settings;
            var w = canvas.width * x;
            var h = canvas.height * y;

            // update the global scale variable
            me.sys.scale.set(x, y);

            // adjust CSS style for High-DPI devices
            if (me.device.devicePixelRatio > 1) {
                canvas.style.width = (w / me.device.devicePixelRatio) + "px";
                canvas.style.height = (h / me.device.devicePixelRatio) + "px";
            } else {
                canvas.style.width = w + "px";
                canvas.style.height = h + "px";
            }
            // if anti-alias and blend mode were resetted (e.g. Canvas mode)
            this.renderer.setAntiAlias(context, settings.antiAlias);
            this.renderer.setBlendMode(settings.blendMode, context);

            // update parent container bounds
            this.renderer.updateBounds();

            // force repaint
            me.game.repaint();

            // clear timeout id if defined
            deferResizeId = -1;
        };

        // return our api
        return api;
    })();

})();
