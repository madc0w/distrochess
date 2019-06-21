Router.route("/", function() {
	setPage.bind(this)("chessBoard");
});

Router.route("/edit-profile", function() {
	setPage.bind(this)("editProfile");
});

Router.route("/users", function() {
	setPage.bind(this)("users");
});

Router.route("/faq", function() {
	setPage.bind(this)("faq");
});

Router.route("/forum", function() {
	setPage.bind(this)("forum");
});

Router.route("/reset-password/:token", function() {
	passwordResetToken = this.params.token;
	setPage.bind(this)("passwordReset");
});

Router.route("/history", function() {
	const gameId = this.params.query.id;
	historyGameId.set(parseInt(gameId));
	setPage.bind(this)("history");
});

Router.route("/unsubscribe/:authKey", function() {
	const _this = this;
	Meteor.call("unsubscribe", this.params.authKey, function(err, result) {
		setPage.bind(_this)("unsubscribeSuccessView");
	});
});

///////////////////////////////////////////////////////////////////////////////////////////////////

function setPage(name) {
	templateName.set(name);
	this.render("main");
}
