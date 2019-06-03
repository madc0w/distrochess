// TODO i18n for error messages.  none of this works.

//const errorMessages = {
//	"Invalid email" : "invalid_email",
//	"Username already exists." : "username_taken",
//	"Username must be at least 3 characters long" : "username_too_short",
//	"Password must be at least 6 characters long" : "password_too_short",
//};

//Template.loginButtons.events({
//	"click #login-buttons-password" : function(e) {
//		$("#login-dropdown-list .error-message").text("");
//	},
//});

Template.loginButtons.onRendered(() => {
	Meteor.setInterval(() => {
		replaceText("#login-sign-in-link", "login");
		if ($("#login-dropdown-list").length > 0) {
			replaceText(".login-close-text", "close");
			replaceText("#login-username-or-email-label", "login_username_or_email");
			replaceText("#login-password-label", "password");
			replaceText(".or-text", "or");
			replaceText("#login-buttons-github span", "sign_in_github");
			replaceText("#login-buttons-google span", "sign_in_google");
			replaceText("#login-buttons-password", "sign_in");
			replaceText("#forgot-password-link", "forgot_password");
			replaceText("#signup-link", "create_account");
			replaceText("#forgot-password-email-label", "email");
			replaceText("#login-buttons-forgot-password", "reset_password");
			replaceText("#back-to-login-link", "back_to_sign_in");
			replaceText("#login-email-label", "email");
			replaceText("#login-username-label", "username");
			replaceText("#login-buttons-open-change-password", "change_password");
			replaceText("#login-buttons-logout", "sign_out");
			replaceText("#login-buttons-do-change-password", "change_password");
			replaceText("#login-old-password-label", "current_password");
			replaceText("#reset-password-new-password-label", "new_password");
			replaceText("#login-buttons-reset-password-button", "set_password");

		//			const errorMessage = $("#login-dropdown-list .error-message");
		//			if (errorMessage.length > 0) {
		//				var text = errorMessage.html();
		//				for (key in errorMessages) {
		//					text = text.replace(key, errorMessages[key] + "<br/>");
		//				}
		//				errorMessage.html(text);
		//			}
		}
	}, 200);
});

function replaceText(selector, key) {
	const newText = TAPi18n.__(key);
	if ($(selector).text() != newText) {
		$(selector).text(newText);
	}
}
