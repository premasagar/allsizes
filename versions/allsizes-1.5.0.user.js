// ==UserScript==
// @name          Flickr AllSizes+
// @description   Access all sizes for a Flickr photo. Copy the code, download the image, etc.
// @author        Premasagar Rose (http://premasagar.com/contact/)
// @namespace     http://premasagar.com
// @identifier    http://dharmafly.com/projects/allsizesplus/allsizesplus.user.js
// @version       1.5
// @date          2009-01-09
//
// @include       http://www.flickr.com/photo_zoom.gne*
// @include       http://flickr.com/photo_zoom.gne*
// @include       http://www.flickr.com/photos/*/*
// @include       http://flickr.com/photos/*/*
// @include       http://www.flickr.com/account/prefs/downloads*
// @include       http://flickr.com/account/prefs/downloads*
// @include       http://www.flickr.com/account/prefs/license*
// @include       http://flickr.com/account/prefs/license*
//
// @exclude       http://*flickr.com/photos/organize/*
// @exclude       http://*flickr.com/photos/friends/*
// @exclude       http://*flickr.com/photos/tags/*
//
// @exclude       http://*flickr.com/photos/*/sets*
// @exclude       http://*flickr.com/photos/*/friends*
// @exclude       http://*flickr.com/photos/*/archives*
// @exclude       http://*flickr.com/photos/*/tags*
// @exclude       http://*flickr.com/photos/*/alltags*
// @exclude       http://*flickr.com/photos/*/multitags*
// @exclude       http://*flickr.com/photos/*/map*
// @exclude       http://*flickr.com/photos/*/favorites*
// @exclude       http://*flickr.com/photos/*/popular*
// @exclude       http://*flickr.com/photos/*/with*
// @exclude       http://*flickr.com/photos/*/stats*
//
// @exclude       http://*flickr.com/photos/*/*/sizes/*
// @exclude       http://*flickr.com/photos/*/*/stats*
// ==/UserScript==

(function() {
var UserScript, dfApi, FLICKR_BLUE, FLICKR_PINK, Flickr, Page, AllSizes, Api, Settings, assets, page;

// USERSCRIPT INFORMATION
UserScript = {
	id: 'allsizesplus',
	title: 'Flickr AllSizes+',
	header: 'allSizes+',
	version: 1.5,
	date: new Date(2009, 0, 9), // year, month (starting from 0 in January), day
	author: 'Premasagar Rose'
};

/*

  INFO
  ====
  Before installing this script, you'll need the Firefox browser (http://www.mozilla.org/firefox/) and the Greasemonkey add-on (http://www.greasespot.net)
  
  Discuss this script / report bugs / request features:
  http://www.flickr.com/groups/flickrhacks/discuss/72157594303798688/
  
  Download the latest version:
  http://dharmafly.com/projects/allsizesplus/allsizesplus.user.js
  
  Released under the GPL license:
  http://www.gnu.org/copyleft/gpl.html



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


function debug(){
	var payload, i, console;
	if (!GM_getValue('debug') || !arguments.length){
		return false;
	}
	console = unsafeWindow.console;
	if (arguments.length === 1){
		payload = arguments[0];
	}
	else {
		payload = [];
		for (i=0; i<arguments.length; i++){
			payload.push(arguments[i]);
		}
	}
	if (typeof console !== 'undefined' && typeof console.log !== 'undefined'){ // Firebug console
		console.log(payload);
	}
	
	try { // Greasemonkey logs to the Error Console message window
		GM_log((typeof payload === 'object' && payload !== null) ? payload.toSource() : payload);
	}
	catch(e){
		GM_log('debug: Could not convert toSource: ' + payload);
	}
}


function isArray(obj){
	return (obj.constructor === Array);
}


// Convert object to array. Optional arg: propsToInclude [function] = returns boolean match of type
function toArray(iterable) {
	var propsToInclude, results;	
	if (!iterable){
		return [];
	}
	if (iterable.toArray){
		return iterable.toArray();
	}
	
	if (arguments.length > 1){
		propsToInclude = arguments[1];
	}
	else {
		propsToInclude = function(prop){
			return (typeof prop === 'object' && prop !== null);
		};
	}
	
	results = [];
	for (property in iterable){
		if (propsToInclude(iterable[property])){
			results.push(iterable[property]);
		}
	}
	return results;
}


// Extend one object with properties of another. Optional arg: includeInheritedProps (boolean), default: false
function extend(dest, source){
	var includeInheritedProps, prop;
	
	includeInheritedProps = (arguments.length > 2) ? arguments[2] : false;
	for (prop in source){
		if (includeInheritedProps || source.hasOwnProperty(prop)){
			dest[prop] = source[prop];
		}
	}
	return dest;
}


function queryToObj(q){
	var searchObj, i;
	
	q = q.replace(/^\?/, '').split("&");
	searchObj = {};
	for (i=0; i<q.length; i++){
		q[i] = q[i].split('=');
		if (q[i].length == 2){
			if (q[i][0] !== ''){
				searchObj[q[i][0]] = q[i][1];
			}
		}
	}
	return searchObj;
}

function objToQuery(data){
	var q = '';
	
	for (prop in data){
		if (q){
			q += '&';
		}
		q += prop + '=' + data[prop];
	}
	return q;
}

function jsonEncode(data){
	return data.toSource().replace(/(^\(|\)$)/g, '');
}

function jsonDecode(json){
	var data = false;
	try {
		eval('data = ' + json + ';');
	}
	catch(e){
		debug(['jsonDecode: Invalid JSON', json]);
	}
	return data;
}


function randomString(){
	return parseInt(Math.random()*10000000).toString();	
}


function now(){
	return new Date().getTime();
}



function isHTMLElement(node){
	var nodeName, isElement;
	nodeName = (arguments.length > 1) ? arguments[1] : false;
	
	if (node.nodeName){
		isElement = (document.createElement(node.nodeName.toLowerCase()).constructor === node.constructor);
	}
	return (nodeName !== false) ? (isElement) : (isElement &&  node.nodeName === nodeName);
}

// createElement - optional arg: text contents
function cE(nodeName){
	var node = document.createElement(nodeName);
	if (arguments.length > 1){
		var text = arguments[1];
		if (typeof text == 'string'){
			node.appendChild(cTN(text));
		}
	}
	return node;
}

// createTextNode
function cTN(text){
	return document.createTextNode(text);
}

// Add mutually exclusive single- and double-click events to a node
function addClickListener(node, onClick, onDblClick){ // addClickListener.clickInterval can be set to millisecond interval between clicks
	var addClickListener = arguments.callee;
	if (typeof addClickListener.clickInterval === 'undefined'){
		addClickListener.clickInterval = 200; // milliseconds interval between first and second click
	}
	
	node.addEventListener('click', function(e){
	    var that;
		that = arguments.callee;
		that.clicks = (typeof that.clicks === 'undefined') ? 1 : that.clicks + 1;
		
		if (that.clicks === 2){
			onDblClick(e);
			that.clicks = 0;
		}
		else {
		    window.setTimeout(function(){
		        if (that.clicks === 1){
		            onClick(e);
					that.clicks = 0;
		        }
		    }, addClickListener.clickInterval);
		}
	}, false);
}


function trim(text){
	return (text || "").replace( /^\s+|\s+$/g, "" );
}


// Convert special characters to their HTML entities
function convertSpecialChars(str){
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


function innerText(node){
	return trim(node.innerHTML.replace(/<[^>]*>/g, ''));
}


// Add styles to node. arg: styles = object containing properties to apply to node.style
function applyStyles(node, styles){
	return extend(node.style, styles);
}


// Insert rules into stylesheet - supply either a single rule as a string or an array of strings
function insertStyles(styles){
	// If single string supplied, convert to array
	if (typeof styles == 'string'){
		styles = [styles];
	}

	var style = document.getElementsByTagName('head')[0].appendChild(cE('style'));
	style.type = 'text/css';
	style.appendChild(cTN(styles.join(' ')));
}


// Get elements from the document with a specific cssClass
function getElementsByCssClass(tagName, cssClass){
	var returnArray, container, elements, i;

	// Construct empty array to return
	returnArray = [];
	
	// Container element
	container = (arguments.length > 2) ? arguments[2] : document;
	
	// Get divs in the document
	elements = container.getElementsByTagName(tagName);
	
	// Cycle through elements
	for (i=0; i<elements.length; i++){
		// Find the element with the css class
		if (elements[i].getAttribute('class') && elements[i].getAttribute('class').match(cssClass)){
			returnArray.push(elements[i]);
		}
	}
	
	// Return array
	return returnArray;
}


function copyToClipboard(text){
	var clipHandler;

	function copyToClipboard(text){
		var component, trans, supportStr, clipInst, clipboard;

		try {
			netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
		}	
		catch(e){
			// User cancellation
			return false;
		}
		
		try {
			component = Components.classes["@mozilla.org/widget/transferable;1"];
			trans = component.createInstance(Components.interfaces.nsITransferable);
			trans.addDataFlavor("text/unicode");
			
			component = Components.classes["@mozilla.org/supports-string;1"];
			supportStr = component.createInstance(Components.interfaces.nsISupportsString);
			supportStr.data = text;			
			
			trans.setTransferData("text/unicode", supportStr, text.length*2);
			
			component = Components.classes["@mozilla.org/widget/clipboard;1"];
			clipInst = component.createInstance(Components.interfaces.nsIClipboard);
			clipboard = Components.interfaces.nsIClipboard;
			clipInst.setData(trans, null, clipboard.kGlobalClipboard);
		}
		catch(e){
			// Privilege not granted
			return false;
		}

		return true;
	}
	
	// New in FF3 - previously, this step unnecessary (and the netscape object needed to be called as unsafeWindow.netscape)
	// We need an element in unsafeWindow to activate the function clipboard
	clipHandler = unsafeWindow.document.getElementById('clipHandler');
	if (!clipHandler){
		// Use a textarea to contain required text
		clipHandler = unsafeWindow.document.createElement('textarea');
		clipHandler.id = 'clipHandler';
		clipHandler.style.display = 'none';
		// Pass the source code of copyToClipboard() to the onclick attribute. When triggered, the textarea contents is copied to clipboard. The className of the textarea is changed, so that the success or failure can be communicated via the DOM.
		clipHandler.setAttribute('onclick', copyToClipboard.toSource() + "this.className = (copyToClipboard(this.value)) ? 'true' : 'false';");
		document.body.appendChild(clipHandler);
	}
	clipHandler.value = text;
	clipHandler.onclick();
	clipHandler.value = '';
	
	return (clipHandler.className === 'true');
}


// Make an AJAX request
function ajaxRequest(url){ // optional: callback, method, data
	var callback, method, request, data, dataString;
	
	// Optional args
	// Callback function - default: no function
	callback = (arguments.length > 1) ? arguments[1] : function(){};
	// HTTP Method - default: GET
	method = (arguments.length > 2) ? arguments[2].toUpperCase() : 'GET';
	
	// Request object
	request = {
		method: method,
		url:url,
		headers: {
			'User-agent': 'Mozilla/5.0 (compatible) Greasemonkey' + (typeof UserScript !== 'undefined' && typeof UserScript.title !== 'undefined' ? ': ' + UserScript.title : ''),
			'Accept': 'application/atom+xml, application/xml, application/xml+xhtml, text/xml, text/html, application/json, application-x/javascript'
		},
		onload:function(response){
			debug(['ajaxRequest: AJAX response successful', response]);
			//debug(response.responseText);
			
			if (response.status !== 200){
				debug ('ajaxRequest: Response status ' + response.status);
				return callback(false);
			}			
			if (response.responseText === ''){
				debug('ajaxRequest: AJAX response empty');
				return callback(false);
			}
			callback(response.responseText);
		},
		onerror:function(response){
			debug(['ajaxRequest: AJAX request failed', response]);
			callback(false);
		}
	};
	
	// POST data
	if (method === 'POST'){
		data = (typeof arguments[3] === 'object') ? arguments[3] : {};
		dataString = '';
		
		for (prop in data){
			if (dataString !== ''){
				dataString += '&';
			}
			dataString += prop + '=' + encodeURI(data[prop]);
		}
		request.data = dataString;
		request.headers['Content-type'] = 'application/x-www-form-urlencoded';
	}			
	
	// Send request
	debug(['ajaxRequest: Sending AJAX request:', request]);
	GM_xmlhttpRequest(request);
}



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



// INITIALISE OBJECTS
function Init(){
}

Init.prototype = extend([], {
	// Pass object as argument to function
	init: function(obj){
		// Call each function in the init array
		for(var i=0; i<this.length; i++){
			this[i].call(obj);
		}		
		// Delete init object
		delete(obj.init);
	},
	register: Array.prototype.push
});




/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */





function Cache(namespace){
	this.namespace = namespace;
}
Cache.prototype = {
	memoryLimit: 524488, // ~512KB

	// LOCAL CACHE
	get: function(){
		var cache, cacheObj;
		cache = GM_getValue(this.namespace);
		cacheObj = (typeof cache === 'string') ? jsonDecode(cache) : false;
		return cacheObj;
	},

	// optional arg: clean [bool] - whether to remove existing contents first
	set:function(data){
		var oldCache, newCache, clean;
		clean = (arguments.length > 2) ? (arguments[2]) : false;
		oldCache = this.get();
		
		// Create empty object for null or undefined data. Other data types left as is.
		if (data === null || typeof data === 'undefined'){
			data = {};
		}
		if (oldCache && !clean){ // if there's a cache and we don't want to wipe it clean
			data = extend(oldCache, data);
		}
		newCache = jsonEncode(data);
		
		// Limit memory usage
		if (newCache.length <= this.memoryLimit){
			GM_setValue(this.namespace, newCache);
			return data;
		}
		else {
			debug(['Cache set: Memory limit reached', this.memoryLimit]);
			return false; // TODO: In callers, always test for response === false
		}
	}
};



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



/* 
	RegexMap
	Accept a regex and array of references (overall string + backrefs) => return an object of properties
	E.g.
	var m = new RegexMap(/^\d*@N\d*$/, ['nsid']);
	m('54304913@N00') => {nsid:'54304913@N00'}
*/
function RegexMap(regex, refs){
	var regexMap = function(str){
		var i, matches, mapObj;
		
		mapObj = {};
		matches = regex.exec(str);
		
		if (!matches){
			return null;
		};
		
		if (isArray(refs)){
			for (i=0; i<refs.length; i++){
				if (typeof matches[i] === 'undefined'){
					continue;
				}
				mapObj[refs[i]] = matches[i];
			}
			return mapObj;
		}
		return false;
	};
	
	regexMap.regex = function(){
		return regex;
	};
	regexMap.refs = function(){
		return refs;
	}
	return regexMap;
}



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



function KeyLogger(specialKeys, hotKeys){
	this.specialKeys = specialKeys;
	this.hotKeys = hotKeys; // TODO: hotKeys optional. Or arbitrary number of keySets
}

KeyLogger.prototype = {
	keysDown: '',
	locked: false, // Prevent situation where a key is pressed, then a dialog is opened (e.g. download image), then script resets keylogger, but user is still pressing key, so it gets added to keylogger again, then user removes key in that other window, but the keyup event does not fire in this window, so the key never gets removed
	lockTime:1000, // ms between lock and unlock. Use to prevent addition of new keys presses, e.g. when user has opened a new browser dialog such as download image, and the keyup event no longer fires in this window. Should allow enough time for the browser to open dialogs and windows, etc.
	
	charToKey: function(char){
		return String.fromCharCode(char).toLowerCase();
	},
	
	isHotKey: function(){
		var keys;
		keys = {
			specialKeys:'',
			hotKeys:''
		}
		
		for (var i=0; i < this.hotKeys.length; i++){
			for (var j=0; j < this.specialKeys.length; j++){
				if (this.specialKeys[j] + this.hotKeys[i] == this.keysDown){
					return extend(keys, {
						specialKeys:this.specialKeys[j],
						hotKeys:this.hotKeys[i]
					});
				}
			}
		}
		return keys;
	},
	
	// Supply handler function, e.g. to Window object
	handler: function(){
		var that = this;
		
		return function(e){
			var key;
			
			switch(e.type){
				case 'keydown':
				if (that.locked){
					return false;
				}
				key = that.charToKey(e.which);
				return that.addKey(key);
				break;
				
				case 'keyup':
				key = that.charToKey(e.which);
				return that.removeKey(key);
				break;
				
				default:
				return false;
				break;
			}
		};
	},
	
	addKey: function(key){
		var k = this.keysDown;
		
		// Prevent duplicate entries from holding down key
		if (k.length > 0){
			if (k[k.length-1] === key) {
				return k;
			}
		}
		this.keysDown += key;
		//debug('Keylogger.addKey', this.keysDown);
		return this.keysDown;
	},
	
	removeKey: function(key){
		var prefix, suffix;
		for (var i=0; i < this.keysDown.length; i++){
			if (this.keysDown[i] === key){
				prefix = (i > 0) ? this.keysDown.slice(0, i) : '';
				suffix = (i < this.keysDown.length) ? this.keysDown.slice(i + 1) : '';
				this.keysDown = prefix + suffix;
				//debug('Keylogger.removeKey', this.keysDown);
				return this.keysDown;
			}
		}
	},
	
	reset: function(){
		//debug('Keylogger.reset');
		return this.keysDown = '';
	},
	
	lock: function(){
		var that = this;
		this.reset();
		this.locked = true;
		window.setTimeout(function(){
			if (that.locked){
				that.unlock();
			}
		}, this.lockTime);
		//debug('Keylogger.lock');
	},
	
	unlock: function(){
		this.locked = false;
		//debug('Keylogger.unlock');
	}
};



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



dfApi = {
	cache: new Cache('users'),
	
	getUserNsid:function(){
		return Page.photoPage.getUserNsid();
	},
	
	// Id used for local cacheing
	getUserId:function(){
		var nsid = this.getUserNsid();
		return (nsid) ? nsid : 'offline';
	},
	
	// Get md5 hash string
	getMd5:function(message, callback){
		var url = 'http://api.dharmafly.com/md5';
		return ajaxRequest(url, callback, 'POST', {message:message});
	},
	
	// Local cached user data
	getUser:function(){
		var id, users;
		id = (arguments.length > 0) ? arguments[0] : this.getUserId();
		users = this.cache.get();
		return (users[id]) ? users[id] : false;
	},

	setUser:function(data){
		var id, users, user;		
		id = (arguments.length > 1) ? arguments[1] : this.getUserId();
		users = this.cache.get();
		if (!users){
			users = {};
		}
		user = users[id];
		if (!user){
			user = {};
		}
		users[id] = extend(user, data);
		return (this.cache.set(users)) ? user : false; // TODO: Test for this response === false
	},

	// Obscured id for data comms, unique for each nsid or offline user
	getAnonId:function(){
		var callback, id, user, anonId, that;		
		callback = (arguments.length) ? arguments[0] : function(rsp){return rsp;};
		id = this.getUserId();
		user = this.getUser(id);
		that = this;
		
		if (user && typeof user.anonId !== 'undefined'){
			callback(user.anonId);
			return user.anonId;
		}
		
		else if (id === 'offline'){
			anonId = 'o_' + randomString();
			// Update cache
			this.setUser({anonId:anonId});
			callback(anonId);
			return anonId;
		}
		
		else {	
			this.getMd5(id, function(anonId){
				if (anonId){
					// Update cache
					that.setUser({anonId:anonId});
					callback(anonId);
				}
				else {
					debug('getAnonId: Could not get anonId');
					callback(false);
				}
			});
			debug('getAnonId: anonId not yet known... will check');
			return null;
		}
	},
	
	log:function(data){ // Optional arg: force - to use log, even when user has turned off stats
		return false; // Stats closed - TODO: Cleanup
	
		var that, logId, user, force, settings;
		that = this;
		force = (arguments.length > 1) ? arguments[1] : false;
		
		if (GM_getValue('sendStats') !== false || force){
			// Run in parallel process
			window.setTimeout(function(){
				logId = randomString();
				user = that.getUser();
				if (!user){
					user = {};
				}
				// Create log if doesn't exist
				if (typeof user.log === 'undefined'){
					user.log = that.createLog();
				}
				user.log[logId] = extend(data, {v:(user.v) ? user.v : UserScript.version});
				debug(['dfApi.log: ', data]);
				that.setUser({log:user.log});
				
				// Send log
				that.send({log:user.log});
			}, 0);
			return data;
		}
		else {
			return false;
		}
	},
	
	createLog:function(){
		this.setUser({log:{}});
		debug('dfApi.createLog: Creating log object');
		return {};
	},
	
	deleteLog:function(){
		var logIds, user, logId, i, changed;
		logIds = (arguments.length) ? arguments[0] : [];
		
		changed = false;
		user = this.getUser();
		if (!user || typeof user.log === 'undefined'){
			debug(['deleteLog: Log not found']);
			return false;
		}
		if (!isArray(logIds)){
			logIds = [logIds];
		}
		if (!logIds.length){
			debug('deleteLog: No ids passed. Emptying log.'); // e.g. on server error
			user.log = {};
			changed = true;
		}
		else {
			for (i=0; i<logIds.length; i++){
				logId = logIds[i];
				if (typeof user.log[logId] !== 'undefined'){
					debug(['deleteLog: Log message deleted', logId]);
					delete(user.log[logId]);
					changed = true;
				}
			}
		}
		if (changed){
			this.setUser({log:user.log});
		}
		return user.log;
	},
	
	send:function(data){
		var callback, url, messageId, that;		
		that = this;		
		callback = (arguments.length > 1) ? arguments[1] : function(){};		
		url = 'http://api.dharmafly.com/allsizesplus/' + UserScript.version + '/stats';
		
		this.getAnonId(function(id){
			var i;			
			if (id){
				data = {
					id:id,
					message:jsonEncode(data)
				};
				if (GM_getValue('debug') === true){
					data.debug = 1;
				}
				ajaxRequest(url, function(rsp){
					debug('send. dfApi response:');
					debug(rsp);					
					rsp = jsonDecode(rsp);
					if (rsp){
						if (typeof rsp.logs_in_process !== 'undefined' && rsp.logs_in_process.length){
							that.deleteLog(rsp.logs_in_process);
							that.send({deletedLogs:rsp.logs_in_process});
						}
						else if (rsp.status === 400){ // Bad request
							log = that.deleteLog(); // Log could not be sent due to bad JSON. Empty log to prevent it stacking up.
						}
					}
				}, 'POST', data);
				callback(true);
			}
			else {
				debug('send: Data not sent. Could not get anonId');
				callback(false);
			}
		});
		return data;
	},
	
	// LOG CALLS
	// =========
	activated:function(){ // optional arg: initObj
		var that, page, photo, size, payload;
		if (arguments.callee.done){
			return;
		}
		that = this;
		payload = (arguments.length) ? arguments[0] : {};
		page = Page.getCurrentPage();
		photo = page.getPhoto();
		
		// Get all photo data and send log
		photo.sizes.getAllSizes(function(){
			// Media type
			payload.media = photo.media;
			
			// License
			payload.license = {};
			if (photo.license.name === 'creativecommons'){
				extend(payload.license, photo.license);
				delete(payload.license.title);
				delete(payload.license.icons);
				delete(payload.license.url);
			}
			else {
				payload.license.name = photo.license.name;
			}
			
			// Is photo owner the current user?
			payload.isUser = photo.isUser;
			
			// Privacy
			payload.privacy = {id: photo.privacy.id};
			if (photo.privacy.id === 'a_bit_private'){
				if (photo.privacy.permissions){
					payload.privacy.permissions = photo.privacy.permissions;
				}
				else {
					payload.privacy.label = photo.privacy.label;
				}
			}
			
			// Sizes
			size = photo.sizes.getLargestKnownSize();
			payload.sizes = {
				candownload:photo.sizes.candownload,
				largest:{
					id:size.id,
					width:size.getDimensions()[0],
					height:size.getDimensions()[1]
				}
			};
			
			// GetAllSizes info
			payload.getAllSizes = {
				time: (photo.sizes.getAllSizes.stop - photo.sizes.getAllSizes.start),
				method: photo.sizes.getAllSizes.method
			}
		
			that.log({action:'activated', photo:payload});
		});
		arguments.callee.done = true;
	},
	
	getSettings:function(){
		var setting, settings;
		settings = {};
		for (i=0; i<Settings.length; i++){
			for (j=0; j<Settings[i].settings.length; j++){
				setting = Settings[i].settings[j];
				settings[setting.id] = setting.getValue();
			}
		}
		return settings;
	},
	
	scriptUpdated:function(){
		var that, version, user, prevVersion;
		that = this;		
		version = UserScript.version;
		user = this.getUser();
		
		if (user && user.v){
			prevVersion = user.v;
		}
		else if (GM_getValue('version')){
			prevVersion = Number(GM_getValue('version'));
		}
		else {
			prevVersion = 0;
		}
		
		if (prevVersion !== version){
			this.setUser({v:version});
			
			// Update log
			/* if (that.getSettings().sendStats === false){
				this.log({action:'scriptUpdated', sendStats:false}, true);
			}
			else {
				that.getDefaultLicense(function(defaultLicense){
					that.allowDownloads(function(allowDownloads){
						that.log({
							action:'scriptUpdated',
							version:version,
							prevVersion:prevVersion,
							settings:that.getSettings(),
							codeType:(GM_getValue('codeType')) ? GM_getValue('codeType') : 'html',
							lang:Page.getCurrentPage().getLang().langtag,
							defaultLicense:defaultLicense,
							allowDownloads:allowDownloads
						});
					});
				});
			} */
			// Stats off. Delete log
			this.deleteLog();
			// Display updated pop-up
			AllSizes.updated();
			
			debug('scriptUpdated: ', prevVersion, version);
			return true;
		}
		return false;
	},
	
	getDefaultLicense:function(){
		var user, timeNow, lastCheck, url, that, callback;
		callback = (arguments.length) ? arguments[0] : function(){};
		
		if (this.getUserId() === 'offline'){
			debug(['getDefaultLicense: User not logged in']);
			callback(false);
			return false;
		}
		
		that = this;
		timeNow = now();
		user = this.getUser();
		
		// Already cached result?
		if (user && typeof user.license !== 'undefined' &&  typeof user.licenseChecked !== 'undefined'){
			lastCheck = parseInt(user.licenseChecked);
		
			// Guard against weird stuff, like user changing system clock to the future
			if (lastCheck > timeNow){
				lastCheck = timeNow;
			}
			
			// Last check still valid?
			if (timeNow < (lastCheck + (UserScript.updateInterval * 60 * 60 * 1000))){
				debug(['getDefaultLicense: From cache', user.license]);
				callback(user.license);
				return user.license;
			}
		}
		
		// Check user account privacy settings page
		url = Flickr.getUrl('account/prefs/license/');
		
		ajaxRequest(url, function(rsp){
			var html, inputs, defaultLicense;
			if (rsp){
				html = cE('code');
				// replace image src values, to prevent download
				html.innerHTML = rsp.replace(/src=(["'])http/gm, 'src=$1xhttp');			
				defaultLicense = Page.setDefaultLicense.getDefaultLicense(html);
				debug(['getDefaultLicense: From settings page', defaultLicense]);
				callback(defaultLicense);
				return;
			}
			else {
				debug('getDefaultLicense: No response from account settings');
				callback(false);
				return;
			}	
		});
		
		return null;
	},
	
	
	allowDownloads:function(){
		var user, timeNow, lastCheck, url, that, callback;
		callback = (arguments.length) ? arguments[0] : function(){};
		
		if (this.getUserId() === 'offline'){
			debug(['allowDownloads: User not logged in']);
			callback(false);
			return false;
		}
		
		that = this;
		timeNow = now();
		user = this.getUser();
		
		// Already cached result?
		if (user && typeof user.allowDownloads !== 'undefined' &&  typeof user.allowDownloadsChecked !== 'undefined'){
			lastCheck = parseInt(user.allowDownloadsChecked);
		
			// Guard against weird stuff, like user changing system clock to the future
			if (lastCheck > timeNow){
				lastCheck = timeNow;
			}
			
			// Last check still valid?
			if (timeNow < (lastCheck + (UserScript.updateInterval * 60 * 60 * 1000))){
				debug(['allowDownloads: From cache', user.allowDownloads]);
				callback(user.allowDownloads);
				return;
			}
		}
		
		// Check user account privacy settings page
		url = Flickr.getUrl('account/prefs/downloads/');
		
		ajaxRequest(url, function(rsp){
			var html, inputs, allowDownloads;
			if (rsp){
				html = cE('code');
				// replace image src values, to prevent download
				html.innerHTML = rsp.replace(/src=(["'])http/gm, 'src=$1xhttp');			
				allowDownloads = Page.allowDownloads.allowDownloads(html);
				debug(['allowDownloads: From settings page', allowDownloads]);
				callback(allowDownloads);
				return;
			}
			else {
				debug('allowDownloads: No response from account settings');
				callback(false);
				return;
			}			
		});
	}
};


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


// CSS STYLES PALETTE
FLICKR_BLUE = '#0063dc';
FLICKR_PINK = '#ff0084';


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



// OBJECT EXTENSIONS
extend(Array.prototype, { 
	// Search objects within an array for a specified property-value or method-result
	// optional arg: asArray [boolean] - to return an array of objects. Default: false
	getBy: function(property, value){
		if (arguments.length > 2){
			if (arguments[2]){
				var asArray = true;
				var returnArray = [];
			}
		}
			
		if (typeof asArray === 'undefined'){
			var asArray = false;
		}
		
		
		for (var i=0; i<this.length; i++){
			if (typeof this[i] !== 'object'){
				continue;
			}
			
			switch (typeof this[i][property]){
				case 'undefined':
				break;
				
				case 'function':
				if (this[i][property]() === value){
					if (asArray){
						returnArray.push(this[i]);
					}
					else {
						return this[i];
					}
				}
				break;
					
				default:
				if (this[i][property] === value){
					if (asArray){
						returnArray.push(this[i]);
					}
					else {
						return this[i];
					}
				}
				break;
			}
		}
		
		if (asArray){
			return (returnArray.length > 0) ? returnArray : null;
		}
		else {
			return null;
		}
	},
	
	getById: function(id){
		return this.getBy('id', id);
	}
});



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



// FLICKR REFERENCE OBJECT
Flickr = {
	domain: 'flickr.com',
	
	regexMaps: {
		photoSrc:new RegexMap(
			/http:\/\/(?:farm(\d*)\.)?static\.flickr\.com\/(\d+)\/(\d+)_(\w+?)(_[stmbo]|)\.(jpg|gif|png)/,
			['src', 'farm', 'server', 'id', 'secret', 'suffix', 'extension']
		),
		photoPageUrl:new RegexMap(
			/(?:http:\/\/(?:www\.)?flickr\.com)?\/photos\/([\w@_-]+)\/(\d+)\/?(?:in\/([^\/]+)\/)?/,
			['url', 'userUrl', 'id', 'in']
		),
		allSizesPageUrl:new RegexMap(
			/(?:http:\/\/(?:www\.)?flickr\.com)?\/photos\/([\w@_-]+)\/(\d+)\/sizes\/(sq?|[tmlo])/,
			['url', 'userUrl', 'id', 'size']
		),
		buddyiconSrc:new RegexMap(
			/http:\/\/(?:farm(\d*)\.)?static.flickr.com\/(\d+)\/buddyicons\/([\w@_-]+)\.jpg|http:\/\/(?:www\.)?flickr\.com\/images\/buddyicon\.jpg(?:\?([\w@_-]+))?|http:\/\/l\.yimg\.com\/(?:(?:(?:www\.)?flickr\.com)|g)\/images\/buddyicon\.jpg(?:#(\d*@N\d*$)?)?/,
			['src', 'farm', 'server', 'nsid', 'nsid', 'nsid']
		),
		nsid:new RegexMap(
			/\d*@N\d*/,
			['nsid']
		),
		license:new RegexMap(
			/(?:http:\/\/(creativecommons)\.org\/licenses\/([^\/]*)\/([\d\.]*)(?:\/([\w]*))?\/(?:deed\.(.*))?)|(?:http:\/\/(?:www\.)?flickr.com)?\/commons\/usage\//,
			['url', 'name', 'type', 'version', 'jurisdiction', 'language']
		),
		privacy:new RegexMap(
			/fs-icon_(public|private|a_bit_private)/,
			['className', 'id']
		),
		langSelectedLink:new RegexMap(
			/<a href="\/change_language\.gne\?lang=((\w\w)-(\w\w))&(?:amp;)magic_cookie=(\w+)" class="selected">([^<]+)<\/a>/,
			['anchor', 'langtag', 'lang', 'region', 'cookie', 'label']
		)
	},
	
	getUrl: function(path){
		var includesWww = (window.location.hostname.indexOf('www.') === 0);	
		return 'http://' + (includesWww ? 'www.' : '') + this.domain + '/' + path;
	},
	
	// Get a Flickr photo or buddyicon image from an element/document.
	// Arg: imgType = 'photo' or 'buddyicon'. Optional args: Element in which image is contained
	findImg: function(imgType){
		var regexMap, container, images, i;
		
		switch (imgType){
			case 'photo':
			regexMap = this.regexMaps.photoSrc;
			break;
			
			case 'buddyicon':
			regexMap = this.regexMaps.buddyiconSrc;
			break;
			
			default:
			return false;
		}
		
		// Find images in the containing element
		container = (arguments.length > 1) ? arguments[1] : document;
		images = container.getElementsByTagName('img');
		
		// Find the image src of the photo
		for (i=0; i<images.length; i++){
			if (regexMap(images[i].src)){
				return images[i];
			}
		}
		return false;
	}
};



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



// PHOTO OBJECT
function Photo(map){
	if (!map.id || !map.secret || !map.server || !map.farm){
		return false;
	}
	extend(this, map);
	if (this.owner){
		if (this.owner.constructor !== Person){
			this.owner = new Person(this.owner);
		}
	}
	if (this.license){
		if (this.license.constructor !== License){
			this.license = new License(this.license);
		}
	}
	this.init.init(this);
}


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


// STATIC FUNCTIONS ON PHOTO OBJECT
extend(Photo, {
	// Create Photo object from an image src
	fromSrc: function(src){
		var map, photo;
		map = Flickr.regexMaps.photoSrc(src);
		photo = new this({
			id:map.id,
			secret:map.secret,
			server:map.server,
			farm:map.farm
		});
		if (map.suffix === '_o'){
			photo.originalformat = map.extension;
		}
		return photo;
	},
	
	// Create Photo object from an image element
	fromImg: function(img){
		var photo, map, suffix, size;
		// Create Photo object from the image src
		photo = this.fromSrc(img.src);
		
		// Get the size suffix - e.g. '_s', '_t'
		map = Flickr.regexMaps.photoSrc(img.src);
		suffix = (map.suffix) ? map.suffix : '';
		
		// Get size object from photo for the size of this image
		size = photo.sizes.get().getBy('suffix', suffix);
		if (size){
			// Set the dimensions of this size and smaller sizes
			photo.sizes[size.id].setDimensions(img.width, img.height);
			photo.sizes.setDimensions();
		}

		return photo;
	}
});



// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



// PHOTO OBJECT PROTOTYPE
Photo.prototype = {
	// Init Object, for storing functions required at object initialisation
	init: new Init(),
	title: null,
	owner: null,
	originalformat: null,
	originalsecret: null,
	
	// Get photo title. Add username to title, if user has requested it.
	getTitle: function(){
		// Check title of page each time, in case owner/user changes it
		if (Page.getCurrentPage().getTitle){
			this.title = Page.getCurrentPage().getTitle();
		}
		
		// Don't know
		if (!this.title){
			return null;
		}
		
		// Replace blank titles with the user's setting for blank titles.
		var title = (this.title.length == 1 && this.title.charCodeAt(0) == 160) ? '' : this.title;
		if (title == ''){
			title = Settings.getValue('untitledTitle');
		}
		
		// Check if we have the owner's username
		if (!this.owner){
			return title;
		}
		if (!this.owner.username){
			return title;
		}
		
		// Check the user's settings for adding the username to the title
		if ((this.isUser && Settings.getValue('addUsernameWhenYou')) || (!this.isUser && Settings.getValue('addUsernameToTitle')) ){
			title += Settings.getValue('usernameFormat').replace(/\[user\]/g, this.owner.username);
		}
		
		// Convert any special characters to their HTML entities (e.g. &, <, ")
		return convertSpecialChars(title);
	},
	
	
	// Get the url of the photopage for this photo
	getPhotopageUrl: function(){
		// If we don't know the owner, then use the generic url
		if (!this.owner){
			return Flickr.getUrl('photo.gne?id=' + this.id);
		}
			
		// If we know the owner, then use the specific url
		else {
			return this.owner.getPhotosUrl() + this.id + '/';
		}
	}
};




/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */




// PERSON OBJECT
function Person(map){
	var nsidMap;
	
	if(!map.userUrl){
		return false;
	}
	extend(this, map);
	
	// Check if userUrl is the nsid
	if (!this.nsid){
		nsidMap = Flickr.regexMaps.nsid(this.userUrl);
		if (nsidMap && nsidMap.nsid === this.userUrl){
			this.nsid = this.userUrl;
		}
	}
}


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


// PERSON PROTOTYPE
Person.prototype = {
	nsid: null,
	username: null,
	
	// Url for person's photostream
	getPhotosUrl: function(){
		var userUrl = (this.userUrl) ? this.userUrl : this.nsid;
		return (userUrl) ? Flickr.getUrl('photos/' + userUrl + '/') : null;
	},
	
	// Url for person's profile
	getProfileUrl: function(){
		var userUrl = (this.userUrl) ? this.userUrl : this.nsid;
		return (userUrl) ? Flickr.getUrl('people/' + userUrl + '/') : null;
	},
	
	// Url to send a FlickrMail
	getSendmailUrl: function(){
		return (this.nsid) ? Flickr.getUrl('messages_write.gne?to=' + this.nsid) : null;
	}
};


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


// STATIC FUNCTIONS ON PERSON OBJECT
extend(Person, {
	getNsidFromBuddyiconSrc: function(src){
		var map = Flickr.regexMaps.buddyiconSrc(src);			
		return (map.nsid) ? map.nsid : null;
	},
			  
	// Create a Person object by supplying the photopage url
	fromPhotopageUrl: function(url){
		var map = this.regexMap(url);
		return (map.userUrl) ? new this(map.userUrl) : false;
	},
	
	// Create a Person object by supplying their buddyicon image src
	fromBuddyiconSrc: function(src){
		var nsid = Person.getNsidFromBuddyiconSrc(src);
		return (nsid) ? new this(nsid) : false;
	}
});




/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


// PHOTO LICENCE OBJECT
function License(map){ // 'url', 'name', 'type', 'version', 'jurisdiction', 'language', title, icons (title is in local lang)
	extend(this, map);
	if (this.name === 'allrightsreserved'){
		this.url = 'http://www.iusmentis.com/copyright/allrightsreserved/';
	}
	if (typeof this.icons === 'undefined'){
		this.icons = [];
	}
	for (i=0; i<this.icons.length; i++){ // icons is array of either image elements, or objects representing them
		if (isHTMLElement(this.icons[i], 'img')){
			this.icons[i] = {
				src:this.icons[i].getAttribute('src'),
				title:this.icons[i].getAttribute('title'),
				className:this.icons[i].getAttribute('class')
			}
		}
	}
}


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


// PHOTO LICENCE PROTOTYPE
License.prototype = {
	getIcon: function(){
		var icon, iconGroup, i;
		iconGroup = extend(cE('span'), {className:'license_icons'});
		for (i=0; i<this.icons.length; i++){
			icon = iconGroup.appendChild(extend(cE('img'), this.icons[i]));
			if (!icon.alt){
				icon.alt =  (this.icons[i].title) ? this.icons[i].title : this.title;
			}
		}
		return iconGroup;
	},

	// Get an HTML anchor element to display the license icon and a link for further info
	getAnchor: function(){
		var a = cE('a');
		a.href = this.url;
		a.appendChild(this.getIcon());
		a.appendChild(cTN(' ' + this.title));
		a.title = this.title;
		return a;
	}
};



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



// SIZE OBJECT
function Size(map){
	extend(this, map);
}


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



// STATIC FUNCTIONS ON SIZE OBJECT
extend(Size, {
	suffixToId: function(suffix){
		var size;		
		size = toArray(Photo.prototype.sizes).getBy('suffix', suffix);
		return (size) ? size.id : false;
	},
	
	idToSuffix: function(id){		
		var size;
		size = Photo.prototype.sizes[id];
		return (size) ? size.suffix : false;
	}
});



// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


// SIZE OBJECT PROTOTYPE
Size.prototype = {
	id:null, // e.g. 'l'
	label:null, // e.g. 'Large'
	suffix:null, // e.g. '_b'
	max:null, // e.g. 1024
	width:null,
	height:null,
	media:null,
	
	// Get file extension for this size's image. All sizes 'jpg', other than original size, which varies
	getExtension: function(){
		var defaultExtension = 'jpg';
		return (this.id !== 'o') ? defaultExtension : this.photo.originalformat;
	},
	
	// Check if this size exists for this photo
	exists: function(){
		// All sizes except large always exist
		if (this.id !== 'l'){
			return true;
		}
		
		// LARGE SIZES
		// Get original size
		var o = this.photo.sizes.o;
		
		// If original has incomplete dimensions, check if large size has dimensions
		if (!o.width || !o.height){
			if (this.width && this.height){
				return true;
			}
			// If original size is not available (non-Pro user, user who's disallowed API access and downloads) then the large size will either have known dimensions or will not exist			
			else if (o.isAccessible() === false){ // TODO: Revisit this logic
				return false;
			}
			else {
				return true;
			}
		}
		
		// Check original size dimensions
		return (o.width > 1280 || o.height > 1280);
	},
	
	// Check if this size has a known image src
	isKnownSrc: function(){
		// All sizes except large always exist. Original may be unknowable.
		if (this.id === 'o' && !this.getSecret()){
			return false;
		}
		return (this.exists() && this.getExtension()) ? true : false;
	},
	
	// Check if this size has known dimensions
	isKnownSize: function(){
		return (this.width && this.height) ? true : false;
	},
	
	// Check if this size has a known src and dimensions
	isComplete: function(){
		// Check if original size rotation is known
		var knownRotation = (typeof this.rotated !== 'undefined') ? (this.rotated !== null) : true;
		return (this.isKnownSrc() && this.isKnownSize() && knownRotation) ? true : false;
	},
	
	// Is this size available and accessible at this time? That is, does it exist, are all the dimensions and properties known and is the viewing user permitted to access it.
	// Returns null if not yet sure. Otherwise true or false.
	isAccessible: function(){	
		if (this.id === 'o' && this.photo.sizes.candownload === null){
			return null; // Don't yet know if Original size can be retrieved. Not yet confirmed via remote page or API (see getAllSizes)
		}
		// If not original size, or if original && user default icense is Creative Commons, or user can download, then see if size is complete
		return this.isComplete();
	},
	
	// Get an array of the image dimensions
	getDimensions: function(){
		return [this.width, this.height];
	},
	
	// Set the dimensions for this size
	// Optional args: width & height. If not supplied, size is calculated from larger sizes
	setDimensions: function(){
		// If width and height are supplied...
		if (arguments.length > 0){
			this.width = Number(arguments[0]);
			if (arguments.length > 1){
				this.height = Number(arguments[1]);
			}
			return this.getDimensions();
		}
		
		// If width & height not supplied...
		// Get the largest complete size, as a comparison
		var largest = this.photo.sizes.getLargestKnownSize();
		if (!largest){
			return false;
		}
		
		// If the largest size is this size, then return
		else if (largest.max == this.max){
			return false;
		}
		
		// Check if the original was rotated by the owner
		if (largest.id == 'o' && this.photo.sizes.o.rotated){
			// Copy object so that we can temporarily change its properties
			largest = extend({}, largest);
			var temp = largest.width;
			largest.width = largest.height;
			largest.height = temp;
		}
		
		// If the largest size is smaller than this size
		if (largest.max < this.max){
			// If the largest size is smaller than its max dimensions, then this has the same size
			if (largest.width < largest.max && largest.height < largest.max){
				return this.setDimensions(largest.width, largest.height);
			}
				
			else {
				return false;
			}
		}
		
		// If this is the large size, then special rules apply
		else if (largest.id == 'o' && this.id == 'l' && largest.width <= 1280 && largest.height <= 1280){
			return false;
		}
		
		// -- Calculate dimensions for this size
		
		// If the comparison size dimensions are no bigger than this size's maximum
		if (largest.width <= this.max && largest.height <= this.max){
			return this.setDimensions(largest.width, largest.height);
		}
		
		// Else
		var longerSide = Math.max(largest.width, largest.height);
		var newWidth = Math.round(this.max * (largest.width/longerSide));
		var newHeight = Math.round(this.max * (largest.height/longerSide));
		return this.setDimensions(newWidth, newHeight);
	},
	
	
	getSecret: function(){
		return (this.id !== 'o') ? this.photo.secret : this.photo.originalsecret;
	},
	
	
	// Get the image src for this size
	// Optional arg: forDownload [boolean], default: false (returns src for the image download version)
	getSrc: function(){
		var suffix;
	
		// If essential info is not known, then return null
		if (!this.getExtension()){
			return null;
		}
		
		// Check for Download flag
		if (arguments.length > 0){
			suffix = (arguments[0]) ? this.suffix + '_d' : this.suffix;
		}
		else {
			suffix = this.suffix;
		}
		
		return 'http://farm' + this.photo.farm + '.static.flickr.com/' + this.photo.server + '/' + this.photo.id + '_' + this.getSecret() + suffix + '.' + this.getExtension();
	},
	
	
	// Get an image element for this size
	getImg: function(){
		// Get the image src
		var src = this.getSrc();
		if (!src){
			return null;
		}
		
		// Create a new image element and set attributes
		var img = extend(cE('img'), {
			src: src,
			alt: this.photo.getTitle(),
			title: this.photo.getTitle()
		});
		if (this.width){
			img.width = this.width;
		}
		if (this.height){
			img.height = this.height;
		}
		return img;
	},
	
	
	// Get HTML tag for the image element
	getImgHTML: function(){
		// Get the image src
		var src = this.getSrc();
		if (!src){
			return null;
		}
		
		// Get attributes for tag
		var width = (this.width) ? ' width="' + this.width + '"' : '';
		var height = (this.height) ? ' height="' + this.height + '"' : '';
		var title = ' title="' + this.photo.getTitle() + '"';
		var alt = ' alt="' + this.photo.getTitle() + '"';
		return '<img src="' + src + '"' + title + alt + width + height + ' />';
	},
	
	
	// Get an image element, within an anchor element for this size
	getImgAnchor: function(){
		var href = this.photo.getPhotopageUrl();
		var img = this.getImg();
		if (!href || !img){
			return null;
		}
		
		var a = cE('a');
		a.href = href;
		return a.appendChild(img);
	},
	
	
	// Get HTML tags for image within an anchor
	getImgAnchorHTML: function(){
		var href = this.photo.getPhotopageUrl();
		var imgHTML = this.getImgHTML();
		if (!href || !imgHTML){
			return null;
		}
		return '<a href="' + href + '" title="' + this.photo.getTitle() +'">' + imgHTML + '</a>';
	},
	
	
	// Get BB Code for image within an anchor
	getImgAnchorBBCode: function(){
		// Get the image src
		var src = this.getSrc();
		var href = this.photo.getPhotopageUrl();
		if (!href || !src){
			return null;
		}
		return '[url=' + href + '][img]' + src + '[/img][/url]';
	},
	
	
	// Get the url for the AllSizes page for this size
	getAllSizesUrl: function(){		
		// If we don't know the owner, then use the generic url
		if (!this.photo.owner){
			return Flickr.getUrl('photo_zoom.gne?id=' + this.photo.id + '&size=' + this.id);
		}		
		return this.photo.getPhotopageUrl() + 'sizes/' + this.id + '/';
	}
};



// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



// Add Sizes object to Photo prototype
Photo.prototype.sizes = {
	// Specific Size Objects as properties of the Sizes Object
	sq:new Size({id:'sq',label:'Square', suffix:'_s', max:75, width:75, height:75, setDimensions:function(){return true;}}),
	t: new Size({id:'t', label:'Thumbnail', suffix:'_t', max:100}),
	s: new Size({id:'s', label:'Small', suffix:'_m', max:240}),
	m: new Size({id:'m', label:'Medium', suffix:'', max:500}),
	l: new Size({id:'l', label:'Large', suffix:'_b', max:1024}),
	o: new Size({id:'o', label:'Original', suffix:'_o', max:Infinity, rotated:null}),
	// Original sizes have unlimited length. Their file extension may be png, gif or jpg, & they may be rotated
	
	// Permissions
	candownload:null,
	
	// Return all Size objects
	get: function(){
		return toArray(this);
	},
	
	// Return array of srcs known to exist
	getKnownSrcs: function(){
		return this.get().getBy('isKnownSrc', true, true);
	},
	
	// Return array of known sizes
	getKnownSizes: function(){
		return this.get().getBy('isKnownSize', true, true);
	},
	
	// Return array of sizes that are complete
	getComplete: function(){
		return this.get().getBy('isComplete', true, true);
	},
	
	getLargestKnownSrc: function(){
		var knownSrcs = this.getKnownSrcs();
		return (knownSrcs) ? knownSrcs[knownSrcs.length-1] : null;
	},
	
	getLargestKnownSize: function(){
		var knownSizes = this.getKnownSizes();
		return (knownSizes) ? knownSizes[knownSizes.length-1] : null;
	},
	
	getLargestComplete: function(){
		var complete = this.getComplete();
		return (complete) ? complete[complete.length-1] : null;
	},
	
	getLargestAccessible: function(){
		var complete, i;
		complete = this.getComplete();
		
		for (i=complete.length-1; i>=0; i--){
			if (complete[i].isAccessible()){
				return complete[i];
			}
		}
		return null;
	},
	
	// SetDimensions for each size smaller than the largest known sizes
	setDimensions: function(){
		var sizes = toArray(this);
		for (var i=0; i<sizes.length; i++){
			sizes[i].setDimensions();
		}
	},
	
	// Get size and extension of original size
	getAllSizes: function(callback){
		var that, thisFunc;
		
		// Make objects available for innerCallback
		that = this;
		thisFunc = arguments.callee;
		
		if (typeof thisFunc.status === 'undefined'){
			extend(thisFunc, {
				status:'init',
				callbacks:[],
				start:now(),
				stop:null,
				method:null
			});
		}
		
		// If we've already attempted to get all the sizes, then return it
		if (thisFunc.status === 'complete'){
			return callback(this);
		}
		// If we've started to get the Original size, but not yet complete, then add to callback array and wait longer
		else {
			thisFunc.callbacks.push(callback);
		}
		
		if (thisFunc.status !== 'init'){
			return;
		}
		else {
			thisFunc.status = 'processing';
			debug('getAllSizes: ' + thisFunc.status);
		}
		
		
		// Function to call all callbacks, upon response
		function callbackAll(sizes){
			var size, isLandscapeM, isLandscapeO, callback;
			
			function processCallbacks(payload){
				while (thisFunc.callbacks.length > 0){
					callback = thisFunc.callbacks.shift();
					callback(payload); 
				}
			}
			
			if (!sizes || !sizes.size){
				debug('getAllSizes: No sizes object retrieved.');				
				that.candownload = false;
				return processCallbacks(that);
			}
			size = sizes.size[sizes.size.length-1]; // Get largest found size (only size expected)
			
			// This is the original size
			if (size.id === 'o'){
				that.o.photo.originalsecret = size.originalsecret;
				that.o.photo.originalformat = size.originalformat;
				
				// Check if user rotated the original photo
				if (that.o.photo.media === 'video'){ // Can't rotate a video. TODO: This is unnecessary is that.m.isKnownSize() can be guaranteed - see next TODO note
					size.rotated = false;
				}
				else if (that.m.isKnownSize()){ // TODO: Medium size dimensions may not be known before Ajax returns, but may be returned bY Ajax, so it is worth checking medium size returned by Ajax for dimensions
					// Determine if medium and original are landscape aspect
					isLandscapeM = ((that.m.width / that.m.height) >= 1);
					isLandscapeO = ((size.width / size.height) >= 1);
					
					// If they are not the same aspect, then o has been rotated
					size.rotated = (isLandscapeM !== isLandscapeO);
				}
			}
			
			// Extend Photo Size object with new-found dimension; set dimensions and status
			that.candownload = (sizes.candownload) ? true : false;
			extend(that[size.id], size);
			that.setDimensions();
			thisFunc.status = 'complete';
			thisFunc.stop = now();
			debug('getAllSizes: ' + thisFunc.status + ' in ' + (thisFunc.stop - thisFunc.start) + 'ms');	
			processCallbacks(that);
		}
		
		// For pre-existing buttons, try the AllSizes page over HTTP
		if (AllSizes.buttonExistedBeforeGM || (that.o.photo.media === 'video' && that.o.photo.privacy.id !== 'public')){
			thisFunc.method = 'allSizesPage';
			this.getLargestViaAllSizesPage(callbackAll);
		}
		
		else if (that.o.photo.privacy.id !== 'public'){ // TODO: Remove when API auth implemented
			debug('!!!');
			callbackAll(false);
		}
		
		// For created buttons, try the API
		else {
			thisFunc.method = 'api';
			this.getLargestViaApi(callbackAll);
		}
	},		
	
			  
	getLargestViaApi: function(callback){
		var onload;
	
		onload = function(rsp){
			var largest, map, size, sizes, photo;
			if (!rsp){
				debug('getLargestViaApi: No response from API', rsp);
				return callback(false);
			}
			debug(['getLargestViaApi: API returned:', rsp]);
			photo = Page.getCurrentPage().getPhoto();
			largest = (photo.media === 'photo') ? rsp.sizes.size[rsp.sizes.size.length-1]: rsp.sizes.size[rsp.sizes.size.length-2];
			
			map = Flickr.regexMaps.photoSrc(largest.source);
			if (!map){
				debug('getLargestViaApi: Could not get regexMap');
				return callback(false);
			}
			size = {
				id: Size.suffixToId(map.suffix),
				width: Number(largest.width),
				height: Number(largest.height)
			};			
			if (size.id === 'o'){
				size.originalsecret = map.secret;
				size.originalformat = map.extension;
			}
			sizes = {
				candownload:rsp.sizes.candownload,
				size:[size]
			};
			debug('getLargestViaApi:', sizes);
			callback(sizes);
		};
		Api.callMethod('photos.getSizes', {photo_id:this.o.photo.id}, onload);
	},		
	
		
	getLargestViaAllSizesPage: function(callback){
		var url, onload;
		url = this.o.getAllSizesUrl();
		
		onload = function(rsp) {
			var size, sizes, html, spans, i, dims, images, map;
			if (!rsp){
				debug('getLargestViaAllSizesPage: Could not get remote page');
				return callback(false);
			}
			
			size = {};
			html = cE('code');
			// replace image src values, to prevent download
			html.innerHTML = rsp.replace(/src=(["'])http/gm, 'src=$1xhttp');
			
			spans = html.getElementsByTagName('span');
			for (i=spans.length-1; i>=0; i--){
				if (spans[i].className == 'Dimensions'){
					dims = spans[i].firstChild.nodeValue.slice(1,-1).split(' x ');
					size.width = Number(dims[0]);
					size.height = Number(dims[1]);
					break;
				}
			}
			
			images = html.getElementsByTagName('img');
			for (i=0; i < images.length; i++){
				map = Flickr.regexMaps.photoSrc(images[i].src);
				
				/*
				If the size is 'o' then this is the original. Either the photo owner has a 'pro' account and this is a large-size original, or the owner has a non-pro account and the original is smaller than the large size image, so we are actually looking at the original image (even if the label for the image does not say 'original').
				If the size is not 'o', then the owner is non-pro and the original size is not displayed. The page will have redirected to the medium size image, but the large size will be listed on the page and the large size image is the one that we have the dimensions for.
				*/
				
				if (map){		
					size.id = Size.suffixToId(map.suffix) === 'o' ? 'o' : 'l';
					
					// Get originalsecret
					if (size.id === 'o'){
						size.originalsecret = map.secret;
						size.originalformat = map.extension;
					}
					sizes = {
						candownload:1,
						size:[size]
					}
					debug('getLargestViaAllSizesPage:', sizes);
					return callback(sizes);
				}
			}
			debug('getLargestViaAllSizesPage: Could not get sizes from AllSizes page');			
			return callback(false);
		};
		
		ajaxRequest(url, onload);
	},		
	
	
	popUp: function(){
		if (!arguments.callee.selectedSize){
			arguments.callee.selectedSize = Settings.getValue('defaultSize');
		}
		return this[targuments.callee.selectedSize].popUp();
	}
};


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



// Add photo property to each size on initialisation of a photo object
Photo.prototype.init.register(function(){
	var sizes = this.sizes.get();
	for (var i=0; i < sizes.length; i++){
		sizes[i].photo = this;
	}
});


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



// SIZE PROTOTYPE
extend(Size.prototype, {
	getCode: function(){
		var codeType = GM_getValue('codeType');
		return (codeType == 'bbCode') ? this.getImgAnchorBBCode() : this.getImgAnchorHTML();
	},
	
	download: function(){
		var size = this;
		function callback(sizes){
			if (size.isAccessible() === false){
				size = size.photo.sizes.getLargestAccessible();
			}
			AllSizes.keylogger.lock(); // Clear keylogger cache and prevent new keypresses until "download image" dialog is open
			this.location.href = size.getSrc(true);
		}
		this.photo.sizes.getAllSizes(callback);
	},
	
	
	copyToClipboard: function(){
		var size = this;		
		function callback(sizes){
			if (size.isAccessible() === false){
				size = size.photo.sizes.getLargestAccessible();
			}
			if (!copyToClipboard(size.getCode())){
				AllSizes.errorCopyToClipboard();
			}
		}
		this.photo.sizes.getAllSizes(callback);
	},
	
	
	view: function(){
		var size = this;
		function callback(sizes){
			if (size.isAccessible() === false){
				size = size.photo.sizes.getLargestAccessible();
			}
			window.location.href = size.getSrc();
		}
		this.photo.sizes.getAllSizes(callback);
	},
	
			  
	popUp: function(){ // TODO: Move all this stuff to jQuery + good old XHTML
		// Check if popUp was already created
		var popUp = PopUp.getById('Code');
		
		// Update the selected size property
		var sizesObj = this.photo.sizes;
		sizesObj.popUp.selectedSize = this.id;
		sizeId = sizesObj[sizesObj.popUp.selectedSize].id;
		
		// If popUp not yet created
		if (!popUp){
			popUp = new PopUp('Code');
			
			
			// Shortcut icons
			var icons = popUp.main.appendChild(cE('span'));
			icons.className = 'popUpIcons';
			
			
			// Download button
			var download = icons.appendChild(cE('img'));
			download.src = assets.save;
			download.alt = 'Download Image';
			download.title = 'Download Image';
			download.addEventListener('click', function(){
				sizesObj[sizesObj.popUp.selectedSize].download();
				dfApi.log({action:'download', size:sizeId});
			}, false);
							
			
			// Copy button
			var copy = icons.appendChild(cE('img'));
			copy.src = assets.copy;
			copy.alt = 'Copy Code to Clipboard';
			copy.title = 'Copy Code to Clipboard';
			copy.addEventListener('click', function(){
				sizesObj[sizesObj.popUp.selectedSize].copyToClipboard();
				dfApi.log({action:'copyToClipboard', size:sizeId});
			}, false);
			
			
			// View button
			var view = icons.appendChild(cE('a'));
			var img = view.appendChild(cE('img'));
			img.src = assets.view;
			img.alt = 'View Image';
			img.title = 'View Image';
			view.addEventListener('mouseover', function(e){
				e.currentTarget.href = sizesObj[sizesObj.popUp.selectedSize].getSrc();
			}, false);
			view.addEventListener('click', function(){
				dfApi.log({action:'view', size:sizeId});
			}, false);
			
			
			// BBCode/HTML button
			var code = icons.appendChild(cE('img'));
			var codeType = GM_getValue('codeType');
				
			if (codeType == 'bbCode'){
				code.src = assets.html;
				code.alt = 'to HTML';
			}
				
			else {
				code.src = assets.bbCode;
				code.alt = 'to BB Code';
			}
				
			code.title = code.alt;
			code.addEventListener('click', function(e){
				// Change alt and title of button
				if (e.currentTarget.alt == 'to BB Code'){
					e.currentTarget.alt = 'to HTML';
					e.currentTarget.src = assets.html;
					GM_setValue('codeType', 'bbCode');
				}
				else {
					e.currentTarget.alt = 'to BB Code';
					e.currentTarget.src = assets.bbCode;
					GM_setValue('codeType', 'html');
				}
				e.currentTarget.title = e.currentTarget.alt;
				
				// Update textarea
				popUp.updateTextarea();
				dfApi.log({action:'code', codeType:GM_getValue('codeType'), size:sizeId});
			}, false);
			
			
			// AllSizes button
			var allSizes = cE('img');
			allSizes.alt = 'AllSizes page not available for this ';
			allSizes.alt += this.photo.media;
			allSizes.className = 'choiceDisabled';
			allSizes.src = assets.allsizesIcon;
			allSizes.id = 'popUpAllsizesicon';
			allSizes.title = allSizes.alt;
			
			popUp.updateAllsizesIcon = function(){
				// sizesObj.candownload is non-null only after getAllSizes returns result - either from remote page or via API
				if (sizesObj.candownload || (typeof sizesObj.candownload === 'undefined' && AllSizes.buttonExistedBeforeGM)){					
					var allSizes = document.getElementById('popUpAllsizesicon');
					var allSizesAnchor = cE('a');
					allSizes.parentNode.replaceChild(allSizesAnchor, allSizes);
					allSizesAnchor.appendChild(allSizes);
					allSizes.alt = 'AllSizes Page';
					allSizes.title = allSizes.alt;
					allSizes.className = '';
					
					allSizesAnchor.addEventListener('mouseover', function(e){
						e.currentTarget.href = sizesObj[sizesObj.popUp.selectedSize].getAllSizesUrl();
					}, false);
					allSizesAnchor.addEventListener('click', function(e){
						dfApi.log({action:'allsizes', size:sizeId});
					}, false);
				}
			};
			
			icons.appendChild(allSizes);
			popUp.updateAllsizesIcon();
			
			
			
			// Size Menu
			var sizeMenu = popUp.main.appendChild(cE('p'));
			sizeMenu.className = 'popUpMenu';
			
			// Function to open popUp for clicked link
			var onclickSizeMenuLink = function(e){
				var id = e.currentTarget.getAttribute('sizeId');
				sizesObj[id].popUp();
			};
			
			// Go through each size, adding to the menu
			var sizes = this.photo.sizes.get();
			for (var i=0; i<sizes.length; i++){
				if (sizes[i].exists() === false){
					continue;
				}
				var a = sizeMenu.appendChild(cE('a', sizes[i].label));
				a.title = sizes[i].label + ' size';
				a.setAttribute('sizeId' , sizes[i].id);
				a.className = (sizes[i].id == this.id) ? 'navCurrent' : '';
				
				// Onclick handler for sizesMenu
				a.addEventListener('click', onclickSizeMenuLink, false);
				
				if (i < sizes.length -1){
					var divider = sizeMenu.appendChild(cE('span', ' | '));
					divider.className = 'divider';
				}
			}
			popUp.sizeMenu = sizeMenu;
			
			
			// Add textarea
			popUp.ta = popUp.addTextarea();			
			popUp.ta.addEventListener('click', function(){		
				dfApi.log({action:'codeTextarea', size:sizeId});
			}, false);
			
			// Function to update the textarea
			popUp.updateTextarea = function(){
				var notYetMsg = "Hold on, I'm comin'...";
				var size = sizesObj[sizesObj.popUp.selectedSize];
				
				if (!size.isComplete()){
					this.ta.value = notYetMsg;
				}
				
				else {
					this.ta.value = size.getCode();
				}
			};
			
			// Add CSS styles to anchor links in sizesMenu
			popUp.updateSizeMenu = function(){
				var a = this.sizeMenu.getElementsByTagName('a');
				for (var i=0; i<a.length; i++){
					a[i].className = (a[i].getAttribute('sizeId') == sizesObj.popUp.selectedSize) ? 'navCurrent' : '';
				}
			}
			
			
			// Add license
			popUp.main.appendChild(cE('h3', 'License'));
			var license = popUp.main.appendChild(cE('p'));
			license.appendChild(this.photo.license.getAnchor());
			
			
			// Permission		
			popUp.main.appendChild(cE('h3', 'Permission'));
			
			// Sendmail Link
			var sendmail = popUp.main.appendChild(cE('p', "Contact the owner if you don't have permission to use this photo:"));
			var ul = sendmail.appendChild(cE('ul'));
			
			var sendmailLink = ul.appendChild(cE('li')).appendChild(cE('a', 'Send a FlickrMail'));
			sendmailLink.href = this.photo.owner.getSendmailUrl();
			sendmailLink.addEventListener('click', function(){		
				dfApi.log({action:'sendmailLink'});
			}, false);
			
			// Comment Link - first check if comments are enabled for this photo
			var commentDiv = document.getElementById('DiscussPhoto');
			if (commentDiv.getElementsByTagName('textarea').length > 0){
				var commentLink = ul.appendChild(cE('li')).appendChild(cE('a', 'Add a Comment'));
				commentLink.href = '#DiscussPhoto';
				commentLink.addEventListener('click', function(e){
					popUp.close();
					window.setTimeout(function(){
						var commentDiv = document.getElementById('DiscussPhoto');
						var ta = commentDiv.getElementsByTagName('textarea')[0];
						// Focus the textarea element
						ta.focus();
						// Move cursor to start (other GM scripts may have added text)
						if (ta.selectionStart){
							ta.selectionStart = 0;
							ta.selectionEnd = 0;
						}
					}, 5);
					dfApi.log({action:'commentLink'});
				}, false);
			}
			
			// Get original size
			if (!sizesObj.o.isComplete()){
				// If successful, the original size object is returned
				function callback(sizesObj){
					var i, sizes, size;
					
					function removeFromMenu(sizeId){
						for (var i=0; i<sizeMenu.childNodes.length; i++){
							var a = sizeMenu.childNodes[i];
							if (a.getAttribute('sizeId') === sizeId){
								if (a.nextSibling){
									sizeMenu.removeChild(a.nextSibling);
								}
								else {
									sizeMenu.removeChild(a.previousSibling);
								}
								sizeMenu.removeChild(a);
								break;
							}
						}
					}
					
					// Remove sizes from menu that aren't available // TODO: Construct menu from avail and add additional items later, rather than removing later
					sizes = sizesObj.get();
					for (i=0; i<sizes.length; i++){
						size = sizes[i];
						if (!size.isAccessible()){
							removeFromMenu(size.id);
					
							// If size is selected, then move to largest existing
							if (sizesObj.popUp.selectedSize === size.id){
								sizesObj.popUp.selectedSize = sizesObj.getLargestAccessible().id;
							}
						}
					}
					
					// Refresh popUp
					popUp.updateTextarea();
					popUp.updateSizeMenu();
					if (sizesObj.candownload){
						popUp.updateAllsizesIcon();
					}
				}
				sizesObj.getAllSizes(callback);
			}
		}
		
		else {
			// If size is selected, then move to largest existing
			if (!sizesObj[sizesObj.popUp.selectedSize].isComplete()){
				sizesObj.popUp.selectedSize = sizesObj.getLargestAccessible().id;
			}
		}
		
		// Update the textarea
		popUp.updateTextarea();
		popUp.updateSizeMenu();
		
		// Open popUp and return
		return popUp.open();
	}
});




/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */





// PopUp OBJECT

// Usage: var p = new PopUp(); p.open();
// Optional arg: node to insert popUp before.
function PopUp(){
	var popUp = extend(cE('div'), this, true);
	
	// Get popUp id
	if (arguments.length > 0){
		popUp.id = 'PopUp_' + arguments[0];
	}
	
	// Initialise popUp
	popUp.init();
	return popUp;
}


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


PopUp.prototype = {
	init: function(insertNode){
		var that = this;
		this.className = 'PopUp';
		
		// Get node to insert into document
		var defaultInsertNode = getElementsByCssClass('div', 'photoImgDiv')[0];
		var insertNode = (arguments.length > 1) ? arguments[1] : defaultInsertNode;
		
		// Close Button
		var closeBtn = this.appendChild(cE('a'));
		closeBtn.title = 'Close';
		closeBtn.className = 'closeBtn';
		var closeBtnImg = closeBtn.appendChild(cE('img'));
		closeBtnImg.src = assets.closeWindow;
		closeBtnImg.alt = 'Close';
		closeBtn.addEventListener('click', function(){
			debug('closeBtn: Closing pop-up');
			that.close();
		}, true);
				
		// H1 Header
		var headerText = UserScript.header.replace(/^(.[^A-Z]*)([A-Z].*)$/, '$1~$2').split("~");
		if (headerText.length > 0) {
			this.header = this.appendChild(cE('h1'));
			var a = this.header.appendChild(cE('a'));
			a.href = UserScript.metaUrl();
			a.title = UserScript.title + ' discussion thread in the FlickrHacks group';
			var strong = a.appendChild(cE('strong'));
			var pinkText = strong.appendChild(cE('span', headerText[0]));
			pinkText.className = 'FLICKR_PINK';
		}
		if (headerText.length > 1) {
			var blueText = strong.appendChild(cE('span', headerText[1]));
			blueText.className = 'FLICKR_BLUE';
		}
		
		// H2 Title
		if (typeof this.id !== 'undefined'){
			this.appendChild(cE('h2', this.id.slice('PopUp_'.length)));
		}
			
		// Main div
		this.main = this.appendChild(cE('div'));
		this.main.className = 'popUpMain';
		
		// Menu
		this.menu = this.appendChild(PopUp.getMenu(this.id.slice('PopUp_'.length)));
		
		// Add this popUp to PopUp inventory
		PopUp.inventory.push(this);
		
		// Insert PopUp styles into stylesheet
		PopUp.insertStyles();
		
		// Insert popUp div into document
		insertNode.parentNode.insertBefore(this, insertNode);
	}, // end init
		
	// Create Textarea
	addTextarea: function(){
		ta = this.main.appendChild(cE('textarea'));
		ta.value = (arguments.length > 0) ? arguments[0] : '';
		ta.wrap = 'virtual';
		ta.addEventListener('focus', function(){ this.select(); }, true);
		return ta;
	},
	
	open: function(){
		var page = Page.getCurrentPage();
		// Close other popUps
		for (var i=0; i<PopUp.inventory.length; i++){
			PopUp.inventory[i].close();
		}		
		this.style.display = 'block';
		if (page.getPhoto().media === 'video' && page.getPhotoImg()){
			page.getPhotoImg().style.display = 'block';
			page.getVideo().style.visibility = 'hidden';
		}
		PopUp.isOpen = true;
		
		return this;
	},
	
	close: function(){
		var page = Page.getCurrentPage();
		this.style.display = 'none';
		if (page.getPhoto().media === 'video' && page.getPhotoImg()){
			page.getPhotoImg().style.display = 'none';
			page.getVideo().style.visibility = 'visible';
		}
		PopUp.isOpen = false;
		return this;
	},
	
	remove: function(){
		this.parentNode.removeChild(this);
	}
};



// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



// Static Methods on PopUp Object
extend(PopUp, {
	inventory: [],
	
	getById: function(id){
		return this.inventory.getById('PopUp_' + id);
	},
			  
	menu: [],
	
	addToMenu: function(){
		for (var i=0; i<arguments.length; i++){
			this.menu.push(arguments[i]);
		}
	},
	
	getMenu: function(id){
		var that = PopUp;
		var menuDiv = cE('div');
		menuDiv.className = 'popUpMenu popUpFooter';
		
		for (var i=0; i<that.menu.length; i++){
			// Create anchor link
			var a = menuDiv.appendChild(cE('a', that.menu[i].id));
			a.title = that.menu[i].id;
			
			// Add CSS class to anchor link
			a.className = (that.menu[i].id == id) ? 'navCurrent' : '';
			
			// add onclick listener to anchor
			var openPopUp = function(e){
				var id = e.currentTarget.title;
				var popUp = PopUp.getById(id);
				
				if (!popUp){
					popUp = that.menu.getById(id).constructor();
				}					
				popUp.open();
			}
			a.addEventListener('click', openPopUp, false);
			
			// Add divider
			if (i < that.menu.length -1){
				var divider = menuDiv.appendChild(cE('span', ' | '));
				divider.className = 'divider';
			}
		}
		return menuDiv;
	},
			  
	// Insert styles into stylesheet (once per script execution)
	insertStyles: function(){
		// Check if already inserted
		if (typeof arguments.callee.inserted != 'undefined'){
			return;
		}		
		insertStyles(this.styles);
		arguments.callee.inserted = true;
	},
	
	// CSS Styles for PopUp
	styles: [
		// MAIN STYLE
		'.PopUp { position:absolute; background-color:#edf3f7; width:470px; padding:1em 15px 1.4em; z-index:99999; display:none; font-size:0.9em; border-left:1px solid #e0e7f0; border-top:1px solid #e0e7f0; border-right:1px solid #d3dae3; border-bottom:1px solid #d3dae3; color:#666; }',
		
		
		// MAIN ELEMENTS
		'.PopUp h1, .PopUp h2, .PopUp h3 { font-weight:bold; margin:0; color:#b0b7c0; }',
		
		'.PopUp h1 { font-size: 1.1em; padding:0; line-height:1.1em; }',
		
		'.PopUp h1 a:hover span { color:white; }',
		
		'.PopUp h2 { font-size:1.5em; padding:1em 0 0; border-top:1px dotted #dce3ec; margin-bottom:0.5em; }',
		
		'.PopUp h3 { font-size:1.1em; padding:1.5em 0 0; }',
		
		'.PopUp p { margin:0.2em 0 0.5em; padding:0; }',
		
		'.PopUp img { vertical-align:bottom; }',
		
		'.PopUp a, .PopUp a:link, .PopUp a:active, .PopUp a:visited { cursor:pointer; color:' + FLICKR_BLUE + '; text-decoration:none; background-color:transparent; }',
		
		'.PopUp a:hover { color:white; background-color:' + FLICKR_BLUE + '; }',
		
		'.PopUp a.navCurrent { color:' + FLICKR_PINK + '; }',
		
		'.PopUp a.navCurrent:hover { color:' + FLICKR_PINK + '; background-color:transparent; cursor:default; }',
		
		'.PopUp a:hover span.license_icons img { background-color:#edf3f7; }',
		
		
		// LISTS
		'.PopUp ul { padding:0; margin:0.4em 0 0.5em 1.6em; list-style-type:circle; }',
		
		'.PopUp li { padding:0; margin:0.1em 0; }',
		
		
		// FORMS
		'.PopUp textarea, .PopUp input, .PopUp select { border-left:1px solid #b3bac3; border-top:1px solid #b3bac3; border-right:1px solid #d0d7e0; border-bottom:1px solid #d0d7e0; }',
		
		'.PopUp textarea { width:100%; height:7em; margin-top:0.5em; padding:5px; background-color:#fff; }',
		
		'.PopUp label { display:block; font-size:0.9em; }',
		
		'.PopUp input[type="text"]:focus, .PopUp textarea:focus, .PopUp select:focus { background-color:#ffffd3; }',
		
		'.PopUp input[type="button"] { margin:1em 0.5em 0 0; }',
		
		'.PopUp option { border-bottom:1px dotted #dce3ec; }',
		
		'.PopUp form p { clear:both; margin-top:0.8em; }',
		
		'.PopUp form div.settingsGroup { clear:both; margin-top:1.5em; }',
		
		'.PopUp form p.formButtons { padding-left:12em; }',
		
		'.PopUp form div.settingsGroup p, .PopUp form div.settingsGroup h5, .PopUp form div.settingsGroup ul { clear:none; padding:0; margin:0 1em 0.6em 12em; }',
		
		'.PopUp form div.settingsGroup h4 { clear:none; padding:0; margin:0 0 0.6em 11em; }',
		
		'.PopUp form div.settingsGroup ul { padding-left:3.5em; }',
		
		'.PopUp form div.settingsGroup p.miniGroup { float:left; }',
		
		'.PopUp form div.settingsGroup h3 + p.miniGroup { margin-left:0; }',
		
		'.PopUp form div.settingsGroup h3 { width:11em; text-align:right; padding:0; margin:0 1em 0 0; float:left; }',
		
		
		// TABLES
		'.PopUp table { border:none; }',
		
		'.PopUp td { color:#666; padding-right:0.8em; border:none; }',
		
		
		//	CLASS SELECTORS
		'.PopUp .FLICKR_PINK { color:' + FLICKR_PINK + '; }',
		
		'.PopUp .FLICKR_BLUE { color:' + FLICKR_BLUE + '; }',
		
		'.PopUp .indented { margin-left:2em; }',
		
		'.PopUp .closeBtn { float:right; }',
		
		'.PopUp .closeBtn img { margin:0; padding:0; width:13px; height:13px; border:none; background-color:#edf3f7; }',
		
		'.PopUp .closeBtn img:hover { opacity:0.8; }',
		
		'.PopUp .popUpMenu { font-size:0.9em; }',
		
		'.PopUp .popUpMain { min-height:26em; max-height:26em; overflow:auto; text-align:justify; padding-right:15px; margin-right:-15px; }',
		
		'.PopUp .popUpMain.fullLength { max-height:none; }',
		
		'.PopUp .popUpFooter { border-top:1px dotted #dce3ec; padding-top:0.7em; margin-top:2em; }',
		
		'.PopUp .divider { color:#999; font-size:0.9em; }',
			
		
		// ICON BUTTONS
		'.PopUp .popUpIcons { float:right; }',
		
		'.PopUp .popUpIcons a, .PopUp .popUpIcons a:hover, .PopUp .popUpIcons a:active, .PopUp .popUpIcons a:visited { background-color:transparent; }',
		
		'.PopUp .popUpIcons img { cursor:pointer; margin-left:0.5em; opacity:0.7; }',
		
		'.PopUp .popUpIcons img:hover { opacity:1; }',
		
		'.PopUp .popUpIcons img.choiceDisabled, .PopUp .popUpIcons img.choiceDisabled:hover { opacity:0.4; cursor:default; }',
		
		'.PopUp .f-sprite { width:15px; height:15px; }',
		
		
		// OTHER
		'.PopUp .donate { margin-top:2.5em; }',
		
		'.PopUp .donate > div { float:left; margin-right:0.8em; }',
		
		'.PopUp .donate input { border:none; }',
		
		'.PopUp .donate > p { padding-top:0.2em; }',
		
		'#PopUp_About acronym { border:none; }'
	],
});




/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



Page = {
	setDefaultLicense: {
		id: 'setDefaultLicense',
		url: Flickr.getUrl('account/prefs/license/'),
		
		regexMap: new RegexMap(
			/(?:http:\/\/(?:www\.)?flickr\.com)?\/account\/prefs\/license\/?.*/,
			['url']
		),
		
		getUserNsid: function(){
			return Page.photoPage.getUserNsid();
		},
		
		getDefaultLicense: function(){ // optional arg: html - for ajax calls
			var html, radios, radio, defaultLicense;			
			html = (arguments.length) ? arguments[0] : document;
			radios = html.getElementsByTagName('input');
			for (var i=0; i<radios.length; i++){
				if (radios[i].checked){
					radio = radios[i];
					break;
				}
			}
			if (!radio){
				debug('Page.setLicense.getLicense: Could not find input');
				return false;
			}
			defaultLicense = Number(radio.value);
			debug(['Page.setLicense.getLicense:', defaultLicense]);
			
			dfApi.setUser({
				defaultLicense:defaultLicense,
				defaultLicenseChecked:now().toString()
			});
			return defaultLicense;
		},
		
		init: function(){
			var that, submit;
			that = this;
			submit = toArray(document.getElementsByTagName('input')).getBy('type', 'submit');
			if (submit){
				submit.addEventListener('click', function(){
					var defaultLicense, user, cachedResult;
					
					user = dfApi.getUser();
					if (user && typeof user.defaultLicense !== 'undefined'){
						cachedResult = user.defaultLicense;
					}					
					defaultLicense = that.getDefaultLicense();
					if (typeof cachedResult === 'undefined' || cachedResult !== defaultLicense){
						dfApi.log({action:'defaultLicenseChanged', defaultLicense:defaultLicense});
					}
				}, false);
			}
		}	
	},

	allowDownloads: {
		id: 'allowDownloads',
		url: Flickr.getUrl('account/prefs/downloads/'),
		
		regexMap: new RegexMap(
			/(?:http:\/\/(?:www\.)?flickr\.com)?\/account\/prefs\/downloads\/?.*/,
			['url']
		),
		
		getUserNsid: function(){
			return Page.photoPage.getUserNsid();
		},
		
		allowDownloads: function(){ // optional arg: html - for ajax calls
			var html, radios, radio, allowDownloads;			
			html = (arguments.length) ? arguments[0] : document;			
			radios = html.getElementsByTagName('input');
			for (var i=0; i<radios.length; i++){
				if (radios[i].checked){
					radio = radios[i];
					break;
				}
			}
			if (!radio){
				debug('Page.allowDownloads.allowDownloads: Could not find input');
				return false;
			}
			allowDownloads = Number(radio.value);
			debug(['Page.allowDownloads.allowDownloads:', allowDownloads]);
			
			dfApi.setUser({
				allowDownloads:allowDownloads,
				allowDownloadsChecked:now().toString()
			});
			return allowDownloads;
		}, // TODO: Combine with dfApi.allowDownloads
		
		init: function(){
			var that, submit;
			that = this;
			submit = toArray(document.getElementsByTagName('input')).getBy('type', 'submit');
			if (submit){
				submit.addEventListener('click', function(){				
					var allowDownloads, user, cachedResult;
					
					user = dfApi.getUser();
					if (user && typeof user.allowDownloads !== 'undefined'){
						cachedResult = user.allowDownloads;
					}
					allowDownloads = that.allowDownloads();
					if (typeof cachedResult === 'undefined' || cachedResult !== allowDownloads){
						dfApi.log({action:'allowDownloadsChanged', allowDownloads:allowDownloads});
					}
				}, false);
			}
		}	
	},

	photoPage: {
		id: 'photoPage',
		regexMap: Flickr.regexMaps.photoPageUrl,
		cache: {},
		
		getPhotoId: function(){
			return this.regexMap(window.location.href).id;
		},
		
		getPhotoImg: function(){
			var container, photo;
			container = document.getElementById('photoImgDiv' + this.getPhotoId());
			photo = Flickr.findImg('photo', container);
			if (!photo){
				debug('Page.photoPage.getPhotoImg: Could not find photo image');
				return false;
			}
			photo.src = Flickr.regexMaps.photoSrc(photo.src).src;
			return photo;
		},
		
		getTitle: function(){
			var titleDiv, node, i;			
			titleDiv = document.getElementById('title_div' + this.getPhotoId());
			// Find first text node child of title div and return contents
			for (i=0; i<titleDiv.childNodes.length; i++){
				node = titleDiv.childNodes[i];
				if (node.nodeName == '#text'){
					return node.nodeValue;
				}
			}
			return false;
		},
		
		getOwner: function(){
			var map, userUrl, widgets, widget, buddyicon, owner, anchors, i, j;
			map = this.regexMap(window.location.href); // TODO: Won't be possible to do this via Ajax call to Page
			
			// Find widget div that contains owner info
			widgets = getElementsByCssClass('div', 'Widget');
			for (i=0; i<widgets.length; i++){
				widget = widgets[i];
				buddyicon = Flickr.findImg('buddyicon', widget);
				if (!buddyicon){
					continue;
				}
			}
			if (!buddyicon){
				debug('Page.getOwner: Could not get owner from buddyicon');
				return null;
			}
			
			owner = new Person({
				userUrl:map.userUrl,
				nsid:Person.getNsidFromBuddyiconSrc(buddyicon.src)
			});
			
			// Get username
			anchors = widget.getElementsByTagName('a');
			for (j=anchors.length-1; j>=0; j--){
				if (anchors[j].title){ // TODO: VOLATILE: depends on username link being the only one (or the first one) with a title attribute
					owner.username = innerText(anchors[j]);
					break;
				}
			}
			return owner;
		},
		
		getLicense: function(){
			var spans, i, innerSpans, j, k, node, license, license_imgs, l, license_img, cc;
		
			// Find span with class 'license' (only one on original Flickr page, but may be changed by other scripts)
			spans = getElementsByCssClass('span', 'license');
			for (i=0; i<spans.length; i++){
				for (j=0; j<spans[i].childNodes.length; j++){
					switch (spans[i].childNodes[j].nodeName.toLowerCase()){
						// All Rights Reserved
						case 'img':
						return new License({
							name:'allrightsreserved',
							title:innerText(spans[i]),
							icons:[spans[i].childNodes[j]]
						});
						break;
						
						// Creative Commons & No Restrictions
						case 'span':
						span = spans[i].childNodes[j];
						for (k=0; k<span.childNodes.length; k++){
							node = span.childNodes[k];
							switch (node.nodeName.toLowerCase()){
								// Creative Commons
								case 'a':
									license = Flickr.regexMaps.license(node.href);
									if (license){
										extend(license, {
											name: 'creativecommons',
											title: '',
											icons: []
										});
										license_imgs = node.getElementsByTagName('img');
										
										for (l=0; l<license_imgs.length; l++){
											license_img = license_imgs[l];
											license.title += license_img.title;
											if (l < license_imgs.length-1){
												license.title += '-';
											}
											license.icons.push(license_img);
										}
										return new License(license);
									}
								break;
								
								// No Known Copyright Restrictions
								case 'img':
									license = Flickr.regexMaps.license(spans[i].innerHTML);
									if (license){
										extend(license, {
											name: 'no_known_restrictions',
											title: '',
											icons: []
										});
										license_imgs = span.getElementsByTagName('img');
										for (l=0; l<license_imgs.length; l++){
											license_img = license_imgs[l];
											license.title += license_img.title;
											if (l < license_imgs.length-1){
												license.title += '-';
											}
											license.icons.push(license_img);
										}
										return new License(license);
									}
								break;
							}
						}
						break;
					}
				}
			}
			debug("Page.getLicense: Could not find license");
			return null;
		},
		
		getPrivacy: function(){
			var privacyElement, privacyImg, privacy, permissions;			
			privacyElement = getElementsByCssClass('span', 'privacy_info');
			if (privacyElement.length){
				privacyElement = privacyElement[0];
				privacyImg = getElementsByCssClass('img', 'f-sprite', privacyElement);
				if (privacyImg.length){
					privacyImg = privacyImg[0];					
					privacy = Flickr.regexMaps.privacy(privacyImg.className);
					if (privacy){
						privacy.label = trim(innerText(privacyElement).replace(/\(.*\)$/, ''));
						if (privacy.id === 'a_bit_private'){ // TODO: Only gets friends / family distinction in English language
							permissions = {};
							if (privacy.label.indexOf('friends') !== -1){
								permissions.friends = 1;
							}
							if (privacy.label.indexOf('family') !== -1){
								permissions.family = 1;
							}
							if (permissions.friends || permissions.family){
								privacy.permissions = permissions;
							}
						}
					}
					return privacy;
				}
			}
			debug("Page.getPrivacy: Could not find privacy info");
			return null;
		},
		
		getUserNsid: function(){
			var map;
			// Check if user logged in
			if (!getElementsByCssClass('a', 'Pale', document.getElementById('TopBar')).length){
				debug('getUserNsid: User not logged in');
				return null;
			}			
			// Get nsid from search area - VOLATILE: we are getting the first nsid, which is the logged in user
			map = Flickr.regexMaps.nsid(document.getElementById('candy_nav_menu_search').innerHTML);
			return (typeof map.nsid !== 'undefined') ? map.nsid : null;
		},
		
		getLang: function(){
			var langSelector, map;
			langSelector = getElementsByCssClass('p', 'LanguageSelector', document.getElementById('FooterWrapper'))[0];
			return Flickr.regexMaps.langSelectedLink(langSelector.innerHTML);
		},
		
		isVideo: function(){
			return (this.getVideo());
		},
		
		hasEmbedButton: function(){
			return (document.getElementById('photo_gne_button_embed'));
		},
		
		getVideo: function(){
			var embeds = document.getElementById('photoImgDiv' + this.getPhotoId()).getElementsByTagName('embed');
			return (embeds.length) ? embeds[0] : false;			
		},
		
		getPhoto: function(){
			if (!this.cache.photo){
				var img, photo, a, userNsid;
				img = this.getPhotoImg();
				if (img){
					photo = Photo.fromImg(img);
				}
				else if (this.isVideo() && unsafeWindow.page_p.video_thumb_src){
					debug('Page.photoPage.getPhoto: Could not find photo as image. Using global vars.');
					photo = Photo.fromSrc(Flickr.regexMaps.photoSrc(unsafeWindow.page_p.video_thumb_src).src);
					photo.sizes.m.setDimensions(this.getVideo().width, this.getVideo().height);
					photo.sizes.setDimensions();
				}
				if (!photo){
					debug('Page.photoPage.getPhoto: Could not create photo');
					return false;
				}
				photo.title = this.getTitle();
				photo.owner = this.getOwner();
				photo.license = this.getLicense();
				photo.privacy = this.getPrivacy();
				photo.media = (this.isVideo()) ? 'video' : 'photo';
				
				// Check if photo is owned by viewing user
				userNsid = this.getUserNsid();
				if (userNsid && photo.owner.nsid){
					photo.isUser = (userNsid === photo.owner.nsid) ? true : false;
				}
				else {
					photo.isUser = null;
				}
				this.cache.photo = photo;
				debug('Page.photoPage.getPhoto', jsonDecode(jsonEncode(photo)));
				debug(jsonEncode(photo));
			}
			return this.cache.photo;
		},
		
		init: function(){
			var keyloggerHandler;
			
			// Track keydown & keyup events
			keyloggerHandler = AllSizes.keylogger.handler();
			window.addEventListener("keydown", keyloggerHandler, true);
			window.addEventListener("keyup", keyloggerHandler, true);
		
			// Add popUps to PopUp menu
			PopUp.addToMenu(
				{
					id:'Code',
					constructor:function(){
						return Page.getCurrentPage().getPhoto().sizes.popUp();
					}
				},
				
				{
					id:'Settings',
					constructor:Settings.popUp
				},
				
				{
					id:'Shortcuts',
					constructor:AllSizes.shortcuts
				},
				
				{
					id:'Documentation',
					constructor:AllSizes.documentation
				},
				
				{
					id:'About',
					constructor:AllSizes.about
				}
			);
			
			// Add or modify AllSizes button
			AllSizes.prepareButton();
			
			// Check for new script updates
			UserScript.checkForUpdates();
		}
	},
	
	
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

	


	// Find the first page object that matches 
	getCurrentPage: function(){
		var pages = toArray(this);
		for (var i=0; i<pages.length; i++){
			if (pages[i].regexMap && pages[i].regexMap(window.location.href)){
				return pages[i];
			}
		}
		return null;
	}
	
}; // end Page object



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



AllSizes = {
	buttonExistedBeforeGM: true,	
	keylogger: new KeyLogger(['', 'c', 'd', 'v', '1'], ['', 'sq', 't', 's', 'm', 'l', 'o']),
	
	prepareButton: function(){
		var that, page, buttonBar, button;
		that = this;
		page = Page.getCurrentPage();
		
		function getSize(){
			var photo, sizeId, size;
			photo = page.getPhoto();
			
			// Determine if any size hotKey was pressed
			sizeId = AllSizes.keylogger.isHotKey().hotKeys;
			
			// If so, serve relevant size. If not, then default size
			size = (sizeId != '') ? photo.sizes[sizeId] : photo.sizes[Settings.getValue('defaultSize')];
			
			// If large size doesn't exist, then show original size
			if (size.id === 'l' && photo.sizes.l.exists() === false){
				size = photo.sizes.o;
			}
			return size;
		}
		
		function getLog(){
			var log, keys;
			keys = AllSizes.keylogger.isHotKey();
			log = {};
			
			if (keys.specialKeys) {
				log.shortcut = keys.specialKeys;
			}
			if (keys.hotKeys) {
				log.sizeKey = keys.hotKeys;
			}
			return log;
		}
		
		function onClick(e){
			var size, keys, popUp, log, alreadyOpen;
			size = getSize();
			
			// Check if shortcut keys are pressed
			switch (AllSizes.keylogger.isHotKey().specialKeys){
				case 'c': // Copy HTML to clipboard
				size.copyToClipboard();
				break;					
				
				case 'd': // Download image
				size.download();				
				break;			
				
				case 'v': // View image
				size.view();
				break;			
				
				case '1': // Toggle debugging
				var debugSetting = GM_getValue('debug');
				if (debugSetting){
					debug('Debugging OFF');
					GM_setValue('debug', false);
				}
				else {
					GM_setValue('debug', true);
					debug('Debugging ON');
				}
				break;				
				
				default: // Show PopUp
				alreadyOpen = PopUp.isOpen;
				popUp = size.popUp();
				if (!alreadyOpen){
					debug('AllSizes.onClick: Opening pop-up');
				}
				else {
					debug('AllSizes.onClick: Closing pop-up');
					popUp.close();
				}
				break;
			}
			dfApi.activated(getLog());
		}
		
		function onDblClick(e){			
			// For buttons added by GM script
			if (e.currentTarget.className == 'photo_gne_button_zoom_added'){
				AllSizes.unavailable();
			}			
			// For buttons that already existed
			else {
				debug('AllSizes.onDblClick: Opening pop-up');
				dfApi.activated(extend(getLog(), {clicks:2}));
				window.location.href = getSize().getAllSizesUrl();
			}
		}
				
		buttonBar = document.getElementById('button_bar');
		
		if (!buttonBar){
			window.setTimeout(function(){
				arguments.callee();
			}, 500);
			return false;
		}
	
		// Find AllSizes button on page
		button = document.getElementById('photo_gne_button_zoom');
		if (button){
			unsafeWindow.document.getElementById('photo_gne_button_zoom').zoom_action = function(){};
			// Add onclick listener to AllSizes button
			addClickListener(button, onClick, onDblClick);
		}
		else {
			this.buttonExistedBeforeGM = false;
		
			// If video with Embed button
			if (page.isVideo() && page.hasEmbedButton()){
				button = buttonBar.appendChild(that.createButton());				
				addClickListener(button, onClick, onDblClick);
			}
			
			// Determine if viewer is logged in and allows downloads on their photos
			else {
				var button = buttonBar.appendChild(that.createButton());				
				addClickListener(button, onClick, onDblClick);
			}
		}
	},
	
	// No button present! Add one...
	createButton: function(){
		var button, width;
		
		button = extend(cE('a'), {
			id: 'photo_gne_button_zoom',
			className: 'sprite-zoom_grey'
		});
		
		// CSS styles
		width = (Page.getCurrentPage().getLang().lang === 'en') ? 47 : 21;
		insertStyles(
			'#photo_gne_button_zoom { cursor:pointer; width:' + width + 'px; }'
		);
		
		// Style rollover events
		button.addEventListener('mouseover', function(e){
			e.currentTarget.className = 'sprite-zoom_color';
		}, false);		
		button.addEventListener('mouseout', function(e){
			e.currentTarget.className = 'sprite-zoom_grey';
		}, false);
				
		return button;
	},
	
	unavailable: function(){
		var popUp, p;
	
		// Check if popUp was already created
		popUp = PopUp.getById('Unavailable');
		
		if (!popUp){
			popUp = new PopUp('Unavailable');
			popUp.main.className = '';
			
			p = popUp.main.appendChild(cE('p', 'Sorry... The All Sizes page for this photo is unavailable :o('));
			p.className = 'indented';
		}
			
		return popUp.open();
	},
	
	updated: function(){
		var popUp, p;
	
		// Check if popUp was already created
		popUp = PopUp.getById('Updated');
		
		if (!popUp){
			popUp = new PopUp('Updated');
			popUp.main.className = '';
			
			div = popUp.main.appendChild(cE('div'));
			div.innerHTML = "<p>If you like this script, <strong>please consider donating</strong>.</p>" +
			"<p>This helps keep the script under active development and is a simple way to share the love :)</p>" +
			"<p>(<a href='" + Flickr.getUrl('groups/flickrhacks/discuss/72157594303798688/72157612324826659/') + "'>More info</a>)</p>" +
			"<div class='donate'><div>" + UserScript.getDonateButton() + "</div><p>Thanks.</p></div>" +
			"<p><em>(You'll find this button in the &quot;About&quot; section).</em></p>"
		}
			
		return popUp.open();
	},
	
	errorCopyToClipboard: function(){
		var popUp, p, docPopUpMain, open;
	
		// Check if popUp was already created
		popUp = PopUp.getById('Clipboard');
		
		if (!popUp){
			popUp = new PopUp('Clipboard');
			popUp.main.className = '';
			
			extend(popUp.main.appendChild(cE('p', 'Could not copy to the clipboard :o(')), {className:'indented'});
			p = popUp.main.appendChild(cE('p'));
			p.innerHTML = 'Please see the \'<a id="allSizesPlus_CopyClipDocLink">Copy To Clipboard</a>\' section of the documentation to fix this.';
			p.className = 'indented';
			
			document.getElementById('allSizesPlus_CopyClipDocLink').addEventListener('click', function(){
				// Open documentation pop-up
				AllSizes.documentation();
				
				// Scroll to the relevant section
				docPopUpMain = getElementsByCssClass('div', 'popUpMain', document.getElementById('PopUp_Documentation'))[0];
				docPopUpMain.scrollTop = document.getElementById('allSizesPlus_DocCopyClip').offsetTop - docPopUpMain.offsetTop;
			}, false);
		}
		
		// If optionl arg of false is passed, then don't open
		open = (arguments.length) ? (arguments[0]) : true;
		if (open){
			return popUp.open();
		}
	},
	
	shortcuts: function(){
		// Check if popUp was already created
		var popUp = PopUp.getById('Shortcuts');
		
		if (!popUp){
			popUp = new PopUp('Shortcuts');
			
			var div, innerHTML;
			
			div = popUp.main.appendChild(cE('div'));
			div.style.cssFloat = 'left';
			innerHTML = "<h3>Size Keys</h3>"
			+ "<table>"
			+ "<tr><td>s + q</td><td>Square</td></tr>"
			+ "<tr><td>t</td><td>Thumbnail</td></tr>"
			+ "<tr><td>s</td><td>Small</td></tr>"
			+ "<tr><td>m</td><td>Medium</td></tr>"
			+ "<tr><td>l</td><td>Large</td></tr>"
			+ "<tr><td>o</td><td>Original</td></tr>";
			div.innerHTML = innerHTML;				
			
			
			div = popUp.main.appendChild(cE('div'));
			div.style.cssFloat = 'right';
			innerHTML = "<h3>Actions</h3>"
			+ "<table>"
			+ "<tr><td><em>(size key)</em> + Click</td><td>Code panel</td></tr>"
			+ "<tr><td>d + <em>(size key)</em> + Click</td><td>Download image</td></tr>"
			+ "<tr><td>c + <em>(size key)</em> + Click</td><td>Copy code to clipboard</td></tr>"
			+ "<tr><td>v + <em>(size key)</em> + Click</td><td>View image</td></tr>"
			+ "<tr><td><em>(size key)</em> + DoubleClick</td><td>All Sizes Page</td></tr>";
			div.innerHTML = innerHTML;
			
			
			div = popUp.main.appendChild(cE('div'));
			div.style.clear = 'both';
			innerHTML = "<h3>Explanation</h3>"
			+ "<p>Here, 'Click' means to click the AllSizes button. If you don't hold down a <em>size key</em> when you click, then the default size will be used. The default size can be changed in the 'Settings' panel.</p>"
			+ "<p><em>Examples:</em> Hold down 's', hold down 'q' and click the button - this shows the Code panel for the square size. Hold down 'd' and click - this downloads the default size.</p>";
			div.innerHTML = innerHTML;
		}
			
		return popUp.open();
	},
	
	
	about: function(){
		// Check if popUp was already created
		var popUp = PopUp.getById('About');
		
		if (!popUp){
			popUp = new PopUp('About');
			var div = popUp.main.appendChild(cE('div'));
			div.className = 'indented';
			
			var innerHTML = ''
			+ '<p><strong>Script:</strong> ' + UserScript.title + '</p>'
			+ '<p><strong>Version:</strong> ' + UserScript.version + '</p>'
			+ '<p><strong>License:</strong> <acronym title="General Public License"><a href="http://www.gnu.org/copyleft/gpl.html" title="GNU General Public License">GPL</a></acronym></p>'
			+ '<p><strong>Discuss:</strong> <a href="' + UserScript.metaUrl() + '" title="Discussion thread in the FlickrHacks group">Feedback, bug reports, feature requests</a> - <a href="' + UserScript.metaRssUrl + '" title="' + UserScript.title + ' discussion RSS feed"><img src="' + assets.rss + '" alt="' + UserScript.title + ' discussion thread RSS feed" /></a></p>'
			
			+ '<p style="margin-top:2.5em;"><img src="' + assets.premasagarBuddyicon + '" alt=""/> by <strong> ' + UserScript.author + '</strong>'
			+ '<ul>'
			+ '<li><a href="http://premasagar.com" title="Premasagar.com">Premasagar.com</a> - <a href="http://premasagar.com/feed/rss" title="Premasagar.com RSS feed"><img src="' + assets.rss + '" alt="' + UserScript.title + ' discussion RSS feed" /></a></li>'
			+ '<li><a href="' + Flickr.getUrl('photos/dharmasphere/') + '" title="Premasagar\'s Photostream on Flickr">Premasagar\'s Photostream</a> - <a href="http://api.flickr.com/services/feeds/photos_public.gne?id=54304913@N00" title="Photostream RSS feed"><img src="' + assets.rss + '" alt="' + UserScript.title + ' discussion RSS feed" /></a></li>'
			+ '<li><a href="http://dharmafly.com" title="Dharmafly, social web development">Dharmafly - social web development</a> - <a href="http://dharmafly.com/feed" title="Dharmafly RSS feed"><img src="' + assets.rss + '" alt="' + UserScript.title + ' discussion RSS feed" /></a></li>'
			+ '</ul></p>'
			
			+ '<div class="donate">'
			+ '<div>' + UserScript.getDonateButton() + '</div>'
			+ '<p>Thank you for supporting this project :)</p>'
			+ '</div>';
			
			div.innerHTML = innerHTML;
		}
			
		return popUp.open();
	},
	
	
	documentation: function(){
		// Check if popUp was already created
		var popUp = PopUp.getById('Documentation');
		
		if (!popUp){
			popUp = new PopUp('Documentation');
			
			var innerHTML = ''
			+ '<p>AllSizes+ gives you quick access to the different sizes available for a photo on Flickr. It produces better HTML code for posting photos on to blogs and Flickr discussion threads, lets you quickly view and download images, and does a number of other things too.</p>'
			
			+ "<h3>The AllSizes Button</h3>"
			
			+ "<p>Some users have their Flickr account set to <a href='/account/prefs/downloads/' title='Privacy &amp; Permissions setting for allowing downloads from your photostream'>restrict downloads</a> on their photos. This is usually done as a deterrent against people misusing their photos. By default, Flickr will not show the AllSizes button on such user's photos.</p>"
			+ "<p>There are many reasons why people may legitimately want to use the AllSizes button. For example, those who want to see the details present in a large-size image, or those who want to download images for their personal, offline enjoyment, or those who want to talk about photos in Flickr discussion groups and use the HTML code to post the relevant photo.</p>"
			+ "<p>The script will <em>add</em> the AllSizes button to a photo if it is not already present, but it will only show those image sizes that are already viewable on the Flickr website. In other words, it will not show the Original size image for that photo.</p>"
			+ "<p>You will always be able to use the script for your own photos (if you are logged in), regardless of your privacy settings."

			+ "<h3>Flickr's All Sizes Page</h3>"
			+ "<p>To see the standard 'All Sizes' page for a photo, just <em>double-click</em> the AllSizes button in the toolbar above, or click the AllSizes icon in the Code panel of this pop-up. It will not be viewable if the photo owner has restricted downloads.</p>"
			
			+ '<h3>Shortcuts</h3>'
			+ "<p>The Shortcuts panel gives an overview of the different shortcut keys you can hold down when clicking the AllSizes button. You do not <em>need</em> to use any of them, since all the functionality is available by clicking on the different buttons in the pop-up window. But they might save you a little time.</p>"

			+ '<h3>Delay for Large &amp; Original Sizes</h3>'
			+ "<p>When you first click the AllSizes button, information about the image sizes is gathered. Details about the medium and smaller sizes are available immediately, but there is a short delay before the large and original sizes are known.</p>"
			
			+ '<h3>Large &amp; Original Sizes</h3>'
			+ "<p>The large size is only available for a photo when the original size is larger than 1280 pixels on either side.</p>"
			+ "<p>The original size is not available if the photo owner is a non-Pro user or has restricted downloads on their photos.</p>"

			+ '<h3>BB Code &amp; HTML</h3>'
			+ "<p><a href='http://en.wikipedia.org/wiki/Bb_code' title='Read about BB Code on Wikipedia'>BB Code</a> is similar to HTML and is used on many forum websites. You can click the 'to BB Code / to HTML' button to toggle between HTML code and BB Code.</p>"
			
			
			+ '<h3 id="allSizesPlus_DocCopyClip">Copy to Clipboard</h3>'
			+ "<p>If you find that the <em>Copy to Clipboard</em> functionality doesn't work, then try making this change in your Firefox browser:</p>"
			+ "<ol>"
			+ "<li>Open a new browser tab and type into the address bar <strong>about:config</strong></li>"
			+ "<li>If you see a warning about entering this part of the browser, just click 'OK'</li>"
			+ "<li>In the 'Filter' bar, type <strong>signed.applets.codebase_principal_support</strong></li>"
			+ "<li><em>Double-click</em> the line of text that appears, which will change the 'Value' from <em>false</em> to <em>true</em>.</li>"
			+ "<li>Close the browser tab that you just opened</li>"
			+ "<li>Try to <em>Copy to Clipboard</em> again</li>"
			+ "</ol>"
			
			+ "<p>When you click the <em>Copy to Clipboard</em> button, you may see a security pop-up from the browser asking to allow the action. You can choose to allow it, and to remember this decision in future, so that you don't see the pop-up again in future.</p>"
			+ "<p>It is worth being aware that if you do tell the browser to remember this decision, then you will not be prompted again for <em>any</em> clipboard actions from Flickr.com or from any Greasemonkey scripts that you have installed for Flickr.</p>"
			+ "<p>This is, in theory, a small security risk, because a malicious script could read the contents of your clipboard and send it to an external site. However, this is unlikely to happen, because any malicious script behaviour is likely to be reported by other users before you decide to install the malicious script.</p>"
			+ "<p>A useful Firefox add-on is the <a href='https://addons.mozilla.org/firefox/852/' title='AllowClipboard Helper extension'>AllowClipboard Helper</a>, which helps you to monitor which websites are allowed to access your clipboard.</p>"
			
			
			+ '<h3>Auto-Updates</h3>'
			+ "<p>By default, the script will automatically check for upgrades once a day (or less often if you don't visit Flickr). If a newer version is available, it will ask you if you want to install it. You can turn off auto-updates in the Settings panel.</p>"
			
			
			+ "<h3>Anonymous Stats</h3>"
			+ "<p>By default, anonymous usage statistics about how you use the AllSizes+ script are collected. This is done to better understand which features people use and how the script may be improved in future. The specific photos that you view are not recorded.</p>"
			+ "<p>Overall statistics will be shared with the community, in a future release. If you don't wish to contribute your stats, you can turn off <strong>Send Stats</strong> in the Settings panel.</p>"
			
			
			+ '<h3>Flickr Terms for Posting Photos</h3>'
			+ "<p>The Flickr <a href='" + Flickr.getUrl('terms.gne') + "'>Terms of Service</a> require that any photo you post on another site must include a link back to the photo's Flickr photopage. You can do this by simply using the code in the Code panel.</p>"
			+ "<p>Note that, for private photos (including those marked as 'Friends' or 'Family'), the photopage will not be viewable by the general public.</p>"
			
			
			+ '<h3>All Rights Reserved</h3>'
			+ "<p>If a photo is marked &quot;&copy; All Rights Reserved&quot;, then you <strong>must</strong> have permission from the owner to use it. This is a requirement of international law and, well, it's simple common courtesy.</p>"
			+ "<p>You may be legally allowed to re-post a copyrighted photo without specific permission, if it constitutes '<a href='http://en.wikipedia.org/wiki/Copyright#Fair_use_and_fair_dealing' title='Wikipedia article on Copyright &amp; Fair Use'>Fair Use</a>', e.g. for review and critique. Fair Use laws can be pretty vague and vary from country to country. It's simplest just to ask the owner.</p>"
			
			
			+ '<h3>Creative Commons</h3>'
			+ "<p>If a photo has a <img src='" + assets.creativeCommonsIcon + "' alt='Creative Commons' /> Creative Commons license, then you need to read the specific license to determine if you are allowed to use it without any further permission from the owner.</p>"
			+ "<p>In general, if you use a Creative Commons photo in a non-commercial context, you do not alter the image and you attribute the owner by linking to the photopage, then you should be fine. More relaxed conditions may apply, depending on the specific license.</p>"
			+ "<p>It is good to let the owner know that you've used their photo, even if not legally required, because people like to hear how others have used their work.</p>"
			
			
			+ "<h3>Uninstalling</h3>"
			+ "<p>To uninstall a Greasemonkey script from your browser, go to the <strong>Tools</strong> menu, select <strong>Greasemonkey</strong>, then <strong>Manage User Scripts</strong>, highlight the script and click <strong>Uninstall</strong>.</p>"
			
			
			+ '<h3>Further Info</h3>'
			+ "<p>If you have any questions, bug reports or suggestions for improvement, please leave a post in the <a href='" +  UserScript.metaUrl() +"' title='Discussion thread in the FlickrHacks group'>discussion thread</a> for this script. Ta.</p>";
			
			// Add HTML to popUp
			popUp.main.innerHTML = innerHTML;
		}
			
		return popUp.open();
	}
};



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



// FLICKR API
Api = {
	key : 'f11432d99cdf97246d9fe401e524831e',
	urlRoot: 'http://api.flickr.com/services/rest/',
	
	// e.g. callMethod('photos.getSizes', function(){}, {photo_id:34343232})
	callMethod: function(method, parameters, callback){
		var format = (arguments > 3) ? arguments[3] : 'json';
		var url = this.urlRoot + '?method=flickr.' +method+ '&api_key=' +this.key+ '&format=' +format;
		
		// Add parameters to url
		if (parameters){
			for (param in parameters){
				url += '&' + param + '=' + parameters[param];
			}
		}
			
		var handler = function(response){
			function jsonFlickrApi(rsp){
				return rsp;
			}
			
			eval('var rsp = ' + response + ';');
			
			if (rsp.stat != 'ok'){
				callback(false);
			}
				
			else {
				callback(rsp);
			}
		};
			
		ajaxRequest(url, handler);
	}
};




/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */




// SCRIPT SETTINGS
function SettingsGroup(initObj){
	extend(this, initObj);
}

SettingsGroup.prototype = {
	type: 'settingsGroup',
	settings: [],
										 
	save: function(){
		for(var i=0; i<this.settings.length; i++){
			this.settings[i].save();
		}
		return this.getValue();
	},
	
	toDefault: function(){
		for(var i=0; i<this.settings.length; i++){
			this.settings[i].toDefault();
		}
		return this.getValue();
	},
	
	getValue: function(){
		var values = [];
		for(var i=0; i<this.settings.length; i++){
			values.push(this.settings[i].getValue());
		}
		return values;
	},
	
	setValue: function(){
		for(var i=0; i<this.settings.length; i++){
			this.settings[i].setValue();
		}
		return this.getValue();
	},
	
	show: function(){
		var node = document.getElementById('settings_' + this.id);
		if (node){
			node.style.display = 'block';
		}
		else {
			this.display = true;
		}
	},
	
	hide: function(){
		var node = document.getElementById('settings_' + this.id);
		if (node){
			node.style.display = 'none';
		}
		else {
			this.display = false;
		}
	},
	
	getUserControl: function(){
		var node = cE('div');
		node.className = 'settingsGroup';

		// Node id
		node.id = 'settings_' + this.id;

		// Add header
		if (this.label){
			var h3 = node.appendChild(cE('h3', this.label));
		}
		
		for(var i=0; i<this.settings.length; i++){
			var subNode = this.settings[i].getUserControl();
			if (i < this.settings.length-1){
				if ((this.settings[i].type == 'radio' && this.settings[i+1].type == 'radio') || (this.settings[i].type == 'checkbox' && this.settings[i+1].type == 'checkbox')){
					subNode.className = 'miniGroup';
				}
			}
			node.appendChild(subNode);
		}		
		
		// Display or hide
		if (typeof this.display != 'undefined'){
			node.style.display = (this.display) ? 'block' : 'none';
		}			
		
		// Return node, when given either html or a node
		function toNode(x){
			var node = cE('div');
			if (typeof x == 'function') {
				return x();
			}
			else if (typeof x == 'string') {
				node.innerHTML = x;
			}
			return node;
		}
		
		// Add prefix
		if (typeof this.prefix != 'undefined'){
			node.insertBefore(toNode(this.prefix), node.firstChild);
		}
		
		
		// Add suffix
		if (typeof this.suffix != 'undefined'){
			node.appendChild(toNode(this.suffix));
		}
		
		return node;
	},
	
	
	controlToDefault: function(){
		for(var i=0; i<this.settings.length; i++){
			this.settings[i].controlToDefault();
		}
	}
};




/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



// Setting object
function Setting(initObj){
	extend(this, initObj);
}


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


Setting.prototype = {	
	// Get value, or if non-existent, get defaultValue & update value
	getValue: function(){
		// Check GM value for this setting
		var userSetting = GM_getValue(this.id);
		
		// If not found, update GM setting with default value
		if (typeof userSetting == 'undefined'){
			userSetting = this.toDefault();
		}
		return userSetting;
	},
	
	// Save settings to GM in browser
	setValue: function(value){
		GM_setValue(this.id, value);
		return value;
	},
	
	save: function(){
		if (typeof this.tempValue != 'undefined'){
			this.setValue(this.tempValue);
			delete(this.tempValue);
		}
		return this.getValue();
	},
	
	toDefault: function(){
		this.tempValue = this.defaultValue;
		return this.save();
	},
	
	show: function(){
		var node = document.getElementById('settings_' + this.id);
		if (node){
			node.parentNode.style.display = 'block';
		}
		else {
			this.display = true;
		}
	},
	
	hide: function(){
		var node = document.getElementById('settings_' + this.id);
		if (node){
			node.parentNode.style.display = 'none';
		}
		else {
			this.display = false;
		}
	},
	
	getUserControl: function(){
		var that = this;
		
		switch (this.type){
			case 'text':
			var node = extend(cE('input'), {
				type: 'text',
				defaultValue: this.getValue()
			});
			
			// Add onchange event listener
			node.addEventListener('change', function(e){
				that.tempValue = e.currentTarget.value;
			}, false);
			
			// Add controlToDefault function
			this.controlToDefault = function(){
				node.defaultValue = this.toDefault();
				node.value = node.defaultValue;
			};			
			break;
			
			
			case 'checkbox':
			var node = extend(cE('input'), {
				type:'checkbox',
				defaultChecked: (this.getValue() === true || this.getValue() == 'true')
			});
			
			// Add onchange event listener
			node.addEventListener('change', function(e){
				that.tempValue = e.currentTarget.checked;
			}, false);
			
			// Add controlToDefault function
			this.controlToDefault = function(){
				node.defaultChecked = this.toDefault();
				node.checked = node.defaultChecked;
			};
			break;
			
			
			case 'radio':
			var node = extend(cE('input'), {
				type:'radio',
				name:this.name,
				defaultChecked: (this.getValue() === true || this.getValue() == 'true')
			});
			
			// Add onchange event listener
			node.addEventListener('change', function(e){
				var els = e.currentTarget.form.elements;
				for (var i=0; i<els.length; i++){
					if (els[i].name == e.currentTarget.name){
						Settings.getById(els[i].id.slice('settings_'.length)).tempValue = els[i].checked;
					}
				}
				//that.tempValue = e.currentTarget.checked;
			}, false);
			
			// Add controlToDefault function
			this.controlToDefault = function(){
				node.defaultChecked = this.toDefault();
				node.checked = node.defaultChecked;
			};
			break;
			
			
			case 'select':
			var node = cE('select');
			for (var i=0; i<this.options.length; i++){
				var op = cE('option');
				op.value = this.options[i].value;
				op.text = this.options[i].label;
				op.defaultSelected = (this.getValue() == op.value);
				node.appendChild(op);
			}
			
			// Add controlToDefault function
			this.controlToDefault = function(){
				var defaultOption = this.toDefault();
				for (var i=0; i<node.options.length; i++){
					var op = node.options[i]
					op.defaultSelected = (op.value == defaultOption);
					if (op.defaultSelected){
						node.selectedIndex = i;
					}
				}
			};
			
			// Add onchange event listener
			node.addEventListener('change', function(e){
				that.tempValue = e.currentTarget.options[e.currentTarget.selectedIndex].value;
			}, false);
			break;
			
			
			case 'textarea':
			var node = extend(cE('textarea'), {
				defaultValue: this.getValue()
			});
			
			// Add onchange event listener
			node.addEventListener('change', function(e){
				that.tempValue = e.currentTarget.value;
			}, false);
			
			// Add controlToDefault function
			this.controlToDefault = function(){
				node.defaultValue = this.toDefault();
				node.value = node.defaultValue;
			};
			break;
			
			
			default:
			return null;
		}
		
		// Display or hide
		if (typeof this.display != 'undefined'){
			node.style.display = (this.display) ? 'block' : 'none';
		}
		
		
		// Show / Hide SettingsGroups
		function showHideSettings(){				
			for (var i=0; i<that.showSettings.length; i++){
				Settings.getById(that.showSettings[i]).show();
			}
			
			for (var i=0; i<that.hideSettings.length; i++){
				Settings.getById(that.hideSettings[i]).hide();
			}
		}
		
		if (typeof this.showSettings != 'undefined' && typeof this.hideSettings != 'undefined'){
			node.addEventListener('change', showHideSettings, false);
			if (this.getValue() === true){
				showHideSettings();
			}
		}
		
		
		// Set node id & name
		node.id = 'settings_' + this.id;
		if (node.name != ''){
			node.name = 'settings_' + node.name;
		}
		
		
		// Enable buttons onchange
		node.addEventListener('change', function(e){
			var s = document.getElementById('settings_saveBtn');
			s.disabled = false;
			s.className = 'Butt';
			var d = document.getElementById('settings_defaultBtn');
			d.disabled = false;
			d.className = 'Butt';
		}, false);
		
		// Add a label		
		var label = cE('label', this.label);
		label.htmlFor = node.id;
				
		// Enclose in p element
		var p = cE('p');
		p.appendChild(label);
		p.appendChild(node);
		
		// Add suffix
		if (typeof this.suffix != 'undefined'){
			var div = cE('div');
			div.appendChild(p);
			
			var suffix = div.appendChild(cE('p'));
			suffix.innerHTML = this.suffix;
			p = div;
		}
		
		return p;
	}
};


// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



// Settings array
// Don't change these settings. Instead, click the 'AllSizes' button and click the 'Settings' link.
Settings = [
	new SettingsGroup({
		id: 'general',
		label: 'General Settings',
		settings:
			[
				new Setting ({
					id:'defaultSize',
					label:'Default Size',
					defaultValue:'s',
					type:'select',
					options:
						[
							{ value:'sq', label:'Square' },
							{ value:'t', label:'Thumbnail' },
							{ value:'s', label:'Small' },
							{ value:'m', label:'Medium' },
							{ value:'l', label:'Large' },
							{ value:'o', label:'Original' }
						]
				}),
	
				new Setting ({
					id:'untitledTitle',
					label: 'Title for Untitled Photos',
					defaultValue:'Untitled',
					type:'text'
				}),
	
				new Setting ({
					id:'checkforUpdates',
					label: 'Auto-Update Script',
					defaultValue:true,
					type:'checkbox'
				}),
	
				new Setting ({
					id:'sendStats',
					label: 'Send Stats',
					defaultValue:true,
					type:'checkbox'
				})
			]
	}),
		
	
	new SettingsGroup({
		id: 'addUsername',
		label: 'Add Username to Title',
		settings:
			[
				new Setting ({
					id:'addUsernameWhenYou',
					label: 'On Your Photos',
					defaultValue:true,
					type:'checkbox'
				}),
				
				new Setting ({
					id:'addUsernameToTitle',
					label: "On Others' Photos",
					defaultValue:true,
					type:'checkbox'
				}),
	
				new Setting ({
					id:'usernameFormat',
					label: "Format, where '[user]' = the username",
					defaultValue:' (by [user])',
					type:'text'
				})
			]
	})
];



// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



extend(Settings, {
	getBy: function(property, value){
 		var getBy = Array.prototype.getBy;
 		var setting = getBy.call(this, property, value);
		
		// If no setting found, try settingsGroups
		if (!setting){
			var groups = getBy.call(this, 'type', 'settingsGroup', true);
			if (groups){
				for (var i=0; i<groups.length; i++){
					setting = groups[i].settings.getBy(property, value);
					if (setting){
						break;
					}
				}
			}
		}
		return setting;
	},
	
	getValue: function(id){
		var setting = this.getById(id);
		return (setting) ? setting.getValue() : null;
	},
			  
	save: function(){
		for (var i=0; i<this.length; i++){
			var setting = this[i].save();
		}
			
		var s = document.getElementById('settings_saveBtn');
		s.disabled = true;
		s.className = '';
		
		var popUp = PopUp.getById('Code');
		if (popUp){
			popUp.updateTextarea();
		}
	},
	
	popUp: function(){
		var that = Settings;
		
		var popUp = PopUp.getById('Settings');
		if (!popUp){
			// Create a new popUp
			popUp = new PopUp('Settings');
			popUp.main.className += ' fullLength';

			
			// Add a form				
			var div = popUp.main.appendChild(cE('div'));
			var form = div.appendChild(cE('form'));
			form.action = '#';
			
			// Add user controls to popUp
			for (var i=0; i<that.length; i++){
				form.appendChild(that[i].getUserControl());
			}
			
			// Add Buttons
			var p = form.appendChild(cE('p'));
			p.className = 'formButtons';
			
			// Add a save button
			var saveBtn = p.appendChild(cE('input'));
			saveBtn.id = 'settings_saveBtn';
			saveBtn.type = 'button';
			saveBtn.value = 'Save';
			saveBtn.disabled = true;
			
			// Add onclick listener to save settings
			saveBtn.addEventListener('click', function(e){
				var sendStats = that.getValue('sendStats');
				that.save();
				e.currentTarget.blur();
				// sendStats turned off
				if (sendStats && !that.getValue('sendStats')){
					dfApi.log({action:'sendStatsChanged', sendStats:false}, true);
				}
				else {
					// sendStats turned on
					if (!sendStats && that.getValue('sendStats')){
						dfApi.log({action:'sendStatsChanged', sendStats:true});
					}				
					dfApi.log({action:'saveBtn', settings:dfApi.getSettings()});
				}
			}, false);
			
			
			// Default Settings Button
			var defaultBtn = p.appendChild(cE('input'));
			defaultBtn.id = 'settings_defaultBtn';
			defaultBtn.type = 'button';
			defaultBtn.value = 'Default';
			defaultBtn.className = 'Butt';
			
			// Add onclick listener to default settings
			defaultBtn.addEventListener('click', function(e){
				var sendStats = that.getValue('sendStats');
				
				for (var i=0; i<that.length; i++){
					that[i].controlToDefault();
				}
				
				var s = document.getElementById('settings_saveBtn');
				s.disabled = true;
				s.className = '';
				
				var d = document.getElementById('settings_defaultBtn');
				d.disabled = true;
				d.className = '';
					
				var popUp = PopUp.getById('Code');
				if (popUp){
					popUp.updateTextarea();
				}
				e.currentTarget.blur();
				
				// sendStats turned on
				if (!sendStats && that.getValue('sendStats')){
					dfApi.log({action:'sendStatsChanged', sendStats:true});
				}
				dfApi.log({action:'defaultBtn'});
			}, false);
		}
		
		return popUp.open();
	}
});



// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+


extend(UserScript, {	
	// Hours till next update check
	updateInterval: 24,
	
	// Api url to check for updates
	checkUpdateUrl: 'http://dharmafly.com/projects/allsizesplus/changelog.xml',
	
	// Urls for script discussion thread
	metaUrl: function(){
		return Flickr.getUrl('groups/flickrhacks/discuss/72157594303798688/');
	},
	metaRssUrl: 'http://pipes.yahoo.com/pipes/pipe.run?_id=MFnCl_kN3BGQqo58JxOy0Q&_render=rss&_run=1&GroupID=96035807@N00&lang=en-us&format=rss_200&ThreadID=72157594303798688&GroupOrForum=groups_discuss.gne',
	
	// Function to check for script updates
	checkForUpdates: function(){
		// Does user want to check for updates?
		if (!Settings.getValue('checkforUpdates')){
			return;
		}
		
		// Determine last time script was checked for updates
		var lastCheck = GM_getValue('lastUpdateCheck');
		lastCheck = (typeof lastCheck !== 'undefined') ? parseInt(lastCheck) : this.date.getTime(); // default is data of userscript last-modified date
		
		// Get the current time
		var timeNow = now();
		
		// Guard against weird stuff, like user changing system clock to the future
		if (lastCheck > timeNow){
			lastCheck = timeNow;
		}
		
		// Is it time to check for updates? If not, return
		if (timeNow < (lastCheck + (this.updateInterval * 60 * 60 * 1000))){
			return;
		}
			
		//  Update the lastUpdateCheck local variable
		GM_setValue('lastUpdateCheck', timeNow.toString());
		
		
		// +-+-+-+-+-+-+-+-+


		// Api url for the update check
		var url = this.checkUpdateUrl + '?id=' + this.id + '&version=' + this.version + '&id=' + dfApi.getAnonId() + '&noCache=' + timeNow;
		var that = this;
		
		// Callback function for the AJAX request
		var callback = function(response){
			// Bad response
			if (!response || response === ''){
				return;
			}
			
			// Parse the response
			var parser = new DOMParser();
			var dom = parser.parseFromString(response,	"application/xml");
			var rsp = dom.getElementsByTagName('rsp')[0];
			
			// Our request failed! Return.
			if (rsp.getAttribute('stat') != 'ok'){
				return;
			}
			
			// Get userscript details
			var userscript = rsp.getElementsByTagName('userscript')[0];
			var v = userscript.getAttribute('version');
			var downloadUrl = userscript.getElementsByTagName('url')[0].textContent;
			var metaUrl = userscript.getElementsByTagName('url')[0].textContent; // TODO: If used, then maybe itilise Flickr.getUrl()
			var changelog = userscript.getElementsByTagName('changelog')[0].textContent;
			
			// If there's no version update, then return
			if (v <= that.version){
				return;
			}
			
			// There's an update! Create a pop-up to tell the user			
			var popUp = new PopUp('Update Available');
			popUp.main.className = '';
			
			var div = popUp.main.appendChild(cE('div'));
			div.className = 'indented';
			var innerHTML = '<p><strong>Script:</strong> ' + UserScript.title + '</p>'
			+ '<p>Version ' + v + ' is now available.</p>'
			+ '<p><strong><a style="font-size:1.4em;" href="' + downloadUrl + '" title="Install new version of this script">&raquo; Install it!</a></strong></p>';
			
			if (changelog != ''){
				innerHTML += '<h3>New Features</h3>'
				+ '<p>' + changelog + '</p>';
			}
			div.innerHTML = innerHTML;		
			popUp.open();
		};
		
		// Make the AJAX request
		ajaxRequest(url, callback);
	},
	
	getDonateButton: function(){
		return '<form action="https://www.paypal.com/cgi-bin/webscr" method="post"><input type="hidden" name="cmd" value="_s-xclick"><input title="Thank you for supporting this project :)" type="image" src="' + assets.paypalDonate + '" border="0" name="submit" alt="PayPal"><input type="hidden" name="encrypted" value="-----BEGIN PKCS7-----MIIHVwYJKoZIhvcNAQcEoIIHSDCCB0QCAQExggEwMIIBLAIBADCBlDCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20CAQAwDQYJKoZIhvcNAQEBBQAEgYBaUwcSozC/ZqtwIhmWbnmkRhkVSLQJIfyuN5mcr+kpqUeMjV+8JCkHo8K/zzozAzihnR053+GtrL9R5He0O1d42ZAIxzMcmcvEM/8XbxVTua+v2z4Fl4CiwRhbIbU1+0yJ8c5QZAGSLbtwVuTOwZJgxFy7AYUnqXtQMA7+jft3ijELMAkGBSsOAwIaBQAwgdQGCSqGSIb3DQEHATAUBggqhkiG9w0DBwQIGPd3Ps1cGB2AgbAuhmF+2Y6y5FlPk0GGL7MuduNrK/AkK96f1EvKJqn8OF9caTEDUyA1x6TwZj1r++mPyDn8DLCPQ+7xSHyu2EZIV1UbZAPsdMX8wi14Fw4jSssgsDc5Dkib7ha3t44UHwrtwLlWP//SBlFWsRix14KqkjCCTnKds0pimXsurgY3Hd2YU/SAG5vjBaRggeTeMTlPFNMRohTd545xyYj0zYfnFeM4meviysYQmCaqoz4aEqCCA4cwggODMIIC7KADAgECAgEAMA0GCSqGSIb3DQEBBQUAMIGOMQswCQYDVQQGEwJVUzELMAkGA1UECBMCQ0ExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxFDASBgNVBAoTC1BheVBhbCBJbmMuMRMwEQYDVQQLFApsaXZlX2NlcnRzMREwDwYDVQQDFAhsaXZlX2FwaTEcMBoGCSqGSIb3DQEJARYNcmVAcGF5cGFsLmNvbTAeFw0wNDAyMTMxMDEzMTVaFw0zNTAyMTMxMDEzMTVaMIGOMQswCQYDVQQGEwJVUzELMAkGA1UECBMCQ0ExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxFDASBgNVBAoTC1BheVBhbCBJbmMuMRMwEQYDVQQLFApsaXZlX2NlcnRzMREwDwYDVQQDFAhsaXZlX2FwaTEcMBoGCSqGSIb3DQEJARYNcmVAcGF5cGFsLmNvbTCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAwUdO3fxEzEtcnI7ZKZL412XvZPugoni7i7D7prCe0AtaHTc97CYgm7NsAtJyxNLixmhLV8pyIEaiHXWAh8fPKW+R017+EmXrr9EaquPmsVvTywAAE1PMNOKqo2kl4Gxiz9zZqIajOm1fZGWcGS0f5JQ2kBqNbvbg2/Za+GJ/qwUCAwEAAaOB7jCB6zAdBgNVHQ4EFgQUlp98u8ZvF71ZP1LXChvsENZklGswgbsGA1UdIwSBszCBsIAUlp98u8ZvF71ZP1LXChvsENZklGuhgZSkgZEwgY4xCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJDQTEWMBQGA1UEBxMNTW91bnRhaW4gVmlldzEUMBIGA1UEChMLUGF5UGFsIEluYy4xEzARBgNVBAsUCmxpdmVfY2VydHMxETAPBgNVBAMUCGxpdmVfYXBpMRwwGgYJKoZIhvcNAQkBFg1yZUBwYXlwYWwuY29tggEAMAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADgYEAgV86VpqAWuXvX6Oro4qJ1tYVIT5DgWpE692Ag422H7yRIr/9j/iKG4Thia/Oflx4TdL+IFJBAyPK9v6zZNZtBgPBynXb048hsP16l2vi0k5Q2JKiPDsEfBhGI+HnxLXEaUWAcVfCsQFvd2A1sxRr67ip5y2wwBelUecP3AjJ+YcxggGaMIIBlgIBATCBlDCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20CAQAwCQYFKw4DAhoFAKBdMBgGCSqGSIb3DQEJAzELBgkqhkiG9w0BBwEwHAYJKoZIhvcNAQkFMQ8XDTA4MDUwMjEwMDkyNVowIwYJKoZIhvcNAQkEMRYEFOhe/bs3zm1CPiqqHrjvhdekrKeYMA0GCSqGSIb3DQEBAQUABIGAgD0lyqFdkqXSP8sgianuvbpjpVYPY6ItQ+LQTeSXzFtBwqWB72kpWBb9kpSUbTACiMGStBOVCnck+pX7f+ldjyA3R6J2cfphfKBZwJGwVa3rGFI3AjPtIvXatKczn8GK5a4J63AFa3STxGuowIAwG96MdJ/K0+uN2LuxfjZzaR0=-----END PKCS7-----"></form>';
	}
});



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */



assets = {
	closeWindow: 'data:image/gif;base64,R0lGODlhDQANAJEDAPX3%2Br%2B%2Fv5mZmf%2F%2F%2FyH5BAEAAAMALAAAAAANAA0AAAInXI4ZBu0PDpwSCOFuqxf3HWQdBj6fU1kjGqqeFrWwWk5PakeGogwFADs%3D',
	
	creativeCommonsIcon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAMAAABFNRROAAAAA3NCSVQICAjb4U%2FgAAAAVFBMVEX%2F%2F%2F%2FMzMy0tLSsrKzMzMysrKyZmZmsrKylpaWZmZm0tLSsrKyZmZn%2F%2F%2F%2F4%2BPjx8fHm5ubc3NzY2NjMzMzExMS9vb20tLSsrKylpaWZmZmMjIyEhIQ7afucAAAAHHRSTlMAIjMzVVVmd3d3qru7%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F7LJSKwAAAAlwSFlzAAAK8AAACvABQqw0mAAAACV0RVh0U29mdHdhcmUATWFjcm9tZWRpYSBGaXJld29ya3MgTVggMjAwNId2rM8AAAAWdEVYdENyZWF0aW9uIFRpbWUAMTAvMjcvMDbcAykSAAAAeElEQVR4nC2OSwKDIAxE049aLSOBSJrA%2Fe9ZUGeVt5h5Iep5b9%2FtQXe8mln1C6oxALZ6guLK0YgWx54TojDsQ1VQXPPPC8SpMrvs6sxInVJ0E3U9Bq2KZCWK9cbaN%2FvEDkTwUDybnILcXkM4NU2cSpvu1%2BYQwjyOPz86CR3NamYwAAAAAElFTkSuQmCC',
	
	save: 'data:image/gif;base64,R0lGODlhDQANAKIAAP%2F%2F%2F%2F%2F%2F94SEhE5R5EZLXP%2F%2F%2FwAAAAAAACH5BAUUAAUALAAAAAANAA0AAAMwSLpMVWQMAoAQIbo46wWcIlGWAI5hBQTnxLmL5Mo0LcIM2qmqpvG9GQno2xFxjUYCADs%3D',
	
	copy: 'data:image/gif;base64,R0lGODlhDQANAKIAAAAAANnBdqWDC0ZLXP%2F%2F%2F%2F%2F%2FAP%2F%2F%2FwAAACH5BAUUAAYALAAAAAANAA0AAAMyaKrQuyMOUIAcZoRN%2BxbWFhAkCQSgFjRsg4aoIM%2BvKt41jqf6zfcfGDA1KxYBhpbSkQAAOw%3D%3D',
	
	view: 'data:image/gif;base64,R0lGODlhDQANANUAAP%2F%2F%2F8r%2F2eH23%2BDw9Nfw4Nbv39fv4Nbt6tXs6bnrvcbj3rPrt8Ti3KjZto%2FLcbiuky7KEBPJCS23ACquAC2nAACzACemAAqhEACTAAGTAQCLAACJFQCHAACCAAJ%2BAgB9AAB0AAJrDABqCkZLXABkAAFkAT44AJ0TIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAQUAP8ALAAAAAANAA0AAAZbwJFwSCQCjoOGcnAECI8MEWkaUhyfiM9nw%2B14Ds4RoIC5mM0ZQnhcPl8yhjVAUInYK4KruOmAOJprCwkBDycPAQkLaxwcGCAmIBgaGmsWlhMSExSbcoCeRaBDQQA7',
	
	bbCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANBAMAAACAxflPAAAAA3NCSVQICAjb4U%2FgAAAAGFBMVEX%2F%2F%2F9GS1xGS1xGS1xGS1xGS1xGS1xGS1xn6jnHAAAACHRSTlMAM0RViJmq%2F%2BmTQ%2BoAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAldEVYdFNvZnR3YXJlAE1hY3JvbWVkaWEgRmlyZXdvcmtzIE1YIDIwMDSHdqzPAAAAFnRFWHRDcmVhdGlvbiBUaW1lADExLzAzLzA2j9bmkQAAADJJREFUeJxjKC8PYAgvL2AoTzVgME0H0gIMDAziQFoBSKuTQcP0pygwqIQDaaD56eUFAPY3E2VV5VGNAAAAAElFTkSuQmCC',
	
	html: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANBAMAAACAxflPAAAAA3NCSVQICAjb4U%2FgAAAAJ1BMVEX%2F%2F%2F9GS1xGS1xGS1xGS1xGS1xGS1xGS1xGS1xGS1xGS1xGS1xGS1y2OUrmAAAADXRSTlMAESJEVWZ3iJmqu93%2F6GZkLAAAAAlwSFlzAAALEgAACxIB0t1%2B%2FAAAACV0RVh0U29mdHdhcmUATWFjcm9tZWRpYSBGaXJld29ya3MgTVggMjAwNId2rM8AAAAWdEVYdENyZWF0aW9uIFRpbWUAMTEvMDMvMDaP1uaRAAAAVElEQVR4nGNgYGBiZACDEpYCEMV%2BhOUYiM6ZwDAngIGB9QQDA%2BcRBoY5IMmeBobTIDnuAww1EyB85lMQeQafhYxrgOoZWI%2BwHAWbl8KSAKYZQeYDAJyLEakfRhs9AAAAAElFTkSuQmCC',
	
	allsizesIcon: 'data:image/gif;base64,R0lGODlhDQANANUAABMSEa6wt2x%2BidHk5lldbEZJSY2NmcDT1vP%2F%2Fzc6O2tse4SGkmZmZpmZo8TX2icoKLnAxdzv83l8iUNHWd3d34Wbo0dMXWZmZszMzGx8h%2BTl556prLG1u4WSldnZ3MTGy3Byf97v93N9ibW1vY6kq4CDj11hcEtPYJSUpaGkq5ulpv%2F%2F%2F6q6v3V3hHV5hm%2BCjcnb3eXv8ZytrYyUlOH093CEjv%2F%2F%2FwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAUUADYALAAAAAANAA0AAAZoQJtNkyIQKMKk8EPgrFaSkkZpM61iHdYKo1CmODHEQ0VjiTBJwqqTADwKjpchvWJtHgzVQdBIUiQrEQUqAxUnAUoLECQwBxUZLVQ2IBk1AhMgFhKSHg0NHDYSmpJUoi6kSqIMqEkMGEEAOw%3D%3D',
	
	rss: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAMAAABFNRROAAAAA3NCSVQICAjb4U%2FgAAAA5FBMVEX%2F%2F%2F%2FbgTbbeTTMZjPokELliULmhEPokELliULmhEP%2F%2F%2F%2F%2F%2B%2Fj%2F9u788uz%2F8eD87%2Bf%2F5tb%2F5c7738T%2B27b52MT20rz40bP%2FzJnzx7D6x4%2F9xIf2xJz4w5P8wH72wJL4v4b4wIn4uXz8um7wtpf7s2L8slz8rUv7q0z7q1D6q1D2qlv8qUT2qF34pUr5pEP2o1D0oFP1n0j4oD%2F2nTvwm1jxnFPwnEjwm0TwlkztllXvlUPxkjfvjkLyjzLrj0zvjT3miU3liULrhzzmhjnmhEPlgk7kfDvkekHheUbkdjzeczHfbjg30p4HAAAATHRSTlMAIiIiqqqqu7u7%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2Fh03wwAAAAAlwSFlzAAAK8AAACvABQqw0mAAAACV0RVh0U29mdHdhcmUATWFjcm9tZWRpYSBGaXJld29ya3MgTVggMjAwNId2rM8AAACtSURBVHicBcGLQoIwFADQ6yPRG4L4SjEsNcXEQZPa7DqlAc6o%2F%2F8fz4H6Q1FkikgI0WxAW18%2B6Sw5CzfvFuh83O0%2FJ2m4CZkArWYOouNHIeMEij72yRTxKeZSQSY9HLytbXw5kQKSrx7ico3uMddw5CkL7MfdDFd%2FJYiD3%2FMDHH%2FhqDIgYw895uC3a18NiCjoL07z4c9q8mvA2sacKC9N9X%2FrQKMpSCldlMa0andLpRqf6%2FvFqQAAAABJRU5ErkJggg%3D%3D',
	
	paypalDonate: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAASCAMAAADbs%2FYFAAAAA3NCSVQICAjb4U%2FgAAACTFBMVEX%2F%2F%2F%2F%2FkTj%2FcgD%2FZgD%2FVQD%2FMwD%2FkTj%2FegX%2FcgD%2FcAX%2FZgD%2FpEL%2Fo0b%2FoED%2FnD3%2FmTP%2FnD3%2FmTP%2FoED%2FmTP%2F%2F%2F%2F%2F%2Fu%2F%2F%2Ffj%2F%2Ft%2F%2F%2F7r%2F%2Be%2F%2F%2F7f%2F9%2Bb%2F%2BOD%2F%2BrP%2F9c7%2F9cX%2F8df%2F9q3%2F8rb%2F78z%2F8ML%2F8Lz%2F6sz%2B7Kz%2B5rb%2F5ML%2F5az%2F5L3%2F4bXv5rb347X047v14bX44K7%2B36L%2B3Jr23Kfq3Ln%2F1p3s2bHx2KX%2F1Jbi1rb%2F0oPp1Kb%2B0IH%2Fzoz%2FzXzm0KLe0K3iz6P%2FzGbfzaD%2FxnD%2FxWPWyqr%2Fvmf%2Bvlr%2FvVLTw53%2Fu0n0vWDLwKHwumLMv5rCwLPovGX%2Bt0nFv6XNvZX%2FtUG9vrH%2Fr17%2Fsj3%2FtCm9uqi%2BuKP%2FrzLjsmT%2FriP%2FqlP%2FrD3%2FrCfbsWW%2BtZe2s6Herlr9qCessqq1sZr%2FpEL%2Fo0b1qDDRrGn2pSjTqmLPqWatrJyqrZfuoSr%2FmTPsoCrlnzKkppq5oWnfnDPfmi2fopO1nGbVlTGXnI%2BZmZm1mF3HkzqslWbJkDOolGjGjzeMlpLEjTTAjTjAizWJko6Cjox9jI%2BrhECShmSlgUF4hYWYe0RvgYqEfWRwgIRrfIJlfIZzc2t0c2FbdoJjc4RcdH9Xb3pQa3tuZktHZHlTYmVDYnk%2FXnc6XnlXWVA7W3U0V3QwVXQsU3U6TlcxSlohSW8sQmEXRXAnQ1gcQ2YhQmshQmMYQmwhQloTQGsbP10gPWAePV0TPmYaOV4NOmoJOmkUN14RN2MONGYHNGMIMmwAM2YILGkAKWN%2B%2FMnKAAAAxHRSTlMAEREREREiIiIiIru7u7u7zMzu7v%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FKF7Z4gAAAAlwSFlzAAALEgAACxIB0t1%2B%2FAAAACV0RVh0U29mdHdhcmUATWFjcm9tZWRpYSBGaXJld29ya3MgTVggMjAwNId2rM8AAAAWdEVYdENyZWF0aW9uIFRpbWUAMDUvMDMvMDhQi%2B8bAAACOklEQVR4nGNgAAIWLqFsMMiCYiKAEBczAxSw8kQoSEqDgaQYlEEQqEVws0K182uKEKsLASRFtPkhBvBriyoggDgQKBAFRLX5gLqZBMxk1JThQC4wIyNcWQ5JBCdQk7EUZGLgTJDTRgAV0xX7du1baKWioqINRkCsDUYq%2Bj3R8mBBhGKtLHYGYU8NJKAas7tNt%2FBwt6p527RyPY2QmNRpIRp6hZN63B2nHa7XSJ1Wb4BQrG3sJcxQEmyrraEFA0p1B%2F2UtBYtdVq6eub%2BbsPlB6eu3mSYuWHCstVtu%2FZ1tW2atm%2BWEkythoZzcAlDSWSwrRbcANmpBy20tJbNn7DbW2L2FoddC6WmHLYI6C6au8VkxWz1TYucFu1yUodq13INCwPpj430tDaC6ldfulRLMfRw3ZzViopz1qYcrJZduthh7vwJu%2Ba6HK7z3r1w2pxpNhCVxrZesZGRQP2xsbFJscFebiDgHLd%2BQXLF6m3%2BM3YEFRyY0bcj33%2F9jKbDDbm7JtccrvHdMSNteoszWKVXGFBXbGwJg3B6EhCAiaSkqI49e7fuWdcYVbZq%2B84lOfM2J7Xu7y%2FbvHHVwd6OQ6vKJm5ds7IyKgmqIRZICjOwlSSlw0F8aXN7ZzNINq%2B9OSm%2Btjm%2BtD0vvri9uLkqvbY5L6kKiBGq05NK2BgYBRN9wsgDPomCjKD062HvSg6w9%2BCH5h87HTPSgY4dNP8wsPAm6KiRCnQSuFlgBQATh1B2FgTAaEIgW4iDCaQVALTbO8hR9gnCAAAAAElFTkSuQmCC',
	
	premasagarBuddyicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAMAAADXqc3KAAAAA3NCSVQICAjb4U%2FgAAABgFBMVEXmPQQZLd6K3QoQuN9lWGgQf9yxrg2o%2FVLMzJm%2FHbtaiGdvQUPMzAB5c6%2FaJ2WLC8Dwu2jjnz5j0KroiVFwdkLEfBR%2FwS3MAP%2FhwD%2FYu3nCVF9zIMtSc9D2nQbUd1qGCf%2FUE4HoG0G%2FL7vbVSizQmTP0CK6%2B6u96QWEQdzaaT5K1pSZ%2FzMI9O3Af1fmjwBaKdrbgwuxl%2FnobYrZYADzn0Xb9RErhOzB%2B16dGd0D5fTgTz3WHzziY13B0C6NRIG0ouSwrT%2FEAOLBxhzzqlsEmuxnQazMM5lPMezkZZrATRbmygc02arcr3fZ80nzkh3EPXdTivmPMsLZSlzAQkWo5ALq0HfBnRzhRTzniSC12jX1v6vufAALnM5%2FnFKU5qXd4CPT20ShS4gQ5uKY%2BGrOfiHaYSWYPb7gQl5THe1nToh8HcygXTvAMNvK0haxLzLHD8v0YADn3wqtIZ7mUhi3%2BgDSmAzFlErs%2B5z00GjMgRSd1T3rSQAHV%2BDrd1zSSj5wEf%2FMziISAAAACXBIWXMAAAsSAAALEgHS3X78AAAAJXRFWHRTb2Z0d2FyZQBNYWNyb21lZGlhIEZpcmV3b3JrcyBNWCAyMDA0h3aszwAAABZ0RVh0Q3JlYXRpb24gVGltZQAwNS8wNi8wNRnkY5QAAAH1SURBVHicLdJtW5pQAIfxkw%2BZzVRKclMpfCqXDU9Tp5I6IbN0Tk0dUVhZQjinE4zcbHXtq%2B%2FAul%2F%2Bf%2BecF1yAFwzD2BujUum30TfUJXjhGzzbRxXYHz4MO3K7626UDnxDjV4UOILwMZU8lkqldLwEW1CoORwcRSDw2qeVLb6BBEEecg50mjCAsY9nzvc8f1SvAx%2F%2BOhM1n9c7rZAkWaHFdyvAUoUUegdCgkI3mJnL5fL7LZ46aHZwJJSgCFSbYUbPw%2BHJ0nGnGAP5tsThEAqCQkWYqTUQixV9cvj2L4K2yHEQQkVoM2eBtauOLMvS7bYONPcIIZ5MRkarHlyQZJkW%2F4MsLRYLUVy8seCCIIo0LelAB4PB6ge90mYknJRQACSbXkAfBs8d3HxeeooPzkLN8ENY%2BWPA%2BWHwEX2Sp3g8PojZx6Hmg6IAENGh6ljuamjPDGLZ0NhOdqoANLdB5%2Bdyt6tpu%2FEMgu1sxUmSdicotsCax2QyaVqXzWRs99lscTTyJxLfV7%2BA07kBu2r%2Fq%2B1%2BOuqdDIdLz729ATjdiGomU3eiqjpYzYGh1Vour1%2BDjxtYOq2x7ES9sc0S5bK5jPq0voMg9TadVtUJW7s4tppzuRzaXyEVNX6Swmbvbh9lDrRa1zsgzzcaXN%2Foak%2Ff9%2B8%2BHxys%2FPoHUK%2BKl%2Bb7xOMAAAAASUVORK5CYII%3D'
};



/*  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
  /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   / 
 /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /   /
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


// DO STUFF!
// Get current page and initialise
page = Page.getCurrentPage();
if (page && page.init){
	// If update just installed, then bring up to date
	dfApi.scriptUpdated();	
	page.init();
}



// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
})(); // THE END!