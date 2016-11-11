var phantom = require('phantom');
var queue = require('queue');
var Promise = require('promise');

var phPage = null;
var phInstance = null;

var q = queue({
    concurrency: 1,
    timeout: 30 * 1000
});

var waitBeforeScreenshot = 1000; // miliseconds
//var waitBeforeScreenshot = false; // miliseconds

// Load instructions into the queue
var screens = require('./config/screens.json');
require('./config/sites.json').forEach(function(site){
    screens.forEach(function(screen){
        q.push(function(next){
            phPage.property('viewportSize', screen.size);
            phPage.open(site.url)
            .then(status => {
                phPage.evaluate(function() {
                    window.document.body.scrollTop = document.body.scrollHeight;
                });
                return null;
            })
            .then(() => {
                if (!waitBeforeScreenshot) return null;
                console.log('[WAIT] %dms to complete async calls', waitBeforeScreenshot);
                var p = new Promise((resolve, reject)=>{
                    setTimeout(()=>{
                        console.log('[WAIT] proceed');
                        resolve();
                    }, 2000);
                });
                return p;
            })
            .then(() => {
                console.log('rendering %s for %s', site.name, screen.name);
                var path = 'img/'+screen.name+'/'+site.name+'.jpg';
                phPage.render(path, {format: 'jpeg', quality: '80'});
                next();
            })
        });
    })
});



// Init phantom
phantom.create([
//'--debug=true', 
'--local-storage-path=config/localstorage',
'--cookies-file=config/cookies.txt', 
'--ignore-ssl-errors=true', 
'--web-security=false'
])
.then(instance => {
    phInstance = instance;
    return instance.createPage();
})
.then(page => {
    phPage = page;

    // Page setup
    page.property('javascriptEnabled', true);

    /**
     * --- COOKIE INJECTION ----
     * If the page does not load due to cookie issues,
     * Export the cookies from your browser into cookie.json
     * and uncomment "injectCookies"
     * PhantomJS then uses your browsers cookies
     */
    injectCookies(page, require('./config/cookies.json'));


    // Start working the queue
    q.start(function(err){
        if (err) console.error(err);
        phPage.close();
        phInstance.exit();
    });
});


function injectCookies(_page, _cookies) {
    _cookies.forEach(function(cookie) {
        _page.addCookie(cookie);
    });    
}