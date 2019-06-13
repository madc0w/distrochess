Router.route("/", function() {
	setPage.bind(this)("chessBoard");
});

Router.route("/edit-profile", function() {
	setPage.bind(this)("editProfile");
});

Router.route("/faq", function() {
	setPage.bind(this)("faq");
});

Router.route("/forum", function() {
	setPage.bind(this)("forum");
});

Router.route("/history", function() {
	const gameId = this.params.query.id;
	historyGameId.set(parseInt(gameId));
	setPage.bind(this)("history");
});

function setPage(name) {
	templateName.set(name);
	this.render("main");
}
