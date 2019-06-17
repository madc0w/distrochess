Template.passwordReset.events({
	"click #reset-password-button" : function(e) {
		$("#password-1").removeClass("invalid");
		$("#password-2").removeClass("invalid");
		const password1 = $("#password-1").val();
		const password2 = $("#password-2").val();
		if (password1.length < 6) {
			$("#password-1").addClass("invalid");
			message.set(TAPi18n.__("password_too_short"));
		} else if (password1 == password2) {
			Accounts.resetPassword(passwordResetToken, password1, function(err) {
				if (err) {
					message.set(err.reason);
				} else {
					message.set(TAPi18n.__("password_reset_success"));
					Router.go("/");
				}
			});
		} else {
			$("#password-2").addClass("invalid");
			message.set(TAPi18n.__("passwords_do_not_match"));
		}
	},
});
