L.Parser = L.Class.extend({
    options: null,
    externalProjection: null,
    internalProjection: null,
    data: null,
    keepData: false,
    initialize: function(options) {
        L.Util.setOptions(this, options);
    },
    destroy: function() {
    },
    read: function(data) {
        return null;
    },
    write: function(object) {
        return null;
    },
    CLASS_NAME: "L.Parser"
});

L.Parser.XML = L.Parser.extend({
    namespaces: null,
    namespaceAlias: null,
    defaultPrefix: null,
    readers: {},
    writers: {},
    xmldom: null,
    initialize: function(options){
        if(window.ActiveXObject) {
            this.xmldom = new ActiveXObject("Microsoft.XMLDOM");
        }
        L.Parser.prototype.initialize.call(options);
        
        this.namespaces = L.Util.extend({}, this.namespaces);
        this.namespaceAlias = {};
        for(var alias in this.namespaces) {
            this.namespaceAlias[this.namespaces[alias]] = alias;
        }
    },
    
    destroy: function() {
        this.xmldom = null;
        L.Parser.prototype.destroy.apply(this, arguments);
    },
    
    setNamespace: function(alias, uri) {
        this.namespaces[alias] = uri;
        this.namespaceAlias[uri] = alias;
    },
    
    read: function(text) {
        var index = text.indexOf('<');
        if(index > 0) {
            text = text.substring(index);
        }
        var node = L.Util.tryFuncs(
            L.Util.bind((
                function() {
                    var xmldom;
                    if(window.ActiveXObject && !this.xmldom) {
                        xmldom = new ActiveXObject("Microsoft.XMLDOM");
                    } else {
                        xmldom = this.xmldom;
                        
                    }
                    xmldom.loadXML(text);
                    return xmldom;
                }
            ), this),
            function() {
                return new DOMParser().parseFromString(text, 'text/xml');
            },
            function() {
                var req = new XMLHttpRequest();
                req.open("GET", "data:" + "text/xml" +
                         ";charset=utf-8," + encodeURIComponent(text), false);
                if(req.overrideMimeType) {
                    req.overrideMimeType("text/xml");
                }
                req.send(null);
                return req.responseXML;
            }
        );

        if(this.keepData) {
            this.data = node;
        }

        return node;
    },
    
    write: function(node) {
        var data;
        if(this.xmldom) {
            data = node.xml;
        } else {
            var serializer = new XMLSerializer();
            if (node.nodeType == 1) {
                var doc = document.implementation.createDocument("", "", null);
                if (doc.importNode) {
                    node = doc.importNode(node, true);
                }
                doc.appendChild(node);
                data = serializer.serializeToString(doc);
            } else {
                data = serializer.serializeToString(node);
            }
        }
        return data;
    },
    
    createElementNS: function(uri, name) {
        var element;
        if(this.xmldom) {
            if(typeof uri == "string") {
                element = this.xmldom.createNode(1, name, uri);
            } else {
                element = this.xmldom.createNode(1, name, "");
            }
        } else {
            element = document.createElementNS(uri, name);
        }
        return element;
    },
    
    createTextNode: function(text) {
        var node;
        if (typeof text !== "string") {
            text = String(text);
        }
        if(this.xmldom) {
            node = this.xmldom.createTextNode(text);
        } else {
            node = document.createTextNode(text);
        }
        return node;
    },
    
    getElementsByTagNameNS: function(node, uri, name) {
        var elements = [];
        if(node.getElementsByTagNameNS) {
            elements = node.getElementsByTagNameNS(uri, name);
        } else {
            // brute force method
            var allNodes = node.getElementsByTagName("*");
            var potentialNode, fullName;
            for(var i=0, len=allNodes.length; i<len; ++i) {
                potentialNode = allNodes[i];
                fullName = (potentialNode.prefix) ?
                           (potentialNode.prefix + ":" + name) : name;
                if((name == "*") || (fullName == potentialNode.nodeName)) {
                    if((uri == "*") || (uri == potentialNode.namespaceURI)) {
                        elements.push(potentialNode);
                    }
                }
            }
        }
        return elements;
    },

    getAttributeNodeNS: function(node, uri, name) {
        var attributeNode = null;
        if(node.getAttributeNodeNS) {
            attributeNode = node.getAttributeNodeNS(uri, name);
        } else {
            var attributes = node.attributes;
            var potentialNode, fullName;
            for(var i=0, len=attributes.length; i<len; ++i) {
                potentialNode = attributes[i];
                if(potentialNode.namespaceURI == uri) {
                    fullName = (potentialNode.prefix) ?
                               (potentialNode.prefix + ":" + name) : name;
                    if(fullName == potentialNode.nodeName) {
                        attributeNode = potentialNode;
                        break;
                    }
                }
            }
        }
        return attributeNode;
    },
    
    getAttributeNS: function(node, uri, name) {
        var attributeValue = "";
        if(node.getAttributeNS) {
            attributeValue = node.getAttributeNS(uri, name) || "";
        } else {
            var attributeNode = this.getAttributeNodeNS(node, uri, name);
            if(attributeNode) {
                attributeValue = attributeNode.nodeValue;
            }
        }
        return attributeValue;
    },

    getChildValue: function(node, def) {
        var value = def || "";
        if(node) {
            for(var child=node.firstChild; child; child=child.nextSibling) {
                switch(child.nodeType) {
                    case 3: // text node
                    case 4: // cdata section
                        value += child.nodeValue;
                }
            }
        }
        return value;
    },

    concatChildValues: function(node, def) {
        var value = "";
        var child = node.firstChild;
        var childValue;
        while(child) {
            childValue = child.nodeValue;
            if(childValue) {
                value += childValue;
            }
            child = child.nextSibling;
        }
        if(value == "" && def != undefined) {
            value = def;
        }
        return value;
    },
    
    isSimpleContent: function(node) {
        var simple = true;
        for(var child=node.firstChild; child; child=child.nextSibling) {
            if(child.nodeType === 1) {
                simple = false;
                break;
            }
        }
        return simple;
    },
    
    contentType: function(node) {
        var simple = false,
            complex = false;
            
        var type = L.Parser.XML.CONTENT_TYPE.EMPTY;

        for(var child=node.firstChild; child; child=child.nextSibling) {
            switch(child.nodeType) {
                case 1: // element
                    complex = true;
                    break;
                case 8: // comment
                    break;
                default:
                    simple = true;
            }
            if(complex && simple) {
                break;
            }
        }
        
        if(complex && simple) {
            type = L.Parser.XML.CONTENT_TYPE.MIXED;
        } else if(complex) {
            return L.Parser.XML.CONTENT_TYPE.COMPLEX;
        } else if(simple) {
            return L.Parser.XML.CONTENT_TYPE.SIMPLE;
        }
        return type;
    },

    hasAttributeNS: function(node, uri, name) {
        var found = false;
        if(node.hasAttributeNS) {
            found = node.hasAttributeNS(uri, name);
        } else {
            found = !!this.getAttributeNodeNS(node, uri, name);
        }
        return found;
    },
    
    setAttributeNS: function(node, uri, name, value) {
        if(node.setAttributeNS) {
            node.setAttributeNS(uri, name, value);
        } else {
            if(this.xmldom) {
                if(uri) {
                    var attribute = node.ownerDocument.createNode(
                        2, name, uri
                    );
                    attribute.nodeValue = value;
                    node.setAttributeNode(attribute);
                } else {
                    node.setAttribute(name, value);
                }
            } else {
                throw "setAttributeNS not implemented";
            }
        }
    },

    createElementNSPlus: function(name, options) {
        options = options || {};
        // order of prefix preference
        // 1. in the uri option
        // 2. in the prefix option
        // 3. in the qualified name
        // 4. from the defaultPrefix
        var uri = options.uri || this.namespaces[options.prefix];
        if(!uri) {
            var loc = name.indexOf(":");
            uri = this.namespaces[name.substring(0, loc)];
        }
        if(!uri) {
            uri = this.namespaces[this.defaultPrefix];
        }
        var node = this.createElementNS(uri, name);
        if(options.attributes) {
            this.setAttributes(node, options.attributes);
        }
        var value = options.value;
        if(value != null) {
            node.appendChild(this.createTextNode(value));
        }
        return node;
    },
    
    setAttributes: function(node, obj) {
        var value, uri;
        for(var name in obj) {
            if(obj[name] != null && obj[name].toString) {
                value = obj[name].toString();
                // check for qualified attribute name ("prefix:local")
                uri = this.namespaces[name.substring(0, name.indexOf(":"))] || null;
                this.setAttributeNS(node, uri, name, value);
            }
        }
    },

    readNode: function(node, obj) {
        if(!obj) {
            obj = {};
        }
        var group = this.readers[node.namespaceURI ? this.namespaceAlias[node.namespaceURI]: this.defaultPrefix];
        if(group) {
            var local = node.localName || node.nodeName.split(":").pop();
            var reader = group[local] || group["*"];
            if(reader) {
                reader.apply(this, [node, obj]);
            }
        }
        return obj;
    },

    readChildNodes: function(node, obj) {
        if(!obj) {
            obj = {};
        }
        var children = node.childNodes;
        var child;
        for(var i=0, len=children.length; i<len; ++i) {
            child = children[i];
            if(child.nodeType == 1) {
                this.readNode(child, obj);
            }
        }
        return obj;
    },

    writeNode: function(name, obj, parent) {
        var prefix, local;
        var split = name.indexOf(":");
        if(split > 0) {
            prefix = name.substring(0, split);
            local = name.substring(split + 1);
        } else {
            if(parent) {
                prefix = this.namespaceAlias[parent.namespaceURI];
            } else {
                prefix = this.defaultPrefix;
            }
            local = name;
        }
        var child = this.writers[prefix][local].apply(this, [obj]);
        if(parent) {
            parent.appendChild(child);
        }
        return child;
    },

    getChildEl: function(node, name, uri) {
        return node && this.getThisOrNextEl(node.firstChild, name, uri);
    },
    
    getNextEl: function(node, name, uri) {
        return node && this.getThisOrNextEl(node.nextSibling, name, uri);
    },
    
    getThisOrNextEl: function(node, name, uri) {
        outer: for(var sibling=node; sibling; sibling=sibling.nextSibling) {
            switch(sibling.nodeType) {
                case 1: // Element
                    if((!name || name === (sibling.localName || sibling.nodeName.split(":").pop())) &&
                       (!uri || uri === sibling.namespaceURI)) {
                        // matches
                        break outer;
                    }
                    sibling = null;
                    break outer;
                case 3: // Text
                    if(/^\s*$/.test(sibling.nodeValue)) {
                        break;
                    }
                case 4: // CDATA
                case 6: // ENTITY_NODE
                case 12: // NOTATION_NODE
                case 10: // DOCUMENT_TYPE_NODE
                case 11: // DOCUMENT_FRAGMENT_NODE
                    sibling = null;
                    break outer;
            } // ignore comments and processing instructions
        }
        return sibling || null;
    },
    
    lookupNamespaceURI: function(node, prefix) {
        var uri = null;
        if(node) {
            if(node.lookupNamespaceURI) {
                uri = node.lookupNamespaceURI(prefix);
            } else {
                outer: switch(node.nodeType) {
                    case 1: // ELEMENT_NODE
                        if(node.namespaceURI !== null && node.prefix === prefix) {
                            uri = node.namespaceURI;
                            break outer;
                        }
                        var len = node.attributes.length;
                        if(len) {
                            var attr;
                            for(var i=0; i<len; ++i) {
                                attr = node.attributes[i];
                                if(attr.prefix === "xmlns" && attr.name === "xmlns:" + prefix) {
                                    uri = attr.value || null;
                                    break outer;
                                } else if(attr.name === "xmlns" && prefix === null) {
                                    uri = attr.value || null;
                                    break outer;
                                }
                            }
                        }
                        uri = this.lookupNamespaceURI(node.parentNode, prefix);
                        break outer;
                    case 2: // ATTRIBUTE_NODE
                        uri = this.lookupNamespaceURI(node.ownerElement, prefix);
                        break outer;
                    case 9: // DOCUMENT_NODE
                        uri = this.lookupNamespaceURI(node.documentElement, prefix);
                        break outer;
                    case 6: // ENTITY_NODE
                    case 12: // NOTATION_NODE
                    case 10: // DOCUMENT_TYPE_NODE
                    case 11: // DOCUMENT_FRAGMENT_NODE
                        break outer;
                    default: 
                        // TEXT_NODE (3), CDATA_SECTION_NODE (4), ENTITY_REFERENCE_NODE (5),
                        // PROCESSING_INSTRUCTION_NODE (7), COMMENT_NODE (8)
                        uri =  this.lookupNamespaceURI(node.parentNode, prefix);
                        break outer;
                }
            }
        }
        return uri;
    },
    
    getXMLDoc: function() {
        if (!L.Parser.XML.document && !this.xmldom) {
            if (document.implementation && document.implementation.createDocument) {
                L.Parser.XML.document =
                    document.implementation.createDocument("", "", null);
            } else if (!this.xmldom && window.ActiveXObject) {
                this.xmldom = new ActiveXObject("Microsoft.XMLDOM");
            }
        }
        return L.Parser.XML.document || this.xmldom;
    },

    CLASS_NAME: "L.Parser.XML" 

});
L.Parser.XML.CONTENT_TYPE = {EMPTY: 0, SIMPLE: 1, COMPLEX: 2, MIXED: 3};
L.Parser.XML.lookupNamespaceURI = L.Util.bind(
    L.Parser.XML.prototype.lookupNamespaceURI,
    L.Parser.XML.prototype
);
L.Parser.XML.document = null;


L.Parser.GML = L.Parser.XML.extend({
	_featurens: "http://mapserver.gis.umn.edu/mapserver",
	featurePrefix: "feature",
	featureName: "featureMember",
	layerName: "features",
	geometryName: "geometry",
	collectionName: "FeatureCollection",
	gmlns: "http://www.opengis.net/gml",
	getAttributes: true,
	xy: true,
	initialize: function(options) {
		this.regExes = {
            trimSpace: (/^\s*|\s*$/g),
            removeSpace: (/\s*/g),
            splitSpace: (/\s+/),
            trimComma: (/\s*,\s*/g)
        };
        L.Parser.XML.prototype.initialize.apply(this, [options]);
		for(key in options){
		 	if(options.hasOwnProperty(key)&&key=='getAttributes'){
				this.getAttributes = options[key];
			}
		}
	},
	read: function(data) {
        if(typeof data == "string") { 
            data = L.Parser.XML.prototype.read.apply(this, [data]);
        }
        var featureNodes = this.getElementsByTagNameNS(data.documentElement,
                                                       this.gmlns,
                                                       this.featureName);
        var features = [];
        for(var i=0; i<featureNodes.length; i++) {
            var feature = this.parseFeature(featureNodes[i]);
            if(feature) {
                features.push(feature);
            }
        }
        return features;
    },
	parseFeature: function(node) {
        var order = ["MultiPolygon", "Polygon",
                     "MultiLineString", "LineString",
                     "MultiPoint", "Point"];
        var type, nodeList, geometry, parser;
        for(var i=0; i<order.length; ++i) {
            type = order[i];
            nodeList = this.getElementsByTagNameNS(node, this.gmlns, type);
            if(nodeList.length > 0) {
                // only deal with first geometry of this type
                var parser = this.parseGeometry[type.toLowerCase()];
                if(parser) {
                    geometry = parser.apply(this, [nodeList[0]]);
                    if (this.internalProjection && this.externalProjection) {
                        /*geometry.transform(this.externalProjection, 
                                           this.internalProjection); */
                    }                       
                } else {
                    NLog.error(NMGISLG(
                                "unsupportedGeometryType", {'geomType':type}));
                }
                break;
            }
        }
        // construct feature (optionally with attributes)
        var attributes;
        if(this.getAttributes) {
            attributes = this.parseAttributes(node);
        }
        var feature = new L.Ols.Feature(geometry, attributes);
		feature._layerFlag = true;
        
        feature.gml = {
            featureType: node.firstChild.nodeName.split(":")[1],
            _featurens: node.firstChild.namespaceURI,
            featureNSPrefix: node.firstChild.prefix
        };
                
        // assign fid - this can come from a "fid" or "id" attribute
        var childNode = node.firstChild;
        var fid;
        while(childNode) {
            if(childNode.nodeType == 1) {
                fid = childNode.getAttribute("fid") ||
                      childNode.getAttribute("id");
                if(fid) {
                    break;
                }
            }
            childNode = childNode.nextSibling;
        }
        feature.fid = fid;
        return feature;
    },
    parseGeometry: {
        point: function(node) {
            var nodeList, coordString;
            var coords = [];
            // look for <gml:pos>
            var nodeList = this.getElementsByTagNameNS(node, this.gmlns, "pos");
            if(nodeList.length > 0) {
                coordString = nodeList[0].firstChild.nodeValue;
                coordString = coordString.replace(this.regExes.trimSpace, "");
                coords = coordString.split(this.regExes.splitSpace);
            }
            // look for <gml:coordinates>
            if(coords.length == 0) {
                nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                                                       "coordinates");
                if(nodeList.length > 0) {
                    coordString = nodeList[0].firstChild.nodeValue;
                    coordString = coordString.replace(this.regExes.removeSpace,
                                                      "");
                    coords = coordString.split(",");
                }
            }
            // look for <gml:coord>
            if(coords.length == 0) {
                nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                                                       "coord");
                if(nodeList.length > 0) {
                    var xList = this.getElementsByTagNameNS(nodeList[0],
                                                            this.gmlns, "X");
                    var yList = this.getElementsByTagNameNS(nodeList[0],
                                                            this.gmlns, "Y");
                    if(xList.length > 0 && yList.length > 0) {
                        coords = [xList[0].firstChild.nodeValue,
                                  yList[0].firstChild.nodeValue];
                    }
                }
            }
            // preserve third dimension
            if(coords.length == 2) {
                coords[2] = null;
            }
            
            if (this.xy) {
				return new L.Ols.Point(new L.Loc(coords[0],coords[1]));
            }
            else{
				return new L.Ols.Point(new L.Loc(coords[1],coords[0]));
            }
        },
        
        multipoint: function(node) {
            var nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                                                       "Point");
            var components = [];
            if(nodeList.length > 0) {
                var point;
                for(var i=0; i<nodeList.length; ++i) {
                    point = this.parseGeometry.point.apply(this, [nodeList[i]]);
                    if(point) {
                        components.push(point._latlng);
                    }
                }
            }
            return new L.Ols.MultiPoint(components);
        },
        
        linestring: function(node, ring) {
            var nodeList, coordString;
            var coords = [];
            var points = [];
            // look for <gml:posList>
            nodeList = this.getElementsByTagNameNS(node, this.gmlns, "posList");
            if(nodeList.length > 0) {
                coordString = this.concatChildValues(nodeList[0]);
                coordString = coordString.replace(this.regExes.trimSpace, "");
                coords = coordString.split(this.regExes.splitSpace);
				var tempTag = nodeList[0].getAttribute("dimension");
				if(tempTag == null || tempTag == undefined)
				{
					tempTag = nodeList[0].getAttribute("srsDimension")
				}
                var dim = parseInt(tempTag);
                var j, x, y, z;
                for(var i=0; i<coords.length/dim; ++i) {
                    j = i * dim;
                    x = coords[j];
                    y = coords[j+1];
                    z = (dim == 2) ? null : coords[j+2];
                    if (this.xy) {
                        points.push(new L.Loc(x,y));
                    } else {
                        points.push(new L.Loc(y,x));
                    }
                }
            }
            // look for <gml:coordinates>
            if(coords.length == 0) {
                nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                                                       "coordinates");
                if(nodeList.length > 0) {
                    coordString = this.concatChildValues(nodeList[0]);
                    coordString = coordString.replace(this.regExes.trimSpace,
                                                      "");
                    coordString = coordString.replace(this.regExes.trimComma,
                                                      ",");
                    var pointList = coordString.split(this.regExes.splitSpace);
                    for(var i=0; i<pointList.length; ++i) {
                        coords = pointList[i].split(",");
                        if(coords.length == 2) {
                            coords[2] = null;
                        }
                        if (this.xy) {
                            points.push(new L.Loc(coords[0],coords[1]));
                        } else {
                            points.push(new L.Loc(coords[1],coords[0]));
                        }
                    }
                }
            }
            var line = null;
            if(points.length != 0) {
                if(ring) {
                    line = new L.Ols.Line(points);
                } else {
                    line = new L.Ols.Line(points);
                }
            }
            return line;
        },
        
        multilinestring: function(node) {
            var nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                                                       "LineString");
            var components = [];
            if(nodeList.length > 0) {
                var line;
                for(var i=0; i<nodeList.length; ++i) {
                    line = this.parseGeometry.linestring.apply(this,
                                                               [nodeList[i]]);
                    if(line) {
                        components.push(line);
                    }
                }
            }
            return new L.Ols.MultiLine(components);
        },
        
        polygon: function(node) {
            var nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                                                       "LinearRing");
            var components = [];
            if(nodeList.length > 0) {
                // this assumes exterior ring first, inner rings after
                var ring;
                for(var i=0; i<nodeList.length; ++i) {
                    ring = this.parseGeometry.linestring.apply(this,
                                                        [nodeList[i], true]);
                    if(ring) {
						/*for(var i=0;i<ring._points.length;i++){
							components.push(ring._points[i]);
						}*/
						return new L.Ols.Polygon(ring._points);
                    }
                }
            }
            return new L.Ols.Polygon(components);
        },
        
        multipolygon: function(node) {
            var nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                                                       "Polygon");
            var components = [];
            if(nodeList.length > 0) {
                var polygon;
                for(var i=0; i<nodeList.length; ++i) {
                    polygon = this.parseGeometry.polygon.apply(this,
                                                               [nodeList[i]]);
                    if(polygon) {
                        components.push(polygon);
                    }
                }
            }
            return new L.Ols.MultiPolygon(components);
        }
        
    },
	parseAttributes: function(node) {
        var attributes = {};
        // assume attributes are children of the first type 1 child
        var childNode = node.firstChild;
        var children, i, child, grandchildren, grandchild, name, value;
        while(childNode) {
            if(childNode.nodeType == 1) {
                // attributes are type 1 children with one type 3 child
                children = childNode.childNodes;
                for(i=0; i<children.length; ++i) {
                    child = children[i];
                    if(child.nodeType == 1) {
                        grandchildren = child.childNodes;
                        if(grandchildren.length == 1) {
                            grandchild = grandchildren[0];
                            if(grandchild.nodeType == 3 ||
                               grandchild.nodeType == 4) {
                                name = (child.prefix) ?
                                        child.nodeName.split(":")[1] :
                                        child.nodeName;
                                value = grandchild.nodeValue.replace(
                                                this.regExes.trimSpace, "");
                                attributes[name] = value;
                            }
                        }
                    }
                }
                break;
            }
            childNode = childNode.nextSibling;
        }
        return attributes;
    }
});

L.Layers.NM = {};
L.Layers.NM.RoutesLayer = L.Layers.Overlay.extend({
    options:{
        isBasicLayer:false,
        requestHeaders: null,
        routesType: "shortest",
        returnCoords: true,
        returnDescription: true
    },
    
    /**
     * @name proxy
     * @description 用于设置代理地址，解决跨域问题
     * @type {String}
     */
    proxy: null,
    
    /**
     * @name failFunc
     * @description 路径分析服务处理失败时的回调函数
     * @type {Function}
     */
    failFunc: null,
    
    /**
     * @name successFunc
     * @description 路径分析服务处理成功时的回调函数
     * @type {Function}
     */
    successFunc: null,
    
    points:"",
    
    /**
     * @constructor
     * @name L.Layers.NM.RoutesLayer
     * @description NRoutesLayer构造函数
     * @param {String} name 图层名称
     * @param {String} url 路径分析服务地址
     * @param {L.Layers.NM.RoutesLayerOptions} options 路径分析服务参数，该参数的选择参见<L.Layers.NM.RoutesLayerOptions>
     */
    initialize: function(name, url, options) {
        this.name = name;
        this.setUrl(url);
        this.setRoutesLayerOptions(options);
        //L.Util.setOptions(this, options);
    },
    
    /**
     * @function
     * @name setRoutesLayerOptions
     * @description 设置图层所用的路径分析服务参数
     * @param {L.Layers.NM.RoutesLayerOptions} options 路径分析服务参数，该参数的选择参见<L.Layers.NM.RoutesLayerOptions>
     */
    setRoutesLayerOptions: function(options) {
        options = options || {};
        options.startMarkerOptions = options.startMarkerOptions || {};
        options.endMarkerOptions = options.endMarkerOptions || {};
        options.passMarkerOptions = options.passMarkerOptions || {};
        this.options = L.Util.extend({}, L.Layers.NM.RoutesLayerOptions, options);
        this.options.startMarkerOptions = L.Util.extend({}, L.Layers.NM.RoutesLayerOptions.startMarkerOptions, options.startMarkerOptions);
        this.options.endMarkerOptions = L.Util.extend({}, L.Layers.NM.RoutesLayerOptions.endMarkerOptions, options.endMarkerOptions);
        this.options.passMarkerOptions = L.Util.extend({}, L.Layers.NM.RoutesLayerOptions.passMarkerOptions, options.passMarkerOptions);
    },
    
    /**
     * @function
     * @name setUrl
     * @description 设置路径分析服务地址
     * @param {String} url 路径分析服务地址
     */
    setUrl: function(url) {
        this.url = url;
    },
    
    /**
     * @function
     * @name setMode
     * @description 设置该图层的地图交互模式，该方法可实现通过地图点击操作设置路径起始点、设置路径终点、增加途经点的操作
     * @param {String} type 图层的交互模式，该参数取值范围为["ADD_START_MARKER", "ADD_END_MARKER", "ADD_PASS_MARKER"]
     */
    setMode: function (type) {
        if(!this._map)
            return;
        type = type.toUpperCase();
        this._map.setMode("dragzoom");
        if(type === "ADD_START_MARKER"){
            //this._map._hegemonTag = true;
            this._map.on("click", this._addStartMarkerFunc, this);
        }
        else if(type === "ADD_END_MARKER"){
            //this._map._hegemonTag = true;
            this._map.on("click", this._addEndMarkerFunc, this);
        }
        else if(type === "ADD_PASS_MARKER"){
           //this._map._hegemonTag = true;
            this._map.on("click", this._addPassMarkerFunc, this);
        }
        
    },
    
    /**
     * @function
     * @name addPassPoints
     * @description 设置途经点
     * @param {L.Loc | Array<L.Loc>} points 途经点或途经点数组
     */
    addPassPoints: function (points) {
        if(!points)
            return;
        points = (points instanceof L.Loc) ? [points] : points;
       
        var i, tmpXY, len = points.length;
        if(len){
            for(i=0; i < len; i++){
                tmpXY = points[i];
                if(tmpXY instanceof L.Loc){
                    this._addPassPoint(tmpXY);
                }
            }
        }
    },
    
    /**
     * @function
     * @name setStartPoint
     * @description 设置路径起始点坐标
     * @param {L.Loc} pos 路径起始点坐标
     */
    setStartPoint: function (pos) {
        if(pos && (pos instanceof L.Loc)){
            if(!this._startMarker){
                this._startMarker = this._createMarker(pos, this.options.startMarkerOptions);
                this.addOverlay(this._startMarker);
                this._startMarker.setTitle("拖动改变起点位置");
            }
            else
                this._startMarker.setPosition(pos);
        }
    },
    
    /**
     * @function
     * @name getStartPoint
     * @description 获取路径起点坐标
     * @return {L.Loc} 起点位置地理坐标
     */
    getStartPoint:function() {
        return this._startMarker ? this._startMarker.getPosition() : null;
    },
    
    /**
     * @function
     * @name setEndPoint
     * @description 设置路径终点坐标
     * @param {L.Loc} pos 路径终点坐标
     */
    setEndPoint: function(pos) {
        if(pos && (pos instanceof L.Loc)){
            if(!this._endMarker){
                this._endMarker = this._createMarker(pos, this.options.endMarkerOptions);
                this.addOverlay(this._endMarker);
                this._endMarker.setTitle("拖动改变终点位置");
            }
            else
                this._endMarker.setPosition(pos);
        }
    },
    
    /**
     * @function
     * @name getEndPoint
     * @description 获取路径终点坐标
     * @return {L.Loc} 终点位置地理坐标
     */
    getEndPoint:function() {
        return this._endMarker ? this._endMarker.getPosition() : null;
    },
    
    /**
     * @function
     * @name startQuery
     * @description 向服务器发送路径分析请求
     * @return {none} 该方法不返回任何返回值，路径分析请求结果将通过回调函数进行操作
     */
    startQuery:function(){
        this._initParams();
        var tmpPoints = this._getServicePoints();
        if(!this.url || !tmpPoints || tmpPoints == ''){
            return;
        }
        var type = this.routesType;
        if(this.options.returnCoords){
            var naviurl = "points=" + tmpPoints + "&type="+this.options.routesType + "&format=gpx-track";
            naviurl = L.Util.urlAppend(this.url, naviurl);
            if(this.proxy){
                naviurl = this.proxy + encodeURIComponent(naviurl);
            }
            this.loading = true;
            L.HttpObj.GET({
                url: naviurl,
                headers: this.requestHeaders,
                success: this._onNaviSuccess,
                failure: this._onNaviFailure,
                scope: this
            });
        }
        else if(this.options.returnDescription){
            var routeurl = "points=" + tmpPoints + "&type="+this.options.routesType + "&format=gpx-route";
            routeurl = L.Util.urlAppend(this.url, routeurl);
            this.loading = true;
            if(this.proxy){
                routeurl = this.proxy + encodeURIComponent(routeurl);
            }
            L.HttpObj.GET({
                url: routeurl,
                headers: this.requestHeaders,
                success: this._onRouteSuccess,
                failure: this._onRouteFailure,
                scope: this
            });
        }
    },
    
    
    _initParams:function(){
        if(this.routeFeatures){
            var key,value;
            for(key in this.routeFeatures){
                if(this.routeFeatures.hasOwnProperty(key)){
                    value = this.routeFeatures[key];
                    if(value)
                        this.removeOverlay(this.routeFeatures[key]);
                    delete this.routeFeatures[key];
                }
            }
        }
    },
    
    _getServicePoints: function () {
        if(!this._startMarker || !this._endMarker){
            return "";
        }
        var startPos = this._startMarker.getPosition();
        var endPos = this._endMarker.getPosition();
        var key, tmpPos, tmpMarker;
        var tmpPoints = startPos.x + "," + startPos.y + ";";
        if(this._passMarkers){
            for(key in this._passMarkers){
                if(this._passMarkers.hasOwnProperty(key)){
                    tmpMarker = this._passMarkers[key];
                    if(tmpMarker){
                        tmpPos = tmpMarker.getPosition();
                        tmpPoints += tmpPos.x + "," + tmpPos.y + ";";
                    }
                }
            }
        }
        tmpPoints +=  endPos.x + "," + endPos.y;
        return tmpPoints;
    },
    
    _addStartMarkerFunc: function (e) {
        this.setStartPoint(e.point);
        this._map.off("click", this._addStartMarkerFunc);
        this._reactiveMapMode();
    },
    _addEndMarkerFunc: function (e) {
        this.setEndPoint(e.point);
        this._map.off("click", this._addEndMarkerFunc);
        this._reactiveMapMode();
    },
    _addPassMarkerFunc: function (e) {
        this.addPassPoints(e.point);
        this._map.off("click", this._addPassMarkerFunc);
        this._reactiveMapMode();
    },
    _reactiveMapMode: function () {
        this._map.setMode("dragzoom");
        this.startQuery();
    },

    _routeEdit: function (e) {
        if(!this._routeEditMarker)
            this._createDivAnchor(e.point);
        else{
            this._routeEditMarker.setVisible(true);
            this._routeEditMarker.setPosition(e.point);
        }
    },
    
    /**
     * @function
     * @name clear
     * @description 清除图层中的所有起点、终点、途经点、线路等信息
     */
    clear:function(){
        L.Layers.Overlay.prototype.clear.call(this);
        this._routeEditMarker = null;
        this._startMarker = null;
        this._endMarker = null;
        this.routes = null;
        this._points = "";
        this._passMarkers = null;
    },
    
    _endRouteEdit: function (e) {
        if(this._routeEditMarker){
            if(this._showHideTimer){
                clearTimeout(this._showHideTimer);
            }
            var that = this;
            this._showHideInterval = 1000;
            this._showHideTimer = setTimeout(that._hideRouteEditMarker(that), this._showHideInterval);
        }
    },
    
    _hideRouteEditMarker: function(that){
        var obj = that;
        return (function(){
            if(obj._routeEditMarker)
                obj._routeEditMarker.setVisible(false);
        });
    },
    
    _createDivAnchor: function (latlng) {
        this._routeEditMarker = new L.Ols.EditAnchor(latlng, {
            draggable: true
        });

        this._routeEditMarker._featurePos = latlng;

        this._routeEditMarker.on('drag', this._onDivAnchorDrag, this);
        this._routeEditMarker.on('dragend', this._onDivAnchorDragEnd, this);

        this.addOverlay(this._routeEditMarker);
        this._routeEditMarker.setTitle("拖动设置途经位置");

        return this._routeEditMarker;
    },
    
    _onDivAnchorDrag: function (e) {
        var marker = e.target;
    },
    
    _createMarker: function (pos, options) {
        options = L.Util.extend({draggable:true}, options);
        var marker = new L.Ols.Marker(pos, options);
        //drag事件
        marker.on('dragend', this._changePassMarker, this);
        L.Util.stamp(marker);
        return marker;
    },
    
    _removePassMarker: function (e) {
        var marker = e.target;
        var markerId = L.Util.stamp(marker);
        this.removeOverlay(marker);
        delete this._passMarkers[markerId];
        this.startQuery();
    },
    
    _changePassMarker:function (e) {
        var marker = e.target;
        //var markerId = L.Util.stamp(marker);
        this.startQuery();
    },
    
    _onDivAnchorDragEnd: function(e) {
        var marker = e.target;
        var pos = marker.getPosition();
        this._addPassPoint(pos);
        this.startQuery();
    },
    
    _addPassPoint: function (pos) {
        var crsMark = this._createMarker(pos, this.options.passMarkerOptions);
        crsMark.on('click', this._removePassMarker, this);
        
        var markerId = L.Util.stamp(crsMark);
        this._passMarkers = this._passMarkers || {};
        this._passMarkers[markerId] = crsMark;
        this.addOverlay(crsMark);
        crsMark.setTitle("点击移除 拖动更改");
    },
    
    _onNaviSuccess:function(request){
        var doc = request.responseText; 
        var newData = new L.Parser.XML();
        var data = newData.read(doc);
        if(!data)
            this._onNaviFailure(request);
        var trkNodes = data.getElementsByTagName("trk");
        if(trkNodes && trkNodes.length> 0){
            var trkNode = trkNodes[0];
            var trksegNodes = trkNode.getElementsByTagName("trkseg");
            if(trksegNodes && trksegNodes.length > 0){
                for(var i=0,len=trksegNodes.length; i < len; i++){
                    var trksegNode = trksegNodes[i];
                    if(trksegNode){
                        var arr = new Array();      
                        var trkptNodes = trksegNode.getElementsByTagName("trkpt");
                        if(trkptNodes && trkptNodes.length > 0){
                            for(var j=0,len2=trkptNodes.length; j < len2; j++){
                                var trkptNode = trkptNodes[j];
                                if(trkptNode && trkptNode.attributes && trkptNode.attributes.length >= 2){
                                    var xtmp = null;
                                    var ytmp = null;
                                    for(var k=0, len3=trkptNode.attributes.length; k < len3; k++){
                                        if(trkptNode.attributes[k].nodeName == "lat"){
                                            ytmp = trkptNode.attributes[k].nodeValue;
                                        }
                                        else if(trkptNode.attributes[k].nodeName == "lon"){
                                            xtmp = trkptNode.attributes[k].nodeValue;
                                        }
                                    }
                                    if(xtmp == null || ytmp == null)
                                        continue;
                                    arr.push(new L.Loc(xtmp,ytmp));   
                                }
                            }
                        }
                        if(arr.length > 1){
                            this.routeFeatures = this.routeFeatures || {};
                            var routeFeature = new L.Ols.Line(arr, this.options.routesStyleOptions);
                            var routeFeatureId = L.Util.stamp(routeFeature);
                            routeFeature.on("mousemove", this._routeEdit, this);
                            routeFeature.on("mouseout", this._endRouteEdit, this);
                            this.addOverlay(routeFeature);
                            this.routeFeatures[routeFeatureId] = routeFeature;
                        }
                    }
                }
            }
        }

        if(this.options.returnDescription){
            var tmpUrl = this.url;
            var tmpPoints =  this._getServicePoints();
            if(!tmpUrl || !tmpUrl || (tmpUrl == ""))
                return false;
            var routeurl = "points="+ tmpPoints + "&type="+this.options.routesType + "&format=gpx-route";
            routeurl = L.Util.urlAppend(this.url, routeurl);
            if(this.proxy){
                routeurl = this.proxy + encodeURIComponent(routeurl);
            }
            L.HttpObj.GET({
                url: routeurl,
                headers: this.requestHeaders,
                success: this._onRouteSuccess,
                failure: this._onRouteFailure,
                scope: this
            });
        }
        else{
            if (this.successFunc != null) {
                this.successFunc(request);
            }
        }
    },
    _onNaviFailure:function(request){
        if (this.failFunc != null) {
            this.failFunc(request);
        }
    },
    _onRouteSuccess:function(request){
        var doc = request.responseText; 
        var newData = new L.Parser.XML();
        var data = newData.read(doc);
        if(!data)
            this._onRouteFailure(request);
        var retNodes = data.getElementsByTagName("rte");
        if(retNodes && retNodes.length > 0){
            this.routes = new Array();
            var retNode = retNodes[0];
            var rteptNodes = retNode.getElementsByTagName("rtept");
            if(rteptNodes && rteptNodes.length > 0){
                for(var i=0,len=rteptNodes.length; i < len; i++){
                    var rteptNode = rteptNodes[i];
                    if(rteptNode){
                        var arr = new Array();
                        if(!rteptNode.attributes || rteptNode.attributes.length < 2)
                            continue;
                        var xtmp = null;
                        var ytmp = null;
                        for(var k=0, len3=rteptNode.attributes.length; k < len3; k++){
                            if(rteptNode.attributes[k].nodeName == "lat"){
                                ytmp = rteptNode.attributes[k].nodeValue;
                            }
                            else if(rteptNode.attributes[k].nodeName == "lon"){
                                xtmp = rteptNode.attributes[k].nodeValue;
                            }
                        }
                        if(xtmp == null || ytmp == null)
                                continue;
                        arr["loc"] = new L.Loc(xtmp,ytmp);
                        var nameNodes = rteptNode.getElementsByTagName("name");
                        if(!nameNodes || nameNodes.length < 1){
                            continue;
                        }
                        arr["name"] = nameNodes[0].firstChild.nodeValue;
                        var descNodes = rteptNode.getElementsByTagName("desc");
                        if(!descNodes || descNodes.length < 1){
                            continue;
                        }
                        arr["desc"] = descNodes[0].firstChild.nodeValue;
                        
                        this.routes.push(arr);
                    }
                }
            }
        }
        else{
            this._onRouteFailure(request);
        }
        if (this.successFunc != null) {
            this.successFunc(request);
        }
        
    },
    _onRouteFailure:function(request){
        if (this.failFunc != null) {
            this.failFunc(request);
        }
    }
});

L.Layers.NM.RoutesLayerOptions = {

    /**
     * @name routesType
     * @type {String} 
     * @description 路径分析服务处理模式，该属性取值范围为["shortest", "quickest"]
     */
    routesType: "shortest",
    
    /**
     * @name returnCoords
     * @type {Boolean} 
     * @description 标识路径分析服务处理结果中是否返回路径坐标信息
     */
    returnCoords: true,
    
    /**
     * @name returnDescription
     * @type {Boolean} 
     * @description 标识路径分析服务处理结果中是否返回路径描述信息
     */
    returnDescription: true,
    
    /**
     * @name startMarkerOptions
     * @type {L.Ols.MarkerOptions}
     * @description 可选参数，用于起点标注的设置，可参考<L.Ols.MarkerOptions>进行选择
     */
    startMarkerOptions:{
        imgUrl: L.Icon.Default.imagePath + 'qidian.gif',
        shadowUrl:'',
        markerSize: new L.Loc(19, 22),
        markerAnchor: new L.Loc(10, 22),
        dialogAnchor: new L.Loc(0, -21),
        markerTitle: "拖动改变起点位置",
        popable:true,
        clickable: true,
        draggable: true,
        zIndexOffset: 7000
    },
    
    /**
     * @name endMarkerOptions
     * @type {L.Ols.MarkerOptions}
     * @description 可选参数，用于终点标注的设置，可参考<L.Ols.MarkerOptions>进行选择
     */
    endMarkerOptions:{
        imgUrl: L.Icon.Default.imagePath + 'zhongdian.gif',
        shadowUrl:'',
        markerSize: new L.Loc(19, 22),
        markerAnchor: new L.Loc(10, 22),
        dialogAnchor: new L.Loc(0, -21),
        markerTitle: "拖动改变终点位置",
        popable:true,
        clickable: true,
        draggable: true,
        zIndexOffset: 7000
    },
    
    /**
     * @name passMarkerOptions
     * @type {L.Ols.MarkerOptions}
     * @description 可选参数，用于途经点标注的设置，可参考<L.Ols.MarkerOptions>进行选择
     */
    passMarkerOptions:{
        imgUrl: L.Icon.Default.imagePath + 'tujingdian.gif',
        shadowUrl:'',
        markerSize: new L.Loc(19, 22),
        markerAnchor: new L.Loc(10, 22),
        dialogAnchor: new L.Loc(0, -21),
        markerTitle: "点击移除 拖动更改途经点位置",
        popable:true,
        clickable: true,
        draggable: true
    },
    
    /**
     * @name routesStyleOptions
     * @type {L.Ols.LineOptions}
     * @description 可选参数，用于路径样式设置，可参考<L.Ols.LineOptions>进行选择
     */
    routesStyleOptions:{
    }

};

L.Layers.NM.DMP = L.Layers.WMS.extend({
    defaultParams: {
        SERVICE: "WPS",
        REQUEST: "execute",
        IDENTIFIER: "GetMap",
        VERSION: "1.0.0",
        WS: "/NewMapWeb/newmapserver4/sampledata/1.2dv",
        FORMAT:"image/png"
    },
    
    
    /**
     * @constructor
     * @name L.Layers.NM.DMP
     * @description 用于使用NewMapServer WPS实时取图服务的图层类
     * @param  {String} name 图层名称
     * @param  {String} url 图层所使用的服务地址
     * @param  {L.Layers.BaseOptions} options 用于设置图层属性的可选参数，其可选值为当前图层所具有的属性及其所继承的属性
     * @param  {Object} params 用于设置NewMapServer WPS实时取图服务接口所必须的参数，其结构如下：
     *  {
     *       SERVICE: "WPS",
     *       REQUEST: "execute",
     *       IDENTIFIER: "GetMap",
     *       VERSION: "1.0.0",
     *       WS: "/NewMapWeb/newmapserver4/sampledata/1.2dv",
     *       FORMAT:"image/png"
     *   }
     */
    initialize: function(name, url, options, params) {
        L.Layers.WMS.prototype.initialize.call(this, name, url, options, params);
    },
    
    _getUrlStr: function (bounds, size) {
        var tmpStr = 'service=' + this._params.SERVICE + "&request=" + this._params.REQUEST + "&version=" + this._params.VERSION + "&Identifier=" + this._params.IDENTIFIER;
        tmpStr += "&DataInputs=HEIGHT=" + size.y + ";ws=" + this._params.WS + ";WIDTH=" + size.x;
        tmpStr += ";BBOX=" + bounds.exportToString(false);
        tmpStr += "&RawDataOutput=Map@mimeType=" + this._params.FORMAT;
        var resultUrl = L.Util.urlAppend(this.url, tmpStr);
        return encodeURI(resultUrl);
    }
});

L.Layers.NM.MS = L.Layers.WMS.extend({
   
    defaultParams: {
        FORMAT: 'image/jpeg',
        TRANSPARENT: false
    },
    /**
     * @constructor
     * @name L.Layers.NM.MS
     * @description 用于使用NewMap MapServer的map接口实时取图服务的图层类
     * @param  {String} name 图层名称
     * @param  {String} url 图层所使用的map接口服务地址
     * @param  {L.Layers.BaseOptions} options 用于设置图层属性的可选参数，其可选值为当前图层所具有的属性及其所继承的属性
     * @param  {Object} params 用于设置NewMap MapServer的map接口实时取图服务接口所必须的参数，其结构如下：
     *  {
     *       TRANSPARENT: false,
     *       FORMAT:"image/png"
     *   }
     */
    initialize: function(name, url, options, params) {
        L.Layers.WMS.prototype.initialize.call(this, name, url, options, params);
        this.layerType = "L.Layers.NM.MS";
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
        tmpWMSStr += "&format=" + this._params.FORMAT;
        tmpWMSStr += "&srsIn=" + srsCode + "&srsOut=" + srsCode;
        tmpWMSStr += "&BBOX=" + bounds.exportToString(axisOrder);
        
        var resultUrl = L.Util.urlAppend(this.url, tmpWMSStr);
        return encodeURI(resultUrl);
    }
});

L.Layers.NM.Cache36 =  L.Layers.TMS.extend({
	initialize: function(name, url, options){
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
        this.layerType = "L.Layers.NM.Cache36";
    },
    
    setUrl:function (url) {
        this.url = url;
    },
    
    _getTileUrl: function (z, y, x) {
        if(!this.url)
            return null;
		var x1 = x * 256;
		var y1 = (y * (-1) -1) * 256;
		var size = 256* 6;
		var metaX = Math.floor(x1 / size) * size;
		var metaY = Math.floor(y1 / size) * size;
		var res = this._map.getResolution();
		var scale = this._map.getScale();
		scale =parseInt(scale);
		
		
		var ext = "png";
		this.format = this.format.toLowerCase();
		if(this.format == "jpg" || this.format == "image/jpeg"){
			ext = "jpg";
		}
		
		var resUrl = this.url;
		resUrl += "/" + scale +"/" + this.layer +'/def' +'/t' + metaY+'/l'+metaX+'/t'+y1+'l'+x1+'.'+ext;
           
		return resUrl;
       // return encodeURI(resUrl);
    }

});

L.Layers.NM.WW36 = L.Layers.NM.Cache36.extend({
	initialize: function(name, url, options){
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
        this.layerType = "L.Layers.WorldWind";
    },
	_getTileUrl: function (z, y, x) {
        if(!this.url)
            return null;
		var xStr = this._zeroPad(x, 4);
		var yStr = this._zeroPad(y, 4);
		
		
		
		var ext = "jpg";
		var fileName = yStr + "_" + xStr + ".jpg";
		var resUrl = this.url;
		
		resUrl += "/" + z +"/" + yStr +"/"+fileName;
		return resUrl;
       // return encodeURI(resUrl);
    },
	
	_zeroPad: function(number, len){
        var numStr = number.toString(10);
        var zeros = [];
        for(var i = 0; i < len; ++i)
        {
            zeros.push('0');
        }
        return zeros.join('').substring(0, len - numStr.length) + numStr;
    }
});

L.Layers.WorldWind = L.Layers.TileBase.extend({
    _rightAlias:true,
    tileSize:new L.Loc(512, 512),
    
    tileOrigin:new L.Loc(-180, -90),
    
    serverResolutions:new Array(
            0.0703125,
            0.03515625,
            0.017578125,
            0.0087890625,
            0.00439453125,
            0.002197265625,
            0.0010986328125,
            0.00054931640625,
            0.000274658203125,
            0.0001373291015625,
            0.00006866455078125,
            0.000034332275390625,
            0.0000171661376953125,
            0.00000858306884765625,
            0.000004291534423828125,
            0.0000021457672119140625,
            0.00000107288360595703125,
            0.000000536441802978515625,
            0.0000002682209014892578125,
            0.00000013411045074462890625,
            0.000000067055225372314453125),
    
    initialize: function(name, url, options){
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
        this.layerType = "L.Layers.WorldWind";
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
        var components = [
            this.url,
            z,
            this._zeroPad(y, 4),
            this._zeroPad(y, 4)+  "_" +    this._zeroPad(x, 4) + '.'+this.getFormat(null, false)
        ];
        var url = components.join('/'); 

        return encodeURI(url);
    },
    
    _zeroPad: function(number, len){
        var numStr = number.toString(10);
        var zeros = [];
        for(var i = 0; i < len; ++i)
        {
            zeros.push('0');
        }
        return zeros.join('').substring(0, len - numStr.length) + numStr;
    }
});

L.Layers.EDS = L.Layers.TileBase.extend({
    _rightAlias:false,
    tileSize:new L.Loc(256, 256),
    tileOrigin:new L.Loc(-20037508.342787, 20037508.342787),
	projection:"EPSG:3857",
	rangle:Math.PI /180 *60,
    anchorOrigin:new L.Loc(13263842,4399078),

    initialize: function(name, url, options){
        L.Layers.TileBase.prototype.initialize.call(this, name, url, options);
        this.layerType = "L.Layers.WorldWind";
    },
    
    setUrl:function (url) {
        this.url = url;
       
    },
    _getTileUrl: function (z, y, x) {
		//http://npic2.edushi.com/cn/beijing/zh-chs/mappic/png3/-1,-1.png
        if(!this.url)
            return null;
		var num = 17 - z;
		
        var url =this.url + num +"/" + x + "," + y + '.jpg';

        return encodeURI(url);
    },
	
	getPointFromEPoint:function(epoi){
		var x0 = this.anchorOrigin.x;
		var y0 = this.anchorOrigin.y;
		var x = epoi.x, y = epoi.y;
		x -= x0;
		y -= y0;
		x1 = x* Math.cos(this.rangle) - y * Math.sin(this.rangle);
		y1 = x* Math.sin(this.rangle) + y * Math.cos(this.rangle);
		x1 += x0;
		y1 += y0;
		
		
		// var d =  Math.sqrt((x-x0) * (x-x0) + (y-y0) * (y-y0));

		// var x1 = x0 - Math.sin(this.rangle + Math.acos((y0-y)/d))*d;
		// var y1 = y0 - Math.cos(this.rangle + Math.acos((y0-y)/d))*d;
		return new L.Loc(x1, y1);
		
	},
	
	getEpointFromPoint:function(){
		var x0 = this.anchorOrigin.x;
		var y0 = this.anchorOrigin.y;
		var x = epoi.x, y = epoi.y;
		x -= x0;
		y -= y0;
		x1 = x* Math.cos(-this.rangle) - y * Math.sin(-this.rangle);
		y1 = x* Math.sin(-this.rangle) + y * Math.cos(-this.rangle);
		x1 += x0;
		y1 += y0;
	}
	
});


L.Controls.OverView = L.Controls.Base.extend({

	_type : "L.Controls.OverView",
    options: {
        position: 'bottomright',
		backgroundColor:"white"
    },
    
    /**
     * @name: ovmap
     * @type {L.Map} 
     * @description 鹰眼图
     */
    ovmap: null,

    /**
     * @name: size
     * @type {L.Loc} 
     * @description 鹰眼图div的大小。
     */
    size: new L.Loc(180, 90),

    /**
     * @name: layer
     * @type {L.Layers.Base} 
     * @description 鹰眼图的图层。如果没有设置，默认是基础图层。
     */
    layer: null,
    
    /**
     * @name: minRectSize
     * @type {Integer} 
     * @description 鹰眼图矩形范围最小的宽度or高度。
     */
    minRectSize: 15,
    
    /**
     * @name: minRatio
     * @type {Float} 
     * @description 鹰眼图中最小分辨率
     */
    minRatio: 8,

    /**
     * @name: maxRatio
     * @type {Float} 
     * @description 鹰眼图中最大分辨率
     */
    maxRatio: 32,
    
    mapOptions: null,
    
    displayClass: "nmOverviewMapControl", 

    /**
     * @name: resolutionFactor
     * @type {Object} 
     */
    resolutionFactor: 3,
    
    maximized: false,
    
	 /**
     * @constructor
     * @name L.Controls.Position
     * @description 鹰眼图控件的构造函数
     */
    initialize: function (options) {
        L.Controls.Base.prototype.initialize.apply(this, [options]);
    },
    
	_initContainer: function() {
        var map = this._map;
        this._container = L.Util.create('div', this.displayClass);
        L.Util.stamp(this._container);
        
        if (!this.layer) {
            if (map.basicLayer) {
                var layer = map.basicLayer;
                this.layer = layer;
            } else {
                map.on("changebasiclayer", this.basicLayerDraw, this);
                return this._container;
            }
        }
        
		// create overview map DOM elements
		var classNamepanel = this.displayClass + 'Element';
        this.element = L.Util.create('div', classNamepanel);
        this.element.style.display = 'none';
        this.element.style.backgroundColor = this.options.backgroundColor;
        L.Util.stamp(this.element);
		 
        //装载地图上矩形框的 div面板 
		var classNamerect = this.displayClass + 'ExtentRectangle';
        this.extentRectangle = L.Util.create('div', classNamerect);
        this.extentRectangle.style.position = 'absolute';
        this.extentRectangle.style.zIndex = 1000;  //HACK
        L.Util.stamp(this.extentRectangle);
        
        this.mapDiv = document.createElement('div');
        this.mapDiv.style.position = 'relative';
        this.mapDiv.style.width = this.size.x + 'px';
        this.mapDiv.style.height = this.size.y + 'px';
        this.mapDiv.style.overflow = 'hidden';
        L.Util.stamp(this.mapDiv);
		
		this.element.appendChild(this.mapDiv);
		this._container.appendChild(this.element);
		
        this._maximizeDIV = this._createButton("显示", "nmOverviewMapControlMaximizeButton", this._container);//点击显示鹰眼图
        this._minimizeDIV = this._createButton("隐藏", "nmOverviewMapControlMinimizeButton", this._container);//点击隐藏鹰眼图
        this._minimizeClick();
        
		if(map.getExtent()) {
            this.update();
        }
        this._initEvents();
        if (this.maximized) {
            this._maximizeClick();
        }
        return this._container;
    },
	
    moveTo: function (px) {
        if ((px != null) && (this._container != null)) {
            var  position = this.getPosition();  
            if(position == "topright"){
				this._container.style.top = px.y +"px";
				this._container.style.right = px.x+"px";
				this._maximizeDIV.style.bottom = "auto";
				this._maximizeDIV.style.top = "10px";
			}
			else if(position == "bottomright"){
				this._container.style.bottom = px.y +"px";
				this._container.style.right = px.x+"px";
			}
            else if(position == "topleft") {
                this._container.style.top = px.y +"px";
				this._container.style.left = px.x+"px";
                this.element.style.paddingLeft = '18px';
                this.element.style.paddingRight = '10px';
                this._maximizeDIV.style.bottom = "auto";
				this._maximizeDIV.style.right = "auto";
				this._maximizeDIV.style.top = "10px";
				this._maximizeDIV.style.left = "0px";
                
                this._minimizeDIV.style.bottom = "auto";
				this._minimizeDIV.style.right = "auto";
				this._minimizeDIV.style.top = "10px";
				this._minimizeDIV.style.left = "0px";
            }
            else if(position == "bottomleft") {
                this._container.style.bottom = px.y +"px";
				this._container.style.left = px.x + "px";
				this.element.style.paddingLeft = '18px';
                this.element.style.paddingRight = '10px';
				this._maximizeDIV.style.right = "auto";
				this._maximizeDIV.style.left = "0px";
                
                this._minimizeDIV.style.right = "auto";
				this._minimizeDIV.style.left = "0px";
            }
            else
				return;
        }
    },
    
	_initEvents: function () {
		if(!this._map) return;
        var map = this._map;
		L.DomEvent.addListener(this._maximizeDIV, 'click', this._maximizeClick, this);
		L.DomEvent.addListener(this._minimizeDIV, 'click', this._minimizeClick, this);
        map.on('moveend', this.update, this);
    },
      
    basicLayerDraw: function() {
        var map = this._map;
        this._initContainer();
        this.map.off("changebasiclayer", this.basicLayerDraw);
    },
    
	_maximizeClick: function (e) {
	    this.element.style.display = '';
        this.showToggle(false);
        if (e != null) {
            L.DomEvent.stop(e);                                            
        }
    },
    
	_minimizeClick: function (e) {
	    this.element.style.display = 'none';
        this.showToggle(true);
        if (e != null) {
            L.DomEvent.stop(e);                                            
        }
    },
    
    /**
     * @function
     * @name showToggle
     * @description 设置控件是否是最小化
     * @param {Boolean} minimize 
     */
    showToggle: function(minimize) {
        this._maximizeDIV.style.display = minimize ? '' : 'none';
        this._minimizeDIV.style.display = minimize ? 'none' : '';
    },
    
    update:function() {
        if(this.ovmap == null) {
            this.createMap();
        }
        if(!this.isSuitableOverview()) {
            this.updateOverview();
        }
        else
            this.updateRectToMap();
        // update extent rectangle
    },
    
    createMap: function() {
        var options = L.Util.extend(
                        {controls: [], maxResolution: 'auto', 
                         persistEvent: false}, this.mapOptions);
        this.ovmap = new L.Map(this.mapDiv, options);
        this.mapDiv.appendChild(this.extentRectangle);
        
        this.ovmap._size = new L.Loc(this.size.x,this.size.y);
        this.ovmap.addLayer(this.layer);
        this.ovmap.zoomToMaxExtent();
        // check extent rectangle border width
        this.wComp = parseInt(L.Util.getStyle(this.extentRectangle,
                                               'border-left-width')) +
                     parseInt(L.Util.getStyle(this.extentRectangle,
                                               'border-right-width'));
        this.wComp = (this.wComp) ? this.wComp : 2;
        this.hComp = parseInt(L.Util.getStyle(this.extentRectangle,
                                               'border-top-width')) +
                     parseInt(L.Util.getStyle(this.extentRectangle,
                                               'border-bottom-width'));
        this.hComp = (this.hComp) ? this.hComp : 2;
        if(this.ovmap)
            this.ovmap.on('click', this.mapDivClick, this);
    },
    
    mapDivClick: function(evt) {
        var pxCenter = this.rectPxBounds.getCenter();
        var deltaX = evt.pixel.x - pxCenter.x;
        var deltaY = evt.pixel.y - pxCenter.y;
        var top = this.rectPxBounds.maxY;
        var left = this.rectPxBounds.minX;
        var height = Math.abs(this.rectPxBounds.getHeight());
        var width = this.rectPxBounds.getWidth();
        var newTop = Math.max(0, (top + deltaY));
        newTop = Math.min(newTop, this.ovmap._size.y - height);
        var newLeft = Math.max(0, (left + deltaX));
        newLeft = Math.min(newLeft, this.ovmap._size.x - width);
        
        var tmpBounds = new L.Extent();
        tmpBounds.minX = newLeft;
        tmpBounds.minY = newTop + height;
        tmpBounds.maxX = newLeft + width;
        tmpBounds.maxY = newTop;
        this.setRectPxBounds(tmpBounds);
        
        this.updateMapToRect();
    },
    
    isSuitableOverview: function() {
        var map = this._map;
        var mapExtent = map.getExtent();
        var maxExtent = map.getMaxExtent();
        var testExtent = new L.Extent();
            testExtent.minX = Math.max(mapExtent.minX, maxExtent.minX);
            testExtent.minY = Math.max(mapExtent.minY, maxExtent.minY);
            testExtent.maxX = Math.min(mapExtent.maxX, maxExtent.maxX);
            testExtent.maxY = Math.min(mapExtent.maxY, maxExtent.maxY);
            
        if(this.ovmap.getProjection() && map.getProjection() && this.ovmap.getProjection().getSrsCode() != map.getProjection().getSrsCode()) {
            alert('不支持投影转换');
            return;
        }

        var resRatio = this.ovmap.getResolution() / map.getResolution();
        return ((resRatio > this.minRatio) &&
                (resRatio <= this.maxRatio) &&
                (this.ovmap.getExtent().contains(testExtent)));
    },
    
    updateOverview: function() {
        var map = this._map;
        var mapRes = map.getResolution();
        var targetRes = this.ovmap.getResolution();
        var resRatio = targetRes / mapRes;
        if(resRatio > this.maxRatio) {
            // zoomLevel in overview map
            targetRes = this.minRatio * mapRes;            
        } else if(resRatio <= this.minRatio) {
            // zoomLevel out overview map
            targetRes = this.maxRatio * mapRes;
        }
        var center = map.getCenter();
		this.ovmap._setView2(center, this.ovmap.getZoomByRes(
                targetRes * this.resolutionFactor),true);
		this.updateRectToMap();
    },
    
    updateRectToMap: function() {
        var map = this._map;
        // If the projections differ we need to reproject
        var bounds;
        if(this.ovmap.getProjection() && map.getProjection() && this.ovmap.getProjection().getSrsCode() != map.getProjection().getSrsCode()) {
            alert('不支持投影转换');
            return;
        }
        bounds = map.getExtent();
        var pxBounds = this.getRectBoundsFromMapBounds(bounds);
        if (pxBounds) {
            this.setRectPxBounds(pxBounds);
        }
    },
    
    updateMapToRect: function() {
        var map = this._map;
        var lonLatBounds = this.getMapBoundsFromRectBounds(this.rectPxBounds);
        if(this.ovmap.getProjection() && map.getProjection() && this.ovmap.getProjection().getSrsCode() != map.getProjection().getSrsCode()) {
            alert('不支持投影转换');
            return;
        }
        //针对ie浏览器
        map._setView2(lonLatBounds.getCenter(), map.getZoom(),true);
        //map.panTo(lonLatBounds.getCenter());
    },
    
    setRectPxBounds: function(pxBounds) {
        var top = Math.max(pxBounds.maxY, 0);
        var left = Math.max(pxBounds.minX, 0);
        var bottom = Math.min(pxBounds.maxY + Math.abs(pxBounds.getHeight()),
                              this.ovmap.getSize().y - this.hComp);
        var right = Math.min(pxBounds.minX + pxBounds.getWidth(),
                             this.ovmap.getSize().x - this.wComp);
        var width = Math.max(right - left, 0);
        var height = Math.max(bottom - top, 0);
        if(width < this.minRectSize || height < this.minRectSize) {
            this.extentRectangle.className = this.displayClass + 'RectReplacement';
            var rLeft = left + (width / 2) - (this.minRectSize / 2);
            var rTop = top + (height / 2) - (this.minRectSize / 2);
            this.extentRectangle.style.top = Math.round(rTop) + 'px';
            this.extentRectangle.style.left = Math.round(rLeft) + 'px';
            this.extentRectangle.style.height = this.minRectSize + 'px';
            this.extentRectangle.style.width = this.minRectSize + 'px';       
        } else {
			
            this.extentRectangle.className = this.displayClass +
                                             'ExtentRectangle';
            this.extentRectangle.style.top = Math.round(top) + 'px';
            this.extentRectangle.style.left = Math.round(left) + 'px';
            this.extentRectangle.style.height = Math.round(height) + 'px';
            this.extentRectangle.style.width = Math.round(width) + 'px';
        }
        this.rectPxBounds = new L.Extent();
        this.rectPxBounds.minX = Math.round(left);
        this.rectPxBounds.minY = Math.round(bottom);
        this.rectPxBounds.maxX = Math.round(right);
        this.rectPxBounds.maxY = Math.round(top);
    },
    
    getRectBoundsFromMapBounds: function(lonLatBounds) {
        var leftBottomLonLat = new L.Loc(lonLatBounds.minX,
                                                     lonLatBounds.minY);
        var rightTopLonLat = new L.Loc(lonLatBounds.maxX,
                                                   lonLatBounds.maxY);
        var leftBottomPx = this.getOverviewPxFromLonLat(leftBottomLonLat);
        var rightTopPx = this.getOverviewPxFromLonLat(rightTopLonLat);
        var bounds = null;
        if (leftBottomPx && rightTopPx) {
            bounds = new L.Extent();
            bounds.minX = leftBottomPx.x;
            bounds.minY = leftBottomPx.y;
            bounds.maxX = rightTopPx.x;
            bounds.maxY = rightTopPx.y;
        }
        return bounds;
    },
    
    getMapBoundsFromRectBounds: function(pxBounds) {
        var leftBottomPx = new L.Loc(pxBounds.minX,
                                                pxBounds.minY);
        var rightTopPx = new L.Loc(pxBounds.maxX,
                                              pxBounds.maxY);
        var leftBottomLonLat = this.getLonLatFromOverviewPx(leftBottomPx);
        var rightTopLonLat = this.getLonLatFromOverviewPx(rightTopPx);
        var bounds = null;
        if (leftBottomLonLat && rightTopLonLat) {
            bounds = new L.Extent();
            bounds.minX = leftBottomLonLat.x;
            bounds.minY = leftBottomLonLat.y;
            bounds.maxX = rightTopLonLat.x;
            bounds.maxY = rightTopLonLat.y;
        }
        return bounds;
    },
    
    getOverviewPxFromLonLat: function(lonlat) {
        var res  = this.ovmap.getResolution();
        var extent = this.ovmap.getExtent();
        var px = null;
        if (extent) {
            px = new L.Loc(
                        Math.round(1/res * (lonlat.x - extent.minX)),
                        Math.round(1/res * (extent.maxY - lonlat.y)));
        } 
        return px;
    },
    
    getLonLatFromOverviewPx: function(overviewMapPx) {
        var size = this.ovmap._size;
        var res  = this.ovmap.getResolution();
        var center = this.ovmap.getExtent().getCenter();
    
        var delta_x = overviewMapPx.x - (size.x / 2);
        var delta_y = overviewMapPx.y - (size.y / 2);
        
        return new L.Loc(center.x + delta_x * res ,
                                     center.y - delta_y * res); 
    },
    
	_onRemove:function () {
        var map = this._map;
        map.off('moveend', this.update, this);
        this.ovmap.off('click', this.mapDivClick, this);
        this._container = null;
    }
});


L.Popups.Tip = L.Popups.Base.extend({
    
    options: {
        minWidth: 50,
        maxWidth: 800,
        // width:300,
        title:'',
        maxHeight: null,
        autoPan: true,
        closeButton: true,
        pixelOffset: new L.Loc(0, 2),
        autoPanPadding: new L.Loc(5, 5),
        className: ''
    },
    /**
     * @constructor
     * @name L.Popups.Tip
     * @description 创建{L.Popups.Tip}对话框类对象
     * @param {L.Popups.TipOptions} options 对话框类构造函数的参数选项，参见<L.Popups.TipOptions>
     */
    initialize: function (options, source) {
        L.Util.setOptions(this, options);
        this._source = source;
    },
    
    _initLayout:function () {
        this._container = L.Util.create('div', 'leaflet-tipdialog');
        this._wrapper = L.Util.create('div', 'leaflet-tipdialog-content-wrapper', this._container);
        
        L.DomEvent.addListener(this._wrapper, 'click', this._onCloseButtonClick, this);
        L.DomEvent.disableClickPropagation(this._wrapper);

         this._thBorder = L.Util.create('div', 'leaflet-tipdialog-thborder', this._wrapper);
        this._mainContDiv = L.Util.create('div', 'leaflet-tipdialog-main-cont', this._wrapper);
        this._titleContDiv = L.Util.create('div', 'leaflet-tipdialog-sub-title', this._mainContDiv);
        this._titleSpan = L.Util.create('span', '', this._titleContDiv);
        this._contentNode = L.Util.create('div', 'leaflet-tipdialog-sub-content', this._mainContDiv);
        this._bhBorder = L.Util.create('div', 'leaflet-tipdialog-bhborder', this._wrapper);
        
        L.DomEvent.addListener(this._mainContDiv, 'mousewheel', L.DomEvent.stopPropagation);
        L.DomEvent.addListener(this._mainContDiv, 'click', L.DomEvent.stopPropagation);

        if (this.options.closeButton) {
            //this._closeBt = L.Util.create('div', 'leaflet-tipdialog-sub-closebt', this._mainContDiv);
            this._closeButton = L.Util.create('a', 'leaflet-dialog-close-button', this._mainContDiv);
            this._closeButton.href = '#close';
            L.DomEvent.addListener(this._closeButton, 'click', this._onCloseButtonClick, this);
       }
        
        this._tipContainer = L.Util.create('div', 'leaflet-tipdialog-sub-tip', this._wrapper);
        this._initBorder();
        this._initTip();
    },
    
    _updateContent: function () {
        if (!this._content) {
            return;
        }

        if (typeof this.options.title === 'string') {
            
            //todo
            this._titleSpan.innerHTML = this.options.title;
        }
        
        if (typeof this._content === 'string') {
            this._contentNode.innerHTML = this._content;
            // var tmpSpan = L.Util.create('span', '', this._titleContDiv);
            // //todo
            // tmpSpan.innerHTML = this._content;
        } else {
            this._contentNode.innerHTML = '';
            this._contentNode.appendChild(this._content);
        }
        this.fire('dialogcontentupdate');
    },
    
    _updateLayout: function () {
        var container = this._contentNode;

        container.style.width = '';
        container.style.whiteSpace = 'nowrap';

        var width = 260;//container.offsetWidth;
        // if(this.options.width){
        //     width = parseInt(this.options.width);
        // }
        
        width = Math.min(width, this.options.maxWidth);
        width = Math.max(width, this.options.minWidth);

        container.style.width = (width + 2) + 'px';
        container.style.whiteSpace = '';

        container.style.height = '';

        var height = container.offsetHeight,
            maxHeight = this.options.maxHeight,
            scrolledClass = ' leaflet-dialog-scrolled';

        if (maxHeight && height > maxHeight) {
            container.style.height = maxHeight + 'px';
            container.className += scrolledClass;
        } else {
            container.className = container.className.replace(scrolledClass, '');
        }
        this._containerWidth = parseInt(container.style.width);
        this._container.style.width = (this._containerWidth + 2) + "px";
    },
    _initBorder:function() {
        this._thBorder.innerHTML = '<b class="leaflet-tipdialog-b1" style="background-color:#005CB5;border-color:#005CB5;opacity:1;"></b>'+
        '<b class="leaflet-tipdialog-b2" style="background-color:#005CB5;border-color:#005CB5;opacity:1;"></b>'+
        '<b class="leaflet-tipdialog-b3" style="border-color:#005CB5;opacity:1;background:#005CB5;"></b>'+
        ' <b class="leaflet-tipdialog-b4" style="border-color:#005CB5;opacity:1;background:#005CB5;"></b>';
        this._bhBorder.innerHTML = '<b class="leaflet-tipdialog-b3 leaflet-tipdialog-back" style="border-color:#005CB5;opacity:1;background:#ffffff;"></b>'+
        '<b class="leaflet-tipdialog-b2" style="background-color:#005CB5;border-color:#005CB5;opacity:1;"></b>'+
        '<b class="leaflet-tipdialog-b1" style="background-color:#005CB5;border-color:#005CB5;opacity:1;"></b>';
    },
    _initTip: function () {
        if(!this._tipContainer)
            return;
        var tipArr = L.Util.create('div', 'leaflet-tipdialog-arr', this._tipContainer);
        // var tmpTip;
        // for(var i = 26; i > 0; i--){
        //     tmpTip = L.Util.create('div', 'leaflet-tipdialog-sub-stip', this._tipContainer);
        //     tmpTip.style.width= i + "px";
        // }
        // tmpTip = L.Util.create('div', 'leaflet-tipdialog-sub-stip', this._tipContainer);
        // tmpTip.style.width= "1px";
        // tmpTip.style.height= "1px";
    }
});

L.Popups.TipOptions = {
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
     * @description 对话框内容
     */
    content:'',
    /**
     * @name title
     * @type {String} 对话框标题
     * @description 对话框标题
     */
    title:''
};

L.Ols.Feature = L.Ols.Base.extend({
    includes: L.Mixin.Events,
	fid: null,
	geometry: null,
	attributes: null,
	_visible: true,
	_isdraw: false,
    _type:"L.Ols.Feature",
	_layerFlag:false,
	getType:function(){
		return this._type;
	},
    /**
     * @constructor
     * @name L.Ols.Feature
     * @description 矢量要素类的构造函数
     * @param  {L.Ols.FeatureBase} geometry 几何属性
     * @param  {OBject} attributes 非几何属性对象
     */
    initialize: function (geometry, attributes,symbol) {
       // this.latlng = null;
        this.geometry = geometry ? geometry : null;
       //this.state = null;
        this.attributes = {};
        if (attributes) {
            this.attributes = L.Util.extend(this.attributes,
                                                     attributes);
        }
		this.symbol = symbol ? symbol : null; 
		
    },
	setStyle: function (style) {
		this.symbol = style;
		if(this._isdraw){
			this.geometry.setStyle(style);
		}
	},
	getStyle: function () {
		return this.geometry.getStyle();
	},
	_unsetMap: function (map) {
        map = map || this._map;
        map._pathRoot.removeChild(this.geometry._container);
       
        this._map = null;
    },
	_setMap: function (map) {
		this._map = map;
		this.geometry.setVisible(this._visible);
		this.geometry._setMap(map);
		
		if(this.symbol){
			this.geometry.setStyle(this.symbol);
		}
		
		L.DomEvent.addListener(this.geometry._container, 'click', this._onMouseClick, this);
		var events = ['dblclick', 'mousedown', 'mouseover', 'mouseout'];
		for (var i = 0; i < events.length; i++) {
			L.DomEvent.addListener(this.geometry._container, events[i], this._fireMouseEvent, this);
		}
		map.on('viewreset', this._update, this);
        this._update();
		this._isdraw =true;
	 },
	_onMouseClick:function (e){
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
	 },
	 _fireMouseEvent: function (e) {
        if (!this._map || this._map.getHegemonTag()) {
            return;
        }
        this.fire(e.type, {originalEvent: e});
        L.DomEvent.stopPropagation(e);
    },
    
    /**
     * @function
     * @name getVisible
     * @description 获取要素的可见性
     * @return {Boolean} 要素的可见性
     */
    getVisible : function() {
        return this._visible;
    },
    
    /**
     * @function
     * @name setVisible
     * @description 设置要素的可见性
     * @param {Boolean} value 要素的可见性
     */
	setVisible: function (value) {
		value = value ? true : false;
        if (this._visible === value) {
            return;
        };
        this._visible = value;
		
		var dis = value ? 'block' : 'none';
        if (this.geometry._container) {
			this.geometry.setVisible(value);
        };
    },
	_update: function () {
	    //if(!this._featureTarget) return;
	}
});
 
L.Ols.MultiPoint = L.Ols.Point.extend({
	_type:"L.Ols.MultiPoint",
	/**
     * @constructor
     * @name L.Ols.MultiPoint
     * @description 创建多点对象
     * @param {Array<L.Loc>} points 构成多点对象的坐标数组
     * @param {L.Ols.PolygonOptions} options 点构造函数的参数选项，参见<L.Ols.PolygonOptions>
     */
	initialize: function (latlngs, options) {
		this.options = L.Util.extend(this.options, L.Ols.PolygonOptions, options);
        this._radius = this.options.radius;
		this._points = latlngs;
	},
	toAbsPixels: function () {
        this._pixels = [];
		for(var i = 0; i < this._points.length; i++){
			this._pixels.push(this._map._pointToAbsPixel(this._points[i]));
		}
    },
	getPathString: function () {
        for (var i = 0, len = this._pixels.length, str = ''; i < len; i++) {
            str += this._getPathPartStr(this._pixels[i]);
        }
        return str;
    },
	_getPathPartStr: function (latlng) {
        var p = latlng,
            r = this._radius;
        if (this._checkIfEmpty(p)) {
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
	_checkIfEmpty: function (p) {
        var vp = this._map._pathViewport,
            r = this._radius;
        return p.x - r > vp.maxX || p.y - r > vp.maxY ||
            p.x + r < vp.minX || p.y + r < vp.minY;
    },
	 /**
     * @function
     * @name getPoints
     * @description 获取构成多点的坐标数组
     * @return {Array<L.Loc>} 构成多点对象的坐标数组
     */
    getPoints: function () {
        return this._points;
    },

    /**
     * @function
     * @name setPoints
     * @description 设置构成多点对象的坐标数组
     * @param {Array<L.Loc>} points 构成多点对象的坐标数组
     */
    setPoints: function (latlngs) {
        this._points = latlngs;
        return this.redraw();
    },
	/**
     * @function
     * @name getPointAt
     * @description 获取指定位置的点对象
     * @param {Number} index 目标点在多点对象坐标数组中的起始索引位置,该参数从0开始计数
     * @return {L.Ols.Point} 获取到的点对象
     */
    getPointAt: function(index) {
		if(index>this._points.length)
			return;
		var xy = this._points[index];
		var point = new L.Ols.Point(xy, this.options);
		return point;
    },
    /**
     * @function
     * @name setPointAt
     * @description 修改指定位置的点坐标
     * @param {Number} index 目标点在多点对象坐标数组中的起始索引位置,该参数从0开始计数
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
     * @description 在多点对象末尾增加一个点
     * @param {L.Loc} point 要增加的点坐标对象
     */
    addPoint: function (latlng) {
        this._points.push(latlng);
        return this.redraw();
    },
	 /**
     * @function
     * @name removePoints
     * @description 在当前多点对象坐标数组中从[index]位置开始删除[count]个点
     * @param {Number} index 要删除点在多点对象坐标数组中的起始索引位置,该参数从0开始计数
     * @param {Number} count 要删除点的个数
     */
    removePoints: function (index, count) {
        var removed = [].splice.apply(this._points, arguments);
        this.redraw();
        return removed;
    },
	
	/**
     * @function
     * @name getBounds
     * @description 获取几何对象的最小外接矩形坐标范围
     * @return {L.Extent} 几何对象的最小范围,当多点坐标数组为空时，返回 null
     */
    getBounds: function () {
		if(!this._map)
			return;
		var units = this._map.getUnits();
        var radius = this._radius;
        var lngRadius = radius * L.Util.INCHES_PER_UNIT['m'] / L.Util.INCHES_PER_UNIT[units];
		
		var b = null;
        var latLngs = this.getPoints();
		if(!latLngs)
            return null;
        for (var i = 0, len = latLngs.length; i < len; i++) {
			if(i == 0 && !b){
				b = new L.Extent(latLngs[0].x - lngRadius, latLngs[0].y - lngRadius, latLngs[0].x + lngRadius, latLngs[0].y + lngRadius);
			}else{
				var tempb = new L.Extent(latLngs[i].x - lngRadius, latLngs[i].y - lngRadius, latLngs[i].x + lngRadius, latLngs[i].y + lngRadius);
				b.extend(tempb);
			}
        }
        return b;
    },
	_getEditClass: function () {
        return L.Ols.MultiPoint.Edit;
    }
});

L.Ols.MultiLine = L.Ols.FeatureBase.extend({
	_type:"L.Ols.MultiLine",
	options: {
        smoothFactor: 1.0,
        noClip: false
    },
  /**
     * @constructor
     * @name L.Ols.MultiLine
     * @description 创建多折线类对象
     * @param {Array<L.Ols.Line>} points 构成多折线对象的折线对象数组
     * @param {L.Ols.LineOptions} options 折线构造函数的参数选项，参见<L.Ols.LineOptions>
     */
    initialize: function (polylines, options) {
        this.options = L.Util.extend({}, L.Ols.LineOptions, options);
		this._points = [];
		if(polylines && polylines instanceof Array){
			for(var i = 0; i< polylines.length;i++){
				if(polylines[i] instanceof L.Ols.Line)
					this._points.push(polylines[i]._points);
			}
		}
   },
   toAbsPixels: function () {
		this._absPixels = [];
		if (!this._points) {
            return;
        }
		for (var i = 0, len = this._points.length; i < len; i++) {
            this._absPixels[i] = [];
            for (var j = 0, len2 = this._points[i].length; j < len2; j++) {
                this._absPixels[i][j] = this._map._pointToAbsPixel(this._points[i][j]);
            }
        }
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
	getPathString: function () {
        for (var i = 0, len = this._parts.length, str = ''; i < len; i++) {
            str += this._getPathPartStr(this._parts[i]);
        }
        return str;
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
    
    _initEvents: function () {
        L.Ols.FeatureBase.prototype._initEvents.call(this);
    },
   _clipPoints: function () {
        var  newParts = [];
        this._parts = this._absPixels;
		
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
	_simplifyPoints: function () {
        var parts = this._parts,
            lu = L.Util.LineUtil;

        for (var i = 0, len = parts.length; i < len; i++) {
            parts[i] = lu.simplify(parts[i], this.options.smoothFactor);
        }
    },
	_updatePath: function () {
        this._clipPoints();
        this._simplifyPoints();
        
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
           
            this._map.addOverlays(this._label);
        }
    },
	_unsetMap: function () {
        if(this._label && this._map){
            this._map.removeOverlays(this._label);
        }
        L.Ols.FeatureBase.prototype._unsetMap.call(this);
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
		var components = this._points;
			for(var j = 0; j<components.length;j++){
				var points = components[j];
				var i = 1,
					len = points.length,
					temp;
				do {
					temp = L.Util.getDistByUnits(points[i-1], points[i], srcUnits, distUnits);
					total = temp + total;
					i++;
				} while(i < len);
			}
			return total;
        };
        return total;
    },
	/**
     * @function
     * @name getPoints
     * @description 获取构成多折线对象的坐标数组
     * @return {Array(Array<L.Loc>)} 构成多折线对象的二维坐标数组
     */
    getPoints: function () {
        return this._points;
    },
	/**
     * @function
     * @name setPoints
     * @description 设置构成多折线对象的二维坐标数组
     * @param {Array(Array<L.Loc>)} points 构成多折线对象的二维坐标数组
     */
    setPoints: function (latlngs) {
        this._points = latlngs;
        return this.redraw();
    },
	/**
     * @function
     * @name getCommpentsLen
     * @description 获取构成多折线对象的子折线的个数
     * @return {Number} 子折线的个数
     */
    getCommpentsLen: function () {
		var len = 0;
		if(this._points.length === 0)
			return len;
		len = this._points.length;
		return len;
    },
	
	/**
     * @function
     * @name getCommpentAt
     * @description 获取指定位置的子折线对象
     * @param {Number} index 目标子折线在多线对象中的起始索引位置,该参数从0开始计数
     * @return {L.Ols.Line} 获取到的位于{index}下的子折线对象
     */
    getCommpentAt: function(index) {
		if(index>this._points.length)
			return;
		var points = this._points[index];
		var commplent;
		if(this.getType().toLowerCase() == 'nmultipolyline')
			commplent = new L.Ols.Line(points, this.options);
		else
			commplent = new L.Ols.Polygon(points, this.options);
		return commplent;
    },
	  /**
     * @function
     * @name setCommpentAt
     * @description 修改指定位置的子折线坐标
     * @param {Number} index 待修改的子折线在多线对象中的起始索引位置,该参数从0开始计数
     * @param {L.Ols.Line} commplent 为要设定的目标折线对象
     */
    setCommpentAt: function(index, commplent) {
		this._points[index] = commplent._points;
		this.redraw();
    },
	/**
     * @function
     * @name addCommpents
     * @description 在多折线末尾增加一个或多个子折线对象
     * @param {Array<L.Ols.Line>} commplents 要增加的子折线对象数组
     */
    addCommpents: function (commplents) {
		if(commplents&&commplents instanceof Array){
			for(var i = 0; i< commplents.length;i++){
				if(commplents[i] instanceof L.Ols.Line)
					this._points.push(commplents[i]._points);
			}
		}else if(commplents&&commplents instanceof L.Ols.Line){
			this._points.push(commplents._points);
		}
        return this.redraw();
    },
	/**
     * @function
     * @name removeCommpents
     * @description 在多折线坐标数组中从[index]位置开始删除[count]个子折线对象
     * @param {Number} index 要删除子折线在多线对象中的起始索引位置,该参数从0开始计数
     * @param {Number} count 要删除子折线的个数
     */
    removeCommpents: function (index, count) {
		var removed = [].splice.apply(this._points, arguments);
        this.redraw();
        return removed;
    },
	/**
     * @function
     * @name getBounds
     * @description 获取几何对象的最小外接矩形坐标范围
     * @return {L.Extent} 几何对象的最小范围,当多折线坐标数组为空时，返回 null
     */
    getBounds: function () {
        var b = null;
        var latLngs = this.getPoints();
        if(!latLngs)
            return null;
        for (var i = 0, len = latLngs.length; i < len; i++) {
			for (var j = 0, len2 = latLngs[i].length; j < len2; j++) {
				if(i == 0&&j == 0){
					b = new L.Extent(latLngs[0][0].x, latLngs[0][0].y,latLngs[0][0].x, latLngs[0][0].y);
				}
				b.extend(latLngs[i][j]);
			}
        }
        return b;
    },
	_getEditClass: function () {
        return L.Ols.MultiLine.Edit;
    }
});

L.Ols.MultiPolygon = L.Ols.MultiLine.extend({
	_type:'L.Ols.MultiPolygon',
	/**
     * @constructor
     * @name L.Ols.MultiPolygon
     * @description 创建多面类对象
     * @param {Array<L.Ols.Polygon>} polygons 构成多面对象的面对象数组
     * @param {L.Ols.PolygonOptions} options 折线构造函数的参数选项，参见<L.Ols.PolygonOptions>
     */
	initialize: function (polygons, options) {
        L.Ols.MultiLine.prototype.initialize.call(this, polygons, options);
		this.options = L.Util.extend({}, L.Ols.PolygonOptions, options);
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
		var area = 0;
		for(var i = 0; i<this._points.length;i++){
			var points = this._points[i];
			area += L.Util.getAreaByUnits(points, unit, distUnits);
		}
        return area;
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
	_getStyleOptionsClass: function () {
        return L.Ols.PolygonOptions;
    },
	_getPathPartStr: function (points) {
        var str = L.Ols.Line.prototype._getPathPartStr.call(this, points);
        return str + (L.Util.Browser.svg ? 'z' : 'x');
    },
	_getEditClass: function () {
        return L.Ols.MultiPolygon.Edit;
    }
});

L.Ols.MultiPoint.Edit = L.Ols.Polygon.Edit.extend({
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

    },
	_onMarkerDrag: function (e) {
        var center , marker = e.target;
        var index = marker._index,
			center = marker._latlng;
        this._feature.setPointAt(index,center);
    },
	_onMarkerClick: function (e) {
		if (this._feature._points.length < 2) {
            return;
        }
        
        var marker = e.target,
            i = marker._index;
			
        this._markerGroup.removeOverlay(marker);
        this._feature.removePoints(i, 1);
        this._feature.fire('edit', {"feature":this._feature});
	}
});

L.Ols.MultiLine.Edit = L.Ols.Line.Edit.extend({
     _createDivAnchor: function (latlng, index, commplent) {
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
		marker._commplent = commplent;

        marker.on('drag', this._onMarkerDrag, this);
        marker.on('dragend', this._fireEdit, this);

        if(!this._markerGroup)
            this._markerGroup = new L.Layers.Overlay();
        this._markerGroup.addOverlay(marker);

        return marker;
    },
    _onMarkerClick: function (e) {
		var  num = 0;
		if(this._feature.getType().toLowerCase()=='nmultipolyline'){
			if (this._feature._points.length == 1 && this._feature._points[0].length <=2) {
				return;
			}
			num = 1;
		}else{
			if (this._feature._points.length == 1 && this._feature._points[0].length <=3) {
				return;
			}
			num = 4;
		}
		
        var marker = e.target,
            i = marker._index,
			j = marker._commplent;
          
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
		
        new L.Ols.Line(this._feature._points[j]).removePoints(i, 1);
  
		//当子线上marker实点等于num个时，同时也被删掉
		var tmMarkerArr = new Array(), flag = false;
		var overlays = this._markerGroup._overlays;
		for(var key in overlays){
			var tpmarker = overlays[key];
			if(tpmarker._commplent==j)
				tmMarkerArr.push(tpmarker);
			if(tmMarkerArr.length>num)
				break;
		}
        if(tmMarkerArr.length<(num+1)){
			for(var n = 0; n< tmMarkerArr.length; n++){
				this._markerGroup.removeOverlay(tmMarkerArr[n]);
			}
			this._feature._points.splice(j,1);
			this._updateCommplent(j);
			flag = true;
		}
		if(!flag){
			this._updateIndexes(i, j, -1);
		}
        this._feature.fire('edit', {"feature":this._feature});
		this._feature.redraw();
    },
	_updateIndexes: function (index, commplent, delta) {
        this._markerGroup._iterateLayers(function (marker) {
            if (marker._commplent == commplent && marker._index > index) {
                marker._index += delta;
            }
        });
    },
	_updateCommplent: function (commplent) {
		var overlays = this._markerGroup._overlays;
        for (var i in overlays) {
            if (overlays.hasOwnProperty(i)) {
				var tmarker = overlays[i];
               if (tmarker._commplent > commplent) {
					tmarker._commplent +=-1;
				}
            }
        }
    },
    _initDivAnchors: function () {
        this._markerGroup = new L.Layers.Overlay();
        this._markers = [];

        var latlngsArr = this._feature._points,
            i, j, len, m, len2, marker;
		for (var m = 0, len2 = latlngsArr.length;  m < len2;  m++) {
			var latlngs = latlngsArr[m];
			for (i = 0, len = latlngs.length; i < len; i++) {
				marker = this._createDivAnchor(latlngs[i], i, m);
				marker.on('click', this._onMarkerClick, this);
				this._markers.push(marker);
			}
		}
		
		var markerLeft, markerRight,offsetlen = 0;
		for(m = 0; m < len2;  m++){
			len = latlngsArr[m].length;
			if(m>0)
				offsetlen += latlngsArr[m-1].length;
			for (i = 1, j = 0; i < len; j = i++) {
				if (i === 0 && !(L.Ols.Line && (this._feature instanceof L.Ols.Line))) {
					continue;
				}
				
				markerLeft = this._markers[j+offsetlen];
				markerRight = this._markers[i+offsetlen];

				this._createMiddleDivAnchor(markerLeft, markerRight);
				this._updatePrevNext(markerLeft, markerRight);
			}
		}
    },
	_createMiddleDivAnchor: function (marker1, marker2) {
        var latlng = this._getMiddleLatLng(marker1, marker2),
            marker = this._createDivAnchor(latlng, -2, marker1._commplent),
            onClick,
            onDragStart,
            onDragEnd;

        marker.setOpacity(0.6);

        marker1._middleRight = marker2._middleLeft = marker;

        onDragStart = function () {
            var i = marker2._index,
				j = marker2._commplent;

            marker._index = i;
			marker._commplent = j;

            marker
                .off('click', onClick)
                .on('click', this._onMarkerClick, this);

			new L.Ols.Line(this._feature._points[j]).removePoints(i, 0, latlng);
            this._markers.splice(i, 0, marker);

            marker.setOpacity(1);

            this._updateIndexes(i, j, 1);
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
    }
});

L.Ols.MultiPolygon.Edit = L.Ols.MultiLine.Edit.extend({
	_initDivAnchors: function () {
        this._markerGroup = new L.Layers.Overlay();
        this._markers = [];

        var latlngsArr = this._feature._points,
            i, j, len, m, len2, marker;
		for (var m = 0, len2 = latlngsArr.length;  m < len2;  m++) {
			var latlngs = latlngsArr[m];
			for (i = 0, len = latlngs.length; i < len; i++) {
				marker = this._createDivAnchor(latlngs[i], i, m);
				marker.on('click', this._onMarkerClick, this);
				this._markers.push(marker);
			}
		}
		
		var markerLeft, markerRight,offsetlen = 0;
		for(m = 0; m < len2;  m++){
			len = latlngsArr[m].length;
			if(m>0)
				offsetlen += latlngsArr[m-1].length;
			for (i = 0, j = len - 1; i < len; j = i++) {
				if (i === 0 && !(L.Ols.MultiPolygon && (this._feature instanceof L.Ols.MultiPolygon))) {
					continue;
				}
				
				markerLeft = this._markers[j+offsetlen];
				markerRight = this._markers[i+offsetlen];

				this._createMiddleDivAnchor(markerLeft, markerRight);
				this._updatePrevNext(markerLeft, markerRight);
			}
		}
    }
});

L.Ols.Fan = L.Ols.Circle.extend({
    options: {
        fill: true
    },
    _type:"L.Ols.Fan",
    /**
     * @constructor
     * @name L.Ols.Fan
     * @description 创建扇形类对象
     * @param {L.Loc} latlng 扇形中心点坐标
     * @param {Number} passpoint 扇形途经点点坐标
     * @param {Number} edegree 扇形终止角度，以度为单位
	 * @param {Number} draw 扇形绘制方向，有1 和0两个值，1:顺时针，0:逆时针
     * @param {L.Ols.PolygonOptions} options 扇形构造函数的参数选项，参见<L.Ols.PolygonOptions>
     */
	 initialize: function (latlng, passpoint, edegree, draw, options) {
		this.options = L.Util.extend({}, L.Ols.PolygonOptions, options);
        this._slatlng = latlng;
		this._passpoint = passpoint;
        this._edegree = edegree;
		this._draw = draw;
		this._sdegree =this._getangle(this._slatlng,this._passpoint);//计算与x轴正方向到扇弧开始点和结束点的度数 （逆时针走向） 以度为单位
		//底图下的扇形圆心点与扇弧开始点之间的距离，半径
		this._distance = new L.Loc(this._passpoint.x,this._passpoint.y).distanceTo(new L.Loc(this._slatlng.x,this._slatlng.y));
	 },
	 _getangle: function(spoint,epoint) {
		var distance = new L.Loc(epoint.x,epoint.y).distanceTo(new L.Loc(spoint.x,spoint.y));//底图下的两点距离
		var y = epoint.y - spoint.y;
		var a;
		if(spoint.x < epoint.x && spoint.y <= epoint.y){
			a = 180*Math.asin(y/distance)/Math.PI;//第1象限
		}else if(spoint.x == epoint.x && spoint.y < epoint.y){
			a = 180*Math.asin(y/distance)/Math.PI;//90度
		}else if(spoint.x > epoint.x && spoint.y < epoint.y){
			a = 180-180*Math.asin(y/distance)/Math.PI;//第2象限
		}else if(spoint.x > epoint.x && spoint.y >= epoint.y){
			a = 180-180*Math.asin(y/distance)/Math.PI;//第3象限
		}else if(spoint.x == epoint.x && spoint.y > epoint.y){
			a = 180-180*Math.asin(y/distance)/Math.PI;//270;
		}else if(spoint.x < epoint.x && spoint.y > epoint.y){
			a = 360+180*Math.asin(y/distance)/Math.PI;//第4象限
		}else{
			return;
		}
		return a;
	 },
    /**
     * @function
     * @name measureArea
     * @description 扇形面积量算
     * @return {Number} 量算得到的面积结果，单位平方米
     */
    measureArea: function() {
		var sRadius = this.getRadius();	//扇形半径 以m为单位
        var n;
        if(this._draw) //顺时针
            n = (this._sdegree - this._edegree + 360)%360;
        else    
            n = (this._edegree - this._sdegree + 360)%360;
        var area = Math.PI * sRadius * sRadius *n/360;
        return area;
    },
      
    /**
     * @function
     * @name getPosition
     * @description 获取扇形对象中心点坐标
     * @return {L.Loc} 中心点坐标
     */
    getCenterPosition: function () {
        return this._slatlng;
    },
    
    /**
     * @function
     * @name setPosition
     * @description 设置扇形对象中心点坐标
     * @param {L.Loc} center 中心点坐标
     */
    setCenterPosition: function (latlng) {
        this._slatlng = latlng;
        var point = new L.Loc(this._slatlng.x + Math.cos(this._sdegree/180*Math.PI) * this._distance,this._slatlng.y + Math.sin(this._sdegree/180*Math.PI) * this._distance);
		this._passpoint = point;

        return this.redraw();
    },

	 /**
     * @function
     * @name getpassPoint
     * @description 获取扇形弧的途经点
     * @return {L.Loc} 途经点坐标
     */
    getPassPoint: function () {
        return this._passpoint;
    },
	/**
     * @function
     * @name setpasstPoint
     * @description 设置扇形弧的途经点
     * @param {L.Loc} 途经点坐标
     */
    setPassPoint: function (latlng) {
        this._passpoint = latlng;
		var a = this._getangle(this._slatlng,this._passpoint);
		this._sdegree = a;
		this._distance = new L.Loc(this._passpoint.x,this._passpoint.y).distanceTo(new L.Loc(this._slatlng.x,this._slatlng.y));//距离
        return this.redraw();
    },
	
    /**
     * @function
     * @name getRadius
     * @description 获取扇形对象半径
     * @param {String} units 指定所得扇形半径所采用的计量单位，该参数为可选参数，默认值为"m"
     * @return {Number} 扇形对象半径
     */
    getRadius: function (units) {
		return  L.Util.getDistByUnits(this._slatlng,this._passpoint,this._map.getUnits(),units);
        //return units ? this._sRadius : this._getFitRadius(units);
    },

   /* setRadius: function (radius, units) {
        if(!radius) return;
        this._sRadius = radius;
        if(units && units !== 'm' && L.Util.INCHES_PER_UNIT[units])
            this._sRadius = this._sRadius * L.Util.INCHES_PER_UNIT[units] / L.Util.INCHES_PER_UNIT['m'];
        return this.redraw();
    },*/  
    
    /**
     * @function
     * @name geteDegree
     * @description 获取扇形终止角度
     * @return {Number} 扇形终止角度,单位为度(0-360)
     */
    geteDegree: function () {
        return this._edegree;
    },
    
    /**
     * @function
     * @name seteDegree
     * @description 设置扇形终止角度
     * @param {Number} 终止角度，单位为度(0-360)
     */
    seteDegree: function (n) {
        this._edegree = n;
        return this.redraw();
    },
    
    /**
     * @function
     * @name getDraw
     * @description 获取绘制扇形的方向
     * @return {Number} 表示绘制方向的数值， 1顺时针 0逆时针
     */
    getDraw: function () {
        return this._draw;
    },
    
    /**
     * @function
     * @name setDraw
     * @description 设置扇形绘制方向
     * @param {Number} 扇形绘制方向,参数取值范围为[0,1]，1表示顺时针 0表示逆时针
     */
    setDraw: function (direction) {
        var direction = Number(direction) ? 1 : 0;
        this._draw = direction;
        return this.redraw();
    },
    
    toAbsPixels: function () {
		//弧度起点,终点
		var point1,point2;
		point1 = new L.Loc(this._slatlng.x+Math.cos(this._sdegree/180*Math.PI)*this._distance,this._slatlng.y+Math.sin(this._sdegree/180*Math.PI)*this._distance);
		point2 = new L.Loc(this._slatlng.x+Math.cos(this._edegree/180*Math.PI)*this._distance,this._slatlng.y+Math.sin(this._edegree/180*Math.PI)*this._distance);
		
		this._centerpoint = this._map._pointToAbsPixel(this._slatlng);//屏幕坐标下的扇形圆心点
		this._startpoint = this._map._pointToAbsPixel(point1);//屏幕坐标下的扇形弧起点
		this._endpoint = this._map._pointToAbsPixel(point2);//屏幕坐标下的扇形弧终点
		this._radius = this._centerpoint.distanceTo(this._startpoint);// //屏幕坐标下的距离r
    },
    
	_getFitRadius: function (units) {
        if(!this._map)
            return this._sRadius;
        units = units || this._map.getUnits();
        var radius = this._sRadius;
        return radius * L.Util.INCHES_PER_UNIT['m'] / L.Util.INCHES_PER_UNIT[units];
    },

    getPathString: function () {
		var c = this._centerpoint,//扇形圆心
        sp = this._startpoint,//扇形弧起点
		ep = this._endpoint,//扇形弧终点
		r = this._radius;//半径
		
		var  arc;
		var  flag;
		if(this._draw){          //鼠标顺时针绘制
			if((this._sdegree - this._edegree + 360)%360<180){
				arc = 0;//小弧度
			}else{
				arc = 1;//大弧度
			}
			flag = 1;
		}
        else{                  //鼠标逆时针绘制
			if((this._edegree - this._sdegree + 360)%360<180){
				arc = 0;//小弧度
			}else{
				arc = 1;//大弧度
			}
			flag = 0;
		}
        if (L.Util.Browser.svg) {
            return "M " + c.x + "," + c.y +"L " + sp.x + "," + sp.y +
                   "A " + r + "," + r + ",0,"+arc+","+flag+"," +
                    ep.x  + "," + ep.y+"L " + c.x + "," + c.y+" z";
        } else {
            c._round();
            sp._round();
            ep._round();
            r = Math.round(r);
            sd = Math.round(this._sdegree);
            ed = Math.round(this._edegree);
            if(this._draw) { //顺时针
                var n = (sd - ed + 360)%360;
                return "M " + c.x + "," + c.y + " L " + ep.x + "," + ep.y +  " AE " + c.x + "," + c.y + ", " + r + "," + r + ", " + (65535 * ed) + "," + (65535 * n)+ " M "+ sp.x + "," + sp.y + " L " + c.x + "," + c.y +" e";
            }
            else { 
                var n = (ed - sd + 360)%360;
                return "M " + c.x + "," + c.y + " L " + sp.x + "," + sp.y +  " AE " + c.x + "," + c.y + ", " + r + "," + r + ", " + (65535 * sd) + "," + (65535 * n)+ " M "+ ep.x + "," + ep.y + " L " + c.x + "," + c.y +" e";
            } 
        }
    },
    
    _getEditClass: function () {
        return L.Ols.Fan.Edit;
    }
});

L.Ols.Fan.Edit = L.Ols.Circle.Edit.extend({
    _initDivAnchors: function () {
        this._markerGroup = new L.Layers.Overlay();
        this._markers = [];
        var center = this._feature.getCenterPosition(),
		    start = this._feature.getPassPoint(),
			edegree = this._feature.geteDegree();
		var radius = new L.Loc(start.x,start.y).distanceTo(new L.Loc(center.x,center.y));
		var end = new L.Loc(center.x + Math.cos(edegree/180 * Math.PI) * radius, center.y + Math.sin(edegree/180 * Math.PI)*radius);
			
		var centerMarker = this._createDivAnchor(center, 0);
        this._markers.push(centerMarker);
        var passMarker = this._createDivAnchor(start, 1);
        this._markers.push(passMarker);  
        var endMarker = this._createDivAnchor(end, 2);
        this._markers.push(endMarker);
    },
    
    _onMarkerDrag: function (e) {
        var marker = e.target;
        var index = marker._index;
            
        if(index === 0){
            var ycenter = this._feature.getCenterPosition();
			var radius = this._markers[1]._latlng.distanceTo(ycenter);
			var center = marker._latlng;
            this._feature.setCenterPosition(center);
			
			var sdegree = this._feature._sdegree;
            var edegree = this._feature.geteDegree();
			//弧度终点
			var point1 = new L.Loc(center.x + Math.cos(sdegree/180 * Math.PI) * radius, center.y + Math.sin(sdegree/180 * Math.PI)*radius);
			//弧度终点
			var point2 = new L.Loc(center.x + Math.cos(edegree/180 * Math.PI) * radius, center.y + Math.sin(edegree/180 * Math.PI)*radius);
			//替换圆弧两端的点
			this._markers[1].setPosition(point1);
			this._markers[2].setPosition(point2);
			this._feature._passpoint = point1;//重新定义扇形途径点坐标
        }
        else if(index === 1||index === 2){
             var movepoint,point1,
                cpoint = this._markers[0]._latlng,//扇形圆心
                point = marker._latlng,
                radius = cpoint.distanceTo(point);//移动后 当前底图下两点距离（半径）
			var degree = this._feature._getangle(cpoint,point);//角度需要根据移动变化 重新计算(与x轴方向的夹角
			 
			this._feature._distance = radius;//重新定义两点距离，即当前底图下的扇形半径
			if(index === 1){
				this._feature._sdegree = degree;
                movepoint = this._markers[2]._latlng;
				point1 = point;
            }
			else {
				this._feature.seteDegree(degree);
                movepoint = this._markers[1]._latlng;
				point1 = new L.Loc(cpoint.x+Math.cos(this._feature._sdegree/180*Math.PI)*radius,cpoint.y+Math.sin(this._feature._sdegree/180*Math.PI)*radius);
            }
			this._feature._passpoint = point1;//重新定义扇形途径点坐标
			
			var tpx = movepoint.x - this._markers[0]._latlng.x;
			var tpy = movepoint.y - this._markers[0]._latlng.y;
			var dissqrt = Math.sqrt(tpx*tpx+tpy*tpy);
			var point2 = new L.Loc(tpx/dissqrt*radius+this._markers[0]._latlng.x,tpy/dissqrt*radius+this._markers[0]._latlng.y);
			
			if(index === 1)
				this._markers[2].setPosition(point2);
			else 
				this._markers[1].setPosition(point2);
        }
        this._feature.redraw();
    }
});

L.Ols.GroupOverlay = L.Ols.BgMarker.extend({

    /**
     * @constructor
     * @name L.Ols.GroupOverlay
     * @description 标注类的构造函数
     * @param  {L.Loc} position 标注位置
     * @param  {Number} num 标注数字
     * @param {L.Ols.GroupOverlayOptions} options 参数选项，可使用<L.Ols.GroupOverlayOptions>所列举的所有选项参数
     */
    initialize: function (lonlat, num, options) {
        //L.Util.setOptions(this, options);
        this.options = L.Util.extend({}, L.Ols.GroupOverlayOptions, options);
        this._latlng = lonlat;
        this._num = num;
    },

    _initMarker: function () {
        if(!this._markerTarget) {
            this._markerTarget = L.Util.create('div', 'leaflet-marker-span');
        }
        if(!this._markerDiv){
            this._markerDiv = L.Util.create('div', 'leaflet-marker-div', this._markerTarget);
        }
        if (!this._markerText) {
            this._markerText = L.Util.create('div', 'leaflet-group-text', this._markerDiv);
            this._markerText.innerHTML = this._num;
        }
        if (!this._img) {
            this._img = this._createMarkerImg();
            this._markerDiv.appendChild(this._img);
            this._initInteraction();
        }
        this._map._panes.markerPane.appendChild(this._markerTarget);
    },

    _createMarkerImg: function () {
        if (this.options.autoStyle === true) {
            if (this._num < 9) {
                this.options.imgUrl = L.Icon.Default.imagePath + 'm1.png';
                this.options.markerSize = new L.Loc(53, 53);
                this.options.textOffset = new L.Loc(0, 18);
                this.options.markerAnchor = new L.Loc(26, 26);
            } else if(this._num < 99) {
                this.options.imgUrl = L.Icon.Default.imagePath + 'm2.png';
                this.options.markerSize = new L.Loc(56, 56);
                this.options.textOffset = new L.Loc(2, 19);
                this.options.markerAnchor = new L.Loc(28, 28);
            } else if(this._num < 999) {
                this.options.imgUrl = L.Icon.Default.imagePath + 'm3.png';
                this.options.markerSize = new L.Loc(66, 66);
                this.options.textOffset = new L.Loc(6, 24);
                this.options.markerAnchor = new L.Loc(33, 33);
            } else if(this._num < 9999) {
                this.options.imgUrl = L.Icon.Default.imagePath + 'm4.png';
                this.options.markerSize = new L.Loc(78, 78);
                this.options.textOffset = new L.Loc(13, 30);
                this.options.markerAnchor = new L.Loc(39, 39);
            } else {
                this.options.imgUrl = L.Icon.Default.imagePath + 'm5.png';
                this.options.markerSize = new L.Loc(90, 90);
                this.options.textOffset = new L.Loc(18, 36);
                this.options.markerAnchor = new L.Loc(45, 45);
            }
        }
        var src = this.options.imgUrl;
        if (!src) return null;
        var img = this._createImg(src);
        img.className = 'leaflet-marker-img';
        if(this.options.title)
           img.title = this.options.title;
        return img;
    },

    _updateMarker: function () {
        var offset = this.options.imgOffset,
            size = this.options.markerSize,
            markerAnchor = this.options.markerAnchor,
            markerTitle = this.options.markerTitle,
            textOffset = this.options.textOffset;
        if(this._markerDiv){
            this._markerDiv.style.marginLeft = (-markerAnchor.x) + 'px';
            this._markerDiv.style.marginTop = (-markerAnchor.y) + 'px';
            this._markerDiv.style.width = size.x + 'px';
            this._markerDiv.style.height = size.y + 'px';
        }
        if(this._markerText) {
            this._markerText.style.left = textOffset.x + 'px';
            this._markerText.style.top = textOffset.y + 'px';
        }
        if(this._img){
            if(offset){
                this._img.style.left = (-offset.x) + 'px';
                this._img.style.top = (-offset.y) + 'px';
            }
            this._img.title = markerTitle ? markerTitle : '';
        }
    },

    _initInteraction: function () {
        if (this.options.clickable) {
            this._img.className += ' leaflet-clickable';
            L.DomEvent.addListener(this._img, 'click', this._onMouseClick, this);
            L.DomEvent.addListener(this._markerText, 'click', this._onMouseClick, this);
        }
    },

    _removeMarker: function () {
        this._markerDiv.removeChild(this._img);
        this._markerDiv.removeChild(this._markerText);
        this._markerTarget.removeChild(this._markerDiv);
        this._map._panes.markerPane.removeChild(this._markerTarget);
        this._markerTarget = this._markerDiv = this._markerText = this._img = null;
    }
});


L.Ols.GroupOverlayOptions = {
    /**
     * @name imgUrl
     * @type {String} 
     * @description 标注所使用图片的地址
     */
    imgUrl: L.Icon.Default.imagePath + 'm1.png',

    /**
     * @name markerSize
     * @type {L.Loc} 
     * @description 标注大小
     */
    markerSize: new L.Loc(53, 53),

    /**
     * @name imgOffset
     * @type {L.Loc} 
     * @description 标注所使用的图标与背景图片左上点的相对偏移量(以像素为单位)
     */
    imgOffset: new L.Loc(0,0),

    /**
     * @name textOffset
     * @type {L.Loc} 
     * @description 标注所显示的文字与背景图片左上点的相对偏移量(以像素为单位)
     */
    textOffset: new L.Loc(0,0),

    /**
     * @name markerAnchor
     * @type {L.Loc} 
     * @description 标注图片相对于标注点地理坐标位置的偏移量(以像素为单位)
     */
    markerAnchor: new L.Loc(26, 26),

    /**
     * @name markerTitle
     * @type {String} 
     * @description 标注图片的title属性
     */
    markerTitle: '',

    /**
     * @name autoStyle
     * @type {Boolean} 
     * @description 是否使用默认标注图片样式
     */
    autoStyle: true,

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
     * @name visible
     * @type {Boolean} 
     * @description 是否为标注可视
     */
    visible: true,
    zIndexOffset: 0
 };

L.Ols.Group = L.Class.extend({

     includes: L.Mixin.Events,

     initialize: function (markerGroup) {
          this._markerGroup = markerGroup;
          this._map = markerGroup.getMap();
          this._minGroupSize = markerGroup.getMinGroupSize();
          this._isAverageCenter = markerGroup.isAverageCenter();
          this._groupMarker = null;
          this._center = null;
          this._markers = [];
          this._gridBounds = null;
          this._isReal = false;
     },

     _addMarker: function (marker) {
          if (!this._center) {
               this._center = marker.getPosition();
               this._updateGridBounds();
          } else {
               if (this._isAverageCenter) {
                    var l = this._markers.length + 1;
                    var y = (this._center.y * (l - 1) + marker.getPosition().y) / l;
                    var x = (this._center.x * (l - 1) + marker.getPosition().x) / l;
                    this._center = new L.Loc(x, y);
                    this._updateGridBounds();
               }
          }

          marker.isInGroup = true;
          this._markers.push(marker);

          var len = this._markers.length;

          if (len >= this._minGroupSize) {
               if (this._map.getZoom() < this._markerGroup.getMaxZoom()) {
                    this._map.removeOverlays(this._markers);
                    if (this._groupMarker instanceof L.Ols.GroupOverlay) {
                         this._map.removeOverlays(this._groupMarker);
                    }
                    this._groupMarker = new L.Ols.GroupOverlay(this._center, len, this._markerGroup.getStyle());
                    this._map.addOverlays(this._groupMarker);
               } else {
                     this._map.removeOverlays(this._groupMarker);
                     this._map.addOverlays(this._markers);
                     return;
               }

               this._isReal = true;
               var thatMap = this._map;
               var thatBounds = new L.Extent(this._center.x, this._center.y, this._center.x, this._center.y);
               for (var k = this._markers.length - 1; k >= 0; k--) {
                    thatBounds.extend(this._markers[k].getPosition());
               }
               this._groupMarker.on('click', function(){
                    thatMap.zoomToExtent(thatBounds);
               });
          } else {
               this._map.addOverlays(marker);
          }
     },

     _updateGridBounds: function () {
          var bounds = new L.Extent(this._center.x, this._center.y, this._center.x, this._center.y);
          this._gridBounds = this._markerGroup._getExtendedBounds(this._map, bounds, this._markerGroup.getGridSize());
     },

     _isMarkerInGroupBounds: function (marker) {
          return this._gridBounds.contains(marker.getPosition());
     },

     _remove: function () {
          //this._map.removeOverlays(this._markers);
          this._map.removeOverlays(this._groupMarker);
          this._markers.length = 0;
     },

     _getCenter: function () {
          return this._center;
     },

     _isReal: function () {
          return this._isReal;
     }
});

L.Ols.MarkerGroup = L.Class.extend({

     includes: L.Mixin.Events,

    /**
     * @constructor
     * @name L.Ols.MarkerGroup
     * @description 用来解决加载大量点要素到地图上产生覆盖现象的问题，并提高性能
     * @param  {L.Map} map 需要聚合的地图
     * @param  {L.Ols.MarkerGroupOptions} options 聚合的参数选项，可参考<L.Ols.MarkerGroupOptions>进行选择
     */
     initialize: function (map, options) {
          this._map = map;
          this.options = L.Util.extend({}, L.Ols.MarkerGroupOptions, options);
          this._markers = [];
          this._groups = [];

          if (this._isArray(this.options.markers)) {
               for(var i = this.options.markers.length - 1; i >= 0; i--) {
                    this._pushMarkerTo(this.options.markers[i]);
               }
          } else {
               this._pushMarkerTo(this.options.markers);
          };
          this._redraw();

          this._map.on('zoomend', this._redraw, this);
          this._map.on('moveend', this._redraw, this);
     },

     _isArray: function (source) {
          return '[object Array]' === Object.prototype.toString.call(source);
     },

     _indexOf: function (item, source) {
          var index = -1;
          if (source.indexOf) {
               index = source.indexOf(item);
          } else {
               for (var i = 0, m; m = source[i]; i++) {
                    if (m === item) {
                         index = i;
                         break;
                    }
               }
          }
          return index;
     },

     _getExtendedBounds: function (map, bounds, gridSize) {
          var maxbounds = map.getMaxExtent();
          var minPixel, maxPixel;
          if(!maxbounds.contains(bounds)) {
               var minX = Math.max(bounds.getLowerPoint().x, maxbounds.getLowerPoint().x);
               var minY = Math.max(bounds.getLowerPoint().y, maxbounds.getLowerPoint().y);
               var maxX = Math.min(bounds.getUpperPoint().x, maxbounds.getUpperPoint().x);
               var maxY = Math.min(bounds.getUpperPoint().y, maxbounds.getUpperPoint().y);
               bounds = new L.Extent(minX, minY, maxX, maxY);
          }
          minPixel = map.pointToPixel(bounds.getLowerPoint());
          maxPixel = map.pointToPixel(bounds.getUpperPoint());
          minPixel.x -= gridSize;
          minPixel.y += gridSize;
          maxPixel.x += gridSize;
          maxPixel.y -= gridSize;
          var newMin = map.pixelToPoint(minPixel);
          var newMax = map.pixelToPoint(maxPixel);
          return new L.Extent(newMin.x, newMin.y, newMax.x, newMax.y);
     },

     _pushMarkerTo: function (marker) {
          var index = this._indexOf(marker, this._markers);
          if(index === -1) {
               marker.isInGroup = false;
               this._markers.push(marker);
          };
     },

     _redraw: function () {
          if (this._groups.length !== 0 || this._markers.length !== 0) {
               for(var i = this._groups.length - 1; i >= 0; i--) {
                    this._groups[i]._remove();
               }
               this._groups.length = 0;
               for(var j = this._markers.length - 1; j >= 0; j--) {
                    this._markers[j].isInGroup = false;
               }
          }
          
          var Viewport = this._map.getExtent();
          var extendedBounds = this._getExtendedBounds(this._map, Viewport, this.options.gridSize);
          var position, distance, groupToAddTo, center, d;
          for(var m = this._markers.length - 1; m >= 0; m--) {
               position = null;
               position = this._markers[m].getPosition();
               if (!this._markers[m].isInGroup && extendedBounds.contains(position)) {
                    distance = 4000000;
                    groupToAddTo = null;
                    for(var n = this._groups.length - 1; n >= 0; n--) {
                         center = null;
                         center = this._groups[n]._getCenter();
                         if (center) {
                              d = center.distanceTo(position);
                              if (d < distance) {
                                   distance = d;
                                   groupToAddTo = this._groups[n];
                              }
                         }
                    }

                    if (groupToAddTo && groupToAddTo._isMarkerInGroupBounds(this._markers[m])) {
                         groupToAddTo._addMarker(this._markers[m]);
                    } else {
                         var newgroup = new L.Ols.Group(this);
                         newgroup._addMarker(this._markers[m]);
                         this._groups.push(newgroup);
                    }
               }
          }
     },

    /**
     * @function
     * @name addMarker
     * @description 向已有的聚合中添加一个标记
     * @param {L.Ols.Marker} marker 需要添加的一个标记对象
     */
     addMarker: function (marker) {
          this._pushMarkerTo(marker);
          this._redraw();
     },

    /**
     * @function
     * @name addMarkers
     * @description 向已有的聚合中添加一组标记
     * @param {Array<L.Ols.Marker>} markers 以数组形式，添加的一组标记
     */
     addMarkers: function (markers) {
          for(var i = markers.length - 1; i >= 0; i--) {
               this._pushMarkerTo(markers[i]);
          }
          this._redraw();
     },

     _removeMarker: function (marker) {
          var index = this._indexOf(marker, this._markers);
          if (index === -1) {
               return false;
          }
          this._markers.splice(index, 1);
          return true;
     },

    /**
     * @function
     * @name removeMarker
     * @description 将已有的聚合中的一个标记删除
     * @param {L.Ols.Marker} marker 需要删除的一个标记对象
     * @return {Boolean} 删除是否成功
     */
     removeMarker: function (marker) {
          var success = this._removeMarker(marker);
          if (success) {
               this._redraw();
          }
          return success;
     },

    /**
     * @function
     * @name removeMarkers
     * @description 将已有的聚合中的一组标记删除
     * @param {Array<L.Ols.Marker>} markers 以数组形式，删除一组标记
     * @return {Boolean} 删除是否成功
     */
     removeMarkers: function (markers) {
          var success = false;
          while(markers.length) {
               var r = this._removeMarker(markers[0]);
               markers.splice(0, 1);
               success = success || r;
          }
          if (success) {
               this._redraw();
          }
          return success;
     },

    /**
     * @function
     * @name getGridSize
     * @description 获取标记的网格大小
     * @return {Number} 标记的网格大小
     */
     getGridSize: function () {
          return this.options.gridSize; 
     },

    /**
     * @function
     * @name setGridSize
     * @description 设置标记的网格大小
     * @param {Number} size 标记的网格大小
     */
     setGridSize: function (size) {
          this.options.gridSize = size;
          this._redraw();
     },

    /**
     * @function
     * @name getMaxZoom
     * @description 获取聚合的最大缩放级别
     * @return {Number} 聚合的最大缩放级别
     */
     getMaxZoom: function () {
          return this.options.maxZoom;
     },

    /**
     * @function
     * @name setMaxZoom
     * @description 设置聚合的最大缩放级别
     * @param {Number} maxZoom 聚合的最大缩放级别
     */
     setMaxZoom: function (maxZoom) {
          this.options.maxZoom = maxZoom;
          this._redraw();
     },

    /**
     * @function
     * @name getMinGroupSize
     * @description 获取单个聚合的最小数量
     * @return {Number} 单个聚合的最小数量
     */
     getMinGroupSize: function () {
          return this.options.minGroupSize;
     },

    /**
     * @function
     * @name setMinGroupSize
     * @description 设置单个聚合的最小数量
     * @param {Number} size 单个聚合的最小数量
     */
     setMinGroupSize: function (size) {
          this.options.minGroupSize = size;
          this._redraw();
     },

    /**
     * @function
     * @name getMap
     * @description 获取聚合的Map实例
     * @return {Number} 聚合的Map实例
     */
     getMap: function () {
          return this._map;
     },

    /**
     * @function
     * @name isAverageCenter
     * @description 获取单个聚合的落脚点是否是聚合内所有标记的平均中心
     * @return {Number} 单个聚合的落脚点是否是聚合内所有标记的平均中心
     */
     isAverageCenter: function () {
          return this.options.AverageCenter;
     },

    /**
     * @function
     * @name getMarkers
     * @description 获取所有的标记数组
     * @return {Array<L.Ols.Marker>} 所有的标记数组
     */
     getMarkers: function () {
          return this.options.markers;
     },

    /**
     * @function
     * @name getStyle
     * @description 获取标记样式
     * @return {L.Ols.MarkerGroupOptions} 标记样式
     */
     getStyle: function () {
          return this.options.style;
     },

    /**
     * @function
     * @name setStyle
     * @description 设置聚合的样式
     * @param {L.Ols.MarkerGroupOptions} obj 聚合的样式
     */
     setStyle: function (obj) {
          this.options.style = obj;
          this._redraw();
     },

    /**
     * @function
     * @name getGroupCount
     * @description 获取聚合的总数量
     * @return {Number} 聚合的总数量
     */
     getGroupCount: function () {
          var count = 0;
          for(var i = 0, len = this._groups.length; i < len; i++) {
               if(this._groups[i]._isReal()) {
                    count += 1;
               };
          }
          return count;
     }
});

L.Ols.MarkerGroupOptions = {
    /**
     * @name markers
     * @type {Array<L.Ols.Marker>} 
     * @description 要聚合的标记数组
     */
     markers: [],

    /**
     * @name gridSize
     * @type {Number} 
     * @description 标记的网格大小(以像素为单位)
     */
     gridSize: 60,

    /**
     * @name maxZoom
     * @type {Number} 
     * @description 最大的聚合级别，大于该级别就不进行相应的聚合
     */
     maxZoom: 16,

    /**
     * @name minGroupSize
     * @type {Number} 
     * @description 最小的聚合数量，小于该数量的不能成为一个聚合
     */
     minGroupSize: 2,

    /**
     * @name AverageCenter
     * @type {Boolean} 
     * @description 聚合点的落脚位置是否是所有聚合内点的平均值
     */
     AverageCenter: false,

    /**
     * @name style
     * @type {L.Ols.GroupOverlayOptions} 
     * @description 聚合标记的样式
     */
     style: {autoStyle: true}
};

L.Ols.RichMarker = L.Ols.Base.extend({

    includes: L.Mixin.Events,

    options: {
        visible: true,
        popable:true,
        //interactive parts
        clickable: true,
        draggable: false,
        zIndexOffset: 0
    },
    
    /**
     * @constructor
     * @name L.Ols.RichMarker
     * @description 标注类的构造函数
     * @param  {L.Loc} position 标注位置
     * @param  {String | DOMElement} 标注内容
     * @param  {L.Ols.RichMarkerOptions} options 参数选项，可参考<L.Ols.RichMarkerOptions>进行选择
     */
    initialize: function (lonlat, content, options) {
        this.options = L.Util.extend({}, L.Ols.RichMarkerOptions, options);
        this._latlng = lonlat;
        this._content = content;
        this._container = L.Util.create('div', 'leaflet-marker-span');
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
     * @param {L.Loc} position 标注的地理位置
     */
    setPosition: function (position) {
        this._latlng = position;
        if (this._content) {
            this._draw();
        };
    },

    /**
     * @function
     * @name getContent
     * @description 获取标注中的内容
     * @return {String} 标注内容
     */
    getContent: function () {
        return this._content;
    },

    /**
     * @function
     * @name setContent
     * @description 设置标注中的内容
     * @param {String | DOMElement} content 标注内容
     */
    setContent: function (content) {
        this._content = content;
        this._appendContent();
    },

    /**
     * @function
     * @name getMarkerSize
     * @description 获取标注的大小
     * @return {L.Loc} 标注大小
     */
    getMarkerSize: function () {
        return this.options.markerSize;
    },

    /**
     * @function
     * @name setMarkerSize
     * @description 设置标注的大小
     * @param {L.Loc} size 标注大小
     */
    setMarkerSize: function (size) {
        this.options.markerSize = size;
        this._update();
    },

    /**
     * @function
     * @name getAnchor
     * @description 获取标注的偏移位置
     * @return {L.Loc} 标注的偏移位置
     */
    getAnchor: function () {
        return this.options.markerAnchor;
    },

    /**
     * @function
     * @name setAnchor
     * @description 设置标注的偏移位置
     * @param {L.Loc} anchor 标注的偏移位置
     */
    setAnchor: function (anchor) {
        this.options.markerAnchor = anchor;
        this._update();
    },

    /**
     * @function
     * @name getBackground
     * @description 获取标注主容器的背景样式
     * @return {string} 标注大小
     */
    getBackground: function () {
        return this.options.background;
    },

    /**
     * @function
     * @name setBackground
     * @description 设置标注主容器的背景样式，例如：'red'或'#f003ff'或'url(./images/m1.png)'
     * @param {string} background 标注大小
     */
    setBackground: function (background) {
        this.options.background = background;
        this._update();
    },

    /**
     * @function
     * @name getVisible
     * @description 获取标注的可见性
     * @return {Boolean} 标注的可见性
     */
    getVisible: function () {
        return this.options.visible;
    },

    /**
     * @function
     * @name setVisible
     * @description 设置标注的可见性
     * @param {Boolean} value 标注的可见性
     */
    setVisible: function (value) {
        value = value ? true : false;
        var dis = value ? 'block' : 'none';
        if (this.options.visible === value) {
            return;
        };
        this.options.visible = value;
        if (this._container) {
            this._container.style.display = dis;
        };
    },

    /**
     * @function
     * @name enableDrag
     * @description 设置元素可以拖动
     */
    enableDrag: function () {
        if (!this._map) {
            this.options.draggable = this.draggable = true;
            return this;
        };
        if (L.Ols.EleBase.Drag) {
            this.options.draggable = this.draggable = true;
            if (!this.dragging) {
                this.dragging = new L.Ols.EleBase.Drag(this);
            };
            this.dragging.enable();
        };
        return this;
    },

    /**
     * @function
     * @name disableDrag
     * @description 设置元素不可拖动
     */
    disableDrag: function () {
        if (!this._map) {
            this.options.draggable = this.draggable = false;
            return this;
        };
        this.options.draggable = this.draggable = false;
        if (this.dragging) {
            this.dragging.disable();
        };
        return this;
    },

    /**
     * @function
     * @name enablePop
     * @description 设置标注在激活时置前显示
     */
    enablePop: function () {
        this.options.popable = true;
        this.on('mouseover', this._onMouseOver, this);
        this.on('mouseout', this._onMouseOut, this);
    },

    /**
     * @function
     * @name disablePop
     * @description 禁止标注在激活时置前显示
     */
    disablePop: function () {
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
    bringToFront: function () {
        this._popToFront();
    },

    _initMarker: function () {
        this._appendContent();
        this._initInteraction();
        this._map._panes.markerPane.appendChild(this._container);
        this._draw();
        this._update();
    },

    _appendContent: function () {
        var content = this._content;
        if (typeof content === 'string') {
            var div = L.Util.create('div');
            div.innerHTML = content;
            if (div.childNodes.length === 1) {
                content = (div.removeChild(div.firstChild))
            } else {
                var fragment = document.createDocumentFragment();
                while (div.firstChild) {
                    fragment.appendChild(div.firstChild);
                }
                content = fragment;
            }
        }
        //this._container.innerHTML = '';
        L.Util.clearAllNode(this._container);
        this._container.appendChild(content);
    },

    _draw: function () {
        var pos = this._map._pointToAbsPixel(this._latlng).round();
        L.Util.setPosition(this._container, pos);
    },

    _update: function () {
        var size = this.options.markerSize,
        anchor = this.options.markerAnchor;
        if (this._container) {
            this._container.style.marginLeft = (-anchor.x) + 'px';
            this._container.style.marginTop = (-anchor.y) + 'px';
            this._container.style.width = size.x + 'px';
            this._container.style.height = size.y + 'px';
            this._container.style.background = this.options.background;
        };
    },

    _setMap: function (map) {
        this._map = map;
        this._initMarker();
        map.on('viewreset', this._draw, this);
    },

    _unsetMap: function (map) {
        map = map || this._map;
        this._removeMarker();
        map.off('viewreset', this._draw, this);
        this._map = null;
    },

    _removeMarker: function () {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
    },

    _getDragTarget: function () {
        return this._container;
    },

    _onDragUpdate: function (e) {
        this._latlng = e.point;
    },

    _getMoveTarget: function () {
        return this._container;
    },

    _onMouseOver: function (e) {
        L.DomEvent.stopPropagation(e);
        if (this.dragging && this.dragging.moved()) { return; }
        if(this.options.popable){
            this._popToFront();
        }
    },

    _onMouseOut: function (e) {
        L.DomEvent.stopPropagation(e);
        if(this.dragging && this.dragging.moved()) { return; }
        if(this.options.popable){
            this._pushToBack();
        }
    },

    _popToFront: function () {
        this._poped = true;
        var tmpElem = this._container;
        if (!tmpElem) {
            return;
        }
        tmpElem.style.zIndex = L.Util.MaxZIndex;
    },

    _pushToBack: function () {
        this._poped = false;
        var tmpElem = this._container;
        if (!tmpElem) {
            return;
        }
         if(!isNaN(this.options.zIndexOffset))
            tmpElem.style.zIndex = this.options.zIndexOffset;
        else
            tmpElem.style.zIndex = "auto";
    },

    _initInteraction: function () {
        if (this.options.clickable) {
            this._container.className += ' leaflet-clickable';

            L.DomEvent.addListener(this._container, 'click', this._onMouseClick, this);

            var events = ['dblclick', 'mousedown', 'mouseover', 'mouseout'];
            for (var i = 0; i < events.length; i++) {
                L.DomEvent.addListener(this._container, events[i], this._fireMouseEvent, this);
            }
        }
        if (this.options.popable) {
            this.enablePop();
        }
        if (this.options.draggable) {
            this.enableDrag();
        }
    },

    _onMouseClick: function (e) {
        if (this._map.getHegemonTag()) {
            return;
        }
        L.DomEvent.stopPropagation(e);
        if (this.dragging && this.dragging.moved()) {
            return;
        }
        this.fire(e.type, {originalEvent: e});
    },

    _fireMouseEvent: function (e) {
        if (!this._map || this._map.getHegemonTag()) {
            return;
        }
        this.fire(e.type, {originalEvent: e});
        L.DomEvent.stopPropagation(e);
    }
});

L.Ols.RichMarkerOptions = {

    /**
     * @name markerSize
     * @type {L.Loc} 
     * @description 标注主容器的大小
     */    
    markerSize: new L.Loc(0, 0),
    
    /**
     * @name markerAnchor
     * @type {L.Loc} 
     * @description 标注主容器相对于标注点地理坐标位置的偏移量(以像素为单位)，标注点地理位置在标注容器的左上角处。
     */
    markerAnchor: new L.Loc(0, 0),

    /**
     * @name background
     * @type {string} 
     * @description 标注主容器的背景样式，支持纯色和图片，例如：'red'或'#f003ff'或'url(./images/m1.png)'。
     */
    background: '',

    visible: true,

    /**
     * @name popable
     * @type {Boolean} 
     * @description 是否允许标注激活时置前显示
     */
    popable: true,

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
    draggable: false
};















