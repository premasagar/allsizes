// ==UserScript==
// @name            Flickr AllSizes
// @namespace       dharmafly.com
// @description     AllSizes is a (Greasemonkey) UserScript for Flickr, to give better access to Flickr photos: HTML for the various sizes, URLs, downloads.
// @author          Premasagar Rose <http://premasagar.com>
// @identifier      http://dharmafly.com/projects/allsizes/allsizes.user.js
// @version         2.0.0
// @date            2010-07-27

// @include         http://www.flickr.com/photo_zoom.gne*
// @include         http://www.flickr.com/photos/*/*
// @include         http://www.flickr.com/account/prefs/downloads*
// @include         http://www.flickr.com/account/prefs/license*
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
        _, cache, yqlProxy;
        
        
    // DEPENDENCIES
    
    /*
    * Console
    *   github.com/premasagar/mishmash/tree/master/console/
    */
    _

    = (function(){
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
    if (window.location && window.location.search.indexOf('allsizesDebug') === -1) {
        _ = function(){};
    }
    
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
    

    yqlProxy = (function(){
        var proxyTable = 'http://dharmafly.com/yqlproxy.xml',
            ns = 'dharmafly_yqlproxy',
            scriptCount = 0,
            window = this,
            document = window.document;

        return function(url, callback){
            var scriptId = ns + '_' + (scriptCount ++),
                query = 'use "' + proxyTable + '" as proxy; select * from proxy where url="' + url + '"',
                src = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent(query) + '&format=json&callback=' + scriptId,
                yqlScript = document.createElement('script'),
                callbackScript = document.createElement('script'),
                proxyTextarea = document.createElement('textarea'),
                proxyTextareaId = ns + '_proxy',
                body = document.body;
                
            proxyTextarea.style.display = 'none';
            proxyTextarea.id = proxyTextareaId;
            body.appendChild(proxyTextarea);
                
            callbackScript.textContent = '' +
                'window["' + scriptId + '"] = function(data){' +
                    'document.body.removeChild(document.getElementById("' + scriptId + '"));' +
                    'if (data && data.query && data.query.results && data.query.results.result){' +
                        'document.getElementById("' + proxyTextareaId + '").textContent = data.query.results.result;' +
                    '}' +
                '};';
            body.appendChild(callbackScript);
            body.removeChild(callbackScript);
            
            yqlScript.id = scriptId;
            yqlScript.src = src;
            yqlScript.addEventListener('load', function(){
                
                window.setTimeout(function(){
                    _('script loaded', callback);
                    callback(proxyTextarea.textContent);
                    body.removeChild(proxyTextarea);
                }, 5);
            }, false);            
            body.appendChild(yqlScript);
        };
    }());
    
    
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
            value = localStorage[key];
            return value ? JSON.parse(value).v : value;
        }
        else {
            localStorage[key] = JSON.stringify({
                v: value,
                t: (new Date()).getTime()
            });
        }
    }
    
    // localStorage wrapper
    // originally from http://github.com/premasagar/revolutionaries
    cache = (function cache(key, value){    
        var JSON = window.JSON,
            GM_getValue = window.GM_setValue,
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
            cache(url, data);
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
                        yqlProxy(url, cacheAndCallback);
                    }
                });
            }
            catch(e){
                _('cacheResource: ajaxRequest failed', url);
                _('cacheResource: via yqlProxy', url);
                yqlProxy(url, cacheAndCallback);
            }
        }
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
                emailMenu: '#share-menu-options-quick',
                emailHeader: '#share-menu-options-quick .share-menu-options-header',
                emailInner: '#share-menu-options-quick .share-menu-options-inner',
                embedMenu: '#share-menu-options-embed',
                embedOptions: '#share-menu-options-embed .share-menu-options',
                embedHeader: '#share-menu-options-embed .share-menu-options-header',
                embedInner: '#share-menu-options-embed .share-menu-options-inner',
                embedContainer: '#share-menu-options-embed .sharing_embed_cont',
                embedForm: '#sharing-get-html-form',
                embedTextareas: '#share-menu-options-embed .sharing_embed_cont textarea',
                currentTextarea: '#share-menu-options-embed .sharing_embed_cont textarea:visible'
            },
            
            // CSS styles
            css = '' +
                dom.embedInner + '{overflow:auto !important;}' +
                dom.embedForm + '{float:left !important;}' +
                '#dharmafly-allsizes {font-size:11px; float:right; padding:4px;}',
            
            // DOM elements
            shareBtn = jQuery(dom.shareBtn),
            
            emailMenu = jQuery(dom.emailMenu),
            emailHeader = jQuery(dom.emailHeader),
            emailInner = jQuery(dom.emailInner),
            
            embedMenu = jQuery(dom.embedMenu),
            embedHeader = jQuery(dom.embedHeader),
            embedOptions = jQuery(dom.embedOptions),
            embedInner = jQuery(dom.embedInner),
            embedTextareas = jQuery(dom.embedTextareas),
            
            toggleCode = jQuery('<a id="dharmafly-allsizes" href="#allsizes">bbcode</a>'),
            
            mode = cache('mode');
        
        
        // Initialise
        
        addCss(css);
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
    
    if (jQuery){
        init();
    }
    else {
        _('fetching jQuery');
        cacheResource(url.jquery, function(src){
            eval(src);
            jQuery = window.jQuery;
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
