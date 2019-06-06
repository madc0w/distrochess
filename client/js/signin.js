const isUsernameDialog = new ReactiveVar(false);
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
	"click #forgot-password-button" : function(e) {
		// TODO send password reset email 
		message.set(TAPi18n.__("not_implemented"));
	},

	"click #signin-google-button" : function(e) {
		Meteor.loginWithGoogle({
			requestPermissions : [ "email" ]
		}, (err) => {
			if (err) {
				message.set(err);
			} else {
				isSigninDialog.set(false);
			}
		});
	},

	"click #signin-github-button" : function(e) {
		// to configure Github OAuth:
		// https://github.com/settings/applications/1075304
		Meteor.loginWithGithub({
			requestPermissions : [ "email" ]
		}, (err) => {
			if (err) {
				message.set(err);
			} else {
				isSigninDialog.set(false);
			}
		});
	},

	"click #signin-or-signup-button" : function(e) {
		isSigninDialog.set(true);
	},

	"click #signin-button" : function(e) {
		const emailOrUsername = $("#username-input").val().trim();
		const password = $("#password1-input").val();
		Meteor.loginWithPassword(emailOrUsername, password, function(err) {
			if (err) {
				message.set(TAPi18n.__("bad_login"));
			} else {
				isUsernameDialog.set(false);
				isSigninDialog.set(false);
				isSignup.set(false);
			}
		});
	},

	"click #signup-button" : function(e) {
		if (isSignup.get()) {
			$("#username-input").removeClass("invalid");
			$("#email-input").removeClass("invalid");
			$("#password1-input").removeClass("invalid");
			$("#password2-input").removeClass("invalid");

			const username = $("#username-input").val().trim();
			const email = $("#email-input").val().trim();
			const password = $("#password1-input").val();
			const password2 = $("#password2-input").val();

			var messageText = "";
			var isValid = true;
			if (!email.match(/^\S+@\S+\.\S+$/)) {
				$("#email-input").addClass("invalid");
				messageText += TAPi18n.__("invalid_email") + "<br/>";
				isValid = false;
			}

			if (username.length < 3) {
				$("#username-input").addClass("invalid");
				messageText += TAPi18n.__("username_too_short") + "<br/>";
				isValid = false;
			}

			if (password.length < 6) {
				$("#password1-input").addClass("invalid");
				messageText += TAPi18n.__("password_too_short") + "<br/>";
				isValid = false;
			}

			if (password != password2) {
				$("#password2-input").addClass("invalid");
				messageText += TAPi18n.__("passwords_do_not_match") + "<br/>";
				isValid = false;
			}

			if (isValid) {
				Meteor.call("checkUsername", username, function(err, isAvailable) {
					if (isAvailable) {
						const options = {
							username : username,
							email : email,
							password : password,
						};
						Accounts.createUser(options, function(err) {
							if (!err) {
								isUsernameDialog.set(false);
								isSigninDialog.set(false);
								isSignup.set(false);
							}
						});
					} else {
						message.set(TAPi18n.__("username_in_use"));
						$("#username-input").addClass("invalid");
					}
				});
			} else {
				message.set(messageText);
			}
		} else {
			isSignup.set(true);
		}
	},

	"click #cancel-button" : function(e) {
		isUsernameDialog.set(false);
		isSigninDialog.set(false);
		isSignup.set(false);
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
		Router.go("/edit-profile");
	},
});
