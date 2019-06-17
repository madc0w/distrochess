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

	cancelCallback : function() {
		return function() {
			isUsernameDialog.set(false);
			isSigninDialog.set(false);
			isSignup.set(false);
		};
	},
});

Template.signin.events({
	"click #forgot-password-button" : function(e) {
		const emailOrUsername = $("#username-input").val().trim();
		if (emailOrUsername) {
			// send password reset email
			isSpinner.set(true);
			Meteor.call("sendResetPasswordEmail", emailOrUsername, function(err, result) {
				isSpinner.set(false);
				if (err) {
					message.set(err);
				} else {
					message.set("password_reset_email_sent");
				}
			});
		} else {
			message.set(TAPi18n.__("enter_username_or_email"));
		}
	},

	"click #signin-google-button" : function(e) {
		isSpinner.set(true);
		Meteor.loginWithGoogle({
			requestPermissions : [ "email" ]
		}, (err) => {
			isSpinner.set(false);
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
		isSpinner.set(true);
		Meteor.loginWithGithub({
			requestPermissions : [ "email" ]
		}, (err) => {
			isSpinner.set(false);
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
		isSpinner.set(true);
		const emailOrUsername = $("#username-input").val().trim();
		const password = $("#password1-input").val();
		Meteor.loginWithPassword(emailOrUsername, password, function(err) {
			isSpinner.set(false);
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
				isSpinner.set(true);
				Meteor.call("checkUsername", username, function(err, isAvailable) {
					if (isAvailable) {
						const options = {
							username : username,
							email : email,
							password : password,
						};
						Accounts.createUser(options, function(err) {
							isSpinner.set(false);
							if (err) {
								if (err.reason == "Email already exists") {
									message.set(TAPi18n.__("email_in_use"));
								} else {
									message.set(err.reason);
								}
							} else {
								const isReceiveNotifications = $("#receive-emails-checkbox").prop("checked");
								Meteor.call("setReceiveNotifcations", isReceiveNotifications);
								isUsernameDialog.set(false);
								isSigninDialog.set(false);
								isSignup.set(false);
							}
						});
					} else {
						isSpinner.set(false);
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

	"click #signout-button" : function(e) {
		isSpinner.set(true);
		Meteor.logout(function(err) {
			isSpinner.set(false);
			if (err) {
				message.set(err);
			} else {
				isSigninDialog.set(false);
				if (location.pathname == "/") {
					location.reload();
				} else {
					location.pathname = "/";
				}
			}
		});
	},

	"click #username-button" : function(e) {
		isUsernameDialog.set(true);
	},

	"click #edit-profile-button" : function(e) {
		Router.go("/edit-profile");
		isUsernameDialog.set(false);
		isSigninDialog.set(false);
		isSignup.set(false);
	},
});
