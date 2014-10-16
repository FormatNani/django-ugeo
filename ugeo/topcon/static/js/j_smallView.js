 /**************************************
********控制街景小地图的类*************
***************************************/
var j_svMarker = null;
var j_svClickMarker = null;
var j_tmpLoc = new L.Loc(12971392, 4834169);

function viewChanged(loadedId, tmpPan, tmpTilt, tmpfov, latitude, longitude, direction){
	if(j_svMarker.dragTag)
		return;
	j_svMarker.setPan(360-tmpPan-direction+90);
	j_svMarker._direction = direction;
	j_svMarker._tmpTilt = tmpTilt;
	j_svMarker._tmpPan = tmpPan;
	j_svMarker._tmpfov = tmpfov;
	j_tog._showSvMarker(new L.Loc(longitude, latitude));
	// j_svMarker.setPosition(new L.Loc(longitude, latitude));
	// j_svMarker.setVisible(true);
	// j_svClickMarker.setVisible(false);
}
function panoChanged(id, latitude, longitude, direction){
	//j_svMarker.setPan(tmpPan);
	j_tog._showSvMarker(new L.Loc(longitude, latitude));
	j_tog._map.moveTo(new L.Loc(longitude, latitude));
	// j_svMarker.setPosition(new L.Loc(longitude, latitude));
	// j_svMarker.setVisible(true);
	// j_svClickMarker.setVisible(false);
}

NDragToggle = L.Class.extend({
	includes: L.Mixin.Events,
	_minSize:new L.Loc(225, 102),
	_offset:new L.Loc(20, 5),
	_curSize:new L.Loc(225, 102),
	_sizeFixed:false,
	_map:null,
	_preLoc:null,

	initialize: function (dragDivId, anchorDivId, panelId, parentPanelId, mapId) {
        this.dragDiv = L.Util.get(dragDivId);
        this.anchorDiv = L.Util.get(anchorDivId);
        this.panel = L.Util.get(panelId);
        this.parentPanel = L.Util.get(parentPanelId);
        this.mapDiv = L.Util.get(mapId);
		this.update();
		this.addHooks();
    },

	_initToggle: function() {
        var map = this._map;
        var className = 'j-libs-control-toggle2',
            container = L.Util.create('div', className, this.panel);
        this._toggleContainer = container;
        L.Util.stamp(this._toggleContainer);
		var htmlStr = '<input type=button class=\"btn\" value=\"矢 量\" onclick=\"j_changeLayers(\'vec\');\" />';
		htmlStr += '<input type=button class=\"btn\" value=\"影 像\" onclick=\"j_changeLayers(\'img\');\" />';
		//htmlStr += '<input type=button class=\"btn\" value=\"地 形\" onclick=\"j_changeLayers(\'ter\');\" />';
		this._toggleContainer.innerHTML = htmlStr;


        return container;
    },

	_initMap:function(layers){
		this._map = new L.Map(this.mapDiv);
		for(var i = 0; i < layers.length; i++){
			this._map.addLayer(layers[i]);
		}
		this._map.moveTo(j_tmpLoc, 15);
		this._map.setMode("dragzoom");


		//-288px -72px39.780769942963126	116.525348303829690
		j_svMarker = new JSVMarker(j_tmpLoc);
		j_svMarker.on("dragstart", this.svMarkerDragStart,this);
		j_svMarker.on("dragend", this.svMarkerDragEnd,this);
		var spriteMarkerOptions_dizuo = {
			imgUrl : L.Icon.Default.imagePath +"tx.png",
			shadowUrl:"",
			markerSize:new L.Loc(20, 35),
			imgOffset:new L.Loc(120,130),
			markerAnchor:new L.Loc(10,30),
			dialogAnchor:new L.Loc(0,-41),
			markerTitle:"我的标注",
			draggable:false,
			clickable:false,
			visible:true
		};
		j_svClickMarker = new L.Ols.BgMarker(j_tmpLoc, spriteMarkerOptions_dizuo);
		this._map.addOverlays([j_svMarker, j_svClickMarker]);
		j_svClickMarker.setVisible(false);
		//this._map.on("click", this._mapClick, this);
		this._initToggle();

	},
	svMarkerDragStart:function(e){
		this._preLoc = j_svMarker.getPosition();
	},
	svMarkerDragEnd:function(e){
		var pos2 = j_svMarker.getPosition();
		this._showSvClickMarker(pos2);
		var curDis = this._map.getResolution() * 10 * L.Util.INCHES_PER_UNIT.dd /  L.Util.INCHES_PER_UNIT.m;
		curDis = parseInt(curDis);
		var d = 180 / Math.PI;
		var R = 6378137;
		var lon = pos2.x * d / R;
		var lat = (2 * Math.atan(Math.exp(pos2.y / R)) - (Math.PI / 2)) * d;
		var url = panoUrl + lon + "," + lat +"?distance="+curDis;
		L.HttpObj.GET({
            url: url,
            //success: showSWFSV,
            //failure: callPanoUrlFailure,
			callback:"j_tog.panoCallBack"
        });
	},
	showNullSVLabel:function(){
		if(j_svMarker){
			if(!this._nullLabel){
				this._nullLabel = new L.Ols.Label(j_svMarker.getPosition(),{content:"当前位置无街景",offset:new L.Loc(-40, 0),} );
				this._map.addOverlays(this._nullLabel);
			}
			this._nullLabel.setPosition(j_svMarker.getPosition());
			this._nullLabel.setVisible(true);
			clearTimeout(this.timer);
			this.timer = setTimeout(function(){j_tog._nullLabel.setVisible(false);}, 1500);
		}
		this._showSvMarker(this._preLoc);
	},
	panoCallBack:function(e){
		if(e == "null" || e == ""){
			this.showNullSVLabel();
		}
		else{
			var resStr = e;
			var flash = document.getElementById("viewportstreetview");
			if(!flash.callPano){
				var interval = setInterval(function(){
					try{
						if(flash.callPano){
							clearInterval(interval);
							flash.callPano(resStr);
							document.getElementById("viewport").style.display = "none";
						}
					}
					catch(ex){
					}
				}, 1000);
			}
			else{
				flash.callPano(e);
			}
		}
	},

	_mapClick:function(e){
		this._showSvClickMarker(e.point);
	},

	_showSvClickMarker:function(pos){
		j_svClickMarker.setPosition(pos);
		j_svClickMarker.setVisible(true);
		j_svMarker.setVisible(false);
	},

	_showSvMarker:function(pos){
		j_svMarker.setPosition(pos);
		j_svClickMarker.setVisible(false);

		j_svMarker.setVisible(true);
	},
	
	_preBasicLayer:null,
	_outParams:null,
	_layerParams:null,
	setRoomPano:function(res){
		
		res = {
			layerParams:{
				basepic:"http://127.0.0.1:8719/newmapserver4/rest/xpano/xpano/bin/tpk/tiles/a4.jpg",
				width:1280,
				height:1280,
				resolutions: [
					4,2,1,0.5,0.25
				]
			},
			poiParams:[
				{id:"0",x:2*256+212 , y: 227, pano:"pics000354",title:"A景点"},
				{id:"1",x:2*256+171 , y: 256+52, pano:"pics000353",title:"B景点"},
				{id:"2",x:2*256+55 , y: 256+81, pano:"pics000343",title:"C景点"}
			],
			outParams:{
				pano:"pics000130",
				x: 12971392,
				y: 4834169,
				direction:2
			}
			
		};
		if(!this._roomLayer){	
			var lyrOptions = L.Util.extend(
				{},
				res.layerParams,
				{
					maxExtent:new L.Extent(0,0,res.layerParams.width,res.layerParams.height),
					serviceMode:"Restful",
					units:"m",
					projection:"EPSG:4490",
					isBasicLayer:true,
					visible:true,
					format:"png",
					tileOrigin:new L.Loc(0,res.layerParams.height)
				}
			);
			this._roomLayer = new L.Layers.ImageLayer("室内底图", res.layerParams.basepic, lyrOptions);

			this._preBasicLayer = this._map.basicLayer;
			this._outParams = res.outParams;
			this._layerParams = res.layerParams;
			this._map.addLayer(this._roomLayer);
			this._map.setBasicLayer(this._roomLayer);
			//this._map.addControl(new L.Controls.Position());

			this._pois = new Array();
			this._pois.length = 0;
			for(var i = 0; i < res.poiParams.length; i++){
				var tmpPoi = res.poiParams[i];
				var tmpMarker = new JCameraMarker(new L.Loc(tmpPoi.x, this._layerParams.height - tmpPoi.y),{markerTitle:tmpPoi.title});
				tmpMarker.on("click", function(pano){
					return function(){
						var flash = document.getElementById("viewportstreetview");
						//todo
						flash.callPano(pano);
					};
				}(tmpPoi.pano));
				
				this._pois.push(tmpMarker);
			}
			this._map.addOverlays(this._pois);
		//	this._map.addOverlays(this.coordsImg);
			this._toggleContainer.style.display = "none";
			j_svMarker.setPosition(new L.Loc(this._pois["0"].getPosition().x,this._pois["0"].getPosition().y));
		}
		//if(){
			showSWFSV(res.poiParams[0].pano);
		//}
		document.getElementById("controliconquit2d").style.display = "none";
		document.getElementById("controliconquit").style.display = "";
	},
	
	unsetRoomPano:function(){
		if(this._pois){
			this._map.removeOverlays(this._pois);
			this._pois.length = 0;
			this._pois = null;
		}
		if(this._roomLayer && this._preBasicLayer){
			this._map.setBasicLayer(this._preBasicLayer);
			this._map.removeLayer(this._roomLayer);
			this._roomLayer = null;
			this._layerParams = null;
		}
		if(this._outParams){
			var tmpLoc = new L.Loc(this._outParams.x,this._outParams.y);
			j_svMarker.setPosition(tmpLoc);
			this._map.moveTo(tmpLoc);
			j_map.moveTo(tmpLoc);
			var flash = document.getElementById("viewportstreetview");
						//todo
			flash.callPano(this._outParams.pano);
			this._outParams = null;
		}
		this._toggleContainer.style.display = "";
		document.getElementById("controliconquit2d").style.display = "";
		document.getElementById("controliconquit").style.display = "none";
	},
	
	update:function (forceTag){
		this._maxSize = new L.Loc(this.parentPanel.clientWidth - 2, this.parentPanel.clientHeight -2);
        this._parentPanelPos = new L.Loc(this.parentPanel.offsetLeft, this.parentPanel.offsetTop);
		if(this._curSize){
			this.setSize(this._curSize);
			this.updateMap(this._curSize,forceTag);
		}

	},

	addHooks: function (){
		L.DomEvent.addListener(this.dragDiv, L.Draggable.START, this._onDown, this);
		L.DomEvent.addListener(this.anchorDiv, "click", this._toggleAnchor, this);

		this._toggleAnchor();
	},

	_toggleAnchor:function(){
		this._sizeFixed = !this._sizeFixed;
		if(this._sizeFixed){
			L.Util.addClass(this.anchorDiv, "anchorValid");
			L.DomEvent.removeListener(this.panel, "mouseout", this.setMinPanel, this);
			L.DomEvent.removeListener(this.panel, "mouseover", this.setNormalPanel, this);
		}
		else{
			L.Util.removeClass(this.anchorDiv, "anchorValid");
			L.DomEvent.addListener(this.panel, "mouseout", this.setMinPanel, this);
			L.DomEvent.addListener(this.panel, "mouseover", this.setNormalPanel, this);
		}
	},

	_firstTag:true,
	setNormalPanel:function(){
		if(this._moving)
			return;
		if(this._showHideTimer){
            clearTimeout(this._showHideTimer);
        }
		this.setSize(this._curSize);

		if(this._firstTag){
			this.updateMap(this._curSize);
			this._firstTag = false;
		}

	},

	setMinPanel:function (){
		if(this._moving)
			return;

		if(this._showHideTimer){
            clearTimeout(this._showHideTimer);
        }

		var that = this;
        this._showHideInterval = 3000;
        this._showHideTimer = setTimeout(that._hideNormalSize(that), this._showHideInterval);

	},

	_hideNormalSize:function(that){
		if(this._maxSize.x != this._curSize.x && this._maxSize.y != this._curSize.y){
			this.setSize(this._minSize);
			this.updateMap(this._minSize);
			this._firstTag = true;
		}
	},

	_onDown: function (e) {
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

        this._startPos = this._newPos = new L.Loc(this.dragDiv.offsetLeft, this.dragDiv.offsetTop);
        this._startPoint = new L.Loc(first.clientX, first.clientY);
		this._startSize = new L.Loc(this.panel.clientWidth, this.panel.clientHeight);
        L.DomEvent.addListener(document, L.Draggable.MOVE, this._onMove, this);
        L.DomEvent.addListener(document, L.Draggable.END, this._onUp, this);

    },

	_onMove: function (e) {
        if (e.touches && e.touches.length > 1) {
            return;
        }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);

        if (!this._moved && (first && this._startPoint && ((first.clientX != this._startPoint.x) || (first.clientY != this._startPoint.y)))) {
            this._moved = true;
        }
        this._moving = true;


        var newPoint = new L.Loc(first.clientX, first.clientY);
		var offsets = newPoint.subtract(this._startPoint);

		var width = this._startSize.x - offsets.x;
		var height = this._startSize.y - offsets.y;


		this._curSize = this.getValidSize(new L.Loc(width,height));
		this.setSize(this._curSize);
        L.DomEvent.stopPropagation(e);
    },

	getValidSize: function (size){
		var width = size.x;
		var height = size.y;
		width = this._minSize.x > width ? this._minSize.x : width;
		width = this._maxSize.x - 84 > width ? width : this._maxSize.x;

		height = this._minSize.y > height ? this._minSize.y : height;
		height = this._maxSize.y -84 > height ? height : this._maxSize.y;

		return new L.Loc(width, height);
	},

	setSize: function (sizeParm) {
		var size = this.getValidSize(sizeParm);
		this.panel.style.width = size.x + "px";
		this.panel.style.height = size.y+ "px";
	},

	updateMap:function(sizeParm,forceTag){
		var size = this.getValidSize(sizeParm);
		// size.x -= 4;
		// size.y -= 4;
		if(!this.mapDiv)return;
		if(forceTag || parseInt(this.mapDiv.style.width) != size.x || parseInt(this.mapDiv.style.height) != size.y){
			this.mapDiv.style.width = size.x + "px";
			this.mapDiv.style.height = size.y + "px";
			if(this._map){
				this._map._onResize();
				this._map.moveTo(j_svMarker.getPosition());
			}
		}
	},

    _onUp: function (e) {
        if (!L.Util.Browser.touch) {
            L.Util.enableTextSelection();
        }
        // this._setMovingCursor();

        L.DomEvent.removeListener(document, L.Draggable.MOVE, this._onMove, this);
        L.DomEvent.removeListener(document, L.Draggable.END, this._onUp,this);
        if(this._moving)
			this.updateMap(this._curSize);
        this._moving = false;
        L.DomEvent.stopPropagation(e);
    },

    moved: function () {
        return this._moved;
    }

});
