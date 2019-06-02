module.exports = {
	servers : {
		one : {
			host : "134.209.93.133",
			username : "root",
			pem : "~/.ssh/id_rsa",
		// password: "server-password"
		// or neither for authenticate from ssh-agent
		}
	},

	app : {
		name : "distrochess",
		path : "../",

		servers : {
			one : {},
		},

		buildOptions : {
			serverOnly : true,
		},

		env : {
			// TODO: Change to your app's url
			// If you are using ssl, it needs to start with https://
			ROOT_URL : "http://134.209.93.133",
			MONGO_URL : "mongodb://distrochess:blimey@mongodb-1650-0.cloudclusters.net:10005/distrochess?authSource=admin",
//			MONGO_OPLOG_URL : "mongodb://mongodb/local",
		},

		docker : {
			// change to "abernix/meteord:base" if your app is using Meteor 1.4 - 1.5
			image : "abernix/meteord:node-8.4.0-base",
		},

		// Show progress bar while uploading bundle to server
		// You might need to disable it on CI servers
		enableUploadProgressBar : true
	},

//	mongo : {
//		version : "3.4.1",
//		servers : {
//			one : {}
//		}
//	},

// (Optional)
// Use the proxy to setup ssl or to route requests to the correct
// app when there are several apps

// proxy: {
//   domains: "mywebsite.com,www.mywebsite.com",

//   ssl: {
//     // Enable Let's Encrypt
//     letsEncryptEmail: 'email@domain.com'
//   }
// }
};
