
JSVMarker = L.Ols.BgMarker.extend({
	pan:90,
    initialize: function (lonlat, options) {
        this.options = L.Util.extend({}, JSVMarkerOptions, options);
        this._latlng = lonlat;
    },

	_eyeTarget:null,
    _createMarkerTarget: function () {
        var tmpDiv = L.Util.create('div', 'leaflet-marker-div');
		this._eyeTarget = L.Util.create('div', 'j-eye-div', tmpDiv);
        return tmpDiv;
    },
    _getDragTarget:function () {
        return this._eyeTarget;
    },
	
	enableDrag: function() {
        this.options.draggable = this.draggable = true;
        if(!this._map) return this;
		
		L.DomEvent.addListener(this._markerTarget, L.Draggable.START, this._onMarkerTargetDown, this);
		L.DomEvent.addListener(this._eyeTarget, L.Draggable.START, this._onEyeTargetDown, this);
		
        return this;
    },
	_onEyeTargetDown:function(e){
		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
            el = first.target;

        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);

        this._moved = false;
        if (this._moving) {
            return;
        }

        if (!L.Util.Browser.touch) {
            L.Util.disableTextSelection();
           // this._setMovingCursor();
        }

        //this._startPos = this._newPos = new L.Loc(this._markerTarget.offsetLeft, this._markerTarget.offsetTop);
        this._startPos = this._newPos = L.Util.getPosition(this._markerTarget);
        this._startPoint = new L.Loc(first.clientX, first.clientY);

        L.DomEvent.addListener(document, L.Draggable.MOVE, this._onEyeTargetMove, this);
        L.DomEvent.addListener(document, L.Draggable.END, this._onEyeTargetUp, this);
	},
	_onEyeTargetMove:function(e){
		if (e.touches && e.touches.length > 1) {
            return;
        }
		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);

        if (!this._moved && (first && this._startPoint && ((first.clientX != this._startPoint.x) || (first.clientY != this._startPoint.y)))) {
            this.fire('dragstart', {pixel: L.Util.getPosition(this._markerTarget)});
            this._moved = true;
        }
        this._moving = true;
		
		var newPoint = new L.Loc(first.clientX, first.clientY);
        this._newPos = this._startPos.add(newPoint).subtract(this._startPoint);
        
        this._updatePosition();
		
		var iconPos = L.Util.getPosition(this._markerTarget);
        var iconPoint = this._map._absPixelToPoint(iconPos);
		this._latlng = iconPoint;
		 
        L.DomEvent.stopPropagation(e);
	},
	
	_onEyeTargetUp:function(e){
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
            //this._restoreCursor();
        }

        L.DomEvent.removeListener(document, L.Draggable.MOVE, this._onEyeTargetMove, this);
        L.DomEvent.removeListener(document, L.Draggable.END, this._onEyeTargetUp,this);
        

        if (this._moved) {
            this.fire('dragend', {pixel:L.Util.getPosition(this._markerTarget)});
        }
        this._moving = false;
        L.DomEvent.stopPropagation(e);
        
	},
	
	_updatePosition: function () {
        this.fire('predrag', {pixel: L.Util.getPosition(this._markerTarget)});
        L.Util.setPosition(this._markerTarget, this._newPos);
        this.fire('drag', {pixel: this._newPos});
    },
	
	
	_onMarkerTargetDown:function(e){
		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
            el = first.target;

        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);

		var startPan = this.caculatePan(first.clientX, first.clientY);
		var curPan = this.getPan();
		var t1 = Math.abs(curPan - startPan);
		var t2 = 360 - Math.abs(startPan - curPan);
		var tmpPan = t1 > t2 ? t2 : t1;
		if(tmpPan > 60) 
			return;
		
		
        this._moved = false;
        if (this._moving) {
            return;
        }
		j_svMarker.dragTag = true;
        if (!L.Util.Browser.touch) {
            L.Util.disableTextSelection();
           // this._setMovingCursor();
        }
		
       // this._startPos = this._newPos = new L.Loc(this.dragDiv.offsetLeft, this.dragDiv.offsetTop);
        this._startPoint = new L.Loc(first.clientX, first.clientY);
	//	this._startSize = new L.Loc(this.panel.clientWidth, this.panel.clientHeight);
        L.DomEvent.addListener(document, L.Draggable.MOVE, this._onMarkerTargetMove, this);
        L.DomEvent.addListener(document, L.Draggable.END, this._onMarkerTargetUp, this);
	},
	_onMarkerTargetMove:function(e){
		if (e.touches && e.touches.length > 1) {
            return;
        }
		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);

        if (!this._moved && (first && this._startPoint && ((first.clientX != this._startPoint.x) || (first.clientY != this._startPoint.y)))) {
            this.fire('dragstart', {pixel: L.Util.getPosition(this._markerTarget)});
            this._moved = true;
        }
        this._moving = true;
		
		var newPoint = new L.Loc(first.clientX, first.clientY);
		//this._startPan = this.caculatePan(first.clientX, first.clientY);
		var curpan = this.caculatePan(first.clientX, first.clientY);
		this.setPan(curpan);
		
        L.DomEvent.stopPropagation(e);
	},
	_onMarkerTargetUp:function(e){
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
            //this._restoreCursor();
        }

        L.DomEvent.removeListener(document, L.Draggable.MOVE, this._onMarkerTargetMove, this);
        L.DomEvent.removeListener(document, L.Draggable.END, this._onMarkerTargetUp,this);
        

        if (this._moved) {
          //  this.fire('dragend', {pixel:L.Util.getPosition(this._markerTarget)});
        }
        this._moving = false;
        L.DomEvent.stopPropagation(e);
		j_svMarker.dragTag = false;
        
	},
	getPan:function(){
		return this.pan;
	},
	setPan:function(_pan){
		_pan = _pan % 360;
		if(_pan < 0) _pan += 360;
		this.pan = _pan;
		var tmpPan = 360-(_pan -90 + this._direction);
		this._tmpPan = tmpPan;
		this._updateMarker();
		if(this.dragTag){
			var flash = document.getElementById("viewportstreetview");
			if(!flash.jumpToView){
				var interval = setInterval(function(){
					try{
						if(flash.jumpToView){
							clearInterval(interval);
							flash.jumpToView(j_svMarker._tmpPan, j_svMarker._tmpTilt, j_svMarker._tmpfov);
							document.getElementById("viewport").style.display = "none";
						}
					}
					catch(ex){
					}
				}, 1000);
			}
			else
				flash.jumpToView(j_svMarker._tmpPan,j_svMarker._tmpTilt, j_svMarker._tmpfov);
		}
		//callPano("posed_4_pics000001");
	},
	caculatePan:function(x,y){
		var centerPixel = this._map.pointToPixel(this._latlng);
		var mapPos = L.Util.getViewportOffset(this._map._container);
		centerPixel.x += mapPos.x;
		centerPixel.y += mapPos.y;
		 
		var cx = centerPixel.x, cy = centerPixel.y;
		var dx = x - cx;
		var dy = cy - y;
		var tmpLen = Math.sqrt(dx * dx + dy * dy);
		var arc = Math.acos(dx / tmpLen);
		var arcJd = 180 / Math.PI * arc;
		if(dy < 0){
			arcJd = 360- arcJd;
		}
		return arcJd;
	},
    disableDrag: function(){
        this.options.draggable = this.draggable = false;
        if(!this._map) return this;
		L.DomEvent.removeListener(this._markerTarget, L.Draggable.START, this._onMarkerTargetDown);
		L.DomEvent.removeListener(this._eyeTarget, L.Draggable.START, this._onEyeTargetDown);
		
        return this;
    },

	_update: function (bMarkerUpdate) {
		L.Ols.BgMarker.prototype._update.call(this, bMarkerUpdate);
     
        var pos = this._map._pointToAbsPixel(this._latlng).round();
        //L.Util.setPosition(this._eyeTarget, pos);
       
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
				var curSecPan = parseInt(this.pan / 30) * 30;
				var offIndex = 0;
				if(curSecPan <= 90){
					offIndex = (90 - curSecPan)/ 30;
				}
				else{
					offIndex = (360 - curSecPan)/ 30 + 3;
				}
				offset.y = 42 + (offIndex * 138);
                this._markerTarget.style.backgroundPosition = (-offset.x)  + "px " + (-offset.y) + "px"; 
            }
            this._markerTarget.style.zIndex = markerZIndex;
            this._markerTarget.title =this.options.markerTitle;
            
        }
    
	}

});

/**
 * @class
 * @name L.Ols.BgMarkerOptions
 * @description 此类表示NSpriteMarker构造函数的可选参数。它没有构造函数，但可通过对象字面量形式表示。
 */
JSVMarkerOptions = {
    /**
     * @name imgUrl
     * @type {String} 
     * @description 标注所使用图片的地址
     */
    imgUrl: L.Icon.Default.imagePath + 'sv.png',
    
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
    markerSize: new L.Loc(60, 60),
    
    /**
     * @name imgOffset
     * @type {L.Loc} 
     * @description 标注所使用的图标与背景图片左上点的相对偏移量(以像素为单位)
     */
    imgOffset: new L.Loc(39,42),
    visible: true,
    /**
     * @name markerAnchor
     * @type {L.Loc} 
     * @description 标注图片相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    markerAnchor: new L.Loc(30, 30),
   
   
    
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
    clickable: false,
    
    /**
     * @name draggable
     * @type {Boolean} 
     * @description 是否设置标注可拖动
     */
    draggable: true,
    zIndexOffset: 0
};

JCameraMarker = L.Ols.BgMarker.extend({
	initialize: function (lonlat, options) {
        this.options = L.Util.extend({}, {
			imgUrl: L.Icon.Default.imagePath + 'camera.png',
			shadowUrl: '',
			markerSize: new L.Loc(17, 15),
			shadowSize: new L.Loc(27, 18),
			imgOffset: new L.Loc(26,22),
			visible: true,
			markerAnchor: new L.Loc(8, 8),
			shadowAnchor: new L.Loc(9, 18),
			popupAnchor: new L.Loc(0, -8),
			markerTitle: '',
			popable:true,
			clickable: true,
			draggable: false,
			zIndexOffset: 0
		}, options);
        this._latlng = lonlat;
    },

    _createMarkerTarget: function () {
        var tmpDiv = L.Util.create('div', 'leaflet-marker-div leaflet-camera-div');
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
            
            this._markerTarget.title =this.options.markerTitle;
            
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


JToggleControl = L.Controls.Base.extend({
	_type : "JToggleControl",
	options: {
		position:"topleft",
		posxy:new L.Loc(60,3)
	},
	initialize: function (options) {
        L.Util.setOptions(this, options);
    },
	_initContainer: function() {
        var map = this._map;
        var className = 'j-libs-control-toggle',
            container = L.Util.create('div', className);
        this._container = container;
        L.Util.stamp(this._container);
		var htmlStr = '<input type=button class=\"btn\" value=\"矢 量\" onclick=\"j_changeLayers(\'vec\');\" />';
		htmlStr += '<input type=button class=\"btn\" value=\"影 像\" onclick=\"j_changeLayers(\'img\');\" />';
		this._container.innerHTML = htmlStr;
		
        
        return container;
    }
});

JLengendControl = L.Controls.Base.extend({
	_type : "JLengendControl",
	options: {
		position:"bottomleft",
		posxy:new L.Loc(-10,0),
		width:200,
		height:150,
		togglebtnsize:20,
		src:"",
		border:3
	},
	initialize: function (options) {
        L.Util.setOptions(this, options);
    },
	_initContainer: function() {
        var map = this._map;
        var className = 'j-libs-control-lengend',
            container = L.Util.create('div', className);
        this._container = container;
		this._container.style.width = this.options.width +  this.options.border + "px";
		this._container.style.height = this.options.height + this.options.border + "px";
		
		this._img = L.Util.create('img', 'contentimg', this._container);
		this._img.style.width = this.options.width + "px";
		this._img.style.height = this.options.height + "px";
		this._img.src =  this.options.src;
	   
        this._img2 = L.Util.create('img', 'togglebtn', this._container);
		this._img2.src = "./images/show_hide.png";
		
		this._opened = true;
		L.DomEvent.addListener(this._img2, "click", this.toggleLegend, this);
        return container;
    },
	
	toggleLegend:function(e){
		if(this._opened){
			this._img2.src = "./images/show_hide2.png";
			this._container.style.width = this.options.togglebtnsize +  this.options.border + "px";
			this._container.style.height = this.options.togglebtnsize + this.options.border + "px";
			this._img.style.display = "none";
			this._opened = false;
		}
		else{
			this._img2.src = "./images/show_hide.png";
			this._img.style.display = "";
			this._container.style.width = this.options.width +  this.options.border + "px";
			this._container.style.height = this.options.height + this.options.border + "px";
		
			this._opened = true;
		}
	},
	
	setImgSrc: function(rsc){
		this.options.src = rsc;
		if(this._img)
			this._img.src =  this.options.src;
	}
});

JToolBarControl = L.Controls.Base.extend({
	_type : "JToolBarControl",
	options: {
		position:"topright",
		posxy:new L.Loc(0,0)
	},
	initialize: function (options) {
        L.Util.setOptions(this, options);
    },
	_initContainer: function() {
        var map = this._map;
        var className = 'j-libs-control-tools',
            container = L.Util.create('div', className);
        this._container = container;
        L.Util.stamp(this._container);
		var htmlStr = '<div><ul>'+
						'<li><img src="./images/i_draw_point.png"  onclick="j_map.setMode(\'drawMarker\');"/></li>'+
						'<li><img src="./images/i_draw_poly.png"  onclick="j_map.setMode(\'drawPolygon\');"/></li>'+
						'<li><img src="./images/i_draw_rect.png"  onclick="function(e){j_map.setMode(\'drawRect\');L.DomEvent.stopPropagation(e);}"/></li>'+
					  '</ul><div>';
		this._container.innerHTML = htmlStr;
		
        
        return container;
    }
});

JTDTToggleLayer = L.Layers.WMTS.extend({
    _rightAlias:false,
    serviceMode: "KVP",
    
	
	
    initialize: function(name, url, options){
        L.Layers.WMTS.prototype.initialize.call(this, name, url, options);
        this.layerType = "JTDTToggleLayer";
        this.setUrl(url);
    },
    
    toggleArr:[
		{
			url:"http://15.35.229.20/tileservice/SDMap2000",
			minLevel:1,
			maxLevel:17,
			format:"tiles",
			layer:"0",
			style:"default",
			tileMatrixSet:"SDMap2000",
			maxExtent:new L.Extent(114.229839088925,33.9389305555556,123.400530149205,38.904819444444)
		},
		{
			url:"http://15.17.144.2:8719/newmap/tianditu/LiaochengData/14yingxiang/wmts",
			minLevel:11,
			maxLevel:17,
			format:"image/png",
			layer:"14年影像",
			style:"Default",
			tileMatrixSet:"Matrix_0",
			maxExtent:new L.Extent(116.108525,36.36685555489, 116.248332,36.46117644511)
		}
	],
    
    _getTileUrl: function (z, y, x) {
		var res = this._map.getResolution();
		if(this._localObj && this._localObj.extent && z >= this._localObj.minZ && z <= this._localObj.maxZ){
			var _minXId = Math.floor((this._localObj.extent.minX - this.tileOrigin.x) / tileWidth),
			_minYId = Math.floor((this.tileOrigin.y - this._localObj.extent.maxY) / tileHeight),
			_maxXId = Math.floor((this._localObj.extent.maxX - this.tileOrigin.x) / tileWidth),
			_maxYId = Math.floor((this.tileOrigin.y - this._localObj.extent.minY) / tileHeight);
			
			if(x >= _minXId && x <= _maxXId && y >= _minYId && y <= _maxYId){
				var localUrl = this._localObj.url;
				localUrl += "/" + z + "_" + x + "_" + y + this._localObj.ext;
				return encodeURI(localUrl);
			}
		}
		var len = this.toggleArr.length;
		var curIndex = 0, tmpOption;
		for(var i = len - 1; i >=0; i--){
			tmpOption = this.toggleArr[i];
			if(z >= tmpOption.minLevel){
				curIndex = i;
				break;
			}
		}
		if(curIndex > 0){
			
			var tileWidth = 256 * res;
			var tileHeight = tileWidth;
			var bounds = this.toggleArr[curIndex].maxExtent;
			var minXId = Math.floor((bounds.minX - this.tileOrigin.x) / tileWidth),
			minYId = Math.floor((this.tileOrigin.y - bounds.maxY) / tileHeight),
			maxXId = Math.floor((bounds.maxX - this.tileOrigin.x) / tileWidth),
			maxYId = Math.floor((this.tileOrigin.y - bounds.minY) / tileHeight);
			
			if(x < minXId || x > maxXId || y < minYId || y > maxYId){
				curIndex -= 1;
			}
			
		}
		
		
        if(!this.url)
            return null;
        var resultUrl = this.toggleArr[curIndex].url;
		
        if(this.getServiceMode() == "KVP"){
            if(!this._wmtsUrlParams && (resultUrl.charAt(resultUrl.length - 1) != "?"))
            resultUrl += '?';
            var key, params = {
                SERVICE: "WMTS",
                REQUEST: "GetTile",
                VERSION: this.version,
                LAYER: this.toggleArr[curIndex].layer,
                STYLE: this.toggleArr[curIndex].style,
                TILEMATRIXSET: this.toggleArr[curIndex].tileMatrixSet,
                TILEMATRIX: z,
                TILEROW: y,
                TILECOL: x,
                FORMAT: this.toggleArr[curIndex].format
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
            resultUrl += this.toggleArr[curIndex].layer + '/' + this.toggleArr[curIndex].style+ '/' + this.toggleArr[curIndex].tileMatrixSet + "/" +z + '/' + y + "/" + x + '.' + this.getFormat(null, false); 
        }
            
        return encodeURI(resultUrl);
    }
});
