 /**************************************
********控制街景小地图的类*************
***************************************/
var j_svMarker = null;
var j_svClickMarker = null;
var j_tmpLoc = new L.Loc(12971392, 4834169);
var basew = 934
var baseh = 613
var loc1 = new L.Loc(12971272.4, 4834190.3);
var loc2 = new L.Loc(12971627.4, 4833958.2);
var anchor1 = new L.Loc(0, baseh);
var anchor2 = new L.Loc(basew, 0);
var baseRes = (loc2.x - loc1.x)/(anchor2.x - anchor1.x);
var baseMin = new L.Loc(loc1.x - anchor1.x *baseRes, loc1.y - anchor1.y *baseRes);
var baseMax = new L.Loc(baseMin.x + basew *baseRes, baseMin.y + baseh * baseRes);
var j_roomLayerParams = {
		basepic:"http://"+myhost+"/static/images/yq.jpg",
		width:(baseMax.x - baseMin.x),
		height:(baseMax.y - baseMin.y),
		resolutions: [
			baseRes,baseRes/2,baseRes/4
		]
	};
// var j_freePanels = {
	// "0":{
		// layerParams:j_roomLayerParams,
		// poiParams:[
			// {id:"0",x:12971357 , y: 4834043, pano:"innerpano_000000",title:"A座4层1"},
			// {id:"1",x:12971372 , y: 4834031, pano:"innerpano_000001",title:"A座4层2"},
			// {id:"2",x:12971396 , y: 4834043, pano:"innerpano_000002",title:"A座4层3"}
		// ],
		// outParams:{
			// pano:"pics000187",
			// x: 12971542,
			// y: 4834097,
			// direction:2
		// }
	// },
	// "1":{
		// layerParams:j_roomLayerParams,
		// poiParams:[
			// {id:"3",x:12971404 , y: 4834095, pano:"innerpano_000003",title:"B座1层"},
			// {id:"4",x:12971415 , y: 4834102, pano:"innerpano_000004",title:"B座4层"}
		// ],
		// outParams:{
			// pano:"pics000187",
			// x: 12971542,
			// y: 4834097,
			// direction:2
		// }
	// },
	// "2":{
		// layerParams:j_roomLayerParams,
		// poiParams:[
			// {id:"5",x:12971498 , y: 4834154, pano:"innerpano_000005",title:"和合1层健身房"},
			// {id:"6",x:12971515 , y: 4834125, pano:"innerpano_000006",title:"和合1层大堂"},
			// {id:"7",x:12971495 , y: 4834136, pano:"innerpano_000007",title:"和合二层羽毛球场"}
		// ],
		// outParams:{
			// pano:"pics000187",
			// x: 12971542,
			// y: 4834097,
			// direction:2
		// }
	// },
	// "3":{
		// layerParams:j_roomLayerParams,
		// poiParams:[
			// {id:"8",x:12971481 , y: 4834086, pano:"innerpano_000008",title:"篮 球 场"}
		// ],
		// outParams:{
			// pano:"pics000187",
			// x: 12971542,
			// y: 4834097,
			// direction:2
		// }
	// }
// };
var j_freePanels = {
	"0":{
		layerParams:j_roomLayerParams,
		initid:10,
		poiArray:[0, 1, 2, 9, 10],
		poiParams:[
			{id:"0",x:12971348 , y: 4834064, pano:"innerpano_000000",title:"A座4层1"},
			{id:"1",x:12971363 , y: 4834024, pano:"innerpano_000001",title:"A座4层2"},
			{id:"2",x:12971381 , y: 4834035, pano:"innerpano_000002",title:"A座4层3"},
			{id:"3",x:12971400 , y: 4834086, pano:"innerpano_000003",title:"B座1层"},
			{id:"4",x:12971408 , y: 4834090, pano:"innerpano_000004",title:"B座4层"},
			{id:"5",x:12971487 , y: 4834150, pano:"innerpano_000005",title:"和合1层健身房"},
			{id:"6",x:12971512 , y: 4834119, pano:"innerpano_000006",title:"和合1层大堂"},
			{id:"7",x:12971498 , y: 4834131, pano:"innerpano_000007",title:"和合二层羽毛球场"},
			{id:"8",x:12971487 , y: 4834086, pano:"innerpano_000008",title:"篮 球 场"},
			{id:"9",x:12971357 , y: 4834073, pano:"innerpano_000009",title:"A座后门"},
			{id:"10",x:12971352 , y: 4834041, pano:"innerpano_000010",title:"A座大堂"}
		],
		outParams:{
			pano:"pics000379",
			x: 12971331.6606,
			y: 4834028.57476,
			direction:2
		}
	},
	"1":{
		layerParams:j_roomLayerParams,
		initid:3,
		poiArray:[3, 4],
		poiParams:[
			{id:"0",x:12971348 , y: 4834064, pano:"innerpano_000000",title:"A座4层1"},
			{id:"1",x:12971363 , y: 4834024, pano:"innerpano_000001",title:"A座4层2"},
			{id:"2",x:12971381 , y: 4834035, pano:"innerpano_000002",title:"A座4层3"},
			{id:"3",x:12971400 , y: 4834086, pano:"innerpano_000003",title:"B座1层"},
			{id:"4",x:12971408 , y: 4834090, pano:"innerpano_000004",title:"B座4层"},
			{id:"5",x:12971487 , y: 4834150, pano:"innerpano_000005",title:"和合1层健身房"},
			{id:"6",x:12971512 , y: 4834119, pano:"innerpano_000006",title:"和合1层大堂"},
			{id:"7",x:12971498 , y: 4834131, pano:"innerpano_000007",title:"和合二层羽毛球场"},
			{id:"8",x:12971487 , y: 4834086, pano:"innerpano_000008",title:"篮 球 场"},
			{id:"9",x:12971357 , y: 4834073, pano:"innerpano_000009",title:"A座后门"},
			{id:"10",x:12971352 , y: 4834041, pano:"innerpano_000010",title:"A座大堂"}
		],
		outParams:{
			pano:"pics000392",
			x: 12971438.412,
			y: 4834095.91282,
			direction:2
		}
	},
	"2":{
		layerParams:j_roomLayerParams,
		initid:6,
		poiArray:[5, 6, 7],
		poiParams:[
			{id:"0",x:12971348 , y: 4834064, pano:"innerpano_000000",title:"A座4层1"},
			{id:"1",x:12971363 , y: 4834024, pano:"innerpano_000001",title:"A座4层2"},
			{id:"2",x:12971381 , y: 4834035, pano:"innerpano_000002",title:"A座4层3"},
			{id:"3",x:12971400 , y: 4834086, pano:"innerpano_000003",title:"B座1层"},
			{id:"4",x:12971408 , y: 4834090, pano:"innerpano_000004",title:"B座4层"},
			{id:"5",x:12971487 , y: 4834150, pano:"innerpano_000005",title:"和合1层健身房"},
			{id:"6",x:12971512 , y: 4834119, pano:"innerpano_000006",title:"和合1层大堂"},
			{id:"7",x:12971498 , y: 4834131, pano:"innerpano_000007",title:"和合二层羽毛球场"},
			{id:"8",x:12971487 , y: 4834086, pano:"innerpano_000008",title:"篮 球 场"},
			{id:"9",x:12971357 , y: 4834073, pano:"innerpano_000009",title:"A座后门"},
			{id:"10",x:12971352 , y: 4834041, pano:"innerpano_000010",title:"A座大堂"}
		],
		outParams:{
			pano:"pics000418",
			x: 12971479.9429,
			y: 4834117.22128,
			direction:2
		}
	},
	"3":{
		layerParams:j_roomLayerParams,
		initid:8,
		poiArray:[8],
		poiParams:[
			{id:"0",x:12971348 , y: 4834064, pano:"innerpano_000000",title:"A座4层1"},
			{id:"1",x:12971363 , y: 4834024, pano:"innerpano_000001",title:"A座4层2"},
			{id:"2",x:12971381 , y: 4834035, pano:"innerpano_000002",title:"A座4层3"},
			{id:"3",x:12971400 , y: 4834086, pano:"innerpano_000003",title:"B座1层"},
			{id:"4",x:12971408 , y: 4834090, pano:"innerpano_000004",title:"B座4层"},
			{id:"5",x:12971487 , y: 4834150, pano:"innerpano_000005",title:"和合1层健身房"},
			{id:"6",x:12971512 , y: 4834119, pano:"innerpano_000006",title:"和合1层大堂"},
			{id:"7",x:12971498 , y: 4834131, pano:"innerpano_000007",title:"和合二层羽毛球场"},
			{id:"8",x:12971487 , y: 4834086, pano:"innerpano_000008",title:"篮 球 场"},
			{id:"9",x:12971357 , y: 4834073, pano:"innerpano_000009",title:"A座后门"},
			{id:"10",x:12971352 , y: 4834041, pano:"innerpano_000010",title:"A座大堂"}
		],
		outParams:{
			pano:"pics000422",
			x: 12971493.7095,
			y: 4834094.69167,
			direction:2
		}
	}
};
function j_getFreePanel(id, baseTag){
	if(baseTag === true){
		return j_freePanels[id.toString()];
	}
	var result = null;
	for(var k in j_freePanels){
		if(j_freePanels.hasOwnProperty(k)){
			var tmpFP = j_freePanels[k];
			if(tmpFP.poiArray) {
				for (var i = 0; i < tmpFP.poiArray.length; i++) {
					if(tmpFP.poiArray[i] == parseInt(id)) {
						result = tmpFP;
						return result;
					}
				}
			}
			// if(tmpFP.poiParams){
			// 	for(var i = 0; i < tmpFP.poiParams.length; i++){
			// 		if(parseInt(tmpFP.poiParams[i].id) == parseInt(id)){
			// 			result = tmpFP;
			// 			return result;
			// 		}
			// 	}
			// }
		}
	}
	return result;
}
function viewChanged(loadedId, tmpPan, tmpTilt, tmpfov, latitude, longitude, direction){
	if(j_svMarker.dragTag)
		return;
	j_svMarker.setPan(360-tmpPan-direction+90);
	j_svMarker._direction = direction;
	j_svMarker._tmpTilt = tmpTilt;
	j_svMarker._tmpPan = tmpPan;
	j_svMarker._tmpfov = tmpfov;
	if(j_tog._layerParams && (document.getElementById("controliconquit").style.display != "none")){
		j_tog._showSvMarker(new L.Loc(longitude, latitude));
	}
	else
		j_tog._showSvMarker(new L.Loc(longitude, latitude));
	// j_svMarker.setPosition(new L.Loc(longitude, latitude));
	// j_svMarker.setVisible(true);
	// j_svClickMarker.setVisible(false);
}
function panoChanged(id, latitude, longitude, direction){
	//j_svMarker.setPan(tmpPan);
	var tmpLoc = new L.Loc(longitude, latitude);
	// if(j_tog._layerParams && (document.getElementById("controliconquit").style.display != "none")){
		// tmpLoc.y = j_tog._layerParams.height - latitude;
	// }
	j_tog._showSvMarker(tmpLoc);
	j_tog._map.moveTo(tmpLoc);

	j_hidePoiInfo();
	// j_svMarker.setPosition(new L.Loc(longitude, latitude));
	// j_svMarker.setVisible(true);
	// j_svClickMarker.setVisible(false);
}
function j_showPoiInfo(id){
	document.getElementById("j_poidiv").style.display = "";
}
function j_hidePoiInfo(){
	document.getElementById("j_poidiv").style.display = "none";
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
		this._map.moveTo(j_tmpLoc, 18);
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
				this._nullLabel = new L.Ols.Label(j_svMarker.getPosition(),{content:"当前位置无街景",offset:new L.Loc(-40, 0)});
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
	setRoomPano:function(id, basetag){
		var res = j_getFreePanel(id, basetag);
		if(!res){
			return;
		}
		if(!this._roomLayer){
			var lyrOptions = L.Util.extend(
				{},
				res.layerParams,
				{
					maxExtent:new L.Extent(baseMin.x,baseMin.y,baseMax.x,baseMax.y),
					serviceMode:"Restful",
					units:"m",
					projection:"EPSG:4490",
					isBasicLayer:true,
					visible:true,
					format:"png",
					tileOrigin:new L.Loc(baseMin.x,baseMax.y)
				}
			);
			this._roomLayer = new L.Layers.ImageLayer("室内底图", res.layerParams.basepic, lyrOptions);

			this._preBasicLayer = this._map.basicLayer;
			this._outParams = res.outParams;
			this._layerParams = res.layerParams;
			this._map.addLayer(this._roomLayer);
			this._map.setBasicLayer(this._roomLayer);

			this._pois = new Array();
			this._pois.length = 0;
			this._defautlpoi = res.initid;
			for(var i = 0; i < res.poiParams.length; i++){
				var tmpPoi = res.poiParams[i];
				var tmpMarker = new JCameraMarker(new L.Loc(tmpPoi.x, tmpPoi.y),{
					markerTitle:tmpPoi.title,
					labelable: true,
					labelLineCharCount:6,
					labelAnchor: new L.Loc(26, -7),
					labelSize:null,
					labelContent: tmpPoi.title
				});
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
			this._toggleContainer.style.display = "none";
			// this._map.addControl(new L.Controls.Position());
			if(basetag)
				j_svMarker.setPosition(new L.Loc(this._pois[this._defautlpoi].getPosition().x,this._pois[this._defautlpoi].getPosition().y));
		}
		if(basetag)
			showSWFSV(res.poiParams[this._defautlpoi].pano);
		else
			showSWFSV(res.poiParams[id].pano);

		document.getElementById("controliconquit2d").style.display = "none";
		document.getElementById("controliconquit").style.display = "";
		j_setShiNeiPoisVisible(false);
	},

	unsetRoomPano:function(){
		j_setShiNeiPoisVisible(true);
		if(this._pois){
			this._map.removeOverlays(this._pois);
			this._pois.length = 0;
			this._pois = null;
		}
		if(this._roomLayer && this._preBasicLayer){

			this._map.setBasicLayer(this._preBasicLayer);
			this._roomLayer.isBasicLayer = false;
			this._map.removeLayer(this._roomLayer);
			//j_changeLayers("img");
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
