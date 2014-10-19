/**************************************
********初始化地图图层****************
***************************************/
var j_map;//地图对象
var vecLayer,  vecAnnoLayer;//矢量图层
var imgLayer,  imgAnnoLayer;//影像图层
var terLayer,  terAnnoLayer;//地形图层
var vecLayer2,  vecAnnoLayer2;//矢量图层
var imgLayer2,  imgAnnoLayer2;//影像图层
var terLayer2,  terAnnoLayer2;//地形图层
var SVTileLayer2,  svTileLayer;//SV图层
var j_tog;//控制街景小地图
var j_svTag = false;

var myhost = "127.0.0.1:8000";
myhost = "www.chinamap.me:8000";
var panoUrl = "http://"+myhost+"/pano/";

var shineiPoiInfo = [
	{id:"0",x:12971358 , y: 4834045,title:"SIGM园区A座"},
	{id:"1",x:12971410 , y: 4834075,title:"SIGM园区B座"},
	{id:"2",x:12971500 , y: 4834128,title:"SIGM园区D座"},
	{id:"3",x:12971487 , y: 4834086,title:"SIGM园区篮球场"}
];
//初始化地图对象
function j_init(){

	j_tog = new NDragToggle("dragDiv", "anchorDiv", "smallContentPanel", "contentPanel","smallviewport");

	L.DomEvent.addListener(window, 'resize', j_resize);

	//初始化图层对象
	j_initLayers();


	// j_initMap([imgLayer2,imgAnnoLayer2,vecLayer2,vecAnnoLayer2,terLayer2,terAnnoLayer2,SVTileLayer2]);
	// j_tog._initMap([imgLayer,imgAnnoLayer,vecLayer,vecAnnoLayer,terLayer,terAnnoLayer,svTileLayer]);
	j_initMap([imgLayer2,imgAnnoLayer2,vecLayer2,vecAnnoLayer2,SVTileLayer2]);
	j_tog._initMap([imgLayer,imgAnnoLayer,vecLayer,vecAnnoLayer,svTileLayer]);
	j_changeLayers('img');

	svTileLayer.setVisible(false);

	j_addShiNeiPois();
	j_addShiNeiPois(true);

}
var j_shineiPois = null;
var j_shineiPoisTog = null;
function j_setShiNeiPoisVisible(tag){
	for(var i = 0; i < j_shineiPoisTog.length; i++){
		j_shineiPoisTog[i].setVisible(tag);
	}
}
function j_addShiNeiPois(togtag){
	j_shineiPois = j_shineiPois || new Array();
	j_shineiPoisTog = j_shineiPoisTog || new Array();
	for(var i = 0; i < shineiPoiInfo.length; i++){
		var tmpPoi = shineiPoiInfo[i];
		var tmpMarker = new JCameraMarker(new L.Loc(tmpPoi.x, tmpPoi.y),
			{
				markerTitle:"点击进入室内",
				//markerTitle:tmpPoi.title,
				labelable: true,
				labelLineCharCount:6,
				labelAnchor: new L.Loc(26, -7),
				labelSize:null,
				labelContent: tmpPoi.title
			}
		);
		tmpMarker.on("click", function(id){
			return function(){
				j_tog.setRoomPano(id, true);
			};
		}(tmpPoi.id));
		if(!togtag)
			j_shineiPois.push(tmpMarker);
		else
			j_shineiPoisTog.push(tmpMarker);
	}
	if(!togtag)
		j_map.addOverlays(j_shineiPois);
	else
		j_tog._map.addOverlays(j_shineiPoisTog);

}

function j_initMap(layers){
	j_map = new L.Map("viewport");
	for(var i = 0; i < layers.length; i++){
		j_map.addLayer(layers[i]);
	}
	j_addControls();
	j_map.moveTo(j_tmpLoc, 18);
	j_map.setMode("dragzoom");
}
//添加控件
function j_addControls(){
	//添加鼠标位置控件
	j_map.addControl(new L.Controls.Position({digitsNum:0}));
	//添加导航条控件
	j_map.addControl(new L.Controls.PanZoomBar({resParams:{
            "1":9783.939620502539,//guo
            "2":611.4962262814087,//sheng
            "3":38.21851414258804,//shi
            "4":1.194328566955876//jie
        }}));
}

//初始化图层对象
function j_initLayers2(){
	//天地图WMTS服务中TileMatrixId与分辨率对应关系的关联数组
	var serverResolutions = {"1":0.703125,
            "2":0.3515625,
            "3":0.17578125,
            "4":0.087890625,
            "5":0.0439453125,
            "6":0.02197265625,
            "7":0.010986328125,
            "8":0.0054931640625,
            "9":0.00274658203125,
            "10":0.001373291015625,
            "11":0.0006866455078125,
            "12":0.00034332275390625,
            "13":0.000171661376953125,
            "14":0.0000858306884765625,
            "15":0.00004291534423828125,
            "16":0.000021457672119140625,
            "17":0.0000107288360595703125,
            "18":0.00000536441802978515625};

	var layerResArr = [];//矢量、影像数据的分辨率级别数组
	var levelCount = 19;
	for(var i = 0, res = 0.703125; i < levelCount; i++){
		layerResArr[i] = res;
		res /= 2;
	}

	var terResArr = [];//地形数据的分辨率级别数组
	var terLevelCount = 14;
	for(var i = 0, res = 0.703125; i < terLevelCount; i++){
		terResArr[i] = res;
		res /= 2;
	}


	//矢量图层创建
	var vecLayerOptions = {
		layer:"vec",
		style:"default",
		serviceMode:'KVP',
		format:"tiles",
		tileMatrixSet:"c",
		tileSize:new L.Loc(256, 256),
		tileOrigin:new L.Loc(-180,90),
		resolutions: layerResArr,
		serverResolutions: serverResolutions,

		units:"dd",
		projection:"EPSG:4490",
		maxExtent:new L.Extent(-180,-90,180,90),
		isBasicLayer:true
	};
	vecLayer = new L.Layers.WMTS("矢量底图", "http://t0.tianditu.com/vec_c/wmts", vecLayerOptions);
	vecLayer2 = new L.Layers.WMTS("矢量底图", "http://t0.tianditu.com/vec_c/wmts", vecLayerOptions);

	//矢量注记图层创建
	var vecAnnoLayerOptions = {
		layer:"cva",
		style:"default",
		serviceMode:'KVP',
		tileMatrixSet:"c",
		tileSize:new L.Loc(256, 256),
		tileOrigin:new L.Loc(-180,90),
		resolutions: layerResArr,
		format:"tiles",
		serverResolutions: serverResolutions,

		units:"dd",
		projection:"EPSG:4490",
		maxExtent:new L.Extent(-180,-90,180,90),
		isBasicLayer:false
	};
	vecAnnoLayer = new L.Layers.WMTS("矢量注记", "http://t0.tianditu.com/cva_c/wmts", vecAnnoLayerOptions);
	vecAnnoLayer2 = new L.Layers.WMTS("矢量注记", "http://t0.tianditu.com/cva_c/wmts", vecAnnoLayerOptions);

	//影像图层创建
	var imgLayerOptions = {
		layer:"img",
		style:"default",
		serviceMode:'KVP',
		format:"tiles",
		tileMatrixSet:"c",
		tileSize:new L.Loc(256, 256),
		tileOrigin:new L.Loc(-180,90),
		resolutions: layerResArr,
		serverResolutions: serverResolutions,

		units:"dd",
		projection:"EPSG:4490",
		maxExtent:new L.Extent(-180,-90,180,90),
		isBasicLayer:true
	};
	imgLayer = new L.Layers.WMTS("影像底图", "http://t0.tianditu.com/img_c/wmts", imgLayerOptions);
	imgLayer2 = new L.Layers.WMTS("影像底图", "http://t0.tianditu.com/img_c/wmts", imgLayerOptions);

	//影像注记图层创建
	var imgAnnoLayerOptions = {
		layer:"cia",
		style:"default",
		serviceMode:'KVP',
		tileMatrixSet:"c",
		tileSize:new L.Loc(256, 256),
		tileOrigin:new L.Loc(-180,90),
		resolutions: layerResArr,
		format:"tiles",
		serverResolutions: serverResolutions,

		units:"dd",
		projection:"EPSG:4490",
		maxExtent:new L.Extent(-180,-90,180,90),
		isBasicLayer:false,
		visible:false
	};
	imgAnnoLayer = new L.Layers.WMTS("影像注记", "http://t0.tianditu.com/cia_c/wmts", imgAnnoLayerOptions);
	imgAnnoLayer2 = new L.Layers.WMTS("影像注记", "http://t0.tianditu.com/cia_c/wmts", imgAnnoLayerOptions);


	//地形图层创建
	var terLayerOptions = {
		layer:"ter",
		style:"default",
		serviceMode:'KVP',
		format:"tiles",
		tileMatrixSet:"c",
		tileSize:new L.Loc(256, 256),
		tileOrigin:new L.Loc(-180,90),
		resolutions: terResArr,
		serverResolutions: serverResolutions,

		units:"dd",
		projection:"EPSG:4490",
		maxExtent:new L.Extent(-180,-90,180,90),
		isBasicLayer:true
	};
	terLayer = new L.Layers.WMTS("地形底图", "http://t0.tianditu.com/ter_c/wmts", terLayerOptions);
	terLayer2 = new L.Layers.WMTS("地形底图", "http://t0.tianditu.com/ter_c/wmts", terLayerOptions);

	//地形注记图层创建
	var terAnnoLayerOptions = {
		layer:"cta",
		style:"default",
		serviceMode:'KVP',
		tileMatrixSet:"c",
		tileSize:new L.Loc(256, 256),
		tileOrigin:new L.Loc(-180,90),
		resolutions: terResArr,
		format:"tiles",
		serverResolutions: serverResolutions,

		units:"dd",
		projection:"EPSG:4490",
		maxExtent:new L.Extent(-180,-90,180,90),
		isBasicLayer:false,
		visible:false
	};

	terAnnoLayer = new L.Layers.WMTS("地形注记", "http://t0.tianditu.com/cta_c/wmts", terAnnoLayerOptions);
	terAnnoLayer2 = new L.Layers.WMTS("地形注记", "http://t0.tianditu.com/cta_c/wmts", terAnnoLayerOptions);


	var svLayerOptions = {
		layer:"cta",
		style:"default",
		serviceMode:'RESTFUL',
		tileMatrixSet:"c",
		tileSize:new L.Loc(256, 256),
		tileOrigin:new L.Loc(-180,90),
		resolutions: layerResArr,
		format:"tiles",
		//serverResolutions: serverResolutions,

		units:"dd",
		projection:"EPSG:4490",
		maxExtent:new L.Extent(-180,-90,180,90),
		isBasicLayer:false,
		visible:true
	};
	svTileLayer = new L.Layers.TPCTileLayer("SVT", "http://"+myhost+"/geoproxy/vectortile/raster-panoline/", svLayerOptions);
	SVTileLayer2 = new L.Layers.TPCTileLayer("SVT2", "http://"+myhost+"/geoproxy/vectortile/raster-panoline/", svLayerOptions);

}
function j_initLayers(){
	//天地图WMTS服务中TileMatrixId与分辨率对应关系的关联数组
	var origin = new L.Loc(-20037508.3427892,20037508.3427892);
	var extent = new L.Extent(-20037508.3427892, -20037508.3427892,20037508.3427892,20037508.3427892);
	var prj = "EPSG:900913";


	var serverResolutions = {};
	var serverLevelCount = 22;
	for(var i = 0, res = 78271.51696402031; i < serverLevelCount; i++){
		serverResolutions[(i+1).toString()] = res;
		res /= 2;
	}

	var layerResArr = [];//矢量、影像数据的分辨率级别数组
	var levelCount = 18;
	for(var i = 0, res = 78271.51696402031; i < levelCount; i++){
		layerResArr[i] = res;
		res /= 2;
	}

	var terResArr = [];//地形数据的分辨率级别数组
	var terLevelCount = 14;
	for(var i = 0, res = 78271.51696402031; i < terLevelCount; i++){
		terResArr[i] = res;
		res /= 2;
	}


	//矢量图层创建
	var vecLayerOptions = {
		layer:"vec",
		style:"default",
		serviceMode:'KVP',
		format:"tiles",
		tileMatrixSet:"w",
		tileSize:new L.Loc(256, 256),
		tileOrigin:origin,
		resolutions: layerResArr,
		serverResolutions: serverResolutions,

		units:"m",
		projection:prj,
		maxExtent:extent,
		isBasicLayer:true
	};
	vecLayer = new L.Layers.WMTS("矢量底图", "http://t0.tianditu.com/vec_w/wmts", vecLayerOptions);
	vecLayer2 = new L.Layers.WMTS("矢量底图", "http://t0.tianditu.com/vec_w/wmts", vecLayerOptions);

	//矢量注记图层创建
	var vecAnnoLayerOptions = {
		layer:"cva",
		style:"default",
		serviceMode:'KVP',
		tileMatrixSet:"w",
		tileSize:new L.Loc(256, 256),
		tileOrigin:origin,
		resolutions: layerResArr,
		format:"tiles",
		serverResolutions: serverResolutions,

		units:"m",
		projection:prj,
		maxExtent:extent,
		isBasicLayer:false
	};
	vecAnnoLayer = new L.Layers.WMTS("矢量注记", "http://t0.tianditu.com/cva_w/wmts", vecAnnoLayerOptions);
	vecAnnoLayer2 = new L.Layers.WMTS("矢量注记", "http://t0.tianditu.com/cva_w/wmts", vecAnnoLayerOptions);

	//影像图层创建
	var imgLayerOptions = {
		layer:"img",
		style:"default",
		serviceMode:'KVP',
		format:"tiles",
		tileMatrixSet:"w",
		tileSize:new L.Loc(256, 256),
		tileOrigin:origin,
		resolutions: layerResArr,
		serverResolutions: serverResolutions,

		units:"m",
		projection:prj,
		maxExtent:extent,
		isBasicLayer:true
	};
	imgLayer = new L.Layers.WMTS("影像底图", "http://t0.tianditu.com/img_w/wmts", imgLayerOptions);
	imgLayer2 = new L.Layers.WMTS("影像底图", "http://t0.tianditu.com/img_w/wmts", imgLayerOptions);

	//影像注记图层创建
	var imgAnnoLayerOptions = {
		layer:"cia",
		style:"default",
		serviceMode:'KVP',
		tileMatrixSet:"w",
		tileSize:new L.Loc(256, 256),
		tileOrigin:origin,
		resolutions: layerResArr,
		format:"tiles",
		serverResolutions: serverResolutions,

		units:"m",
		projection:prj,
		maxExtent:extent,
		isBasicLayer:false,
		visible:false
	};
	imgAnnoLayer = new L.Layers.WMTS("影像注记", "http://t0.tianditu.com/cia_w/wmts", imgAnnoLayerOptions);
	imgAnnoLayer2 = new L.Layers.WMTS("影像注记", "http://t0.tianditu.com/cia_w/wmts", imgAnnoLayerOptions);


	//地形图层创建
	var terLayerOptions = {
		layer:"ter",
		style:"default",
		serviceMode:'KVP',
		format:"tiles",
		tileMatrixSet:"w",
		tileSize:new L.Loc(256, 256),
		tileOrigin:origin,
		resolutions: terResArr,
		serverResolutions: serverResolutions,

		units:"m",
		projection:prj,
		maxExtent:extent,
		isBasicLayer:true
	};
	terLayer = new L.Layers.WMTS("地形底图", "http://t0.tianditu.com/ter_w/wmts", terLayerOptions);
	terLayer2 = new L.Layers.WMTS("地形底图", "http://t0.tianditu.com/ter_w/wmts", terLayerOptions);

	//地形注记图层创建
	var terAnnoLayerOptions = {
		layer:"cta",
		style:"default",
		serviceMode:'KVP',
		tileMatrixSet:"w",
		tileSize:new L.Loc(256, 256),
		tileOrigin:origin,
		resolutions: terResArr,
		format:"tiles",
		serverResolutions: serverResolutions,

		units:"m",
		projection:prj,
		maxExtent:extent,
		isBasicLayer:false,
		visible:false
	};

	terAnnoLayer = new L.Layers.WMTS("地形注记", "http://t0.tianditu.com/cta_w/wmts", terAnnoLayerOptions);
	terAnnoLayer2 = new L.Layers.WMTS("地形注记", "http://t0.tianditu.com/cta_w/wmts", terAnnoLayerOptions);


	var svLayerOptions = {
		layer:"cta",
		style:"default",
		serviceMode:'RESTFUL',
		tileMatrixSet:"w",
		tileSize:new L.Loc(256, 256),
		tileOrigin:origin,
		resolutions: layerResArr,
		format:"tiles",
		serverResolutions: serverResolutions,

		units:"m",
		projection:prj,
		maxExtent:extent,
		isBasicLayer:false,
		visible:true
	};
	svTileLayer = new L.Layers.TPCTileLayer("SVT", "http://"+myhost+"/geoproxy/vectortile/raster-panoline/", svLayerOptions);
	SVTileLayer2 = new L.Layers.TPCTileLayer("SVT2", "http://"+myhost+"/geoproxy/vectortile/raster-panoline/", svLayerOptions);

}

function j_changeLayers2(type){
	j_tog.unsetRoomPano();
	j_hidePoiInfo();
	j_hideSV();
	j_changeLayers(type, j_map);
	j_changeLayers(type, j_tog._map);
}
function j_ChangeSV(){
	if(j_svTag){
		j_hideSV();
	}
	else {
		j_showSV();
	}
}
j_svMarker2 = null;
function j_showSV(){
	j_svTag = true;
	//todo
	//sv overlay
	svTileLayer.setVisible(true);
	if(false){
		if(!j_svLastMarker){
			if(j_tog && j_tog._map && j_svMarker)
				creatSVLastMarker(j_svMarker.getPosition());
		}
		if(j_svLastMarker && j_svMarker){
			j_svLastMarker.setPosition(j_svMarker.getPosition());
			j_svLastMarker.setVisible(true);
		}
	}
	j_setEvents();
}
function j_setEvents(){
	j_map.on('mousemove', mousemoveSVLoc);
	j_map.on('click', clickSVLoc);
}
function j_unsetEvents(){
	j_map.off('mousemove', mousemoveSVLoc);
	j_map.off('click', clickSVLoc);
}
function creatSVMarker(pos){
	if(j_svMarker2 == null){
		var spriteMarkerOptions_dizuo = {
			imgUrl : L.Icon.Default.imagePath +"tx.png",
			shadowUrl:"",
			markerSize:new L.Loc(20, 35),
			imgOffset:new L.Loc(120,130),
			markerAnchor:new L.Loc(10,30),
			dialogAnchor:new L.Loc(0,-41),
			markerTitle:"点击进入街景",
			draggable:false,
			clickable:false,
			visible:true
		};
		j_svMarker2 = new L.Ols.BgMarker(pos, spriteMarkerOptions_dizuo);

	}
}
//164,164
var j_svLastMarker;
function creatSVLastMarker(pos){
	return;
	if(j_svLastMarker == null){
		var spriteMarkerOptions_dizuo = {
			imgUrl : L.Icon.Default.imagePath +"tx.png",
			shadowUrl:"",
			markerSize:new L.Loc(28, 35),
			imgOffset:new L.Loc(140,130),
			markerAnchor:new L.Loc(11,30),
			dialogAnchor:new L.Loc(0,-41),
			markerTitle:"点击进入街景",
			draggable:false,
			clickable:true,
			visible:true,
			labelable: true,
			labelLineCharCount:6,
			labelAnchor: new L.Loc(26, -15),
			labelSize:null,
			labelContent: '刚才在这里'
		};
		spriteMarkerOptions_dizuo.labelAnchor = new L.Loc(30, spriteMarkerOptions_dizuo.markerAnchor.y - spriteMarkerOptions_dizuo.markerSize.y -2);
		j_svLastMarker = new L.Ols.BgMarker(pos, spriteMarkerOptions_dizuo);
		j_map.addOverlays(j_svLastMarker);
		j_svLastMarker.on("click",showLastSWFSV);
	}
}

function showLastSWFSV(){
	clickSVLoc({point:j_svLastMarker.getPosition()});
}
var j_svNullMarker;
function creatSVNullMarker(pos){
	if(j_svNullMarker == null){
		var spriteMarkerOptions_dizuo = {
			imgUrl : L.Icon.Default.imagePath +"tx.png",
			shadowUrl:"",
			markerSize:new L.Loc(22, 35),
			imgOffset:new L.Loc(32,130),
			markerAnchor:new L.Loc(11,30),
			dialogAnchor:new L.Loc(0,-41),
			markerTitle:"无街景",
			draggable:false,
			clickable:false,
			visible:true,
			labelable: true,

			labelContent: '此处无街景'
		};
		spriteMarkerOptions_dizuo.labelAnchor = new L.Loc(30, spriteMarkerOptions_dizuo.markerAnchor.y - spriteMarkerOptions_dizuo.markerSize.y -2);
		j_svNullMarker = new L.Ols.BgMarker(pos, spriteMarkerOptions_dizuo);
		j_map.addOverlays(j_svNullMarker);
	}
}
var j_lastSVMarkerLoc = null;
function clickSVLoc(e){
		if(!e || !e.point) return;
		if(j_svNullMarker){
			j_svNullMarker.setVisible(false);
		}
		var loc = e.point;
		var d = 180 / Math.PI;
		var R = 6378137;
		var lon = loc.x * d / R;
		var lat = (2 * Math.atan(Math.exp(loc.y / R)) - (Math.PI / 2)) * d;
	//	var curDis = j_map.getResolution() * 10 * L.Util.INCHES_PER_UNIT.dd /  L.Util.INCHES_PER_UNIT.m;
		var curDis = j_map.getResolution() * 10 * L.Util.INCHES_PER_UNIT.m /  L.Util.INCHES_PER_UNIT.m;
		curDis = parseInt(curDis);
		// var url = panoUrl + loc.x + "," + loc.y +"?distance="+curDis;
		var url = panoUrl + lon + "," + lat +"?distance="+curDis;
		j_unsetEvents();
		j_lastSVMarkerLoc = loc;

		L.HttpObj.GET({
            url: url,
            //success: showSWFSV,
            //failure: callPanoUrlFailure,
			callback:"showSWFSV"
        });
	//	http://192.168.1.109:8000/pano/116.5238,39.77977?distance=500
		//showSWFSV(e, e.point);
}

function callPanoUrlFailure(){
}

function showNullSVMarker(pos){
	j_setEvents();
	if(j_svNullMarker == null){
		creatSVNullMarker(pos);
	}
	j_svNullMarker.setPosition(pos);
	j_svNullMarker.setVisible(true);
}
function hideNullSVMarker(){
}
function showSWFSV(e){
	var resStr = e;//e.responseText;
	if(resStr == "null" || resStr == ""){
		showNullSVMarker(j_lastSVMarkerLoc);
	}
	else{
		document.getElementById("viewportstreetview").style.display = "";
		document.getElementById("smallContentPanel").style.display = "";
		document.getElementById("controliconquit2d").style.display = "";
		//var flash = (navigator.appName.indexOf ("Microsoft") !=-1)?window[getFlashName()]:document[getFlashName()];

		//viewportstreetview.callPano(resStr);
		var flash = document.getElementById("viewportstreetview");

		var interval = setInterval(function(){
			try{
				if(flash.TotalFrames){
					clearInterval(interval);
					flash.callPano(resStr);
					document.getElementById("viewport").style.display = "none";

					j_tog.update(true);
					j_tog._map.moveTo(j_lastSVMarkerLoc);



					L.Util.addClass(L.Util.get("Toolbar"), "toolbar2");
				}
			}
			catch(ex){
			}
		}, 1000);


	}
}


function mousemoveSVLoc(e){
	if(!e || !e.point) return;
	var loc = e.point;
	if(j_svMarker2 == null){
		creatSVMarker(loc);
		j_map.addOverlays(j_svMarker2);
	}
	j_svMarker2.setPosition(loc);
}
function closeSeg(){
	j_unsetEvents();
	if(j_svMarker2 != null){
		j_map.removeOverlays(j_svMarker2);
		j_svMarker2 = null;
	}
}
function j_hideSV(){
	if(document.getElementById("viewport").style.display == "none"){
		j_map.moveTo(j_tog._map.getCenter());
	}
	j_svTag = false;
	if(j_svLastMarker){
		j_svLastMarker.setPosition(j_svMarker.getPosition());
		j_svLastMarker.setVisible(true);
	}
	//	j_svLastMarker.setVisible(false);
	//todo
	//sv overlay
	//svTileLayer.setVisible(false);
	if(!L.Util.Browser.ie)
		document.getElementById("viewportstreetview").style.display = "none";
	document.getElementById("smallContentPanel").style.display = "none";
	document.getElementById("controliconquit2d").style.display = "none";
	document.getElementById("controliconquit").style.display = "none";

	L.Util.removeClass(L.Util.get("Toolbar"), "toolbar2");
	document.getElementById("viewport").style.display = "";
	j_resize();
	j_map._onResize();
	closeSeg();
}
//切换底图及叠加图层
function j_changeLayers(type){

	var tmpMap =j_tog._map;
	if(type == "vec"){
		tmpMap.setBasicLayer(vecLayer);
		j_map.setBasicLayer(vecLayer2);
		vecAnnoLayer.setVisible(true);
		imgAnnoLayer.setVisible(false);
		terAnnoLayer.setVisible(false);
		vecAnnoLayer2.setVisible(true);
		imgAnnoLayer2.setVisible(false);
		terAnnoLayer2.setVisible(false);
	}
	else if(type == "img"){
		tmpMap.setBasicLayer(imgLayer);
		j_map.setBasicLayer(imgLayer2);
		vecAnnoLayer.setVisible(false);
		imgAnnoLayer.setVisible(true);
		terAnnoLayer.setVisible(false);
		vecAnnoLayer2.setVisible(false);
		imgAnnoLayer2.setVisible(true);
		terAnnoLayer2.setVisible(false);
	}
	else if(type == "ter"){
		tmpMap.setBasicLayer(terLayer);
		j_map.setBasicLayer(terLayer2);
		vecAnnoLayer.setVisible(false);
		imgAnnoLayer.setVisible(false);
		terAnnoLayer.setVisible(true);
		vecAnnoLayer2.setVisible(false);
		imgAnnoLayer2.setVisible(false);
		terAnnoLayer2.setVisible(true);
	}
}

//清理掉地图上所有覆盖物
function j_clear(){
	j_clearPreResults();
//	j_map.clearOverlays();
}

function j_ChangeContentSize(){
	var hideResultDom = document.getElementById("hideResult");
	var leftDom = document.getElementById("left");
	var contentPanelDom = document.getElementById("contentPanel");
	var curClass = hideResultDom.className;
	var newClass = curClass == "hideResult"?"hideResult2":"hideResult";
	if(newClass == "hideResult"){
		hideResultDom.className = newClass;
		leftDom.style.display = "";
		contentPanelDom.className = "contentPanel";
	}
	else{
		hideResultDom.className = newClass;
		leftDom.style.display = "none";
		contentPanelDom.className = "contentPanel2";
	}
	j_resize();
	j_map._onResize();
}

function j_addOverLayRoute(obj){
	var tmpMap = j_tog._map;
	// var tmpMap = j_map;
	if(obj){
		var featuresNode = obj.features;
		if(featuresNode){
			for(var i = 0; i < featuresNode.length; i++){
				var featureNode = featuresNode[i];
				if(featureNode && featureNode.geometry && featureNode.geometry.type.toLowerCase() == "linestring"){
					var coordsNode = featureNode.geometry.coordinates;
					var coordsArr = new Array();
					for(var j = 0; j < coordsNode.length; j++){
						var pointNode = coordsNode[j];
						coordsArr.push(new L.Loc(pointNode[0], pointNode[1]));
					}
					var lineOptions = {
						strokeColor: "#00ccEE",
						strokeWidth: 8,
						strokeOpacity: 0.5,
						strokeStyle: "solid",
						editable:false
					};

					var tmpLine = new L.Ols.Line(coordsArr, lineOptions);
					var tmpLine2 = new L.Ols.Line(coordsArr, lineOptions);
					tmpMap.addOverlays(tmpLine);
			     	j_map.addOverlays(tmpLine2);
				}
			}
		}
	}
}
function j_initRouteLayer(){
	j_addOverLayRoute(j_sigmObj);
	j_addOverLayRoute(j_unKnownObj);
};
