
/**************************************
********城市定位功能相关代码***********
***************************************/
function showDemoCity(cityName){
	if(cityName == "beijing")
	{
		//j_tog._map.moveTo(new L.Loc(117.1,36.1), 13);
		j_tog._map.zoomToExtent(new L.Extent(116.504,39.7689, 116.53,39.7854));
		j_map.zoomToExtent(new L.Extent(116.504,39.7689, 116.53,39.7854));
	}
	else if(cityName == "taian")
	{
		//j_tog._map.moveTo(new L.Loc(116.4, 39.9), 13);
		j_tog._map.zoomToExtent(new L.Extent(115.846,28.7087,  115.917,28.7346));
		j_map.zoomToExtent(new L.Extent(115.846,28.7087,  115.917,28.7346));
	}
}
function j_setSize(domele, size){
	domele.style.width = size.x + "px";
	domele.style.height = size.y + "px";
}
function j_resize(){
	var contentDiv = document.getElementById("contentPanel");
	var contentDivSize = new L.Loc(contentDiv.clientWidth, contentDiv.clientHeight -28);
	var mapDiv = L.Util.get("viewport");
	var svDiv = L.Util.get("viewportstreetview");
	j_setSize(mapDiv, contentDivSize);
	j_setSize(svDiv, contentDivSize);
	// mapDiv.style.width = contentDivSize.x + "px";
	// mapDiv.style.height = contentDivSize.y + "px";
	
	if(j_tog){
		j_tog.update();
	}
	//j_map._onResize();
}

function j_resizeMap(){
}