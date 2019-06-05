Router.route("/", function() {
	templateName.set("chessBoard");
	this.render("main");
});

Router.route("/edit-profile", function() {
	templateName.set("editProfile");
	this.render("main");
});
