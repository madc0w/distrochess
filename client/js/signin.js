const isUsernameDialog = new ReactiveVar(false);
const isSigninDialog = new ReactiveVar(false);
const isSignup = new ReactiveVar(false);

Template.signin.helpers({
	isSignup : function() {
		return isSignup.get();
	},

	isSigninDialog : function() {
		return isSigninDialog.get();
	},

	isUsernameDialog : function() {
		return isUsernameDialog.get();
	},

	username : utils.getUsername,
});

Template.signin.events({
	"click #signin-google-button" : function(e) {
		Meteor.loginWithGoogle({
			requestPermissions : [ "email" ]
		}, (err) => {
			if (err) {
				// handle error
			} else {
				isSigninDialog.set(false);
			}
		});
	},

	"click #signin-github-button" : function(e) {
		Meteor.loginWithGithub({
			requestPermissions : [ "email" ]
		}, (err) => {
			if (err) {
				// handle error
			} else {
				isSigninDialog.set(false);
			}
		});
	},

	"click #signin-or-signup-button" : function(e) {
		isSigninDialog.set(true);
	},

	"click #signin-button" : function(e) {},

	"click #signup-button" : function(e) {
		isSignup.set(true);
	},

	"click #cancel-button" : function(e) {
		isUsernameDialog.set(false);
		isSigninDialog.set(false);
	},

	"click #signout-button" : function(e) {
		Meteor.logout(function(err) {
			if (err) {
			} else {
				isSigninDialog.set(false);
				location.reload();
			}
		});
	},

	"click #username-button" : function(e) {
		isUsernameDialog.set(true);
	},

	"click #edit-profile-button" : function(e) {
		location = "/edit-profile";
	},
});
