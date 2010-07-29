// ==UserScript==
// @name            Flickr AllSizes
// @namespace       dharmafly.com
// @description     AllSizes is a (Greasemonkey) UserScript for Flickr, to give better access to Flickr photos: HTML for the various sizes, URLs, downloads.
// @author          Premasagar Rose <http://premasagar.com>
// @identifier      http://dharmafly.com/projects/allsizes/allsizes.user.js
// @version         2.0.0
// @date            2010-07-27

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


/*!
* AllSizes
*   discuss:
*       flickr.com/groups/flickrhacks/discuss/72157594303798688/
*
*   userscript hosting:
*       userscripts.org/scripts/show/6178
*
*   source code:
*       github.com/premasagar/allsizes/
*
*   latest stable version:
*       userscripts.org/scripts/source/6178.user.js
*       dharmafly.com/projects/allsizes/allsizes.user.js (mirror)
*
*//*
    AllSizes is a (Greasemonkey) UserScript for Flickr, to give better access to Flickr photos: HTML for the various sizes, URLs, downloads.

    by Premasagar Rose
        dharmafly.com

    license
        opensource.org/licenses/mit-license.php
        
    v2.0.0

*/

"use strict";

(function(){
    var userscript = {
            id: 'dharmafly-allsizes',
	        title: 'AllSizes',
	        version: '2.0.0'
        },
        url = {
            // Temporarily using older version of jQuery, as latest (1.4.2) is not compatible with Greasemonkey. See http://forum.jquery.com/topic/importing-jquery-1-4-1-into-greasemonkey-scripts-generates-an-error
            jquery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.js'
        },
        window = this,
        unsafeWindow = window.unsafeWindow || {},
        //_ = unsafeWindow.console && unsafeWindow.console.log ? unsafeWindow.console.log : function(){},
        GM_xmlhttpRequest = window.GM_xmlhttpRequest,
        jQuery = window.jQuery,
        consoleDebug, _, cache, jsonp;
        
        
    // DEPENDENCIES
    
    /*
    * Console
    *   github.com/premasagar/mishmash/tree/master/console/
    */
    consoleDebug = (function(){
        var
            window = this,
            ua = window.navigator.userAgent,
            console = window.console,
            opera = window.opera,
            debug;
        
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
        else {
            debug = console.debug;
            
            // WebKit complains if console's debug function is called on its own
            if (/webkit/i.test(ua)){
                return function(){
                    var i = 0,
                        args = arguments,
                        len = args.length,
                        arr = [];
                    
                    if (len === 1){
                        console.debug(args[i]);
                    }
                    else if (len > 1){
                        for (; i < len; i++){
                            arr.push(args[i]);
                        }
                        console.debug(arr);
                    }
                };
            }
            
            return debug ? // FF Firebug
	            debug :
	            function(){
		            var i, argLen, log = console.log, args = arguments, indent = '';
		            if (log){ // WebKit
			            if (typeof log.apply === 'function'){
				            log.apply(console, args);
			            }
			            else { // IE8
				            argLen = args.length;
				            for (i=0; i < argLen; i++){
					            log(indent + args[i]);
                                indent = '---- ';
				            }
			            }
		            }
	            };
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
    
    function cacheToGM(key, value){
        var JSON = window.JSON,
            GM_getValue = window.GM_getValue,
            GM_setValue = window.GM_setValue;
            
        if (typeof value === 'undefined'){
            value = GM_getValue(key);
            return value ? JSON.parse(value).v : value;
        }
        else {
            GM_setValue(key, JSON.stringify({
                v: value,
                t: (new Date()).getTime()
            }));
        }
    }
    
    function cacheToLocalStorage(key, value){
        var ns = userscript.id,
            JSON = window.JSON,
            localStorage = window.localStorage;
            
        key = ns + '.' + key;
        if (typeof value === 'undefined'){
            value = localStorage.getItem(key); // FF3.6.8 observed to fail when given localStorage[key]
            if (value){
                value = JSON.parse(value);
            }
            return value && value.v ? value.v : value;
        }
        else {
            localStorage.setItem(key, JSON.stringify({
                v: value,
                t: (new Date()).getTime()
            }));
        }
    }
    
    // localStorage wrapper
    // originally from http://github.com/premasagar/revolutionaries
    cache = (function cache(key, value){    
        var JSON = window.JSON,
            GM_getValue = window.GM_getValue,
            GM_setValue = window.GM_setValue,
            localStorage;
        
        if (!JSON || !JSON.parse || !JSON.stringify){
            _('cache: no native JSON');
            return function(){
                return false;
            };
        }
        
        try {
            localStorage = window.localStorage;
            _('cache: using localStorage');
            return cacheToLocalStorage;
        }
        catch(e){
            _('cache: no access to localStorage');
            if (GM_setValue && GM_getValue.toString().indexOf("not supported") === -1){
                _('cache: using GM_setValue/ GM_getValue');
                return cacheToGM;
            }
            else {
                _('cache: no storage available');
            }
        }
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
    
    function userScriptLatestVersionFromFlickrHacks(callback){
        var query = 'select content from html where url="http://www.flickr.com/groups/flickrhacks/discuss/72157594303798688/" and xpath="//head/title";';
        yql(query, function(data){
            var v;
            if (data && data.query && data.query.results && data.query.results.title){
                v = data.query.results.title.replace(/^[\w\W]*v([\d\.]*\d)($|\D[\w\W]*$)/im, '$1');
            }
            callback(v.match(/[\d\.]*\d/) ? v : false);
        });
    }
    
    function addCss(css){
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
        
        var
            // DOM selectors
            // TODO: DRY
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
                embedTextareas: '#share-menu-options-embed .sharing_embed_cont textarea',
                currentTextarea: '#share-menu-options-embed .sharing_embed_cont textarea:visible'
            },
            
            shareOptionsOpen = 'share-menu-options-open',
            allsizesToggleId = 'dharmafly-allsizes-toggle',
            
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
            
            toggleCode = jQuery('<a id="' + allsizesToggleId + '" href="#allsizes-toggle">bbcode</a>'),
            
            mode = cache('mode'),
            menuOption = cache('menuOption'),
            defaultMenuOption;
        
        
        // Initialise
        
        // Set menu option that opens when Share button is clicked
        if (menuOption){
            defaultMenuOption = jQuery('#' + menuOption);
        }
        if (!defaultMenuOption.length){
            defaultMenuOption = embedOption; // 'Grab the HTML' menu option is the default
        }
        if (defaultMenuOption.length){
            // Remove existing open option
            shareOptions.removeClass(shareOptionsOpen);
            // Apply our own option
            defaultMenuOption.addClass(shareOptionsOpen);
        }
        
        // Cache open menu option
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
        
        // Add CSS to head
        addCss(css);
        
        // Append the toggle code, for user to change from HTML to BBCode, etc
        embedInner.append(toggleCode);
        
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
    
    // end CORE FUNCTIONS
    
    
    
    // INITIALISE
    // Sticky debug mode - uncomment the next line
    // cache('debug', true);
    
    if (cache('debug')){
        _ = consoleDebug;
    }
    
    if (jQuery){
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
