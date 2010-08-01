// ==UserScript==
// @name            Flickr AllSizes, by Dharmafly
// @description     AllSizes is a (Greasemonkey) userscript to give better access to Flickr photos: HTML and BBCode for the different image sizes, URLs, downloads and more.
// @version         2.0.0

// @namespace       http://dharmafly.com
// @df:project      http://dharmafly.com/projects/allsizes/
// @copyright       2010+, Premasagar Rose (http://premasagar.com)
// @license         MIT license; http://opensource.org/licenses/mit-license.php


/*!
* ==Further Info==
*
*   discuss:
*       flickr.com/groups/flickrhacks/discuss/72157594303798688/
*
*   fave the app in the Flickr App Garden:
*       flickr.com/services/apps/34760/
*
*   latest version:
*       userscripts.org/scripts/source/6178.user.js
*       dharmafly.com/projects/allsizes/allsizes.user.js (mirror)
*
*   userscript hosting:
*       userscripts.org/scripts/show/6178
*
*   source code repository:
*       github.com/premasagar/allsizes/
*
¡*/


// Activate on a Flickr photo page
// @include         http://www.flickr.com/photos/*/*
//
// @exclude         http://www.flickr.com/photos/organize/*
// @exclude         http://www.flickr.com/photos/friends/*
// @exclude         http://www.flickr.com/photos/tags/*
//
// @exclude         http://www.flickr.com/photos/*/sets*
// @exclude         http://www.flickr.com/photos/*/friends*
// @exclude         http://www.flickr.com/photos/*/archives*
// @exclude         http://www.flickr.com/photos/*/tags*
// @exclude         http://www.flickr.com/photos/*/alltags*
// @exclude         http://www.flickr.com/photos/*/multitags*
// @exclude         http://www.flickr.com/photos/*/map*
// @exclude         http://www.flickr.com/photos/*/favorites*
// @exclude         http://www.flickr.com/photos/*/popular*
// @exclude         http://www.flickr.com/photos/*/with*
// @exclude         http://www.flickr.com/photos/*/stats*
//
// @exclude         http://www.flickr.com/photos/*/*/sizes/*
// @exclude         http://www.flickr.com/photos/*/*/stats*
// ==/UserScript==


"use strict";

(function(){
    var userscript = {
            name: 'AllSizes',
	        id: 'dharmafly-allsizes',
	        version: '2.0.0',
	        update_url: 'http://assets.dharmafly.com/allsizes/manifest.json',
	        codebase: 'http://userscripts.org/scripts/source/6178.user.js',
            discuss: 'http://www.flickr.com/groups/flickrhacks/discuss/72157594303798688/'
        },
        ns = userscript.id,
        day = 24 * 60 * 60 * 1000,
        checkUpdatesEvery = day,
        url = {
            // TEMP: using older version of jQuery, as latest (1.4.2) is not compatible with Greasemonkey. See http://forum.jquery.com/topic/importing-jquery-1-4-1-into-greasemonkey-scripts-generates-an-error
            jquery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.js'
        },
        window = this,
        JSON = window.JSON,
        GM_getValue = window.GM_getValue,
        GM_setValue = window.GM_setValue,
        GM_xmlhttpRequest = window.GM_xmlhttpRequest,
        jQuery = window.jQuery,
        consoleDebug, _, cache, jsonp, cacheCore, cacheToLocalStorage, cacheToGM, localStorage;
        
        
    // DEPENDENCIES
    
    /*
    * Console
    *   github.com/premasagar/mishmash/tree/master/console/
    */
    consoleDebug = (function(){
        var
            window = this,
            console = window.console,
            opera = window.opera,
            log;
        
        // Doesn't support console API
        if (!console){
            // Opera 
            return (opera && opera.postError) ?
                 function(){
                     var i, argLen, log = opera.postError, args = arguments, arg, subArgs, prop;
                     log(args);
                     
                     argLen = args.length;
	                 for (i=0; i < argLen; i++){
	                     arg = args[i];
	                     if (typeof arg === 'object' && arg !== null){
	                        subArgs = [];
	                        for (prop in arg){
	                            try {
	                                if (arg.hasOwnProperty(prop)){
	                                    subArgs.push(prop + ': ' + arg[prop]);
	                                }
	                            }
	                            catch(e){}
	                        }
	                        log('----subArgs: ' + subArgs);
	                     }
	                 }
                 } :
                 function(){};
        }
        else if (console.log){
            log = console.log;
            if (typeof log.apply === 'function'){
                return function(){
                    log.apply(console, arguments);
                };
	        }
	        else { // IE8
	            return function(){
	                var args = arguments,
	                    len = args.length,
	                    indent = '',
	                    i = 0;
	                    
	                for (; i < len; i++){
		                log(indent + args[i]);
                        indent = '---- ';
	                }
	            };
	        }
	    }
    }());
    
    // Debugging: turn off logging if not in debug mode
    _ = window.location && window.location.search.indexOf('allsizesDebug') !== -1 ?
        consoleDebug :
        function(){};
    
    // end DEPENDENCIES
        

    // CORE FUNCTIONS
        
    // XHR & RESOURCE LOADING
    
    function ajaxRequest(url, callback, method, data){
	    var request, dataString, prop;
	
	    // Optional args
	    callback = callback || function(){};
	    method = method ? method.toUpperCase() : 'GET';
	    data = data || {};
	
	    // Request object
	    request = {
		    method: method,
		    url:url,
		    headers: {
			    'Accept': 'application/atom+xml, application/xml, application/xml+xhtml, text/xml, text/html, application/json, application-x/javascript'
		    },
		    onload:function(response){
			    _('ajaxRequest: AJAX response successful', response, response.status);		
			    if (!response || response.responseText === ''){
				    _('ajaxRequest: empty response');
				    return callback(false);
			    }
			    callback(response.responseText);
		    },
		    onerror:function(response){
			    _('ajaxRequest: AJAX request failed', response, response.status);
			    callback(false);
		    }
	    };
	
	    // POST data
	    if (method === 'POST'){
		    dataString = '';
		
		    for (prop in data){
		        if (data.hasOwnProperty(prop)){
			        if (dataString !== ''){
				        dataString += '&';
			        }
			        dataString += prop + '=' + encodeURI(data[prop]);
			    }
		    }
		    request.data = dataString;
		    request.headers['Content-type'] = 'application/x-www-form-urlencoded';
	    }
	    
	    // Send request
	    _('ajaxRequest: Sending request', request);
	    GM_xmlhttpRequest(request);
    }
    
    
    // A JSONP bridge that circumvents the restriction in some browsers (e.g. Chrome) that a) don't allow JavaScript objects to pass from the host window to the userscript window, b) don't allow scripts to be loaded into the userscript window, and c) don't allow crossdomain Ajax requests. An utter hack. But it works.
    jsonp = (function(){
        var ns = 'dharmafly_jsonp',
            scriptCount = 0,
            window = this,
            document = window.document,
            body = document.body;

        return function(url, callback){ // url should have trailing 'callback=?', in keeping with jQuery.getJSON
            var // a unique script id
                scriptId = ns + '_' + (scriptCount ++),
                // use script id as the callback function name, and append it to the url "http://example.com?callback="
                src = url.slice(0,-1) + scriptId,
                // script element to load the external jsonp resource
                jsonpScript = document.createElement('script'),
                // script element to inject a function
                callbackScript = document.createElement('script'),
                // textarea to temporarily contain the jsonp payload, once the resource has loaded
                delegateTextarea = document.createElement('textarea'),
                delegateTextareaId = scriptId + '_proxy',
                JSON = window.JSON;
            
            // hide the textarea and append to the dom
            delegateTextarea.style.display = 'none';
            delegateTextarea.id = delegateTextareaId;
            body.appendChild(delegateTextarea);
            
            // inject script that will set up the callback function in the native window
            callbackScript.textContent = '' +
                'window["' + scriptId + '"] = function(data){' +
                    'var JSON = window.JSON,' +
                        'document = window.document;' +                    
                    // remove the jsonp script element
                    'document.body.removeChild(document.getElementById("' + scriptId + '"));' +
                    // add its payload to the textarea
                    'if (data){' +
                        'if (JSON && JSON.stringify){' +
                            'data = JSON.stringify(data);' +
                        '}' +
                        'document.getElementById("' + delegateTextareaId + '").textContent = data;' +
                    '}' +
                '};';
            body.appendChild(callbackScript);
            // script element can be removed immediately, since its function has now executed
            body.removeChild(callbackScript);
            
            // set up the jsonp script to load the external resource
            jsonpScript.id = scriptId;
            jsonpScript.src = src;
            // once it has loaded, grab the contents of the textarea and remove the textarea element
            jsonpScript.addEventListener('load', function(){
                window.setTimeout(function(){
                    _('script loaded', callback);
                    var data = delegateTextarea.textContent;
                    if (JSON && JSON.parse){
                        data = JSON.parse(data);
                    }
                    callback(data);
                    body.removeChild(delegateTextarea);
                }, 5);
            }, false);
            // append the jsonp script element, and go...
            body.appendChild(jsonpScript);
        };
    }());
    
    function yqlUrl(query, format){
        format = format || 'json';
        return 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent(query) + '&format=' + format + '&callback=?';
    }
    
    function yql(query, callback){
        jsonp(yqlUrl(query), callback);
    }
    
    function proxy(url, callback){
        var proxyDataTable = 'http://code.dharmafly.com/yql/proxy.xml',
            query = 'use "' + proxyDataTable + '" as proxy; select * from proxy where url="' + url + '"';
            
        yql(query, function(data){
            if (data && data.query && data.query.results && data.query.results.result){
                callback(data.query.results.result);
            }
            else {
                callback(false);
            }
        });
    }
    
    
    // CACHING

    cacheCore = {
        get: function(key){
            var w = this.getWrapper(key),
                undef;            
            return w && w.v ? w.v : undef;
        },
        lastModified: function(key){
            var w = this.getWrapper(key);
            return (w && w.t ? w.t : false);
        }
    };
    
    cacheToGM = {
        getWrapper: function(key){
            var nsKey = ns + '-' + key,
                wrapper = GM_getValue(nsKey);
                
            return wrapper ? JSON.parse(wrapper) : wrapper;
        },
        set: function(key, value){
            var nsKey = ns + '-' + key;
            GM_setValue(nsKey, JSON.stringify({
                v: value,
                t: (new Date()).getTime()
            }));
            return value;
        }
    };
    
    cacheToLocalStorage = {
        getWrapper: function(key){
            var nsKey = ns + '-' + key,
                wrapper = localStorage.getItem(nsKey); // FF3.6.8 observed to fail when given localStorage[key]
                
            return wrapper ? JSON.parse(wrapper) : wrapper;
        },
        set: function(key, value){
            var nsKey = ns + '-' + key;
            localStorage.setItem(nsKey, JSON.stringify({
                v: value,
                t: (new Date()).getTime()
            }));
            return value;
        }
    };
    
    // localStorage wrapper
    // originally from http://github.com/premasagar/revolutionaries
    cache = (function(){
        var storageService, storageWrapper, prop;
        
        if (!JSON || !JSON.parse || !JSON.stringify){
            _('cache: no native JSON');
        }
        else {
            try {
                localStorage = window.localStorage;
                _('cache: using localStorage');
                storageService = cacheToLocalStorage;
            }
            catch(e){
                _('cache: no access to localStorage');
                if (GM_setValue && GM_getValue.toString().indexOf("not supported") === -1){
                    _('cache: using GM_setValue/ GM_getValue');
                    storageService = cacheToGM;
                }
            }
            
            if (storageService){
                storageWrapper = function (key, value){
                    if (typeof value === 'undefined'){
                        value = storageWrapper.get(key);
                        _('CACHE GET: ' + key, typeof value === 'string' ? value.slice(0, 100) : value);
                        return value;
                    }
                    _('CACHE SET: ' + key, value);
                    return storageWrapper.set(key, value);
                };
                // extend wrapper function with cacheCore methods
                for (prop in cacheCore){
                    if (cacheCore.hasOwnProperty(prop)){
                        storageWrapper[prop] = cacheCore[prop];
                    }
                }
                // extend wrapper function with storageService methods
                for (prop in storageService){
                    if (storageService.hasOwnProperty(prop)){
                        storageWrapper[prop] = storageService[prop];
                    }
                }
                return storageWrapper;
            }
        }
        _('cache: no storage available');
        return function(){
            return false;
        };
    }());
    
    // Caching layer for remote resources, e.g. JSON
    // TODO: add check for error responses, and mechanism for deleting keys
    function cacheResource(url, callback){
        var cached = cache(url);
        
        function cacheAndCallback(data){
            if (data){
                cache(url, data);
            }
            callback(data);
        }
        
        if (cached){
            _('cacheResource: fetching from cache', url);
            callback(cached);
        }
        else {
            try{
                _('cacheResource: via ajaxRequest', url);
                ajaxRequest(url, function(data){
                    if (data){
                        cacheAndCallback(data);
                    }
                    else {
                        proxy(url, cacheAndCallback);
                    }
                });
            }
            catch(e){
                _('cacheResource: ajaxRequest failed', url);
                _('cacheResource: via proxy', url);
                proxy(url, cacheAndCallback);
            }
        }
    }
    
    
    // OTHER FUNCTIONS
    
    function latestUserscriptVersionAlt(callback){
        _('latestUserscriptVersionAlt: checking latest version from discussion thread');
    
        var query = 'select content from html where url="http://www.flickr.com/groups/flickrhacks/discuss/72157594303798688/" and xpath="//head/title";';
        yql(query, function(data){
            var v;
            if (data && data.query && data.query.results && data.query.results.title){
                v = data.query.results.title.replace(/^[\w\W]*v([\d\.]*\d)($|\D[\w\W]*$)/im, '$1');
            }
            callback(v.match(/[\d\.]*\d/) ? v : false);
        });
    }
    
    function latestUserscript(callback){
        var url = userscript.update_url,
            query = 'select * from json where url="' + url + '"',
            latest = cache('latestUserscript'),
            now = (new Date()).getTime(),
            lastModified,
            cacheAndCallback = function(data){
                if (data && data.query && data.query.results){
                    latest = data.query.results;
                    _('latestUserscript: from remote store: ', latest);
                    cache('latestUserscript', latest);
                    callback(latest);
                }
                else { // could not get latest userscript data
                    // try another method to get the latest version
                    latestUserscriptVersionAlt(function(v){
                        if (v){ // apply the latest version to the existing meta data
                            latest = jQuery.extend({}, userscript, {version:v});
                            _('latestUserscript: from alt store: ', latest);
                            cache('latestUserscript', latest);
                            callback(latest);
                        }
                        else {
                            callback(false);
                        }
                    });
                }
            };
        
        if (latest){
            lastModified = cache.lastModified('latestUserscript');
            if (now > lastModified + checkUpdatesEvery){
                _('latestUserscript: checking remote data');
                yql(query, cacheAndCallback);
            }
            else {
                _('latestUserscript: retrieved from cache: ', latest);
                callback(latest);
            }
        }
        else {
            yql(query, cacheAndCallback);
        }
    }
    
    // calls back true if a new updatge to the userscript is available
    function updateAvailable(callback){
        latestUserscript(function(latest){
            var avail = !!(latest && latest.version && latest.version > userscript.version);
            _('updateAvailable:', avail, latest);
            callback(avail ? latest : false);
        });
    }
    
    function checkForUpdates(){
        updateAvailable(function(latest){
            /*
            alert(avail ?
                "A new update is available" :
                "There is no new update available"
            );
            */
        });
    }
    
    function addCss(css){
        _('addCss: ', css);
        jQuery('head').append('<style>' + css + '</style>');
    }
    
    function toBbcode(html){
        var bb = html;
    
        // images
        bb = bb.replace(/<img [^>]*src=['"]([^'"]+)['"][^>]*>/, '[img]$1[/img]');
        
        // links
        bb = bb.replace(/<a [^>]*href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/, '[url=$1]$2[/a]');
        
        return bb;
    }
        
    function init(){
        _('initialising AllSizes');
        checkForUpdates();
        
        var
            // DOM selectors
            // TODO: DRY, and only setup on Share menu open
            dom = {
                shareBtn: '#button-bar-share',
                shareOptions: '#share-menu .share-menu-options',
                shareHeaders: '#share-menu .share-menu-options-header',
                
                emailOption: '#share-menu-options-quick',
                emailHeader: '#share-menu-options-quick .share-menu-options-header',
                emailInner: '#share-menu-options-quick .share-menu-options-inner',
                
                embedOption: '#share-menu-options-embed',
                embedHeader: '#share-menu-options-embed .share-menu-options-header',
                embedInner: '#share-menu-options-embed .share-menu-options-inner',
                embedContainer: '#share-menu-options-embed .sharing_embed_cont',
                embedForm: '#sharing-get-html-form',
                embedTextareas: '#share-menu-options-embed textarea.embed-markup',
                imageSizeSelect: '#sharing_size'
            },
            
            shareOptionsOpen = 'share-menu-options-open',
            allsizesToggleId = ns + '-toggle',
            buttonNormal = 'Butt',
            buttonDisabled = 'DisabledButt',
            
            // CSS styles
            css = '' +
                dom.embedInner + '{overflow:auto !important;}' +
                dom.embedForm + '{float:left !important;}' +
                '#' + allsizesToggleId + ' {font-size:11px; float:right; padding:4px;}',
            
            // DOM elements
            shareBtn = jQuery(dom.shareBtn),
            shareOptions = jQuery(dom.shareOptions),
            shareHeaders = jQuery(dom.shareHeaders),
            
            emailOption = jQuery(dom.emailOption),
            emailHeader = jQuery(dom.emailHeader),
            emailInner = jQuery(dom.emailInner),
            
            embedOption = jQuery(dom.embedOption),
            embedHeader = jQuery(dom.embedHeader),
            embedInner = jQuery(dom.embedInner),
            embedTextareas = jQuery(dom.embedTextareas),
            imageSizeSelect = jQuery(dom.imageSizeSelect),
            
            toggleCode = jQuery('<a id="' + allsizesToggleId + '" href="#allsizes-toggle">bbcode</a>'),
            
            mode = cache('mode'),
            menuOption = cache('menuOption'),
            defaultMenuOption,
            imageSize = cache('imageSize');
        
        // DOM manipulation
        
        // Change the menu position to the menu last opened - or to "Grab the HTML" menu
        function menuPosition(menuOption){
            _('menuPosition: setting to ', menuOption || dom.embedOption);
            if (menuOption){
                defaultMenuOption = jQuery('#' + menuOption);
            }
            if (!defaultMenuOption || !defaultMenuOption.length){
                defaultMenuOption = embedOption; // 'Grab the HTML' menu option is the default
            }
            if (defaultMenuOption && defaultMenuOption.length){
                // Remove existing open option
                shareOptions.removeClass(shareOptionsOpen);
                // Apply our own option
                defaultMenuOption.addClass(shareOptionsOpen);
            }
        }
        
        // Cache the menu position, when the position is changed
        function initMenuPositionCaching(){
            _('Setting up menu position caching');
            shareHeaders.click(function(){
                var menu = jQuery(this).parents('.share-menu-options');
                // set timeout to allow time for combo box to change the classnames
                window.setTimeout(function(){
                    var id;
                    if (menu.hasClass(shareOptionsOpen)){
                        id = menu.attr('id');
                        _('caching the most recently clicked menu option', id);
                        cache('menuOption', id);
                    }
                }, 1500);
            });
        }
        
        // Lookup the abbreviation for an image size (the key corresponds to the image size selectbox options; the value corresponds to the textarea id suffixes
        function imageSizeAbbr(imageSize){
            return {
                "Square": "sq",
                "Thumbnail": "t",
                "Small": "s",
                "Medium": "m",
                "Medium 640": "z",
                "Large": "l",
                "Original": "o"
            }[imageSize];
        }
        
        // Change the image size selectbox to the last used size
        function imageSelector(imageSize){
            _('Cached image size: ', imageSize);
            if (imageSize){
                window.setTimeout(function(){
                    var abbr;
                
                    // If the requested value does not exist, use the largest option available
                    if (!imageSizeSelect.find('option[value=' + imageSize + ']').length){
                        _('Cached image size not available. Using the largest available.');
                        imageSize = imageSizeSelect.find('option:last').attr('value'); // NOTE: .attr('value') is used instead of .val() because jQuery 1.3.2 + FF 3.6.8 erroneously passes the text content and not the value attribute
                    }
                    // Apply the image size to the selectbox
                    _('Changing image size selectbox to: ' + imageSize);
                    imageSizeSelect.val(imageSize);
                    
                    // Change the displayed textarea
                    abbr = imageSizeAbbr(imageSize);
                    if (abbr){
                        _('Changing embed code textarea to: ' + abbr);
                        embedTextareas
                            .hide()
                            .filter('[id$=-' + abbr + ']') // the textarea that has an id ending with the image size abbr
                                .show();
                    }
                }, 50);
            }
        }
        
        // Cache the image size when the size selector is changed
        function initImageSelectorCaching(){
            _('Setting up image size caching');
            imageSizeSelect.change(function(){
                cache('imageSize', imageSizeSelect.attr('value')); // NOTE: .attr('value') is used instead of .val() because jQuery 1.3.2 + FF 3.6.8 erroneously passes the text content and not the value attribute
            });
        }
        
        function initToggleCodeBehaviour(){
            _('Setting up toggle-code behaviour');
            _('Cached code mode: ', mode);
            toggleCode.click(function(){
                var mode = toggleCode.text(),
                    header = embedHeader.data('content'),
                    bbcode;
                    
                if (!header){
                    header = embedHeader.html();
                    embedHeader.data('content', header);
                }
                
                embedTextareas.each(function(i, textarea){
                    var t = jQuery(textarea),
                        html = t.data('html');
                
                    if (!html){
                        html = t.val();
                        t.data('html', html); // cache html
                    }
                    
                    switch(mode){
                        case 'html':
                        t.val(html);
                        embedHeader.html(header);
                        toggleCode.text('bbcode');
                        break;
                        
                        case 'bbcode':
                        bbcode = t.data('bbcode');
                        if (!bbcode){
                            bbcode = toBbcode(html);
                            t.data('bbcode', bbcode);
                        }
                        t.val(bbcode);
                        embedHeader.html(header.replace(/>[^>]*$/, '> Grab the BBCode'));
                        toggleCode.text('html');
                        break;
                    }
                });
                // Cache the mode for next page load
                cache('mode', mode);
                return false;
            });
            
            // Check if mode was previously cached
            if (mode){
                toggleCode
                    .text(mode)
                    .click();
            }
        }
        
        // When the "Share" button is clicked, open the menu at the last viewed menu option
        shareBtn
            .removeClass(buttonDisabled) // change button from disabled...
            .addClass(buttonNormal) // ...to a normal button
            .one('click', function(){ // add init behaviour
                _('Share button clicked. Setting up menu...');
                
                // Add CSS to head
                addCss(css);
                
                // Cached menu position image size
                menuPosition(menuOption);
                initMenuPositionCaching();
                imageSelector(imageSize);
                initImageSelectorCaching();
                
                // Append the toggle code, for user to change from HTML to BBCode, etc
                embedInner.append(toggleCode);
                initToggleCodeBehaviour();
            });
    }
    
    // end CORE FUNCTIONS
    
    // INITIALISE
    /* Sticky debug mode: uncomment the next line once */
    // cache('debug', true);
    
    if (cache('debug')){
        _ = consoleDebug;
        _('/*! ' + userscript.name + '\n*   v' + userscript.version + ' (userscript)\n*/');
    }
    
    if (jQuery){
        _('jQuery already loaded');
        init();
    }
    else {
        _('fetching jQuery');
        cacheResource(url.jquery, function(src){
            if (src){
                eval(src);
                jQuery = window.jQuery.noConflict(true);
            }
            if (jQuery){
                _('jQuery loaded', jQuery);
                init();
            }
            else {
                _("can't load jQuery");
            }
        });
    }
    // end INITIALISE
}());
