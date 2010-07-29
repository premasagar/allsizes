var yqlProxy = (function(){
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
            proxyTextareaId = scriptId + '_proxy',
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

yqlResource('http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.js', function(data){console.log(data);});
