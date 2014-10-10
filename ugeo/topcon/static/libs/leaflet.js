L={};
L.Util = {
    extend: function (dest) {
        var sources = Array.prototype.slice.call(arguments, 1);
        for (var j = 0, len = sources.length, src; j < len; j++) {
            src = sources[j] || {};
            for (var i in src) {
                if (src.hasOwnProperty && src.hasOwnProperty(i)) {
                    dest[i] = src[i];
                }
            }
        }
        return dest;
    },

    applyDefaults: function (to, from) {
        to = to || {};
        
        var fromIsEvt = typeof window.Event == "function"
                        && from instanceof window.Event;

        for (var key in from) {
            if (to[key] === undefined ||
                (!fromIsEvt && from.hasOwnProperty
                 && from.hasOwnProperty(key) && !to.hasOwnProperty(key))) {
                to[key] = from[key];
            }
        }
        
        if(!fromIsEvt && from && from.hasOwnProperty
           && from.hasOwnProperty('toString') && !to.hasOwnProperty('toString')) {
            to.toString = from.toString;
        }
        
        return to;
    },
    
    bind: function (/*Function*/ fn, /*Object*/ obj) /*-> Object*/ {
        var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
        return function () {
            return fn.apply(obj, args || arguments);
        };
    },

    tryFuncs: function() {
        var returnValue = null;

        for (var i=0, len=arguments.length; i<len; i++) {
          var lambda = arguments[i];
          try {
            returnValue = lambda();
            break;
          } catch (e) {}
        }
        return returnValue;
    },
    getParameterString: function(params) {
        var paramsArray = [];
        
        for (var key in params) {
          var value = params[key];
          if ((value != null) && (typeof value != 'function')) {
            var encodedValue;
            if (typeof value == 'object' && value.constructor == Array) {
              /* value is an array; encode items and separate with "," */
              var encodedItemArray = [];
              var item;
              for (var itemIndex=0, len=value.length; itemIndex<len; itemIndex++) {
                item = value[itemIndex];
                encodedItemArray.push(encodeURIComponent(
                    (item === null || item === undefined) ? "" : item)
                );
              }
              encodedValue = encodedItemArray.join(",");
            }
            else {
              /* value is a string; simply encode */
              encodedValue = encodeURIComponent(value);
            }
            paramsArray.push(encodeURIComponent(key) + "=" + encodedValue);
          }
        }
        
        return paramsArray.join("&");
    },
    
    containsStr: function(str, sub){
        return (str.indexOf(sub) != -1);
    },
    
    getParameters: function(url) {
        // if no url specified, take it from the location bar
        url = (url === null || url === undefined) ? window.location.href : url;

        //parse out parameters portion of url string
        var paramsString = "";
        if (L.Util.containsStr(url, '?')) {
            var start = url.indexOf('?') + 1;
            var end = L.Util.containsStr(url, "#") ?
                        url.indexOf('#') : url.length;
            paramsString = url.substring(start, end);
        }

        var parameters = {};
        var pairs = paramsString.split(/[&;]/);
        for(var i=0, len=pairs.length; i<len; ++i) {
            var keyValue = pairs[i].split('=');
            if (keyValue[0]) {

                var key = keyValue[0];
                try {
                    key = decodeURIComponent(key);
                } catch (err) {
                    key = unescape(key);
                }
                
                // being liberal by replacing "+" with " "
                var value = (keyValue[1] || '').replace(/\+/g, " ");

                try {
                    value = decodeURIComponent(value);
                } catch (err) {
                    value = unescape(value);
                }
                
                // follow OGC convention of comma delimited values
                value = value.split(",");

                //if there's only one value, do not return as array                    
                if (value.length == 1) {
                    value = value[0];
                }                
                
                parameters[key] = value;
             }
         }
        return parameters;
    },

    urlAppend: function(url, paramStr) {
        var newUrl = url;
        if(paramStr) {
            var parts = (url + " ").split(/[?&]/);
            newUrl += (parts.pop() === " " ?
                paramStr :
                parts.length ? "&" + paramStr : "?" + paramStr);
        }
        return newUrl;
    },

    upperCaseObject: function (object) {
        var uObject = {};
        for (var key in object) {
            uObject[key.toUpperCase()] = object[key];
        }
        return uObject;
    },

    createUrlObject: function(url, options) {
        options = options || {};

        // deal with relative urls first
        if(!(/^\w+:\/\//).test(url)) {
            var loc = window.location;
            var port = loc.port ? ":" + loc.port : "";
            var fullUrl = loc.protocol + "//" + loc.host.split(":").shift() + port;
            if(url.indexOf("/") === 0) {
                // full pathname
                url = fullUrl + url;
            } else {
                // relative to current path
                var parts = loc.pathname.split("/");
                parts.pop();
                url = fullUrl + parts.join("/") + "/" + url;
            }
        }
      
        if (options.ignoreCase) {
            url = url.toLowerCase(); 
        }

        var a = document.createElement('a');
        a.href = url;
        
        var urlObject = {};
        
        //host (without port)
        urlObject.host = a.host.split(":").shift();

        //protocol
        urlObject.protocol = a.protocol;  

        //port (get uniform browser behavior with port 80 here)
        if(options.ignorePort80) {
            urlObject.port = (a.port == "80" || a.port == "0") ? "" : a.port;
        } else {
            urlObject.port = (a.port == "" || a.port == "0") ? "80" : a.port;
        }

        //hash
        urlObject.hash = (options.ignoreHash || a.hash === "#") ? "" : a.hash;  
        
        //args
        var queryString = a.search;
        if (!queryString) {
            var qMark = url.indexOf("?");
            queryString = (qMark != -1) ? url.substr(qMark) : "";
        }
        urlObject.args = L.Util.getParameters(queryString);

        //pathname (uniform browser behavior with leading "/")
        urlObject.pathname = (a.pathname.charAt(0) == "/") ? a.pathname : "/" + a.pathname;
        
        return urlObject; 
    },

    stamp: (function () {
        var lastId = 0, key = '_leaflet_id';
        return function (/*Object*/ obj) {
            obj[key] = obj[key] || "_leaflet_id_" + (++lastId);
            return obj[key];
        };
    }()),

    limitExecByInterval: function (fn, time, context) {
        var lock, execOnUnlock, args;
        function exec() {
            lock = false;
            if (execOnUnlock) {
                args.callee.apply(context, args);
                execOnUnlock = false;
            }
        }
        return function () {
            args = arguments;
            if (!lock) {
                lock = true;
                setTimeout(exec, time);
                fn.apply(context, args);
            } else {
                execOnUnlock = true;
            }
        };
    },

    normalizeScale: function (scale) {
        var normScale = (scale > 1.0) ? (1.0 / scale) 
                                  : scale;
        return normScale;
    },

    getSuiteIndex: function(value, arr, unsortTag) {
        if(!arr || !(arr.length)){
            return -1;
        }
        if(unsortTag)
            arr.sort(function(a, b) {
                    return (b - a);
                });
        var i, tmpValue,tmpdist, resultIndex =0, len = arr.length, curDist = null;
        for(i = 0; i < len; i++){
            tmpValue = arr[i];
            tmpdist = Math.abs(tmpValue - value);
            if(i == 0){
                curDist = tmpdist;
                resultIndex = i;
                continue;
            }
            if(tmpdist > curDist){
                break;
            }
            curDist = tmpdist;
            resultIndex = i;
        }
        return resultIndex;
    },
    
    formatNum: function (num, digits) {
        var pow = Math.pow(10, digits || 5);
        return Math.round(num * pow) / pow;
    },

    getParamString: function (obj) {
        var params = [];
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                params.push(i + '=' + obj[i]);
            }
        }
        return '?' + params.join('&');
    },

    template: function (str, data) {
        return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
            var value = data[key];
            if (!data.hasOwnProperty(key)) {
                throw new Error('No value provided for variable ' + str);
            }
            return value;
        });
    },

    setOptions: function (obj, options, addToObj) {
        obj.options = L.Util.extend({}, obj.options, options);
        if(addToObj)
            L.Util.extend(obj, obj.options);
        return obj.options;
    },
    
    falseFn: function () {
        return false;
    },
    
    getTime: Date.now || function () {
                return +new Date();
            },
            
    checkInArray: function (key, arr) {
        if(!arr)return false;
        var i, len = arr.length;
        for(i = 0; i < len; i++){
            if(arr[i] == key)
                return true;
        }
        return false;
    },
    /*
    *Browser Utility
    */
    Browser:(function () {
        var ua = navigator.userAgent.toLowerCase(),
        ie = !!window.ActiveXObject,
        ie6 = ie && !window.XMLHttpRequest,
        ie7 = ie && !document.querySelector,
        webkit = ua.indexOf("webkit") !== -1,
        safari = ua.indexOf("safari") !== -1,
        firefox = ua.indexOf("firefox") !== -1,
        mobile = typeof orientation !== undefined + '',
        chrome = ua.indexOf("chrome") !== -1,
        android = ua.indexOf("android") !== -1,
        android23 = ua.search("android [23]") !== -1,
        msTouch = (window.navigator && window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints),
        retina = false,
        doc = document.documentElement,
        ie3d = ie && ('transition' in doc.style),
        webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()),
        gecko3d = 'MozPerspective' in doc.style,
        opera3d = 'OTransition' in doc.style,
        opera = window.opera,
        any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d || opera3d);
        
        var touch = !window.L_NO_TOUCH && (function () {
            var startName = 'ontouchstart';
            // IE10+ (We simulate these into touch* events in L.DomEvent and L.DomEvent.MsTouch) or WebKit, etc.
            if (msTouch || (startName in doc)) {
                return true;
            }

            // Firefox/Gecko
            var div = document.createElement('div'),
                supported = false;

            if (!div.setAttribute) {
                return false;
            }
            div.setAttribute(startName, 'return;');

            if (typeof div[startName] === 'function') {
                supported = true;
            }

            div.removeAttribute(startName);
            div = null;

            return supported;
        }());
        var svg = !!(document.createElementNS && document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect);
        var vml = !svg && (function () {
                    try {
                        var div = document.createElement('div');
                        div.innerHTML = '<v:shape adj="1"/>';

                        var shape = div.firstChild;
                        shape.style.behavior = 'url(#default#VML)';

                        return shape && (typeof shape.adj === 'object');

                    } catch (e) {
                        return false;
                    }
                }());

        return {
            ie: ie,
            ie6: ie6,
            ie7: ie7,
            webkit: webkit,

            android: android,
            android23: android23,
            chrome: chrome,
            opera: opera,
            safari: safari,
            firefox: firefox,

            ie3d: ie3d,
            webkit3d: webkit3d,
            gecko3d: gecko3d,
            opera3d: opera3d,
            any3d: any3d,
            
            mobile: mobile,
            mobileWebkit: mobile && webkit,
            mobileWebkit3d: mobile && webkit3d,
            mobileOpera: mobile && !!window.opera,
            
            touch: touch,
            msTouch: msTouch,
            
            canvas: (function () {
                        return !!document.createElement('canvas').getContext;
                    }()),
            svg: svg,
            vml: vml
        };
           
    }()),
    
    INCHES_PER_UNIT:{
        'inches': 1.0,
        'in': 1.0,
        'ft': 12.0,
        'mi': 63360.0,
        'm': 39.3701,
        'km': 39370.1,
        'dd': 4382659,
        'degrees': 4382659,
        'yd': 36,
        'nmi':72913.4252
    },
    DOTS_PER_INCH : 96,
    MaxBgTileCount:30,
    
    getFitDist: function(len, srcUnits, destUnits) {
        srcUnits = srcUnits.toLowerCase();
        destUnits = destUnits.toLowerCase();
        
        if(L.Util.INCHES_PER_UNIT[srcUnits] && L.Util.INCHES_PER_UNIT[destUnits]){
            return len * L.Util.INCHES_PER_UNIT[srcUnits] / L.Util.INCHES_PER_UNIT[destUnits];
        }
        return len;
    },
    
    /*
    * DOM Utility
    */
    get: function (id) {
        return (typeof id === 'string' ? document.getElementById(id) : id);
    },

    getDistByUnits: function (p1, p2, srcUnits, destUnits) {
        var len = 0;
        srcUnits = srcUnits || "m";
        destUnits = destUnits || "m";
        if(!p1 || !p2 || !(p1 instanceof L.Loc) || !(p2 instanceof L.Loc)){
            len = 0;
        }
        else{
            srcUnits = srcUnits.toLowerCase();
            if(srcUnits == "dd" || srcUnits == "degrees"){
                len = L.Util._distanceByLnglat(p1.x, p1.y, p2.x, p2.y);
                len = L.Util.getFitDist(len, "m", destUnits);
            }
            else{
                len = p1.distanceTo(p2);
                len = L.Util.getFitDist(len, srcUnits, destUnits);
            }
        }
        return len;
    },
    
    _distanceByLnglat: function(lng1,lat1,lng2,lat2) {
        var radLat1 = L.Util._Rad(lat1); 
        var radLat2 = L.Util._Rad(lat2); 
        var a = radLat1 - radLat2; 
        var b = L.Util._Rad(lng1) - L.Util._Rad(lng2); 
        var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2))); 
        s = s * 6378137.0; 
        s = Math.round(s * 10000) / 10000; 
        return s; 
    },
    
    _Rad: function(d) { 
        return d * Math.PI / 180.0; 
    },
    
    getAreaByUnits: function (points, MapUnits, distUnits) {
        if(!points)
            return 0;
        distUnits = distUnits || "km";
        var mtotalArea = 0;
        if(MapUnits)
            MapUnits = MapUnits.toLowerCase();
        var Count = points.length;
        if(Count < 3)
            return mtotalArea;
        var PointX = [];
        var PointY = [];
        for(var i = 0; i < Count; i++){
            var tmpPoi = points[i];
            if(tmpPoi){
                PointX.push(tmpPoi.x);
                PointY.push(tmpPoi.y);
            }
        }
        for(var i=0;i<Count-1;){
            if(PointX[i] == PointX[i+1] && PointY[i] == PointY[i+1]){
                PointX.splice(i,1);
                PointY.splice(i,1);
                Count--;
                continue;
            }
            i++;
        }

        if(MapUnits=="degrees" || MapUnits == "dd"){
            var LowX=0.0;
            var LowY=0.0;
            var MiddleX=0.0;
            var MiddleY=0.0;            
            var HighX=0.0;
            var HighY=0.0;

            var AM = 0.0;        
            var BM = 0.0;    
            var CM = 0.0;            

            var AL = 0.0;        
            var BL = 0.0;    
            var CL = 0.0;        
    
            var AH = 0.0;        
            var BH = 0.0;    
            var CH = 0.0;            

            var CoefficientL = 0.0;
            var CoefficientH = 0.0;        
                        
            var ALtangent = 0.0;        
            var BLtangent = 0.0;    
            var CLtangent = 0.0;    

            var AHtangent = 0.0;        
            var BHtangent = 0.0;    
            var CHtangent = 0.0;
                                    
            var ANormalLine = 0.0;        
            var BNormalLine = 0.0;    
            var CNormalLine = 0.0;
                                                
            var OrientationValue = 0.0;   
          
            var AngleCos = 0.0;

            var Sum1 = 0.0; 
            var Sum2 = 0.0; 
            var Count2 = 0;           
            var Count1 = 0; 
      
          
            var Sum = 0.0;
            var Radius = 6378137; 
            
            
      
            for(var i=0;i<Count;i++){
                if(i==0){
                    LowX = PointX[Count-1] * Math.PI / 180;
                    LowY = PointY[Count-1] * Math.PI / 180;    
                    MiddleX = PointX[0] * Math.PI / 180;
                    MiddleY = PointY[0] * Math.PI / 180;
                    HighX = PointX[1] * Math.PI / 180;
                    HighY = PointY[1] * Math.PI / 180;
                }
                else if(i==Count-1){
                    LowX = PointX[Count-2] * Math.PI / 180;
                    LowY = PointY[Count-2] * Math.PI / 180;    
                    MiddleX = PointX[Count-1] * Math.PI / 180;
                    MiddleY = PointY[Count-1] * Math.PI / 180;            
                    HighX = PointX[0] * Math.PI / 180;
                    HighY = PointY[0] * Math.PI / 180;                        
                }
                else{
                    LowX = PointX[i-1] * Math.PI / 180;
                    LowY = PointY[i-1] * Math.PI / 180;    
                    MiddleX = PointX[i] * Math.PI / 180;
                    MiddleY = PointY[i] * Math.PI / 180;            
                    HighX = PointX[i+1] * Math.PI / 180;
                    HighY = PointY[i+1] * Math.PI / 180;                            
                }
    
                AM = Math.cos(MiddleY) * Math.cos(MiddleX);
                BM = Math.cos(MiddleY) * Math.sin(MiddleX);
                CM = Math.sin(MiddleY);
                AL = Math.cos(LowY) * Math.cos(LowX);
                BL = Math.cos(LowY) * Math.sin(LowX);
                CL = Math.sin(LowY);
                AH = Math.cos(HighY) * Math.cos(HighX);
                BH = Math.cos(HighY) * Math.sin(HighX);
                CH = Math.sin(HighY);        
                                
                    
                CoefficientL = (AM*AM + BM*BM + CM*CM)/(AM*AL + BM*BL + CM*CL);
                CoefficientH = (AM*AM + BM*BM + CM*CM)/(AM*AH + BM*BH + CM*CH);
                
                ALtangent = CoefficientL * AL - AM;
                BLtangent = CoefficientL * BL - BM;
                CLtangent = CoefficientL * CL - CM;
                AHtangent = CoefficientH * AH - AM;
                BHtangent = CoefficientH * BH - BM;
                CHtangent = CoefficientH * CH - CM;                
                
                AngleCos = (AHtangent * ALtangent + BHtangent * BLtangent + CHtangent * CLtangent)/(Math.sqrt(AHtangent * AHtangent + BHtangent * BHtangent +CHtangent * CHtangent) * Math.sqrt(ALtangent * ALtangent + BLtangent * BLtangent +CLtangent * CLtangent));
                
                AngleCos = Math.acos(AngleCos);
                
                ANormalLine = BHtangent * CLtangent - CHtangent * BLtangent;
                BNormalLine = 0 - (AHtangent * CLtangent - CHtangent * ALtangent); 
                CNormalLine = AHtangent * BLtangent - BHtangent * ALtangent;
                
                if(AM!=0)            
                    OrientationValue = ANormalLine/AM;
                else if(BM!=0)                    
                    OrientationValue = BNormalLine/BM;
                else
                    OrientationValue = CNormalLine/CM;
                        
                if(OrientationValue>0) {
                    Sum1 += AngleCos;
                    Count1++;
                }
                else{
                    Sum2 += AngleCos;
                    Count2++;
                    //Sum +=2*Math.PI-AngleCos;
                }

            }
                
            if(Sum1>Sum2){
                Sum = Sum1+(2*Math.PI*Count2-Sum2);
            }
            else{
                Sum = (2*Math.PI*Count1-Sum1)+Sum2;
            }
            
            //平方米
            mtotalArea = (Sum-(Count-2)*Math.PI)*Radius*Radius;
            MapUnits = "m";
        }
        else{
            var ppx,ppy,sum = 0;
            var cpx = PointX[0];
            var cpy = PointY[0];
            var npx = PointX[1];
            var npy = PointY[1];
            var x0 = cpx;
                npx -= x0;
            
            for(var i = 1; i < Count; i++){
                ppy = cpy;
                cpx = npx;
                cpy = npy;
                npx = PointX[i];
                npy = PointY[i];
                npx -= x0;
                sum += cpx * (npy - ppy);
            }
            mtotalArea = -sum/2.0;
        
        }
        
        var inPerMapUnit = L.Util.INCHES_PER_UNIT[MapUnits];
        mtotalArea *= Math.pow((inPerMapUnit / L.Util.INCHES_PER_UNIT[distUnits]), 2);
        return mtotalArea;
    },
    
    getStyle: function (el, style) {
        var value = el.style[style];
        if (!value && el.currentStyle) {
            value = el.currentStyle[style];
        }
        if (!value || value === 'auto') {
            var css = document.defaultView.getComputedStyle(el, null);
            value = css ? css[style] : null;
        }
        return (value === 'auto' ? null : value);
    },

    getViewportOffset: function (element) {
        var top = 0,
            left = 0,
            el = element,
            docBody = document.body;

        do {
            top += el.offsetTop || 0;
            left += el.offsetLeft || 0;

            if (el.offsetParent === docBody &&
                    L.Util.getStyle(el, 'position') === 'absolute') {
                break;
            }
            el = el.offsetParent;
        } while (el);

        el = element;

        do {
            if (el === docBody) {
                break;
            }

            top -= el.scrollTop || 0;
            left -= el.scrollLeft || 0;

            el = el.parentNode;
        } while (el);

        return new L.Loc(left, top);
    },

    create: function (tagName, className, container) {
        var el = document.createElement(tagName);
        if (className) {
            el.className = className;
        }
        if (container) {
            container.appendChild(el);
        }
        return el;
    },

    disableTextSelection: function () {
        if (document.selection && document.selection.empty) {
            document.selection.empty();
        }
        if (!this._onselectstart) {
            this._onselectstart = document.onselectstart;
            document.onselectstart = L.Util.falseFn;
        }
    },

    enableTextSelection: function () {
        document.onselectstart = this._onselectstart;
        this._onselectstart = null;
    },

    hasClass: function (el, name) {
        return el && el.className && (el.className.length > 0) &&
                new RegExp("(^|\\s)" + name + "(\\s|$)").test(el.className);
    },
    
    setClass:function (el, name) {
        if (el && name) {
            el.className = name;
        }
    },

    addClass: function (el, name) {
        if (!L.Util.hasClass(el, name)) {
            el.className += (el.className ? ' ' : '') + name;
        }
    },

    removeClass: function (el, name) {
        if(!el || !el.className)return;
        var str = el.className.replace(/(\S+)\s*/g, function (w, match) {
            if (match === name) {
                return '';
            }
            return w;
        }).replace(/^\s+/, '');
        str = str.replace(name, "");
        str = str.replace(/^\s+|\s+$/g,'');
        el.className = str;
    },

    setOpacity: function (el, value) {
        if (L.Util.Browser.ie) {
            el.style.filter = 'alpha(opacity=' + Math.round(value * 100) + ')';
        } else {
            el.style.opacity = value;
        }
    },

   
    testProp: function (props) {
        var style = document.documentElement.style;

        for (var i = 0; i < props.length; i++) {
            if (props[i] in style) {
                return props[i];
            }
        }
        return false;
    },

    getTranslateString: function (point) {
        var is3d =  L.Util.Browser.webkit3d,
            open = 'translate' + (is3d ? '3d' : '') + '(',
            close = (is3d ? ',0' : '') + ')';

        return open + point.x + 'px,' + point.y + 'px' + close;
    },

    getScaleString: function (scale, origin) {
        var preTranslateStr = L.Util.getTranslateString(origin.add(origin.multiplyBy(-1 * scale))),
            scaleStr = ' scale(' + scale + ') ';

        return preTranslateStr + scaleStr;
    },

    setPosition: function (el, point, disable3D, nonpTag) {
        if(!el)return;
        if(!nonpTag)
            el._leaflet_pos = point;
        if (!disable3D && L.Util.Browser.any3d) {
            el.style[L.Util.TRANSFORM] =  L.Util.getTranslateString(point);
            if (L.Util.Browser.mobileWebkit3d) {
                el.style['-webkit-backface-visibility'] = 'hidden';
            }
        }
        else {
            if(isNaN(point.x) || isNaN(point.y))
                return;
            el.style.left = point.x + 'px';
            el.style.top = point.y + 'px';
        }
    },

    getPosition: function (el, nonmtag) {
        if(!el) return null;
        var res = el._leaflet_pos || null;
        if(nonmtag){
            if(el.style[L.Util.TRANSFORM]){
                var ttStr = el.style[L.Util.TRANSFORM];
                if(ttStr){
                    var startIndex = L.Util.TRANSLATE_OPEN.length;
                    var len = ttStr.length - L.Util.TRANSLATE_CLOSE.length - startIndex;
                    var posStr = ttStr.substr(startIndex, len); 
                    var splitIndex = posStr.indexOf(",");
                    if(splitIndex !== -1){
                        var xStr = posStr.substr(0, splitIndex);
                        var yStr = posStr.substr(splitIndex + 1, posStr.length - splitIndex - 1);
                        res = res || new L.Loc();
                        res.x = parseInt(xStr);
                        res.y = parseInt(yStr);
                    }
                }
            }
            else {
                res = res || new L.Loc();
                res.x = parseInt(el.style.left);
                res.y = parseInt(el.style.top);
            }
           
        }
        return res;
    },
    
    getBezierPos: function (t, easTag) {
        var easeObj = {
            'ease': [0.25, 0.1, 0.25, 1.0],
            'linear': [0.0, 0.0, 1.0, 1.0],
            'ease-in': [0.42, 0, 1.0, 1.0],
            'ease-out': [0, 0, 0.58, 1.0],
            'ease-in-out': [0.42, 0, 0.58, 1.0],
            'ease-t': [0, 0, 0.58, 1.0]
        };
        var easings = easeObj[easTag] || easeObj.ease;
        this._p1 = new L.Loc(0, 0);
        this._p2 = new L.Loc(easings[0], easings[1]);
        this._p3 = new L.Loc(easings[2], easings[3]);
        this._p4 = new L.Loc(1, 1);
        var a = Math.pow(1 - t, 3),
            b = 3 * Math.pow(1 - t, 2) * t,
            c = 3 * (1 - t) * Math.pow(t, 2),
            d = Math.pow(t, 3),
            p1 = this._p1.multiplyBy(a),
            p2 = this._p2.multiplyBy(b),
            p3 = this._p3.multiplyBy(c),
            p4 = this._p4.multiplyBy(d);

        return p1.add(p2).add(p3).add(p4).y;
    },
    
    clearAllNode: function (parentNode){
        if(parentNode){
            while (parentNode.firstChild) {
                var oldNode = parentNode.removeChild(parentNode.firstChild);
                oldNode = null;
            }
            parentNode.empty = true;
            parentNode.innerHTML = '';
        }
    },
    
    defaultImageUrl: ''
};
L.Util.TRANSITION = L.Util.testProp(['transition', 'webkitTransition', 'OTransition', 'MozTransition', 'msTransition']);
L.Util.ISTRANSITIONVALID = !!L.Util.TRANSITION;
L.Util.TRANSFORM =  L.Util.testProp(['WebkitTransform', 'OTransform', 'MozTransform', 'msTransform','transform']);
L.Util.TRANSITION_END = L.Util.TRANSITION === 'webkitTransition' || L.Util.TRANSITION === 'MozTransform' || L.Util.TRANSITION === 'OTransition' ? L.Util.TRANSITION + 'End' : 'transitionend';
L.Util.TRANSLATE_OPEN = 'translate' + (L.Util.Browser.webkit3d ? '3d(' : '(');
L.Util.TRANSLATE_CLOSE = L.Util.Browser.webkit3d ? ',0)' : ')';
L.Util.LineUtil = {
    simplify: function (/*Point[]*/ points, /*Number*/ tolerance) {
        if (!tolerance || !points.length) {
            return points.slice();
        }

        var sqTolerance = tolerance * tolerance;

        // stage 1: vertex reduction
        points = this._reducePoints(points, sqTolerance);

        // stage 2: Douglas-Peucker simplification
        points = this._simplifyDP(points, sqTolerance);

        return points;
    },


    pointToSegmentDistance:  function (/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
        return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
    },

    closestPointOnSegment: function (/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
        return this._sqClosestPointOnSegment(p, p1, p2);
    },

    // Douglas-Peucker simplification, see http://en.wikipedia.org/wiki/Douglas-Peucker_algorithm
    _simplifyDP: function (points, sqTolerance) {

        var len = points.length,
            ArrayConstructor = typeof Uint8Array !== undefined ? Uint8Array : Array,
            markers = new ArrayConstructor(len);

        markers[0] = markers[len - 1] = 1;

        this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

        var i,
            newPoints = [];

        for (i = 0; i < len; i++) {
            if (markers[i]) {
                newPoints.push(points[i]);
            }
        }

        return newPoints;
    },

    _simplifyDPStep: function (points, markers, sqTolerance, first, last) {

        var maxSqDist = 0,
            index, i, sqDist;

        for (i = first + 1; i <= last - 1; i++) {
            sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            markers[index] = 1;

            this._simplifyDPStep(points, markers, sqTolerance, first, index);
            this._simplifyDPStep(points, markers, sqTolerance, index, last);
        }
    },

    // reduce points that are too close to each other to a single point
    _reducePoints: function (points, sqTolerance) {
        var reducedPoints = [points[0]];

        for (var i = 1, prev = 0, len = points.length; i < len; i++) {
            if (this._sqDist(points[i], points[prev]) > sqTolerance) {
                reducedPoints.push(points[i]);
                prev = i;
            }
        }
        if (prev < len - 1) {
            reducedPoints.push(points[len - 1]);
        }
        return reducedPoints;
    },

    /*jshint bitwise:false */ // temporarily allow bitwise oprations

    // Cohen-Sutherland line clipping algorithm.
    // Used to avoid rendering parts of a polyline that are not currently visible.

    clipSegment: function (a, b, bounds, useLastCode) {
        var min = bounds.getLowerPoint(),
            max = bounds.getUpperPoint();

        var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds),
            codeB = this._getBitCode(b, bounds);

        // save 2nd code to avoid calculating it on the next segment
        this._lastCode = codeB;

        while (true) {
            // if a,b is inside the clip window (trivial accept)
            if (!(codeA | codeB)) {
                return [a, b];
            // if a,b is outside the clip window (trivial reject)
            } else if (codeA & codeB) {
                return false;
            // other cases
            } else {
                var codeOut = codeA || codeB,
                    p = this._getEdgeIntersection(a, b, codeOut, bounds),
                    newCode = this._getBitCode(p, bounds);

                if (codeOut === codeA) {
                    a = p;
                    codeA = newCode;
                } else {
                    b = p;
                    codeB = newCode;
                }
            }
        }
    },

    _getEdgeIntersection: function (a, b, code, bounds) {
        var dx = b.x - a.x,
            dy = b.y - a.y,
            min = bounds.getLowerPoint(),
            max = bounds.getUpperPoint();

        if (code & 8) { // top
            return new L.Loc(a.x + dx * (max.y - a.y) / dy, max.y);
        } else if (code & 4) { // bottom
            return new L.Loc(a.x + dx * (min.y - a.y) / dy, min.y);
        } else if (code & 2) { // right
            return new L.Loc(max.x, a.y + dy * (max.x - a.x) / dx);
        } else if (code & 1) { // left
            return new L.Loc(min.x, a.y + dy * (min.x - a.x) / dx);
        }
    },

    _getBitCode: function (/*Point*/ p, bounds) {
        var code = 0;

        if (p.x < bounds.minX) { // left
            code |= 1;
        } else if (p.x > bounds.maxX) { // right
            code |= 2;
        }
        if (p.y < bounds.minY) { // bottom
            code |= 4;
        } else if (p.y > bounds.maxY) { // top
            code |= 8;
        }

        return code;
    },

    _sqDist: function (p1, p2) {
        var dx = p2.x - p1.x,
            dy = p2.y - p1.y;
        return dx * dx + dy * dy;
    },

    _sqClosestPointOnSegment: function (p, p1, p2, sqDist) {
        var x = p1.x,
            y = p1.y,
            dx = p2.x - x,
            dy = p2.y - y,
            dot = dx * dx + dy * dy,
            t;

        if (dot > 0) {
            t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        dx = p.x - x;
        dy = p.y - y;

        return sqDist ? dx * dx + dy * dy : new L.Loc(x, y);
    }
};

L.Util.PolyUtil = {};
L.Util.PolyUtil.clipPolygon = function (points, bounds) {
    var min = bounds.getLowerPoint(),
        max = bounds.getUpperPoint(),
        clippedPoints,
        edges = [1, 4, 2, 8],
        i, j, k,
        a, b,
        len, edge, p,
        lu = L.Util.LineUtil;

    for (i = 0, len = points.length; i < len; i++) {
        points[i]._code = lu._getBitCode(points[i], bounds);
    }

    for (k = 0; k < 4; k++) {
        edge = edges[k];
        clippedPoints = [];

        for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
            a = points[i];
            b = points[j];

            if (!(a._code & edge)) {
                if (b._code & edge) {
                    p = lu._getEdgeIntersection(b, a, edge, bounds);
                    p._code = lu._getBitCode(p, bounds);
                    clippedPoints.push(p);
                }
                clippedPoints.push(a);
            } else if (!(b._code & edge)) {
                p = lu._getEdgeIntersection(b, a, edge, bounds);
                p._code = lu._getBitCode(p, bounds);
                clippedPoints.push(p);
            }
        }
        points = clippedPoints;
    }

    return points;
};

L.Util.DDPrjs = ["EPSG:4326", "EPSG:4610", "EPSG:4490"];
L.Util.MaxZIndex = 999999;

L.Class = function () {};

L.Class.extend = function (/*Object*/ props) {

    // extended class with the new prototype
    var NewClass = function () {
        if (this.initialize) {
            this.initialize.apply(this, arguments);
            L.Util.stamp(this);
        }
        if (this._initHooks) {
            this.callInitHooks();
        }
    };

    // instantiate class without calling constructor
    var F = function () {};
    F.prototype = this.prototype;
    var proto = new F();

    proto.constructor = NewClass;
    NewClass.prototype = proto;

    // add superclass access
    NewClass.superclass = this.prototype;

    // add class name
    //proto.className = props;

    //inherit parent's statics
    for (var i in this) {
        if (this.hasOwnProperty(i) && i !== 'prototype' && i !== 'superclass') {
            NewClass[i] = this[i];
        }
    }

    // mix static properties into the class
    if (props.statics) {
        L.Util.extend(NewClass, props.statics);
        delete props.statics;
    }

    // mix includes into the prototype
    if (props.includes) {
        L.Util.extend.apply(null, [proto].concat(props.includes));
        delete props.includes;
    }

    // merge options
    if (props.options && proto.options) {
        props.options = L.Util.extend({}, proto.options, props.options);
    }

    // mix given properties into the prototype
    L.Util.extend(proto, props);
    L.Util.extend(proto, props.options);

    // allow inheriting further
    NewClass.extend = L.Class.extend;

    proto._initHooks = [];

    var parent = this;
    // add method for calling all hooks
    proto.callInitHooks = function () {

        if (this._initHooksCalled) { return; }

        if (parent.prototype.callInitHooks) {
            parent.prototype.callInitHooks.call(this);
        }

        this._initHooksCalled = true;

        for (var i = 0, len = proto._initHooks.length; i < len; i++) {
            proto._initHooks[i].call(this);
        }
    };

    return NewClass;
};

L.Class.include = function (props) {
    L.Util.extend(this.prototype, props);
};

L.Class.mergeOptions = function (options) {
    L.Util.extend(this.prototype.options, options);
};
L.Class.addInitHook = function (fn) { // (Function) || (String, args...)
    var args = Array.prototype.slice.call(arguments, 1);

    var init = typeof fn === 'function' ? fn : function () {
        this[fn].apply(this, args);
    };

    this.prototype._initHooks = this.prototype._initHooks || [];
    this.prototype._initHooks.push(init);
};

L.DomEvent = {
    _touchstart: L.Util.Browser.msTouch ? 'MSPointerDown' : 'touchstart',
    _touchend: L.Util.Browser.msTouch ? 'MSPointerUp' : 'touchend',
    _touchmove: L.Util.Browser.msTouch ? 'MSPointerMove' : 'touchmove',
    
    addDoubleTapListener: function (obj, handler, id) {
        var last,
            doubleTap = false,
            delay = 250,
            touch,
            pre = '_leaflet_',
            touchstart = this._touchstart,
            touchend = this._touchend,
            trackedTouches = [];

        function onTouchStart(e) {
            var count;
            if (L.Util.Browser.msTouch) {
                trackedTouches.push(e.pointerId);
                count = trackedTouches.length;
            } else {
                count = e.touches.length;
            }
            if (count > 1) {
                return;
            }

            var now = Date.now(),
                delta = now - (last || now);

            touch = e.touches ? e.touches[0] : e;
            doubleTap = (delta > 0 && delta <= delay);
            last = now;
        }

        function onTouchEnd(e) {
            /*jshint forin:false */
            if (L.Util.Browser.msTouch) {
                var idx = trackedTouches.indexOf(e.pointerId);
                if (idx === -1) {
                    return;
                }
                trackedTouches.splice(idx, 1);
            }

            if (doubleTap) {
                if (L.Util.Browser.msTouch) {
                    //Work around .type being readonly with MSPointer* events
                    var newTouch = { },
                        prop;

                    for (var i in touch) {
                        prop = touch[i];
                        if (typeof prop === 'function') {
                            newTouch[i] = prop.bind(touch);
                        } else {
                            newTouch[i] = prop;
                        }
                    }
                    touch = newTouch;
                }
                touch.type = 'dblclick';
                handler(touch);
                last = null;
            }
        }
        obj[pre + touchstart + id] = onTouchStart;
        obj[pre + touchend + id] = onTouchEnd;

        //On msTouch we need to listen on the document otherwise a drag starting on the map and moving off screen will not come through to us
        // so we will lose track of how many touches are ongoing
        var endElement = L.Util.Browser.msTouch ? document.documentElement : obj;

        obj.addEventListener(touchstart, onTouchStart, false);
        endElement.addEventListener(touchend, onTouchEnd, false);
        if (L.Util.Browser.msTouch) {
            endElement.addEventListener('MSPointerCancel', onTouchEnd, false);
        }
        return this;
    },

    addListener: function (/*HTMLElement*/ obj, /*String*/ type, /*Function*/ fn, /*Object*/ context) {
        var id = L.Util.stamp(fn),
            key = '_leaflet_' + type + id;

        if (obj[key]) {
            return this;
        }

        var handler = function (e) {
            return fn.call(context || obj, e || L.DomEvent._getEvent());
        };

        if (L.Util.Browser.touch && (type === 'dblclick') && this.addDoubleTapListener&& false) {
            this.addDoubleTapListener(obj, handler, id);
        } else if ('addEventListener' in obj) {
            if(L.Util.Browser.android && (type == 'click' || type == 'mousedown' || type == 'mouseup' || type == 'mousemove'|| type == 'mouseenter' || type == 'mouseleave' || type == 'mouseout' || type == 'mouseover')){
            
                
                var originalHandler = handler,
                    newType = type;
                if(type == 'click' || type == 'mousedown'){
                    newType = this._touchstart;
                }
                else if(type == 'mouseup'){
                    newType = this._touchend;
                }
                else if(type == 'mousemove'){
                 //obj[key] = handler;
                    return this;
                   //newType = this._touchmove;
                }
                else if(type == 'mouseover' || type == 'mouseenter'|| type == 'mouseleave'|| type == 'mouseout'){
                    //obj[key] = handler;
                    return this;
                }
                handler = function(type) {
                    
                    return function (e) {
                        if (!L.DomEvent._checkMouse(obj, e)) {
                            return;
                        }
                        var touch = (e.touches && e.touches[0]) ? e.touches[0]:e;
                        // if(!touch){
                            // alert(type);
                        // }
                        touch.type = type;
                        
                        return originalHandler(touch);
                    };
                }(type);
                /*handler = function (e) {
                    if (!L.DomEvent._checkMouse(obj, e)) {alert(1);
                        return;
                    }
                    var touch = e.touches ? e.touches[0]:e;
                    touch.type = type;
                     alert(type);
                    return originalHandler(touch);
                };*/
                obj.addEventListener(newType, handler, false);
                
                obj[key] = handler;
                return this;
            }
            if (type === 'mousewheel') {
                obj.addEventListener('DOMMouseScroll', handler, false);
                obj.addEventListener(type, handler, false);
            } else if ((type === 'mouseenter') || (type === 'mouseleave')) {
                var originalHandler = handler,
                    newType = (type === 'mouseenter' ? 'mouseover' : 'mouseout');
                handler = function (e) {
                    if (!L.DomEvent._checkMouse(obj, e)) {
                        return;
                    }
                    return originalHandler(e);
                };
                obj.addEventListener(newType, handler, false);
            } else {
                obj.addEventListener(type, handler, false);
            }
        } else if ('attachEvent' in obj) {
            obj.attachEvent("on" + type, handler);
        }

        obj[key] = handler;
        return this;
    },

    removeListener: function (/*HTMLElement*/ obj, /*String*/ type, /*Function*/ fn) {
        var id = L.Util.stamp(fn),
            key = '_leaflet_' + type + id,
            handler = obj[key];

        if (!handler) {
            return this;
        }

        if (L.Util.Browser.touch && (type === 'dblclick') && this.removeDoubleTapListener&& false) {
            this.removeDoubleTapListener(obj, id);
        } else if ('removeEventListener' in obj) {
            if(L.Util.Browser.android && (type == 'click' || type == 'mousedown' || type == 'mouseup' || type == 'mousemove'|| type == 'mouseenter' || type == 'mouseleave' || type == 'mouseout' || type == 'mouseover')){
                var newType = type;
                if(type == 'mousedown'){
                    newType = this._touchstart;
                }
                else if(type == 'click' || type == 'mouseup'){
                    newType = this._touchend;
                }
                else if(type == 'mousemove'){
                    newType = this._touchmove;
                }
                else if(type == 'mouseover' || type == 'mouseenter'|| type == 'mouseleave'|| type == 'mouseout'){
                    obj[key] = null;
                    return this;
                }
                
                obj.removeEventListener(newType, handler, false);
                
                obj[key] = null;
                return this;
            }
            if (type === 'mousewheel') {
                obj.removeEventListener('DOMMouseScroll', handler, false);
                obj.removeEventListener(type, handler, false);
            } else if ((type === 'mouseenter') || (type === 'mouseleave')) {
                obj.removeEventListener((type === 'mouseenter' ? 'mouseover' : 'mouseout'), handler, false);
            } else {
                obj.removeEventListener(type, handler, false);
            }
        } else if ('detachEvent' in obj) {
            obj.detachEvent("on" + type, handler);
        }
        obj[key] = null;
        return this;
    },

    _checkMouse: function (el, e) {
        var related = e.relatedTarget;

        if (!related) {
            return true;
        }

        try {
            while (related && (related !== el)) {
                related = related.parentNode;
            }
        } catch (err) {
            return false;
        }

        return (related !== el);
    },

    _getEvent: function () {
        var e = window.event;
        if (!e) {
            var caller = arguments.callee.caller;
            while (caller) {
                e = caller['arguments'][0];
                if (e && window.Event === e.constructor) {
                    break;
                }
                caller = caller.caller;
            }
        }
        return e;
    },
   

    stopPropagation: function (e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
        return this;
    },

    disableClickPropagation: function (/*HTMLElement*/ el) {
        L.DomEvent.addListener(el, (L.Util.Browser.touch ? 'touchstart' : 'mousedown'), L.DomEvent.stopPropagation);
        L.DomEvent.addListener(el, 'click', L.DomEvent.stopPropagation);
        L.DomEvent.addListener(el, 'dblclick', L.DomEvent.stopPropagation);
    },

    preventDefault: function (e) {
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        return this;
    },

    stop: function (e) {
        L.DomEvent.preventDefault(e).stopPropagation(e);
    },

    getMousePosition: function (e, container) {
        var x = e.pageX ? e.pageX : e.clientX +
                document.body.scrollLeft + document.documentElement.scrollLeft,
            y = e.pageY ? e.pageY : e.clientY +
                    document.body.scrollTop + document.documentElement.scrollTop,
            pos = new L.Loc(x, y);
        return (container ?
                    pos.subtract(L.Util.getViewportOffset(container)) : pos);
    },

    getWheelDelta: function (e) {
        var delta = 0;
        if (e.wheelDelta) {
            delta = e.wheelDelta / 120;
        }
        if (e.detail) {
            delta = -e.detail / 3;
        }
        return delta;
    }
};

L.Mixin = {};

L.Mixin.Events = {
    /**
     * @function
     * @name on
     * @parent L.Map, L.Ols.FeatureBase, L.Layers.Base, L.Ols.EleBase, L.Ols.Marker
     * @description 事件与当前对象进行绑定
     * @param {String} type 事件类型
     * @param {Function} func 事件触发时的处理函数
     */
    on: function (type, fn, context) {
        var events = this._leaflet_events = this._leaflet_events || {};
        events[type] = events[type] || [];
        var tmpObj = {
            action: fn,
            context: context || this
        }
        var bFind = false;
        for(var i in events[type]){
            if(events[type].hasOwnProperty(i)){
                if(events[type][i] && events[type][i].action == tmpObj.action && events[type][i].context == tmpObj.context){
                    bFind = true;
                }
            }
        }
        if(!bFind)
            events[type].push({
                action: fn,
                context: context || this
            });
        return this;
    },

    /**
     * @function
     * @name has
     * @parent L.Map, L.Ols.FeatureBase, L.Layers.Base, L.Ols.EleBase, L.Ols.Marker
     * @description 检测当前对象是否已绑定指定类型的事件
     * @param {String} type 事件类型
     * @return {Boolean} 检测结果的布尔值表示
     */
    has: function (/*String*/ type) /*-> Boolean*/ {
        var k = '_leaflet_events';
        return (k in this) && (type in this[k]) && (this[k][type].length > 0);
    },

    /**
     * @function
     * @name off
     * @parent L.Map, L.Ols.FeatureBase, L.Layers.Base, L.Ols.EleBase, L.Ols.Marker
     * @description 事件与当前对象解除绑定
     * @param {String} type 事件类型
     * @param {Function} func 事件处理函数
     */
    off: function (/*String*/ type, /*Function*/ fn, /*(optional) Object*/ context) {
        if (!this.has(type)) {
            return this;
        }

        for (var i = 0, events = this._leaflet_events, len = events[type].length; i < len; i++) {
            if (
                (events[type][i].action === fn) &&
                (!context || (events[type][i].context === context))
            ) {
                events[type].splice(i, 1);
                return this;
            }
        }
        return this;
    },

    /**
     * @function
     * @name fire
     * @parent L.Map, L.Ols.FeatureBase, L.Layers.Base, L.Ols.EleBase, L.Ols.Marker
     * @description 触发指定类型的事件
     * @param {String} type 事件类型
     * @param {Object} data 可选，事件处理函数的参数
     */
    fire: function (/*String*/ type, /*(optional) Object*/ data) {
        if (!this.has(type)) {
            return this;
        }

        var event = L.Util.extend({
            type: type,
            target: this
        }, data);

        var listeners = this._leaflet_events[type].slice();

        for (var i = 0, len = listeners.length; i < len; i++) {
            listeners[i].action.call(listeners[i].context || this, event);
        }

        return this;
    }
};

L.Class= L.Class.extend({
    getId: function () {
        return L.Util.stamp(this);
    }
});

L.Icon = L.Class.extend({
	options: {
		/*
		iconUrl: (String) (required)
		iconRetinaUrl: (String) (optional, used for retina devices if detected)
		iconSize: (Point) (can be set through CSS)
		iconAnchor: (Point) (centered by default, can be set in CSS with negative margins)
		popupAnchor: (Point) (if not specified, popup opens in the anchor point)
		shadowUrl: (String) (no shadow by default)
		shadowRetinaUrl: (String) (optional, used for retina devices if detected)
		shadowSize: (Point)
		shadowAnchor: (Point)
		*/
		className: ''
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	createIcon: function (oldIcon) {
		return this._createIcon('icon', oldIcon);
	},

	createShadow: function (oldIcon) {
		return this._createIcon('shadow', oldIcon);
	},

	_createIcon: function (name, oldIcon) {
		var src = this._getIconUrl(name);

		if (!src) {
			if (name === 'icon') {
				throw new Error('iconUrl not set in Icon options (see the docs).');
			}
			return null;
		}

		var img;
		if (!oldIcon || oldIcon.tagName !== 'IMG') {
			img = this._createImg(src);
		} else {
			img = this._createImg(src, oldIcon);
		}
		this._setIconStyles(img, name);

		return img;
	},

	_setIconStyles: function (img, name) {
		var options = this.options,
		    size = L.point(options[name + 'Size']),
		    anchor;

		if (name === 'shadow') {
			anchor = L.point(options.shadowAnchor || options.iconAnchor);
		} else {
			anchor = L.point(options.iconAnchor);
		}

		if (!anchor && size) {
			anchor = size.divideBy(2, true);
		}

		img.className = 'leaflet-marker-' + name + ' ' + options.className;

		if (anchor) {
			img.style.marginLeft = (-anchor.x) + 'px';
			img.style.marginTop  = (-anchor.y) + 'px';
		}

		if (size) {
			img.style.width  = size.x + 'px';
			img.style.height = size.y + 'px';
		}
	},

	_createImg: function (src, el) {
		el = el || document.createElement('img');
		el.src = src;
		return el;
	},

	_getIconUrl: function (name) {
		if (L.Browser.retina && this.options[name + 'RetinaUrl']) {
			return this.options[name + 'RetinaUrl'];
		}
		return this.options[name + 'Url'];
	}
});

L.icon = function (options) {
	return new L.Icon(options);
};


/*
 * L.Icon.Default is the blue marker icon used by default in Leaflet.
 */

L.Icon.Default = L.Icon.extend({

	options: {
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],

		shadowSize: [41, 41]
	},

	_getIconUrl: function (name) {
		var key = name + 'Url';

		if (this.options[key]) {
			return this.options[key];
		}

		if (L.Browser.retina && name === 'icon') {
			name += '-2x';
		}

		var path = L.Icon.Default.imagePath;

		if (!path) {
			throw new Error('Couldn\'t autodetect L.Icon.Default.imagePath, set it manually.');
		}

		return path + '/marker-' + name + '.png';
	}
});
L.Icon.Default.imagePath = (function () {
	var scripts = document.getElementsByTagName('script'),
	    leafletRe = /[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;

	var i, len, src, matches, path;

	for (i = 0, len = scripts.length; i < len; i++) {
		src = scripts[i].src;
		matches = src.match(leafletRe);

		if (matches) {
			path = src.split(leafletRe)[0];
			return (path ? path + '/' : '') + 'images/';
		}
	}
}());

/**
 * @class
 * @name L.Loc
 * @description 二维属性类，该类具有x, y两个属性，可用于表示坐标(x表示横坐标，y表示纵坐标),也可用于表示大小(x表示长度,y表示宽度)
 */
L.Loc = L.Class.extend({

    /**
     * @name x
     * @description 第一维属性，可用于表示横坐标或者长度
     * @type  {Number}
     */
    x:null,
    /**
     * @name y
     * @description 第二维属性，可用于表示纵坐标或者宽度
     * @type  {Number}
     */
    y:null,
    /**
     * @constructor
     * @name L.Loc
     * @description 二维属性类的构造函数
     * @param  {Number} x 第一维属性，可用于表示横坐标或者长度
     * @param  {Number} y 第二维属性，可用于表示纵坐标或者宽度
     */
    initialize: function(x,y){
        this.x = x;
        this.y = y;
        this.x = (this.x !== undefined && this.x !== null) ? parseFloat(this.x) : 0;
        this.y = (this.y !== undefined && this.y !== null) ? parseFloat(this.y) : 0;
    },
    
    /**
     * @function
     * @name add
     * @description 加法操作方法，运算之后当前对象值保持不变，运算结果以新对象形式返回
     * @param  {L.Loc} point 与当前对象进行加法运算的另一个<L.Loc>类型对象
     * @return  {L.Loc} 当前对象与传入的参数进行加法运算所得的新对象
     */
    add: function (point) {
        return this.clone()._add(point);
    },

    _add: function (point) {
        this.x += point.x;
        this.y += point.y;
        return this;
    },

    /**
     * @function
     * @name subtract
     * @description 减法操作方法，运算之后当前对象值保持不变，运算结果以新对象形式返回
     * @param  {L.Loc} point 与当前对象进行减法运算的另一个<L.Loc>类型对象
     * @return  {L.Loc} 当前对象与传入的参数进行减法运算所得的新对象
     */
    subtract: function (point) {
        return this.clone()._subtract(point);
    },

    /**
     * @function
     * @name equals
     * @description 判断当前对象与传入的<L.Loc>类型对象是否相等
     * @param  {L.Loc} point 要进行比较的对象
     * @return  {Boolean} 相等则返回true,否则返回false
     */
    equals:function(point){
        if(!point)return false;
        return (this.x === point.x && this.y === point.y);
    },
    // destructive subtract (faster)
    _subtract: function (point) {
        this.x -= point.x;
        this.y -= point.y;
        return this;
    },

    /**
     * @function
     * @name divideBy
     * @description 除法操作方法，当前对象的x,y属性同时除以指定的参数，运算之后当前对象值保持不变，运算结果以新对象形式返回
     * @param  {Number} num 指定参数
     * @return  {L.Loc} 除法运算所得的新对象
     */
    divideBy: function (num, round) {
        return new L.Loc(this.x / num, this.y / num, round);
    },

    /**
     * @function
     * @name multiplyBy
     * @description 乘法操作方法，当前对象的x,y属性同时乘以指定的参数，运算之后当前对象值保持不变，运算结果以新对象形式返回
     * @param  {Number} num 指定参数
     * @return  {L.Loc} 乘法运算所得的新对象
     */
    multiplyBy: function (num) {
        return new L.Loc(this.x * num, this.y * num);
    },

    /**
     * @function
     * @name distanceTo
     * @description 计算两点之间的距离
     * @param  {L.Loc} point 指定的坐标点对象
     * @return  {Number} 两点之间的距离
     */
    distanceTo: function (point) {
        var x = point.x - this.x,
            y = point.y - this.y;
        return Math.sqrt(x * x + y * y);
    },

    round: function () {
        return this.clone()._round();
    },

    // destructive round
    _round: function () {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    },

    /**
     * @function
     * @name clone
     * @description 复制当前对象
     * @return  {L.Loc} 复制当前对象所得的新对象
     */
    clone: function () {
        return new L.Loc(this.x, this.y);
    },

    toString: function () {
        return 'Point(' +
                L.Util.formatNum(this.x) + ', ' +
                L.Util.formatNum(this.y) + ')';
    }
});

/**
 * @class
 * @name L.Extent
 * @description 用于描述矩形范围的类
 */
L.Extent = L.Class.extend({
    
    /**
     * @constructor
     * @name L.Extent
     * @description 用于描述矩形范围的类
     * @param  {Number} minX x方向最小值
     * @param  {Number} minY y方向最小值
     * @param  {Number} maxX x方向最大值
     * @param  {Number} maxY y方向最大值
     */
    initialize: function (minX, minY, maxX, maxY) {
        if((minX && (minX instanceof L.Loc)) && (minY && (minY instanceof L.Loc))){
            this.minX = (minX.x > minY.x) ?  minY.x : minX.x;
            this.minY = (minX.y > minY.y) ?  minY.y : minX.y;
            this.maxX = (minX.x < minY.x) ?  minY.x : minX.x;
            this.maxY = (minX.y < minY.y) ?  minY.y : minX.y;
        }
        else{
            this.minX = (minX > maxX) ? maxX : minX;
            this.minY = (minY < maxY) ? minY : maxY;
            this.maxX = (minX > maxX) ? minX : maxX;
            this.maxY = (minY > maxY) ? minY : maxY;
        }
        this.minX = parseFloat(this.minX);
        this.maxY = parseFloat(this.maxY);
        this.minY = parseFloat(this.minY);
        this.maxX = parseFloat(this.maxX);
    },

    /**
     * @function
     * @name extend
     * @description 扩展当前对象，使指定点包含在当前对象所表示的范围之内
     * @param  {L.Loc}或{L.Extent} object 可为点坐标对象、矩形范围类的对象
     */
    extend: function (object) {
        if(!object)return;
		var bounds = null;
		if(object instanceof L.Loc){
			bounds = new L.Extent(object.x, object.y, object.x, object.y);
		}else if(object instanceof L.Extent){
			bounds = object;
		}
		
		this.minX = this.minX == undefined ? bounds.minX : Math.min(bounds.minX, this.minX);
        this.maxX = this.maxX == undefined ? bounds.maxX : Math.max(bounds.maxX, this.maxX);
        this.minY = this.minY == undefined ? bounds.minY : Math.min(bounds.minY, this.minY);
        this.maxY = this.maxY == undefined ? bounds.maxY : Math.max(bounds.maxY, this.maxY);
    },
    
    exportToString:function(axisOrder){
        var resultStr;
        if(axisOrder)
            resultStr = this.minY + "," +this.minX + "," +this.maxY + "," +this.maxX;
        else
            resultStr = this.minX + "," +this.minY + "," +this.maxX + "," +this.maxY;
        return resultStr;
    },

    extendByBounds:function(b){
        if(!b || !(b instanceof L.Extent)){
            return;
        }
        this.extend(new L.Loc(b.minX, b.minY));
        this.extend(new L.Loc(b.maxX, b.maxY));
    },
    
    /**
     * @function
     * @name getCenter
     * @description 获取当前对象的中心点坐标
     * @return  {L.Loc} 当前对象的中心点坐标
     */
    getCenter: function (round) {
        var tmppoint = new L.Loc(
                (this.minX+ this.maxX) / 2,
                (this.minY + this.maxY) / 2);
        if(round){
            tmppoint.x = Math.round(tmppoint.x);
            tmppoint.y = Math.round(tmppoint.y);
        }
        return tmppoint;
    },

    /**
     * @function
     * @name contains
     * @description 判断指定的对象是否位于当前对象所表示的范围之内
     * @param  {L.Loc/L.Extent} obj 指定的对象
     * @return  {Boolean} 布尔形式表示的判定值
     */
    contains: function (obj){
        var minX, maxX, minY, maxY;

        if (obj instanceof L.Extent) {
            minX = obj.minX;
            maxX = obj.maxX;
            minY = obj.minY;
            maxY = obj.maxY;
        } 
        else if (obj instanceof L.Loc) {
            minX = maxX = obj.x;
            minY = maxY = obj.y;
        }

        return (minX >= this.minX) &&
                (maxX <= this.maxX) &&
                (minY >= this.minY) &&
                (maxY <= this.maxY);
    },
    
    /**
     * @function
     * @name getLowerPoint
     * @description 获取当前对象所表示范围的左下点坐标(xmin,ymin)
     * @return  {L.Loc} 左下点坐标
     */
    getLowerPoint: function () {
        return new L.Loc(this.minX, this.minY);
    },
    
    /**
     * @function
     * @name getUpperPoint
     * @description 获取当前对象所表示范围的右上点坐标(xmax,ymax)
     * @return  {L.Loc} 右上点坐标
     */
    getUpperPoint: function () {
        return new L.Loc(this.maxX, this.maxY);
    },
    
    /**
     * @function
     * @name getWidth
     * @description 获取当前对象所表示范围的宽度
     * @return  {Number} 当前对象所表示范围的宽度
     */
    getWidth: function() {
        return this.maxX - this.minX;
    },
    
    /**
     * @function
     * @name getHeight
     * @description 获取当前对象所表示范围的高度
     * @return  {Number} 当前对象所表示范围的高度
     */
    getHeight: function () {
        return this.maxY - this.minY;
    },
    
    /**
     * @function
     * @name intersects
     * @description 获取当前对象与指定对象是否相交
     * @param  {L.Extent} obj 指定的对象
     * @return  {Boolean} 相交则返回true,否则返回false
     */
    intersects: function (/*L.Extent*/ bounds) {
        if(!bounds || !(bounds instanceof L.Extent)) return false;

        var xIntersects = (bounds.maxX >= this.minX) && (bounds.minX <= this.maxX),
            yIntersects = (bounds.maxY >= this.minY) && (bounds.minY <= this.maxY);

        return xIntersects && yIntersects;
        
    }
});

/**
 * @class
 * @name L.Proj
 * @description 用于描述投影的类
 */
L.Proj = L.Class.extend({
    /**
     * @constructor
     * @name L.Proj
     * @description 投影类的构造函数
     * @param {String} srsCode 投影EPSG代码，该参数形如"EPSG:4326"
     */
    initialize: function(srsCode, options){
        this.srsCode = srsCode;
        L.Util.setOptions(this, options);
    },
    
    /**
     * @function
     * @name getSrsCode
     * @description 获取投影类的EPSG代码
     * @return {String} 投影EPSG代号，形如"EPSG:4326"
     */
    getSrsCode: function () {
        return this.srsCode;
    },
    
    getAxisOrder: function () {
        var projAxisOrder = {'EPSG:900913':true,'EPSG:3857':true,'CRS:84':true,'GEOGCS["WGS_2000",DATUM["WGS_2000",SPHEROID["WGS_2000",6378137,298.257221101]],PRIMEM["GREENWICH",0],UNIT["DEGREE",0.0174532925199433]]':true, 'GEOGCS["CGCS2000",DATUM["D_CGCS2000",SPHEROID["CGCS2000",6378137,298.257221101]],PRIMEM["GREENWICH",0],UNIT["DEGREE",0.0174532925199433]]':true};
        var srsCode = this.getSrsCode().toUpperCase();
        return !projAxisOrder.hasOwnProperty(srsCode);
    },
    
    /**
     * @function
     * @name getUnits
     * @description 获取投影类所表示投影所使用的计量单位
     * @return {String} 计量单位，形如"dd","m"
     */
    getUnits: function(){
        var retUnit = "m";
        for(var i = 0; i < L.Util.DDPrjs.length;i++){
            if(L.Util.DDPrjs[i] && (L.Util.DDPrjs[i].toLowerCase() == this.srsCode.toLowerCase()))
                retUnit = 'dd';
        }
        return retUnit;
    }
});
/**
 * @class
 * @name L.HttpObj
 * @description 通过对象字面量形式表示的全局函数集，用于提供HTTP请求的GET\PUT\POST\DELETE四种方法。
 */
L.HttpObj = {
    DEFAULT_CONFIG: {
        method: "GET",
        url: window.location.href,
        async: true,
        user: undefined,
        password: undefined,
        params: null,
        proxy: undefined,
        headers: {},
        data: null,
        callback: function() {},
        success: null,
        failure: null,
        scope: null
    },

    URL_SPLIT_REGEX: /([^:]*:)\/\/([^:]*:?[^@]*@)?([^:\/\?]*):?([^\/\?]*)/,
    
    issue: function(config) {
        // apply default config - proxy host may have changed
        var defaultConfig = this.DEFAULT_CONFIG;
        config = L.Util.applyDefaults(config, defaultConfig);

        // create request, open, and set headers
        var request = new L.HttpObj.XMLHttpRequest();
        var url = L.Util.urlAppend(config.url, 
            L.Util.getParameterString(config.params || {}));
        var sameOrigin = !(url.indexOf("http") == 0);
        var urlParts = !sameOrigin && url.match(this.URL_SPLIT_REGEX);
        if (urlParts) {
            var location = window.location;
            sameOrigin =
                urlParts[1] == location.protocol &&
                urlParts[3] == location.hostname;
            var uPort = urlParts[4], lPort = location.port;
            if (uPort != 80 && uPort != "" || lPort != "80" && lPort != "") {
                sameOrigin = sameOrigin && uPort == lPort;
            }
        }
        if (!sameOrigin) {
            if (config.proxy) {
                if (typeof config.proxy == "function") {
                    url = config.proxy(url);
                } else {
                    url = config.proxy + encodeURIComponent(url);
                }
            } 
        }
        request.open(
            config.method, url, config.async, config.user, config.password
        );
        for(var header in config.headers) {
            request.setRequestHeader(header, config.headers[header]);
        }

        //var events = this.events;

        // we want to execute runCallbacks with "this" as the
        // execution scope
        var self = this;
        
        request.onreadystatechange = function() {
            if(request.readyState == L.HttpObj.XMLHttpRequest.DONE) {
                // // var proceed = this.fire(
                    // // "complete",
                    // // {request: request, config: config, requestUrl: url}
                // // );
                //if(proceed !== false) {
                    self.runCallbacks(
                        {request: request, config: config, requestUrl: url}
                    );
               // }
            }
        };
        
        // send request (optionally with data) and return
        // call in a timeout for asynchronous requests so the return is
        // available before readyState == 4 for cached docs
        if(config.async === false) {
            request.send(config.data);
        } else {
            window.setTimeout(function(){
                if (request.readyState !== 0) { // W3C: 0-UNSENT
                    request.send(config.data);
                }
            }, 0);
        }
        return request;
    },
    
    runCallbacks: function(options) {
        var request = options.request;
        var config = options.config;
        
        // bind callbacks to readyState 4 (done)
        var complete = (config.scope) ?
            L.Util.bind(config.callback, config.scope) :
            config.callback;
        
        // optional success callback
        var success;
        if(config.success) {
            success = (config.scope) ?
                L.Util.bind(config.success, config.scope) :
                config.success;
        }

        // optional failure callback
        var failure;
        if(config.failure) {
            failure = (config.scope) ?
                L.Util.bind(config.failure, config.scope) :
                config.failure;
        }

        if (L.Util.createUrlObject(config.url).protocol == "file:" &&
                                                        request.responseText) {
            request.status = 200;
        }
        complete(request);

        if (!request.status || (request.status >= 200 && request.status < 300)) {
            ////this.fire("success", options);
            if(success) {
                success(request);
            }
        }
        if(request.status && (request.status < 200 || request.status >= 300)) {                    
            ////this.fire("failure", options);
            if(failure) {
                failure(request);
            }
        }
    },
    
    /**
     * @function
     * @name GET
     * @description 发送HTTP GET请求
     * @param {L.HttpObjOptions} config 请求参数配置
     */
    GET: function(config) {
        if(typeof config.callback == 'string'){
            var element = document.createElement("script"); 
            element.charset = 'utf-8';
            element.type = "text/javascript" ; 
            var url = config.url;
            if(config.callback)
                element.src = url+"&callback="+config.callback; 
            else
                element.src = url;    
            document.body.appendChild(element); 
        }
        else{
            config = L.Util.extend(config, {method: "GET"});
            return L.HttpObj.issue(config);
        }
    },
    
    /**
     * @function
     * @name POST
     * @description 发送HTTP POST请求
     * @param {L.HttpObjOptions} config 请求参数配置
     */
    POST: function(config) {
        config = L.Util.extend(config, {method: "POST"});
        // set content type to application/xml if it isn't already set
        config.headers = config.headers ? config.headers : {};
        if(!("CONTENT-TYPE" in L.Util.upperCaseObject(config.headers))) {
            config.headers["Content-Type"] = "application/xml";
        }
        return L.HttpObj.issue(config);
    },
    
    /**
     * @function
     * @name PUT
     * @description 发送HTTP PUT请求
     * @param {L.HttpObjOptions} config 请求参数配置
     */
    PUT: function(config) {
        config = L.Util.extend(config, {method: "PUT"});
        // set content type to application/xml if it isn't already set
        config.headers = config.headers ? config.headers : {};
        if(!("CONTENT-TYPE" in L.Util.upperCaseObject(config.headers))) {
            config.headers["Content-Type"] = "application/xml";
        }
        return L.HttpObj.issue(config);
    },
    
    /**
     * @function
     * @name DELETE
     * @description 发送HTTP DELETE请求
     * @param {L.HttpObjOptions} config 请求参数配置
     */
    DELETE: function(config) {
        config = L.Util.extend(config, {method: "DELETE"});
        return L.HttpObj.issue(config);
    },
  
    HEAD: function(config) {
        config = L.Util.extend(config, {method: "HEAD"});
        return L.HttpObj.issue(config);
    },
    
    OPTIONS: function(config) {
        config = L.Util.extend(config, {method: "OPTIONS"});
        return L.HttpObj.issue(config);
    }

};

/**
 * @class
 * @name L.HttpObjOptions
 * @description 此类表示NRequest中函数参数的结构说明,它没有构造函数，只可通过对象字面量形式表示。
 */
L.HttpObjOptions = {

    /**
     * @name url
     * @type {String} 
     * @description HTTP请求的url地址，此参数为必须参数
     */
    url: null,

    /**
     * @name async
     * @type {Boolean} 
     * @description 指定HTTP请求方式是异步(true)还是同步(false),默认为true，此参数为可选参数
     */
    async: true,

    /**
     * @name user
     * @type {String} 
     * @description 相关认证计划用户,默认值设置为null表示未使用用户认证，此参数为可选参数
     */
    user: null,

    /**
     * @name password
     * @type {String} 
     * @description 认证密码,默认值设置为null,此参数为可选参数
     */
    password: null,

    /**
     * @name params
     * @type {Object} 
     * @description 请求参数,值对作为查询字符串附加到URL,假设url不包含一个查询字符串或哈希。通常情况下,这只适用于GET请求,将查询字符串附加到URL,参数值是用逗号连接起来的数组,默认值为null，可选参数
     */
    params: null,

    /**
     * @name headers
     * @type {Object} 
     * @description 请求发送时的头信息,默认值为null，可选参数
     */
    headers: null,

    /**
     * @name data
     * @type {String} 
     * @description 请求发送时的数据内容
     */
    data: null,

    /**
     * @name callback
     * @type {Function} 
     * @description 请求返回时的回调函数
     */
    callback: null,

    /**
     * @name success
     * @type {Function} 
     * @description 请求成功时的回调函数
     */
    success: null,

    /**
     * @name failure
     * @type {Function} 
     * @description 请求失败时的回调函数
     */
    failure: null,

    // /**
     // * @name scope
     // * @type {Object} 
     // * @description 响应回调函数的对象，通常用于处理回调函数为类成员函数状况，默认值为null
     // */
    scope: null
};


L.Transition = L.Class.extend({
    includes: L.Mixin.Events,

    statics: {
        CUSTOM_PROPS_SETTERS: {
            position: L.Util.setPosition
        }
    },

    options: {
        easing: 'ease',
        duration: 0.5
    },

    _setProperty: function (prop, value) {
        var setters = L.Transition.CUSTOM_PROPS_SETTERS;
        if (prop in setters) {
            setters[prop](this._el, value);
        } else {
            this._el.style[prop] = value;
        }
    }
});

L.Transition = L.Transition.extend({
    statics: (function () {
        var transition = L.Util.TRANSITION,
            transitionEnd = L.Util.TRANSITION_END;

        return {
            TRANSITION: transition,
            PROPERTY: transition + 'Property',
            DURATION: transition + 'Duration',
            EASING: transition + 'TimingFunction',
            END: transitionEnd,


            CUSTOM_PROPS_PROPERTIES: {
                //position: L.Util.Browser.webkit ? L.Util.TRANSFORM : 'top, left'
                position: L.Util.TRANSFORM ? L.Util.TRANSFORM : 'top, left'
            }
        };
    }()),

    options: {
        fakeStepInterval: 100
    },

    initialize: function (/*HTMLElement*/ el, /*Object*/ options) {
        this._el = el;
        L.Util.setOptions(this, options);

        L.DomEvent.addListener(el, L.Transition.END, this._onTransitionEnd, this);
        this._onFakeStep = L.Util.bind(this._onFakeStep, this);
    },

    run: function (/*Object*/ props) {
        var prop,
            propsList = [],
            customProp = L.Transition.CUSTOM_PROPS_PROPERTIES;

        for (prop in props) {
            if (props.hasOwnProperty(prop)) {
                prop = customProp[prop] ? customProp[prop] : prop;
                prop = this._dasherize(prop);
                propsList.push(prop);
            }
        }

        this._el.style[L.Transition.DURATION] = this.options.duration + 's';
        this._el.style[L.Transition.EASING] = this.options.easing;
        this._el.style[L.Transition.PROPERTY] = propsList.join(', ');

        for (prop in props) {
            if (props.hasOwnProperty(prop)) {
                this._setProperty(prop, props[prop]);
            }
        }

        this._inProgress = true;

        this.fire('start');

        if (L.Util.ISTRANSITIONVALID) {
            clearInterval(this._timer);
            this._timer = setInterval(this._onFakeStep, this.options.fakeStepInterval);
        } else {
            this._onTransitionEnd();
        }
    },

    _dasherize: (function () {

        function replaceFn(w) {
            return '-' + w.toLowerCase();
        }

        return function (str) {
            return str.replace(/([A-Z])/g, replaceFn);
        };
    }()),

    _onFakeStep: function () {
        this.fire('step');
    },

    _onTransitionEnd: function (e) {
        if (this._inProgress) {
            this._inProgress = false;
            clearInterval(this._timer);

            this._el.style[L.Transition.PROPERTY] = 'none';

            this.fire('step');
            if(e && e.type)
                this.fire('end');
        }
    }
});

L.Transition = L.Util.ISTRANSITIONVALID ? L.Transition : L.Transition.extend({
    statics: {
        TIMER: true,

        EASINGS: {
            'ease': [0.25, 0.1, 0.25, 1.0],
            'linear': [0.0, 0.0, 1.0, 1.0],
            'ease-in': [0.42, 0, 1.0, 1.0],
            'ease-out': [0, 0, 0.58, 1.0],
            'ease-in-out': [0.42, 0, 0.58, 1.0],
            'ease-t': [0.0, 0.3, 0.68, 1.0]
        },

        CUSTOM_PROPS_GETTERS: {
            position: L.Util.getPosition
        }
    },

    options: {
        fps: 50
    },

    initialize: function (el, options) {
        this._el = el;
        L.Util.extend(this.options, options);

        var easings = L.Transition.EASINGS[this.options.easing] || L.Transition.EASINGS.ease;

        this._p1 = new L.Loc(0, 0);
        this._p2 = new L.Loc(easings[0], easings[1]);
        this._p3 = new L.Loc(easings[2], easings[3]);
        this._p4 = new L.Loc(1, 1);

        this._step = L.Util.bind(this._step, this);
        this._interval = Math.round(1000 / this.options.fps);
    },

    run: function (props) {
        this._props = {};

        var getters = L.Transition.CUSTOM_PROPS_GETTERS;

        this._inProgress = true;
        this.fire('start');

        for (var prop in props) {
            if (props.hasOwnProperty(prop)) {
                var p = {};
                if (prop in getters) {
                    p.from = getters[prop](this._el);
                } else {
                    var matches = this._el.style[prop].match(/^[\d\.]+(\D*)$/);
                    p.from = parseFloat(matches[0]);
                    p.unit = matches[1];
                }
                p.to = props[prop];
                this._props[prop] = p;
            }
        }

        clearInterval(this._timer);
        this._timer = setInterval(this._step, this._interval);
        this._startTime = L.Util.getTime();
    },

    _step: function () {
        var time = L.Util.getTime(),
            elapsed = time - this._startTime,
            duration = this.options.duration * 1000;

        if (elapsed < duration) {
            this._runFrame(this._cubicBezier(elapsed / duration));
        } else {
            this._runFrame(1);
            this._complete();
        }
    },

    _runFrame: function (percentComplete) {
        var setters = L.Transition.CUSTOM_PROPS_SETTERS,
            prop, p, value;

        for (prop in this._props) {
            if (this._props.hasOwnProperty(prop)) {
                p = this._props[prop];
                if (prop in setters) {
                    value = p.to.subtract(p.from).multiplyBy(percentComplete).add(p.from);
                    setters[prop](this._el, value);
                } else {
                    this._el.style[prop] =
                            ((p.to - p.from) * percentComplete + p.from) + p.unit;
                }
            }
        }
        this.fire('step');
    },

    _complete: function () {
        clearInterval(this._timer);
        this.fire('end');
    },

    _onTransitionEnd: function (e) {
        if (this._inProgress) {
            this._inProgress = false;
            this._complete();
        }
    },
    _cubicBezier: function (t) {
        var a = Math.pow(1 - t, 3),
            b = 3 * Math.pow(1 - t, 2) * t,
            c = 3 * (1 - t) * Math.pow(t, 2),
            d = Math.pow(t, 3),
            p1 = this._p1.multiplyBy(a),
            p2 = this._p2.multiplyBy(b),
            p3 = this._p3.multiplyBy(c),
            p4 = this._p4.multiplyBy(d);

        return p1.add(p2).add(p3).add(p4).y;
    }
});



(function () {

    // Save reference to earlier defined object implementation (if any)
    var oXMLHttpRequest    = window.XMLHttpRequest;

    // Define on browser type
    var bGecko    = !!window.controllers,
        bIE        = window.document.all && !window.opera,
        bIE7    = bIE && window.navigator.userAgent.match(/MSIE 7.0/);

    // Enables "XMLHttpRequest()" call next to "new XMLHttpReques()"
    function fXMLHttpRequest() {
        this._object    = oXMLHttpRequest && !bIE7 ? new oXMLHttpRequest : new window.ActiveXObject("Microsoft.XMLHTTP");
        this._listeners    = [];
    };

    // Constructor
    function cXMLHttpRequest() {
        return new fXMLHttpRequest;
    };
    cXMLHttpRequest.prototype    = fXMLHttpRequest.prototype;

    // BUGFIX: Firefox with Firebug installed would break pages if not executed
    if (bGecko && oXMLHttpRequest.wrapped)
        cXMLHttpRequest.wrapped    = oXMLHttpRequest.wrapped;

    // Constants
    cXMLHttpRequest.UNSENT                = 0;
    cXMLHttpRequest.OPENED                = 1;
    cXMLHttpRequest.HEADERS_RECEIVED    = 2;
    cXMLHttpRequest.LOADING                = 3;
    cXMLHttpRequest.DONE                = 4;

    // Public Properties
    cXMLHttpRequest.prototype.readyState    = cXMLHttpRequest.UNSENT;
    cXMLHttpRequest.prototype.responseText    = '';
    cXMLHttpRequest.prototype.responseXML    = null;
    cXMLHttpRequest.prototype.status        = 0;
    cXMLHttpRequest.prototype.statusText    = '';

    // Priority proposal
    cXMLHttpRequest.prototype.priority        = "NORMAL";

    // Instance-level Events Handlers
    cXMLHttpRequest.prototype.onreadystatechange    = null;

    // Class-level Events Handlers
    cXMLHttpRequest.onreadystatechange    = null;
    cXMLHttpRequest.onopen                = null;
    cXMLHttpRequest.onsend                = null;
    cXMLHttpRequest.onabort                = null;

    // Public Methods
    cXMLHttpRequest.prototype.open    = function(sMethod, sUrl, bAsync, sUser, sPassword) {
        // Delete headers, required when object is reused
        delete this._headers;

        // When bAsync parameter value is omitted, use true as default
        if (arguments.length < 3)
            bAsync    = true;

        // Save async parameter for fixing Gecko bug with missing readystatechange in synchronous requests
        this._async        = bAsync;

        // Set the onreadystatechange handler
        var oRequest    = this,
            nState        = this.readyState,
            fOnUnload;

        // BUGFIX: IE - memory leak on page unload (inter-page leak)
        if (bIE && bAsync) {
            fOnUnload = function() {
                if (nState != cXMLHttpRequest.DONE) {
                    fCleanTransport(oRequest);
                    // Safe to abort here since onreadystatechange handler removed
                    oRequest.abort();
                }
            };
            window.attachEvent("onunload", fOnUnload);
        }

        // Add method sniffer
        if (cXMLHttpRequest.onopen)
            cXMLHttpRequest.onopen.apply(this, arguments);

        if (arguments.length > 4)
            this._object.open(sMethod, sUrl, bAsync, sUser, sPassword);
        else
        if (arguments.length > 3)
            this._object.open(sMethod, sUrl, bAsync, sUser);
        else
            this._object.open(sMethod, sUrl, bAsync);

        this.readyState    = cXMLHttpRequest.OPENED;
        fReadyStateChange(this);

        this._object.onreadystatechange    = function() {
            if (bGecko && !bAsync)
                return;

            // Synchronize state
            oRequest.readyState        = oRequest._object.readyState;

            //
            fSynchronizeValues(oRequest);

            // BUGFIX: Firefox fires unnecessary DONE when aborting
            if (oRequest._aborted) {
                // Reset readyState to UNSENT
                oRequest.readyState    = cXMLHttpRequest.UNSENT;

                // Return now
                return;
            }

            if (oRequest.readyState == cXMLHttpRequest.DONE) {
                // Free up queue
                delete oRequest._data;
/*                if (bAsync)
                    fQueue_remove(oRequest);*/
                //
                fCleanTransport(oRequest);
                // BUGFIX: IE - memory leak in interrupted
                if (bIE && bAsync)
                    window.detachEvent("onunload", fOnUnload);
            }

            // BUGFIX: Some browsers (Internet Explorer, Gecko) fire OPEN readystate twice
            if (nState != oRequest.readyState)
                fReadyStateChange(oRequest);

            nState    = oRequest.readyState;
        }
    };
    function fXMLHttpRequest_send(oRequest) {
        oRequest._object.send(oRequest._data);

        // BUGFIX: Gecko - missing readystatechange calls in synchronous requests
        if (bGecko && !oRequest._async) {
            oRequest.readyState    = cXMLHttpRequest.OPENED;

            // Synchronize state
            fSynchronizeValues(oRequest);

            // Simulate missing states
            while (oRequest.readyState < cXMLHttpRequest.DONE) {
                oRequest.readyState++;
                fReadyStateChange(oRequest);
                // Check if we are aborted
                if (oRequest._aborted)
                    return;
            }
        }
    };
    cXMLHttpRequest.prototype.send    = function(vData) {
        // Add method sniffer
        if (cXMLHttpRequest.onsend)
            cXMLHttpRequest.onsend.apply(this, arguments);

        if (!arguments.length)
            vData    = null;

        // BUGFIX: Safari - fails sending documents created/modified dynamically, so an explicit serialization required
        // BUGFIX: IE - rewrites any custom mime-type to "text/xml" in case an XMLNode is sent
        // BUGFIX: Gecko - fails sending Element (this is up to the implementation either to standard)
        if (vData && vData.nodeType) {
            vData    = window.XMLSerializer ? new window.XMLSerializer().serializeToString(vData) : vData.xml;
            if (!oRequest._headers["Content-Type"])
                oRequest._object.setRequestHeader("Content-Type", "application/xml");
        }

        this._data    = vData;
/*
        // Add to queue
        if (this._async)
            fQueue_add(this);
        else*/
            fXMLHttpRequest_send(this);
    };
    cXMLHttpRequest.prototype.abort    = function() {
        // Add method sniffer
        if (cXMLHttpRequest.onabort)
            cXMLHttpRequest.onabort.apply(this, arguments);

        // BUGFIX: Gecko - unnecessary DONE when aborting
        if (this.readyState > cXMLHttpRequest.UNSENT)
            this._aborted    = true;

        this._object.abort();

        // BUGFIX: IE - memory leak
        fCleanTransport(this);

        this.readyState    = cXMLHttpRequest.UNSENT;

        delete this._data;
/*        if (this._async)
            fQueue_remove(this);*/
    };
    cXMLHttpRequest.prototype.getAllResponseHeaders    = function() {
        return this._object.getAllResponseHeaders();
    };
    cXMLHttpRequest.prototype.getResponseHeader    = function(sName) {
        return this._object.getResponseHeader(sName);
    };
    cXMLHttpRequest.prototype.setRequestHeader    = function(sName, sValue) {
        // BUGFIX: IE - cache issue
        if (!this._headers)
            this._headers    = {};
        this._headers[sName]    = sValue;

        return this._object.setRequestHeader(sName, sValue);
    };

    // EventTarget interface implementation
    cXMLHttpRequest.prototype.addEventListener    = function(sName, fHandler, bUseCapture) {
        for (var nIndex = 0, oListener; oListener = this._listeners[nIndex]; nIndex++)
            if (oListener[0] == sName && oListener[1] == fHandler && oListener[2] == bUseCapture)
                return;
        // Add listener
        this._listeners.push([sName, fHandler, bUseCapture]);
    };

    cXMLHttpRequest.prototype.removeEventListener    = function(sName, fHandler, bUseCapture) {
        for (var nIndex = 0, oListener; oListener = this._listeners[nIndex]; nIndex++)
            if (oListener[0] == sName && oListener[1] == fHandler && oListener[2] == bUseCapture)
                break;
        // Remove listener
        if (oListener)
            this._listeners.splice(nIndex, 1);
    };

    cXMLHttpRequest.prototype.dispatchEvent    = function(oEvent) {
        var oEventPseudo    = {
            'type':            oEvent.type,
            'target':        this,
            'currentTarget':this,
            'eventPhase':    2,
            'bubbles':        oEvent.bubbles,
            'cancelable':    oEvent.cancelable,
            'timeStamp':    oEvent.timeStamp,
            'stopPropagation':    function() {},    // There is no flow
            'preventDefault':    function() {},    // There is no default action
            'initEvent':        function() {}    // Original event object should be initialized
        };

        // Execute onreadystatechange
        if (oEventPseudo.type == "readystatechange" && this.onreadystatechange)
            (this.onreadystatechange.handleEvent || this.onreadystatechange).apply(this, [oEventPseudo]);

        // Execute listeners
        for (var nIndex = 0, oListener; oListener = this._listeners[nIndex]; nIndex++)
            if (oListener[0] == oEventPseudo.type && !oListener[2])
                (oListener[1].handleEvent || oListener[1]).apply(this, [oEventPseudo]);
    };

    //
    cXMLHttpRequest.prototype.toString    = function() {
        return '[' + "object" + ' ' + "XMLHttpRequest" + ']';
    };

    cXMLHttpRequest.toString    = function() {
        return '[' + "XMLHttpRequest" + ']';
    };

    // Helper function
    function fReadyStateChange(oRequest) {
        // Sniffing code
        if (cXMLHttpRequest.onreadystatechange)
            cXMLHttpRequest.onreadystatechange.apply(oRequest);

        // Fake event
        oRequest.dispatchEvent({
            'type':            "readystatechange",
            'bubbles':        false,
            'cancelable':    false,
            'timeStamp':    new Date + 0
        });
    };

    function fGetDocument(oRequest) {
        var oDocument    = oRequest.responseXML,
            sResponse    = oRequest.responseText;
        // Try parsing responseText
        if (bIE && sResponse && oDocument && !oDocument.documentElement && oRequest.getResponseHeader("Content-Type").match(/[^\/]+\/[^\+]+\+xml/)) {
            oDocument    = new window.ActiveXObject("Microsoft.XMLDOM");
            oDocument.async                = false;
            oDocument.validateOnParse    = false;
            oDocument.loadXML(sResponse);
        }
        // Check if there is no error in document
        if (oDocument)
            if ((bIE && oDocument.parseError != 0) || !oDocument.documentElement || (oDocument.documentElement && oDocument.documentElement.tagName == "parsererror"))
                return null;
        return oDocument;
    };

    function fSynchronizeValues(oRequest) {
        try {    oRequest.responseText    = oRequest._object.responseText;    } catch (e) {}
        try {    oRequest.responseXML    = fGetDocument(oRequest._object);    } catch (e) {}
        try {    oRequest.status            = oRequest._object.status;            } catch (e) {}
        try {    oRequest.statusText        = oRequest._object.statusText;        } catch (e) {}
    };

    function fCleanTransport(oRequest) {
        // BUGFIX: IE - memory leak (on-page leak)
        oRequest._object.onreadystatechange    = new window.Function;
    };

    // Internet Explorer 5.0 (missing apply)
    if (!window.Function.prototype.apply) {
        window.Function.prototype.apply    = function(oRequest, oArguments) {
            if (!oArguments)
                oArguments    = [];
            oRequest.__func    = this;
            oRequest.__func(oArguments[0], oArguments[1], oArguments[2], oArguments[3], oArguments[4]);
            delete oRequest.__func;
        };
    };

    L.HttpObj.XMLHttpRequest = cXMLHttpRequest;
})();

/**
 * @class
 * @name L.Map
 * @description 地图类
 */
L.Map = L.Class.extend({
    includes: L.Mixin.Events,
    
    options: {
        // state
        center: null,
        zoom: null,
        layers: [],

        // interaction
        drag: true,
        touchZoom: L.Util.Browser.touch && !L.Util.Browser.android,
        scrollWheelZoom: !L.Util.Browser.touch,
        doubleClickZoom: true,
       
        boxZoom: true,

        // controls
        zoomControl: true,
        attributionControl: false,

        // animation
        //fadeAnimation: L.Util.TRANSITION && !L.Util.Browser.android23,
        //zoomAnimation: L.Util.TRANSITION && !L.Util.Browser.android && !L.Util.Browser.mobileOpera,
        zoomAnimation: L.Util.TRANSITION && !L.Util.Browser.android23 && !L.Util.Browser.mobileOpera,
        markerZoomAnimation: L.Util.TRANSITION && L.Util.Browser.any3d,
        
        // misc
        closeDialogOnClick: false,

        dragging: true,

        inertia:  !L.Util.Browser.android23,
        //inertia: !L.Util.Browser.android23,
        inertiaDeceleration: 3400, // px/s^2
        inertiaMaxSpeed: 1300, // px/s
        inertiaThreshold: L.Util.Browser.touch ? 32 : 18, // ms
        easeLinearity: 0.25,

        longPress: true,

        // TODO refactor, move to CRS
        worldCopyJump: false
    },
    
    /**
     * @constructor
     * @name L.Map
     * @description 创建地图类对象
     * @param {String} id 地图控件容器的ID属性
     * @param {L.MapOptions} options 地图初始化参数，参数的选择参见<L.MapOptions>类
     */
    initialize: function(id, options) {
    
        L.Util.setOptions(this, options);
        options = L.Util.extend({}, options);
        this._container = L.Util.get(id);
        if (this._container._leaflet_used_tag) {
            throw new Error("Map container is already initialized.");
        }
        this._container._leaflet_used_tag = true;
        
        this._initLayout();
        this._initEvents();
        this._initInteraction();
        
        
        this._layers = {};
        this._layerIds = new Array();
        if(options){
            if (options && options.maxExtent) {
                this.setMaxBounds(options.maxExtent);
            }
            var layers = this.options.layers || [];
            layers = (layers instanceof Array ? layers : [layers]);
            
            this._initLayers(layers);
            var center = this.options.center,
                zoom = this.options.zoom;
            if (center !== null && zoom !== null && this.basicLayer) {
                this.setView(center, zoom);
            }
        }
       
        this._initOverlays();
    },
    
    /////////////////////////////////////////////////////////////////
    ////////////////////// 地图状态方法  ////////////////////////////
    /////////////////////////////////////////////////////////////////
    
    /**
     * @function
     * @name getSize
     * @description 创建地图控件容器的大小
     * @return {L.Loc} 地图容器大小
     */
    getSize: function () {
        if (!this._size || this._sizeChanged) {
            this._size = new L.Loc(this._container.clientWidth, this._container.clientHeight);
            this._sizeChanged = false;
        }
        return this._size;
    },
    
    /**
     * @function
     * @name getCenter
     * @description 获取当前视口范围内地图的中心点坐标
     * @return {L.Loc} 中心点坐标
     */
    getCenter:function(){
        return this._getCenter();
    },
    
    /**
     * @function
     * @name getZoom
     * @description 获取地图当前的缩放级别
     * @return {Number} 缩放级别
     */
    getZoom: function () {
        return this.zoom;
    },
    
    /**
     * @function
     * @name getZoomCount
     * @description 获取地图的缩放级数
     * @return {Number} 地图的缩放级数
     */
    getZoomCount:function () {
        var result = 0;
        if(this.basicLayer)
            result = this.basicLayer.resolutions.length;
        return result;
    },
    
    /**
     * @function
     * @name getScale
     * @description 获取地图在当前缩放级别下所对应的比例尺
     * @return {Number} 地图当前比例尺
     */
    getScale:function() {
        var scale = null;
        if(this.basicLayer != null){
            var units = this.getUnits();
            var res = this.getResolution();
            if(units === null){
                units = "degrees";
            }
            scale = res * (L.Util.INCHES_PER_UNIT[units]) * 96;
        }
        return scale;
    },
    
    /**
     * @function
     * @name getResolution
     * @description 获取地图在当前缩放级别下所对应的分辨率
     * @return {Number} 地图当前分辨率
     */
    getResolution: function () {
        var resolution = null;
        if (this.basicLayer != null) {
            resolution = this.basicLayer._getResolution();
        }
        return resolution;
    },
    
    /**
     * @function
     * @name getResolutions
     * @description 获取地图在当前底图图层下所使用的所有分辨率数组
     * @return {Array<Number>} 地图底图图层所使用的所有分辨率数组
     */
    getResolutions: function () {
        if(!this.basicLayer) return null;
        return this.basicLayer._getResolutions();
    },
    
    /**
     * @function
     * @name getExtent
     * @description 获取当前视口范围下的地图坐标范围
     * @return {L.Extent} 地图当前范围
     */
    getExtent: function () {
        var extent = null;
        if (this.basicLayer != null) {
            extent = this.basicLayer._getExtent();
        }
        return extent;
    },
    
    /**
     * @function
     * @name getMaxExtent
     * @description 获取地图的最大范围
     * @return {L.Extent} 地图的最大范围
     */
    getMaxExtent:function(){
        var result = null;
        if(this.basicLayer)
           result = this.maxExtent || this.basicLayer.maxExtent || this._getDefaultMaxExtent();
        else
            result = this.maxExtent || this._getDefaultMaxExtent();
        return result;
    },
    
    /**
     * @function
     * @name getUnits
     * @description 获取地图的坐标系统采用的计量单位
     * @return {String} 地图单位，如"dd", "m"等
     */
    getUnits:function(){
        return this.basicLayer ? this.basicLayer.getUnits() : (this.units || 'dd');
    },

    /**
     * @function
     * @name getProjection
     * @description 获取地图的投影
     * @return {L.Proj} 地图投影
     */
    getProjection: function () {
        return this.basicLayer ? this.basicLayer.getProjection() : null;
    },
    
    
    /////////////////////////////////////////////////////////////////
    ////////////////////// 地图状态配置方法  ////////////////////////
    /////////////////////////////////////////////////////////////////
    
    /**
     * @function
     * @name zoomIn
     * @description 将当前地图放大一级
     */
    zoomIn: function () {
        return this._setZoom(this.zoom + 1);
    },

    /**
     * @function
     * @name zoomOut
     * @description 将当前地图缩小一级
     */
    zoomOut: function () {
        return this._setZoom(this.zoom - 1);
    },
    
    /**
     * @function
     * @name moveTo
     * @description 将当前地图缩放到指定的中心点和级别
     * @param {L.Loc} center 指定的地图中心点
     * @param {Number} zoom 指定的地图缩放级别
     */
    moveTo: function(center, zoom) {
        return this.setView(center, zoom);
    },

    /**
     * @function
     * @name panBy
     * @description 将当前地图按照指定的偏移量(以像素为单位)进行平移
     * @param {L.Loc} offset 指定的像素偏移量。offset.x代表横向偏移量，offset.y代表纵向偏移量
     */
    panBy: function (offset, panOptions) {
        if (!(offset.x || offset.y)) {
            return this;
        }

        if (!this._panTransition) {
            this._panTransition = new L.Transition(this._mapPane, panOptions);

            this._panTransition.on('step', this._onPanTransitionStep, this);
            this._panTransition.on('end', this._onPanTransitionEnd, this);
            
        }
        this.fire('movestart');
        //this._mapPane.className += " leaflet-pan-anim";
        L.Util.addClass(this._mapPane, "leaflet-pan-anim");
        this._panTransition.run({
            position: L.Util.getPosition(this._mapPane).subtract(offset)
        });
        this.on("zoomstart", this._endPanBy, this);

        return this;
    },
    
    _endPanBy:function(){
        this._panTransition._onTransitionEnd();
        var tilePane = this.basicLayer._container,
            tileBg = this._tileBg;
            
        if (tileBg) {

            this._stopLoadingImages(tilePane);
            return;
        }
    },
    _onPanTransitionStep: function () {
        this.fire('move');
    },

    _onPanTransitionEnd: function () {
        //this._mapPane.className = this._mapPane.className.replace(' leaflet-pan-anim', "");        
        L.Util.removeClass(this._mapPane, "leaflet-pan-anim");
        this.fire('moveend');
    },

    _getLoadedTilesPercentage: function (container) {
        var tiles = container.getElementsByTagName('img'),
            i, len, count = 0;

        for (i = 0, len = tiles.length; i < len; i++) {
            if (tiles[i].complete) {
                count++;
            }
        }
        if(len == 0) return 1;
        return count / len;
    },
    
    _stopLoadingImages: function (container) {
        //var tiles = Array.prototype.slice.call(container.getElementsByTagName('img')),
        var tiles = container.getElementsByTagName('img'),
            i, len, tile;

        for (i = 0, len = tiles.length; i < len; i++) {
            tile = tiles[i];

            if (tile && !tile.complete) {
                tile.onload = L.Util.falseFn;
                tile.onerror = L.Util.falseFn;
                //tile.src = L.Util.emptyImageUrl;
                tile.src = '';

                tile.parentNode.removeChild(tile);
            }
        }
    },
    
    _stopLoadingBgTiles: function () {
        var tiles = [].slice.call(this._tileBg.getElementsByTagName('img'));

        for (var i = 0, len = tiles.length; i < len; i++) {
            if (!tiles[i].complete) {
                // tiles[i].src = '' 
                tiles[i].parentNode.removeChild(tiles[i]);
                tiles[i] = null;
            }
        }
    },

    _loadTileBg:function() {
        if(this._bTileBgTag && this.basicLayer){
            var tilePane = this.basicLayer._container,
            tileBg = this._tileBg;
            
            if(tilePane && tileBg){
                if(this._getLoadedTilesPercentage(tilePane) > 0.9)
                    this._clearTileBg();
            }
        }
    },
    
    /**
     * @function
     * @name zoomToMaxExtent
     * @description 将当前地图缩放至最大范围
     */
    zoomToMaxExtent:function() {
        var bounds = this.getMaxExtent();
        if(bounds){
            this.zoomToExtent(bounds);
        }
    },
    
    /**
     * @function
     * @name zoomToExtent
     * @description 将当前地图缩放至指定范围
     * @param {L.Extent} extent 指定的地图范围
     */
    zoomToExtent: function (extent) {
        if(extent && (extent instanceof L.Extent)) {
            var center = extent.getCenter();
            var zoom = this.getZoomForBounds(extent);
            this.setView(center, zoom);
        }
    },

    /**
     * @function
     * @name zoomToScale
     * @description 将当前地图缩放至指定比例尺,当指定的比例尺参数无效时,该函数将地图缩放至最大范围
     * @param {Number} scale 指定的地图比例尺
     * @param {L.Loc} center 可选参数,指定缩放后的地图中心点
     */
    zoomToScale: function(scale,center) {
        if (scale && !(isNaN(scale))) {
            var unit = this.getUnits(),
                res = scale / (L.Util.INCHES_PER_UNIT[unit] * 96),
                center = center || this.getCenter(),
                zoom = this.basicLayer._getZoomByRes(res);
            this.setView(center, zoom);
        } else {
            this.zoomToMaxExtent();
        };
    },
    
    _zoomWithAnimation: function (center, zoom, centerOffset) {
        if (this._getAnimatingZoom()) {
            return true;
        }
        
        // if (!this.options.zoomAnimation) {
            // return false;
        // }
        if(!this.basicLayer instanceof L.Layers.TileBase){
            return false;
        }
        
        this._animateToCenter = center;
        this._animateToZoom = zoom;
        if(this._clearTileBgTimer){
            clearTimeout(this._clearTileBgTimer);
        }
        this.fire('zoomstart');
        this._prepareTileBg();
        if(!this._tileBg || this._tileBg.children.length == 0)
            return false;
        

        var tiles = this._tileBg.getElementsByTagName('img');
        if(!tiles || tiles.length <= 0)
            return false;


        L.Util.addClass(this._mapPane, 'leaflet-zoom-anim2');

        var res = this.getResolution();
        var newRes = this.getResByZoom(zoom);
        this._scale = newRes / res ;
        this._zoomCenter = (center.subtract(this._getCenter().multiplyBy(this._scale))).divideBy(1 - this._scale);
        this._zoomCenterPixel = this._pointToAbsPixel(this._zoomCenter);
        this._interval = Math.round(1000/60);
        this._startTime = L.Util.getTime();
        clearInterval(this._zoomAnimationTimer);
        var that = this;
        
        this._zoomAnimationTimer = setInterval(that._zoomAnimationStep(that), this._interval);

        return true;
    },

    _zoomAnimationStep: function (that) {
        var map = that;
        return (function(){
            var time = L.Util.getTime(),
                elapsed = time - map._startTime,
                duration = 400;
            if (elapsed < duration) {
                map._runTimerAnimation(L.Util.getBezierPos(elapsed / duration));
            } else {
                map._runTimerAnimation(1);
                map._completeZoomAnim();
            }
        });
    },

    _getAnimatingZoom : function () {
        return this._animatingZoom || this._tmpAnimatingZoom;
    },
    
    _runTimerAnimation: function (percentComplete) {
        var tiles = this._tileBg.getElementsByTagName('img');
        var pos, el, tmps = 1 + (this._scale - 1) * percentComplete, tmpwidth, tmpheight;
        this._tmpAnimatingZoom = true;
        for(var i = 0, len = tiles.length; i < len; i++){
            el = tiles[i];
            if(!el)continue;
            if(!this._animatingZoom){
                el._aiw = parseInt(el.style.width);//el._aiw || this._initialTileSize.x;
                el._aiy = parseInt(el.style.height);//el._aiy || this._initialTileSize.y;
                pos = L.Util.getPosition(el,true);
                if(pos)
                    L.Util.setPosition(el, new L.Loc(parseInt(pos.x), parseInt(pos.y)));
                // if(el.style.left !== undefined && el.style.left !== null && el.style.top !== undefined && el.style.top !== null){
                    // L.Util.setPosition(el, new L.Loc(parseInt(el.style.left), parseInt(el.style.top)));
                // }
            }
            
            pos = L.Util.getPosition(el);
            tmpwidth = Math.ceil(el._aiw  / tmps);
            tmpheight = Math.ceil(el._aiy / tmps);
            // tmpwidth = Math.ceil(this._initialTileSize.x / tmps);
            // tmpheight = Math.ceil(this._initialTileSize.y / tmps);
            el.style.width = tmpwidth + "px";
            el.style.height = tmpheight + "px";
            var tmpscale =1 + (this._scale - 1) * percentComplete;
            var newPos = pos.subtract(this._zoomCenterPixel).divideBy(tmpscale).add(this._zoomCenterPixel);
            L.Util.setPosition(el, newPos, false, true);
            // el.style.left = newPos.x + 'px';
            // el.style.top = newPos.y + 'px';
        }
        this._tmpAnimatingZoom = false;
        this._animatingZoom = true;
        this.fire('step');
    },

    _completeZoomAnim: function () {
        clearInterval(this._zoomAnimationTimer);
        this._onZoomTransitionEnd();
    },
    
    _onZoomTransitionEnd: function () {
        L.Util.falseFn(this._tileBg.offsetWidth);
        this._resetView(this._animateToCenter, this._animateToZoom, true, true);
        
        L.Util.removeClass(this._mapPane, 'leaflet-zoom-anim2');
       
        this._tmpAnimatingZoom = false;
        this._animatingZoom = false;
        // if (this._checkDragEnable()) {
            // this._handlers["drag"].enable();
        // }
    },

    _prepareTileBg:function(){
        var tilePane = this.basicLayer._container,
            tileBg = this._tileBg;
            
        if (tileBg && this._getLoadedTilesPercentage(tileBg) > 0.5 &&
                      this._getLoadedTilesPercentage(tilePane) < 0.5) {

            this._stopLoadingImages(tilePane);
            return;
        }
        if(this._tileBg && this._tileBg.childNodes && this._tileBg.childNodes.length > L.Util.MaxBgTileCount)
            this._clearTileBg();
        if (!this._tileBg) {
            this._tileBg = L.Util.create('div', 'leaflet-tile-pane', this._mapPane);
            this._tileBg.style.zIndex = 1;
        }
        
        var tmpTiles = this.basicLayer._tiles;
        this._initialTileSize = this.basicLayer.getTileSize ? this.basicLayer.getTileSize() : this.getSize();
        var bgTiles = [], key;
        for (key in tmpTiles) {
            if (tmpTiles.hasOwnProperty(key)) {
                if(tmpTiles[key].complete){
                    bgTiles.push(tmpTiles[key]);
                }
                // else
                    // this.basicLayer._removeTile(tmpTiles[key]);
            }
        }
        tmpTiles = null;
        
       
        //todo
        if(bgTiles.length > 0){
            var k, len;
            for (k = 0, len = bgTiles.length; k < len; k++) {
                this._tileBg.appendChild(bgTiles[k]);
            }
        }
        
        bgTiles.length = 0;  
        bgTiles = null;
        
        this._bTileBgTag = true;
        if(this.basicLayer){
            this.basicLayer.on("loaded", this._clearTileBg, this);
            this.basicLayer.on("tileload", this._loadTileBg, this);
            if(true || L.Util.Browser.ie){
                if(this._ieBgClearTimer)
                    clearInterval(this._ieBgClearTimer);
                //var that = this;
                this._ieBgClearTimer = setInterval(this._clearIeTileBg(this), 2000);
            }
        }
    },
    
    _clearIeTileBg: function (that) {
        var map = that;
        return (function(){
            map._loadTileBg();
        });
    },

    
    /**
     * @function
     * @name setMode
     * @description 设置地图操作状态
     * @param {String} type 地图操作状态标识
     * @param {object} options 地图在设定的操作状态下的参数控制 , type与options的设置说明如下表:<j_html_split_tag><br/>
     * <table>
     * <tr><td>type</td><td>说明</td><td>options</td></tr>
     * <tr><td>drag</td><td>仅平移</td><td>null</td></tr>
     * <tr><td>zoom</td><td>仅缩放</td><td>null</td></tr>
     * <tr><td>zoomboxin</td><td>拉框放大</td><td>null</td></tr>
     * <tr><td>zoomboxout</td><td>拉框缩小</td><td>null</td></tr>
     * <tr><td>dragzoom</td><td>缩放平移</td><td>null</td></tr>
     * <tr><td>measurelength</td><td>距离量测</td><td>null</td></tr>
     * <tr><td>measurearea</td><td>面积量测</td><td>null</td></tr>
     * <tr><td>drawpoint</td><td>绘制点</td><td>{L.Ols.PolygonOptions} 所绘制点要素的参数控制</td></tr>
     * <tr><td>drawline</td><td>绘制线</td><td>{L.Ols.LineOptions} 所绘制线要素的参数控制</td></tr>
     * <tr><td>drawpolygon</td><td>绘制面</td><td>{L.Ols.PolygonOptions} 所绘制面要素的参数控制</td></tr>
     * <tr><td>drawrect</td><td>绘制矩形</td><td>{L.Ols.PolygonOptions} 所绘制矩形要素的参数控制</td></tr>
     * <tr><td>drawcircle</td><td>绘制圆形</td><td>{L.Ols.PolygonOptions} 所绘制圆形要素的参数控制</td></tr>
     * <tr><td>drawmarker</td><td>绘制标注，标注类型通过options设置"markerClassName"属性(该属性为NClass类型，非字符串)，默认值为NMarker</td><td>{L.Ols.MarkerOptions}或{L.Ols.BgMarkerOptions}，类型根据markerClassName参数值而定 所绘制标注的参数控制</td></tr>
     * </table>
     */
    setMode: function(type, options) {
        
        type = type.toLowerCase();
        if(this._curMode && this._curMode == type){
            return this;
        }
        else{
            if((this._curMode == "measurelength" || this._curMode == "measurearea") && this._handlers[this._curMode]){
                this._handlers[this._curMode].disable();
                // delete this._handlers[this._curMode];
                // this._handlers[this._curMode] = null;
            }
        }
        var activeHandlerTypes = [];
        if(type == "dragzoom"){
            this._hegemonTag = false;
            activeHandlerTypes = ["drag", "doubleclickzoom", "scrollwheelzoom", "touchzoom"];
            //  activeHandlerTypes = ["touchzoom"];
        }
        else if(type == "drag"){
            this._hegemonTag = false;
            activeHandlerTypes = ["drag"];
        }
        else if(type == "zoom"){
            this._hegemonTag = false;
            activeHandlerTypes = ["doubleclickzoom", "scrollwheelzoom","touchzoom"];
        }
        else if(type == "measurelength"){
            this._hegemonTag = true;
            this.on("measureend", this._onMeasureEnd, this);
            activeHandlerTypes = ["doubleclickzoom","drag","scrollwheelzoom","measurelength"];
        }
        else if(type == "measurearea"){
            this._hegemonTag = true;
            this.on("measureend", this._onMeasureEnd, this);
            activeHandlerTypes = ["doubleclickzoom","drag","scrollwheelzoom","measurearea"];
        }
        else if(type == "drawpoint"){
            this._hegemonTag = true;
            activeHandlerTypes = ["doubleclickzoom","drag", "drawpoint"];
        }
        else if(type == "drawline"){
            this._hegemonTag = true;
            activeHandlerTypes = ["doubleclickzoom","drawline"];
        }
        else if(type == "drawpolygon"){
            this._hegemonTag = true;
            activeHandlerTypes = ["doubleclickzoom","doubleclickzoom","drawpolygon"];
        }
        else if(type == "drawrect"){
            this._hegemonTag = true;
            activeHandlerTypes = ["doubleclickzoom","drawrect"];
        }
        else if(type == "zoomboxin"){
            this._hegemonTag = true;
            options = options || {};
            options._zoomInTag = true;
            activeHandlerTypes = ["zoomboxin", "doubleclickzoom","scrollwheelzoom"];
        }
        else if(type == "zoomboxout"){
            options = options || {};
            options._zoomInTag = false;
            this._hegemonTag = true;
            activeHandlerTypes = ["zoomboxout", "doubleclickzoom","scrollwheelzoom"];
        }
        else if(type == "drawcircle"){
            this._hegemonTag = true;
            activeHandlerTypes = ["drawcircle"];
        }
        else if(type == "drawsector"){
            this._hegemonTag = true;
            activeHandlerTypes = ["drawsector"];
        }
        else if(type == "drawmarker"){
            this._hegemonTag = true;
            activeHandlerTypes = ["drag", "drawmarker"];
        }
        
        var i = 0, len = activeHandlerTypes.length;
        if(len <= 0)
            return this;
        
        this._handlers = this._handlers || {};
        
        var tmpkey;
        for (i = 0; i < len; i++) {
            tmpkey = activeHandlerTypes[i];
            if(this._handlers.hasOwnProperty(tmpkey) && this._handlers[tmpkey]){
                this._handlers[tmpkey].enable();
            }
            else{
                if(L.HandlerHash[tmpkey]){
                    this._handlers[tmpkey] = new L.HandlerHash[tmpkey](this);
                    this._handlers[tmpkey].enable();
                }
            }
        }
        for (tmpkey in this._handlers) {
            if (this._handlers.hasOwnProperty(tmpkey) && this._handlers[tmpkey]) {
                if(!L.Util.checkInArray(tmpkey, activeHandlerTypes) && this._handlers[tmpkey]){
                    this._handlers[tmpkey].disable();
                }
            }
        }
       
        if(this._handlers[type] && this._handlers[type].setHandlerOptions){
            if(this._handlers[type])
                this._handlers[type].setHandlerOptions(options);
        }
        
        this._curMode = type;
        return this;
    },
    
    _checkDragEnable: function() {
        if(!this._handlers || !this._handlers["drag"])
            return false;
        var res = true;
        if(this._curMode == "measurelength" || this._curMode == "measurearea"|| this._curMode == "drawcircle"|| this._curMode == "drawpolygon"|| this._curMode == "drawrect"|| this._curMode == "drawline"|| this._curMode == "drawsector"|| this._curMode == "zoom")
            res = false;
        return res;
    },
    
    /////////////////////////////////////////////////////////////////
    ////////////////////// 图层操作相关方法  ////////////////////////
    /////////////////////////////////////////////////////////////////
    
    /**
     * @function
     * @name getBasicLayer
     * @description 获取当前地图对象所使用的底图图层
     * @return {L.Layers.Base} 底图图层
     */
    getBasicLayer:function() {
        return this.basicLayer || null;
    },

    /**
     * @function
     * @name setBasicLayer
     * @description 为当前地图对象设置底图图层
     * @param {L.Layers.Base} layer 要设置的底图图层
     */
    setBasicLayer:function(newBasicLayer) {
        if(!newBasicLayer || !newBasicLayer.isBasicLayer)
            return this;

        if(!this.hasLayer(newBasicLayer)){
            this.addLayer(newBasicLayer);
        }
        var oldExtent = null;
        var oldResolution = null;
        if (this.basicLayer) {
            oldExtent = this.getExtent();
            oldResolution = this.getResolution();
        }
        
        if(!this.basicLayer || L.Util.stamp(this.basicLayer) != L.Util.stamp(newBasicLayer)){
            if (this.basicLayer != null) {
                this._clearTileBg();
                this.basicLayer.off('loaded', this._clearTileBg, this);
                this.basicLayer.off('tileload', this._loadTileBg, this);
                this.basicLayer.setVisible(false);
            }
            this.basicLayer = newBasicLayer;
            this.basicLayer.on('loaded', this._clearTileBg, this);
            this.basicLayer.setVisible(true);
            
            var center = this.getCenter();
            if (center != null) {
                var newCenter = (oldExtent) ? oldExtent.getCenter() : center;
                if(this.basicLayer.maxExtent != null && !this.basicLayer.maxExtent.contains(newCenter)){
                    this.zoomToMaxExtent();
                }
                else{
                    center = this.options.center,
                        zoom = this.options.zoom;
                    if (center !== null || zoom !== null) {
                        this.setView(center, zoom, true);
                    } else {
                        var newZoom = this.basicLayer._getZoomByRes(oldResolution);
                        this.setView(newCenter, newZoom, true);
                    }
                }
                
            }
            

            this.fire("changebasiclayer", {
                layer: this.basicLayer
            });
        }
        return this;
    },
     
    
    _checkAllLayersFilledTag:function () {
        // var res = true;
        // for(var i in this._layers){
            // if(this._layers.hasOwnProperty(i)){
                // if(this._layers[i] && this._layers[i]._filledTag === false){
                    // res = false;
                    // break;
                // }
            // }
        // }
        return this.basicLayer._filledTag;
    },

    /**
     * @function
     * @name addLayer
     * @description 为当前地图添加图层
     * @param {L.Layers.Base} layer 要添加的图层对象
     */
    addLayer: function (layer, insertAtTheTop) {
        if(!layer) return this;
        var id = L.Util.stamp(layer);
        if (this._layers[id]) {
            return this;
        }
       
        this.fire("preaddlayer", {
                layer: layer
            });
            
        this._layers[id] = layer;
        if(layer.isBasicLayer)
            this._layerIds.splice(0, 0, id);
        else
            this._layerIds.push(id);

       
        
        layer._setMap(this);
     
        if (this.attributionControl && layer.getAttribution) {
            this.attributionControl.addAttribution(layer.getAttribution());
        }
        
        if (layer.isBasicLayer)  {
            if (!this.basicLayer) {
                this.setBasicLayer(layer);
            } else {
                layer.setVisible(false);
            }
            // if (this.options.zoomAnimation)
                // layer.on('load', this._onBasicLayerLoad, this);
        } else {
            layer.redraw();
        }
        this.fire("layeradded", {layer: layer});
        if(layer._afterAdd)
            layer._afterAdd();
        
        return this;
    },
    
    whenReady: function (callback, context) {
        if (this._loaded) {
            callback.call(context || this, this);
        } else {
            this.on('load', callback, context);
        }
        return this;
    },
    
    /**
     * @function
     * @name hasLayer
     * @description 检测指定的图层对象是否已存在于地图中
     * @return {Boolean} 地图中如已存在指定的图层对象则返回true , 否则返回 false
     */
    hasLayer: function (layer) {
        var id = L.Util.stamp(layer);
        return this._layers.hasOwnProperty(id);
    },
    
    /**
     * @function
     * @name removeLayer
     * @description 从地图中移除指定的图层对象
     * @param {L.Layers.Base} layer 要移除的图层对象
     */
    removeLayer: function (layer) {
        var id = L.Util.stamp(layer);
        if(!this._layers[id]) return this;
        var len = this.getLayersCount(), lyrIndex;
        var i;
        for(i = 0; i < len; i++){
            if(this._layerIds[i] == id){
                lyrIndex = i;
                break;
            }
        }
        var newBasicLayerId = null,tmpId;
        if(layer.isBasicLayer){
            for(i = 0; i < len; i++){
                tmpId = this._layerIds[i];
                if(tmpId == id)
                    continue;
                
                if(this._layers[tmpId] && this._layers[tmpId].isBasicLayer){
                        newBasicLayerId = tmpId;
                        break;
                    }
            }
            if(!newBasicLayerId) 
                return this;
            this.setBasicLayer(this._layers[newBasicLayerId]);
            // if (this.options.zoomAnimation)
                // layer.off('load', this._onBasicLayerLoad, this);
        }
        
        layer._unsetMap();
        
        delete this._layerIds[lyrIndex];
        delete this._layers[id];
        
        
        this.fire("layerremoved", {layer:layer});

        return this;
    },

     /**
     * @function
     * @name getLayersCount
     * @description 获取地图中的图层总数
     * @return {Number} 地图中的图层总数
     */
    getLayersCount: function () {
        return this._layerIds ? this._layerIds.length : 0;
    },
    
     /**
     * @function
     * @name getLayers
     * @description 获取地图中的所有图层
     * @return {Array<L.Layers.Base>} 以数组形式返回地图中的所有图层
     */
    getLayers: function() {
        var returnArr = null;
        if(!this._layers) return null;
        var key;
        for(key in this._layers){
            if(this._layers.hasOwnProperty(key) && (this._layers[key])){
                if(!returnArr) 
                    returnArr = new Array();
                returnArr.push(this._layers[key]);
            }
        }
        return returnArr;
    },
    
    /**
     * @function
     * @name getLayersByName
     * @description 获取地图中名称等于指定值的所有图层
     * @param {String} 指定的图层名称
     * @param {Boolean} 指定的图层名称的比较是否区分大小写,默认为false
     * @return {Array<L.Layers.Base>} 以数组形式符合条件的所有图层
     */
    getLayersByName: function(name, cmpNoCase) {
        var returnArr = null;
        if(!this._layers) return null;
        var key, tmpName;
        name = (!cmpNoCase) ? name : name.toLowerCase();
        for(key in this._layers){
            if(this._layers.hasOwnProperty(key) && (this._layers[key])){
                tmpName = this._layers[key].getName();
                tmpName = (!cmpNoCase) ? tmpName : tmpName.toLowerCase();
                if(tmpName == name){
                    if(!returnArr) 
                        returnArr = new Array();
                    returnArr.push(this._layers[key]);
                }
                
            }
        }
        return returnArr;
    },
    
    /**
     * @function
     * @name getLayerById
     * @description 通过标识符获取地图中的图层
     * @param {String} id 指定的图层标识符
     * @return {L.Layers.Base} 以数组形式符合条件的图层
     */
    getLayerById: function(name) {
        if(!this._layers) return null;
        var key, tmpName;
        name = name.toLowerCase();
        for(key in this._layers){
            if(this._layers.hasOwnProperty(key) && (this._layers[key])){
                tmpName = this._layers[key].getId();
                tmpName = tmpName.toLowerCase();
                if(tmpName == name){
                    return this._layers[key];
                }
            }
        }
        return null;
    },
    
    
    ////////////////////////////////////////////////////////////////
    /////////////////////  热点操作相关方法   /////////////////////
    ////////////////////////////////////////////////////////////////
    
    /**
     * @function
     * @name addHotspots
     * @description 向地图中添加热点
     * @param {<NHotSpot> | Array<NHotSpot>} hotspots 要添加的热点或热点数组
     * @param {Boolean} noorders 热点区域是否按照其Y坐标的大小进行排序, 可选参数， 默认为false
     */
    addHotspots:function (hotspots, noorders) {
        if(!hotspots)
                return;
        var tmphotspots = (hotspots instanceof Array) ? hotspots : [hotspots];
        var index = 0, id, tmphotspot, tmphotspot2, hsCount, i = 0, len = tmphotspots.length;

        while(i < len){
            tmphotspot = tmphotspots[i];
            if(tmphotspot && tmphotspot.getPosition()){
                id = L.Util.stamp(tmphotspot);
                if(!this.hasHotspot(id)){
                    tmphotspot._setMap(this);
                    hsCount = this.getHotspotsCount();
                    if(!noorders)
                    for(index = 0; index < hsCount; index++){
                        tmphotspot2 = this._hotspots[index];
                        if(tmphotspot2){
                            if(tmphotspot2.getPosition().y > tmphotspot.getPosition().y){
                                break;
                            }
                        }
                    }
                    this._hotspots.splice(index, 0, tmphotspot);
                    this.fire("hotspotadded", {hotspot: tmphotspot});
                }
            }
            i++;
        }
        if(this.getHotspotsCount() > 0){
            this.on("mousemove", this._checkHotspot, this);
			
			
        }
        else {
            this.off("mousemove", this._checkHotspot);
        }
    },
    
    /**
     * @function
     * @name setHotspotInfoOffset
     * @description 设定热点提示信息距离热点区域的偏移值
     * @param {L.Loc} offset 指定的提示信息偏移量
     */
    setHotspotInfoOffset:function (value) {
        if(value && (value instanceof L.Loc))
            this.setHotspotLabelOptions({offset:value});
    },
    
    /**
     * @function
     * @name getHotspotsCount
     * @description 获取地图中的热点个数
     * @return {Number} 所有的热点区域总和
     */
    getHotspotsCount: function () {
        return this._hotspots ? this._hotspots.length : 0;
    },
    
    /**
     * @function
     * @name hasHotspot
     * @description 判断指定的热点对象是否存在于地图中
     * @param {NHotSpot} hotspot 指定的热点对象
     * @return {Boolean} 热点对象存在于地图中则返回true, 否则返回false
     */
    hasHotspot: function (hotspot) {
        var hsId = L.Util.stamp(hotspot);
        var id, tmphotspot, len = this._hotspots.length - 1;
        while(len >= 0){
            tmphotspot = this._hotspots[len];
            if(tmphotspot){
                id = L.Util.stamp(tmphotspot);
                if(id == hsId){
                    return true;
                }
            }
            len--;
        }
        return false;
    },
    
    /**
     * @function
     * @name removeHotspots
     * @description 从地图中移除指定的一个或多个热点
     * @param {L.Ols.Spot | Array<L.Ols.Spot>} hotspots 要移除的热点或热点集
     */
    removeHotspots: function (hotspots) {
        var maphscount = this.getHotspotsCount();
        if(!hotspots || maphscount <= 0)
            return;
        var tmphotspots = (hotspots instanceof Array) ? hotspots : [hotspots];
        var index = 0, id, len2, tmphotspot, tmphotspot2, hsCount, i = 0, len = tmphotspots.length - 1;
        
        while(len >= 0){
            tmphotspot = tmphotspots[len]; 
            if(tmphotspot && (tmphotspot instanceof L.Ols.Spot)){
                id = L.Util.stamp(tmphotspot);
                len2 = this._hotspots.length - 1;
                while(len2 >= 0){
                    tmphotspot2 = this._hotspots[len2];
                    if(tmphotspot2){
                        hsId = L.Util.stamp(tmphotspot2);
                        if(id == hsId){
                            this._hotspots.splice(len2, 1);
                            this.fire("hotspotremoved", {hotspot: tmphotspot2});
                            break;
                        }
                    }
                    len2--;
                }
            }
            len--;
        }
        return this;
    },
    
    /**
     * @function
     * @name clearHotspots
     * @description 清除地图中的所有热点
     */
    clearHotspots: function() {
        if(this._hotspots)
            this.removeHotspots(this._hotspots);
        return this;
            //this._hotspots.splice(0, this._hotspots.length);
    },
    
    _checkHotspot: function (e) {
        var poi = e.point,
            tmpSp2,
            tmpSp = null,
            res = this.getResolution();
            
        for(var len = this.getHotspotsCount() - 1; len >= 0; len--){
            tmpSp2 = this._hotspots[len];
            if(tmpSp2){
                var isValid = tmpSp2.checkValid(poi, res);
                if(isValid){
                    tmpSp = tmpSp2;
                    break;
                }
            }
        }
        
        if(tmpSp){
            this._showHotspotInfo(tmpSp);
            this.fire("hotspotvalid",{hotspot:tmpSp} );
        }
        else{
            this._hideHotspotInfo();
            this.fire("hotspotinvalid");
        }
    },
    _hotSpotLabelOptions: {
        offset: new L.Loc(10, 10),
        popable:false,
        zIndexOffset: 65535,
        clickable: false,
        draggable: false
    },
    
    _showHotspotInfo: function(hs) {
		this._currenthot = hs;
		
		if(hs._options.labelable){
			var labelOptions = hs._options.label;//this._hotSpotLabelOptions;
			if(!this._hsLabel){
				this._hsLabel = new L.Ols.Label(hs.getPosition(), labelOptions);
				this.addOverlays(this._hsLabel);
			}
			else{
				this._hsLabel.setPosition(hs.getPosition());
			}
			this._hsLabel.setOffset(labelOptions.offset);
			this._hsLabel.setContent(hs.getText());
			if(labelOptions.style) {
				this._hsLabel.setStyle(labelOptions.style);
			}else{
				var labelstyle = {
					'color':'#4D4D4D',
					'backgroundColor':'#FFFFE1',
					'font': '12px arial,simsun',
					'border': '#8c8c8c 1px solid',
					'padding': '1px'
				}
				this._hsLabel.setStyle(labelstyle);
			}
			this._hsLabel.setVisible(true);  
		}
		
		if(hs._options.imgable){
			var pos = this._pointToAbsPixel(hs.getPosition()).round();
			
			var _imgOptions = hs._options.img;
			var src = _imgOptions.imgUrl;//"./images/pock.png";
			var offset = _imgOptions.offset;
			var size = _imgOptions.size;
			
			if(!this._hsImg){
				var el;
				if (!L.Util.Browser.ie6) {
					el = document.createElement('img');
					el.src = src;
				} else {
					el = document.createElement('div');
					el.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + src + '")';
				}
				 el.className = 'leaflet-marker-img';
				 this._hsImg = el;
				 this._panes.markerPane.appendChild(this._hsImg);
				 L.DomEvent.addListener(this._hsImg, 'click', this._hotMouseClick, this);
			}
			L.Util.setPosition(this._hsImg, pos);
			this._hsImg.src = src;
			
			this._hsImg.style.marginLeft = -offset.x+'px';
			this._hsImg.style.marginTop = -offset.y+'px';
			this._hsImg.style.width= size.x + 'px';
			this._hsImg.style.height = size.y + 'px';
			this._hsImg.style.display = "block";
			this._hsImg.style.cursor = "hand";
		}
    },
	getHotspotMarker: function() {
        if(this._hsImg)
			return this._hsImg;
    },
	_hotMouseClick: function (e) {
		this._clickspotpos =  this._currenthot.getPosition();
		
		var makerOptions = this._currenthot._options.marker;
	
		var src = makerOptions.imgUrl;
		var offset = makerOptions.markerAnchor;
		var size = makerOptions.markerSize;
		var pixelpos = this._pointToAbsPixel(this._currenthot.getPosition()).round();
		
		if(!this._hsMarker){
			var el;
			if (!L.Util.Browser.ie6) {
				el = document.createElement('img');
				el.src = src;
			} else {
				el = document.createElement('div');
				el.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + src + '")';
			}
			 el.className = 'leaflet-marker-img';
			 this._hsMarker = el;
			 this._panes.markerPane.appendChild(this._hsMarker);
		}
		L.Util.setPosition(this._hsMarker, pixelpos);
		this._hsMarker.src = src;
		
		this._hsMarker.style.marginLeft = -offset.x+'px';
		this._hsMarker.style.marginTop = -offset.y+'px';
		this._hsMarker.style.width= size.x + 'px';
		this._hsMarker.style.height = size.y + 'px';
		this._hsMarker.style.display = "block";
		this._hsMarker.style.cursor = "hand";

		this.fire('hotspotclick', {hotspot:this._currenthot});
		L.DomEvent.stopPropagation(e);
		L.DomEvent.preventDefault(e);
		
		this.on('popupclosed',this._hideHotspotpopup);
		this.on('viewreset', this._updateMarkerPosition, this);
	},
	_hideHotspotpopup: function () {
		if(this._hsMarker){
			this._hsMarker.style.display = "none";
		}
		this.off('popupclosed',this._hideHotspotpopup);
	},
	_updateMarkerPosition: function () {
		if(this._clickspotpos){
			var pixelpos = this._pointToAbsPixel(this._clickspotpos).round();
			L.Util.setPosition(this._hsMarker, pixelpos);
		}else
			this.off('viewreset', this._updateMarkerPosition, this);
    },
    _hideHotspotInfo: function () {
        if(this._hsLabel){
            this._hsLabel.setVisible(false);
        }
		if(this._hsImg){
            this._hsImg.style.display = "none";
        }
        return this;
    },
    
    setHotspotLabelOptions: function (options) {
        L.Util.extend(this._hotSpotLabelOptions, options);
        if(this._hsLabel){
            var _labelOptions = this._hotSpotLabelOptions;
            if(_labelOptions.style) {
                this._hsLabel.setStyle(_labelOptions.style);
            }
        }
    },
    
    ////////////////////////////////////////////////////////////////
    ////////////////////// 右键菜单相关方法  ///////////////////////
    ////////////////////////////////////////////////////////////////
    
    /**
     * @function
     * @name addContextMenu
     * @description 为地图设置右键菜单
     * @param {<L.Ols.ContextMenu>} contextMenu 要添加的右键菜单对象
     */
    addContextMenu:function(contextMenu){
        if(contextMenu && (contextMenu instanceof L.Ols.ContextMenu)){
            this._contextMenu = contextMenu;
            L.DomEvent.addListener(this._container, 'contextmenu', this._showContextmenu, this);
            this._contextMenu._setMap(this);
        }
    },
    
    /**
     * @function
     * @name removeContextMenu
     * @description 移除地图的右键菜单
     */
    removeContextMenu:function(){
        L.DomEvent.removeListener(this._container, 'contextmenu', this._showContextmenu);
        this._contextMenu = null;
    },
    
    _showContextmenu:function(e){
        e = e || window.e;
        L.DomEvent.preventDefault(e);
        if(this._contextMenu)
            this._contextMenu.show({
            point: this.pixelToPoint(L.DomEvent.getMousePosition(e, this._container)),
            pixel: L.DomEvent.getMousePosition(e, this._container),
            absPixel: this._pixelToAbsPixel(L.DomEvent.getMousePosition(e, this._container))
        });
    },
    ////////////////////////////////////////////////////////////////
    ////////////////////// Overlay操作相关方法  ////////////////////
    ////////////////////////////////////////////////////////////////
    /**
     * @function
     * @name addOverlays
     * @description 向地图中覆盖物类
     * @param {<L.Ols.Base> | Array<L.Ols.Base>} overlays 要添加的覆盖物或者覆盖物数组
     */
    addOverlays: function(overlays) {
        var tmpoverlays = (overlays instanceof Array) ? overlays : [overlays];
        var id, tmpoverlay, i = 0, len = tmpoverlays.length;
        while(i < len){
            tmpoverlay = tmpoverlays[i];
            if(tmpoverlay){
                id = L.Util.stamp(tmpoverlay);
                if(!this.hasOverlay(id) && tmpoverlay._setMap){
                    tmpoverlay._setMap(this);
                    if(tmpoverlay._markerTarget && tmpoverlay._markerTarget.id != '')
                        id = tmpoverlay._markerTarget.id;
                    else    
                        id = L.Util.stamp(tmpoverlay);
                    this._overlays[id] = tmpoverlay;
                    this.fire("overlayadded", {overlay: tmpoverlay});
                }
            }
            i++;
        }
    },
    
    /**
     * @function
     * @name hasOverlay
     * @description 判断指定的覆盖物对象是否存在于地图中
     * @param {L.Ols.Base} overlay 指定的覆盖物对象
     * @return {Boolean} 覆盖物对象存在于地图中则返回true, 否则返回false
     */
    hasOverlay: function (overlay) {
        var tmpId = (typeof(overlay) == "string") ? overlay : L.Util.stamp(overlay);
        return this._overlays ? this._overlays.hasOwnProperty(tmpId) : false;
    },
    /**
     * @function
     * @name getOverlay
     * @description  根据覆盖物ID获取覆盖物对象
     * @param {string} id 指定的覆盖物对象ID
     * @return {L.Ols.Base} 覆盖物对象，若地图中不存在ID为指定值的覆盖物则返回NULL
     */
    getOverlay: function (id) {
        return (this._overlays && this._overlays.hasOwnProperty(id))? this._overlays[id] : NULL;
    },
    
    /**
     * @function
     * @name removeOverlays
     * @description 从地图中移除指定的一个或多个覆盖物
     * @param {L.Ols.Base | Array<L.Ols.Base>} overlays 要移除的覆盖物或覆盖物数组
     */
    removeOverlays: function (overlays) {
        var tmpoverlays = (overlays instanceof Array) ? overlays : [overlays];
        var tmpoverlay, id;
        for(var key in tmpoverlays){
            if(tmpoverlays.hasOwnProperty(key)){
                tmpoverlay = tmpoverlays[key];
                if(tmpoverlay && !(tmpoverlay.hasOwnProperty('_layerFlag') && tmpoverlay._layerFlag)){
                    if(tmpoverlay._markerTarget && tmpoverlay._markerTarget.id != '')
                        id = tmpoverlay._markerTarget.id;
                    else
                        id = L.Util.stamp(tmpoverlay);
                    if(this.hasOverlay(id)){
                        delete this._overlays[id];
                        tmpoverlay._unsetMap(this);
                        this.fire("overlayremoved", {overlay: tmpoverlay});
                    }
                }
            }
            
        }
    },
    
    /**
     * @function
     * @name clearOverlays
     * @description 移除地图中的所有覆盖物
     */
    clearOverlays: function () {
        this.setMode("dragzoom");
        var tmpLayer;
        if(this._layers){
            for(var key in this._layers){
                if(this._layers.hasOwnProperty(key)){
                    tmpLayer = this._layers[key];
                    if(tmpLayer && (tmpLayer instanceof L.Layers.Overlay)){
						if(tmpLayer instanceof L.Layers.WFS)
							continue;
						tmpLayer.clear();
                    }
                }
            }
        }
        if(this._overlays)
            this.removeOverlays(this._overlays);
    },
    
    /**
     * @function
     * @name setSingleDialog
     * @description 设置地图中的常态窗体(即唯一存在于地图中且不与任何Overlay绑定的单模式窗体)
     * @param {L.Popups.Base} popup 要设置的信息窗体
     */
    setSingleDialog: function(popup){
        if(this._singleDialog){
            this.removeSingleDialog();
        }
        popup._singleDlgTag = true;
        this._addDialog(popup);
        this._singleDialog = popup;
    },
    
    /**
     * @function
     * @name removeSingleDialog
     * @description 移除地图中的常态窗体
     */
    removeSingleDialog: function(){
        if(this._singleDialog){
            this._removeDialog(this._singleDialog);
        }
        this._singleDialog = null;
    },
    
    /**
     * @function
     * @name openSingleDialog
     * @description 打开地图中的常态窗体
     */
    openSingleDialog: function(){
        if(!this._singleDialog)
            return;
        //this._singleDialog._update();
        this._singleDialog.show();
        //this._addDialog(popup);
        this.fire('popupopened', { popup: this._popup });
    },
    
    /**
     * @function
     * @name closeSingleDialog
     * @description 关闭地图中的常态窗体
     */
    closeSingleDialog: function(){
        if(!this._singleDialog)
            return;
        this._singleDialog.hide();
        //this._addDialog(popup);
        this.fire('popupclosed', { popup: this._popup });
    },
    
    /**
     * @function
     * @name getSingleDialog
     * @description 获取地图中的常态窗体对象
     * @return {L.Popups.Base} 地图中的常态窗体
     */
    getSingleDialog: function() {
        return !!this._singleDialog ? this._singleDialog : null;
    },
    
    /**
     * @function
     * @name openDialog
     * @description 从地图中打开信息窗体
     * @param {L.Popups.Base} popup 要打开的信息窗体
     */
    openDialog: function (popup) {
        this.closeDialog();
        this._popup = popup;
        this._addDialog(popup);
        this.fire('popupopened', { popup: this._popup });
    
        return this;
    },
    
    /**
     * @function
     * @name closeDialog
     * @description 关闭地图中的信息窗体
     * @param {L.Popups.Base} popup 要关闭的信息窗体
     */
    closeDialog: function (dlg) {
        if (dlg) {
            this._removeDialog(dlg);
            this.fire('popupclosed', { popup: dlg });
            this._popup = null;
        }
        return this;
    },
    
    _addDialog: function (popup) {
        var id = L.Util.stamp(popup);
        var onMapLoad2 = function () {
            popup._setMap(this);
            this.fire('popupadded', {popup: popup});
        };

        if (this._loaded) {
            onMapLoad2.call(this);
        } else {
            this.on('load', onMapLoad2, this);
        }
        return this;
    },
    
    _removeDialog: function (popup) {
        if(!popup)return this;
        popup._unsetMap(this);
        this.fire('popupremoved', {popup: popup});
        return this;
    },

    
    
    /////////////////////////////////////////////////////////////////
    ////////////////////// 控件操作相关方法  ////////////////////////
    /////////////////////////////////////////////////////////////////
    
    /**
     * @function
     * @name addControl
     * @description 添加控件到地图中
     * @param {L.Controls.Base} control 要添加的地图控件
     */
    addControl: function (control) {
        if(control && control instanceof L.Controls.Base){
            var type = control.getType();
            if(!this.hasControlByType(type) || !control.singleAlive){
                var tmpId = L.Util.stamp(control);
                this._controls = this._controls || [];
                control._setMap(this);
                this._controls[tmpId] = control;
                this.fire("controladded", {control:control});
            }
        }
        return this;
    },

    /**
     * @function
     * @name hasControlByType
     * @description 检测是否已经添加指定类型的控件
     * @param {String} type 地图控件类型
     */
    hasControlByType:function(type) {
        if(this._controls){
            for (var i in this._controls) {
                if (this._controls.hasOwnProperty(i) && this._controls[i]) {
                    if(this._controls[i].getType && (this._controls[i].getType().toLowerCase() == type.toLowerCase())){
                        return true;
                    }
                }
            }
        }
        return false;
    },
    
    
    /**
     * @function
     * @name removeControl
     * @description 从地图中移除控件
     * @param {L.Controls.Base} control 要移除的地图控件
     */
    removeControl: function (control) {
        if(this._controls && control && control instanceof L.Controls.Base){
            var tmpId = L.Util.stamp(control);
            if(this._controls[tmpId])
                delete this._controls[tmpId];
            control._unsetMap(this);
            this.fire("controlremoved", {control:control});
        }
        return this;
    },
    
    /**
     * @function
     * @name removeControlByType
     * @description 从地图中移除指定类型控件
     * @param {String} type 要移除的地图控件类型
     */
    removeControlByType: function (type) {
        if(this._controls && type){
            if(this._controls){
                for (var i in this._controls) {
                    if (this._controls.hasOwnProperty(i) && this._controls[i]) {
                        if(this._controls[i].getType().toLowerCase() == type.toLowerCase())
                            this.removeControl(this._controls[i]);
                    }
                }
            }
        }
        return this;
    },
    
    _initControlDivs: function () {
        var corners = this._subControlDivs = {},
            l = 'leaflet-',
            container = this._controlDiv =
                L.Util.create('div', l + 'control-div', this._container);

        function createCorner(vSide, hSide) {
            var className = l + vSide + ' ' + l + hSide;

            corners[vSide + hSide] =
                    L.Util.create('div', className, container);
        }

        createCorner('top', 'left');
        createCorner('top', 'right');
        createCorner('bottom', 'left');
        createCorner('bottom', 'right');
    },
    
    /////////////////////////////////////////////////////////////////
    ////////////////////// 相关属性计算方法  ////////////////////////
    /////////////////////////////////////////////////////////////////
    
    /**
     * @function
     * @name getResByZoom
     * @description 根据缩放级别获取对应的分辨率
     * @param {Number} zoom 缩放级别
     * @return {Number} 缩放级别所对应的分辨率
     */
    getResByZoom: function(zoom) {
        return this.basicLayer._getResByZoom(zoom);
    },
    
    /**
     * @function
     * @name getZoomByRes
     * @description 根据分辨率获取对应的缩放级别
     * @param {Number} res 分辨率
     * @return {Number} 分辨率所对应的缩放级别
     */
    getZoomByRes: function (zoom) {
        return this.basicLayer._getZoomByRes(zoom);
    },

    /**
     * @function
     * @name getBounds
     * @description 根据指定的中心点和分辨率计算在当前地图视口下所对应的地理范围
     * @param {L.Loc} center 指定的中心点
     * @param {Number} res 指定的分辨率
     * @return {L.Extent} 对应范围
     */
    getBounds:function(center, resolution){
        var extent = null;
        if (center == null) {
            center = this._getCenter();
        }                
        if (resolution == null) {
            resolution = this.getResolution();
        }
        if ((center != null) && (resolution != null)) {
            var size = this.getSize();
            var w_deg = size.x * resolution;
            var h_deg = size.y * resolution;
        
            extent = new L.Extent(center.x - w_deg / 2,
                                           center.y - h_deg / 2,
                                           center.x + w_deg / 2,
                                           center.y + h_deg / 2);
        }
        return extent;
    },
    
    /**
     * @function
     * @name getZoomForBounds
     * @description 获取如若在当前地图视口范围条件下显示指定的地理范围，所应采取的缩放级别
     * @param {L.Extent} extent 指定的地理范围
     * @return {Number} 缩放级别
     */
    getZoomForBounds:function(bounds){
        if(!this.basicLayer)
            return 0;
        return this.basicLayer.getZoomForBounds(bounds);
    },

    /**
     * @function
     * @name pixelToPoint
     * @description 地图窗口的像素坐标转换为地理坐标
     * @param {L.Loc} pixel 指定的像素坐标
     * @return {L.Loc} 指定像素坐标所对应的地理坐标
     */
    pixelToPoint:function (pixel) {
        var latlng = null; 
        if (this.basicLayer != null) {
            latlng = this.basicLayer._pixelToPoint(pixel);
        }
        return latlng;
    },
    
    /**
     * @function
     * @name pointToPixel
     * @description 地理坐标转换为像素坐标
     * @param {L.Loc} pixel 指定的地理坐标
     * @return {L.Loc} 指定地理坐标所对应的像素坐标
     */
    pointToPixel: function (lonlat) {
        var pixel = null; 
        if (this.basicLayer != null) {
            pixel = this.basicLayer._pointToPixel(lonlat);
        }
        return pixel;
    },
    
    setView: function (center, zoom, forceReset) {
        center = center || this.getCenter();
        if(zoom === undefined) 
            zoom = this.getZoom();
        if(!(center instanceof L.Loc))
            center = this.getCenter();
        var tmpObj = this._resetMoveToParams(center, zoom);
        center = tmpObj.lonlat;
        zoom = tmpObj.zoom;
        var zoomChanged = (this.zoom !== zoom);
        if (this._loaded && !forceReset && this._layers) {
            var offset = new L.Loc(0, 0);
            if(!center.equals(this.getCenter()))
                offset = this.pointToPixel(center).subtract(this.pointToPixel(this.getCenter()));
            
            
            var done = (zoomChanged ?
                        !!this._zoomWithAnimation && this._zoomWithAnimation(center, zoom, offset) :
                        this.panBy(offset));

            if (done) {
                return this;
            }
        }
        
        this._resetView(center, zoom, false, false, forceReset);
        return this;
    },
    
    _resetView: function (center, zoom, preserveMapOffset, afterZoomAnim, forceReset) {
        if(!this.basicLayer)
            return;
        if (zoom != undefined) {
            zoom = parseFloat(zoom);
            zoom = Math.round(zoom);
        }
        center = center || this._getCenter(); 
        zoom = (zoom == undefined ? this.getZoom() : zoom);

        var tmpObj = this._resetMoveToParams(center, zoom);
        center = tmpObj.lonlat;
        zoom = tmpObj.zoom;
        
        var zoomChanged = (this.zoom !== zoom);
        var centerChanged = !this._getCenter() || (center.x == this._getCenter().x && center.y == this._getCenter().y);
      
        if(!zoomChanged && !centerChanged && !forceReset){
            return;
        }
        

        if (!afterZoomAnim) {
            this.fire('movestart');
            if (zoomChanged) {
                this.fire('zoomstart');
            }
        }
        this.zoom = zoom;
        
        //this._initialTopLeftPoint = this._getNewTopLeftPoint(center);

        if (!preserveMapOffset) {
            L.Util.setPosition(this._mapPane, new L.Loc(0, 0));
            this.centerOffset = new L.Loc(0, 0);
        } else {
            //this._initialTopLeftPoint._add(this._getMapPanePos());
            var offset = L.Util.getPosition(this._mapPane);
            this.centerOffset = offset;
        }
        
        this._setCenter(center);

        var loading = !this._loaded;
        this._loaded = true;

        this.fire('viewreset', {hard: !preserveMapOffset});

        //this.fire('move');

        if (zoomChanged || afterZoomAnim) {
            this.fire('zoomend');
        }

        this.fire('moveend', {hard: !preserveMapOffset});


        if (loading) {
            this.fire('load');
        }
    },
	
    /**only for NOverviewMap **/
    _setView2: function (center, zoom, noReset) {
        center = center || this.getCenter();
        if(zoom === undefined) 
            zoom = this.getZoom();
        if(!(center instanceof L.Loc))
            center = this.getCenter();
        var zoomChanged = (this.zoom !== zoom);
        if (this._loaded && !noReset && this._layers) {
            var offset = new L.Loc(0, 0);
            if(!center.equals(this.getCenter()))
                offset = this.pointToPixel(center).subtract(this.pointToPixel(this.getCenter()));
            
            
            var done = (zoomChanged ?
                        !!this._zoomWithAnimation && this._zoomWithAnimation(center, zoom, offset) :
                        this.panBy(offset));

            if (done) {
                return this;
            }
        }
        
        this._resetView2(center, zoom, false, false, noReset);
        return this;
    },
    
    _resetView2: function (center, zoom, preserveMapOffset, afterZoomAnim, noReset) {
        if(!this.basicLayer)
            return;
        if (zoom != undefined) {
            zoom = parseFloat(zoom);
            zoom = Math.round(zoom);
        }
        center = center || this._getCenter(); 
        zoom = (zoom == undefined ? this.getZoom() : zoom);
        var zoomChanged = (this.zoom !== zoom);
        var centerChanged = !this._getCenter() || (center.x == this._getCenter().x && center.y == this._getCenter().y);
      
        if(!zoomChanged && !centerChanged && !noReset){
            return;
        }
        if (!afterZoomAnim) {
            this.fire('movestart');
            if (zoomChanged) {
                this.fire('zoomstart');
            }
        }
        this.zoom = zoom;
        
        //this._initialTopLeftPoint = this._getNewTopLeftPoint(center);

        if (!preserveMapOffset) {
            L.Util.setPosition(this._mapPane, new L.Loc(0, 0));
            this.centerOffset = new L.Loc(0, 0);
        } else {
            //this._initialTopLeftPoint._add(this._getMapPanePos());
            var offset = L.Util.getPosition(this._mapPane);
            this.centerOffset = offset;
        }
        
        this._setCenter(center);

        var loading = !this._loaded;
        this._loaded = true;

        this.fire('viewreset', {hard: !preserveMapOffset});

        //this.fire('move');

        if (zoomChanged || afterZoomAnim) {
            this.fire('zoomend');
        }

        this.fire('moveend', {hard: !preserveMapOffset});


        if (loading) {
            this.fire('load');
        }
    },
	
    panTo: function (center) { 
        return this.setView(center, this._zoom);
    },

    /**
     * @function
     * @name setMaxExtent
     * @description 设置地图最大范围
     * @param {L.Extent} bounds 指定的地理范围
     * @return {L.Map} 当前地图对象
     */
    setMaxExtent: function(bounds) {
        bounds = bounds || null;
        this.options.maxExtent = this.maxExtent = bounds;
        if(!bounds){
            //this._boundsMinZoom = null;
            return this;
        }
        // var minZoom = this.getBoundsZoom(bounds, true);

        // this._boundsMinZoom = minZoom;
        if (this._loaded) {
            // if (this._zoom < minZoom) {
                // this.setView(bounds.getCenter(), minZoom);
            // } else {
                this.panInsideBounds(bounds);
            // }
        }

    },
    
    _panInsideBounds: function (bounds) {
        var viewBounds = this.getBounds();
        var viewSw = this.pointToPixel(new L.Loc(viewBounds.minX, viewBounds.minY));
        var viewNe = this.pointToPixel(new L.Loc(viewBounds.maxX, viewBounds.maxY));
        var sw = this.pointToPixel(new L.Loc(bounds.minX, bounds.minY));
        var ne = this.pointToPixel(new L.Loc(bounds.maxX, bounds.maxY));
        
        var sWidth = ne.x - sw.x;
        var sHeight = ne.y - sw.y;
        var vWidth = viewNe.x - viewSw.x;
        var vHeight = viewNe.y - viewSw.y;
        var dx = 0, dy = 0;
        if(vHeight < sHeight){
            if(viewNe.y > ne.y){
                dy = ne.y - viewNe.y;
            }
            else if(viewSw.y < sw.y){
                dy = sw.y - viewSw.y;
            }
        }
        else{
            if (viewNe.y < ne.y) { // north
                dy = ne.y - viewNe.y;
            }
            if (viewSw.y > sw.y) { // south
                dy = sw.y - viewSw.y;
            }
        }
        if(vWidth > sWidth){
            if (viewNe.x < ne.x) { // east
                dx = ne.x - viewNe.x;
            }
            else if (viewSw.x > sw.x) { // west
                dx = sw.x - viewSw.x;
            }
        }
        else{
            if (viewNe.x > ne.x) { // east
                dx = ne.x - viewNe.x;
            }
            if (viewSw.x < sw.x) { // west
                dx = sw.x - viewSw.x;
            }
        }
        
        // if (viewNe.x > ne.x) { // east
            // dx = ne.x - viewNe.x;
        // }
        
        // if (viewSw.x < sw.x) { // west
            // dx = sw.x - viewSw.x;
        // }
        return this.panBy(new L.Loc(dx, dy));
    },
    
    invalidateSize: function () {
        var oldSize = this.getSize();
        this._sizeChanged = true;

        if (this.options.maxBounds) {
            this.setMaxExtent(this.options.maxBounds);
        }

        if (!this._loaded) {
            return this;
        }

        //this._rawPanBy(oldSize.subtract(this.getSize()).divideBy(2));

        this.fire('move');

        clearTimeout(this._sizeTimer);
        this._sizeTimer = setTimeout(L.Util.bind(function () {
            this._resetView(this._center, this.getZoom());
            //this.fire('moveend');
        }, this), 200);

        return this;
    },
    
    _pointToAbsPixel: function (lonlat) {
        return this.pointToPixel(lonlat).subtract(L.Util.getPosition(this._mapPane));
    },
    
    _absPixelToPoint: function (pixel) {
        return this.pixelToPoint(pixel.add(L.Util.getPosition(this._mapPane)));
    },
    
    _absPixelToPixel: function (pixel) {
        if(!pixel) return new L.Loc(0,0);
        var mapOffset = L.Util.getPosition(this._mapPane);
        if(!mapOffset)
            return pixel;
        return pixel.add(mapOffset);
    },
    
    _pixelToAbsPixel: function (pixel) {
        if(!pixel) return new L.Loc(0,0);
        var mapOffset = L.Util.getPosition(this._mapPane);
        if(!mapOffset)
            return pixel;
        return pixel.subtract(mapOffset);
    },
    
    
    _initLayers: function (layers) {
        layers = layers ? (layers instanceof Array ? layers : [layers]) : [];
        this._layers = {};
        this._layerIds = new Array();
        
        var i, len;
        for (i = 0, len = layers.length; i < len; i++) {
            this.addLayer(layers[i]);
        }
    },
    
    _initOverlays: function (overlays) {
        this._overlays = new Array();
        this._hotspots = new Array();
        if(!overlays) return;
        this.addOverlays(overlays);
        
    },
   
    _initLayout: function() {
        //styles
        var container = this._container;
        container.innerHTML = '';
        L.Util.addClass(container, 'leaflet-container');
        if (L.Util.Browser.touch) {
            L.Util.addClass(container, 'leaflet-touch');
        }
        
        // if (this.options.fadeAnimation) {
            // L.Util.addClass(container, 'leaflet-fade-anim');
        // }
        var position = L.Util.getStyle(container, 'position');
        if (position !== 'absolute' && position !== 'relative' && position !== 'fixed'){
            container.style.position = 'relative';
        }

        //container panes   
        var panes = this._panes = {};
        this._mapPane = panes.mapPane = L.Util.create('div', 'leaflet-map-pane', this._container);
        this._tilePane = panes.tilePane = L.Util.create('div', 'leaflet-tile-pane', this._mapPane);
        this._objectsPane = panes.objectsPane = L.Util.create('div', 'leaflet-objects-pane', this._mapPane);
        panes.shadowPane = L.Util.create('div', 'leaflet-shadow-pane', this._objectsPane);
        panes.labelPane = L.Util.create('div', 'leaflet-label-pane', this._objectsPane);
        panes.overlayPane = L.Util.create('div', 'leaflet-overlay-pane', this._objectsPane);
        panes.markerPane = L.Util.create('div', 'leaflet-marker-pane', this._objectsPane);
        panes.tmpPane = L.Util.create('div', 'leaflet-tmp-pane', this._mapPane);
        panes.popupPane = L.Util.create('div', 'leaflet-popup-pane', this._objectsPane);
        
        var zoomHide = 'leaflet-zoom-hide';
        if (!this.options.markerZoomAnimation) {
            L.Util.addClass(panes.markerPane, zoomHide);
            L.Util.addClass(panes.shadowPane, zoomHide);
            L.Util.addClass(panes.popupPane, zoomHide);
        }
        if (this._initControlDivs) {
            this._initControlDivs();
        }
    
    },
    
    _initEvents:function() {
        if(!L.DomEvent) return;
        L.DomEvent.addListener(this._container, 'click', this._onMouseClick, this);
        var events = ['dblclick', 'mousedown', 'mouseup', 'mouseenter', 'mouseleave', 'mousemove'];
        var i, len;
        for (i = 0, len = events.length; i < len; i++) {
            L.DomEvent.addListener(this._container, events[i], this._fireMouseEvent, this);
        }

        this.on('move', this._moveCallBack, this);
        this.on('viewreset', this._viewResetCallBack, this);
        
        L.DomEvent.addListener(window, 'resize', this._onResize, this);
        this.on('moveend', this._moveEndCallBack, this);
    },
    
    _clearTileBg: function () {
        
        if(this._tileBg && this._tileBg.children.length > 0)
            L.Util.clearAllNode(this._tileBg);
        if(this._ieBgClearTimer)
            clearInterval(this._ieBgClearTimer);
    },
    
    _loadTileBg:function() {
    },
    
    _viewResetCallBack:function(e){
        //return;
        var len = this.getLayersCount(), lyrId, lyr;
        for(var i = 0; i < len; i++){
            lyrId = this._layerIds[i];
            lyr = this._layers[lyrId];
            if(!lyr){
                continue;
            }

            lyr._reset(e.hard);
        }
        
        // for(var i in this._overlays){
            // if(i && i.redraw){
                // i.redraw();
            // }
        // }
        //this._updateMarkers();
        
    },
    
    _moveCallBack:function (e) {
        if(this.basicLayer.getVisible()) {
            this.basicLayer._moveCallBack(e);
        }
    },
    
    _moveEndCallBack: function (e) {
        var dragging = (e && e.hard);
         var zoomChanged = (e && e.zoomChanged);
        if(this.basicLayer.getVisible()) {
            this.basicLayer._moveEndCallBack(e);
        }
  
        var len = this.getLayersCount(), lyrId, lyr;
        for(var i = 0; i < len; i++){
            lyrId = this._layerIds[i];
            lyr = this._layers[lyrId];
            if(!lyr || lyr.isBasicLayer || !(lyr instanceof L.Layers.Base)){
                continue;
            }
            lyr._moveEndCallBack(e);
        }
        //this._updateMarkers();
    },
    
    _rawPanBy: function (offset) {
        var mapPaneOffset = L.Util.getPosition(this._mapPane);
        if(isNaN(mapPaneOffset.x) || isNaN(mapPaneOffset.y)){
            this._resetView();
            return;
        }
        if(!offset || isNaN(offset.x) || isNaN(offset.y))
            return;
        L.Util.setPosition(this._mapPane, mapPaneOffset.subtract(offset));
    },

    
    _stopLoadImg:function () {
        var len = this.getLayersCount(), lyrId, lyr;
        for(var i = 0; i < len; i++){
            lyrId = this._layerIds[i];
            lyr = this._layers[lyrId];
            if(!lyr || !(lyr instanceof L.Layers.TileBase)){
                lyr.stopLoadImg();
            }
            
        }
    },
    
    _resetMoveToParams:function(lonlat, zoom){
        if(this.basicLayer){
            zoom = this._limitZoom(zoom);
            var resolution = this.basicLayer._getResByZoom(zoom);
            var extent = this.getBounds(lonlat, resolution); 
            
            var maxExtent = this.getMaxExtent();
            if(!maxExtent.contains(lonlat)) {
                var size = this.getSize();
                var clientWidth = resolution * size.x / 2;
                var clientHeight = resolution * size.y / 2;
                var maxCenter = maxExtent.getCenter(); 
                if(extent.getWidth() > maxExtent.getWidth()) { 
                    lonlat = new L.Loc(maxCenter.x, lonlat.y); 
                } else if(lonlat.x < maxExtent.minX) {
                    lonlat.x = maxExtent.minX + clientWidth;
                } else if(lonlat.x > maxExtent.maxX) { 
                    lonlat.x = maxExtent.maxX - clientWidth; 
                } 
                if(extent.getHeight() > maxExtent.getHeight()) { 
                    lonlat = new L.Loc(lonlat.x, maxCenter.y); 
                } else if(lonlat.y < maxExtent.minY) { 
                    lonlat.y = maxExtent.minY + clientHeight; 
                } 
                else if(lonlat.y > maxExtent.maxY) { 
                    lonlat.y = maxExtent.maxY - clientHeight; 
                }
            }
        }
        
        return {"lonlat": lonlat, "zoom": zoom};
    },
    _getDefaultMaxExtent:function(){
        var result = null;
        if(this.getUnits() == 'dd')
            result = new L.Extent(-180, -90, 180, 90);
        //??todo else
        return result;
    },
    
    _setZoom: function (zoom) { // (Number)
        return this.setView(this.getCenter(), zoom);
    },
    
    _getBoundsByRes: function (lonlat, res){
        var size = this.getSize();
        var clientWidth = res * size.x / 2;
        var clientHeight = res * size.y / 2;
        return new L.Extent(lonlat.x - clientWidth, lonlat.y - clientHeight, lonlat.x + clientWidth, lonlat.y + clientHeight);
    },
    
    _setCenter: function(lonlat){
        var offset = L.Util.getPosition(this._mapPane);
        if(!offset || (offset.x == 0 && offset.y == 0)){
            this.center = lonlat;
            return this;
        }
        var res = this.getResolution();
        if(!this.center)
            this.center = lonlat;
        this.center.x = lonlat.x + offset.x * res;
        this.center.y = lonlat.y - offset.y * res;
        return this;
    },
    
    _getAbsCenter:function(lonlat) {
        var offset = L.Util.getPosition(this._mapPane);
        if(!offset || (offset.x == 0 && offset.y == 0)){
            this.center = lonlat;
            return this;
        }
        var res = this.getResolution();
        var result = lonlat;
        result.x = lonlat.x + offset.x * res;
        result.y = lonlat.y - offset.y * res;
        return result;
    },
    
    _getRealCenter:function(){
        var offset = L.Util.getPosition(this._mapPane);
        var lonlat = this.center;
        var res = this.getResolution();
        
        return new L.Loc(lonlat.x - offset.x * res, lonlat.y + offset.y * res);
    
    },
    
    _getCenternew:function(){
        if(!this.center)
            this._setCenter(this.getMaxExtent().getCenter());
        var offset = L.Util.getPosition(this._mapPane);
        if(!this.centerOffset || (this.centerOffset && (this.centerOffset.equals(offset)))){
            return this.center;
        }
        
        var res = this.getResolution();
        var x = this.center.x - (this.centerOffset.x - offset.x) * res;
        var y = this.center.y + (this.centerOffset.y - offset.y) * res;
        return new L.Loc(x, y);
    },
    
    _getCenter:function () {
        if(!this.center)
            this._setCenter(this.getMaxExtent().getCenter());

        var offset = L.Util.getPosition(this._mapPane);
        if(!offset || (offset.x == 0 && offset.y == 0)){
            return this.center;
        }
        var res = this.getResolution();
        var x = this.center.x - offset.x * res;
        var y = this.center.y + offset.y * res;
        return new L.Loc(x, y);
        
    },
    
    _onResize:function (){
        this._sizeChanged = true;
        this.invalidateSize();
        //this.fire('viewreset', {hard: false});
        //this.fire("moveend");
    },
    
    _initInteraction: function () {
        this._handlers = {};
        var i;
        for (i in L.HandlerHash) {
            if (L.HandlerHash.hasOwnProperty(i) && L.HandlerHash[i]) {
                this._handlers[i] = new L.HandlerHash[i](this);
                if (this.options[i]) {
                    this._handlers[i].enable();
                }
            }
        }
    },
    
    getHegemonTag:function () {
        return this._hegemonTag;
    },
    _onMeasureEnd: function (e){
        this.setMode("dragzoom");
        this.off("measureend", this._onMeasureEnd);
    },
    

    _limitZoom : function (zoom) {
        var zoomCount = this.getZoomCount();
        var zoomend = zoom;
        zoomend = zoomend < 0 ? 0 : zoomend;
        zoomend = zoomend > zoomCount - 1 ? zoomCount - 1 : zoomend;
        return zoomend;
    },
    
    _getPanes:function() {
        return this._panes;
    },
    
    _onMouseClick: function (e) {
        if (!this._loaded || (this.checkDraging())) {
            return;
        }
        this.fire('pre' + e.type);
        this._fireMouseEvent(e);
    },
    checkDraging: function () {
        return this._handlers["drag"] && this._handlers["drag"].moved();
    },
    
    _checkCurBasicLayer:function (layer) {
        if(this.basicLayer){
            if(L.Util.stamp(this.basicLayer) == L.Util.stamp(layer))
                return true;
        }
        return false;
    },
    
    _fireMouseEvent: function (e) {
        if (!this._loaded) {
            return;
        }
        
        var type = e.type;
        type = (type === 'mouseenter' ? 'mouseover' : (type === 'mouseleave' ? 'mouseout' : type));
        if (!this.has(type)) {
            return;
        }
        this.fire(type, {
            point: this.pixelToPoint(L.DomEvent.getMousePosition(e, this._container)),
            pixel: L.DomEvent.getMousePosition(e, this._container),
            absPixel: this._pixelToAbsPixel(L.DomEvent.getMousePosition(e, this._container))
        });
    },
    
    
    /**
     * @function
     * @name getAPIVersion
     * @description 获取当前所使用的二次开发包的版本号
     * @return {String} 当前二次开发包版本号
     */
    getAPIVersion: function () {
        return leaflet_JS_LIB.VERSION;
    }
    
    /////////////////////////////////////////////////////////////////
    ////////////////////// 相关事件及回调参数  //////////////////////
    /////////////////////////////////////////////////////////////////
    //mouse相关
    /**
     * @event
     * @name click
     * @description 鼠标点击地图时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mousedown
     * @description 鼠标在地图控件上方按下时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mouseup
     * @description 鼠标在地图控件上方抬起时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mouseover
     * @description 鼠标移动至地图容器时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mouseout
     * @description 鼠标移出地图容器时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mousemove
     * @description 鼠标在地图上移动时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name dblclick
     * @description 鼠标在地图上双击时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
     
    //drag相关
    /**
     * @event
     * @name dragstart
     * @description 地图开始被拖拽时触发此事件
     */
    /**
     * @event
     * @name drag
     * @description 地图拖拽过程触发此事件
     */
    /**
     * @event
     * @name dragend
     * @description 地图拖拽结束时触发此事件
     */
     
    //move相关
    /**
     * @event
     * @name movestart
     * @description 地图开始移动时触发此事件
     */
    /**
     * @event
     * @name move
     * @description 地图移动时触发此事件
     */
    /**
     * @event
     * @name moveend
     * @description 地图移动结束时触发此事件
     */
     
    
     
    //zoom相关
    /**
     * @event
     * @name zoomstart
     * @description 地图开始缩放时触发此事件
     */
    /**
     * @event
     * @name zoomend
     * @description 地图缩放完成时触发此事件
     */
     
    //图层相关
    /**
     * @event
     * @name changebasiclayer
     * @description 设置或更改地图底图图层触发此事件
     * @param {L.Layers.Base} layer 新设置的地图底图图层对象
     */
    /**
     * @event
     * @name changelayervisible
     * @description 地图中的图层可见性发生变化时触发此事件
     * @param {L.Layers.Base} layer 可见性发生变化的图层
     * @param {Boolean} visible 新设置的图层可见性
     */
    /**
     * @event
     * @name preaddlayer
     * @description 向地图中添加图层对象前触发此事件
     * @param {L.Layers.Base} layer 要添加的图层对象
     */
    /**
     * @event
     * @name layeradded
     * @description 向地图中添加图层对象时触发此事件
     * @param {L.Layers.Base} layer 添加的图层对象
     */
    /**
     * @event
     * @name layerremoved
     * @description 从地图中移除图层对象时触发此事件
     * @param {L.Layers.Base} layer 移除的图层对象
     */

     //覆盖物相关
    /**
     * @event
     * @name overlayadded
     * @description 向地图中添加覆盖物对象后触发此事件
     * @param {L.Ols.Base} overlay 添加的覆盖物对象
     */
    /**
     * @event
     * @name overlayremoved
     * @description 从地图中移除覆盖物对象时触发此事件
     * @param {L.Ols.Base} overlay 移除的覆盖物对象
     */
    /**
     * @event
     * @name drawfeaturestart
     * @description 地图模式设置为绘制要素后，在要素绘制开始之前触发该事件
     */
    /**
     * @event
     * @name drawfeatureend
     * @description 要素绘制操作结束之后触发该事件
     * @param {L.Ols.Base} feature 绘制的覆盖物对象
     */
    /**
     * @event
     * @name drawmarkerend
     * @description 标注绘制操作结束之后触发该事件
     * @param {L.Ols.Marker} marker 绘制的覆盖物对象
     */
     
     
     
     //control相关
    /**
     * @event
     * @name controladded
     * @description 向地图中添加地图控件对象后触发此事件
     * @param {L.Controls.Base} control 添加的地图控件
     */
    /**
     * @event
     * @name controlremoved
     * @description 从地图中移除控件对象时触发此事件
     * @param {L.Controls.Base} control 移除的地图控件
     */
    
     //对话框窗体相关
    /**
     * @event
     * @name popupadded
     * @description 向地图添加对话框窗体后触发此事件
     * @param {L.Popups.Base} popup 添加的对话框窗体
     */
    /**
     * @event
     * @name popupremoved
     * @description 从地图中移除对话框窗体后触发此事件
     * @param {L.Popups.Base} popup 移除的对话框窗体
     */
    /**
     * @event
     * @name popupopened
     * @description 地图打开对话框窗体时触发此事件
     * @param {L.Popups.Base} popup 打开的对话框窗体
     */
    /**
     * @event
     * @name popupclosed
     * @description 地图关闭对话框窗体时触发此事件
     * @param {L.Popups.Base} popup 关闭的对话框窗体
     */
    /**
     * @event
     * @name popupautopanstart
     * @description 自动调整地图范围(以确保对话框窗体位于地图范围之内)前触发
     * @param {L.Popups.Base} popup 关闭的对话框窗体
     */
    /**
     * @event
     * @name popupautopanend
     * @description 自动调整地图范围(以确保对话框窗体位于地图范围之内)后触发
     * @param {L.Popups.Base} popup 关闭的对话框窗体
     */

    
     //热点相关
    /**
     * @event
     * @name hotspotadded
     * @description 向地图添加热点对象后触发此事件
     * @param {L.Ols.Spot} hotspot 添加的热点对象
     */
    /**
     * @event
     * @name hotspotremoved
     * @description 从地图中移除热点对象后触发此事件
     * @param {L.Ols.Spot} hotspot 移除的热点对象
     */
    /**
     * @event
     * @name hotspotvalid
     * @description 热点对象被激活时触发此事件
     * @param {L.Ols.Spot} hotspot 激活的热点对象
     */

    //地图状态相关
    /**
     * @event
     * @name load
     * @description 地图范围改变后会触发此事件。这表示地图中心点、缩放层级已经确定，但可能还在载入地图图块。
     */
    /**
     * @event
     * @name basiclayerloaded
     * @description 地图底图图层图片加载完毕后触发。
     */
    /**
     * @event
     * @name resize
     * @description 地图窗体发生改变时触发此事件
     */
});


/**
 * @class
 * @name L.MapOptions
 * @description 此类表示NMap构造函数的参数。它没有构造函数，但可通过对象字面量形式表示。在NMap类实例化之后，其所设置的NLayerOptions相关属性将作为图层对象自身的属性而存在
 */
L.MapOptions = {
    /**
     * @name center
     * @type {L.Loc} 
     * @description 地图初始化中心点
     */
    center: null,
    /**
     * @name zoom
     * @type {Number} 
     * @description 地图初始化缩放级别
     */
    zoom: null
    
 };

L.Layers = {}; 
 /**
 * @class
 * @name L.Layers.Base
 * @description 图层类的基类
 */
L.Layers.Base = L.Class.extend({
    includes: L.Mixin.Events,
    _map:null,
    _container:null,
    _filledTag:true,
    
    /**
     * @name isBasicLayer
     * @type {Boolean} 
     * @description 底图图层标识
     */
    isBasicLayer:false,
    zoomCount:null,
    
    /**
     * @name copyright
     * @type {String} 
     * @description 图层的版权信息
     */
    copyright:'',
    
    /**
     * @name layerType
     * @type {String} 
     * @description 图层的类型
     */
    layerType:'L.Layers.Base',
    /**
     * @name attribution
     * @type {Object} 
     * @description 图层的属性信息 例如:{"name":"layer1"}
     */
    attribution:'',
    
    /**
     * @name visible
     * @type {Boolean} 
     * @description 图层可见性标识
     */
    visible:true,
    
    /**
     * @constructor
     * @name L.Layers.Base
     * @description 该类作为图层类的基类，不可直接实例化
     */
    initialize: function(name, options){
        this.name = name;
        var tmpOptions = L.Util.extend({}, L.Layers.BaseOptions, options);
        L.Util.setOptions(this, tmpOptions, true);
    },
    
    /**
     * @function
     * @name getVisible
     * @return {Boolean} 在地图当前状态下图层是否可见
     * @description 获取在地图当前状态下图层是否可见,图层的可见性不仅与其visible属性有关，而且与其maxRes,minRes等属性及地图状态相关
     */
    getVisible: function(){
        return (this.visible) && (this._checkInRange());
    },
    /**
     * @function
     * @name getId
     * @description 获取图层标识符
     * @return {String} 图层标识符
     */
    getId: function () {
        return L.Util.stamp(this);
    },
    
    /**
     * @function
     * @name getName
     * @description 获取图层名称
     * @return {String} 图层名称
     */
    getName: function () {
        return this.name;
    },
    
    /**
     * @function
     * @name getLayerType
     * @description 获取图层类型
     * @return {String} 图层类型
     */
    getLayerType: function () {
        return this.layerType;
    },
    
    /**
     * @function
     * @name getAttribution
     * @description 获取图层的属性信息
     * @return {Object} 图层的属性信息  例如:{"name":"layer1"}
     */
    getAttribution: function () {
        return this.attribution || '';
    },
    
    /**
     * @function
     * @name getUnits
     * @description 获取图层的计量单位
     * @return {String} 图层计量信息
     */
    getUnits: function () {
        return this.units;
    },
    
    
    /**
     * @function
     * @name getOpacity
     * @description 获取图层透明度
     * @return {Number} 图层透明度
     */
    getOpacity: function () {
        return this.opacity;
    },
    
    /**
     * @function
     * @name getProjection
     * @description 获取图层的投影
     * @return {L.Proj} 图层的投影
     */
    getProjection: function () {
        if(this._map && this._map.basicLayer && this._map.basicLayer != this)
            return this._map.basicLayer.getProjection();
        return this.projection || new L.Proj("EPSG:4326");
    },
    
    /**
     * @function
     * @name setProjection
     * @description 为图层指定投影
     * @param {L.Proj} prj 投影对象
     */
    setProjection: function (prj) {
        if(prj) 
           this.projection = typeof(prj) == "string" ? new L.Proj(prj) : prj;
        return this;
    },

    /**
     * @function
     * @name setVisible
     * @description 为图层指定visible属性
     * @param {Boolean} visible 图层的visible属性
     */
    setVisible:function(visible){
        // if(this.isBasicLayer && this._map && this._map.basicLayer){
            // visible = this._map._checkCurBasicLayer(this) ? true : false;
        // }
        if (visible != this.visible) {
            this.visible = visible;
            this._display(visible);
            this._update();
            if (this._map != null) {
                this._map.fire("changelayervisible", {
                    layer: this,
                    visible:visible,
                    property: "visible"
                });
            }
            this.fire("visibilitychanged");
            if(this.getVisible()){
                this._moveEndCallBack();
            }
        }
    },
    
    /**
     * @function
     * @name setOpacity
     * @description 为图层指定透明度
     * @param {Number} opacity 图层的透明度，该参数取值范围为[0 - 1]
     */
    setOpacity: function (opacity) {
        opacity = opacity === undefined ? 1 : opacity;
        if(this.opacity == opacity)
            return;
        this.opacity = opacity;
        this.opacity = (this.opacity > 1) ? 1 : this.opacity;
        this.opacity = (this.opacity < 0) ? 0 : this.opacity;
        if (this.opacity < 1) 
            L.Util.setOpacity(this._container, this.opacity);
        
        if (L.Util.Browser.webkit) {
            for (var i in this._tiles) {
                if (this._tiles.hasOwnProperty(i)) {
                    this._tiles[i].style.webkitTransform += ' translate(0,0)';
                }
            }
        }
        if(L.Util.Browser.ie){
            for (var i in this._tiles) {
                if (this._tiles.hasOwnProperty(i)) {
                    L.Util.setOpacity(this._tiles[i], this.opacity);
                }
            }
        }
    },
    
    /**
     * @function
     * @name redraw
     * @description 重绘图层
     */
    redraw: function () {
        if(this._map)
            this._moveTo();
    },
    
    _moveCallBack:function (e) {
         this._updateMove(e);
         return;
    },
    
    _moveEndCallBack: function(e){
        if (this.options && !this.options.updateWhenIdle) {
            this._update(e);
        }
    },
    
    _update: function (e) {
        e = e || {};
        
        var bounds = e.bounds || this._map.getBounds();
        this._moveTo(bounds);
    },
    
    _updateMove: function (e) {
        if(this._moveingTag)return;
        e = e || {};
        var bounds = e.bounds || this._map.getBounds();
        this._moveTo(bounds, true);
    },
    
    _moveTo: function (bounds, vTag) {
        var show = this.getVisible();
        if(this._container)
            this._container.style.display = show ? "" : "none";

        var inRange = this.getVisible();
        if(inRange != this._inRange){
            this._inRange = inRange;
            this._display(this._inRange);
            this._map.fire("changelayervisible", {
                layer: this,
                visible:this.visible, 
                property: "visible"
            });
        }
    },
    
    _display: function(display) {
        if (this._container && display != (this._container.style.display != "none")) {
            if(display && this.getVisible())
                this._container.style.display = "";
            else
                this._container.style.display = "none";
        }
    },
    
    _getPane:function () {
        if(this._map)
            return this._map._getPanes().tilePane;
    },
    _updateZIndex: function () {
        if (this._container && this.options.zIndex !== undefined) {
            this._container.style.zIndex = this.options.zIndex;
        }
    },
    _initContainer: function () {
        var tilePane = this._getPane(),
            first = tilePane.firstChild;

        if (!this._container || tilePane.empty) {
            this._container = L.Util.create('div', 'leaflet-layer');
            this._updateZIndex();
            if (this.isBasicLayer && first) {
                tilePane.insertBefore(this._container, first);
            } else {
                tilePane.appendChild(this._container);
            }

            if(this.opacity)
                this.setOpacity(this.opacity);
        }
    },
    
    _initEvents: function () {
        if(this._map){
            //this._map.on('viewreset', this._resetCallback, this);
            //this._map.on('moveend', this._update, this);
            if (this.options.updateWhenIdle) {
                this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
                //this._map.on('move', this._limitedUpdate, this);
            }
        }
    },
    
    _removeEvents: function () {
        if(this._map){
            this._map.off('viewreset', this._resetCallback, this);
            this._map.off('moveend', this._update, this);
            if (!this.options.updateWhenIdle) {
                this._map.off('move', this._limitedUpdate, this);
            }

        }
    },
    
    _unsetMap: function() {
        if(this._map){
            this._removeEvents();
            var tilePane = this._getPane();
            tilePane.removeChild(this._container);
            this._map = null;
            this.fire("removed", {layer:this});
        }
    },
    
    _resetCallback: function (e) {
        this._reset(e.hard);
    },

    _reset: function (clearOldContainer) {
        if(this._tiles){
            var key;
            for (key in this._tiles) {
                if (this._tiles.hasOwnProperty(key)) {
                    this.fire("tileunload", {tile: this._tiles[key]});
                    this._tiles[key] = null;
                    delete this._tiles[key];
                }
            }
            this._tiles = {};
        }
        if (clearOldContainer && this._container) {
            L.Util.clearAllNode(this._container);
        }
        this._initContainer();
    },
    
    _update2: function () {
        
        var pos = L.Util.getPosition(this._map._mapPane);
        var center = this._map.getCenter();
         center.x -= pos.x * this._map.getResolution();
         center.y += pos.y * this._map.getResolution();
         this._moveTo(center);
        // if(pos.x)
        // this._map.center = center;
        
    },
    
    _setMap: function(map) {
        if (this._map != null || map == null) {
            return;
        }
        this._map = map;
        this._initContainer();
        this._initEvents();
        this.maxExtent = this.maxExtent || this._map.maxExtent;
        this.projection = this.projection || this._map.projection;
        
        if (this.projection && typeof this.projection == "string") {
            this.projection = new L.Proj(this.projection);
        }
        
        this.units = (this.projection ? this.projection.getUnits() : null) || this.units || this._map.getUnits();
        
        
        if(!this.resolutions){
            if(this.isBasicLayer){
                this._initResolutions();
            }
        }
        if(this.resolutions){
            this.resolutions.sort(function(a, b) {
                return (b - a);
            });
            this.zoomCount = this.resolutions.length;
            this.maxRes = this.maxRes || this.resolutions[0];
            this.minRes = this.minRes || this.resolutions[this.zoomCount - 1];
        }
        if (!this.isBasicLayer) {
            var show = this.getVisible();
            this._container.style.display = show ? "" : "none";
        }
        else if(this._map.basicLayer && (L.Util.stamp(this) != L.Util.stamp(this._map.basicLayer))){
            this.setVisible(false);
        }
        
        this._setTileSize();
        this._reset();
        //this._update();
    },
    
    _getFitRes: function (res, ceilTag, unit) {
        var resResult = res;
        var level = 1;
        if(unit == "dd"){
            var maxResolution = 0.703125;
            resResult = maxResolution;
            for(;level <= 22; level+=1, maxResolution /= 2){
                if((res <= maxResolution) && !!ceilTag){
                    break;
                }
                else if((res >= maxResolution) && !ceilTag){
                    resResult = maxResolution;
                    break;
                }
                resResult = maxResolution;
            }
        }
        return {"level":level, "res": resResult};
    },
    
    _afterAdd: function () {
    },
    
    _initResolutions: function () {
        if(this.resolutions) return;
        var units = this.getUnits();
        if(this.maxRes && !this.zoomCount){
            if(this.minRes){
                var ratio = this.maxRes / this.minRes;
                this.zoomCount = Math.floor(Math.log(ratio) / Math.log(2)) + 1;
            }
        }
        else if(!this.maxRes){
            var viewSize = this._map.getSize();
            var wRes = this.maxExtent.getWidth() / viewSize.x;
            var hRes = this.maxExtent.getHeight() / viewSize.y;
            var res = Math.max(wRes, hRes);
            if(units == 'dd'){
                var fitObj = this._getFitRes(res, true, "dd");
                this.maxRes = fitObj.res;
                this.zoomCount = this.zoomCount || fitObj.level;
            }
        }
        this.zoomCount = this.zoomCount || 22;
        this.resolutions = new Array();
        var tmpRes = this.maxRes;
        for(var i=0; i < this.zoomCount; i++) {
            this.resolutions[i] = tmpRes;
            tmpRes = tmpRes / 2;
        }
        
    },
    
    _setTileSize: function () {
    
    },
    
    _checkInRange: function() {
        var inRange = false;
        if (this._map) {
            var resolution = this._map.getResolution();
            
            if(this.zoomResFixed){
                if(!this.isBasicLayer && !this.resolutions){
                    inRange = true;
                }
                else{
                    inRange = false;
                    var i = 0,len = this.resolutions.length;
                    for(; i < len; i++){
                        if(parseFloat(this.resolutions[i]) == resolution){
                            inRange = true;
                            break;
                        }
                    }
                }
            }
            else
                inRange = true;
                
            if(inRange){
                //必须的res判断
                if((this.minRes === undefined || this.minRes === null || resolution >= this.minRes) && (this.maxRes === undefined || this.maxRes === null || resolution <= this.maxRes))
                    inRange = true;
                else
                    inRange = false;
            }
            
            if(inRange){
                var tmpEx = this._map.getExtent();
                if(this.maxExtent && tmpEx && !tmpEx.intersects(this.maxExtent)){
                    inRange = false;
                }
            }
        }
        
        return inRange;
    },
    
    _pixelToPoint:function (pixel) {
        var latlng = null; 
        if(pixel){
            var extent = this._map.getExtent();
            var res = this._map.getResolution();
            latlng = new L.Loc(
                (extent.minX + res * pixel.x),
                (extent.maxY - res * pixel.y)
            );
        }
        return latlng;
    },
    
    _pointToPixel: function (lonlat) {
        var px = null; 
        if (lonlat != null) {
            var resolution = this._map.getResolution();
            var extent = this._map.getExtent();
            px = new L.Loc(
                (1/resolution * (lonlat.x - extent.minX)),
                (1/resolution * (extent.maxY - lonlat.y))
            ).round();    
        }
        return px;
    },
    
    _getResolution: function() {
        var zoomLevel = this._map.getZoom();
        return this._getResByZoom(zoomLevel);
    },
    _getResolutions: function() {
        if(!this.resolutions)
            this._initResolutions();
        return this.resolutions;
    },
    _getZoomByRes: function(res) {
        if(!res) return 0;
        if(!this.resolutions)
            this._initResolutions();
        if(res > this.resolutions[0]) {
            return 0;
        }
        if(res < this.resolutions[this.resolutions.length - 1]) {
            return this.resolutions.length - 1;
        }
        var i, len;
        for(i = 1,len = this.resolutions.length; i < len; i++){
            if((this.resolutions[i] < res) && (Math.abs(this.resolutions[i] - res) > 0.000001)){
                break;
            } 
        }
        return i - 1;
    },
    
    _getResByZoom: function(zoomLevel) {
        zoomLevel = Math.max(0, Math.min(zoomLevel, this.resolutions.length - 1));
        var resolution = this.resolutions[Math.round(zoomLevel)];
        return resolution;
    },
    
    _getExtent: function () {
        var bounds = null;
        if(this._map) 
            bounds = this._map.getBounds();
        return bounds;
    },

    getZoomForBounds: function (extent) {
        if(!this._map)
            return 0;
        var viewSize = this._map.getSize();
        if ((extent.getWidth() === 0) && (extent.getHeight() === 0)) {
            return (this._map.getZoomCount() - 1);
        } else {
            var idealResolution = Math.max(extent.getWidth() / viewSize.x, extent.getHeight() / viewSize.y);
            return this._getZoomByRes(idealResolution);
        }
    } 
});

/**
 * @class
 * @name L.Layers.BaseOptions
 * @description 此类表示NLayer类构造函数的参数。此类没有构造函数，但可通过对象字面量形式表示。在NLayer类实例化之后，其所设置的NLayerOptions相关属性将作为图层对象自身的属性而存在
 */
L.Layers.BaseOptions = {
    /**
     * @name maxRes
     * @type {Number} 
     * @description 图层的最大分辨率，该属性为可选属性，默认值为null
     */
    maxRes: null,
    
    /**
     * @name minRes
     * @type {Number} 
     * @description 图层的最小分辨率，该属性为可选属性，默认值为null
     */
    minRes: null,
    
    /**
     * @name resolutions
     * @type {Array<Number>} 
     * @description 图层所使用的分辨率，该属性为可选属性，默认值为null。在构造图层时必须指定maxRes和resolutions其中之一
     */
    resolutions:null,
    
    /**
     * @name units
     * @type {String} 
     * @description 图层所使用计量单位，默认为"dd"
     */
    units:"dd",
    
    /**
     * @name projection
     * @type {L.Proj} 
     * @description 图层所使用投影，默认为null
     */
    projection:null,
    
    /**
     * @name isBasicLayer
     * @type {Boolean} 
     * @description 图层是否作为底图图层的标识
     */
    isBasicLayer: false,
    
    /**
     * @name copyright
     * @type {String} 
     * @description 图层版权说明，该参数为可选参数，默认值为null，该参数常用于地图数据相应版权的说明
     */
    copyright:null,
    
    /**
     * @name attribution
     * @type {Object} 
     * @description 图层属性信息,可选参数，默认值为null 例如:{"name":"layer1"}
     */
    attribution:null,
    
    /**
     * @name visible
     * @type {Boolean} 
     * @description 图层可见性
     */
    visible:true,
    
    /**
     * @name opacity
     * @type {Number} 
     * @description 图层透明度，可选参数，取值范围为[0-1]，该参数默认值为1
     */
    opacity:1,
    
    /**
     * @name zoomCount
     * @type {Number} 
     * @description 图层分层级别数，可选参数，该参数默认值为18，当设定resolutions属性时，图层对象实例化之后会自动将该属性设置为resolutions数组的长度
     */
    zoomCount:18,
    
    /**
     * @name maxExtent
     * @type {L.Extent} 
     * @description 图层的最大地理范围
     */
    maxExtent:new L.Extent(-180,-90,180,90),

    tileSize:null
 };

/**
 * @class
 * @name L.Layers.Overlay
 * @description 覆盖物图层类，提供针对多种覆盖物集合的统一增删及管理功能的方法
 * @inherit L.Layers.Base
 */
L.Layers.Overlay = L.Layers.Base.extend({
   
    /**
     * @constructor
     * @name L.Layers.Overlay
     * @param {L.Ols.Base | Array<L.Ols.Base>} overlays 覆盖物对象或覆盖物对象组成的数组
     * @description 覆盖物图层类构造函数
     */
    initialize: function (layers) {
        this._overlays = {};
        var i, len;
        if(!layers) return;
        layers = (layers instanceof Array) ? layers : [layers];
        if (layers) {
            for (i = 0, len = layers.length; i < len; i++) {
                this.addOverlay(layers[i]);
            }
        }
    },

    /**
     * @function
     * @name setVisible
     * @param {Boolean} value 设置图层是否可见
     * @description 设置图层是否可见
     */
    setVisible: function (value) {
        var tag = value ? true : false;
        var key;
        this.visible = tag;
        if(this._overlays){
            for(key in this._overlays){
                if(this._overlays.hasOwnProperty(key)){
                    if(this._overlays[key] && this._overlays[key].setVisible){
                        this._overlays[key].setVisible(tag);
                    }
                }
            }
        }
    },
    
    redraw: function () {
        if(!this._map)
            return this;
    },
    _reset:function () {
    },
    
    /**
     * @function
     * @name addOverlay
     * @param {L.Ols.Base} overlay 要增加的覆盖物对象
     * @description 向图层中增加一个覆盖物对象
     */
    addOverlay: function (layer) {
        var id = L.Util.stamp(layer);
        this._overlays = this._overlays || {};
        this._overlays[id] = layer;
        if (this._map) {
            this._map.addOverlays(layer);
        }
        return this;
    },

    /**
     * @function
     * @name removeOverlay
     * @param {L.Ols.Base} overlay 要删除的覆盖物对象
     * @description 从图层中删除指定的一个覆盖物对象
     */
    removeOverlay: function (layer) {
        var id = L.Util.stamp(layer);

        delete this._overlays[id];

        if (this._map) {
			if(this instanceof L.Layers.WFS)
				this._removeWFSOverlays(layer);
			else
				this._map.removeOverlays(layer);
        }
        return this;
    },

    
    getBounds: function () {
        var b = null,
            i, layer;
        for (i in this._overlays) {
            if (this._overlays.hasOwnProperty(i)) {
                layer = this._overlays[i];

                if (layer["getBounds"]) {
                    if(!b){
                        b = layer.getBounds();
                    }
                    else
                        b.extendByBounds(layer.getBounds());
                }
            }
        }
        
        return b;
    },
    
    clearOverlays: function () {
        this._iterateLayers(this.removeOverlay, this);
        return this;
    },
    
    /**
     * @function
     * @name clear
     * @description 清除图层中的所有覆盖物对象
     */
    clear: function () {
        this.clearOverlays();
    },

    invoke: function (methodName) {
        var args = Array.prototype.slice.call(arguments, 1),
            i, layer;

        for (i in this._overlays) {
            if (this._overlays.hasOwnProperty(i)) {
                layer = this._overlays[i];

                if (layer[methodName]) {
                    layer[methodName].apply(layer, args);
                }
            }
        }

        return this;
    },

    _setMap: function (map) {
        this._map = map;
        this._iterateLayers(map.addOverlays, map);
    },

    _unsetMap: function () {
        if(!this._map) return this;
        var map = this._map;
		if(this instanceof L.Layers.WFS)
			this._iterateLayers(this._removeWFSOverlays, this);
		else
			this._iterateLayers(map.removeOverlays, map);
        this._map = null;
    },

    _iterateLayers: function (method, context) {
        for (var i in this._overlays) {
            if (this._overlays.hasOwnProperty(i)) {
                method.call(context, this._overlays[i]);
            }
        }
    }
});


/**
 * @class
 * @name L.Layers.WFS
 * @description 用于加载WFS服务的图层，该类通过wfs服务调用服务器数据，并将结果显示在地图窗口中
 * @inherit L.Layers.Overlay
 */
L.Layers.WFS = L.Layers.Overlay.extend({
	isBasicLayer: false,
	layerType:"L.Layers.WFS",
	formatOptions: null, 
	formatObject: null,
	format: null,
	getAttributes: false,
	_DEFAULT_PARAMS: {  
                        service: "WFS",
                        REQUEST: "GetFeature",
                        VERSION: "1.0.0",
                        MAXFEATURES: 1000,
                        TYPENAME: null
                    },
	/**
     * @constructor
     * @name L.Layers.WFS
     * @description NWFSLayer构造函数
     * @param {String} name 要请求的图层名称
     * @param {String} url 请求WFS服务的URL
     * @param {Object} params 以JSON结构设置WFS服务接口调用所需的参数，如Maxfeatures、version等
     */		
	initialize: function(name, url, params,options) {
		this.name = name;
		this.url = encodeURI(url);
		this.layerType = "L.Layers.WFS";
        
        if (options == undefined) { options = {}; }
		var newparams;
		for(key in params){
			if(this._DEFAULT_PARAMS.hasOwnProperty(key.toUpperCase()))
				this._DEFAULT_PARAMS[key.toUpperCase()] = params[key];
			else
				newparams[key] = params[key];
		}
		this._params = this._DEFAULT_PARAMS;
        this._params = L.Util.applyDefaults(
            newparams, 
            L.Util.upperCaseObject(this._DEFAULT_PARAMS)
        );
		L.Util.extend(options, {'reportError': false});
		L.Util.setOptions(this, options, true);
    },  
	_setMap:function (map){
		this._map = map;
		var options = {
              'getAttributes': this.getAttributes
            };
		L.Util.extend(options, this.formatOptions);
		if (this._map && !this.projection ===(this._map.getProjection())) {
			options.externalProjection = this.projection;
			options.internalProjection = this._map.getProjection();
		}  
		this.formatObject = this.format ? new this.format(options) : new L.Parser.GML(options);
		var extent = this._map.getExtent();
		this._moveTo(extent,true,false);
	},
	//地图移动 缩放 时触发
	_moveTo:function(bounds, zoomChanged, dragging) {
		if(dragging){
			return;
		}
		if (bounds == null) {
            bounds = this._map.getExtent();
        }
		L.Layers.Base.prototype._moveTo.call(this, bounds);
		
		this._params.BBOX =bounds.minX+','+bounds.minY+','+bounds.maxX+','+bounds.maxY;
		var url = this.getFullRequestString();
		//url += "&TYPENAME=" + this.name; 
		this._loadFeatures(encodeURI(url),this._requestSuccess);
	},
	_loadFeatures:function(url,success, failure) {
        if(this.request) {
            this.request.abort();
        }
        L.HttpObj.GET({
            url: url,
            success: success,
            failure: failure,
			scope: this
        });
    },
	_requestSuccess:function(request) {
		var doc = request.responseXML;
		if (!doc || !doc.documentElement) {
			doc = request.responseText; 
		}
		//删除原有的
		if(this._overlays){
			for(var overlayId in this._overlays){
				this.removeOverlay(this._overlays[overlayId]);
			}
		}
		var featuresArr = this.formatObject.read(doc);
		
		for(var i =0 ;i<featuresArr.length;i++){
			featuresArr[i].setVisible(this.visible);
			this.addOverlay(featuresArr[i]);
		}
    },
	getFullRequestString:function() {
		var tmpWMSStr = '';
        var projectionCode = '';
        if(this.getProjection() && this._map.getProjection())
            projectionCode = this.getProjection().getSrsCode() || this._map.getProjection().getSrsCode();
            
        if(this._params) {
            var key;
            this._params.SRS = (projectionCode == '') ? null : projectionCode;
            for(key in this._params){
                if(this._params.hasOwnProperty(key)){
                    if(tmpWMSStr==''&&key=='REQUEST')
                       tmpWMSStr += key +"=" + this._params[key];
					else{
						if(this._params[key])
							tmpWMSStr += "&"+key +"=" + this._params[key];
					 }
                }
            }
        }
		var resultUrl = L.Util.urlAppend(this.url, tmpWMSStr);
		return resultUrl;
    },
    _removeWFSOverlays: function (overlays) {
        var tmpoverlays = (overlays instanceof Array) ? overlays : [overlays];
        var tmpoverlay, id;
        for(var key in tmpoverlays){
			tmpoverlay = tmpoverlays[key];
			if(tmpoverlay){
				id = L.Util.stamp(tmpoverlay);
				if(this._map.hasOverlay(id)){
					delete this._map._overlays[id];
					tmpoverlay._unsetMap(this._map);
					this._map.fire("overlayremoved", {overlay: tmpoverlay});
				}
			}           
        }
    }
});
/**
 * @class
 * @name L.Layers.TileBase
 * @description 切片图层类的基类
 * @inherit L.Layers.Base
 */
L.Layers.TileBase = L.Layers.Base.extend({
    
    _nullTag: -1,
    singleTile: false,
    
    /**
     * @name tileSize
     * @type {L.Loc} 
     * @description 图层切片像素大小，默认值为 256 * 256 
     */
    tileSize:new L.Loc(256, 256),
    
    /**
     * @name tileOrigin
     * @type {L.Loc} 
     * @description 切片起算原点坐标，默认值为(-180, 90)
     */
    tileOrigin:new L.Loc(-180, 90),
    
    /**
     * @name zoomResFixed
     * @type {Boolean} 
     * @description 标识图层是否按照固定级别的比例尺显示，默认值为 true
     */
    zoomResFixed:true,
    
    /**
     * @name format
     * @type {String} 
     * @description 切片格式，默认值为"image/png"
     */
    format:"image/png",
    
    /**
     * @name isBasicLayer
     * @type {Boolean} 
     * @description 标识图层是否作为底图图层，默认值为 true
     */
    isBasicLayer: true,
    
    /**
     * @name serverResolutions
     * @type {Object} 
     * @description 切片分级标识符之间与分辨率之间的对应关系数组，其形式如: {"1":0.703125, "2":0.362832} ，该参数默认值为null, 当该参数为null时，将采用当前分辨率在地图分辨率级别中的位置索引作为切片分级标识符。
     */
    serverResolutions : null,
    _tiles:{},
    
    /**
     * @constructor
     * @name L.Layers.TileBase
     * @description 切片图层类的基类，该类不可实例化 当该类的子类所构造的对象作为叠加图层时，必须在对应的options参数中指定resolutions
     */
    initialize: function(name, url, options){
        this.name = name;
        this.layerType = "L.Layers.TileBase";
        this.setUrl(url);
        L.Util.setOptions(this, options, true);
        this._createTileProto();
    },
    
    /**
     * @function
     * @name setUrl
     * @description 设置切片服务根地址
     * @param {String} url 切片服务地址
     */
    setUrl: function (url) {
        this.url = url;
    },
    
    getTileSize: function () {
        return this.tileSize;
    },
    
    getFormat: function(format, fullTag){
        if(!format)
            format = this.format;
        format = format.toLowerCase();
        
        var formatArr = {
            "png":"image/png",
            "jpg":"image/jpeg",
            "gif":"image/gif"
        };
        var k;
        var result = fullTag ? "image/png" : "png";
        for(k in formatArr){
            if(formatArr.hasOwnProperty(k)){
                if(k == format || formatArr[k] == format){
                    result = fullTag ? formatArr[k] : k;
                }
            }
        }
        return result;
    },
    
    _getZByRes:function(res) {
        var key, len;
        if(this.isBasicLayer && this._map && this._map.basicLayer){
            if(L.Util.stamp(this) != L.Util.stamp(this._map.basicLayer)){
                return this._nullTag;
            }
        }
        if(!this.zoomResFixed && this._map)
            return this._map.getResolution();
            
        if(this.serverResolutions){
            for(key in this.serverResolutions){
                if(this.serverResolutions[key] == res)
                    return key;
            }
        }
        else if(this.resolutions){
            for(key = 0, len = this.resolutions.length; key < len; key += 1){
                if(this.resolutions[key] == res){
                    return key;
                }
            }
        }
      
        return this._nullTag;
    },
    
    stopLoadImg:function() {
        var container = this._container;
        if(!container) return;
        var tiles = container.getElementsByTagName('img'),
            i, len, tile;

        for (i = 0, len = tiles.length; i < len; i++) {
            tile = tiles[i];

            if (tile && !tile.complete) {
                tile.onload = L.Util.falseFn;
                tile.onerror = L.Util.falseFn;
                //tile.src = L.Util.emptyImageUrl;
                tile.src = '';

                tile.parentNode.removeChild(tile);
            }
        }
    },
    
    _reset: function (clearOldContainer) {
        var key;
        for (key in this._tiles) {
            if (this._tiles.hasOwnProperty(key)) {
                this.fire("tileunload", {tile: this._tiles[key]});
				if(this._tiles[key]._hotspots)
					this._map.removeHotspots(this._tiles[key]._hotspots); 
                this._tiles[key] = null;
                delete this._tiles[key];
            }
        }
        this._tiles = {};
        this._tilesToLoad = 0;
        
        if (this.options.reuseTiles) {
            this._unusedTiles = [];
        }


        if (clearOldContainer && this._container) {
            L.Util.clearAllNode(this._container);
            this._container.innerHTML = "";
        }
        this._initContainer();
    },
    
    _moveingTag:false,
    _moveTo: function (bounds, vTag) {
        if(this._moveingTag && vTag){
            return;
        }
        this._moveingTag = true;
        L.Layers.Base.prototype._moveTo.call(this, bounds);
        if(!this.getVisible()){
            if(this._container && this._container.children.length > 0){
                this._reset(true);
            }
            this._moveingTag = false;
            return;
        }
       
        var res = this._map.getResolution();
        if(!bounds)
            bounds = this._map.getExtent();
        if(!bounds){
            this._moveingTag = false;
            return this;
        }
        
        var center = bounds.getCenter();
        var centerIdX, centerIdY;
        var tileWidth = this.tileSize.x * res;
        var tileHeight = (this.tileSize.y == this.tileSize.x) ? tileWidth : (this.tileSize.y * res);
        var tileStartXId = Math.floor((bounds.minX - this.tileOrigin.x) / tileWidth);
        centerIdX = Math.floor((center.x - this.tileOrigin.x) / tileWidth);
        
        var tilesMinX = this.tileOrigin.x + tileStartXId * tileWidth;
        var tileStartYId, tilesMaxY;
        if(this._rightAlias){
            centerIdY = Math.floor((center.y - this.tileOrigin.y) / tileHeight);
            tileStartYId = Math.floor((bounds.maxY - this.tileOrigin.y) / tileHeight);
            tilesMaxY = this.tileOrigin.y + (tileStartYId + 1) * tileHeight;
        }
        else{
            centerIdY = Math.floor((this.tileOrigin.y - center.y) / tileHeight);
            tileStartYId = Math.floor((this.tileOrigin.y - bounds.maxY) / tileHeight);
            tilesMaxY = this.tileOrigin.y - tileStartYId * tileHeight;
        }
        
        var centerIdPoint = new L.Loc(centerIdX, centerIdY);
        var tlTileOffsetX = Math.round((tilesMinX - bounds.minX) / res);
        var tlTileOffsetY = Math.round((bounds.maxY - tilesMaxY) / res);
        var xStart, yStart, key, tmpTile;
        var xStartId = tileStartXId;
        var yStartId = tileStartYId;
        var mapOffsetTmp, mapOffset = L.Util.getPosition(this._map._mapPane);
        var tmpOffsetX,tmpOffsetY;
        var initOffsetY = tlTileOffsetY - mapOffset.y;
        var initOffsetX = tlTileOffsetX - mapOffset.x;
        var yStep = this._rightAlias ? -1 : 1;
        var zIndex = this._getZByRes(res);
        var queue = [], tmpUrl = null;
        if(zIndex != this._nullTag){
            for(xStart = tilesMinX; xStart <= bounds.maxX; xStart += tileWidth, xStartId += 1){
                yStartId = tileStartYId;
                for(yStart = tilesMaxY; yStart >= bounds.minY; yStart -= tileHeight,yStartId += yStep){
                    queue.push(new L.Loc(xStartId, yStartId));
                }
            }
        }
       
        queue.sort(function (a, b) {
            return a.distanceTo(centerIdPoint) - b.distanceTo(centerIdPoint);
        });
        this._tilesToLoad = queue.length;
       
        this._filledTag = false;
        var k, len;
        for (k = 0, len = this._tilesToLoad; k < len; k++) {
            key = zIndex + ":" + queue[k].y + ":" + queue[k].x;
            tmpOffsetX = (queue[k].x - tileStartXId) * this.tileSize.x + initOffsetX;
            tmpOffsetY = (queue[k].y - tileStartYId) * this.tileSize.y ;
            if(tmpOffsetY < 0)
                tmpOffsetY = -tmpOffsetY;
            tmpOffsetY += initOffsetY;
            
            if(this._tiles.hasOwnProperty(key)){
                if(!vTag){
                    L.Util.setPosition(this._tiles[key], new L.Loc(tmpOffsetX, tmpOffsetY));
                }
                this._tilesToLoad--;
                continue;
            }
            if(this.getTileUrlByExtent){
                tmpTile = this._createTile();
                L.Util.setPosition(tmpTile, new L.Loc(tmpOffsetX, tmpOffsetY));
                tmpTile._layer = this;
                tmpTile.onload = this._tileOnLoad;
                tmpTile.onerror = this._tileOnError;
                tmpUrl = this.getTileUrlByExtent(new L.Extent(xStart, yStart - tileHeight, xStart + tileWidth, yStart));
                if(tmpUrl)
                    tmpTile.src = tmpUrl;
                else{
                    tmpTile = null;
                    continue;
                }
            }
            else{
                tmpTile = this._getTile(zIndex, queue[k].y, queue[k].x, new L.Loc(tmpOffsetX, tmpOffsetY));
            }
            if(!tmpTile){
                this._tilesToLoad--;
                continue;
            }
           
            tmpTile._key = key;
            mapOffsetTmp = L.Util.getPosition(this._map._mapPane);
            if(!mapOffsetTmp.equals(mapOffset)){
                this._filledTag = true;
                this._moveingTag = false;
                break;
            }
            
            if(L.Util.Browser.ie && this.opacity != undefined){
                this.opacity = (this.opacity > 1) ? 1 : this.opacity;
                this.opacity = (this.opacity < 0) ? 0 : this.opacity;
                if (this.opacity < 1) 
                    L.Util.setOpacity(tmpTile, this.opacity);
            }
            this._container.appendChild(tmpTile);
            this._tiles[key] = tmpTile;
            tmpTile = null;
            
        }
        
        this._filledTag = true;
		
        if (!vTag || this._container.children.length > 80) {
            var tileIdBounds = new L.Extent(tileStartXId, tileStartYId, xStartId, yStartId);
            this._removeOtherTiles(tileIdBounds);
        }
        
        this._moveingTag = false;
        return this;
    },
   
    _getTile : function (zIndex, yStartId, xStartId, tilePos) {
        var tile = this._createTile();
        L.Util.setPosition(tile, tilePos);
        tile._layer = this;
        tile.onload = this._tileOnLoad;
        tile.onerror = this._tileOnError;
        var tilesrc = this._getTileUrl(zIndex, yStartId, xStartId, tilePos);
        if(tilesrc)
            tile.src = tilesrc;
        else
            return null;
        
        return tile;
    },
    
    _tileBuffer:4,
    _removeOtherTiles:function (bounds) {
        var zIndex = this._getZByRes(this._map.getResolution());
        var kArr, x, y, z, key, tile;
       
        if(bounds) {
            for (key in this._tiles) {
                if (this._tiles.hasOwnProperty(key)) {
                    kArr = key.split(':');
                    z = parseFloat(kArr[0]);
                    x = parseInt(kArr[2], 10);
                    y = parseInt(kArr[1], 10);

                    //if (zIndex == this._nullTag || z != zIndex) {
                        if(zIndex == this._nullTag || z != zIndex || x < bounds.minX - this._tileBuffer || x > bounds.maxX + this._tileBuffer || y < bounds.minY - this._tileBuffer || y > bounds.maxY + this._tileBuffer){
                            tile = this._tiles[key];
                            this._removeTile(tile);
                            this._tiles[key] = null;
                            delete this._tiles[key];
                        }
                   // }
                }
            }
        }
        var hugTiles = this._container.getElementsByTagName("img");

        if(hugTiles && hugTiles.length){
             for(var i = hugTiles.length - 1; i >= 0; i--){
                tile = hugTiles[i];
                if(tile && tile._key){
                    kArr = tile._key.split(':');
                    z = parseInt(kArr[0], 10);
                    if (zIndex == this._nullTag || z != zIndex || !(this._tiles[tile._key])){
                        this._removeTile(tile);
                    }
                }
             }
        }
        
        return this;
    },
    
    _removeTile: function (tile) {
        if(!tile) return;
        this.fire("tileunload", {tile: tile, url: tile.src});
        if (tile.parentNode === this._container) {
            this._container.removeChild(tile);
        }
    },
   
    _getTileUrl: function (zIndex, yStartId, xStartId) {
        return null;
    },
    
    _createTileProto: function () {
        this._tileImg = L.Util.create('img', 'leaflet-tile');
        this._tileImg.galleryimg = 'no';

        var tileSize = this.tileSize;
        this._tileImg.style.width = tileSize.x + 'px';
        this._tileImg.style.height = tileSize.y + 'px';
    },

    _createTile: function () {
        var tile ;
        tile = this._tileImg.cloneNode(false);
        
        tile.onselectstart = tile.onmousemove = L.Util.falseFn;
        return tile;
    },

    _tileOnLoad: function (e) {
        var layer = this._layer;
        if(!layer)return;
        this.className += ' leaflet-tile-loaded';

        layer.fire('tileload', {tile: this, url: this.src});

        layer._tilesToLoad--;
        if (!layer._tilesToLoad) {
            layer.fire('loaded');
            if(layer.isBasicLayer && layer._map){
                layer._map.fire("basiclayerloaded");
            }
        }
        
    },
    _tileOnError: function (e) {
        var layer = this._layer;

        layer.fire('tileerror', {tile: this, url: this.src});

        // if(!L.Util.Browser.ie)
            // this.src = L.Util.defaultImageUrl;
        // else{
            // layer._tilesToLoad--;
            // if(this.parentNode)
                // this.parentNode.removeChild(this);
            // if (!layer._tilesToLoad) {
                // layer.fire('loaded');
                // if(layer.isBasicLayer && layer._map){
                    // layer._map.fire("basiclayerloaded");
                // }
            // }
        // }
    }

    
    /**
     * @event
     * @name loaded
     * @description 图层需显示的所有图片加载完毕之后触发此事件
     */
    /**
     * @event
     * @name tileerror
     * @description 图层所包含的图片加载失败时触发此事件
     * @param {DOM<IMG>} tile 加载失败的<img>元素
     * @param {String} url 加载失败的<img>元素所指定的图片地址
     */
    /**
     * @event
     * @name tileload
     * @description 图层所包含的图片加载成功时触发此事件
     * @param {DOM<IMG>} tile 加载成功的<img>元素
     * @param {String} url 加载成功的<img>元素所指定的图片地址
     */
    /**
     * @event
     * @name tileunload
     * @description 从图层中移除图片对象时触发此事件
     * @param {DOM<IMG>} tile 移除的<img>元素
     * @param {String} url 移除的<img>元素所指定的图片地址
     */
});

/**
 * @class
 * @name L.Layers.WMS
 * @description 用于使用WMS服务GetTile接口的图层类
 * @inherit L.Layers.TileBase
 */
L.Layers.WMS = L.Layers.TileBase.extend({

    /**
     * @name singleTile
     * @type {Boolean} 
     * @description 标识图层进行WMS服务GetTile请求时是否将地图窗口区域设置为请求瓦片范围,默认值为 true
     */
    singleTile:true,
    zoomResFixed:false,
    defaultParams: {
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        VERSION: '1.3.0',
        LAYERS: '',
        STYLES: '',
        FORMAT: 'image/jpeg',
        TRANSPARENT: false
    },

    /**
     * @constructor
     * @name L.Layers.WMS
     * @description 用于使用WMS服务GetTile接口的图层类
     * @param  {String} name 图层名称
     * @param  {String} url 图层所使用的瓦片服务地址
     * @param  {L.Layers.BaseOptions} options 用于设置图层属性的可选参数，其可选值为当前图层所具有的属性及其所继承的属性
     * @param  {Object} params 用于设置WMS服务GetMap接口所必须的参数，如 LAYERS, STYLES, TRANSPARENT等,格式如:{"LAYERS":"lyr"}
     */
    initialize: function(name, url, options, params) {
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
        this._params = params || {};
        this._params = L.Util.extend({}, this.defaultParams, this._params);
        if(this.url){
            var innerParams = L.Util.getParameters(this.url);
            this._params = L.Util.extend(this._params, innerParams);
        }
        //this.zoomResFixed =false;
		this.layerType = "L.Layers.WMS";
    },
    
    /**
     * @function
     * @name setUrl
     * @description 用于设置WMS服务GetTile接口的请求地址
     * @param {String} url WMS服务地址
     */
    setUrl: function (url) {
        this.url = url;
        if(this.url && this._params){
            var innerParams = L.Util.getParameters(this.url);
            this._params = L.Util.extend(this._params, innerParams);
        }
    },
    
    /**
     * @function
     * @name setParams
     * @description 用于设置WMS服务GetTile接口所必须的参数，如VERSION, LAYERS, STYLES, TRANSPARENT等
     * @param {Object} params WMS服务请求参数, 格式如:{"LAYERS":"lyr"}
     */
    setParams: function (params){
        this._params = this._params || {};
        L.Util.extend(this._params, params);
        // if(this.url){
            // var innerParams = L.Util.getParameters(this.url);
            // this._params = L.Util.extend(this._params, innerParams);
        // }
    },
	getParams: function (){
		return  this._params;
    },
	

    getTileUrlByExtent: function (bounds) {
        if(!this._map)
            return null;
        return this._getUrl(bounds, this.tileSize);
    },

    getTileSize: function () {
        return (this.singleTile && this._map) ? this._map.getSize() : this.tileSize;
    },

    _moveTo: function (bounds) {
        if(!this.singleTile){
            return L.Layers.TileBase.prototype._moveTo.call(this, bounds);
        }
        else{
            return this._moveToSingleTile(bounds);
        }
    },

    _moveToSingleTile: function (bounds) {
        L.Layers.Base.prototype._moveTo.call(this, bounds);
        if(!this.getVisible()){
            if(this._container && this._container.children.length > 0){
                this._reset(true);
            }
            return;
        }
        var res = this._map.getResolution();
        if(!bounds)
            bounds = this._map.getExtent();
        
        var mapOffset = L.Util.getPosition(this._map._mapPane);
        var tmpOffsetX = - mapOffset.x;
        var tmpOffsetY = - mapOffset.y;
        this._sIdKey = this._sIdKey ? (this._sIdKey + 1) : 1;
        var tile = this._getSingleTile(bounds);
        if(tile){
            L.Util.setPosition(tile, new L.Loc(tmpOffsetX, tmpOffsetY));
            var key = "id:" + this._sIdKey;
            tile.id = key;
            //var fragment = document.createDocumentFragment();
            this._tilesToLoad = 1;
            this._tiles[key] = tile;
            //fragment.appendChild(tile);
            this._container.appendChild(tile);
        }
        
        // if(this._tiles["id:" + (this._sIdKey - 1)]){
            // this._removeTile(this._tiles["id:" + (this._sIdKey - 1)]);
        // }
        this._clearOtherTiles();
        
        return this;
    },
    
    _clearOtherTiles:function(){
        if(!this._tiles) return;
        var key2 = "id:" + this._sIdKey;
        var tmpNode;
        if(this._container){
            for(var i = this._container.children.length - 1; i >= 0; i--){
           
                var tmpNode = this._container.children[i];
                if(tmpNode && tmpNode.id != key2){
                    this._tiles[tmpNode.id] = null;
                    delete this._tiles[tmpNode.id];
                    var oldNode = this._container.removeChild(tmpNode);
                    oldNode = null;
                }
                tmpNode = null;
            }
        } 
        // for(var key in this._tiles){
            // if(this._tiles.hasOwnProperty(key)){
                // if(key != key2)
                    // this._removeTileById(key);
            // }
        // }
    },

    _removeTileById: function (key) {
        if(!key) return;
        var tile = this._tiles[key];
        if(tile){
            this.fire("tileunload", {tile: tile, url: tile.src});
            if (tile.parentNode === this._container) {
                this._container.removeChild(tile);
                this._tiles[key] = null;
                delete this._tiles[key];
            }
        }
    },
    
    _getSingleTile: function (bounds) {
        if(!this._map)
            return null;
        var size = this._map.getSize();
        var url = this._getUrl(bounds, size);
        if(!url) 
            return null;
        
        var tile = this._createTile();
        tile._layer = this;
        tile.onload = this._tileOnLoad;
        tile.onerror = this._tileOnError;
        tile.style.width = size.x + "px";
        tile.style.height = size.y + "px";
        tile.src = url;
        
        return tile;
    },

    _getUrl: function (bounds, size) {
        if(!this._map || !bounds || !size || !this.url)
            return null;
        
       return this._getUrlStr(bounds, size);
    },

    _getUrlStr: function (bounds, size) {
        var srsPrj = this._map.getProjection();
        if(!srsPrj)
            return null;
        var srsPrj = this._map.getProjection();
        if(!srsPrj)
            return null;
        
        var srsCode = srsPrj.getSrsCode();
        
        var tmpWMSStr = '';
        if(this._params) {
            var key;
            for(key in this._params){
                if(this._params.hasOwnProperty(key)){
                    if(tmpWMSStr != '')
                        tmpWMSStr += "&";
                    tmpWMSStr += key +"=" + this._params[key];
                }
            }
        }
        
        tmpWMSStr += "&width=" + size.x + "&height=" + size.y;
        var axisOrder = false;
        if (parseFloat(this._params.VERSION) >= 1.3) {
            tmpWMSStr += "&CRS=" + srsCode;
            axisOrder = srsPrj.getAxisOrder();
        } else {
            tmpWMSStr += "&SRS=" + srsCode;
        }
        tmpWMSStr += "&BBOX=" + bounds.exportToString(axisOrder);
        
        var resultUrl = L.Util.urlAppend(this.url, tmpWMSStr);
        return encodeURI(resultUrl);
    },
    
    _getFeatureInfoStr:function(ps) {
        ps = ps || {};
        var bounds = this._map.getExtent();
        var size = this._map.getSize();
        ps["VERSION"] = ps["VERSION"] || this._params["VERSION"];
        ps["QUERY_LAYERS"] = ps["QUERY_LAYERS"] || this._params["LAYERS"];
        var srsPrj = this._map.getProjection();
        if(!srsPrj)
            return null;
        var srsPrj = this._map.getProjection();
        if(!srsPrj)
            return null;
        
        var srsCode = srsPrj.getSrsCode();
        
        var tmpWMSStr = '';
        var tmpParams = L.Util.extend({}, this._params, ps, {REQUEST:"GetFeatureInfo", WIDTH: size.x, HEIGHT: size.y});
        if(tmpParams) {
            var key;
            for(key in tmpParams){
                if(tmpParams.hasOwnProperty(key)){
                    if(tmpWMSStr != '')
                        tmpWMSStr += "&";
                    tmpWMSStr += key +"=" + tmpParams[key];
                }
            }
        }
        
        var axisOrder = false;
        if (parseFloat(ps["VERSION"]) >= 1.3) {
            tmpWMSStr += "&CRS=" + srsCode;
            axisOrder = srsPrj.getAxisOrder();
        } else {
            tmpWMSStr += "&SRS=" + srsCode;
        }
        tmpWMSStr += "&BBOX=" + bounds.exportToString(axisOrder);
        
        var resultUrl = L.Util.urlAppend(this.url, tmpWMSStr);
        //return encodeURI(resultUrl);
        return resultUrl;
    }
    
});
L.Layers.ImageLayer = L.Layers.WMS.extend({

    singleTile:true,
    zoomResFixed:false,
  
    initialize: function(name, url, options) {
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
       
		this.layerType = "L.Layers.ImageLayer";
    },
   
    setUrl: function (url) {
        this.url = url;
    },
   
    getTileUrlByExtent: function (bounds) {
        return this._url;
    },

    _moveToSingleTile: function (bounds) {
        L.Layers.Base.prototype._moveTo.call(this, bounds);
        if(!this.getVisible()){
            if(this._container && this._container.children.length > 0){
                this._reset(true);
            }
            return;
        }
        var res = this._map.getResolution();
        if(!bounds)
            bounds = this._map.getExtent();
        
        var mapOffset = L.Util.getPosition(this._map._mapPane);
        var tmpOffsetX = - mapOffset.x;
        var tmpOffsetY = - mapOffset.y;
        this._sIdKey = this._sIdKey ? (this._sIdKey + 1) : 1;
        var tile = this._getSingleTile(bounds);
        if(tile){
			var tmpExt = this.maxExtent;
			var size = new L.Loc(parseInt(tmpExt.getWidth() / res), parseInt(tmpExt.getHeight() / res));
			tile.style.width = size.x + "px";
			tile.style.height = size.y + "px";
			var pos = this._map._pointToAbsPixel(this.tileOrigin);

           // L.Util.setPosition(tile, new L.Loc(tmpOffsetX, tmpOffsetY));
            L.Util.setPosition(tile, pos);
            var key = "id:" + this._sIdKey;
            tile.id = key;
            //var fragment = document.createDocumentFragment();
            this._tilesToLoad = 1;
            this._tiles[key] = tile;
            //fragment.appendChild(tile);
            this._container.appendChild(tile);
        }
        
        // if(this._tiles["id:" + (this._sIdKey - 1)]){
            // this._removeTile(this._tiles["id:" + (this._sIdKey - 1)]);
        // }
        this._clearOtherTiles();
        
        return this;
    },
    
    _getUrl: function (bounds, size) {
        if(!this._map || !bounds || !size || !this.url)
            return null;
       return this.url;
    }

});

/**
 * @class
 * @name L.Layers.TMS
 * @description 用于使用TMS服务的图层类
 * @inherit L.Layers.TileBase
 */
L.Layers.TMS = L.Layers.TileBase.extend({
    _rightAlias:true,
    /**
     * @constructor
     * @name L.Layers.TMS
     * @description 用于使用TMS服务的图层类
     * @param  {String} name 图层名称
     * @param  {String} url 图层所使用的TMS服务地址
     * @param  {L.Layers.BaseOptions} options 用于设置图层属性的可选参数，其可选值为当前图层所具有的属性及其所继承的属性
     */
    initialize: function(name, url, options){
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
        this.layerType = "L.Layers.TMS";
    },
    
    setUrl:function (url) {
        this.url = url;
        if(url && this.url.charAt(this.url.length - 1) !== "/"){
            this.url = this.url + '/';
        }
    },
    
    _getTileUrl: function (z, y, x) {
        if(!this.url)
            return null;
        return encodeURI(this.url + z + '/' + x + '/' +  y + "." + this.getFormat(null, false));
    }
});

/**
 * @class
 * @name L.Layers.KVPTMS
 * @description 用于使用TMS服务的图层类
 * @inherit L.Layers.TMS
 */
L.Layers.KVPTMS = L.Layers.TMS.extend({
    /**
     * @constructor
     * @name L.Layers.KVPTMS
     * @description 用于使用NewMapServer4.0所发布的MapServer服务tile接口的图层类
     * @param  {String} name 图层名称
     * @param  {String} url 图层所使用MapServer服务tile接口的调用地址
     * @param  {L.Layers.BaseOptions} options 用于设置图层属性的可选参数，其可选值为当前图层所具有的属性及其所继承的属性
     */
    initialize: function(name, url, options){
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
        this.layerType = "L.Layers.KVPTMS";
    },
    
    setUrl:function (url) {
        this.url = url;
        if(url){
            var parts = (url + " ").split(/[?&]/);
            this.url += (parts.pop() === " " ?
                "" :
                parts.length ? "" : "?");
        }
    },
    
    _getTileUrl: function (z, y, x) {
        if(!this.url)
            return null;
        return encodeURI(this.url + "z=" + z + "&x=" + x + "&y=" + y);
    }
});

/**
 * @class
 * @name L.Layers.WMTS
 * @description 用于使用WMTS服务GetTile接口的瓦片图层类
 * @inherit L.Layers.TileBase
 */
L.Layers.WMTS = L.Layers.TileBase.extend({
    _rightAlias:false,
    serviceMode: "KVP",
    
    /**
     * @name version
     * @type {String} 
     * @description 图层所使用的WMTS服务版本信息，默认值为 "1.0.0"
     */
    version:"1.0.0",
    
    /**
     * @name tileMatrixSet
     * @type {String} 
     * @description 图层所使用的WMTS服务GetTile接口所使用的tileMatrixSet参数
     */
    tileMatrixSet: null,
    
    /**
     * @name layer
     * @type {String} 
     * @description 图层所使用的WMTS服务GetTile接口所使用的Layer参数
     */
    layer: null,
    
    /**
     * @name style
     * @type {String} 
     * @description 图层所使用的WMTS服务GetTile接口所使用的style参数
     */
    style: null,
    
    /**
     * @constructor
     * @name L.Layers.WMTS
     * @description 用于使用WMTS服务GetTile接口的图层类
     * @param  {String} name 图层名称
     * @param  {String} url 图层所使用的瓦片服务地址
     * @param  {L.Layers.BaseOptions} options 用于设置图层属性的可选参数，其可选值为当前类所具有的属性及其所继承的属性
     */
    initialize: function(name, url, options){
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
        this.layerType = "L.Layers.WMTS";
        this.setUrl(url);
    },
    
    /**
     * @function 
     * @name getServiceMode
     * @return {String} 图层所使用的WMTS服务GetTile接口的访问方式
     * @description 获取图层所使用的WMTS服务GetTile接口的访问方式
     */
    getServiceMode : function () {
        return this.serviceMode.toUpperCase();
    },
    
    /**
     * @function 
     * @name setServiceMode
     * @param {String} value 图层所使用的WMTS服务GetTile接口的访问方式，该参数取值范围为["KVP", "RESTFUL"], 可选参数， 默认值为"KVP"
     * @description 设置图层所使用的WMTS服务GetTile接口的访问方式
     */
    setServiceMode : function (value) {
        value = value || "KVP";
        var tmpValue = value.toUpperCase();
        if(tmpValue == this.serviceMode)
            return;
        if(tmpValue == "KVP" || tmpValue == "RESTFUL"){
            this.serviceMode = tmpValue;
            this.setUrl(this.url);
        }
    },

    setUrl:function (value) {
        this.url = value;
        if(this.serviceMode == "KVP") {
            var turlParams = this.url.split("?");
            this._wmtsUrlParams = null;
            if(turlParams.length == 2) {
                var tmpUrl = turlParams[1];
                var tmpUrlParams = tmpUrl.split("&");
                if(tmpUrlParams.length > 0){
                    var i, len, tmpStr, tmpArr;
                    for(i = 0, len = tmpUrlParams.length; i < len; i++){
                        tmpStr = tmpUrlParams[i];
                        if(!tmpStr || tmpStr.length < 3)
                            continue;
                        tmpArr = tmpStr.split("=");
                        if(tmpArr.length != 2)
                            continue;
                        if(!this._wmtsUrlParams)
                            this._wmtsUrlParams = [];
                        this._wmtsUrlParams[tmpArr[0].toUpperCase()] = tmpArr[1];
                    }
                }
            }
            else{
                if(this.url.charAt(this.url.length - 1) != "?")
                    this.url = this.url + '?';
            }
        }
        else if(this.serviceMode == "RESTFUL"){
            if(this.url.charAt(this.url.length - 1) != "/")
                this.url = this.url + '/';
        }
    },
    
    getUrl:function () {
        return this.url;
    },
    
    _getTileUrl: function (z, y, x) {
        if(!this.url)
            return null;
        var resultUrl = this.url;
        if(this.getServiceMode() == "KVP"){
            if(!this._wmtsUrlParams && (resultUrl.charAt(resultUrl.length - 1) != "?"))
            resultUrl += '?';
            var key, params = {
                SERVICE: "WMTS",
                REQUEST: "GetTile",
                VERSION: this.version,
                LAYER: this.layer,
                STYLE: this.style,
                TILEMATRIXSET: this.tileMatrixSet,
                TILEMATRIX: z,
                TILEROW: y,
                TILECOL: x,
                FORMAT: this.format
            };
            for(key in params){
                if(params.hasOwnProperty(key)){
                    if((this._wmtsUrlParams && this._wmtsUrlParams.hasOwnProperty(key)) || params[key] == null)
                        continue;
                    else{
                        if(resultUrl.charAt(resultUrl.length - 1) != "?" && resultUrl.charAt(resultUrl.length - 1) != "&")
                            resultUrl += '&';
                        resultUrl += key + "=" + params[key];
                    }
                }
            }
        }
        else{
            if(resultUrl.charAt(resultUrl.length - 1) != '/')
                resultUrl += "/";
            resultUrl += this.layer + '/' + this.style+ '/' + this.tileMatrixSet + "/" +z + '/' + y + "/" + x + '.' + this.getFormat(null, false); 
        }
            
        return encodeURI(resultUrl);
    }
});


L.Layers.TPCTileLayer = L.Layers.WMTS.extend({
	_getTileUrl: function (z, y, x) {
        if(!this.url)
            return null;
        var resultUrl = this.url;
       
		if(resultUrl.charAt(resultUrl.length - 1) != '/')
			resultUrl += "/";
		resultUrl += z + '/' + x + "/" + y + '.' + this.getFormat(null, false); 
	
            
        return encodeURI(resultUrl);
    }
});

L.Controls = {};
/**
 * @class
 * @name L.Controls.Base
 * @description 控件类的基类
 */
L.Controls.Base = L.Class.extend({
    options: {
        position: 'topright',
        posxy: new L.Loc(0,0)
    },

    _type : "L.Controls.Base",
    
    singleAlive: true,
    /**
     * @constructor
     * @name L.Controls.Base
     * @description 控件类的基类，该类不可实例化
     */
    initialize: function (options) {
        L.Util.setOptions(this, options);
    },

     /**
     * @function
     * @name getType
     * @description 以字符串形式返回当前控件的类型
     * @return {String} 控件的类型
     */
    getType: function () {
         return this._type;
    },
    
	/**
     * @function
     * @name getPosition
     * @description 以字符串形式返回当前控件位置的方位
     * @return {String} 控件位置的方位
     */
    getPosition: function () {
        return this.options.position;
    },

	/**
     * @function
     * @name setPosition
     * @description 设置当前控件位置的方位
	 * @param {String} position 该参数取值范围为["topleft"，"topright"，"bottomleft"，"bottomright"]
     */
    setPosition: function (position) {       
        if(!position || !((typeof(position) == "string")))
            return;
        var map = this._map;
        
        if (map) {
			map.removeControl(this);
		}
        position = position.toLowerCase();
        this.options.position = position;

        if (map) {
			map.addControl(this);
		}
        return this;
    },
    
	/**
     * @function
     * @name getPosxy
     * @description 获取控件位置的偏移量
     * @return {L.Loc} 偏移量坐标点
     */
    getPosxy: function () {
        return this.options.posxy;
    },
    
	/**
     * @function
     * @name setPosxy
     * @description 设置控件位置的偏移量，以像素为单位
     * @param {L.Loc} pos 其中pos.x控制左右偏移量，pos.y控制上下偏移量
     */
    setPosxy: function (pos) {
        if(!pos || !(pos instanceof L.Loc))
            return;
            
        var map = this._map;
        
        if (map) {
			map.removeControl(this);
		}
        this.options.posxy = pos;
        if (map) {
			map.addControl(this);
		}
        return this;
    },

    _setMap: function (map) {
        this._map = map;
        if(!this._container){
            this._container = this._initContainer();
            var posxy = this.getPosxy();
            if(posxy){
                this.moveTo(posxy);
            }
        }
        var container = this._container,
            pos = this.getPosition(),
            corner = map._subControlDivs[pos];

        L.Util.addClass(container, 'leaflet-control');
        if (pos.indexOf('bottom') !== -1) {
            corner.insertBefore(container, corner.firstChild);
        } else {
            corner.appendChild(container);
        }

        return this;
    },
    
    moveTo: function (px) {
        if ((px != null) && (this._container != null)) {
            var  position = this.getPosition();  
            if(position == "topleft"){
                this._container.style.top = px.y +"px";
                this._container.style.left = px.x+"px";
            }
            else if(position == "topright"){
                this._container.style.top = px.y +"px";
                this._container.style.right = px.x+"px";
            }
            else if(position == "bottomleft"){
                this._container.style.bottom = px.y +"px";
                this._container.style.left = px.x+"px";
            }
            else if(position == "bottomright"){
                this._container.style.bottom = px.y +"px";
                this._container.style.right = px.x+"px";
            }
            else
                return;
        }
    },
    
    _createButton2: function (title, className, container, fn, context) {
        var link = L.Util.create('a', "leaflet-button " + className, container);
        link.href = '#';
        link.title = title;

        L.DomEvent
            .addListener(link, 'click', L.DomEvent.stopPropagation)
            .addListener(link, 'click', L.DomEvent.preventDefault)
            .addListener(link, 'click', fn, context);

        return link;
    },
    
    _createButton: function (title, className, container, fn, context) {
        var link = L.Util.create('div', "leaflet-button " + className, container);
        //link.href = '#';
        if(title)
            link.title = title;

        L.DomEvent
            .addListener(link, 'click', L.DomEvent.stopPropagation)
            .addListener(link, 'click', L.DomEvent.preventDefault);
            // .addListener(link, 'click', fn, context);

        return link;
    },
    
    _setButtonClassName: function(obj, classname) {
        if(obj)
            obj.className = "leaflet-button " + classname;
    },
    
    _unsetMap: function (map) {
        var map = map || this._map;
        var pos = this.getPosition(),
            corner = map._subControlDivs[pos];
		if(corner && this._container){
			try{
			corner.removeChild(this._container);
			}
			catch(e){
			}
		}
        

        if (this._onRemove) {
            this._onRemove(map);
        }
        //this._map = null;
        return this;
    }
});

L.Controls.Zoom = L.Class.extend({
    _container:null,
    _trArr:null,
    _tlArr:null,
    _brArr:null,
    _blArr:null,
    _map:null,
    _ArrWidth:7,
    _startTime:-1,
    _minWidth:12,
    _maxWidth:45,
    _minHeight:10,
    _maxHeight:36,
    _outTag:true,
    _center:null,
    _zoomAnimationTimer: null,
    initialize: function () {
        this._interval = Math.round(1000/60);
    },
    
    _initContainer:function() {
        var tmpPaneContainer = this._map._panes.tmpPane;
        this._container = L.Util.create('div', "leaflet-zoomdirect-pane", tmpPaneContainer);
        var container = this._container;
        this._tlArr =  L.Util.create('div', "zoomdirect-tl", container);
        this._trArr =  L.Util.create('div', "zoomdirect-tr", container);
        this._brArr =  L.Util.create('div', "zoomdirect-br", container);
        this._blArr =  L.Util.create('div', "zoomdirect-bl", container);
    },
    
    _setMap:function(map) {
        if(!map || !map._mapPane || map._zoomDirectionCtrl)
            return;
        this._map = map;
        this._initContainer();
        
        map._zoomDirectionCtrl = this;
    },
    
    setMode:function(outTag){
        this._outTag = outTag;
        if(!this._container) return;
        var clsName = outTag ? "leaflet-zoomdirect-pane-out" : "leaflet-zoomdirect-pane";
        L.Util.setClass(this._container, clsName);
    },
    
    enable:function(center, delta) {
        if(!this._container || !this._map || !center) return;
        this.disable();
     
        this._center = center.subtract(L.Util.getPosition(this._map._mapPane));
        var outTag = (delta > 0) ? true : false;
        this.setMode(outTag);
        this._runTimerAnimation(0);
        L.Util.removeClass(this._container, "leaflet-show");
        
        this._startTime = L.Util.getTime();
        var that = this;
        this._zoomAnimationTimer = setInterval(that._zoomStep(that), this._interval);
    },
    
    _runTimerAnimation:function(percent){
        if(!this._center){
            this.disable();
            return;
        }
        var disw = (this._maxWidth - this._minWidth) * percent;
        disw = this._outTag ? (disw + this._minWidth) : (this._maxWidth - disw);
        var dish = (this._maxHeight - this._minHeight) * percent;
        dish = this._outTag ? (dish + this._minHeight) : (this._maxHeight - dish);
        var l = Math.round(this._center.x - disw - this._ArrWidth),
            r = Math.round(this._center.x + disw),
            t = Math.round(this._center.y - dish - this._ArrWidth),
            b = Math.round(this._center.y + dish);
        L.Util.setPosition(this._tlArr, new L.Loc(l,t));
        L.Util.setPosition(this._trArr, new L.Loc(r,t));
        L.Util.setPosition(this._blArr, new L.Loc(l,b));
        L.Util.setPosition(this._brArr, new L.Loc(r,b));
    },
    
    _completeZoomAnim:function(){
        this.disable();
    },
    
    _zoomStep:function(that){
        var ctrl = that;
        return (function(){
            var time = L.Util.getTime(),
                elapsed = time - ctrl._startTime,
                duration = 400;
            if (elapsed < duration) {
                ctrl._runTimerAnimation(L.Util.getBezierPos(elapsed / duration));
            } else {
                ctrl._runTimerAnimation(1);
                ctrl._completeZoomAnim();
            }
        });
    },
    
    disable:function() {
        if(!this._container || !this._map) return;
        if(this._zoomAnimationTimer)
            clearInterval(this._zoomAnimationTimer);
        this._zoomAnimationTimer = null;
        this._center = null;
        L.Util.addClass(this._container, "leaflet-show");
    }
});


L.Controls.PanZoom = L.Controls.Base.extend({
    _type : "L.Controls.PanZoom",
    _initContainer: function() {
        var map = this._map;
        var className = 'leaflet-control-zoom',
            container = L.Util.create('div', className);

        this._createButton2('Zoom in', className + '-in', container, map.zoomIn, map);
        this._createButton2('Zoom out', className + '-out', container, map.zoomOut, map);

        return container;
    }
});

/**
 * @class
 * @name L.Controls.PanZoomBar
 * @description 平移缩放导航条控件
 */
L.Controls.PanZoomBar = L.Controls.Base.extend({
    options: {
        position: 'topleft',
        zoomStep:6,
        heightWithoutSlider:86,
        zoomControlTop:45,
        zoominBtHeight:21,
        zoominBtShadow:6,
        sliderHeight:11,
        levelTagHeight:21,
        useLevelTag:true,
        useZoomBarTag:true,
        resParams:{
            "1":0.17578125,//guo
            "2":0.010986328125,//sheng
            "3":0.0006866455078125,//shi
            "4":0.00004291534423828125//jie
        }
    },
    
    _type : "L.Controls.PanZoomBar",
    /**
     * @constructor
     * @name L.Controls.PanZoomBar
     * @description 导航条控件的构造函数
     */
    initialize: function (options) {
        L.Util.setOptions(this, options);
    },
    
    _initContainer: function() {
        var map = this._map;
        var className = 'leaflet-control-panzoombar',
            container = L.Util.create('div', className);
        this._container = container;
        L.Util.stamp(this._container);
        this._pancontrol = L.Util.create('div', "pancontrol", container);
        
        this._panleftbt = this._createButton("左移", "panleftbt", this._pancontrol);
        this._panrightbt = this._createButton("右移", "panrightbt", this._pancontrol);
        this._pantopbt = this._createButton("上移", "pantopbt", this._pancontrol);
        this._panbottombt = this._createButton("下移", "panbottombt", this._pancontrol);
        
        this._zoomcontrol = L.Util.create('div', "zoomcontrol", container);
        this._zoominbt = this._createButton("放大", "zoominbt", this._zoomcontrol);
        this._zoomoutbt = this._createButton("缩小", "zoomoutbt", this._zoomcontrol);
        if(this.options.useZoomBarTag){
            this._zoombardiv = L.Util.create('div', "barcontrol", this._zoomcontrol);
            this._sliderbarbg = L.Util.create('div', "sliderbarbg", this._zoombardiv);
            this._sliderbartop = L.Util.create('div', "sliderbartop", this._zoombardiv);
            this._sliderbt = this._createButton(null, "sliderbt", this._zoombardiv);
        }
        //this._gbt = this._createButton(null, "gbt", this._zoombardiv);
        this._updateContainer();
        this._levelTagResObj = (this.options.useZoomBarTag && this.options.useLevelTag) ? this._getLevelTagObject() : null;
        this._initLevelTagResDivs();
        this._initEvents();
        
        return container;
    },
    
    _initLevelTagResDivs:function () {
        if(!this._levelTagResObj || !this._map) return;
        var zoomCount = this._map.getZoomCount();
        var that = this;
        var key, level, res, tag, tmpObj, top, tmpClass = "leveltag-";
        var zoomStep = this.options.zoomStep,
            zoomcontroltop = this.options.zoomControlTop, 
            zoominbtheight = this.options.zoominBtHeight,
            leveltagheight = this.options.levelTagHeight / 2,
            shadowHeight = this.options.zoominBtShadow;
        this._levelTagBts = [];
        for(key in this._levelTagResObj){
            if(this._levelTagResObj.hasOwnProperty(key)){
                tmpObj = this._levelTagResObj[key];
                if(tmpObj){
                    tag = tmpObj["tag"];
                    level = tmpObj["zoom"];
                    res = tmpObj["res"];
                    top = (zoomCount - level) * zoomStep - leveltagheight;
                    this._levelTagBts[tag] = this._createButton(null, tmpClass + tag, this._zoombardiv);
                    this._levelTagBts[tag].style.top = top + "px";
                    var callBackFunc = function(level){
                            return function(e){
                                that._map.setView(null, level);
                            };
                        }(level);
                    L.DomEvent.addListener(this._levelTagBts[tag], "click",callBackFunc);
                }
            }
        }
        this._setLevelTagDivs(false);
    },
    
    _getLevelTagObject: function () {
        var resArr = this._map.getResolutions();
        var key,i, len =resArr.length,  tmpRes, res,lastTag, level = -1, ltoptions = this.options.resParams;
            maxRes = resArr[0],
            minRes = resArr[resArr.length - 1];
        var resultObj = {};    
        for(key in ltoptions){
            if(ltoptions.hasOwnProperty(key)){
                tmpRes = ltoptions[key];
                level = L.Util.getSuiteIndex(tmpRes, resArr);
                if(level == -1)
                    continue;
                res = "t" + level;
                if(!resultObj.hasOwnProperty(res) || (ltoptions[resultObj[res]["tag"]] < tmpRes)){
                    resultObj[res] = {
                        zoom:level,
                        tag:key,
                        res:resArr[level]
                    };
                }
            }
        }
        return resultObj;
    },
    
    _updateContainer: function () {
        var map = this._map;
        var zoomCount = map.getZoomCount();
        var curzoom = map.getZoom();
        if(!this.options.useZoomBarTag)
            zoomCount = 0;
        //var curzoom = zoomCount  - 8;
        var zoomStep = this.options.zoomStep,
            zoomcontroltop = this.options.zoomControlTop, 
            zoominbtheight = this.options.zoominBtHeight,
            sliderbtheight = this.options.sliderHeight,
            shadowHeight = this.options.zoominBtShadow;
            
        var sliderbegintop = zoominbtheight + zoomcontroltop - shadowHeight;
        var sliderbarheight = zoomStep * zoomCount + shadowHeight;
        var totalzoomheight = sliderbarheight + 2 * zoominbtheight - shadowHeight;
        this._zoomcontrol.style.height = totalzoomheight + "px";
        var zoomouttop = sliderbegintop + sliderbarheight;
        this._zoomoutbt.style.top = zoomouttop + "px";
        var sliderbartopheight = 0, sliderbartoptop = 0;
        if(this.options.useZoomBarTag){
            this._zoombardiv.style.height = sliderbarheight + "px";
            this._sliderbarbg.style.height = sliderbarheight + "px";
            
            sliderbartopheight = (curzoom + 1) * zoomStep;
            this._sliderbartop.style.height = sliderbartopheight + "px";
            sliderbartoptop = sliderbarheight - sliderbartopheight;
            this._sliderbartop.style.top =  sliderbartoptop + "px";
            
            this._sliderbt.style.top = (sliderbartoptop - sliderbtheight / 2) + "px";
        }
        var totalHeight = this.options.heightWithoutSlider + sliderbarheight;
        this._container.style.height = totalHeight + "px";
    },
    
    _initEvents: function () {
        if(!this._map) return;
        var map = this._map;
        var that = this;
        L.DomEvent.addListener(this._panleftbt, "mouseenter", function(e){that._pancontrol.className = "pancontrol-left";});
        L.DomEvent.addListener(this._panleftbt, "mouseout", function(e){that._pancontrol.className = "pancontrol";});
        L.DomEvent.addListener(this._panrightbt, "mouseenter", function(e){that._pancontrol.className = "pancontrol-right";});
        L.DomEvent.addListener(this._panrightbt, "mouseout", function(e){that._pancontrol.className = "pancontrol";});
        L.DomEvent.addListener(this._pantopbt, "mouseenter", function(e){that._pancontrol.className = "pancontrol-top";});
        L.DomEvent.addListener(this._pantopbt, "mouseout", function(e){that._pancontrol.className = "pancontrol";});
        L.DomEvent.addListener(this._panbottombt, "mouseenter", function(e){that._pancontrol.className = "pancontrol-bottom";});
        L.DomEvent.addListener(this._panbottombt, "mouseout", function(e){that._pancontrol.className = "pancontrol";});
        
        
        var panOffStep = 80;
        L.DomEvent.addListener(this._panleftbt, "click", function(e){that._map.panBy(new L.Loc(panOffStep,0));});
        L.DomEvent.addListener(this._panrightbt, "click", function(e){that._map.panBy(new L.Loc(-panOffStep,0));});
        L.DomEvent.addListener(this._panbottombt, "click", function(e){that._map.panBy(new L.Loc(0,-panOffStep));});
        L.DomEvent.addListener(this._pantopbt, "click", function(e){that._map.panBy(new L.Loc(0,panOffStep));});
        
        L.DomEvent.addListener(this._zoominbt, "mouseenter", function(e){that._setButtonClassName(that._zoominbt, "zoominbt2");});
        L.DomEvent.addListener(this._zoominbt, "mouseout", function(e){that._setButtonClassName(that._zoominbt, "zoominbt");});
        L.DomEvent.addListener(this._zoomoutbt, "mouseenter", function(e){that._setButtonClassName(that._zoomoutbt, "zoomoutbt2");});
        L.DomEvent.addListener(this._zoomoutbt, "mouseout", function(e){that._setButtonClassName(that._zoomoutbt, "zoomoutbt");});
        L.DomEvent.addListener(this._zoominbt, "click", function(e){that._map.zoomIn();});
        L.DomEvent.addListener(this._zoomoutbt, "click", function(e){that._map.zoomOut();});
        
        if(this.options.useZoomBarTag){
            L.DomEvent.addListener(this._sliderbarbg, 'click', this._onSliderBarClick, this);
            L.DomEvent.addListener(this._sliderbartop, 'click', this._onSliderBarTopClick, this);
        }
        
        L.DomEvent.disableClickPropagation(this._container);
        L.DomEvent.addListener(this._container, 'click', L.DomEvent.preventDefault);
        L.DomEvent.addListener(this._container, 'mouseover', this._showLevelTagDivs, this);
        L.DomEvent.addListener(this._container, 'mouseleave', this._hideLevelTagDivs, this);
       
        map.on('zoomend', this._updateContainer, this);
        map.on('changebasiclayer', this._reset, this);
    },
    
    _onRemove:function () {
        var map = this._map;
        map.off('zoomend', this._updateContainer);
        map.off('changebasiclayer', this._reset);
        this._container = null;
    },
    
    _showLevelTagDivs:function (e) {
        if(this._showHideTimer){
            clearTimeout(this._showHideTimer);
        }
        this._setLevelTagDivs(true);
    },
    
    _hideLevelTagDivs:function (e) {
        if(this._showHideTimer){
            clearTimeout(this._showHideTimer);
        }
        var that = this;
        this._showHideInterval = 1000;
        this._showHideTimer = setTimeout(that._hideLevelTagDivsTimerFunc(that), this._showHideInterval);
    },
    
    _hideLevelTagDivsTimerFunc: function(that){
        var obj = that;
        return (function(){
            obj._setLevelTagDivs(false)
        });
    },
    
    _setLevelTagDivs: function (visible) {
        if(this.options.useZoomBarTag && this.options.useLevelTag){
            if(this._levelTagBts){
                var key,div;
                for(key in this._levelTagBts){
                    if(this._levelTagBts.hasOwnProperty(key)){
                        div = this._levelTagBts[key];
                        div.style.visibility = visible ? "inherit" : "hidden";
                    }
                }
            }
        }
    },
    
    _reset: function () {
        if (this._map) {
            this._map.removeControl(this);
            this._map.addControl(this);
        }
    },
    
    _onSliderBarClick: function (e) {
        if(!this._map) return;
        var map = this._map;
        var maxZoom = map.getZoomCount() - 1;
        var ms = L.DomEvent.getMousePosition(e,this._sliderbarbg);
        var dist =  Math.round((ms.y - this.options.zoominBtShadow) / this.options.zoomStep),
            zoomlevel = maxZoom - dist;
        zoomlevel = zoomlevel > maxZoom ? maxZoom : zoomlevel;
        zoomlevel = zoomlevel < 0 ? 0 : zoomlevel;
        map.setView(map.getCenter(), zoomlevel);
    },
    
    _onSliderBarTopClick: function (e) {
        if(!this._map) return;
        var ms = L.DomEvent.getMousePosition(e,this._sliderbartop);
        var map = this._map;
        var maxZoom = map.getZoomCount() - 1;
        var curZoom = map.getZoom();
        var dist =  Math.round((ms.y) / this.options.zoomStep),
            zoomlevel = curZoom - dist;
        zoomlevel = zoomlevel > maxZoom ? maxZoom : zoomlevel;
        zoomlevel = zoomlevel < 0 ? 0 : zoomlevel;
        map.setView(map.getCenter(), zoomlevel);
    }
    
});

/**
 * @class
 * @name L.Controls.Scale
 * @description 比例尺控件
 */
L.Controls.Scale = L.Controls.Base.extend({
    topOutUnits: "km",
    topInUnits: "m",
    
    _type : "L.Controls.Scale",
    options: {
        maxWidth: 100,
        position: 'bottomleft',
        headStr: "比例尺："
    },
    
    /**
     * @constructor
     * @name L.Controls.Scale
     * @description 比例尺控件的构造函数
     */
    initialize: function (options) {
        L.Util.setOptions(this, options);
    },
    
    _initContainer: function() {
        var map = this._map;
        var className = 'leaflet-control-scale';
        this._container = L.Util.create('div', className);
        L.Util.stamp(this._container);
        var classNamepic = 'leaflet-control-scale-pic';
        this._pic = L.Util.create('div', classNamepic);
        L.Util.stamp(this._pic);
        var classNamechar = 'leaflet-control-scale-char';
        this._char = L.Util.create('div', classNamechar);
        L.Util.stamp(this._char);
        this._container.appendChild(this._pic);
        this._container.appendChild(this._char);
        this._initEvents();
        return this._container;
    },
    
    _initEvents: function() {
        var map = this._map;
        map.on('zoomend', this._updateScale, this);
    },
    
    _updateScale: function(e) {
        //if(!e) return;
        var res = this._map.getResolution();
        if(!res) return;
        var curMapUnits = this._map.getUnits();
        var inches = L.Util.INCHES_PER_UNIT;
        var maxSizeData = this.options.maxWidth * res * inches[curMapUnits];
        var topUnits;
        if(maxSizeData > 100000){
            topUnits = this.topOutUnits;
        }else{
            topUnits = this.topInUnits;
        }
        var topMax = maxSizeData / inches[topUnits];
        var topRound = this._getWidth(topMax);
        topMax = topRound / inches[curMapUnits] * inches[topUnits];
        var topPx = topMax / res;
        this._pic.style.borderStyle = "groove";
        this._pic.style.borderTopStyle = "none";
        this._pic.style.textAlign = "center";
        this._pic.style.width = Math.round(topPx) + "px";
        this._pic.innerHTML = topRound + " " + topUnits;
        this._update();
    },
    
    _setMap: function (map) {
        L.Controls.Base.prototype._setMap.call(this,map);
        this._updateScale();
    },
    
    _getWidth: function(Len) {
        var digits = parseInt(Math.log(Len) / Math.log(10));
        var pow10 = Math.pow(10, digits);
        var firstChar = parseInt(Len / pow10);
        var barLen;
        if(firstChar > 5) {
            barLen = 5;
        } else if(firstChar > 2) {
            barLen = 2;
        } else {
            barLen = 1;
        }
        return barLen * pow10;
    },
    
    _update: function(){
        var scale = this._map.getScale();
        if(!scale){
            return;
        }
        if(scale >= 9500){
            scale = Math.round(scale / 10000) + "万";
        }else{
            scale = Math.round(scale);
        }
        this._char.style.borderStyle = "none";
        this._char.innerHTML = "比例尺 = 1 : " + scale;  
    },
    
    _onRemove: function() {
        var map = this._map;
        map.off('zoomend', this._updateScale);
    }
});

/**
 * @class
 * @name L.Controls.Position
 * @description 坐标位置控件
 */
L.Controls.Position = L.Controls.Base.extend({
    
    _type : "L.Controls.Position",
    options: {
        position: 'bottomright',
        headStr:"X: ",
        separator: " , Y: ",
        tailStr:"",
        digitsNum:4
    },
    
    /**
     * @constructor
     * @name L.Controls.Position
     * @description 坐标位置控件的构造函数
     */
    initialize: function (options) {
        L.Util.setOptions(this, options);
    },
    
    _initContainer: function() {
        var map = this._map;
        var className = 'leaflet-control-position';
            this._container = L.Util.create('div', className);
        L.Util.stamp(this._container);
        this._initEvents();
        return this._container;
    },
    
    _initEvents: function () {
        var map = this._map;
        map.on('mousemove', this._updatePosition, this);
    },
    
    _updatePosition: function (e) {
        if(!e || !e.point) return;
        var loc = e.point;
        
        var newHtml =
            this.options.headStr +
            this._formatNum(loc.x) +
            this.options.separator + 
            this._formatNum(loc.y) +
            this.options.tailStr;
        this._container.innerHTML = newHtml;
    },
    
    _formatNum:function (num) {
        var digits = parseInt(this.options.digitsNum);
        return num.toFixed(digits);
    },
    
    _onRemove:function () {
        var map = this._map;
        map.off('mousemove', this._updatePosition);
    }
});


L.Popups = {};
/**
 * @class
 * @name L.Popups.Base
 * @description 对话框类
 * @inherit L.Class
 */
L.Popups.Base = L.Class.extend({
    includes: L.Mixin.Events,
    
    options: {
        minWidth: 50,
        maxWidth: 300,
        maxHeight: null,
        autoPan: true,
        closeButton: true,
        pixelOffset: new L.Loc(0, 2),
        autoPanPadding: new L.Loc(5, 5),
        className: ''
    },

    /**
     * @constructor
     * @name L.Popups.Base
     * @description 创建｛NDialog｝对话框类对象
     * @param {L.Popups.BaseOptions} options 对话框类构造函数的参数选项，参见<L.Popups.BaseOptions>
     */
    initialize: function (options, source) {
        L.Util.setOptions(this, options);
        this._source = source;
    },

    _setMap: function (map) {
        this._map = map;
        if (!this._container) {
            this._initLayout();
        }
        this._updateContent();

        this._container.style.opacity = '0';

        this._map._panes.popupPane.appendChild(this._container);
        this._map.on('viewreset', this._updatePosition, this);

        if (!(L.Util.Browser.android) && this._map.closeDialogOnClick) {
            this._map.on('click', this._close, this);
        }

        this._update();

        this._container.style.opacity = '1'; 
        this._opened = true;
    },

    _unsetMap: function (map) {
        map = map || this._map;
        map._panes.popupPane.removeChild(this._container);
        L.Util.falseFn(this._container.offsetWidth);
        map._dlgAutoPanTag = false;
        map.off("moveend", this._autoPanEnd, this);

        map.off('viewreset', this._updatePosition, this);
        if (!(L.Util.Browser.android) && this._map.closeDialogOnClick) {
            map.off('click', this._close, this);
        };

        this._container.style.opacity = '0';
        

        this._opened = false;
        this._map = null;
    },
	
	/**
     * @function
     * @name setPosition
     * @description 设置对话框的位置
     * @param {L.Loc} latlng 表示位置点的坐标
     */
    setPosition: function (latlng) {
        this._latlng = latlng;
        if (this._opened) {
            this._update();
        }
        return this;
    },

	/**
     * @function
     * @name setContent
     * @description 设置对话框的内容
     * @param {String | DOMElement} content 对话框的内容
     */
    setContent: function (content) {
        this._content = content;
        if (this._opened) {
            this._update();
        }
        return this;
    },

    /**
     * @function
     * @name hide
     * @description 隐藏窗体对话框
     */
    hide:function(){
        if(this._container)
            L.Util.addClass(this._container, "leaflet_hide");
    },
    
    /**
     * @function
     * @name show
     * @description 显示窗体对话框
     */
    show:function() {
        if(this._container)
            L.Util.removeClass(this._container, "leaflet_hide");
    },
    
    _close: function () {
        var map = this._map;

        if (map) {
            if(this._singleDlgTag)
				this._map.closeSingleDialog(this);// this.hide(this);
            else
                this._map.closeDialog(this);
        }
    },

    _initLayout: function () {
        this._container = L.Util.create('div', 'leaflet-popup');

        if (this.options.closeButton) {
            this._closeButton = L.Util.create('a', 'leaflet-popup-close-button', this._container);
            this._closeButton.href = '#close';
            L.DomEvent.addListener(this._closeButton, 'click', this._onCloseButtonClick, this);
        }

        this._wrapper = L.Util.create('div', 'leaflet-popup-content-wrapper', this._container);
        L.DomEvent.disableClickPropagation(this._wrapper);
        this._contentNode = L.Util.create('div', 'leaflet-popup-content', this._wrapper);
        L.DomEvent.addListener(this._contentNode, 'mousewheel', L.DomEvent.stopPropagation);

        this._tipContainer = L.Util.create('div', 'leaflet-popup-tip-container', this._container);
        this._tip = L.Util.create('div', 'leaflet-popup-tip', this._tipContainer);
    },

    _update: function () {
        if (!this._map) { return; }
        this._container.style.visibility = 'hidden';

        this._updateContent();
        this._updateLayout();
        this._updatePosition();

        this._container.style.visibility = '';

        this._adjustPan();
    },

    _updateContent: function () {
        if (!this._content) {
            return;
        }

        if (typeof this._content === 'string') {
            this._contentNode.innerHTML = this._content;
        } else {
            this._contentNode.innerHTML = '';
            this._contentNode.appendChild(this._content);
        }
        this.fire('popupcontentupdate');
    },

    _updateLayout: function () {
        var container = this._contentNode;

        container.style.width = '';
        container.style.whiteSpace = 'nowrap';

        var width = container.offsetWidth;
        width = Math.min(width, this.options.maxWidth);
        width = Math.max(width, this.options.minWidth);

        container.style.width = (width + 1) + 'px';
        container.style.whiteSpace = '';

        this._tipContainer.style.marginLeft = (width/2 + 2) + 'px';

        container.style.height = '';

        var height = container.offsetHeight,
            maxHeight = this.options.maxHeight,
            scrolledClass = ' leaflet-popup-scrolled';

        if (maxHeight && height > maxHeight) {
            container.style.height = maxHeight + 'px';
            container.className += scrolledClass;
        } else {
            container.className = container.className.replace(scrolledClass, '');
        }

        this._containerWidth = this._container.offsetWidth;
    },

    _updatePosition: function () {
        var pos = this._map._pointToAbsPixel(this._latlng);

        this._containerBottom = -pos.y - this.options.pixelOffset.y;
        this._containerLeft = pos.x - Math.round(this._containerWidth / 2) + this.options.pixelOffset.x;

        this._container.style.bottom = this._containerBottom + 'px';
        
        this._container.style.left = this._containerLeft + 'px';
    },

    _adjustPan: function () {
        if (!this.options.autoPan) {
            return;
        }

        var containerHeight = this._container.offsetHeight,
            layerPos = new L.Loc(
                this._containerLeft,
                -containerHeight - this._containerBottom),
            containerPos = layerPos.add(L.Util.getPosition(this._map._mapPane)),
            adjustOffset = new L.Loc(0, 0),
            padding = this.options.autoPanPadding,
            size = this._map.getSize();

        if (containerPos.x < 0) {
            adjustOffset.x = containerPos.x - padding.x;
        }
        if (containerPos.x + this._containerWidth > size.x) {
            adjustOffset.x = containerPos.x + this._containerWidth - size.x + padding.x;
        }
        if (containerPos.y < 0) {
            adjustOffset.y = containerPos.y - padding.y;
        }
        if (containerPos.y + containerHeight > size.y) {
            adjustOffset.y = containerPos.y + containerHeight - size.y + padding.y;
        }

        if (adjustOffset.x || adjustOffset.y) {
            if(!this._map)return;
            this._map._dlgAutoPanTag = true;
            this._map.fire("popupautopanstart", {popup: this});
            this._map.panBy(adjustOffset);
            this._map.on("moveend", this._autoPanEnd, this)
        }
    },
    
    _autoPanEnd:function(){
        if(this._map && this._map._dlgAutoPanTag){
            this._map._dlgAutoPanTag = false;
            this._map.fire("popupautopanend", {popup: this});
            this._map.off("moveend", this._autoPanEnd, this);
        }
    },
    

    _onCloseButtonClick: function (e) {
        this._close();
        L.DomEvent.stop(e);
    }
});

/**
 * @class
 * @name L.Popups.BaseOptions
 * @description 此类表示NDialog构造函数的可选参数。它没有构造函数，但可通过对象字面量形式表示。
 */
L.Popups.BaseOptions = {
    /**
     * @name minWidth
     * @type {Number} 
     * @description 对话框最小宽度值,默认值为50
     */
    minWidth: 50,
    
    /**
     * @name maxWidth
     * @type {Number} 
     * @description 对话框最大宽度值,默认值为800
     */
    maxWidth: 800,
    
    /**
     * @name closeButton
     * @type {Boolean} 
     * @description 是否自动添加关闭按钮，默认值为true
     */
    closeButton:true,
    
    /**
     * @name pixelOffset
     * @type {L.Loc} 
     * @description 对话框的偏移量
     */
    pixelOffset:L.Loc(0,2),
    
    /**
     * @name content
     * @type {String | DOMElement} 对话框内容
     * @description 对话框的内容
     */
    content:''
};


L.Ols = {};
/**
 * @class
 * @name L.Ols.Base
 * @description 覆盖物类基类
 */
L.Ols.Base = L.Class.extend({
    /**
     * @constructor
     * @name L.Ols.Base
     * @description 所有覆盖物类的基类，该类不可实例化
     */
    initialize: function () {
    },
    
    /**
     * @function
     * @name setVisible
     * @description 虚函数 设置可见性
     * @param {Boolean} value 可见性
     */
     setVisible: function (value) {
     }
});


/**
 * @class
 * @name L.Ols.EleBase
 * @description 元素类基类，用于将DOM元素加载入地图
 * @inherit L.Ols.Base
 */
L.Ols.EleBase = L.Class.extend({

    includes: L.Mixin.Events,
    options: {
        title: null,
        content:'',
        offset: new L.Loc(0, 0),
        zIndexOffset: 0,
        //interactive parts
        popable:true,
        clickable: true,
        draggable: false
    },

    /**
     * @constructor
     * @name L.Ols.EleBase
     * @description 所有元素类的基类，该类不可实例化
     * @param {L.Loc} position 元素在地图中的地理坐标位置
     * @param {L.Ols.EleBaseOptions} options 参数选项，参见NElementOptions
     */
    initialize: function (lonlat, options) {
        L.Util.setOptions(this, options);
        this._latlng = lonlat;
    },

    /**
     * @function
     * @name setOpacity
     * @description 设置元素的透明度
     * @param {Number} opacity 元素的透明度，该参数取值范围[0 - 1]
     */
    setOpacity: function (value) {
        if(value == undefined) return;
        value = Math.abs(value);
        value = value > 1 ? 1 : value;
        
        this.options.opacity = value;
        if(this._element)
            L.Util.setOpacity(this._element, value);
    },
    
    /**
     * @function
     * @name getPosition
     * @description 获取元素在地图中的地理坐标位置
     * @return {L.Loc} 地理坐标
     */
    getPosition: function () {
        return this._latlng;
    },

    /**
     * @function
     * @name setPosition
     * @description 设置元素的地理坐标位置
     * @param {L.Loc} 地理坐标
     */
    setPosition: function (latlng) {
        this._latlng = latlng;
        this._update();
    },

    /**
     * @function
     * @name setVisible
     * @description 设置元素的可见性
     * @param {Boolean} value 可见性
     */
    setVisible: function (value) {
        if(this._element)
            this._element.style.visibility = value ? "inherit" : "hidden";
    },
    
    /**
     * @function
     * @name addClass
     * @description 为元素增加样式
     * @param {String} name 样式类名，样式通过CSS定义
     */
    addClass: function (name) {
        if(this._element){
            L.Util.addClass(this._element, name);
        }
    },
    
    /**
     * @function
     * @name removeClass
     * @description 为元素移除样式
     * @param {String} name 样式名
     */
    removeClass: function (name) {
        if(this._element){
            L.Util.removeClass(this._element, name);
        }
    },
    
    /**
     * @function
     * @name setStyle
     * @description 设置元素的样式
     * @param {Object} styles 改参数为JavaScript对象常量，如：
setStyle({ color : "blue", fontSize : "10px" }) 注意：如果css的属性名中包含连字符，需要将连字符去掉并将其后的字母进行大写处理，例如：背景色属性要写成：backgroundColor。
     */
    setStyle: function (style) {
        if(style && this._element){
            var key;
            for(key in style){
                if(style.hasOwnProperty(key))
                    this._element.style[key] = style[key];
            }
        }
    },
    
    /**
     * @function
     * @name setTitle
     * @description 设置元素的title属性
     * @param {String} value 元素的title属性
     */
    setTitle:function (value) {
        this.options.title = value;
        if(this._element)
            this._element.title = value;
    },
    
    /**
     * @function
     * @name enableDrag
     * @description 设置元素可以拖动
     */
    enableDrag: function() {
        if(!this._map){
            this.options.draggable = this.draggable = true;
            return this;
        }
        this.options.draggable = true;
        if(!this.dragging)
            this.dragging = new L.Ols.EleBase.Drag(this);
        this.dragging.enable();
        return this;
    },
    
    /**
     * @function
     * @name enableDrag
     * @description 设置元素不可拖动
     */
    disableDrag: function(){
        if(!this._map){
            this.options.draggable = this.draggable = false;
            return this;
        }
        this.options.draggable = false;
        if(this.dragging)
            this.dragging.disable();
        return this;
    },
    
    /**
     * @function
     * @name enablePop
     * @description 设置元素在激活时置前显示
     */
    enablePop: function() {
        this.options.popable = true;
        this.on('mouseover', this._onMouseOver, this);
        this.on('mouseout', this._onMouseOut, this);
    },

    /**
     * @function
     * @name disablePop
     * @description 禁止元素在激活时置前显示
     */
    disablePop: function() {
        this._pushToBack();
        this.options.popable = false;
        this.off('mouseover', this._onMouseOver);
        this.off('mouseout', this._onMouseOut);
    },

    /**
     * @function
     * @name bringToFront
     * @description 将元素置前显示
     */
    bringToFront: function() {
        this._popToFront();
    },
     
    /**
     * @function
     * @name _creatElement
     * @description 抽象函数，该方法用于创建DOM元素对象，由NElement类继承的所有子类均需重载该方法，例如：实现NLebel类代码如下：@j_code <br />
     *L.Ols.Label = L.Ols.EleBase.extend({<br />
        &nbsp;&nbsp;_creatElement : function () {<br />
        &nbsp;&nbsp;&nbsp;&nbsp;var el;<br />
        &nbsp;&nbsp;&nbsp;&nbsp;el = document.createElement('label');<br />
        &nbsp;&nbsp;&nbsp;&nbsp;return el;<br />
        &nbsp;&nbsp;}
     *});<br />
     
     */
    _creatElement: function () {
        return null;
    },
    
    _setMap: function (map) {
        this._map = map;

        this._initElement();

        map.on('viewreset', this._update, this);
        this._update();
    },

    _unsetMap: function (map) {
        map = map || this._map;
        this._removeElement();
        
        map.off('viewreset', this._update, this);
        this._map = null;
    },

    _initElement: function () {
        if (!this._element) {
            this._element = this._creatElement();
            
            if(!this._element) return;
            if(this.options.offset){
                var markerAnchor = this.options.offset;
                this._element.style.marginLeft = (markerAnchor.x) + 'px';
                this._element.style.marginTop = (markerAnchor.y) + 'px';
            }
            if(this.options.title)
                this._element.title = this.options.title;
            if(this.options.opacity !== undefined)
                L.Util.setOpacity(this._element, this.options.opacity);
            
            this._initInteraction();
        }
        this._map._panes.markerPane.appendChild(this._element);
    },

    setOffset:function (offset) {
        if(offset)
            this.options.offset = offset;
        if(this._element){
            this._element.style.marginLeft = (offset.x) + 'px';
            this._element.style.marginTop = (offset.y) + 'px';
        }
    },
    
    _removeElement: function () {
        this._map._panes.markerPane.removeChild(this._element);
        this._element = null;
    },
    
    _getMoveTarget: function() {
        return this._element;
    },
    
    _getDragTarget:function () {
        return this._element;
    },

    _update: function () {
        var pos = this._map._pointToAbsPixel(this._latlng).round();
        L.Util.setPosition(this._element, pos);
        if(!this._poped)
            this._element.style.zIndex = pos.y + this.options.zIndexOffset;
    },

    _initInteraction: function () {
        if(this.options.popable){
            this.enablePop();
        }
        
        if (this.options.clickable) {
            this._element.className += ' leaflet-clickable';
           
        }
        L.DomEvent.addListener(this._element, 'click', this._onMouseClick, this);
        var events = ['dblclick', 'mousedown', 'mouseover', 'mouseout','mouseup'];
        for (var i = 0; i < events.length; i++) {
            L.DomEvent.addListener(this._element, events[i], this._fireMouseEvent, this);
        }
        this.on("mouseover", this._onMouseOver, this);
        this.on("mouseout", this._onMouseOut, this);

        if (this.options.draggable) {
            this.enableDrag();
        }
    },

    _onMouseClick: function (e) {
        if (this.dragging && this.dragging.moved()) { return; }
        this.fire(e.type, {originalEvent: e});
        L.DomEvent.stopPropagation(e);
    },
    
    _popToFront:function () {
        this._poped = true;
        if(this._element)
            this._element.style.zIndex = L.Util.MaxZIndex;
    },
    
    _pushToBack: function () {
        this._poped = false;
        if(!this._element)return;
        var pos = L.Util.getPosition(this._element);
        if(!isNaN(this.options.zIndexOffset))
            this._element.style.zIndex = pos.y + this.options.zIndexOffset;
        else
            this._element.style.zIndex = "auto";
    },

    _onDragUpdate: function (e) {
        this._latlng = e.point;
    },
    
    _onMouseOver: function (e) {
        //L.DomEvent.stopPropagation(e);
        if (this.dragging && this.dragging.moved()) { return; }
        if(this.options.popable){
            this._popToFront();
        }
        L.DomEvent.stopPropagation(e);
        //this.fire(e.type);
    },
    
    _onMouseOut: function (e) {
        //L.DomEvent.stopPropagation(e);
        if (this.dragging && this.dragging.moved()) { return; }
        
        if(this.options.popable){
            this._pushToBack();
        }
        L.DomEvent.stopPropagation(e);
        //this.fire(e.type);
    },

    _fireMouseEvent: function (e) {
        if(!this._map || this._map.getHegemonTag())
            return;
            
        this.fire(e.type, {originalEvent: e});
        //L.DomEvent.stopPropagation(e);
    }
    
    //mouse相关
    /**
     * @event
     * @name click
     * @description 鼠标点击元素时会触发此事件
     */
    /**
     * @event
     * @name mousedown
     * @description 鼠标在元素上方按下时会触发此事件
     */
    /**
     * @event
     * @name mouseup
     * @description 鼠标在元素上方抬起时会触发此事件
     */
    /**
     * @event
     * @name mouseover
     * @description 鼠标移动至元素时会触发此事件
     */
    /**
     * @event
     * @name mouseout
     * @description 鼠标移出元素时会触发此事件
     */
    /**
     * @event
     * @name mousemove
     * @description 鼠标在元素上移动时会触发此事件
     */
    /**
     * @event
     * @name dblclick
     * @description 鼠标在元素上双击时会触发此事件
     */
});

/**
 * @class
 * @name L.Ols.EleBaseOptions
 * @description 此类表示NElement构造函数的可选参数。它没有构造函数，但可通过对象字面量形式表示。
 */
L.Ols.EleBaseOptions = {
    /**
     * @name title
     * @type {String} 
     * @description 元素的title属性，默认值为null
     */
    title: null,
    
    /**
     * @name offset
     * @type {L.Loc} 
     * @description 元素在地图中的相对于其地理坐标位置的偏移量，以像素为单位
     */
    offset: new L.Loc(0, 0),
    
    /**
     * @name zIndexOffset
     * @type {Number} 
     * @description 元素的叠盖关系基数
     */
    zIndexOffset: 0,
    
    /**
     * @name popable
     * @type {Boolean} 
     * @description 是否允许元素激活时置前显示
     */
    popable:true,
    
    /**
     * @name clickable
     * @type {Boolean} 
     * @description 是否为元素设置点击事件
     */
    clickable: true,
    
    /**
     * @name draggable
     * @type {Boolean} 
     * @description 是否设置元素可拖动
     */
    draggable: false
};

/**
 * @class
 * @name L.Ols.Label
 * @description 此类表示NElement构造函数的可选参数。它没有构造函数，但可通过对象字面量形式表示。
 * @inherit L.Ols.EleBase
 */
L.Ols.Label = L.Ols.EleBase.extend({
    options: {
        content:'',
        offset: new L.Loc(0, 0),
        zIndexOffset: 0,
        //interactive parts
        popable:true,
        clickable: true,
        draggable: false
    },
    
    /**
     * @constructor
     * @name L.Ols.Label
     * @description 用于将<Label>元素绑定到地图中的类
     * @param {L.Loc} position <Label>元素在地图中的地理坐标位置
     * @param {Object} options 参数选项，除可使用NElementOptions所列举的所有选项之外，还可增加{content:""}属性设置标签的内容
     */
    initialize: function (lonlat, options) {
        this.options = L.Util.extend({content: ''}, L.Ols.EleBaseOptions, options);
        //L.Util.setOptions(this, options);
        this._latlng = lonlat;
    },
    
    /**
     * @function
     * @name getContent
     * @description 获取标签的内容
     * @return {String} 返回标签的内容
     */
    getContent: function () {
        return this.options.content;
    },
    
    /**
     * @function
     * @name setContent
     * @description 设置标签的内容。该参数同时支持普通字符串和HTML形式的字符串，如 obj.setContent("HelloWorld");或  obj.setContent("<Span>Hello World!</Span>");
     * @param {String} content 标签的内容
     */
    setContent: function (content) {
        this.options.content = content;
        if(this._element)
            this._element.innerHTML = this.options.content;
    },
    
    _creatElement: function () {
        var el;
        el = document.createElement('label');
        el.className = 'leaflet-label';
        el.innerHTML = this.options.content;
        el.unselectable = "on";
        el.hashCode="mz_2s"
        return el;
    },
    
    _initElement: function () {
        L.Ols.EleBase.prototype._initElement.call(this);
        if(this.options.content){
            this.setContent(this.options.content);
        }
    }
});

/**
 * @class
 * @name L.Ols.TipLabel
 * @description 此类表示带箭头的标注。
 * @inherit L.Ols.EleBase
 */
L.Ols.TipLabel = L.Ols.EleBase.extend({
    options: {
        content:'',
        offset: new L.Loc(0, 0),
        zIndexOffset: 0,
        //interactive parts
        popable:true,
        clickable: true,
        draggable: false
    },
    /**
     * @constructor
     * @name L.Ols.TipLabel
     * @description 用于将<L.Ols.TipLabel>元素绑定到地图中的类
     * @param {L.Loc} position <L.Ols.TipLabel>元素在地图中的地理坐标位置
     * @param {Object} options 参数选项，除可使用NElementOptions所列举的所有选项之外，还可增加{content:""}属性设置标签的内容
     */
    initialize: function (lonlat, options) {
        this.options = L.Util.extend({content: ''}, L.Ols.EleBaseOptions, options);
        this._latlng = lonlat;
    },
    /**
     * @function
     * @name getContent
     * @description 获取标签的内容
     * @return {String} 返回标签的内容
     */
    getContent: function () {
        return this.options.content;
    },
    
    /**
     * @function
     * @name setContent
     * @description 设置标签的内容。该参数同时支持普通字符串和HTML形式的字符串，如 obj.setContent("HelloWorld");或  obj.setContent("<Span>Hello World!</Span>");
     * @param {String} content 标签的内容
     */
    setContent: function (content) {
        this.options.content = content;
        if(this._element)
            this._element.innerHTML = this.options.content;
    },
    
    _creatElement: function () {
        this._container = L.Util.create('div', 'leaflet-arrowlab');

        this._wrapper = L.Util.create('div', 'leaflet-label-content-wrapper', this._container);
        L.DomEvent.disableClickPropagation(this._wrapper);
        this._contentNode = L.Util.create('div', 'leaflet-label', this._wrapper);
        this._contentNode.innerHTML = this.options.content;
        L.DomEvent.addListener(this._contentNode, 'mousewheel', L.DomEvent.stopPropagation);

        this._tipContainer = L.Util.create('div', 'leaflet-label-tip-container', this._container);
        this._tip = L.Util.create('div', 'leaflet-arrowlabel', this._tipContainer);
      
        return this._container;
    }
});
 
L.Ols.EditAnchor = L.Ols.EleBase.extend({
    options: {
        content:'',
        zIndexOffset: 60000,
        offset: null,
        //interactive parts
        //popable:true,
        clickable: true,
        draggable: true
    },
    
    initialize: function (lonlat, options) {
        L.Util.setOptions(this, options);
        this._latlng = lonlat;
    },
    
    getContent: function () {
        return this.options.content;
    },
    
    setContent: function (content) {
        this.options.content = content;
        // if(this._element)
            // this._element.innerHTML = this.options.content;
    },
    
    _creatElement: function () {
        var el;
        el = document.createElement('div');
        el.className = 'leaflet-div-element';
        if(this.options.content)
            el.innerHTML = this.options.content;
        el.unselectable = "on";
        el.hashCode="mz_2s"
        return el;
    }
});

/**
 * @class
 * @name L.Ols.ContextMenu
 * @description 右键菜单类
 */
L.Ols.ContextMenu = L.Class.extend({
    _menuItems:null,
    _separators:null,
    
    /**
     * @constructor
     * @name L.Ols.ContextMenu
     * @description 用于为地图添加右键菜单的类
     */
    initialize:function(){
        this._container = L.Util.create('div', "leaflet_contextMenu");
    },
    
    /**
     * @function
     * @name addItem
     * @description 添加菜单项
     * @param {L.Ols.ContextMenuItem} item 菜单项对象
     */
    addItem:function(item){
        if(item && (item instanceof L.Ols.ContextMenuItem)){
            this._menuItems = this._menuItems || new Array();
            item._setContextMenu(this);
            this._menuItems.push(item);
        }
    },
    
    /**
     * @function
     * @name addSeparator
     * @description 添加分隔条
     */
    addSeparator:function(){
        var tempSepDiv = L.Util.create('div', "leaflet_contextMenu_sepr", this._container);
        var id = L.Util.stamp(tempSepDiv);
        tempSepDiv.id = id;
        this._separators = this._separators || new Array();
        this._separators.push(id);
    },
    /**
     * @function
     * @name removeSeparator
     * @description 移除分隔条
     * @param {Number} index 所要删除的分隔条在菜单所包含所有分隔条中所处的次序位置（从上到下，从0开始）
     */
    removeSeparator:function(i){
        if(this._separators && (i < this._separators.length)){
            var idTmp = this._separators[i];
            var divTmp = document.getElementById(idTmp);
            if(divTmp && divTmp.parentNode){
                this._separators.splice(i, 1);
                this._container.removeChild(divTmp);
            }
        }
    },
    
    /**
     * @function
     * @name getItem
     * @description 获取指定位置的菜单项
     * @param {Number} index 菜单项在菜单所包含所有菜单项中所处的次序位置（从上到下，从0开始）
     * @return {L.Ols.ContextMenuItem} 菜单项对象
     */
    getItem:function(i){
        if(this._menuItems && (i < this._menuItems.length)){
            return this._menuItems[i];
        }
        else
            return null;
    },
    
    /**
     * @function
     * @name removeItem
     * @description 从菜单中移除指定的菜单项
     * @param {L.Ols.ContextMenuItem} item 要移除的菜单项
     */
    removeItem: function(item){
        if(item && (item instanceof L.Ols.ContextMenuItem) && this._menuItems){
            var tmpId, id = L.Util.stamp(item);
            for(var i = 0; i < this._menuItems.length; i++){
                if(this._menuItems[i]){
                    tmpId = L.Util.stamp(this._menuItems[i]);
                    if(tmpId == id){
                        this._menuItems.splice(i, 1);
                        this._menuItems[i]._unsetContextMenu();
                        return;
                    }
                }
            }
        }
    },
    
    show:function(posObj){
        this.posObjects = posObj;
        this._container.style.display = "block";
        L.Util.setPosition(this._container, posObj.pixel);
    },
    
    /**
     * @function
     * @name hide
     * @description 隐藏右键菜单
     */
    hide: function() {
        this._container.style.display = "none";
    },
    
    _setMap:function(map) {
        this._map = map;
        if(this._map){
            this._map.on('mousedown', this.hide, this);
        }
        if(this._map && this._map._container)
            this._map._container.appendChild(this._container);
    },
    
    _unsetMap:function() {
        this.hide();
        if(this._map){
            this._map.off('mousedown', this.hide, this);
        }
        if(this._map && this._map._container)
            this._map._container.removeChild(this._container);
        this._map = null;
    }
 });

/**
 * @class
 * @name L.Ols.ContextMenuItem
 * @description 菜单项类
 */
L.Ols.ContextMenuItem = L.Class.extend({
    text:'',
    callback:null,
    posObjects:null,
   
    /**
     * @constructor
     * @name L.Ols.ContextMenuItem
     * @description 用于创建菜单项的类
     * @param {String} text 菜单项显示的内容
     * @param {Function} callback 菜单项点击事件的响应函数
     */
    initialize:function(text, callback){
        this.text = text;
        this.callback = callback;
        
        this._itemDiv = L.Util.create('div', "leaflet_contextMenu_item");
        this._itemDiv.innerHTML = '<span>' + text + "</span>";
        
        L.DomEvent.addListener(this._itemDiv, "mousedown", 
            function(e){
                L.DomEvent.stopPropagation(e);
            }
        );
        L.DomEvent.addListener(this._itemDiv, "click", 
            function(params){
                var that = params;
                return function(e){
                    if(that.callback){
                        that.callback(that._parent.posObjects);
                        that._parent.hide();
                    }
                    L.DomEvent.stopPropagation(e);
                }
            }(this)
        );
        L.DomEvent.addListener(this._itemDiv, "mouseover", 
            function(e){
                L.Util.addClass(this, " leaflet_contextMenu_item_hover");
                L.DomEvent.stopPropagation(e);
            }
        );
        L.DomEvent.addListener(this._itemDiv, "mouseout", 
            function(e){
                L.Util.removeClass(this, " leaflet_contextMenu_item_hover");
            }
        );
    },
    
    _setContextMenu:function(obj){
        this._parent = obj;
        obj._container.appendChild(this._itemDiv);
    },
    
    _unsetContextMenu:function() {
        this._parent._container.removeChild(this._itemDiv);
    }
 });
 

 
/**
 * @class
 * @name L.Ols.Marker
 * @description 标注类
 * @inherit L.Ols.Base
 */
L.Ols.Marker = L.Ols.Base.extend({

    includes: L.Mixin.Events,
    options: {
        //icon Parts
        imgUrl: L.Icon.Default.imagePath + 'marker.png',
        shadowUrl: L.Icon.Default.imagePath + 'marker-shadow.png',

        markerSize: new L.Loc(25, 41),
        shadowSize: new L.Loc(41, 41),
        labelSize: new L.Loc(50,50),
        
        markerAnchor: new L.Loc(13, 41),
        shadowAnchor: new L.Loc(13, 41),
        popupAnchor: new L.Loc(0, -33),
        labelAnchor: new L.Loc(0,-33),
        
        markerTitle: '',
        assignId: '',
        visible: true,
        labelable: false,
        labelContent: '',
        popable:true,
        //interactive parts
        clickable: true,
        draggable: false,
        zIndexOffset: 0,
        labeClass:{
			backgroundColor:'#ffffe1',
			border:'#8c8c8c 1px solid',//'none'
			fontSize:'12px',
			fontFamily:'',
			color:'#4d4d4d'
		}
    },
    _type:"L.Ols.Marker",
    
	getType:function(){
		return this._type;
	},
    /**
     * @constructor
     * @name L.Ols.Marker
     * @description 标注类的构造函数
     * @param  {L.Loc} position 标注位置
     * @param  {L.Ols.MarkerOptions} options 参数选项，可参考<L.Ols.MarkerOptions>进行选择
     */
    initialize: function (lonlat, options) {
        this.options = L.Util.extend({}, L.Ols.MarkerOptions, options);
        this._latlng = lonlat;
    },
    
    /**
     * @function
     * @name getPosition
     * @description 获取标注在地图中的地理坐标位置
     * @return {L.Loc} 地理坐标
     */
    getPosition: function () {
        return this._latlng;
    },

    /**
     * @function
     * @name setPosition
     * @description 设置标注在地图中的地理坐标位置
     * @param  {L.Loc} position 地理坐标位置
     */
    setPosition: function (latlng) {
        this._latlng = latlng;
        if (this._markerTarget) {
            this._update();

            if (this._popup) {
                this._popup.setPosition(this._latlng);
            }
        }
    },

    /**
     * @function
     * @name enableDrag
     * @description 设置元素可以拖动
     */
    enableDrag: function() {
        this.options.draggable = this.draggable = true;
        if(!this._map) return this;
        if(!this.dragging)
            this.dragging = new L.Ols.EleBase.Drag(this);
        this.dragging.enable();
        this.on('dragend', this.bringToBack, this);
        
        return this;
    },
    /**
     * @function
     * @name disableDrag
     * @description 设置元素不可拖动
     */
    disableDrag: function(){
        this.options.draggable = this.draggable = false;
        if(!this._map) return this;
        if(this.dragging){
            this.dragging.disable();
            this.off('dragend', this.bringToBack,this);
        }
        return this;
    },

    /**
     * @function
     * @name enablePop
     * @description 设置标注在激活时置前显示
     */
    enablePop: function() {
        this.options.popable = true;
        this.on('mouseover', this._onMouseOver, this);
        this.on('mouseout', this._onMouseOut, this);
    },

    /**
     * @function
     * @name disablePop
     * @description 禁止标注在激活时置前显示
     */
    disablePop: function() {
        this._pushToBack();
        this.options.popable = false;
        this.off('mouseover', this._onMouseOver);
        this.off('mouseout', this._onMouseOut);
    },
    
    /**
     * @function
     * @name bringToFront
     * @description 将标注置前显示
     */
    bringToFront: function() {
        this._popToFront();
    },

    /**
     * @function
     * @name bringToBack
     * @description 将标注置后显示
     */
    bringToBack: function() {
        this._pushToBack();
    },
    
    /**
     * @function
     * @name setTitle
     * @description 设置标注的title属性
     * @param {String} value 标注的title属性
     */
    setTitle: function (value) {
        this.options.markerTitle = value;
        if(this._markerTarget)
            this._markerTarget.title = this.options.markerTitle;
    },
    
    /**
     * @function
     * @name getVisible
     * @description 获取标注的可见性
     * @return {Boolean} 标注的可见性
     */
    getVisible : function() {
        return this.options.visible;
    },
    
    /**
     * @function
     * @name setVisible
     * @description 设置标注的可见性
     * @param {Boolean} value 标注的可见性
     */
    setVisible: function(value) {
        value = value ? true : false;
        var dis = value ? "" : "none";
        if(this.options.visible == value)
            return;
        this.options.visible = value;
        
        if (this._popup) {
            this._popup._close();
        }
        if (this._markerTarget) {
            this._markerTarget.style.display = dis;
        }
        if (this._shadow) {
            this._shadow.style.display = dis;
        }
        if (this._label) {
            this._label.style.display = dis;
        }
    },
    
    /**
     * @function
     * @name openDialog
     * @description 打开标注信息提示窗体
     */
    openDialog: function () {
        this._popup.setPosition(this._latlng);
        this._map.openDialog(this._popup);

        return this;
    },

    /**
     * @function
     * @name closeDialog
     * @description 关闭标注信息提示窗体
     */
    closeDialog: function () {
        if (this._popup) {
            this._popup._close();
        }
        return this;
    },

    /**
     * @function
     * @name setDialog
     * @description 设置标注信息提示窗体内容，支持HTML
     * @param {String} content 信息提示窗体的内容
     * @param {L.Popups.Base} dlType 信息提示窗体的类型,默认值为NDialog
     * @param {L.Popups.BaseOptions} options 信息提示窗体属性参数
     */
    setDialog: function (content, dlType, options) {
        options = L.Util.extend({pixelOffset: this.options.popupAnchor}, options);
        dlType = dlType || L.Popups.Base;
        if (!this._popup) {
            this.on('click', this.openDialog, this);
        }

        this._popup = new dlType(options, this);
       
        this._popup.setContent(content);

        return this;
    },

    /**
     * @function
     * @name unsetDialog
     * @description 解除标注与信息提示窗体的绑定
     */
    unsetDialog: function () {
        if (this._popup) {
            this._popup = null;
            this.off('click', this.openDialog);
        }
        return this;
    },

    _popToFront:function () {
        this._poped = true;
        var tmpElem = this._getHoverElem();
        if(!tmpElem)
            return;
        tmpElem.style.zIndex = L.Util.MaxZIndex;
    },
    
    _pushToBack: function () {
        this._poped = false;
        var tmpElem = this._getHoverElem();
        if(!tmpElem)
            return;
        if(!isNaN(this.options.zIndexOffset))
            tmpElem.style.zIndex = this.options.zIndexOffset;
        else
            tmpElem.style.zIndex = "auto";
    },
    
    _getHoverElem:function() {
        return this._markerTarget;
    },
    
    _onMouseOver: function (e) {
        L.DomEvent.stopPropagation(e);
        //if (this.dragging && this.dragging.moved()) { return; }
        if(this.options.popable){
            this._popToFront();
        }
    },
    
    _onMouseOut: function (e) {
        L.DomEvent.stopPropagation(e);
        //if(this.dragging && this.dragging.moved()) { return; }
        if(this.options.popable){
            this._pushToBack();
        }
    },

    _createImg: function (src) {
        var el;
        if (!L.Util.Browser.ie6) {
            el = document.createElement('img');
            el.src = src;
        } else {
            el = document.createElement('div');
            el.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + src + '")';
        }
        return el;
    },
    
    _updateImg: function(){
        if(this._markerTarget){
            var src = this.options.imgUrl;
            if (!L.Util.Browser.ie6) {
                this._markerTarget.src = src;
            } else {
                this._markerTarget.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + src + '")';
            }
        }
    },
    _updateShadowImg: function(){
        if(this._shadow){
            var src = this.options.shadowUrl;
            if (!L.Util.Browser.ie6) {
                this._shadow.src = src;
            } else {
                this._shadow.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + src + '")';
            }
        }
    },
    
    _setMap: function (map) {
        this._map = map;

        this._initMarker();

        map.on('viewreset', this._update, this);
        this._update(true);
        //this._aviodDragDefault(true);
    },

    _aviodDragDefault:function (addTag){
        var tmpElem = this._getDragTarget();
        if(!tmpElem)
            return;
        if(addTag){
            L.DomEvent.addListener(tmpElem, L.Draggable.MOVE, this._unsetDefaultDragEvent, this);
        }
        else{
            L.DomEvent.removeListener(tmpElem, L.Draggable.MOVE, this._unsetDefaultDragEvent, this);
        }
    },
    _unsetDefaultDragEvent:function(e){
        L.DomEvent.stop(e);
    },
    
    _unsetMap: function (map) {
        map = map || this._map;
        this._removeMarker();

        if (this.closeDialog) {
            this.closeDialog();
        }

        
        map.off('viewreset', this._update, this);
        //this._aviodDragDefault(false);
        this._map = null;
    },
    
    getOption: function(option) {
        return this.options[option];
    },
    
    getOptions: function() {
        return this.options;
    },
    
    /**
     * @function
     * @name setOption
     * @description 设置标注样式属性的统一接口，可参考<L.Ols.MarkerOptions>进行选择
     * @param {String} key 标注的样式属性名，可参考<L.Ols.MarkerOptions>中的属性名进行选择
     * @param {Object} value 对应的属性值，可参考<L.Ols.MarkerOptions>属性类型进行设置
     */
    setOption:function(key, value) {
        if(key !== undefined && value !== undefined)
            this.options[key] = value;
        this._updateMarker();
    },

    /**
     * @function
     * @name setImgUrl
     * @description 设置标注背景图片
     * @param {String} 标注背景图片地址
     */
    setImgUrl:function(url){
        this.setOption("imgUrl", url);
    },
    /**
     * @function
     * @name setShadowUrl
     * @description 设置标注阴影图片
     * @param {String} 标注阴影图片地址
     */
    setShadowUrl:function(url){
        this.setOption("shadowUrl", url);
    },
    
    
    getBounds: function () {
        var b = null;
        if(!this._latlng)
            return null;
        return new L.Extent(this._latlng.x, this._latlng.y,this._latlng.x, this._latlng.y);
    },
    
    _createMarkerTarget: function () {
        var src = this.options.imgUrl;
        if (!src) return null;
        var img = this._createImg(src);
        img.className = 'leaflet-marker-img';
        return img;
        
    },
    
    _createShadowImg: function () {
        var src = this.options.shadowUrl;
        if (!src || !src.length) return null;
        var img = this._createImg(src);
        img.className = 'leaflet-marker-shadow';
        return img;
    },
    
    _createLabel: function() {
	
		var maxLen = this.options.labelLineCharCount || 1000;
		var lebelLen = this.options.labelContent.length > maxLen ? maxLen : this.options.labelContent.length;

		var labelContent = "";
		for(var i = 0; i < this.options.labelContent.length;i++){
			if(i % maxLen == 0 && i != 0){
				labelContent +="<br/>";
			}
			labelContent += this.options.labelContent[i];
		}
			
							
        if(labelContent == '') return null;
        var div = document.createElement('div');
        div.innerHTML = labelContent;
        div.className = 'leaflet-marker-label';
        return div;
    },
    
    _initMarker: function () {
        if (!this._markerTarget) {
            this._markerTarget = this._createMarkerTarget();
        }
        if (this.options.assignId) {
            this._markerTarget.id = this.options.assignId;
        }
        if (!this._shadow) {
            this._shadow = this._createShadowImg();
        }
        this._map._panes.markerPane.appendChild(this._markerTarget);
        if (this._shadow) {
            this._map._panes.shadowPane.appendChild(this._shadow);
        }
        if (this.options.labelable && this.options.labelContent != '') {
            if(!this._label)
                this._label = this._createLabel();
            this._map._panes.labelPane.appendChild(this._label);
        }
        if(!isNaN(this.options.zIndexOffset)){
            this._markerTarget.style.zIndex = this.options.zIndexOffset;
        }
        this._initInteraction();
    },
    
    _removeMarker: function () {
        this._map._panes.markerPane.removeChild(this._markerTarget);
        if (this._shadow) {
            this._map._panes.shadowPane.removeChild(this._shadow);
        }
        if (this._label) {
            this._map._panes.labelPane.removeChild(this._label);
        }
        this._markerTarget = this._shadow = null;
    },
    
    _getMoveTarget: function() {
        return this._markerTarget;
    },
    
    _getDragTarget:function () {
        return this._markerTarget;
    },
    
    _onDragUpdate: function (e) {
        if(this._shadow)
            L.Util.setPosition(this._shadow, e.absPixel);
		if(this._label)
			L.Util.setPosition(this._label, e.absPixel);
        this._latlng = e.point;
    },
    
    _updateMarker: function () {
        var size = this.options.markerSize,
            shadowSize = this.options.shadowSize,
            labelSize = this.options.labelSize,
            markerAnchor = this.options.markerAnchor,
            markerTitle = this.options.markerTitle,
            markerZIndex = !isNaN(this.options.zIndexOffset) ? Math.round(this.options.zIndexOffset) : 0;
            shadowAnchor = this.options.shadowAnchor;
            labelAnchor = this.options.labelAnchor;
        if(this._markerTarget){
            this._updateImg();
            this._markerTarget.style.marginLeft = (-markerAnchor.x) + 'px';
            this._markerTarget.style.marginTop = (-markerAnchor.y) + 'px';
            this._markerTarget.style.width = size.x + 'px';
            this._markerTarget.style.height = size.y + 'px';
            this._markerTarget.style.zIndex = markerZIndex;
            this._markerTarget.title = markerTitle ? markerTitle : '';
        }
        if(this._shadow){
            this._updateShadowImg();
            if(shadowAnchor){
                this._shadow.style.marginLeft = (-shadowAnchor.x) + 'px';
                this._shadow.style.marginTop = (-shadowAnchor.y) + 'px';
            }
            if(shadowSize){
                this._shadow.style.width = shadowSize.x + 'px';
                this._shadow.style.height = shadowSize.y + 'px';
            }
        }
        if(this._label){
            if(labelAnchor){
                this._label.style.marginLeft = (-labelAnchor.x) + 'px';
                this._label.style.marginTop = (-labelAnchor.y) + 'px';
            }
            if(labelSize){
                this._label.style.width = labelSize.x + 'px';
                this._label.style.height = labelSize.y + 'px';
            }
            if(this.options.labeClass && this.options.labeClass instanceof Object ){
				var labeClass = this.options.labeClass;
				for(var key in labeClass){
					this._label.style[key] = labeClass[key];
				}
			}
        }
        
    },
    
    _update: function (bMarkerUpdate) {
        if(bMarkerUpdate)
            this._updateMarker();
        var pos = this._map._pointToAbsPixel(this._latlng).round();
        L.Util.setPosition(this._markerTarget, pos);
        if (this._shadow) {
            L.Util.setPosition(this._shadow, pos);
        }
        if (this._label) {
            L.Util.setPosition(this._label, pos);
        }
    },

    _initInteraction: function () {
        if (this.options.clickable) {
            this._markerTarget.className += ' leaflet-clickable';

            L.DomEvent.addListener(this._markerTarget, 'click', this._onMouseClick, this);

            var events = ['dblclick', 'mousedown', 'mouseover', 'mouseout'];
            for (var i = 0; i < events.length; i++) {
                L.DomEvent.addListener(this._markerTarget, events[i], this._fireMouseEvent, this);
            }
			L.DomEvent.addListener(this._markerTarget, 'contextmenu', this._showContextmenu, this);
        }
        
        if(this.options.popable)
            this.enablePop();

        if (this.options.draggable) 
            this.enableDrag();
    },
	_showContextmenu:function(e){
		if(!this._map || this._map.getHegemonTag())
            return;
        this.fire(e.type, {originalEvent: e, marker:this});
        this.fire("rightclick", {originalEvent: e, marker:this});
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
	},

    _onMouseClick: function (e) {
        if(this._map.getHegemonTag())
            return;
        L.DomEvent.stopPropagation(e);
        if (this.dragging && this.dragging.moved()) { return; }
        this.fire(e.type, {originalEvent: e, marker:this});
    },

    _fireMouseEvent: function (e) {
        if(!this._map || this._map.getHegemonTag())
            return;
        this.fire(e.type, e);
        L.DomEvent.stopPropagation(e);
    }
});


/**
 * @class
 * @name L.Ols.MarkerOptions
 * @description 此类表示NMarker构造函数的可选参数。它没有构造函数，但可通过对象字面量形式表示。
 */
L.Ols.MarkerOptions = {
    /**
     * @name imgUrl
     * @type {String} 
     * @description 标注所使用图片的地址
     */
    imgUrl: L.Icon.Default.imagePath + 'marker.png',
    visible: true,
    /**
     * @name shadowUrl
     * @type {String} 
     * @description 标注阴影的图片地址，如果该属性设置为"",则不使用阴影
     */
    shadowUrl: L.Icon.Default.imagePath + 'marker-shadow.png',

    /**
     * @name markerSize
     * @type {L.Loc} 
     * @description 标注大小
     */
    markerSize: new L.Loc(25, 41),
    /**
     * @name shadowSize
     * @type {L.Loc} 
     * @description 标注阴影大小
     */
    shadowSize: new L.Loc(41, 41),
    /**
     * @name labelSize
     * @type {L.Loc} 
     * @description 标注标签大小
     */
    labelSize: new L.Loc(50,50),

    /**
     * @name markerAnchor
     * @type {L.Loc} 
     * @description 标注图片相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    markerAnchor: new L.Loc(13, 41),
    /**
     * @name shadowAnchor
     * @type {L.Loc} 
     * @description 标注阴影相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    shadowAnchor: new L.Loc(13, 41),
    /**
     * @name popupAnchor
     * @type {L.Loc} 
     * @description 标注信息提示框相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    popupAnchor: new L.Loc(0, -33),
    /**
     * @name labelAnchor
     * @type {L.Loc} 
     * @description 标注标签提示框相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    labelAnchor: new L.Loc(0,-33),
    
    /**
     * @name markerTitle
     * @type {String} 
     * @description 标注图片的title属性
     */
    markerTitle: '',

    /**
     * @name assignId
     * @type {String} 
     * @description 标注的ID属性
     */
    assignId: '',
    
    /**
     * @name popable
     * @type {Boolean} 
     * @description 是否允许标注激活时置前显示
     */
    popable:true,
    
    /**
     * @name labelable
     * @type {Boolean} 
     * @description 是否允许标签激活时置前显示
     */
    labelable: false,
    
    /**
     * @name labelContent
     * @type {String} 
     * @description 标注标签的内容属性
     */
    labelContent: '',
    
	labelLineCharCount:6,
    /**
     * @name clickable
     * @type {Boolean} 
     * @description 是否为标注设置点击事件
     */
    clickable: true,
    
    /**
     * @name draggable
     * @type {Boolean} 
     * @description 是否设置标注可拖动
     */
    draggable: false,
    
    labeClass:{
        backgroundColor:'#ffffe1',
        border:'#8c8c8c 1px solid',//'none'
        fontSize:'12px',
        fontFamily:'',
        color:'#4d4d4d'
    },
    zIndexOffset: 0
};

/**
 * @class
 * @name L.Ols.BgMarker
 * @description 标注类，该类采用将多个图标集成形成的大图片作为标注背景图片，通过改变标注图标的大小及标注图标与背景图片左上角的相对位置来显示所需的标注内容
 * @inherit L.Ols.Marker
 */
L.Ols.BgMarker = L.Ols.Marker.extend({
    /**
     * @constructor
     * @name L.Ols.BgMarker
     * @description 标注类的构造函数
     * @param  {L.Loc} position 标注位置
     * @param {L.Ols.BgMarkerOptions} options 参数选项，可使用<L.Ols.BgMarkerOptions>所列举的所有选项参数
     */
    initialize: function (lonlat, options) {
        this.options = L.Util.extend({}, L.Ols.BgMarkerOptions, options);
        this._latlng = lonlat;
    },

    _createMarkerTarget: function () {
        var tmpDiv = L.Util.create('div', 'leaflet-marker-div');
        return tmpDiv;
        
    },
    
    _updateMarker: function () {
        var offset = this.options.imgOffset,
            size = this.options.markerSize,
            shadowSize = this.options.shadowSize,
            labelSize = this.options.labelSize,
            markerAnchor = this.options.markerAnchor,
            markerTitle = this.options.markerTitle,
            markerZIndex = !isNaN(this.options.zIndexOffset) ? Math.round(this.options.zIndexOffset) : 0;
            shadowAnchor = this.options.shadowAnchor;
            labelAnchor = this.options.labelAnchor;
        if(this._markerTarget){
            this._markerTarget.style.marginLeft = (-markerAnchor.x) + 'px';
            this._markerTarget.style.marginTop = (-markerAnchor.y) + 'px';
            this._markerTarget.style.width = size.x + 'px';
            this._markerTarget.style.height = size.y + 'px';
            this._markerTarget.style.backgroundImage = "url(" + this.options.imgUrl +")";
            if(offset){
                this._markerTarget.style.backgroundPosition = (-offset.x)  + "px " + (-offset.y) + "px"; 
            }
            this._markerTarget.style.zIndex = markerZIndex;
            this._markerTarget.title =this.options.markerTitle;
            
        }
        if(this._shadow){
            if(shadowAnchor){
                this._shadow.style.marginLeft = (-shadowAnchor.x) + 'px';
                this._shadow.style.marginTop = (-shadowAnchor.y) + 'px';
            }
            if(shadowSize){
                this._shadow.style.width = shadowSize.x + 'px';
                this._shadow.style.height = shadowSize.y + 'px';
            }
        }
        if(this._label){
            if(labelAnchor){
                this._label.style.marginLeft = (-labelAnchor.x) + 'px';
                this._label.style.marginTop = (-labelAnchor.y) + 'px';
            }
            if(labelSize){
                this._label.style.width = labelSize.x + 'px';
                this._label.style.height = labelSize.y + 'px';
            }
            if(this.options.labeClass && this.options.labeClass instanceof Object ){
				var labeClass = this.options.labeClass;
				for(var key in labeClass){
					this._label.style[key] = labeClass[key];
				}
			}
        }
    }
});

/**
 * @class
 * @name L.Ols.BgMarkerOptions
 * @description 此类表示NSpriteMarker构造函数的可选参数。它没有构造函数，但可通过对象字面量形式表示。
 */
L.Ols.BgMarkerOptions = {
    /**
     * @name imgUrl
     * @type {String} 
     * @description 标注所使用图片的地址
     */
    imgUrl: L.Icon.Default.imagePath + 'spotmkrs.png',
    
    /**
     * @name shadowUrl
     * @type {String} 
     * @description 标注阴影的图片地址，如果该属性设置为"",则不使用阴影
     */
    shadowUrl: '',

    /**
     * @name markerSize
     * @type {L.Loc} 
     * @description 标注大小
     */
    markerSize: new L.Loc(26, 16),
    
    /**
     * @name shadowSize
     * @type {L.Loc} 
     * @description 标注阴影大小
     */
    shadowSize: new L.Loc(27, 18),

    /**
     * @name imgOffset
     * @type {L.Loc} 
     * @description 标注所使用的图标与背景图片左上点的相对偏移量(以像素为单位)
     */
    imgOffset: new L.Loc(164,61),
    visible: true,
    /**
     * @name markerAnchor
     * @type {L.Loc} 
     * @description 标注图片相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    markerAnchor: new L.Loc(13, 8),
    /**
     * @name shadowAnchor
     * @type {L.Loc} 
     * @description 标注阴影相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    shadowAnchor: new L.Loc(9, 18),
    /**
     * @name popupAnchor
     * @type {L.Loc} 
     * @description 标注信息提示框相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    popupAnchor: new L.Loc(0, -8),
    
    /**
     * @name markerTitle
     * @type {String} 
     * @description 标注图片的title属性
     */
    markerTitle: '',
    
    /**
     * @name popable
     * @type {Boolean} 
     * @description 是否允许标注激活时置前显示
     */
    popable:true,
    
    /**
     * @name clickable
     * @type {Boolean} 
     * @description 是否为标注设置点击事件
     */
    clickable: true,
    
    /**
     * @name draggable
     * @type {Boolean} 
     * @description 是否设置标注可拖动
     */
    draggable: false,
    zIndexOffset: 0
};

/**
 * @class
 * @name L.Ols.CoordsImg
 * @description 具有地理范围属性的图片类
 * @inherit L.Ols.Base
 */
L.Ols.CoordsImg = L.Ols.Base.extend({
    includes: L.Mixin.Events,
    
    /**
     * @constructor
     * @name L.Ols.CoordsImg
     * @description 具有地理范围属性的图片类的构造函数
     * @param  {String} url 图片地址
     * @param {L.Extent} bounds 图片对应的矩形地理范围
     */
    initialize: function (url, bounds) {
        this._url = url;
        this._bounds = bounds;
    },
    
	/**
     * @function
     * @name getBounds
     * @description 获取图片对应的矩形地理范围
     * @return {L.Extent} 几图片对应的矩形地理范围
     */
    getBounds: function () {
        if(!this._bounds)
            return null;
        return this._bounds;
    },
    
    _setMap: function (map) {
        this._map = map;
        if (!this._image) {
            this._initMarker();
        }
        map._panes.overlayPane.appendChild(this._image);
        map.on('viewreset', this._update, this);
        this._update();
    },
    
    _unsetMap: function (map) {
        map = map || this._map;
        map._panes.overlayPane.removeChild(this._image);
        map.off('viewreset', this._update, this);
        this._map = null;
    },

    _initMarker: function () {
        this._image = L.Util.create('img', 'leaflet-bound-image');

        this._image.style.visibility = 'hidden';

        L.Util.extend(this._image, {
            galleryimg: 'no',
            onselectstart: L.Util.falseFn,
            onmousemove: L.Util.falseFn,
            onload: L.Util.bind(this._onImageLoad, this),
            src: this._url
        });
    },

    _update: function () {
        if(!this._image) return;
        var image   = this._image,
            topLeft = this._map._pointToAbsPixel(new L.Loc(this._bounds.minX, this._bounds.maxY)),
            size    = this._map._pointToAbsPixel(new L.Loc(this._bounds.maxX, this._bounds.minY)).subtract(topLeft);

        L.Util.setPosition(image, topLeft);

        image.style.width  = size.x + 'px';
        image.style.height = size.y + 'px';
    },

    _onImageLoad: function () {
        this._image.style.visibility = '';
        this.fire('load');
    }
});
/**
 * @class
 * @name L.Ols.FeatureBase
 * @description 几何类基类
 * @inherit L.Ols.Base
 */
L.Ols.FeatureBase = L.Class.extend({
    includes: L.Mixin.Events,
    _type: "L.Ols.FeatureBase",
    statics: {
        CLIP_PADDING: 0.5
    },
	_visible:true,
    options: {
        stroke: true,
        color: '#0033ff',
        weight: 5,
        opacity: 0.5,

        fill: false,
        fillColor: null, //same as color by default
        fillOpacity: 0.2,
        editable:false,
        clickable: true
    },

    /**
     * @constructor
     * @name L.Ols.FeatureBase
     * @description 该类作为几何类的基类，不可直接实例化
     */
    initialize: function (options) {
        L.Util.setOptions(this, options);
    },

    _setMap: function (map) {
        this._map = map;
        this._initElements();
        this._initEvents();
        this.toAbsPixels();
        this._updatePath();

        map
            .on('viewreset', this.toAbsPixels, this)
            .on('moveend', this._updatePath, this);
    },

    _unsetMap: function (map) {
        map = map || this._map;
        this.disableEdit();

        map._pathRoot.removeChild(this._container);

        map
            .off('viewreset', this.toAbsPixels, this)
            .off('moveend', this._updatePath, this);
        this._map = null;
    },

    toAbsPixels: function () {
    },
    
    getType:function(){
		return this._type;
	},
    /**
     * @function
     * @name getMap
     * @description 获取几何对象所在的map对象
     * @return {L.Map} 几何对象所在的map对象
     */
    getMap: function() {
        return this._map || null;
    },
    
	/**
     * @function
     * @name getVisible
     * @description 获取几何对象的可见性
     * @return {Boolean} 几何对象的可见性
     */
    getVisible : function() {
        return this._visible;
    },
    
    /**
     * @function
     * @name setVisible
     * @description 设置几何对象的可见性
     * @param {Boolean} value 几何对象的可见性
     */
	setVisible: function (value) {
		value = value ? true : false;
        if (this._visible === value) {
            return;
        };
        this._visible = value;
		
		var dis = value ? 'block' : 'none';
        if (this._container) {
            this._container.style.display = dis;
        };
        if (this._label) {
            this._label._element.style.display = dis;
        };
    },
    /**
     * @function
     * @name getStyle
     * @description 获取几何对象的表现样式
     * @return {Object} 几何对象的表现样式,格式如： { color : "blue", fontSize : "10px" }
     */
    getStyle: function () {
        var resultObj = {};
        var key, templateObj = this._getStyleObjects();
        if(!templateObj)
            return null;
        for(key in this.options){
                if(templateObj.hasOwnProperty(key)){
                    resultObj[key] = this.options[key];
            }
        }
		return resultObj;
    },

    /**
     * @function
     * @name setStyle
     * @description 设置几何对象的表现样式
     * @param {Object} style 几何对象的表现样式，根据几何对象的类型，该参数可参照<L.Ols.LineOptions>, <L.Ols.PolygonOptions>中表示线样式的属性进行设置
     */
    setStyle: function (style) {
        if(!style)
            return;
        this.options = this.options || {};
        var key, templateObj = this._getStyleObjects();
        if(!templateObj)
            return this;
        for(key in style){
                if(templateObj.hasOwnProperty(key)){
                    this.options[key] = style[key];
                }
        }
        if (this._container) {
            this._updateStyle();
        }

        return this;
    },
    
    /**
     * @function
     * @name getBounds
     * @description 获取几何对象的最小外接矩形坐标范围
     * @return {L.Extent} 几何对象的最小范围,当折线坐标数组为空时，返回 null
     */
    getBounds: function () {
        return null;
    },
    
    /**
     * @function
     * @name redraw
     * @description 重新绘制几何对象
     */
    redraw: function () {
        if (this._map) {
            this.toAbsPixels();
            this._updatePath();
        }
        return this;
    },
    
    _getStyleObjects: function () {
        var fullObj = this._getStyleOptionsClass();
        if(!fullObj)
            return null;
        var resultObj = L.Util.extend({}, fullObj);
        var delItems = ["editable", "clickable", "draggable"];
        var tmpItem;
        for(var i = 0, len = delItems.length; i < len; i++){
            tmpItem = delItems[i];
            if(resultObj.hasOwnProperty(tmpItem)){
                delete resultObj[tmpItem];
            }
        }
        return resultObj;
    },
    _getPathContainer: function () {
       if(this._container)
		return this._container;
    },

    _getStyleOptionsClass: function() {
        return null;
    }
});

L.Ols.FeatureBase.SVG_NS = 'http://www.w3.org/2000/svg';
L.Ols.FeatureBase = L.Ols.FeatureBase.extend({
    statics: {
        SVG: L.Util.Browser.svg
    },

    getPathString: function () {
        // form path string here
    },
	
    _createElement: function (name) {
        return document.createElementNS(L.Ols.FeatureBase.SVG_NS, name);
    },

    _initElements: function () {
        this._map._initPathRoot();
        this._initPath();
        this._initStyle();
    },

    _initPath: function () {
        this._container = this._createElement('g');

        this._path = this._createElement('path');
        this._container.appendChild(this._path);

        this._map._pathRoot.appendChild(this._container);
		
		//针对Google Chrome浏览器
		var value = this.getVisible();
		var dis = value ? 'block' : 'none';
        this._container.style.display = dis;
    },

    _initStyle: function () {
        if (this.options.stroke) {
            this._path.setAttribute('stroke-linejoin', 'round');
            this._path.setAttribute('stroke-linecap', 'round');
        }
        if (this.options.fill) {
            this._path.setAttribute('fill-rule', 'evenodd');
        }
        this._updateStyle();
    },

    _updateStyle: function () {
        if (this.options.stroke) {
            this._path.setAttribute('stroke', this.options.strokeColor);
            this._path.setAttribute('stroke-opacity', this.options.strokeOpacity);
            this._path.setAttribute('stroke-width', this.options.strokeWidth);
            this._path.setAttribute('stroke-dasharray', this._dashStyle(this.options, 1));
        } else {
            this._path.setAttribute('stroke', 'none');
        }
        if (this.options.fill) {
            this._path.setAttribute('fill', this.options.fillColor || this.options.color);
            this._path.setAttribute('fill-opacity', this.options.fillOpacity);
        } else {
            this._path.setAttribute('fill', 'none');
        }
    },

    _dashStyle: function(style, widthFactor) {
        var w = style.strokeWidth * widthFactor;
        var str = style.strokeStyle;
        switch (str) {
            case 'solid':
                return 'none';
            case 'dot':
                return [1, 4 * w].join();
            case 'dash':
                return [4 * w, 4 * w].join();
            case 'dashdot':
                return [4 * w, 4 * w, 1, 4 * w].join();
            case 'longdash':
                return [8 * w, 4 * w].join();
            case 'longdashdot':
                return [8 * w, 4 * w, 1, 4 * w].join();
            default:
                return 'none';
        }
    },
    
    _updatePath: function () {
        var str = this.getPathString();
        if (!str) {
            // fix webkit empty string parsing bug
            str = 'M0 0';
        }
        this._path.setAttribute('d', str);
    },

    // TODO remove duplication with L.Map
    _initEvents: function () {
        if(!this._container)
            return;
        
            if (this._path && !L.Util.Browser.vml) {
                this._path.setAttribute('class', 'leaflet-clickable');
            }

            L.DomEvent.addListener(this._container, 'click', this._onMouseClick, this);

            var events = ['dblclick', 'mousedown', 'mouseover', 'mouseout', 'mousemove', 'contextmenu'];
            for (var i = 0; i < events.length; i++) {
                L.DomEvent.addListener(this._container, events[i], this._fireMouseEvent, this);
            }
            L.DomEvent.addListener(this._container, 'mouseover', this._onMouseOver, this);
            L.DomEvent.addListener(this._container, 'mouseout', this._onMouseOut, this);
            if(this._map)
            this._map.on('click', this.setEditStatus, this);
    },
    
    setEditStatus: function (value) {
        var tag = value === true ? true : false;
        if(this._editHandler){
            if(tag == this._editHandler._enabled){
            }
            else{
                if(tag){
                    this._editHandler.enable();
                    this.fire("selected",{"feature":this});
                }
                else{
                    this._editHandler.disable();
                    this.fire("unselected",{"feature":this});
                }
            //var result = tag ? this._editHandler.enable() : this._editHandler.disable();
            }
        }
    },

    /**
     * @function
     * @name enableEdit
     * @parent L.Ols.FeatureBase
     * @description 激活几何要素的编辑状态
     */
    enableEdit: function () {
        var clss = this._getEditClass();
        if (clss) {
            L.Util.setOptions(this, {editable: true, clickable:true});
            this._initEvents();
            if(!this._editHandler){
                this._editHandler = new clss(this);
            }
            this.fire("editenabled", {"feature":this});
            this.setEditStatus(true);
        }
    },
    
    /**
     * @function
     * @name disableEdit
     * @parent L.Ols.FeatureBase
     * @description 关闭几何要素的编辑状态
     */
    disableEdit: function () {
        L.Util.setOptions(this, {editable: false});
        var clss = this._getEditClass();
        if (clss) {
            this.setEditStatus(false);
        }
        this.fire("editdisabled", {"feature":this});
    },
    
    _getEditClass: function () {
        return null;
    },
    
    _onMouseClick: function (e) {
        if (this._map.checkDraging()) {
            return;
        }
        if(this.options.editable){
            this.enableEdit();
        }

        if (e.type === 'contextmenu') {
            L.DomEvent.preventDefault(e);
        }

        this._fireMouseEvent(e);
    },

    _onMouseOver: function (e) {
        if (L.Util.Browser.vml) 
            L.Util.addClass(this._container, "leaflet-top-zindex");
    },
    
    _onMouseOut: function (e) {
        if (L.Util.Browser.vml) 
            L.Util.removeClass(this._container, "leaflet-top-zindex");
    },
    
    _fireMouseEvent: function (e) {
        if(!this._map || this._map.getHegemonTag())
            return;
        if (!this.has(e.type)) {
            if(e.type == "click" || e.type == "mouseover"){
            if(this.options.editable)
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);
            }
            return;
        }
        // var map = this._map,
            // containerPoint = map.mouseEventToContainerPoint(e),
            // layerPoint = map.containerPointToLayerPoint(containerPoint),
            // latlng = map.layerPointToLatLng(layerPoint);
        var map = this._map,
            pixel = L.DomEvent.getMousePosition(e, map._container),
            absPixel = map._pixelToAbsPixel(pixel),
            point = map.pixelToPoint(pixel);

        this.fire(e.type, {
            point: point,
            absPixel: absPixel,
            pixel: pixel,
            originalEvent: e,
            feature:this
        });

        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
    }
    
    //mouse相关
    /**
     * @event
     * @name click
     * @description 鼠标点击要素时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mousedown
     * @description 鼠标在要素上方按下时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mouseup
     * @description 鼠标在要素上方抬起时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mouseover
     * @description 鼠标移动至要素时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mouseout
     * @description 鼠标移出要素时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name mousemove
     * @description 鼠标在要素上移动时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name dblclick
     * @description 鼠标在要素上双击时会触发此事件
     * @param {L.Loc} pixel 鼠标位置相对地图容器的像素坐标
     * @param {L.Loc} point 鼠标位置在地图上相应的地理坐标
     */
    /**
     * @event
     * @name editenabled
     * @description 要素设置成可编辑之后触发此事件
     * @param {L.Ols.Base} feature 当前要素对象
     */
    /**
     * @event
     * @name editdisabled
     * @description 要素设置成不可编辑之后触发此事件
     * @param {L.Ols.Base} feature 当前要素对象
     */
    /**
     * @event
     * @name selected
     * @description 要素被选中并处于编辑状态之后触发此事件
     * @param {L.Ols.Base} feature 当前要素对象
     */
    /**
     * @event
     * @name unselected
     * @description 要素离开编辑状态之后触发此事件
     * @param {L.Ols.Base} feature 当前要素对象
     */
    /**
     * @event
     * @name edit
     * @description 编辑要素改变坐标位置时触发此事件
     * @param {L.Ols.Base} feature 当前要素对象
     */
});

L.Ols.FeatureBase = L.Util.Browser.svg || !L.Util.Browser.vml ? L.Ols.FeatureBase : L.Ols.FeatureBase.extend({
    statics: {
        VML: true,
        CLIP_PADDING: 0.02
    },

    _createElement: (function () {
        try {
            document.namespaces.add('lvml', 'urn:schemas-microsoft-com:vml');
            return function (name) {
                return document.createElement('<lvml:' + name + ' class="lvml">');
            };
        } catch (e) {
            return function (name) {
                return document.createElement('<' + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
            };
        }
    }()),

    _initPath: function () {
        var container = this._container = this._createElement('shape');
        container.className += ' leaflet-vml-shape' +
                (this.options.clickable ? ' leaflet-clickable' : '');
        container.coordsize = '1 1';

        this._path = this._createElement('path');
        container.appendChild(this._path);

        this._map._pathRoot.appendChild(container);
    },

    _initStyle: function () {
        var container = this._container,
            stroke,
            fill;

        if (this.options.stroke) {
            stroke = this._stroke = this._createElement('stroke');
            stroke.endcap = 'round';
            container.appendChild(stroke);
        }

        if (this.options.fill) {
            fill = this._fill = this._createElement('fill');
            container.appendChild(fill);
        }

        this._updateStyle();
    },

    _updateStyle: function () {
        var stroke = this._stroke,
            fill = this._fill,
            options = this.options,
            container = this._container;

        container.stroked = options.stroke;
        container.filled = options.fill;

        if (options.stroke) {
            stroke.weight  = options.strokeWidth + 'px';
            stroke.color   = options.strokeColor;
            stroke.opacity = options.strokeOpacity;
            stroke.dashstyle = options.strokeStyle;
        }

        if (options.fill) {
            fill.color   = options.fillColor || options.color;
            fill.opacity = options.fillOpacity;
        }
    },

    _updatePath: function () {
        var style = this._container.style;
		
		////针对IE浏览器
		var value = this.getVisible();
		var dis = value ? 'block' : 'none';
        style.display = 'none';
        this._path.v = this.getPathString() + ' '; 
        style.display = dis; //style.display = '';
    }
});

L.Ols.FeatureBase = (L.Ols.FeatureBase.SVG && !window.L_PREFER_CANVAS) || !L.Util.Browser.canvas ? L.Ols.FeatureBase : L.Ols.FeatureBase.extend({
    statics: {
        CANVAS: true,
        SVG: false
    },

    redraw: function () {
        if (this._map) {
            this.toAbsPixels();
            this._requestUpdate();
        }
        return this;
    },
    
    _requestUpdate: function () {
        if (this._map) {
            this._map.fire('moveend');
            if(this._fireMapMoveEndTimer)
                clearTimeout(this._fireMapMoveEndTimer);
            this._fireMapMoveEndTimer = setTimeout(this._fireMapMoveEnd(this._map), 17);
        }
    },
    
    _fireMapMoveEnd: function (that) {
        var map = that;
        return (function(){
            map.fire('moveend');
        });
    },
    
    _unsetMap: function (map) {
        map
            .off('viewreset', this.toAbsPixels, this)
            .off('moveend', this._updatePath, this);

        this._requestUpdate();

        this._map = null;
    },
    
    _initElements: function () {
        this._map._initPathRoot();
        this._ctx = this._map._canvasCtx;
    },

    _updateStyle: function () {
        var options = this.options;

        if (options.stroke) {
            this._ctx.lineWidth = options.strokeWidth;
            this._ctx.strokeStyle = options.strokeColor || options.color;
        }
        if (options.fill) {
            this._ctx.fillStyle = options.fillColor || options.color;
        }
    },

    _drawPath: function () {
        var i, j, len, len2, point, drawMethod;

        this._ctx.beginPath();

        for (i = 0, len = this._parts.length; i < len; i++) {
            for (j = 0, len2 = this._parts[i].length; j < len2; j++) {
                point = this._parts[i][j];
                drawMethod = (j === 0 ? 'move' : 'line') + 'To';

                this._ctx[drawMethod](point.x, point.y);
            }
            
            if (this instanceof L.Ols.Polygon) {
                this._ctx.closePath();
            }
        }
    },

    _checkIfEmpty: function () {
        return !this._parts.length;
    },

    _updatePath: function () {
        if (this._checkIfEmpty()) { return; }

        var ctx = this._ctx,
            options = this.options;

        this._drawPath();
        ctx.save();
        this._updateStyle();

        if (options.fill) {
            if (options.fillOpacity < 1) {
                ctx.globalAlpha = options.fillOpacity;
            }
            ctx.fill();
        }

        if (options.stroke) {
            if (options.strokeOpacity < 1) {
                ctx.globalAlpha = options.strokeOpacity;
            }
            ctx.stroke();
        }

        ctx.restore();

    },

    _initEvents: function () {
        if (this.options.clickable && this._map) {
            this._map.on('click', this._onClick, this);
        }
    },

    _onClick: function (e) {
        if (this._containsPoint(e.absPixel)) {
            this.fire('click', {originalEvent: e, "feature":this});
        }
    },

    onRemove: function (map) {
        map
            .off('viewreset', this.toAbsPixels, this)
            .off('moveend', this._updatePath, this)
            .fire('moveend');
    }
});

L.Ols.FeatureBase.include(!L.Popups.Base ? {} : {
    
    /**
     * @function
     * @name setDialog
     * @parent L.Ols.FeatureBase
     * @description 为几何对象绑定信息对话框
     * @param {String} content 信息对话框的内容
     * @param {L.Popups.Base} dlType 信息提示窗体的类型,默认值为NDialog
     * @param {L.Popups.BaseOptions} options 信息对话框的相关参数
     */
    setDialog: function (content, dlType, options) {
        dlType = dlType || L.Popups.Base;
        if (!this._popup || this._popup.options !== options) {
            this._popup = new dlType(options, this);
        }
        this._popup.setContent(content);

        if (!this._openDialogAdded) {
            this.on('click', this._openDialog, this);
            this._openDialogAdded = true;
        }

        return this;
    },

    /**
     * @function
     * @parent L.Ols.FeatureBase
     * @name unsetDialog
     * @description 解除几何对象与信息对话框的绑定
     */
    unsetDialog: function () {
        if (this._popup) {
            this._popup = null;
            this.off('click', this._openDialog);
            this._openDialogAdded = false;
        }
        return this;
    },
    
    _openDialog: function (e) {
        this._popup.setPosition(e.point);
        this._map.openDialog(this._popup);
    }
});

L.Map.include({
    _updatePathViewport: function () {
        var p = L.Ols.FeatureBase.CLIP_PADDING,
            size = this.getSize(),
            panePos = L.Util.getPosition(this._mapPane),
            min = panePos.multiplyBy(-1)._subtract(size.multiplyBy(p)),
            max = min.add(size.multiplyBy(1 + p * 2));

        this._pathViewport = new L.Extent(min, max);
    }
});

L.Map.include(!L.Util.Browser.svg ? {} : {
    _initPathRoot: function () {
        if (!this._pathRoot) {
            this._pathRoot = L.Ols.FeatureBase.prototype._createElement('svg');
            this._panes.overlayPane.appendChild(this._pathRoot);

            this.on('moveend', this._updateSvgViewport);
            this._updateSvgViewport();
        }
    },

    _updateSvgViewport: function () {
        this._updatePathViewport();

        var vp = this._pathViewport,
            min = new L.Loc(vp.minX, vp.minY),
            max = new L.Loc(vp.maxX, vp.maxY),
            width = max.x - min.x,
            height = max.y - min.y,
            root = this._pathRoot,
            pane = this._panes.overlayPane;

        
        if (L.Util.Browser.webkit) {
            pane.removeChild(root);
        }

        L.Util.setPosition(root, min);
        root.setAttribute('width', width);
        root.setAttribute('height', height);
        root.setAttribute('viewBox', [min.x, min.y, width, height].join(' '));

        if (L.Util.Browser.webkit) {
            pane.appendChild(root);
        }
    }
});

L.Map.include(L.Util.Browser.svg || !L.Util.Browser.vml ? {} : {
    _initPathRoot: function () {
        if (this._pathRoot) { return; }

        var root = this._pathRoot = document.createElement('div');
        root.className = 'leaflet-vml-container';
        this._panes.overlayPane.appendChild(root);

        this.on('moveend', this._updatePathViewport);
        this._updatePathViewport();
    }
});

L.Map.include((L.Ols.FeatureBase.SVG && !window.L_PREFER_CANVAS) || !L.Util.Browser.canvas ? {} : {
    _initPathRoot: function () {
        var root = this._pathRoot,
            ctx;

        if (!root) {
            root = this._pathRoot = document.createElement("canvas");
            root.style.position = 'absolute';
            ctx = this._canvasCtx = root.getContext('2d');

            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            this._panes.overlayPane.appendChild(root);

            this.on('moveend', this._updateCanvasViewport);
            this._updateCanvasViewport();
        }
    },

    _updateCanvasViewport: function () {
        this._updatePathViewport();

        var vp = this._pathViewport,
            min = vp.getLowerPoint(),
            size = vp.getUpperPoint().subtract(min),
            root = this._pathRoot;

        L.Util.setPosition(root, min);
        root.width = size.x;
        root.height = size.y;
        root.getContext('2d').translate(-min.x, -min.y);
    }
});


/**
 * @class
 * @name L.Ols.Line
 * @description 折线类
 * @inherit L.Ols.FeatureBase
 */
L.Ols.Line = L.Ols.FeatureBase.extend({
    _type:"L.Ols.Line",
    options: {
        smoothFactor: 1.0,
        noClip: false
    },
    
    /**
     * @constructor
     * @name L.Ols.Line
     * @description 创建折线类对象
     * @param {Array<L.Loc>} points 构成折线的坐标数组
     * @param {L.Ols.LineOptions} options 折线构造函数的参数选项，参见<L.Ols.LineOptions>
     */
    initialize: function (points, options) {
        this.options = L.Util.extend({}, L.Ols.LineOptions, options);
        //L.Ols.FeatureBase.prototype.initialize.call(this, options);
        this._points = points || [];
    },

    toAbsPixels: function () {
        this._absPixels = [];

        if(this._points)
        for (var i = 0, len = this._points.length; i < len; i++) {
            this._absPixels[i] = this._map._pointToAbsPixel(this._points[i]);
        }
    },

    getPathString: function () {
        for (var i = 0, len = this._parts.length, str = ''; i < len; i++) {
            str += this._getPathPartStr(this._parts[i]);
        }
        return str;
    },

    /**
     * @function
     * @name measureLength
     * @description 长度量算
     * @param {String} 当前投影的计量单位
     * @param {String} 输出该单位下的量算结果，默认米（m）
     * @return {Number} 量算得到的长度结果
     */
    measureLength: function(srcUnits, distUnits) {
        var total = 0;
        if(this._points.length === 0) {
            return total;
        } else {
            var i = 1,
                len = this._points.length,
                temp;
            do {
                temp = L.Util.getDistByUnits(this._points[i-1], this._points[i], srcUnits, distUnits);
                total = temp + total;
                i++;
            } while(i < len);
            return total;
        };
        return total;
    },

    /**
     * @function
     * @name getPoints
     * @description 获取构成折线的坐标数组
     * @return {Array<L.Loc>} 构成折线对象的坐标数组
     */
    getPoints: function () {
        return this._points;
    },

    /**
     * @function
     * @name setPoints
     * @description 设置构成折线的坐标数组
     * @param {Array<L.Loc>} points 构成折线的坐标数组
     */
    setPoints: function (latlngs) {
        this._points = latlngs;
        return this.redraw();
    },

    /**
     * @function
     * @name setPointAt
     * @description 修改指定位置的点坐标
     * @param {Number} index 目标点在线对象坐标数组中的起始索引位置,该参数从0开始计数
     * @param {L.Loc} point 为目标点所要设定的坐标值
     */
    setPointAt: function(index, pos) {
        if(this._points && this._points.length > index && pos && (pos instanceof L.Loc)){
            this._points[index] = pos;
            this.redraw();
        }
    },
    
    /**
     * @function
     * @name addPoint
     * @description 在折线末尾增加一个点
     * @param {L.Loc} point 要增加的点坐标对象
     */
    addPoint: function (latlng) {
        this._points.push(latlng);
        return this.redraw();
    },

    /**
     * @function
     * @name removePoints
     * @description 在折线坐标数组中从[index]位置开始删除[count]个点
     * @param {Number} index 要删除点在线对象坐标数组中的起始索引位置,该参数从0开始计数
     * @param {Number} count 要删除点的个数
     */
    removePoints: function (index, count) {
        var removed = [].splice.apply(this._points, arguments);
        this.redraw();
        return removed;
    },

    closestLayerPoint: function (p) {
        var minDistance = Infinity, parts = this._parts, p1, p2, minPoint = null;

        for (var j = 0, jLen = parts.length; j < jLen; j++) {
            var points = parts[j];
            for (var i = 1, len = points.length; i < len; i++) {
                p1 = points[i - 1];
                p2 = points[i];
                var point = L.Util.LineUtil._sqClosestPointOnSegment(p, p1, p2);
                if (point._sqDist < minDistance) {
                    minDistance = point._sqDist;
                    minPoint = point;
                }
            }
        }
        if (minPoint) {
            minPoint.distance = Math.sqrt(minDistance);
        }
        return minPoint;
    },

    /**
     * @function
     * @name getBounds
     * @description 获取几何对象的最小外接矩形坐标范围
     * @return {L.Extent} 几何对象的最小范围,当折线坐标数组为空时，返回 null
     */
    getBounds: function () {
        var b = null;
        var latLngs = this.getPoints();
        if(!latLngs)
            return null;
        for (var i = 0, len = latLngs.length; i < len; i++) {
            if(i == 0){
                b = new L.Extent(latLngs[0].x, latLngs[0].y,latLngs[0].x, latLngs[0].y);
            }
            b.extend(latLngs[i]);
        }
        return b;
    },

    /**
     * @function
     * @name getStrokeColor
     * @description 获取折线颜色
     * @return {String} 折线颜色
     */
    getStrokeColor: function () {
        return this.options.strokeColor;
    },

    /**
     * @function
     * @name setStrokeColor
     * @description 设置折线颜色
     * @param {String} color 折线颜色的字符串表示形式，如"#FFFFFF"
     */
    setStrokeColor: function (color) {
        this.setStyle({"strokeColor":color});
    },
    
    /**
     * @function
     * @name getStrokeOpacity
     * @description 获取折线透明度
     * @return {Number} 折线透明度
     */
    getStrokeOpacity: function () {
        return this.options.strokeOpacity;
    },

    /**
     * @function
     * @name setStrokeOpacity
     * @description 设置折线透明度
     * @param {Number} opacity 折线透明度，该参数取值范围为[0 - 1]
     */
    setStrokeOpacity: function (opacity) {
        this.setStyle({"strokeOpacity":opacity});
    },

    /**
     * @function
     * @name getStrokeWidth
     * @description 获取折线宽度
     * @return {Number} 折线宽度
     */
    getStrokeWidth: function () {
        return this.options.strokeWidth;
    },

    /**
     * @function
     * @name setStrokeWidth
     * @description 设置折线宽度
     * @param {Number} width 折线宽度
     */
    setStrokeWidth: function (width) {
        this.setStyle({"strokeWidth":width});
    },

    /**
     * @function
     * @name getStrokeStyle
     * @description 获取折线线型
     * @return {String} 折线线型
     */
    getStrokeStyle: function () {
        return this.options.strokeStyle;
    },

    /**
     * @function
     * @name setStrokeStyle
     * @description 设置折线线型
     * @param {String} style 折线线型
     */
    setStrokeStyle: function (style) {
        this.setStyle({"strokeStyle":style});
    },

    _getStyleOptionsClass: function () {
        return L.Ols.LineOptions;
    },
    
    _getEditClass: function () {
        return L.Ols.Line.Edit;
    },
    
    _initEvents: function () {
        L.Ols.FeatureBase.prototype._initEvents.call(this);
    },

    _getPathPartStr: function (points) {
        var round = L.Ols.FeatureBase.VML;

        for (var j = 0, len2 = points.length, str = '', p; j < len2; j++) {
            p = points[j];
            if (round) {
                p._round();
            }
            str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
        }
        return str;
    },

    _clipPoints: function () {
        var points = this._absPixels,
            len = points.length,
            i, k, segment;

        if (this.options.noClip) {
            this._parts = [points];
            return;
        }

        this._parts = [];

        var parts = this._parts,
            vp = this._map._pathViewport,
            lu = L.Util.LineUtil;

        for (i = 0, k = 0; i < len - 1; i++) {
            segment = lu.clipSegment(points[i], points[i + 1], vp, i);
            if (!segment) {
                continue;
            }

            parts[k] = parts[k] || [];
            parts[k].push(segment[0]);

            // if segment goes out of screen, or it's the last one, it's the end of the line part
            if ((segment[1] !== points[i + 1]) || (i === len - 2)) {
                parts[k].push(segment[1]);
                k++;
            }
        }
    },
	
    _simplifyPoints: function () {
        var parts = this._parts,
            lu = L.Util.LineUtil;

        for (var i = 0, len = parts.length; i < len; i++) {
            parts[i] = lu.simplify(parts[i], this.options.smoothFactor);
        }
    },

    setLabel:function(content, _labelOptions){
        if(!this._label)
             this._label = new L.Ols.Label(null, _labelOptions);
        this._label.setContent(content);
        this._updatePath();
    },
    
    _unsetMap: function () {
        if(this._label && this._map){
            this._map.removeOverlays(this._label);
        }
        L.Ols.FeatureBase.prototype._unsetMap.call(this);
    },
    
    _updatePath: function () {
        this._clipPoints();
        this._simplifyPoints();
        //alert(this._parts.length);
        
        L.Ols.FeatureBase.prototype._updatePath.call(this);
        if(this._label && this._map){
        
            if(this._parts[0]){
                var len2 = this._parts[0].length;
                if(len2 >= 2){
                   var rPoiIndex = Math.floor(len2 / 2);
                   var lPoiIndex = rPoiIndex - 1;
                   var tmpLoc = new L.Loc((this._parts[0][lPoiIndex].x + this._parts[0][rPoiIndex].x) / 2, (this._parts[0][lPoiIndex].y + this._parts[0][rPoiIndex].y) / 2);
                   tmpLoc._round();
                   var tmpXY = this._map._absPixelToPoint(tmpLoc);
                   this._label._latlng = tmpXY;
                }
            }
            if(this._map.hasOverlay(this._label))
                this._map.removeOverlays(this._label);
           this._map.addOverlays(this._label);
        }
    }
});

L.Ols.Line.include(!L.Ols.FeatureBase.CANVAS ? {} : {
    _containsPoint: function (p, closed) {
        var i, j, k, len, len2, dist, part,
            w = this.options.strokeWidth / 2;

        if (L.Util.Browser.touch) {
            w += 10; // polyline click tolerance on touch devices
        }

        for (i = 0, len = this._parts.length; i < len; i++) {
            part = this._parts[i];
            for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
                if (!closed && (j === 0)) {
                    continue;
                }

                dist = L.Util.LineUtil.pointToSegmentDistance(p, part[k], part[j]);

                if (dist <= w) {
                    return true;
                }
            }
        }
        return false;
    }
});

/**
 * @class
 * @name L.Ols.LineOptions
 * @description 此类表示NPolyline构造函数的可选参数。它没有构造函数，但可通过对象字面量形式表示。
 */
L.Ols.LineOptions = {
    stroke: true,
    /**
     * @name strokeColor
     * @type {String} 
     * @description 折线颜色，默认值为'#0033ff'
     */
    strokeColor : '#0033ff',
    
    /**
     * @name strokeWidth
     * @type {Number} 
     * @description 折线宽度，默认值为 3
     */
    strokeWidth : 3,
    /**
     * @name strokeOpacity
     * @type {Number} 
     * @description 折线透明度，取值范围为[0 - 1]，默认值为 0.6
     */
    strokeOpacity : 0.6,
    /**
     * @name strokeStyle
     * @type {String} 
     * @description 折线的样式，solid或dash,默认值为 solid
     */
    strokeStyle : "solid",
    
    /**
     * @name editable
     * @type {Boolean} 
     * @description 是否默认激活要素的编辑状态，默认值为 false 
     */
    editable:false,
    clickable: true,
    labelable: false,
    labelAnchor: new L.Loc(8,0),
    labelContent: ''
};


/**
 * @class
 * @name L.Ols.Polygon
 * @description 多边形类
 * @inherit L.Ols.Line
 */
L.Ols.Polygon = L.Ols.Line.extend({
    options: {
        fill: true
    },
    _type:"L.Ols.Polygon",
    /**
     * @constructor
     * @name L.Ols.Polygon
     * @description 创建多边形类对象
     * @param {Array<L.Loc>} points 构成多边形的坐标数组
     * @param {L.Ols.PolygonOptions} options 多边形构造函数的参数选项，参见<L.Ols.PolygonOptions>
     */
    initialize: function (latlngs, options) {
        //L.Ols.Line.prototype.initialize.call(this, latlngs, options);
        this.options = L.Util.extend({}, L.Ols.PolygonOptions, options);
        this._points = latlngs || [];
        if (latlngs && (latlngs[0] instanceof Array)) {
            this._points = latlngs[0];
            this._holes = latlngs.slice(1);
        }
    },

    toAbsPixels: function () {
        L.Ols.Line.prototype.toAbsPixels.call(this);

        this._holePoints = [];

        if (!this._holes) {
            return;
        }

        for (var i = 0, len = this._holes.length, hole; i < len; i++) {
            this._holePoints[i] = [];

            for (var j = 0, len2 = this._holes[i].length; j < len2; j++) {
                this._holePoints[i][j] = this._map._pointToAbsPixel(this._holes[i][j]);
            }
        }
    },

    /**
     * @function
     * @name measureArea
     * @description 多边形面积量算
     * @param {String} 当前投影的计量单位
     * @param {String} 输出该单位下的量算结果，默认平方千米（Km*Km）
     * @return {Number} 量算得到的面积结果
     */
    measureArea:function(srcUnits, distUnits) {
        var unit = srcUnits;
		if(!srcUnits && this._map)
			unit = this._map.getUnits();
        var len = L.Util.getAreaByUnits(this._points, unit, distUnits);
        return len;
    },
 
    /**
     * @function
     * @name getStrokeColor
     * @description 获取边线颜色
     * @return {String} 边线颜色
     */
    getStrokeColor: function () {
        return this.options.strokeColor;
    },

    /**
     * @function
     * @name setStrokeColor
     * @description 设置边线颜色
     * @param {String} color 边线颜色的字符串表示形式，如"#FFFFFF"
     */
    setStrokeColor: function (color) {
        this.setStyle({"strokeColor":color});
    },
    
    /**
     * @function
     * @name getStrokeOpacity
     * @description 获取边线透明度
     * @return {Number} 边线透明度
     */
    getStrokeOpacity: function () {
        return this.options.strokeOpacity;
    },

    /**
     * @function
     * @name setStrokeOpacity
     * @description 设置边线透明度
     * @param {Number} opacity 边线透明度，该参数取值范围为[0 - 1]
     */
    setStrokeOpacity: function (opacity) {
        this.setStyle({"strokeOpacity":opacity});
    },

    /**
     * @function
     * @name getStrokeWidth
     * @description 获取边线宽度
     * @return {Number} 边线宽度
     */
    getStrokeWidth: function () {
        return this.options.strokeWidth;
    },

    /**
     * @function
     * @name setStrokeWidth
     * @description 设置边线宽度
     * @param {Number} width 边线宽度
     */
    setStrokeWidth: function (width) {
        this.setStyle({"strokeWidth":width});
    },

    /**
     * @function
     * @name getStrokeStyle
     * @description 获取边线线型
     * @return {String} 边线线型
     */
    getStrokeStyle: function () {
        return this.options.strokeStyle;
    },

    /**
     * @function
     * @name setStrokeStyle
     * @description 设置边线线型
     * @param {String} style 边线线型
     */
    setStrokeStyle: function (style) {
        this.setStyle({"strokeStyle":style});
    },
 
    /**
     * @function
     * @name getFillColor
     * @description 获取填充颜色
     * @return {String} 填充颜色
     */
    getFillColor: function () {
        return this.options.fillColor;
    },

    /**
     * @function
     * @name setStrokeColor
     * @description 设置填充颜色
     * @param {String} color 填充颜色的字符串表示形式，如"#FFFFFF"
     */
    setFillColor: function (color) {
        this.setStyle({"fillColor":color});
    },
    
    /**
     * @function
     * @name getFillOpacity
     * @description 获取填充透明度
     * @return {Number} 填充透明度
     */
    getFillOpacity: function () {
        return this.options.fillOpacity;
    },

    /**
     * @function
     * @name setFillOpacity
     * @description 设置填充透明度
     * @param {Number} opacity 填充透明度，该参数取值范围为[0 - 1]
     */
    setFillOpacity: function (opacity) {
        this.setStyle({"fillOpacity":opacity});
    },

    _clipPoints: function () {
        var points = this._absPixels,
            newParts = [];

        this._parts = [points].concat(this._holePoints);

        if (this.options.noClip) {
            return;
        }
        
        for (var i = 0, len = this._parts.length; i < len; i++) {
            var clipped = L.Util.PolyUtil.clipPolygon(this._parts[i], this._map._pathViewport);
            if (!clipped.length) {
                continue;
            }
            newParts.push(clipped);
        }

        this._parts = newParts;
    },

    _getEditClass: function () {
        return L.Ols.Polygon.Edit;
    },
    
    _getStyleOptionsClass: function () {
        return L.Ols.PolygonOptions;
    },
    
    _getPathPartStr: function (points) {
        var str = L.Ols.Line.prototype._getPathPartStr.call(this, points);
        return str + (L.Util.Browser.svg ? 'z' : 'x');
    }
});
L.Ols.Polygon.include(!L.Ols.FeatureBase.CANVAS ? {} : {
    contains:function (p) {
        return this._containsPoint(p);
    },
    _containsPoint: function (p) {
        var inside = false,
            part, p1, p2,
            i, j, k,
            len, len2;

        if (L.Ols.Line.prototype._containsPoint.call(this, p, true)) {
            return true;
        }

        for (i = 0, len = this._parts.length; i < len; i++) {
            part = this._parts[i];

            for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
                p1 = part[j];
                p2 = part[k];

                if (((p1.y > p.y) !== (p2.y > p.y)) &&
                        (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
                    inside = !inside;
                }
            }
        }

        return inside;
    }
});

/**
 * @class
 * @name L.Ols.PolygonOptions
 * @description 此类表示NPolygon构造函数的可选参数。它没有构造函数，但可通过对象字面量形式表示。
 */
L.Ols.PolygonOptions = {

    /**
     * @name stroke
     * @type {Boolean} 
     * @description 标识是否使用边线,默认值为 true
     */
    stroke: true,
    
    /**
     * @name fill
     * @type {Boolean} 
     * @description 标识是否使用填充,默认值为 true
     */
    fill: true,
    
    /**
     * @name strokeColor
     * @type {String} 
     * @description 边线颜色，默认值为'#0033ff'
     */
    strokeColor : '#0033ff',
    
    /**
     * @name strokeWidth
     * @type {Number} 
     * @description 边线宽度，默认值为 3
     */
    strokeWidth : 3,
    /**
     * @name strokeOpacity
     * @type {Number} 
     * @description 边线透明度，取值范围为[0 - 1]，默认值为 0.6
     */
    strokeOpacity : 0.6,
    /**
     * @name strokeStyle
     * @type {String} 
     * @description 边线的样式，solid或dash,默认值为 solid
     */
    strokeStyle : "solid",
    
    /**
     * @name fillColor
     * @type {String} 
     * @description 填充颜色，默认值为'#0033ff'
     */
    fillColor : '#0033ff',
    
    /**
     * @name fillOpacity
     * @type {Number} 
     * @description 填充透明度，该参数取值范围为[0 - 1]， 默认值为0.5
     */
    fillOpacity : 0.5,
    
    /**
     * @name editable
     * @type {Boolean} 
     * @description 是否默认激活要素的编辑状态，默认值为 false 
     */
    editable:false,
    clickable: true
};

/**
 * @class
 * @name L.Ols.Rect
 * @description 矩形
 * @inherit L.Ols.Polygon
 */
L.Ols.Rect = L.Ols.Polygon.extend({
    /**
     * @constructor
     * @name L.Ols.Rect
     * @description 创建矩形类对象
     * @param {L.Extent} bounds 矩形的坐标范围
     * @param {L.Ols.PolygonOptions} options 矩形构造函数的参数选项，参见<L.Ols.PolygonOptions>
     */
    initialize: function (latLngBounds, options) {
        this._bounds = latLngBounds;
        L.Ols.Polygon.prototype.initialize.call(this, this._boundsToPoints(this._bounds), options);
    },

    /**
     * @function
     * @name setBounds
     * @description 设置矩形对象的范围
     * @param {L.Extent} bounds 矩形对象所表示的范围
     */
    setBounds: function (latLngBounds) {
        this._bounds = latLngBounds;
        //this.toAbsPixels(this._boundsToPoints(latLngBounds));
        this.setPoints(this._boundsToPoints(latLngBounds));
    },
    
    _getEditClass: function () {
        return L.Ols.Rect.Edit;
    },
    _boundsToPoints: function (latLngBounds) {
        latLngBounds  = latLngBounds || this.getBounds();
        if(!latLngBounds){
            return null;
        }
        return [
            new L.Loc(latLngBounds.minX, latLngBounds.minY),
            new L.Loc(latLngBounds.minX, latLngBounds.maxY),
            new L.Loc(latLngBounds.maxX, latLngBounds.maxY),
            new L.Loc(latLngBounds.maxX, latLngBounds.minY)
        ];
    }
});


/**
 * @class
 * @name L.Ols.Circle
 * @description 圆形
 * @inherit L.Ols.FeatureBase
 */
L.Ols.Circle = L.Ols.FeatureBase.extend({

    options: {
        fill: true
    },
    _type:"L.Ols.Circle",
    /**
     * @constructor
     * @name L.Ols.Circle
     * @description 创建圆形类对象
     * @param {L.Loc} center 圆形中心点坐标
     * @param {Number} radius 圆形半径，以米为单位
     * @param {L.Ols.PolygonOptions} options 圆形构造函数的参数选项，参见<L.Ols.PolygonOptions>
     */
    initialize: function (latlng, radius, options) {
        this.options = L.Util.extend({}, L.Ols.PolygonOptions, options);
        this._latlng = latlng;
        this._mRadius = radius;
    },

    /**
     * @function
     * @name measureArea
     * @description 圆形面积量算
     * @return {Number} 量算得到的面积结果，单位平方米
     */
    measureArea: function() {
        var area = Math.PI * this._mRadius * this._mRadius;
        return area;
    },

    /**
     * @function
     * @name getPosition
     * @description 获取圆形对象中心点坐标
     * @return {L.Loc} 中心点坐标
     */
    getPosition: function () {
        return this._latlng;
    },
    
    /**
     * @function
     * @name setPosition
     * @description 设置圆形对象中心点坐标
     * @param {L.Loc} center 中心点坐标
     */
    setPosition: function (latlng) {
        this._latlng = latlng;
        return this.redraw();
    },
    
    /**
     * @function
     * @name getRadius
     * @description 获取圆形对象半径
     * @param {String} units 指定所得圆形半径所采用的计量单位，该参数为可选参数，默认值为"m"
     * @return {Number} 圆形对象半径
     */
    getRadius: function (units) {
        return units ? this._mRadius : this._getFitRadius(units);
    },

    /**
     * @function
     * @name setRadius
     * @description 设置圆形对象半径
     * @param {Number} radius 指定的半径值
     * @param {String} units 指定的半径值所采用的计量单位，该参数为可选参数，默认值为"m"
     */
    setRadius: function (radius, units) {
        if(!radius) return;
        this._mRadius = radius;
        if(units && units !== 'm' && L.Util.INCHES_PER_UNIT[units])
            this._mRadius = this._mRadius * L.Util.INCHES_PER_UNIT[units] / L.Util.INCHES_PER_UNIT['m'];
        return this.redraw();
    },

     
    /**
     * @function
     * @name getStrokeColor
     * @description 获取边线颜色
     * @return {String} 边线颜色
     */
    getStrokeColor: function () {
        return this.options.strokeColor;
    },

    /**
     * @function
     * @name setStrokeColor
     * @description 设置边线颜色
     * @param {String} color 边线颜色的字符串表示形式，如"#FFFFFF"
     */
    setStrokeColor: function (color) {
        this.setStyle({"strokeColor":color});
    },
    
    /**
     * @function
     * @name getStrokeOpacity
     * @description 获取边线透明度
     * @return {Number} 边线透明度
     */
    getStrokeOpacity: function () {
        return this.options.strokeOpacity;
    },

    /**
     * @function
     * @name setStrokeOpacity
     * @description 设置边线透明度
     * @param {Number} opacity 边线透明度，该参数取值范围为[0 - 1]
     */
    setStrokeOpacity: function (opacity) {
        this.setStyle({"strokeOpacity":opacity});
    },

    /**
     * @function
     * @name getStrokeWidth
     * @description 获取边线宽度
     * @return {Number} 边线宽度
     */
    getStrokeWidth: function () {
        return this.options.strokeWidth;
    },

    /**
     * @function
     * @name setStrokeWidth
     * @description 设置边线宽度
     * @param {Number} width 边线宽度
     */
    setStrokeWidth: function (width) {
        this.setStyle({"strokeWidth":width});
    },

    /**
     * @function
     * @name getStrokeStyle
     * @description 获取边线线型
     * @return {String} 边线线型
     */
    getStrokeStyle: function () {
        return this.options.strokeStyle;
    },

    /**
     * @function
     * @name setStrokeStyle
     * @description 设置边线线型
     * @param {String} style 边线线型
     */
    setStrokeStyle: function (style) {
        this.setStyle({"strokeStyle":style});
    },
 
    /**
     * @function
     * @name getFillColor
     * @description 获取填充颜色
     * @return {String} 填充颜色
     */
    getFillColor: function () {
        return this.options.fillColor;
    },

    /**
     * @function
     * @name setFillColor
     * @description 设置填充颜色
     * @param {String} color 填充颜色的字符串表示形式，如"#FFFFFF"
     */
    setFillColor: function (color) {
        this.setStyle({"fillColor":color});
    },
    
    /**
     * @function
     * @name getFillOpacity
     * @description 获取填充透明度
     * @return {Number} 填充透明度
     */
    getFillOpacity: function () {
        return this.options.fillOpacity;
    },

    /**
     * @function
     * @name setFillOpacity
     * @description 设置填充透明度
     * @param {Number} opacity 填充透明度，该参数取值范围为[0 - 1]
     */
    setFillOpacity: function (opacity) {
        this.setStyle({"fillOpacity":opacity});
    },

    toAbsPixels: function () {
        var lngRadius = this._getFitRadius(),
            latlng2 = new L.Loc(this._latlng.x, this._latlng.y - lngRadius),
            point2 = this._map._pointToAbsPixel(latlng2);

        this._point = this._map._pointToAbsPixel(this._latlng);
        this._radius = Math.round(Math.abs(this._point.y - point2.y));
    },

    getBounds: function () {
        var lngRadius = this._getFitRadius();
        return new L.Extent(this._latlng.x - lngRadius, this._latlng.y - lngRadius, this._latlng.x + lngRadius, this._latlng.y + lngRadius);
    },

    getPathString: function () {
        var p = this._point,
            r = this._radius;
        if (this._checkIfEmpty()) {
            return '';
        }

        if (L.Util.Browser.svg) {
            return "M" + p.x + "," + (p.y - r) +
                    "A" + r + "," + r + ",0,1,1," +
                    (p.x - 0.1) + "," + (p.y - r) + " z";
        } else {
            p._round();
            r = Math.round(r);
            return "AL " + p.x + "," + p.y + " " + r + "," + r + " 0," + (65535 * 360);
        }
    },

    _getStyleOptionsClass: function () {
        return L.Ols.PolygonOptions;
    },
    
    _getFitRadius: function (units) {
        if(!this._map)
            return this._mRadius;
        units = units || this._map.getUnits();
        var radius = this._mRadius;
        return radius * L.Util.INCHES_PER_UNIT['m'] / L.Util.INCHES_PER_UNIT[units];
    },

    _checkIfEmpty: function () {
        var vp = this._map._pathViewport,
            r = this._radius,
            p = this._point;

        return p.x - r > vp.maxX || p.y - r > vp.maxY ||
            p.x + r < vp.minX || p.y + r < vp.minY;
    },
    
    _getEditClass: function () {
        return L.Ols.Circle.Edit;
    }
});
L.Ols.Circle.include(!L.Ols.FeatureBase.CANVAS ? {} : {
    _drawPath: function () {
        var p = this._point;
        this._ctx.beginPath();
        this._ctx.arc(p.x, p.y, this._radius, 0, Math.PI * 2, false);
    },

    _containsPoint: function (p) {
        var center = this._point,
            w2 = this.options.stroke ? this.options.strokeWidth / 2 : 0;

        return (p.distanceTo(center) <= this._radius + w2);
    }
});


L.Ols.Point = L.Ols.Circle.extend({
    options: {
        radius: 5,
        strokeWidth: 2
    },
    _type:"L.Ols.Point",
    /**
     * @constructor
     * @name L.Ols.Point
     * @description 创建点对象
     * @param {L.Loc} position 点坐标
     * @param {L.Ols.PolygonOptions} options 点构造函数的参数选项，参见<L.Ols.PolygonOptions>
     */
    initialize: function (latlng, options) {
        this.options = L.Util.extend(this.options, L.Ols.PolygonOptions, options);
        this._radius = this.options.radius;
        L.Ols.Circle.prototype.initialize.call(this, latlng, 0, options);
    },

    toAbsPixels: function () {
        this._point = this._map._pointToAbsPixel(this._latlng);
    },

    /**
     * @function
     * @name getRadius
     * @description 获取点对象的半径
     * @return {Number} 点对象半径值，该值以像素为单位
     */
    getRadius: function () {
        return this._radius;
    },
    
    /**
     * @function
     * @name setRadius
     * @description 设置点对象半径
     * @param {Number} radius 指定的点对象半径值，该值必须以像素为单位
     */
    setRadius: function (radius) {
        this._radius = radius;
        return this.redraw();
    },
    
    _getEditClass: function () {
        return L.Ols.Point.Edit;
    }
});

L.Ols.Spot = L.Class.extend({
    options:{
        text:'这里是标注信息',
        buffer:5,
        minRes:null,
        maxRes:null,
        data: null,
		
		img:{
			imgUrl:L.Icon.Default.imagePath +"pock.png",
			offset:new L.Loc(5, 5),
			size:new L.Loc(12, 12)
		},
		marker: {
			imgUrl:L.Icon.Default.imagePath +"pock.png",
			markerAnchor:new L.Loc(5, 5),
			markerSize:new L.Loc(12, 12)
		},
		label:{
			content:'',
			offset: new L.Loc(10, 10),
			popable:false,
			zIndexOffset: 65535,
			clickable: false,
			draggable: false
		},
		imgable:true,
		labelable:true,
		popupAnchor:new L.Loc(0, 5)
    },
	
    initialize: function (lonlat, options) {
        this._latlng = lonlat;
		//L.Util.setOptions(this, options,true);
		this._options = {};
		for(var key in options){
			if(key == 'img' || key == 'label' || key == 'marker'){
				if(options.hasOwnProperty(key)){
					this._options[key] =  L.Util.extend({}, this.options[key],options[key]);
				}
			}else
				this._options[key] = options[key];
		}
		this._options =  L.Util.extend({}, this.options,this._options);
    },
    getBounds: function () {
        var b = null;
        if(!this._latlng)
            return null;
        return new L.Extent(this._latlng.x, this._latlng.y,this._latlng.x, this._latlng.y);
    },
    
    getText: function () {
        return this.options.text;
    },
    
    setText: function (value) {
        this.options.text = value;
    },
    
    getPosition: function () {
        return this._latlng;
    },
    
    checkValid: function (poi, res) {
        var lonLatBounds = this._getPointBounds(res);
        return lonLatBounds.contains(poi);
    },
    
    _getPointBounds: function (res) {
        if(typeof(this.options.buffer) == "number"){
            var buffX = this.buffer * res;
            return new L.Extent(this._latlng.x - buffX, this._latlng.y - buffX, this._latlng.x + buffX, this._latlng.y + buffX);
        }
        else
            return new L.Extent(this._latlng.x - this.buffer.minX * res, this._latlng.y - this.buffer.minY * res, this._latlng.x + this.buffer.maxX * res, this._latlng.y +  this.buffer.maxY * res);
            //return this.options.buffer;
    },
    
    _getWidth: function (res) {
        return this.buffer.getWidth() * res;
    },
    
    _getHeight: function (res) {
        return this.buffer.getHeight() * res;
    },

    setPosition: function (latlng) {
        this._latlng = latlng;
        //this._update();
    },

    setData: function (data) {
        this.data = data
    },
    
    getData: function (data) {
        return this.data
    },
	_setMap: function (map) {
        this._map = map;
    },
	setDialog: function (content, dlType, options) {
        options = L.Util.extend({pixelOffset: this.options.popupAnchor}, options);
        dlType = dlType || L.Popups.Base;
		this._popup = new dlType(options, this);
		
		if(!this._popup._map && !this._popup._opened){ //若this._popup._opened ==true 表示此popup存在，只是被隐藏了
			this._popup.setPosition(this._latlng);
			this._popup.setContent(content);
			this._map.setSingleDialog(this._popup);
		}
		this._map.openSingleDialog(this._popup);
        return this;
    }
});

L.HandlerBase = L.Class.extend({
    includes: L.Mixin.Events,
    initialize: function (map) {
        this._map = map;
    },

    enable: function () {
        if (this._enabled) {
            return;
        }
        this._enabled = true;
        this.addHooks();
    },

    disable: function () {
        if (!this._enabled) {
            return;
        }
        this._enabled = false;
        this.removeHooks();
    },

    enabled: function () {
        return !!this._enabled;
    }
    
});

L.Draggable = L.Class.extend({
    includes: L.Mixin.Events,

    statics: {
        START: L.Util.Browser.touch ? 'touchstart' : 'mousedown',
        END: L.Util.Browser.touch ? 'touchend' : 'mouseup',
        MOVE: L.Util.Browser.touch ? 'touchmove' : 'mousemove',
        TAP_TOLERANCE: 15
    },

    initialize: function (element, dragStartTarget) {
        this._element = element;
        this._dragStartTarget = dragStartTarget || element;
    },

    enable: function () {
        if (this._enabled) {
            return;
        }
        L.DomEvent.addListener(this._dragStartTarget, L.Draggable.START, this._onDown, this);
       // L.DomEvent.addListener(document, "click", this._onClick, this);
        L.DomEvent.addListener(this._dragStartTarget, "click", this._onClick, this);
        this._enabled = true;
    },

    disable: function () {
        if (!this._enabled) {
            return;
        }
        L.DomEvent.removeListener(this._dragStartTarget, L.Draggable.START, this._onDown);
       // L.DomEvent.removeListener(document, "click", this._onClick, this);
        L.DomEvent.removeListener(this._dragStartTarget, "click", this._onClick, this);
        this._enabled = false;
        this._moved = false;
    },

    _onDown: function (e) {
        if ((!L.Util.Browser.touch && e.shiftKey) || ((e.which !== 1) && (e.button !== 1) && !e.touches)) {
            return;
        }

        this._simulateClick = true;
        if (e.touches && e.touches.length > 1) {
            this._simulateClick = false;
            return;
        }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
            el = first.target;

        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);

        if (L.Util.Browser.touch && el.tagName.toLowerCase() === 'a') {
            el.className += ' leaflet-active';
        }
        this.fire('predragstart', {pixel: L.DomEvent.getMousePosition(e, el)});

        this._moved = false;
        if (this._moving) {
            return;
        }

        if (!L.Util.Browser.touch) {
            L.Util.disableTextSelection();
            this._setMovingCursor();
        }

        this._startPos = this._newPos = L.Util.getPosition(this._element);
        this._startPoint = new L.Loc(first.clientX, first.clientY);

        L.DomEvent.addListener(document, L.Draggable.MOVE, this._onMove, this);
        L.DomEvent.addListener(document, L.Draggable.END, this._onUp, this);

    },
    _onClick: function (e) { 
        // if(this._moved)
            // this._moved = false;
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
    },
    
    _onMove: function (e) {
        if (e.touches && e.touches.length > 1) {
            return;
        }
        L.DomEvent.preventDefault(e);

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);

        if (!this._moved && (first && this._startPoint && ((first.clientX != this._startPoint.x) || (first.clientY != this._startPoint.y)))) {
            this.fire('dragstart', {pixel: L.Util.getPosition(this._element)});
            this._moved = true;
        }
        this._moving = true;

        var newPoint = new L.Loc(first.clientX, first.clientY);
        this._newPos = this._startPos.add(newPoint).subtract(this._startPoint);
        
        this._updatePosition();

        L.DomEvent.stopPropagation(e);
    },

    _updatePosition: function () {
        this.fire('predrag', {pixel: L.Util.getPosition(this._element)});
        L.Util.setPosition(this._element, this._newPos);
        this.fire('drag', {pixel: this._newPos});
    },

    _onUp: function (e) {
        if (this._simulateClick && e.changedTouches) {
            var first = e.changedTouches[0],
                el = first.target,
                dist = (this._newPos && this._newPos.distanceTo(this._startPos)) || 0;

            if (el.tagName.toLowerCase() === 'a') {
                el.className = el.className.replace(' leaflet-active', '');
            }

            if (dist < L.Draggable.TAP_TOLERANCE) {
                this._simulateEvent('click', first);
            }
        }

        if (!L.Util.Browser.touch) {
            L.Util.enableTextSelection();
            this._restoreCursor();
        }

        L.DomEvent.removeListener(document, L.Draggable.MOVE, this._onMove, this);
        L.DomEvent.removeListener(document, L.Draggable.END, this._onUp,this);
        

        if (this._moved) {
            this.fire('dragend', {pixel:L.Util.getPosition(this._element)});
        }
        this._moving = false;
        //this._moved = false;
        //L.DomEvent.stopPropagation(e);
        
    },

    _setMovingCursor: function () {
        document.body.className += ' leaflet-dragging';
    },

    _restoreCursor: function () {
        document.body.className = document.body.className.replace(/ leaflet-dragging/g, '');
    },

    _simulateEvent: function (type, e) {
        var simulatedEvent = document.createEvent('MouseEvents');

        simulatedEvent.initMouseEvent(
                type, true, true, window, 1,
                e.screenX, e.screenY,
                e.clientX, e.clientY,
                false, false, false, false, 0, null);

        e.target.dispatchEvent(simulatedEvent);
    }
});


L.Map.Drag = L.HandlerBase.extend({
    _gragTag :false,
    _element:null,
    _dragStartTarget:null,
    
    addHooks: function () {
        if (!this._draggable) {
            this._element = this._map._mapPane;
            this._dragStartTarget = this._map._container;
            
            this.on('dragstart', this._onDragStart, this)
                .on('predragstart', this._onDragStart, this)
                .on('drag', this._onDrag, this)
                .on('dragend', this._onDragEnd, this);
            this._draggable = true;
        }

        if (this._dragenabled) {
            return;
        }

        if(this._draggable){
            L.DomEvent.addListener(this._dragStartTarget, L.Draggable.START, this._onDown, this);
            // L.DomEvent.addListener(document, "click", this._onClick, this);
            L.DomEvent.addListener(this._dragStartTarget, "click", this._onClick, this);
            this._dragenabled = true;
        }
    },

    removeHooks: function () {
        if (!this._dragenabled) {
            return;
        }
        L.DomEvent.removeListener(this._dragStartTarget, L.Draggable.START, this._onDown);
        // L.DomEvent.removeListener(document, "click", this._onClick, this);
        L.DomEvent.removeListener(this._dragStartTarget, "click", this._onClick, this);
        this._dragenabled = false;
        this._moved = false;
    },

    _onDown: function (e) {
        if (this._map._getAnimatingZoom()){
            this._gragTag = false;
            L.DomEvent.stop(e);
            
            return;
        }
        if ((!L.Util.Browser.touch && e.shiftKey) || ((e.which !== 1) && (e.button !== 1) && !e.touches)) {
            return;
        }

        this._simulateClick = true;
        if (e.touches && e.touches.length > 1) {
            this._simulateClick = false;
            return;
        }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
            el = first.target;

        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);

        if (L.Util.Browser.touch && el.tagName.toLowerCase() === 'a') {
            el.className += ' leaflet-active';
        }
        this.fire('predragstart', {pixel: L.DomEvent.getMousePosition(e, el)});

        this._moved = false;
        if (this._moving) {
            return;
        }

        if (!L.Util.Browser.touch) {
            L.Util.disableTextSelection();
            this._setMovingCursor();
        }

        this._startPos = this._newPos = L.Util.getPosition(this._element);
        this._startPoint = new L.Loc(first.clientX, first.clientY);

        L.DomEvent.addListener(document, L.Draggable.MOVE, this._onMove, this);
        L.DomEvent.addListener(document, L.Draggable.END, this._onUp, this);

    },
    
    _onClick: function (e) {
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
    },
    
    _onMove: function (e) {
        if (e.touches && e.touches.length > 1) {
            return;
        }
        //L.DomEvent.preventDefault(e);

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);

        if (!this._moved && (first && this._startPoint && ((first.clientX != this._startPoint.x) || (first.clientY != this._startPoint.y)))) {
            this.fire('dragstart', {pixel: L.Util.getPosition(this._element)});
            this._moved = true;
        }
        this._moving = true;

        // if(!this._map._checkAllLayersFilledTag()){
            // return;
        // }
        
        
        var newPoint = new L.Loc(first.clientX, first.clientY);
        this._newPos = this._startPos.add(newPoint).subtract(this._startPoint);
        
        this._updatePosition();
        L.DomEvent.stopPropagation(e);
    },

    _updatePosition: function () {
        this.fire('predrag', {pixel: L.Util.getPosition(this._element)});
        L.Util.setPosition(this._element, this._newPos);
        this.fire('drag', {pixel: this._newPos});
    },

    _onUp: function (e) {
        if (this._simulateClick && e.changedTouches) {
            var first = e.changedTouches[0],
                el = first.target,
                dist = (this._newPos && this._newPos.distanceTo(this._startPos)) || 0;

            if (el.tagName.toLowerCase() === 'a') {
                el.className = el.className.replace(' leaflet-active', '');
            }

            if (dist < L.Draggable.TAP_TOLERANCE) {
                this._simulateEvent('click', first);
            }
        }

        if (!L.Util.Browser.touch) {
            L.Util.enableTextSelection();
            this._restoreCursor();
        }

        L.DomEvent.removeListener(document, L.Draggable.MOVE, this._onMove, this);
        L.DomEvent.removeListener(document, L.Draggable.END, this._onUp,this);
        

        if (this._moved) {
            this.fire('dragend', {pixel:L.Util.getPosition(this._element)});
        }
        this._moving = false;
        //L.DomEvent.stopPropagation(e);
        
    },

    moved: function () {
        return this._moved;
    },
    
    _setMovingCursor: function () {
        document.body.className += ' leaflet-dragging';
    },

    _restoreCursor: function () {
        document.body.className = document.body.className.replace(/ leaflet-dragging/g, '');
    },

    _simulateEvent: function (type, e) {
        var simulatedEvent = document.createEvent('MouseEvents');

        simulatedEvent.initMouseEvent(
                type, true, true, window, 1,
                e.screenX, e.screenY,
                e.clientX, e.clientY,
                false, false, false, false, 0, null);

        e.target.dispatchEvent(simulatedEvent);
    },
    
    _onDragStart: function () {
        if (this._map._getAnimatingZoom()){
            this._gragTag = false;
            return;
        }
        this._gragTag = true;
        var map = this._map;

        map
            .fire('movestart')
            .fire('dragstart');

        if (map._panTransition) {
            map._panTransition._onTransitionEnd(true);
        }
        // if(map._zoomAnimationTimer){
          // // map._completeZoomAnim();
        // }

        if (map.inertia) {
            this._positions = [];
            this._times = [];
        }
    },

    _onDrag: function () {
        if(!this._gragTag)return;
        if (this._map.inertia) {
            var time = this._lastTime = +new Date(),
                pos = this._lastPos = this._newPos;
            this._positions = this._positions || [];
            this._positions.push(pos);
            this._times.push(time);

            if (time - this._times[0] > 200) {
                this._positions.shift();
                this._times.shift();
            }
        }
        this._map.fire('drag');
        
        this._map.fire('move');
        // this._map
            // .fire('move')
            // .fire('drag');
    },

    _onDragEnd: function () {
        if(!this._gragTag)return;
        var map = this._map,
            options = map.options,
            delay = +new Date() - this._lastTime,

            // noInertia = !options.inertia ||
                    // delay > options.inertiaThreshold ||
                    // typeof this._positions[0] === 'undefined' || (!(map.basicLayer instanceof L.Layers.TileBase) || map.basicLayer.singleTile);
         noInertia = L.Util.Browser.ie;
        //map.fire('move');
        if (noInertia) {
            map.fire('moveend');
        } else {
            var direction = this._lastPos.subtract(this._positions[0]),
                duration = (this._lastTime + delay - this._times[0]) / 1000,

                speedVector = direction.multiplyBy(0.58 / duration),
                speed = speedVector.distanceTo(new L.Loc(0, 0)),

                limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
                limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),

                decelerationDuration = limitedSpeed / options.inertiaDeceleration,
                offset = limitedSpeedVector.multiplyBy(-decelerationDuration).round();

                duration = Math.max(0.5, duration);

            var panOptions = {
                duration: duration,
                //easing: L.Util.TRANSITION ? 'linear' :"ease"
                easing: "ease-out"
            };
            this._map.panBy(offset, panOptions);
        }

        map.fire('dragend');

        // if (options.maxBounds || map.getMaxExtent()) {
            // this._map._panInsideBounds(this._map.options.maxBounds || this._map.getMaxExtent());
        // }
        
    }
});

L.Map.WheelZoom = L.HandlerBase.extend({
    addHooks: function () {
        L.DomEvent.addListener(this._map._container, 'mousewheel', this._onWheelScroll, this);
        this._delta = 0;
    },

    removeHooks: function () {
        L.DomEvent.removeListener(this._map._container, 'mousewheel', this._onWheelScroll);
    },

    _onWheelScroll: function (e) {
        var delta = L.DomEvent.getWheelDelta(e);
        this._delta += delta;
        //this._lastMousePos = this._map.mouseEventToContainerPoint(e);
        this._lastMousePos = L.DomEvent.getMousePosition(e, this._map._container);
       
        clearTimeout(this._timer);
        this._timer = setTimeout(L.Util.bind(this._performZoom, this), 50);
        
        L.DomEvent.preventDefault(e);
    },

    _performZoom: function () {
        if(!this._map)return;
        if (this._map._getAnimatingZoom()){
            return;
        }
        
        
        this._iCenter = this._map._getCenter();
  
        this._mCenter = this._map.pixelToPoint(this._lastMousePos);
        
        
        
        var map = this._map,
            delta = Math.round(this._delta),
            zoom = map.getZoom();
        delta = Math.max(Math.min(delta, 4), -4);
        var zoomCount = map.getZoomCount();
        var zoomend = map.getZoom() + delta;
        zoomend = map._limitZoom(zoomend);
       
        delta = zoomend - zoom;

        this._delta = 0;

        if (!delta) {
            return;
        }
        var scale = map.getResByZoom(zoomend) / map.getResolution();

        var newCenter = this._mCenter.subtract(this._mCenter.subtract(this._iCenter).multiplyBy(scale));
        map._zoomPos = this._lastMousePos;
        if(!map._zoomDirectionCtrl){
            var tmpCtrl = new L.Controls.Zoom();
            tmpCtrl._setMap(map);
        }
        map._zoomDirectionCtrl.enable(this._lastMousePos, delta);
        map.setView(newCenter, zoomend);
    }
    
});

L.Map.DrawFeatureHandler = L.HandlerBase.extend({
    options:{
        styleOptions:{
            stroke: true,
            strokeColor: '#ff0000',
            strokeWidth: 2,
            strokeOpacity: 0.8,

            fill: true,
            fillColor: "#FFFFFF", //same as color by default
            fillOpacity: 1,
            editable:true,
            clickable: true
        }
    },
    
    _getStyleOptions: function () {
        this.options.styleOptions = this.options.styleOptions || {};
        var tmpOptions = L.Util.extend({}, this.options.styleOptions);
        tmpOptions = L.Util.extend(tmpOptions, {editable:false, clickable:false, draggable:false});
        return tmpOptions;
    },
    
    _getLineStyleOptions: function () {
        var tmpOptions = this._getStyleOptions();
        tmpOptions = L.Util.extend(tmpOptions, {fill:false});
        return tmpOptions;
    },
    
    setHandlerOptions: function(options) {
        this.options = this.options || {};
        if(options)
            L.Util.extend(this.options, options);
        this.options.styleOptions = this.options.styleOptions || {};
        this.options.styleOptions = L.Util.extend(this.options.styleOptions, this.getStyleOptionClass(), options);
        
    },
    
    getStyleOptionClass: function() {
        return L.Util.extend(this._getStyleOptionClass(), {editable: true});
    },
    
    _getStyleOptionClass: function() {
        return L.Util.extend({},L.Ols.PolygonOptions);
    }
});

L.Map.DrawPoint = L.Map.DrawFeatureHandler.extend({
    options:{
        styleOptions:{
            radius: 5
        }
    },
    
    addHooks: function () {
        this._map.on("click", this._onMapClick, this);
    },

    removeHooks: function () {
        this._map.off("click", this._onMapClick);
    },

    _onMapClick: function (e) {
        this.feature = new L.Ols.Point(e.point, this._getStyleOptions());
        this._map.addOverlays(this.feature);
        this._map.fire("drawfeatureend", {feature:this.feature});
    },
    
    _getStyleOptions:function(){
        this.options.styleOptions = this.options.styleOptions || {};
        var tmpOptions = L.Util.extend({}, this.options.styleOptions);
        return tmpOptions;
    }
});

L.Map.DrawLine = L.Map.DrawFeatureHandler.extend({
    options:{
        styleOptions:{
            stroke: true,
            strokeColor: '#ff0000',
            strokeWidth: 2,
            strokeOpacity: 0.8,

            fill: false,
            fillColor: "#FFFFFF", //same as color by default
            fillOpacity: 1,
            editable:true,
            clickable: true,
            labelable: false,
            labelAnchor: new L.Loc(8,0),
            labelContent: '',
			labelLineCharCount:6
        }
    },
    
    addHooks: function () {
        this._map.on('click', this._onMapClick, this);
        //this._map.addListener(L.Draggable.MOVE, this._onMouseMove, this);
        this._map.on('mousemove', this._onMouseMove, this);
        this._map.on('dblclick', this._onDoubleClick, this);
    },
    
    removeHooks: function () {
        this._map.off('click', this._onMapClick);
        //this._map.removeListener(L.Draggable.MOVE, this._onMouseMove);
        this._map.off('mousemove', this._onMouseMove);
        this._map.off('dblclick', this._onDoubleClick);
        this._endDrawn();
        this._drawnFeature = null;
    },
    
    _endDrawn: function () {
        this._startPoint = null;
        delete this._startPoint;
        if(this._endPoint){
            this._endPoint = null;
            delete this._endPoint;
        }
        if(this._label)
            this._label = null;
            
        if(this._tmpFeature){
            if(this._map)
                this._map.removeOverlays(this._tmpFeature);
            this._tmpFeature = null;
            delete this._tmpFeature;
        }
        
        if(this._drawnFeature){
            if(this.options.styleOptions && this.options.styleOptions.editable)
                this._drawnFeature.enableEdit();
            if(this._map)
                this._map.fire("drawfeatureend", {feature:this._drawnFeature});
        } 
    },
    
    _onMapClick: function(e) {
        if(!this._drawnFeature){
            if(this._startPoint){
                this._drawnFeature = new L.Ols.Line([this._startPoint, e.point], this._getStyleOptions());
                L.Util.stamp(this._drawnFeature);
                this._map.addOverlays(this._drawnFeature);
            }
            else{
                this._map.fire("drawfeaturestart");
            }
        }
        else{
            this._drawnFeature.addPoint(e.point);
        }
        this._startPoint = e.point;
        
        // if(this._tmpFeature){
        //     this._map.removeOverlays(this._tmpFeature);
        //     this._tmpFeature = null;
        //     delete this._tmpFeature;
        // }
        this.fire("addpoint", e);
    },
    
    _onMouseMove: function (e) {
        if(!this._startPoint)
            return;
        if(L.Util.Browser.touch || L.Util.Browser.android)
            return;
        if(!this._tmpFeature){
            this._tmpFeature = new L.Ols.Line([this._startPoint, e.point],this._getStyleOptions());
            L.Util.stamp(this._tmpFeature);
            this._map.addOverlays(this._tmpFeature);
        }
        else{
            this._tmpFeature.setPoints([this._startPoint, e.point]);
        }
        this.fire("movepoint", e);
    },
    
    _onDoubleClick: function (e) {
        if(this._drawnFeature){
            var tmpPois = this._drawnFeature.getPoints();
            if(tmpPois){
                var tmpLen = tmpPois.length;
                if(tmpLen > 3){
                    if(tmpPois[tmpLen - 1].equals(tmpPois[tmpLen - 2])){
                        this._drawnFeature.removePoints(tmpLen - 1, 1);
                    }
                }
                if(this.options.styleOptions.labelable && this.options.styleOptions.labelContent != ''){
                    if(tmpLen >= 2){
                        if(!this._label){
                            var clss = 'leaflet-label';
                            var rIndex = Math.floor(tmpLen / 2);
                            var lIndex = rIndex - 1 ;
                            var tmpLoc = new L.Loc((tmpPois[rIndex].x + tmpPois[lIndex].x) / 2, (tmpPois[rIndex].y + tmpPois[lIndex].y) / 2);
                            tmpLoc._round();
                            
							
							var maxLen = this.options.styleOptions.labelLineCharCount || 1000;
							var lebelLen = this.options.styleOptions.labelContent.length > maxLen ? maxLen : this.options.styleOptions.labelContent.length;
		
							var labelContent = "";
							for(var i = 0; i < this.options.styleOptions.labelContent.length;i++){
								if(i % maxLen == 0 && i != 0){
									labelContent +="<br/>";
								}
								labelContent += this.options.styleOptions.labelContent[i];
							}
		
                            this._label = new L.Ols.Label(tmpLoc, {offset: this.options.styleOptions.labelAnchor,content:labelContent, clickable:false});
                            this._map.addOverlays(this._label);
                            this._drawnFeature._label = this._label;
                            this._label.addClass(clss);
                        }
                    } 
                }
            } 
        }
        this._endDrawn();
        this.fire("endpoint", e);
        this._drawnFeature = null;
    },
    
    setLabel:function(content){
        if(!this._label)
            return;
        this._label.setContent(content);
    },
    
    _getStyleOptionClass: function() {
        return L.Util.extend({},L.Ols.LineOptions);
    }
});

L.Map.DrawPolygon = L.Map.DrawLine.extend({
    options:{
        styleOptions:{
            stroke: true,
            strokeColor: '#ff0000',
            strokeWidth: 2,
            strokeOpacity: 0.8,

            fill: true,
            fillColor: "#F00faF", //same as color by default
            fillOpacity: 0.5,
            editable:true,
            clickable: true
        }
    },
    
    _onMapClick: function(e) {
        if(!this._drawnFeature || !(this._drawnFeature instanceof L.Ols.Polygon)){
            if(this._startPoint){
                if(!this._endPoint){
                    //this._endPoint = e.point;
                    this._drawnFeature = new L.Ols.Line([this._startPoint, e.point], this._getLineStyleOptions());
                    L.Util.stamp(this._drawnFeature);
                    this._map.addOverlays(this._drawnFeature);
                }
                else{
                    this._map.removeOverlays(this._drawnFeature);
                    delete this._drawnFeature;
                    this._drawnFeature = new L.Ols.Polygon([this._startPoint, this._endPoint, e.point], this._getStyleOptions());
                    L.Util.stamp(this._drawnFeature);
                    this._map.addOverlays(this._drawnFeature);
                }
            }
            else{
                this._map.fire("drawfeaturestart");
            }
        }
        else{
            this._drawnFeature.addPoint(e.point);
        }
        this._endPoint = this._startPoint ? e.point : null;
        
        this._startPoint = this._startPoint || e.point;
        // if(this._tmpFeature){
        //     this._map.removeOverlays(this._tmpFeature);
        //     this._tmpFeature = null;
        //     delete this._tmpFeature;
        // }
        this.fire("addpoint", e);
    },
    
    _onMouseMove: function (e) {
        if(!this._startPoint)
            return;
        if(L.Util.Browser.touch || L.Util.Browser.android)
            return;
        if(!this._tmpFeature){
            if(!this._endPoint){
                this._tmpFeature = new L.Ols.Line([this._startPoint, e.point], this._getLineStyleOptions());
            }
            else{
                this._tmpFeature = new L.Ols.Line([this._startPoint, e.point, this._endPoint], this._getLineStyleOptions());
            }
            L.Util.stamp(this._tmpFeature);
            this._map.addOverlays(this._tmpFeature);
        }
        else{
            if(!this._endPoint)
                this._tmpFeature.setPoints([this._startPoint, e.point]);
            else{
                this._tmpFeature.setPoints([this._startPoint, e.point, this._endPoint]);
            }
        }
        this.fire("movepoint", e);
    },
    
    _getStyleOptionClass: function() {
        return L.Util.extend({},L.Ols.PolygonOptions);
    }
});

L.Map.DrawRect = L.Map.DrawPolygon.extend({
    addHooks: function () {
        this._map.on('click', this._onMapClick, this);
        this._map.on('mousemove', this._onMouseMove, this);
    },
    
    removeHooks: function () {   
        this._map.off('click', this._onMapClick);
        this._map.off('mousemove', this._onMouseMove);
        this._endDrawn();
    },
    
    _onMapClick: function(e) {
        if(!this._startPoint){
            this._endTag = false;
            this._startPoint = e.point;
        }
        else{
            this._endTag = true;
            if(!this._drawnFeature){
                this._drawnFeature = new L.Ols.Rect(new L.Extent(this._startPoint.x, this._startPoint.y, e.point.x, e.point.y),this._getStyleOptions());
                L.Util.stamp(this._drawnFeature);
                this._map.addOverlays(this._drawnFeature);
            }else{
                this._drawnFeature.setBounds(new L.Extent(this._startPoint.x, this._startPoint.y, e.point.x, e.point.y))
            }
            this._endDrawn();
        }
    },
    
    _endDrawn: function () {
        if(!this._startPoint)
            return;
        this._startPoint = null;
        if(this._drawnFeature){
            if(!this._endTag && this._map)
                this._map.removeOverlays(this._drawnFeature);
            else if(this._map)
                this._map.fire("drawfeatureend", {feature:this._drawnFeature});
            if(this.options.styleOptions && this.options.styleOptions.editable)
                this._drawnFeature.enableEdit();
            this._drawnFeature = null;
            delete this._drawnFeature;
        }
        this._endTag = false;
    },
    
    _onMouseMove: function (e) {
        if(!this._startPoint)
            return;
        if(L.Util.Browser.touch || L.Util.Browser.android)
            return;
        if(!this._drawnFeature){
            this._drawnFeature = new L.Ols.Rect(new L.Extent(this._startPoint.x, this._startPoint.y, e.point.x, e.point.y),this._getStyleOptions());
            L.Util.stamp(this._drawnFeature);
            this._map.addOverlays(this._drawnFeature);
        }
        else{
            this._drawnFeature.setBounds(new L.Extent(this._startPoint.x, this._startPoint.y, e.point.x, e.point.y));
        }
    }
});

L.Map.DrawCircle = L.Map.DrawRect.extend({
    addHooks: function () {
        this._map.on('click', this._onMapClick, this);
        this._map.on('mousemove', this._onMouseMove, this);
    },
    
    removeHooks: function () {
        this._map.off('click', this._onMapClick);
        this._map.off('mousemove', this._onMouseMove);
        this._endDrawn();
    },
    
    _onMapClick: function(e) {
        if(!this._startPoint){
            this._endTag = false;
            this._startPoint = e.point;
        }
        else{
            this._endTag = true;
            var tmpDist = L.Util.getFitDist(this._startPoint.distanceTo(e.point), this._map.getUnits(), "m");
            if(!this._drawnFeature){
                this._drawnFeature = new L.Ols.Circle(this._startPoint, tmpDist, this._getStyleOptions());
                L.Util.stamp(this._drawnFeature);
                this._map.addOverlays(this._drawnFeature);
            }
            else{
                this._drawnFeature.setRadius(tmpDist);
            }
            this._endDrawn();
        }
    },
    // _endDrawn: function () {
        // if(this._startPoint){
            // this._startPoint = null;
        // }
        // if(this._drawnFeature){
            // if(!this._endTag && this._map)
                // this._map.removeOverlays(this._drawnFeature);
            // else if(this._map)
                // this._map.fire("drawfeatureend", {feature:this._drawnFeature});
            // this._drawnFeature = null;
            // delete this._drawnFeature;
        // }
        // this._endTag = false;
    // },
    _onMouseMove: function (e) {
        if(!this._startPoint)
            return;
        if(L.Util.Browser.touch || L.Util.Browser.android)
            return;
        var tmpDist = L.Util.getFitDist(this._startPoint.distanceTo(e.point), this._map.getUnits(), "m");
        if(!this._drawnFeature){
            this._drawnFeature = new L.Ols.Circle(this._startPoint, tmpDist, this._getStyleOptions());
            L.Util.stamp(this._drawnFeature);
            this._map.addOverlays(this._drawnFeature);
        }
        else{
            this._drawnFeature.setRadius(tmpDist);
        }
    }
});

L.Map.DrawSector = L.Map.DrawCircle.extend({
	addHooks: function () {
        this._map.on('click', this._onMapClick, this);
        this._map.on('mousemove', this._onMouseMove, this);
    },
	removeHooks: function () {
        this._map.off('click', this._onMapClick);
        this._map.off('mousemove', this._onMouseMove);
        this._endDrawn();
    },
	_onMapClick: function(e) {    
        if(!this._drawnFeature || !(this._drawnFeature instanceof L.Ols.Fan)){
            if(!this._startPoint){
                this._endTag = false;
                this._startPoint = this._startPoint || e.point;
            }
            else{
                if(!this._endPoint){
                    this._endTag = false;
                    this._passPoint = e.point;
                    this._endPoint = this._startPoint ? e.point : null; 
                    this._drawnFeature = new L.Ols.Line([this._startPoint, e.point], this._getLineStyleOptions());
                    L.Util.stamp(this._drawnFeature);
                    this._map.addOverlays(this._drawnFeature);
                }
                else{
                    this._endTag = true;
                    this._map.removeOverlays(this._drawnFeature);
                    delete this._drawnFeature;
					this._endPoint = this._startPoint ? e.point : null;
					
					//计算结束角度a2 (以度为单位)
					var r2 = new L.Loc(this._endPoint.x,this._endPoint.y).distanceTo(new L.Loc(this._startPoint.x,this._startPoint.y));
					var y2 = this._endPoint.y - this._startPoint.y;
					var a2;
					if(this._startPoint.x < this._endPoint.x && this._startPoint.y <= this._endPoint.y){
						a2 = 180*Math.asin(y2/r2)/Math.PI;//第1象限
					}else if(this._startPoint.x == this._endPoint.x && this._startPoint.y < this._endPoint.y){
						a2 = 180*Math.asin(y2/r2)/Math.PI;//90度
					}else if(this._startPoint.x > this._endPoint.x && this._startPoint.y < this._endPoint.y){
						a2 = 180-180*Math.asin(y2/r2)/Math.PI;//第2象限
					}else if(this._startPoint.x > this._endPoint.x && this._startPoint.y >= this._endPoint.y){
						a2 = 180-180*Math.asin(y2/r2)/Math.PI;//第3象限
					}else if(this._startPoint.x == this._endPoint.x && this._startPoint.y > this._endPoint.y){
						a2 = 180-180*Math.asin(y2/r2)/Math.PI;//270;
					}else if(this._startPoint.x < this._endPoint.x && this._startPoint.y > this._endPoint.y){
						a2 = 360+180*Math.asin(y2/r2)/Math.PI;//第4象限
					}else{
						return;
					}	
					
					this._drawnFeature = new L.Ols.Fan(this._startPoint,this._passPoint,a2,this._draw,this._getStyleOptions());//L.Ols.Fan 的构造函数
                    L.Util.stamp(this._drawnFeature);
                    this._map.addOverlays(this._drawnFeature); 
                    this._endDrawn();
                }
            }
            
        }
	},
    _endDrawn: function () {
        if(!this._startPoint)
            return;
        this._startPoint = null;
        
        if(this._endPoint){
            this._endPoint = null;
            delete this._endPoint;
        }
        
        if(this._tmpFeature){
            if(this._map)
                this._map.removeOverlays(this._tmpFeature);
            this._tmpFeature = null;
            delete this._tmpFeature;
        }
		 if(this._movePoint){
			this._movePoint = null;
            delete this._movePoint;
        }
        if(this._drawnFeature){
            if(!this._endTag && this._map)
                this._map.removeOverlays(this._drawnFeature);
            else if(this._map)
                this._map.fire("drawfeatureend", {feature:this._drawnFeature});
            this._drawnFeature = null;
            delete this._drawnFeature;
        }
        this._endTag = false;
		this._flag = 1;
    },
    
	_onMouseMove: function (e) {
        if(!this._startPoint)
            return;
        if(L.Util.Browser.touch || L.Util.Browser.android)
            return;
        if(!this._tmpFeature){
            if(!this._endPoint){
                this._tmpFeature = new L.Ols.Line([this._startPoint, e.point], this._getLineStyleOptions());
            }
            L.Util.stamp(this._tmpFeature);
            this._map.addOverlays(this._tmpFeature);
        }
        else{
            if(!this._endPoint)
                this._tmpFeature.setPoints([this._startPoint, e.point]);
            else{
				if(!this._movePoint){
					this._movePoint = e.point;
					this._flag = 1;
				}
                else{
					//确定方向的点,选择鼠标移动后的第二点
                    this._flag = this._flag + 1; 
					
					//半径，以当前底图地图单位为单位
					var rdUnits = new L.Loc(this._startPoint.x,this._startPoint.y).distanceTo(new L.Loc(this._passPoint.x,this._passPoint.y));
					var tpx = e.point.x-this._startPoint.x;
					var tpy = e.point.y-this._startPoint.y;
					var dissqrt = Math.sqrt(tpx*tpx+tpy*tpy);
					
					//移动时圆弧上的点
					var arcpt = new L.Loc(tpx/dissqrt*rdUnits+this._startPoint.x,tpy/dissqrt*rdUnits+this._startPoint.y);
					
					//取第二个移动点 进行方向判断
					if(this._flag == 2){
						//movePoint点角度  
						var a;
						var yy = this._passPoint.y-this._startPoint.y;
						if(this._startPoint.x < this._passPoint.x && this._startPoint.y <= this._passPoint.y){
							a = 180*Math.asin(yy/rdUnits)/Math.PI;//第1象限
						}else if(this._startPoint.x == this._passPoint.x && this._startPoint.y < this._passPoint.y){
							a = 180*Math.asin(yy/rdUnits)/Math.PI;//90度
						}else if(this._startPoint.x > this._passPoint.x && this._startPoint.y < this._passPoint.y){
							a = 180-180*Math.asin(yy/rdUnits)/Math.PI;//第2象限
						}else if(this._startPoint.x > this._passPoint.x && this._startPoint.y >= this._passPoint.y){
							a = 180-180*Math.asin(yy/rdUnits)/Math.PI;//第3象限
						}else if(this._startPoint.x == this._passPoint.x && this._startPoint.y > this._passPoint.y){
							a = 180-180*Math.asin(yy/rdUnits)/Math.PI;//270;
						}else if(this._startPoint.x < this._passPoint.x && this._startPoint.y > this._passPoint.y){
							a = 360+180*Math.asin(yy/rdUnits)/Math.PI;//第4象限
						}else{
							//alert("不符合条件");
						}
						// 表示圆弧移动点相对于第二点（this._passPoint）的增量值（x ，y）的 最大值，用于构建顺时针 和逆时针向量
						var maxAdd;
						if(Math.abs(arcpt.x-this._passPoint.x)>Math.abs(arcpt.y-this._passPoint.y)){
							maxAdd = Math.abs(arcpt.x-this._passPoint.x);
						}else{
							maxAdd = Math.abs(arcpt.y-this._passPoint.y);
						}
						
						var v1,v2;//v1 表示相对第二个点（this._passPoint）的顺时针向量  v2表示相对第二个点（this._passPoint）的逆时针向量
						if(a >= 0 && a < 90){
							v1=new L.Loc(maxAdd,-maxAdd);//第1象限
							v2=new L.Loc(-maxAdd,maxAdd);
						}else if(a>=90 && a<180){
							v1=new L.Loc(maxAdd,maxAdd);//第2象限
							v2=new L.Loc(-maxAdd,-maxAdd);
						}else if(a>=180 && a<270){
							v1=new L.Loc(-maxAdd,maxAdd);//第3象限
							v2=new L.Loc(maxAdd,-maxAdd);
						}else {
							v1=new L.Loc(-maxAdd,-maxAdd);//第4象限
							v2=new L.Loc(maxAdd,maxAdd);
						}
						var v3 = new L.Loc(arcpt.x-this._passPoint.x,arcpt.y-this._passPoint.y);//第二个点（this._passPoint）到圆弧移动点的向量
						
						//用两个向量的叉乘积，进行判断 
						if(v1.x*v3.x+v1.y*v3.y>0&&v2.x*v3.x+v2.y*v3.y<0){
							this._draw = 1;//顺时针
						}else if(v1.x*v3.x+v1.y*v3.y<0&&v2.x*v3.x+v2.y*v3.y>0){
							this._draw = 0;//逆时针
						}
					}
				}
                this._tmpFeature.setPoints([this._startPoint, e.point, this._passPoint]);
            }
        }
	}
});

L.Map.ZoomBoxHandler = L.Map.DrawFeatureHandler.extend({
    options:{
        styleOptions:{
            stroke: true,
            strokeColor: '#ff0000',
            strokeWidth: 2,
            strokeOpacity: 0.8,

            fill: true,
            fillColor: "#ff0000", //same as color by default
            fillOpacity: 0.2,
            editable:false,
            clickable: false
        },
        _zoomInTag: false
    },
    
    getStyleOptionClass: function() {
        return this.options.styleOptions;
    },
    
    addHooks: function () {
        this._map.on("mousedown", this._onMouseDown, this);
        this._map.on("mousemove", this._onMouseMove, this);
        this._map.on("mouseup", this._onMouseUp, this);
    },

    removeHooks: function () {
        this._map.off("mousedown", this._onMouseDown, this);
        this._map.off("mousemove", this._onMouseMove, this);
        this._map.off("mouseup", this._onMouseUp, this);
        if(this._drawnFeature)
            this._map.removeOverlay(this._drawnFeature);
        this._drawnFeature = null;
        this._startPoint = null;
    },

    _onMouseDown: function (e) {
        if(!this._map) return;
         this._startPoint = null;
        if (this._map._getAnimatingZoom()){
          //  L.DomEvent.stop(e);
            
            return;
        }
       
        if(e.point)
            this._startPoint = e.point;
    },

    _onMouseUp: function (e) {
        if(!this._map) return;
        if(e.point && this._startPoint && this._drawnFeature){
            var bb = new L.Extent(this._startPoint.x, this._startPoint.y, e.point.x, e.point.y);
            if(this.options._zoomInTag)
                this._map.zoomToExtent(bb);
            else
                this._map.moveTo(bb.getCenter(), this._map.getZoom() - 1);
        }
        
        if(this._drawnFeature)
            this._map.removeOverlays(this._drawnFeature);
            
        this._drawnFeature = null;
        this._startPoint = null;
    },

    _onMouseMove:function(e){
        if(!this._map) return;
        if(!this._startPoint)
            return;
       
        if(!this._drawnFeature){
            this._drawnFeature = new L.Ols.Rect(new L.Extent(this._startPoint.x, this._startPoint.y, e.point.x, e.point.y),this.options.styleOptions);
            L.Util.stamp(this._drawnFeature);
            this._map.addOverlays(this._drawnFeature);
        }
        else{
            this._drawnFeature.setBounds(new L.Extent(this._startPoint.x, this._startPoint.y, e.point.x, e.point.y));
        }
    }
});

L.Map.DrawMarker = L.Map.DrawPoint.extend({
    options:{
        styleOptions:{
            markerClassName: "L.Ols.Marker"
        }
    },
    
    setHandlerOptions: function(options) {
        this.options = this.options || {};
        this.options.styleOptions = this.options.styleOptions || {};
        if(options && options.markerClassName && options.markerClassName.toLowerCase() == "nspritemarker"){
            this.options.styleOptions.markerClassName = "L.Ols.BgMarker";
        }
        else{
            this.options.styleOptions.markerClassName = "L.Ols.Marker";
        }
        this.options.styleOptions = L.Util.extend(this.options.styleOptions, this.getStyleOptionClass(), options);
    },
    
    _getStyleOptionClass: function() {
        if(this.options.styleOptions.markerClassName == "L.Ols.BgMarker")
            return L.Util.extend({},L.Ols.BgMarkerOptions);
        else
            return L.Util.extend({},L.Ols.MarkerOptions);
    },
    
    _onMapClick: function (e) {
        if(this.options.styleOptions.markerClassName == "L.Ols.BgMarker")
            this.marker = new L.Ols.BgMarker(e.point, this._getStyleOptions());
        else
            this.marker = new L.Ols.Marker(e.point, this._getStyleOptions());
        this._map.addOverlays(this.marker);
        this._map.fire("drawmarkerend", {marker:this.marker});
    }
});

L.Map.DoubleClickZoom = L.HandlerBase.extend({
    addHooks: function () {
        this._map.on('dblclick', this._onDoubleClick);
    },

    removeHooks: function () {
        this._map.off('dblclick', this._onDoubleClick);
    },

    _onDoubleClick: function (e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
        this.setView(e.point, this._limitZoom(this.getZoom() + 1));
        
    }
});
L.Map.TouchZoom = L.HandlerBase.extend({
    addHooks: function () {
        L.DomEvent.addListener(this._map._container, 'touchstart', this._onTouchStart, this);
    },

    removeHooks: function () {
        L.DomEvent.removeListener(this._map._container, 'touchstart', this._onTouchStart, this);
    },

    _onTouchStart: function (e) {
        var map = this._map;

        if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) { return; }

        var p1 =  map._pixelToAbsPixel(L.DomEvent.getMousePosition(e.touches[0], map._container)),
            p2 =  map._pixelToAbsPixel(L.DomEvent.getMousePosition(e.touches[1], map._container)),
            viewCenter = map._pixelToAbsPixel(map.getSize().divideBy(2));

        this._startCenter = p1.add(p2).divideBy(2, true);
        this._startDist = p1.distanceTo(p2);

        this._moved = false;
        this._zooming = true;

        this._centerOffset = viewCenter.subtract(this._startCenter);

        L.DomEvent
            .addListener(this._map._container, 'touchmove', this._onTouchMove, this)
            .addListener(this._map._container, 'touchend', this._onTouchEnd, this);

        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
    },

    _onTouchMove: function (e) {
        if (!e.touches || e.touches.length !== 2) { return; }

        var map = this._map;

        var p1 =  map._pixelToAbsPixel(L.DomEvent.getMousePosition(e.touches[0], map._container)),
            p2 =  map._pixelToAbsPixel(L.DomEvent.getMousePosition(e.touches[1], map._container)),
            viewCenter = map._pixelToAbsPixel(map.getSize().divideBy(2)),
            curDist = p1.distanceTo(p2);
        this._startCenter = p1.add(p2).divideBy(2, true);
        this._scale = curDist / this._startDist;
        
        if (!this._moved) {
            this._moved = true;
        }
        
        this._startCenter = p1.add(p2).divideBy(2, true);

        this._centerOffset = viewCenter.subtract(this._startCenter);
        
        var p1point =  map.pixelToPoint(L.DomEvent.getMousePosition(e.touches[0], map._container)),
            p2point =  map.pixelToPoint(L.DomEvent.getMousePosition(e.touches[1], map._container));
        this._newCenter = p2point.add(p1point).divideBy(2);
        L.DomEvent.preventDefault(e);
    },
    
    _onTouchEnd: function (e) {
        if (!this._moved || !this._zooming) { return; }
        this._moved = false;
        this._zooming = false;
        var oldCenter = this._map.getCenter();
        var newzoomLevel = (this._scale > 1) ? (this._map.getZoom() + 1) :(this._map.getZoom() - 1);
        var res = this._map.getResByZoom(newzoomLevel);
        if(this._centerOffset && this._newCenter){
            this._newCenter = this._newCenter.add(new L.Loc(this._centerOffset.x * res, -this._centerOffset.y * res));
        }

        if(res != this._map.getResolution()){
            this._map.setView(this._newCenter, newzoomLevel);
        }
        
        return;
        
    }
});

L.Map.MeasureLength = L.Map.DrawLine.extend({
    _indexTag: 0,
    _totalFixed:5,

    getStyleOptionClass: function() {
        return L.Util.extend(this._getStyleOptionClass(), {editable: false, strokeColor: '#ff0000', strokeWidth: 1, strokeOpacity: 1});
    },
    
    addHooks: function () {
        L.Util.extend(this.options.styleOptions,{editable:false, clickable:false,draggable:false});
        L.Map.DrawLine.prototype.addHooks.call(this);
        this._map.on('mousemove', this._onMouseMove2, this);
        this.on('addpoint', this._onPointAdd, this);
        this.on('movepoint', this._onPointMove, this);
        this.on('endpoint', this._onDrawEnd, this);
        this._map.on("drawfeatureend", this._onDrawFeatureEnd, this);
    },
    
    removeHooks: function () {
        if(this._drawnFeature){
            var tmpPoints = this._drawnFeature.getPoints();
            if(tmpPoints && tmpPoints.length > 1){
                var tmppoint = tmpPoints[tmpPoints.length - 1];
                this._onDoubleClick({point:tmppoint});
            }
        }
        this._map.off('mousemove', this._onMouseMove2, this);
        L.Map.DrawLine.prototype.removeHooks.call(this);
        this.off('addpoint', this._onPointAdd);
        this.off('movepoint', this._onPointMove);
        this.off('endpoint', this._onDrawEnd);
        this._map.off('drawfeatureend', this._onDrawFeatureEnd);
        if(this._infoLabel)
            this._map.removeOverlays(this._infoLabel);
        this._infoLabel = null;
    },

    _onDrawFeatureEnd:function (e) {
        // if(!e.feature)return;
        //var id = L.Util.stamp(e.feature);
       
        this._addOverlay(e.feature, true);
    },
    
    _onDoubleClick: function (e) {
        this._endDrawn();
        this.fire("endpoint", e);
        this._drawnFeature = null;
    },
    
    _onPointAdd: function (e) {
        if(e.point && this._map){
            var content = "";
            var clss = "";
            if(!this._preMPoint){
                this._indexTag++;
                this._preMPoint = e.point;
                this._totalLen = 0;
                content = " 起点 ";
                clss = " leaflet_measure_label";
            }
            else{
                var curLen = this._getLen(this._preMPoint, e.point, this._map.getUnits());
                this._totalLen += curLen;
                this._preMPoint = e.point;
                
                content = this.getFitLenStr(this._totalLen,2);
            }
            var tmpPoint = new L.Ols.Point(e.point,{
                radius: 4,
                strokeWidth: 1,
                stroke: true,
                strokeColor: '#ff0000',
                strokeOpacity: 1,
                fill: true,
                fillColor: '#ffffff', 
                fillOpacity: 1,
                editable:false,
                clickable: true
            });
            var tmpLabel = new L.Ols.Label(e.point, {offset: new L.Loc(8,0),content:content, clickable:false});
            
            this._addOverlay(tmpPoint);
            this._addOverlay(tmpLabel);
            tmpLabel.addClass(clss);
        }
    },
    
    _addOverlay: function (layer, noaddtomap) {
        var tag = "measure_group_" + this._indexTag;
        this._overlays =  this._overlays || {};
        this._overlays[tag] = this._overlays[tag] || {};
        var id = L.Util.stamp(layer);
        this._overlays[tag][id] = layer;
        if (this._map && !noaddtomap) {
            this._map.addOverlays(layer);
        }
        return this;
    },
    
    _getLen:function (p1, p2, units) {
        return L.Util.getDistByUnits(p1, p2, units);
    },
    
    getFitLenStr:function (len, fixed, split){
        var units = "米";
        if(len > 1000){
            units = "千米";
            len = len / 1000;
        }
        if(fixed !== undefined){
            len = len.toFixed(fixed);
        }
        if(split){
            return {len:len , units:units};
        }
        else
            return len + units;
    },
    
    _onPointMove: function (e) {
        if(e.point && this._map && this._infoLabel){
            var content = "";
            var curLen = this._getLen(this._preMPoint, e.point, this._map.getUnits());
            var tmplen = this._totalLen + curLen;
            //content = this._totalLen;
            var resObj = this.getFitLenStr(tmplen,this._totalFixed, true);
            content = '<span>总长：<span class="leaflet_measure_dis">'+resObj.len+'</span>' + resObj.units + '</span>';
            content += '<br>';
            content += '<span class="leaflet_measure_opinfo">单击确定地点，双击结束</span>';
            this._infoLabel.setContent(content);
        }
    },
    
    _onDrawEnd: function (e) {
        if(e.point && this._map){
            var content = "";
            if(!this._preMPoint){
                content = "总长： 0 米";
            }
            else{
                var curLen = this._getLen(this._preMPoint, e.point, this._map.getUnits());
                this._totalLen += curLen;
                var resObj = this.getFitLenStr(this._totalLen,this._totalFixed, true);
                content = '<span>总长：<span class="leaflet_measure_dis">'+resObj.len+'</span>' + resObj.units + '</span>';
                //content = '<span>总长：<span class="leaflet_measure_dis">'+this.getFitLenStr(this._totalLen,this._totalFixed)+'</span>公里</span>';
            }
            //var tmpPoint = new L.Ols.Point(e.point);
            var marker = new L.Ols.Marker(e.point,{
                                            markerAnchor: new L.Loc(-8,6), 
                                            clickable:true,
                                            shadowUrl:null,
                                            markerSize: new L.Loc(14,14),
                                            imgUrl: L.Icon.Default.imagePath + 'close.gif',
                                            zIndexOffset:900,
                                            draggable:false
                                            });
            var tmpLabel = new L.Ols.Label(e.point, {offset: new L.Loc(0,8),content:content, clickable:false, zIndexOffset:9999});
            
            //this._addOverlay(tmpPoint);
            this._addOverlay(marker);
            this._addOverlay(tmpLabel);
            marker.on("click", this._clearOverlays,this);
            marker.setTitle("单击删除此线路");
            marker._measureId = this._indexTag;
            tmpLabel.addClass(" leaflet_measure_label");
            if(this._infoLabel)
                this._infoLabel.setVisible(false);
            this._map.fire("measureend");
        }
        this._preMPoint = null;
    },
    _clearOverlays:function (e) {
        if(!e || !e.target)
            return;
        var marker = e.target;
            groupId = "measure_group_" + marker._measureId;
        if(this._overlays && this._overlays[groupId])
            for (var i in this._overlays[groupId]) {
                if (this._overlays[groupId].hasOwnProperty(i)) {
                    this._map.removeOverlays(this._overlays[groupId][i]);
                    this._overlays[groupId][i] = null;
                    delete this._overlays[groupId][i];
                }
            }
    },
    _onMouseMove2: function (e) {
        if(!this._infoLabel){
            this._infoLabel = new L.Ols.Label(e.point, {offset: new L.Loc(18,18), zIndexOffset:9998});
            this._map.addOverlays(this._infoLabel);
            this._infoLabel.addClass(" leaflet_measure_label");
            this._infoLabel.setContent("单击确定起点");
        }
        else
            this._infoLabel.setPosition(e.point);
        if(this._infoLabel)
            this._infoLabel.setVisible(true);
    }
});

L.Map.MeasureArea = L.Map.DrawPolygon.extend({
    _indexTag: 0,
    _totalFixed:5,

    getStyleOptionClass: function() {
        return L.Util.extend(this._getStyleOptionClass(), {editable: false, strokeColor: '#ff0000', strokeWidth: 1, strokeOpacity: 1, fillColor:'#dddddd'});
    },
    
    addHooks: function () {
        L.Util.extend(this.options.styleOptions,{editable:false, clickable:false,draggable:false});
        L.Map.DrawPolygon.prototype.addHooks.call(this);
        this._map.on('mousemove', this._onMouseMove2, this);
        this.on('addpoint', this._onPointAdd, this);
        this.on('movepoint', this._onPointMove, this);
        this.on('endpoint', this._onDrawEnd, this);
        this._map.on("drawfeatureend", this._onDrawFeatureEnd, this);
    },
    
    removeHooks: function () {
        if(this._drawnFeature){
            var tmpPoints = this._drawnFeature.getPoints();
            if(tmpPoints && tmpPoints.length > 1){
                var tmppoint = tmpPoints[tmpPoints.length - 1];
                this._onDoubleClick({point:tmppoint});
            }
        }
        this._map.off('mousemove', this._onMouseMove2, this);
        L.Map.DrawPolygon.prototype.removeHooks.call(this);
        this.off('addpoint', this._onPointAdd);
        this.off('movepoint', this._onPointMove);
        this.off('endpoint', this._onDrawEnd);
        this._map.off('drawfeatureend', this._onDrawFeatureEnd);
        if(this._infoLabel)
            this._map.removeOverlays(this._infoLabel);
        this._infoLabel = null;
    },

    _onDoubleClick: function (e) {
        this._endDrawn();
        this.fire("endpoint", e);
        this._drawnFeature = null;
    },
    
    _onDrawFeatureEnd:function (e) {
        // if(!e.feature)return;
        //var id = L.Util.stamp(e.feature);
       
        this._addOverlay(e.feature, true);
    },
    
    _getArea: function(points) {
        var area = 0.0;
        if(points && (points.length > 2)){
            var pt0 = points[0];
            var pt1 = points[1];
            var tmpIndex = 0;
            var ptLst = points[points.length - 1];
            var len = points.length;
            area = pt0.y * ( ptLst.x - pt1.x );
            for(var i = 1; i < len;i++){
                tmpIndex = (i+1) % len ;
                area += points[i].y * (points[i - 1].x - points[tmpIndex].x);
            }
            area /= 2;
        }
        if(area < 0)
            area *= -1;
        return area;
    },
    
     _getFitArea:function(points){
        var len = 0;
        if(points){
            len = this._getArea(points);
        }
        var units = this._map.getUnits().toLowerCase();
        
        if(units != 'km') {
            var inPerMapUnit = L.Util.INCHES_PER_UNIT[units];
            len *= Math.pow((inPerMapUnit / L.Util.INCHES_PER_UNIT['km']), 2);
            units = 'km';
        }
        
        if(len < 0.001){
            len *= Math.pow((L.Util.INCHES_PER_UNIT['km'] / L.Util.INCHES_PER_UNIT['m']), 2);
            units = 'm';
        }
        
        len = len.toFixed(5);
        var resObj = {len:Math.abs(len), 'units':units};
        return resObj;
    },
    _getAreaBylonlat:function(points){
       var r = 6378137;
       var rad = Math.PI / 180;
       var area = 0.0;
       if(points && (points.length > 2)){
           var pointsCount = points.length;
           for (var i = 0; i < pointsCount; i++) {
                var lon1 = points[i].x;
                var lat1 = points[i].y;
                var lon2 = points[(i+1) % pointsCount].x;
                var lat2 = points[(i+1) % pointsCount].y;
                area += ((lon2 - lon1) * rad) *
                        (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
            }
            area = area * r * r / 2.0;
        }
        if(area < 0)
            area *= -1;
            
        var  units = 'm';
        if(area > 1000){
            area *= Math.pow((L.Util.INCHES_PER_UNIT['m'] / L.Util.INCHES_PER_UNIT['km']), 2);
            units = 'km';
        }
        area = area.toFixed(5);
            
        var resObj = {len:Math.abs(area), 'units':units};
        return resObj;
    },
    
    _onPointAdd: function (e) {
        if(e.point && this._map){
            if(!this._drawnFeature && this._startPoint && !this._endPoint){
                this._indexTag++;
            }
            if(this._drawnFeature){
                var content = "";
                var clss = "";
                var tmpPoints = this._drawnFeature.getPoints();
                
                var resObj, units = this._map.getUnits().toLowerCase();
                if(units == 'dd' || units == 'degrees')
                    resObj = this._getAreaBylonlat(tmpPoints);
                else
                    resObj = this._getFitArea(tmpPoints);
            
                content = '<span>总面积：<span class="leaflet_measure_dis">'+resObj.len+'</span>' + resObj.units + '<sup>2</sup></span>';
                content += '<br>';
                content += '<span class="leaflet_measure_opinfo">单击确定地点，双击结束</span>';
                if(!this._infoLabel){
                    this._infoLabel = new L.Ols.Label(e.point, {offset: new L.Loc(8,0),content:content, clickable:false, zIndexOffset:9998});
                    this._addOverlay(this._infoLabel);
                }
                else{
                    this._infoLabel.setContent(content);
                    this._infoLabel.setPosition(e.point);
                }
               //tmpLabel.addClass(clss);
            }
            
            var tmpPoint = new L.Ols.Point(e.point, {
                radius: 4,
                strokeWidth: 1,
                stroke: true,
                strokeColor: '#ff0000',
                strokeOpacity: 1,
                fill: true,
                fillColor: '#ffffff', 
                fillOpacity: 1,
                editable:false,
                clickable: true
            });
            
            this._addOverlay(tmpPoint);
        }
    },
    
    _addOverlay: function (layer, noaddtomap) {
        var tag = "measure_group_" + this._indexTag;
        this._overlays =  this._overlays || {};
        this._overlays[tag] = this._overlays[tag] || {};
        var id = L.Util.stamp(layer);
        this._overlays[tag][id] = layer;
        if (this._map && !noaddtomap) {
            this._map.addOverlays(layer);
        }
        return this;
    },
   
    _onPointMove: function (e) {
        if(e.point && this._map && this._infoLabel){
            
            var tmpPoints = null;
            if(this._drawnFeature){
                tmpPoints = [];
                var tmpPoints2 = this._drawnFeature.getPoints();
                for(var i=0; i < tmpPoints2.length; i++){
                    tmpPoints.push(tmpPoints2[i]);
                }
                if(e.point)
                    tmpPoints.push(e.point);
            }
            else if(this._startPoint && this._endPoint){
                tmpPoints = [this._startPoint, this._endPoint, e.point];
            }
            else{
                return;
            }
            
            var resObj, units = this._map.getUnits().toLowerCase();
            if(units == 'dd' || units == 'degrees')
                resObj = this._getAreaBylonlat(tmpPoints);
            else
                resObj = this._getFitArea(tmpPoints);
                
            content = '<span>总面积：<span class="leaflet_measure_dis">'+resObj.len+'</span>' + resObj.units + '<sup>2</sup></span>';
            content += '<br>';
            content += '<span class="leaflet_measure_opinfo">单击确定地点，双击结束</span>';
            this._infoLabel.setContent(content);
        }
    },
    
    _onDrawEnd: function (e) {
        if(e.point && this._map){
            var content = "";
            if(!this._drawnFeature){
                content = "总面积： 0 米<sup>2</sup>";
            }
            else{
                var tmpPoints = this._drawnFeature.getPoints();
                
                var resObj, units = this._map.getUnits().toLowerCase();
                if(units == 'dd' || units == 'degrees')
                    resObj = this._getAreaBylonlat(tmpPoints);
                else
                    resObj = this._getFitArea(tmpPoints);
                    
                content = '<span>总面积：<span class="leaflet_measure_dis">'+resObj.len+'</span>' + resObj.units + '<sup>2</sup></span>';
                
            }
            //var tmpPoint = new L.Ols.Point(e.point);
            var marker = new L.Ols.Marker(e.point,{
                                            markerAnchor: new L.Loc(-8,6), 
                                            clickable:true,
                                            shadowUrl:null,
                                            markerSize: new L.Loc(14,14),
                                            imgUrl: L.Icon.Default.imagePath + 'close.gif',
                                            draggable:false,
                                            zIndexOffset:9999
                                            });
            var tmpLabel = new L.Ols.Label(e.point, {offset: new L.Loc(0,8),content:content, clickable:false, zIndexOffset:9999});
            
            //this._addOverlay(tmpPoint);
            this._addOverlay(marker);
            this._addOverlay(tmpLabel);
            marker.on("click", this._clearOverlays,this);
            marker.setTitle("单击删除此线路");
            marker._measureId = this._indexTag;
            tmpLabel.addClass(" leaflet_measure_label");
            if(this._infoLabel)
                this._infoLabel.setVisible(false);
            this._map.fire("measureend");
        }
        this._preMPoint = null;
    },
    
    _clearOverlays:function (e) {
        if(!e || !e.target)
            return;
        var marker = e.target;
            groupId = "measure_group_" + marker._measureId;
        if(this._overlays && this._overlays[groupId])
            for (var i in this._overlays[groupId]) {
                if (this._overlays[groupId].hasOwnProperty(i)) {
                    this._map.removeOverlays(this._overlays[groupId][i]);
                    this._overlays[groupId][i] = null;
                    delete this._overlays[groupId][i];
                }
            }
    },
    
    _onMouseMove2: function (e) {
        if(!this._infoLabel){
            this._infoLabel = new L.Ols.Label(e.point, {offset: new L.Loc(18,18)});
            this._map.addOverlays(this._infoLabel);
            this._infoLabel.addClass(" leaflet_measure_label");
            this._infoLabel.setContent("单击确定地点");
        }
        else
            this._infoLabel.setPosition(e.point);
        if(this._infoLabel)
            this._infoLabel.setVisible(true);
    }
});

L.HandlerHash = {
    drag: L.Map.Drag,
    doubleclickzoom: L.Map.DoubleClickZoom,
    scrollwheelzoom: L.Map.WheelZoom,
    drawpoint:L.Map.DrawPoint,
    drawline:L.Map.DrawLine,
    drawpolygon:L.Map.DrawPolygon,
    drawrect:L.Map.DrawRect,
    drawcircle:L.Map.DrawCircle,
    drawsector:L.Map.DrawSector,
    drawmarker:L.Map.DrawMarker,
    zoomboxin:L.Map.ZoomBoxHandler,
    zoomboxout:L.Map.ZoomBoxHandler,
    touchzoom:L.Map.TouchZoom,
    measurelength:L.Map.MeasureLength,
    measurearea:L.Map.MeasureArea
    //boxZoom: L.Map.BoxZoom
};


L.Ols.EleBase.Drag = L.HandlerBase.extend({
    initialize: function (marker) {
        this._element = marker;
    },

    addHooks: function () {
        var moveTarget = this._element._getMoveTarget(),
            dragTarget = this._element._getDragTarget();
        if (!this._draggable)
            this._draggable = new L.Draggable(dragTarget, moveTarget);
		this._draggable
            .on('dragstart', this._onDragStart, this)
            .on('drag', this._onDrag, this)
            .on('dragend', this._onDragEnd, this);
        this._draggable.enable();
    },

    removeHooks: function () {
        this._draggable
                .off('dragstart', this._onDragStart, this)
                .off('drag', this._onDrag, this)
                .off('dragend', this._onDragEnd, this);
        this._draggable.disable();
    },

    moved: function () {
        return this._draggable && this._draggable._moved;
    },

    _onDragStart: function (e) {
        if(this._element._popup)
            this._element.closeDialog();
        this._element.fire('movestart')
            .fire('dragstart');
    },

    _onDrag: function (e) {
        var iconPos = L.Util.getPosition(this._element._getDragTarget());
        var iconPoint = this._element._map._absPixelToPoint(iconPos);
        if(this._element._onDragUpdate){
            this._element._onDragUpdate({absPixel:iconPos,
                                         point:iconPoint});
        }

        this._element
            .fire('move')
            .fire('drag');
    },

    _onDragEnd: function () {
        this._element
            .fire('moveend')
            .fire('dragend');
    }
});

L.Ols.Polygon.Edit = L.HandlerBase.extend({
    options: {
        // icon: new L.DivIcon({
            // iconSize: new L.Point(8, 8),
            // className: 'leaflet-div-icon leaflet-editing-icon'
        // })
    },

    initialize: function (poly, options) {
        this._feature = poly;
        L.Util.setOptions(this, options);
    },

    addHooks: function () {
        if (this._feature._map) {
            if (!this._markerGroup) {
                this._initDivAnchors();
            }
            this._feature._map.addLayer(this._markerGroup);
        }
    },

    removeHooks: function () {
        if (this._feature._map) {
            this._feature._map.removeLayer(this._markerGroup);
            delete this._markerGroup;
            delete this._markers;
        }
    },

    _updateDivAnchors: function () {
        this._markerGroup.clearOverlays();
        this._initDivAnchors();
    },

    _initDivAnchors: function () {
        this._markerGroup = new L.Layers.Overlay();
        this._markers = [];

        var latlngs = this._feature._points,
            i, j, len, marker;

        // TODO  holes 

        for (i = 0, len = latlngs.length; i < len; i++) {

            marker = this._createDivAnchor(latlngs[i], i);
            marker.on('click', this._onMarkerClick, this);
            this._markers.push(marker);
        }

        var markerLeft, markerRight;

        for (i = 0, j = len - 1; i < len; j = i++) {
            if (i === 0 && !(L.Ols.Polygon && (this._feature instanceof L.Ols.Polygon))) {
                continue;
            }

            markerLeft = this._markers[j];
            markerRight = this._markers[i];

            this._createMiddleDivAnchor(markerLeft, markerRight);
            this._updatePrevNext(markerLeft, markerRight);
        }
    },

    _createDivAnchor: function (latlng, index) {
        var tmpInfo = "拖动改变位置，点击删除节点";
        if(index == -2){
            tmpInfo = "拖动增加节点";
            delete index;
        }
        var marker = new L.Ols.EditAnchor(latlng, {
            draggable: true,title:tmpInfo
        });

        marker._featurePos = latlng;
        marker._index = index;

        marker.on('drag', this._onMarkerDrag, this);
        marker.on('dragend', this._fireEdit, this);

        if(!this._markerGroup)
            this._markerGroup = new L.Layers.Overlay();
        this._markerGroup.addOverlay(marker);

        return marker;
    },

    _fireEdit: function () {
        this._feature.fire('edit', {"feature":this._feature});
    },

    _onMarkerDrag: function (e) {
        var marker = e.target;

        L.Util.extend(marker._featurePos, marker._latlng);

        if (marker._middleLeft) {
            marker._middleLeft.setPosition(this._getMiddleLatLng(marker._prev, marker));
        }
        if (marker._middleRight) {
            marker._middleRight.setPosition(this._getMiddleLatLng(marker, marker._next));
        }

        this._feature.redraw();
    },

    _onMarkerClick: function (e) {
        if (this._feature._points.length <= 3) {
            return;
        }
        
        var marker = e.target,
            i = marker._index;
        
        if (marker._prev && marker._next) {
            this._createMiddleDivAnchor(marker._prev, marker._next);
            this._updatePrevNext(marker._prev, marker._next);
        }

        this._markerGroup.removeOverlay(marker);
        if (marker._middleLeft) {
            this._markerGroup.removeOverlay(marker._middleLeft);
        }
        if (marker._middleRight) {
            this._markerGroup.removeOverlay(marker._middleRight);
        }
        this._feature.removePoints(i, 1);
        this._updateIndexes(i, -1);
        this._feature.fire('edit', {"feature":this._feature});
    },

    _updateIndexes: function (index, delta) {
        this._markerGroup._iterateLayers(function (marker) {
            if (marker._index > index) {
                marker._index += delta;
            }
        });
    },

    _createMiddleDivAnchor: function (marker1, marker2) {
        var latlng = this._getMiddleLatLng(marker1, marker2),
            marker = this._createDivAnchor(latlng, -2),
            onClick,
            onDragStart,
            onDragEnd;

        marker.setOpacity(0.6);

        marker1._middleRight = marker2._middleLeft = marker;

        onDragStart = function () {
            var i = marker2._index;

            marker._index = i;

            marker
                .off('click', onClick)
                .on('click', this._onMarkerClick, this);

            this._feature.removePoints(i, 0, latlng);
            this._markers.splice(i, 0, marker);

            marker.setOpacity(1);

            this._updateIndexes(i, 1);
            marker2._index++;
            this._updatePrevNext(marker1, marker);
            this._updatePrevNext(marker, marker2);
        };

        onDragEnd = function () {
            marker.off('dragstart', onDragStart, this);
            marker.off('dragend', onDragEnd, this);

            this._createMiddleDivAnchor(marker1, marker);
            this._createMiddleDivAnchor(marker, marker2);
        };

        onClick = function () {
            onDragStart.call(this);
            onDragEnd.call(this);
            this._feature.fire('edit', {"feature":this._feature});
        };

        marker
            .on('click', onClick, this)
            .on('dragstart', onDragStart, this)
            .on('dragend', onDragEnd, this);

        this._markerGroup.addOverlay(marker);
    },

    _updatePrevNext: function (marker1, marker2) {
        marker1._next = marker2;
        marker2._prev = marker1;
    },

    _getMiddleLatLng: function (marker1, marker2) {
        var map = this._feature._map,
            p1 = map._pointToAbsPixel(marker1.getPosition()),
            p2 = map._pointToAbsPixel(marker2.getPosition());

        return map._absPixelToPoint(p1._add(p2).divideBy(2));
    }
});

L.Ols.Line.Edit = L.Ols.Polygon.Edit.extend({

    _updatePrevNext: function (marker1, marker2) {
        if(marker1)
            marker1._next = marker2 ? marker2 : null;
        if(marker2)
            marker2._prev = marker1 ? marker1 : null;
    },
    
    _onMarkerClick: function (e) {
        if (this._feature._points.length <= 2) {
            return;
        }
        
        var marker = e.target,
            i = marker._index;
        
        if (marker._prev && marker._next) {
            this._createMiddleDivAnchor(marker._prev, marker._next);
        }
        else{
            if(marker._prev){
                marker._prev._middleRight = null;
            }
            else if(marker._next){
                marker._next._middleLeft = null;
            }
        }
        this._updatePrevNext(marker._prev, marker._next);

        if (marker._middleLeft) {
            this._markerGroup.removeOverlay(marker._middleLeft);
        }
        if (marker._middleRight) {
            this._markerGroup.removeOverlay(marker._middleRight);
        }
        this._markerGroup.removeOverlay(marker);
        
        this._feature.removePoints(i, 1);
        this._updateIndexes(i, -1);
        this._feature.fire('edit', {"feature":this._feature});
    },
    
    _initDivAnchors: function () {
        this._markerGroup = new L.Layers.Overlay();
        this._markers = [];

        var latlngs = this._feature._points,
            i, j, len, marker;

        for (i = 0, len = latlngs.length; i < len; i++) {
            marker = this._createDivAnchor(latlngs[i], i);
            marker.on('click', this._onMarkerClick, this);
            this._markers.push(marker);
        }

        var markerLeft, markerRight;

        for (i = 1, j = 0; i < len; j = i++) {
            if (i === 0 && !(L.Ols.Line && (this._feature instanceof L.Ols.Line))) {
                continue;
            }

            markerLeft = this._markers[j];
            markerRight = this._markers[i];

            this._createMiddleDivAnchor(markerLeft, markerRight);
            this._updatePrevNext(markerLeft, markerRight);
        }
    }
});

L.Ols.Rect.Edit = L.Ols.Polygon.Edit.extend({
    _initDivAnchors: function () {
        this._markerGroup = new L.Layers.Overlay();
        this._markers = [];

        var latlngs = this._feature._points,
            i, j, len, marker;

        for (i = 0, len = latlngs.length; i < len; i++) {
            marker = this._createDivAnchor(latlngs[i], i);
            this._markers.push(marker);
        }

    },

    _createDivAnchor: function (latlng, index) {
        var marker = new L.Ols.EditAnchor(latlng, {
            draggable: true
        });

        marker._featurePos = latlng;
        marker._index = index;

        marker.on('drag', this._onMarkerDrag, this);
        marker.on('dragend', this._fireEdit, this);

        this._markerGroup.addOverlay(marker);

        return marker;
    },

    _fireEdit: function () {
        this._feature.fire('edit', {"feature":this._feature});
    },

    _onMarkerDrag: function (e) {
        var marker = e.target;
        var index = marker._index;
        if(index === 0 || index === 1){
            this._updateVertics(0, marker, "x");
            this._updateVertics(1, marker, "x");
        }
        else{
            this._updateVertics(2, marker, "x");
            this._updateVertics(3, marker, "x");
        }
        if(index === 0 || index === 3){
            this._updateVertics(0, marker, "y");
            this._updateVertics(3, marker, "y");
        }
        else{
            this._updateVertics(1, marker, "y");
            this._updateVertics(2, marker, "y");
        }
        
        this._feature.redraw();
    },
    
    _updateVertics: function (index, marker, key) {
        if(!this._markers)
            return;
        this._markers[index]._latlng[key] = marker._latlng[key];
        this._markers[index]._update();
        this._markers[index]._featurePos[key] = marker._latlng[key];
    }
});

L.Ols.Circle.Edit = L.Ols.Polygon.Edit.extend({
    _initDivAnchors: function () {
        this._markerGroup = new L.Layers.Overlay();
        this._markers = [];
        var center = this._feature.getPosition(),
            radius = this._feature._getFitRadius();

        var centerMarker = this._createDivAnchor(center, 0);
        this._markers.push(centerMarker);
        var radiusMarker = this._createDivAnchor(new L.Loc(center.x + radius, center.y), 1);
        this._markers.push(radiusMarker);
    },

    _createDivAnchor: function (latlng, index) {
        var marker = new L.Ols.EditAnchor(latlng, {
            draggable: true
        });

        marker._featurePos = latlng;
        marker._index = index;

        marker.on('drag', this._onMarkerDrag, this);
        marker.on('dragend', this._fireEdit, this);

        this._markerGroup.addOverlay(marker);

        return marker;
    },

    _fireEdit: function () {
        this._feature.fire('edit', {"feature":this._feature});
    },

    _onMarkerDrag: function (e) {
        var center , marker = e.target;
        var index = marker._index,
            radius = this._feature._getFitRadius();
        if(index === 0){
            center = marker._latlng;
            this._feature.setPosition(center);
            this._markers[1].setPosition(new L.Loc(center.x + radius, center.y));
        }
        else if(index === 1){
            var radius = this._markers[0]._latlng.distanceTo(marker._latlng);
            this._feature.setRadius(radius, this._feature._map.getUnits());
        }
        this._feature.redraw();
    },
    
    _updateVertics: function (index, marker, key) {
        if(!this._markers)
            return;
        this._markers[index]._latlng[key] = marker._latlng[key];
        this._markers[index]._update();
        this._markers[index]._featurePos[key] = marker._latlng[key];
    }

});

L.Ols.Point.Edit = L.Ols.Circle.Edit.extend({
    _initDivAnchors: function () {
        this._markerGroup = new L.Layers.Overlay();
        this._markers = [];
        var center = this._feature.getPosition(),
            radius = this._feature._getFitRadius();

        var centerMarker = this._createDivAnchor(center, 0);
        this._markers.push(centerMarker);
      
    }
});

L.Ols.Pies = L.Ols.Circle.extend({
	_options: {
        fill: true,
        _labelContent: false,
		offset: new L.Loc(20,0),
		labelpart:{
			color: 'dimgrey',
			fontSize: '12px',
			fontFamily:'arial'
		},
		labelmarker:{
			color: 'dimgrey',
			fontSize: '12px',
			fontFamily:'arial'
		}
    },
	_color:['#FFC125','#00CD00','#FF00FF','#C0FF3E','#9400D3'],
    _type:"L.Ols.Pies",
    /**
     * @constructor
     * @name L.Ols.Pies
     * @description 创建饼对象
     * @param {L.Loc} latlng 饼状图中心点坐标
     * @param {Number} radius 饼状图半径大小
	 * @param {object} parts 饼状图划分，格式如：{'aa':20,'bb':40,'cc':30,'dd':20}
     * @param {L.Ols.PolygonOptions} options 饼状图构造函数的参数选项，参见<L.Ols.PolygonOptions>
     */
	 initialize: function (latlng, radius, parts, options) {
		this.options = L.Util.extend({}, this._options, options);
		this.options = L.Util.extend({}, L.Ols.PolygonOptions, this.options);
        this._latlng = latlng;
        this._mRadius = radius;
		this._parts = parts;
	 },
      
    /**
     * @function
     * @name getPosition
     * @description 获取饼状图对象中心点坐标
     * @return {L.Loc} 中心点坐标
     */
    getCenterPosition: function () {
        return this._latlng;
    },
    
    /**
     * @function
     * @name setPosition
     * @description 设置饼状图对象中心点坐标
     * @param {L.Loc} center 中心点坐标
     */
    setCenterPosition: function (latlng) {
        this._latlng = latlng;
		return this.redraw();
    },
    
    toAbsPixels: function () {
		var lngRadius = this._getFitRadius(),
				latlng2 = new L.Loc(this._latlng.x, this._latlng.y - lngRadius),
				point2 = this._map._pointToAbsPixel(latlng2);
		this._point = this._map._pointToAbsPixel(this._latlng);
		this._radius = Math.round(Math.abs(this._point.y - point2.y));
    },
	
	setPartLabelStyle:function (style) {
		var stylenew = this.options.labelpart;
		for(var key in style){
			if(stylenew.hasOwnProperty(key))
				stylenew[key] = style[key]
		}
		this.options.labelpart = stylenew;
		
		if(this._pathLabels){
			for(var i = this._pathLabels.length; i > 0; i-- ){
				var label = this._pathLabels[i-1];
				if(L.Util.Browser.svg || !L.Util.Browser.vml){
					label.setAttribute('fill', stylenew.color);
					label.setAttribute('font-size', stylenew.fontSize);
					label.setAttribute('font-family', stylenew.fontFamily);
				}else{
					label.style.color = stylenew.color;
					label.style.fontSize = stylenew.fontSize;
					label.style.fontFamily = stylenew.fontFamily;
				}
			}
		}
	},
	
	setMarkLabelStyle:function (style) {
		var stylenew = this.options.labelmarker;
		for(var key in style){
			if(stylenew.hasOwnProperty(key))
				stylenew[key] = style[key]
		}
		this.options.labelmarker = stylenew;
		
		if(this._markerLabels){
			for(var i = this._markerLabels.length; i > 0; i-- ){
				var mlObj = this._markerLabels[i-1]['label'];
				if(L.Util.Browser.svg || !L.Util.Browser.vml){
					mlObj.setAttribute('fill', stylenew.color);
					mlObj.setAttribute('font-size', stylenew.fontSize);
					mlObj.setAttribute('font-family', stylenew.fontFamily);
				}else{
					mlObj.style.color = stylenew.color;
					mlObj.style.fontSize = stylenew.fontSize;
					mlObj.style.fontFamily = stylenew.fontFamily;
				}	
			}
		}
	},
	
	setPartMarkerOffset:function (pos) {
		if(pos && pos instanceof L.Loc){
			this.options.offset = pos;
			if(this._markerLabels)
				this._updatePosition();
		}
	},
	
	_updatePosition: function(){
		var marginx = this.options.offset.x, marginy = this.options.offset.y;
		var p = this._point,
			r = this._radius,
			spoint = new L.Loc(p.x + r, p.y);
			
		for(var i = 0, j = this._markerLabels.length; i < j; i++ ){
			if(i == 0 ){
				var x = marginx, y = marginy,//marker图标距饼状图的偏移量
				w = r/6, h = r/8,//每个marker的宽和高
				space = r/10;//上下两个marker之间的距离
			}
			else{
				y += h + space;
			}
			if(w>20){
				w = 20, h = 15, space =12 ;
			}
			var x1 = spoint.x + x;
			var y1 = spoint.y + y;
			
			var x2 = x1 + w, y2 = y1;
			var x3 = x2, y3 = y2 + h;
			var x4 = x1, y4 = y1 + h;
			var strs = '';
			if(L.Util.Browser.svg || !L.Util.Browser.vml){
				strs = 'M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2 + 'L' + x3 + ',' + y3 + 'L' + x4 + ',' + y4 + 'Z';
				this._markerLabels[i]['marker'].setAttribute('d', strs);
				
				this._markerLabels[i]['label'].setAttribute('x', x2+space);
				this._markerLabels[i]['label'].setAttribute('y', y2+space);
				
			}else{
				var aa = new L.Loc(x1,y1);
				var bb = new L.Loc(x2,y2);
				var cc = new L.Loc(x3,y3);
				var dd = new L.Loc(x4,y4);
				aa._round();
				bb._round();
				cc._round();
				dd._round();
				strs = 'M' + aa.x + ',' + aa.y + 'L' + bb.x + ',' + bb.y + 'L' + cc.x + ',' + cc.y + 'L' + dd.x + ',' + dd.y + 'x';
				
				this._markerLabels[i]['marker'].v = strs + ' ';
				this._markerLabels[i]['label'].style.left = w + space +'px';
			}
		}
	},
	
	_updatePath: function () {
		var p = this._point,
			r = this._radius,
			spoint = new L.Loc(p.x + r, p.y);
			
		if(this._parts && this._parts.length < 2){
			var str = this.getPathString();
			if (!str) {
				str = 'M0 0';
			}
			this._path.setAttribute('d', str);
		}else{
			var sum = 0 ,j = 0, i = 0;
			for(var key in this._parts){
				if(this._parts.hasOwnProperty(key)){
					sum += this._parts[key];
					j++;
				}
			}

			var part, degree, sdegree, edegree, sp = spoint , ep, point2, midpoint;
			
			if(!this._pathadds)
				this._pathadds = [];
			if(!this._pathLabels)
				this._pathLabels = [];
			if(!this._markerLabels)
				this._markerLabels = [];	
			
			var offset = this.options.offset, marginx = offset.x, marginy = offset.y;
			//var anchorx = this.options.anchor.x, anchory = this.options.anchor.y;//anchor.x 表示图标中marker 与label之间的距离差
			for(var key in this._parts){
				part = parseFloat(this._parts[key])/sum;
				if(i == 0){
						degree = part * 360;
						sdegree = 360;	
				}else{
					sdegree = edegree;
					degree += part* 360;
					sp = ep;
				}
				edegree = 360 - degree;
				ep = new L.Loc(p.x+Math.cos(degree/180*Math.PI)*r,p.y+Math.sin(degree/180*Math.PI)*r);
				
				midpoint = new L.Loc((sp.x+ep.x)/2,(sp.y+ep.y)/2);
				
				var str = this.getPathString1(sp,ep,sdegree,edegree);
				if (!str) {
					str = 'M0 0';
				}
				var len1 = this._color.length,
					corlen = i;
				if(i > len1-1)
					corlen = i%len1;
					
				var len = this._pathadds.length;
				// svg 
				if(L.Util.Browser.svg || !L.Util.Browser.vml){
					if(i == 0){
						this._path.setAttribute('stroke-width', 1);
						this._path.setAttribute('fill', this._color[corlen]);
						this._path.setAttribute('d', str);
					}else{
						if(len < j-1){
							var pathadd = this._createElement('path');
							this.initStyle1(pathadd);
							
							pathadd.setAttribute('fill', this._color[corlen]);
							pathadd.setAttribute('stroke-width', 1);
							this._container.appendChild(pathadd);
							pathadd.setAttribute('d', str);
							this._pathadds.push(pathadd);
						}else{
							this._pathadds[i-1].setAttribute('d', str);
						}
					}
				}else{	// vml
					if(i == 0){
						var style = this._container.style;
						////针对IE浏览器
						var value = this.getVisible();
						var dis = value ? 'block' : 'none';
						style.display = 'none';
						this._path.v = str + ' '; 
						style.display = dis;
						this._stroke.weight = 1;
						this._fill.color = this._color[corlen];
						
					}else{
						if(len < j-1){
							var container = this._createElement('shape');
							container.className += ' leaflet-vml-shape' +
								(this.options.clickable ? ' leaflet-clickable' : '');
							container.coordsize = '1 1';

							var pathadd = this._createElement('path');
							container.appendChild(pathadd);
							
							this._initStyle2(container,{'fillColor':this._color[corlen],'strokeWidth':1});
							this._map._pathRoot.appendChild(container);
							pathadd.v = str + ' ';
							this._pathadds.push(container);	
						}else{
							var path  = this._pathadds[i-1].firstChild;
							path.v = str + ' ';
						}
					}
				}
				
				
				
				////add  pathlabel 和 图例
				if(i == 0 ){
					var x = marginx, y = marginy,//marker图标距圆饼图的偏移量
						w = r/6, h = r/8,//每个marker的宽和高
						space = r/10;//上下两个marker之间的距离
				}
				else{
					y += h + space;
				}
				if(w>20){
					w = 20, h = 15, space =12 ;
				}
				var x1 = spoint.x + x;
				var y1 = spoint.y + y;
				
				var x2 = x1 + w, y2 = y1;
				var x3 = x2, y3 = y2 + h;
				var x4 = x1, y4 = y1 + h;
					
				var labellen = this._pathLabels.length, strs;
				if(L.Util.Browser.svg || !L.Util.Browser.vml){
					
					strs = 'M'+x1+','+y1+'L'+x2+','+y2+'L'+x3+','+y3+'L'+x4+','+y4+'Z';
					if(labellen < j ){
						/*******marker******/
						if(this.options._labelContent) {
							var marker = this._createElement('path');
							this.initStyle1(marker);
									
							marker.setAttribute('fill', this._color[corlen]);
							marker.setAttribute('stroke-width', 1);
							this._container.appendChild(marker);
							
							var text = this._createElement('text');
							text.textContent = key;
							this._container.appendChild(text);
							this._markerLabels.push({'marker':marker,'label':text});
						}
						
						/*******pathlabel******/
						// var text = this._createElement('text');
						// text.textContent = Math.round(part*100)+'%';
						// text.setAttribute('dx', '-18');
						// text.setAttribute('dy', '3');
						// this._container.appendChild(text);
						// this._pathLabels.push(text);
					}
					
					// this._pathLabels[i].setAttribute('x', r/2);
					// this._pathLabels[i].setAttribute('y', r/2);
					// this._pathLabels[i].setAttribute('fill', this.options.labelpart.color);
					// this._pathLabels[i].setAttribute('font-size', this.options.labelpart.fontSize);
					// this._pathLabels[i].setAttribute('font-family', this.options.labelpart.fontFamily);
					
					if(this._markerLabels && this._markerLabels.length > 0){
						this._markerLabels[i]['marker'].setAttribute('d', strs);
						
						this._markerLabels[i]['label'].setAttribute('x', x3+space);
						this._markerLabels[i]['label'].setAttribute('y', y3);
						this._markerLabels[i]['label'].setAttribute('fill', this.options.labelmarker.color);
						this._markerLabels[i]['label'].setAttribute('font-size', this.options.labelmarker.fontSize);
						this._markerLabels[i]['label'].setAttribute('font-family', this.options.labelmarker.fontFamily);
					}
				}else{
					var aa = new L.Loc(x1,y1);
					var bb = new L.Loc(x2,y2);
					var cc = new L.Loc(x3,y3);
					var dd = new L.Loc(x4,y4);
					aa._round();
					bb._round();
					cc._round();
					dd._round();
					strs = 'M'+aa.x+','+aa.y+'L'+bb.x+','+bb.y+'L'+cc.x+','+cc.y+'L'+dd.x+','+dd.y+'x';
					
					if(!this._markerLabelsCon)
						this._markerLabelsCon = [];
					
					if(labellen < j ){
					
						/*******marker******/
						if(this.options._labelContent) {
							var container = this._createElement('shape');
							container.className += ' leaflet-vml-shape' +
							(this.options.clickable ? ' leaflet-clickable' : '');
							container.coordsize = '1 1';

							var pathadd = this._createElement('path');
							container.appendChild(pathadd);
								
							this._initStyle2(container,{'fillColor':this._color[corlen],'strokeWidth':1});
							this._map._pathRoot.appendChild(container);
							this._markerLabelsCon.push(container);
							
							var text = this._createElement('v:textbox');
							text.innerHTML = key;'<table><tr><td>'+key+'</td></tr></table>'
							container.appendChild(text);
							this._markerLabels.push({'marker':pathadd,'label':text});
						}
						/*******pathlabel******/
						// text = this._createElement('v:textbox');
						// text.innerHTML = Math.round(part*100)+'%';
						// if(i == 0) 
							// this._container.appendChild(text);
						// else
							// this._pathadds[i-1].appendChild(text);
						// this._pathLabels.push(text);
						
					}
					
					// this._pathLabels[i].style.left = r/2 +'px';
					// this._pathLabels[i].style.top = r/2 +'px';
					// this._pathLabels[i].style.color  = this.options.labelpart.color;
					// this._pathLabels[i].style.fontSize  = this.options.labelpart.fontSize;
					// this._pathLabels[i].style.fontfamily  = this.options.labelpart.fontFamily;
					
					if(this._markerLabels && this._markerLabels.length > 0){
						this._markerLabels[i]['marker'].v = strs + ' ';
						var h1 = this._markerLabels[i]['label'].clientHeight;
						this._markerLabels[i]['label'].style.left = w + space +'px';
						this._markerLabels[i]['label'].style.top = (h-h1)/2 +'px';
						
						this._markerLabels[i]['label'].style.color  = this.options.labelmarker.color;
						this._markerLabels[i]['label'].style.fontSize  = this.options.labelmarker.fontSize;
						this._markerLabels[i]['label'].style.fontfamily  = this.options.labelmarker.fontFamily;
					}
				}
                i++;
            }
		}
    },
	
	getPathString1: function (sp,ep,sdegree,edegree) {
		var p = this._point,arc,
            r = this._radius;
		 if (this._checkIfEmpty()) {
            return '';
        }
        if((sdegree - edegree + 360)%360<180){
				arc = 0;//小弧度
        }else{
            arc = 1;//大弧度
        }
		if (L.Util.Browser.svg) {
			var flag = 1;
			return "M " + p.x + "," + p.y +"L " + sp.x + "," + sp.y+
						"A " + r + "," + r + ",0,"+arc+","+flag+"," +
						ep.x  + "," + ep.y;
		}else {
			p._round();
            sp._round();
            ep._round();
            r = Math.round(r);
            sd = Math.round(sdegree);
            ed = Math.round(edegree);
		
			var n = (sd - ed + 360)%360;
            return "M " + p.x + "," + p.y + " L " + ep.x + "," + ep.y +  " AE " + p.x + "," + p.y + ", " + r + "," + r + ", " + (65535 * ed) + "," + (65535 * n);
		}
	},
	initStyle1: function (path) {
        if (this.options.stroke) {
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-linecap', 'round');
        }
        if (this.options.fill) {
            path.setAttribute('fill-rule', 'evenodd');
        }
        this._updateStyle1(path);
    },

    _updateStyle1: function (path) {
        if (this.options.stroke) {
            path.setAttribute('stroke', this.options.strokeColor);
            path.setAttribute('stroke-opacity', this.options.strokeOpacity);
            path.setAttribute('stroke-width', this.options.strokeWidth);
            path.setAttribute('stroke-dasharray', this._dashStyle1(this.options, 1));
        } else {
            this._path.setAttribute('stroke', 'none');
        }
        if (this.options.fill) {
            path.setAttribute('fill', this.options.fillColor || this.options.color);
            path.setAttribute('fill-opacity', this.options.fillOpacity);
        } else {
            path.setAttribute('fill', 'none');
        }
    },

    _dashStyle1: function(style, widthFactor) {
        var w = style.strokeWidth * widthFactor;
        var str = style.strokeStyle;
        switch (str) {
            case 'solid':
                return 'none';
            case 'dot':
                return [1, 4 * w].join();
            case 'dash':
                return [4 * w, 4 * w].join();
            case 'dashdot':
                return [4 * w, 4 * w, 1, 4 * w].join();
            case 'longdash':
                return [8 * w, 4 * w].join();
            case 'longdashdot':
                return [8 * w, 4 * w, 1, 4 * w].join();
            default:
                return 'none';
        }
    },
	 _initStyle2: function (container,style) {
        var container = container,
            stroke,
            fill;

        if (this.options.stroke) {
            stroke  = this._createElement('stroke');
            stroke.endcap = 'round';
            container.appendChild(stroke);
        }

        if (this.options.fill) {
            fill = this._createElement('fill');
            container.appendChild(fill);
        }
        this._updateStyle2(container,style);
    },

    _updateStyle2: function (container,style) {
        var stroke = container.childNodes[1],
            fill = container.lastChild,
            options = this.options,
			container = container;

        container.stroked = options.stroke;
        container.filled = options.fill;
		
        if (options.stroke) {
            stroke.weight  = style.strokeWidth? style.strokeWidth+ 'px' : options.strokeWidth + 'px';
            stroke.color   = style.strokeColor? style.strokeColor : options.strokeColor;
            stroke.opacity = style.strokeOpacity? style.strokeOpacity : options.strokeOpacity;
            stroke.dashstyle = style.strokeStyle? style.strokeStyle : options.strokeStyle;
        }

        if (options.fill) {
            fill.color   = style.fillColor? style.fillColor : options.fillColor || options.color;
            fill.opacity = style.fillOpacity? style.fillOpacity : options.fillOpacity;
        }
    },
    _unsetMap: function (map) {
        map = map || this._map;
        this.disableEdit();

        map._pathRoot.removeChild(this._container);
		if(this._pathadds && !(L.Util.Browser.svg || !L.Util.Browser.vml)){
			for(var i = this._pathadds.length; i > 0; i-- ){
				map._pathRoot.removeChild(this._pathadds[i-1]);
			}
			for( i = this._markerLabelsCon.length; i > 0; i-- ){
				map._pathRoot.removeChild(this._markerLabelsCon[i-1]);
			}
		}
		this._pathadds = null;
		this._pathLabels = null;
		this._markerLabels = null;
        map
            .off('viewreset', this.toAbsPixels, this)
            .off('moveend', this._updatePath, this);
        this._map = null;
    },
    _getEditClass: function () {
       // return L.Ols.Fan.Edit;
    }
});