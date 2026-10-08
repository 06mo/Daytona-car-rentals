if (process.env.VERCEL || ["preview", "production"].includes(process.env.VERCEL_ENV || "")) throw new Error("Local Auth DNS fixture cannot run in hosted environments.");
// Loaded only by the isolated E2E child process. Never used by the app or deployed.
const dns=require('node:dns');
const lookup=dns.lookup;
dns.lookup=function(host,options,callback){if(host!=='portal-fixture.supabase.co')return lookup.apply(this,arguments);if(typeof options==='function'){callback=options;options={};}if(options&&options.all)callback(null,[{address:'127.0.0.1',family:4}]);else callback(null,'127.0.0.1',4);};
